require('dotenv').config();
const pool = require('./config/db');
const axios = require('axios');
const express = require('express');
const nodemailer = require('nodemailer');
const checkEmailsAndReply = require('./gmailReader');
const app = express();
const port = process.env.PORT || 3000;
const chatbotRoutes = require('./routes/chatbotRoutes');
app.use('/api', chatbotRoutes);
const bodyParser = require('body-parser');
const conversationRoutes = require('./routes/conversation');
app.use(bodyParser.json());
app.use('/api', conversationRoutes);
const { v4: uuidv4 } = require('uuid');

// const authRouter = require("./waConnect/src/service/routes/auth");
// const chatbotRouter = require("./waConnect/src/service/routes/chatbot");
// const {
//   authenticateToken,
// } = require("./waConnect/src/middleware/auth-middleware");
const sendReplyRouter = require('./waConnect/src/service/routes/webhok');

app.use(express.json());

waConnectApp = express();
waConnectApp.use(express.json());
waConnectApp.use(sendReplyRouter);
// waConnectApp.use("/auth", authRouter);
// waConnectApp.use("/api", authenticateToken, chatbotRouter);
const port2 = 21465;

const { insertMessage } = require('./models/index');

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

app.post('/find-or-create-conversation', async (req, res) => {
  const { userEmail } = req.body;
  if (!userEmail) return res.status(400).json({ message: 'userEmail is required.' });

  try {
    const existing = await pool.query(
      'SELECT * FROM chat.conversations WHERE user_id = $1 LIMIT 1',
      [userEmail],
    );

    if (existing.rows.length > 0) {
      return res.json({ conversation_id: existing.rows[0].id });
    }
    const newId = uuidv4();
    const channelId = uuidv4();
    const sessionId = `sess-${Date.now()}`;
    const userId = userEmail;
    const lastMessage = 'No messages yet';
    const username = userEmail;
    const readStatus = 'unread';
    const lastDate = new Date();

    await pool.query(
      `INSERT INTO chat.conversations 
      (id, channel_id, user_id, username, last_message, read_status, last_date, session_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [newId, channelId, userId, username, lastMessage, readStatus, lastDate, sessionId, 'replied'],
    );

    return res.json({ conversation_id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating/finding conversation' });
  }
});

app.post('/messages/:id', async (req, res) => {
  const { id: conversation_id } = req.params;
  const { question, userEmail } = req.body;

  if (!question || !userEmail || typeof question !== 'string' || question.trim() === '') {
    return res.status(400).json({
      message: 'Field question and userEmail are required and must be valid.',
    });
  }

  const username = userEmail.split('@')[0];

  let conversation;
  try {
    const convoResult = await pool.query('SELECT * FROM chat.conversations WHERE id = $1 LIMIT 1', [
      conversation_id,
    ]);

    conversation = convoResult.rows[0];
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const lastMessageResult = await pool.query(
      `SELECT sender_type FROM chat.messages 
       WHERE conversation_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [conversation_id],
    );

    const lastMessage = lastMessageResult.rows[0];

    // if (lastMessage?.sender_type === 'chatbot') {
    //   return res.status(200).json({
    //     message: 'This conversation has already been replied by the chatbot.',
    //   });
    // }
  } catch (err) {
    return res.status(500).json({
      message: 'Database error during conversation lookup.',
      error: err.message,
    });
  }

  let chatbotMessage = 'No response from chatbot.';
  try {
    const chatbotRes = await axios.post(
      'https://api.majadigidev.jatimprov.go.id/api/external/chatbot/send-message',
      {
        question,
        session_id: conversation.session_id,
        additional_context: '',
      },
    );

    const messages = chatbotRes.data?.data?.message || [];
    if (messages.length > 0) {
      chatbotMessage = messages.map((msg) => msg.text).join('\n\n');
      const links = messages[0]?.suggest_links || [];

      if (links.length > 0) {
        let linkText = '\n\nLink Pages:\n';
        links.forEach((link) => {
          linkText += `${link.title}: ${link.link}\n`;
        });
        chatbotMessage += linkText;
      }
    }
  } catch (error) {
    console.error('Chatbot API Error:', error.message || error);
    return res.status(500).json({
      message: 'Failed to get chatbot response.',
      error: error.message || error,
    });
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Majadigi Chatbot" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Response from Majadigi Chatbot',
      html: `<p>Hi ${username || 'there'}!</p><p>${chatbotMessage.replace(/\n/g, '<br>')}</p>`,
    });

    const newMessage = await insertMessage(conversation_id, 'chatbot', chatbotMessage, 'unread');
    await pool.query(
      `UPDATE chat.messages 
       SET read_status = 'read', updated_at = NOW() 
       WHERE conversation_id = $1 AND read_status = 'unread'`,
      [conversation_id],
    );

    await pool.query(
      `UPDATE chat.conversations 
       SET status = $1, last_message = $2, read_status = $3, last_date = NOW(), updated_at = NOW() 
       WHERE id = $4`,
      ['replied', chatbotMessage, 'unread', conversation_id],
    );

    return res.status(201).json({
      message: 'Message inserted and email sent successfully.',
      chatbotResponse: chatbotMessage,
      newMessage,
    });
  } catch (err) {
    console.error('Error saving message or sending email:', err.message || err);
    return res.status(500).json({ error: 'Failed to send message', detail: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

setInterval(() => {
  checkEmailsAndReply().catch(console.error);
}, 60 * 1000);

// ===============
// whatsapp boot
// ===============

const { createWhatsAppSession } = require('./waConnect/src/service/chatbot_no_database');

(async () => {
  try {
    // Membuat sesi WhatsApp tanpa database
    const client = await createWhatsAppSession('mySession');

    console.log('✅ WhatsApp session "mySession" berhasil dibuat.');
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat menjalankan bot:', error);
  }
})();

// === Error Handling ===
waConnectApp.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan internal' });
});

waConnectApp.listen(port2, () => {
  console.log(`Server running on http://localhost:${port2}`);
});
