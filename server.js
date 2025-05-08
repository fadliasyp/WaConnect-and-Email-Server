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
const { getConversationBySessionId } = require('./models/index');
const bodyParser = require('body-parser');
const conversationRoutes = require('./routes/conversation');
app.use(bodyParser.json());
app.use('/api', conversationRoutes);
const { v4: uuidv4 } = require('uuid');

app.get('/conversation/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;
  try {
    const conversation = await getConversationBySessionId(sessionId);
    if (conversation && conversation.status === 'replied') {
      return res.send('This conversation has already been replied.');
    }
    res.json(conversation || { message: 'Conversation not found.' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Internal Server Error');
  }
});

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

app.post('/api/send-message', async (req, res) => {
  const { question, userEmail, sessionId } = req.body;

  if (!question || !userEmail || !sessionId) {
    return res.status(400).json({
      message: 'Field question, userEmail, and sessionId are required.',
    });
  }
  
  const username = userEmail.replace(/@(gmail\.com|icloud\.com)$/, '');  

  let chatbotMessage = 'No response from chatbot.';
  try {
    const chatbotRes = await axios.post(
      'https://api.majadigidev.jatimprov.go.id/api/external/chatbot/send-message',
      {
        question,
        session_id: sessionId,
        additional_context: '',
      }
    );

    const messages = chatbotRes.data?.data?.message || [];
    if (messages.length > 0) {
      chatbotMessage = messages.map(msg => msg.text).join('\n\n');

      const links = messages[0]?.suggest_links || [];
      if (links.length > 0) {
        let linkText = '\n\nLink Pages:\n';
        links.forEach(link => {
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

  const result = await pool.query('SELECT * FROM chat.conversations WHERE session_id = $1 LIMIT 1', [sessionId]);
  let conversation = result.rows[0];
  if (conversation && conversation.status === 'replied') {
    return res.status(400).json({
      message: 'This conversation has already been replied.',
    });
  }

  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Majadigi Chatbot" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Response from Majadigi Chatbot',
      html: `<p>Hi ${username || 'there'}!</p><p>${chatbotMessage}</p>`,
    });

    if (!conversation) {
      const newId = uuidv4();
      const newChannelId = uuidv4(); 
      const userId = userEmail; 
      const lastMessage = chatbotMessage; 
      const readStatus = 'unread'; 
    
     
      const insertResult = await pool.query(
        'INSERT INTO chat.conversations (id, session_id, channel_id, user_id, username, last_message, read_status, status, created_at) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [
          newId, sessionId, newChannelId, userId, username, lastMessage, readStatus, 'pending', new Date()
        ]
      );
      conversation = insertResult.rows[0]; 
    }

    const newMessageId = uuidv4(); 

    await pool.query(
      'INSERT INTO chat.messages (id, conversation_id, sender_type, content, sent_at) VALUES ($1, $2, $3, $4, $5)',
      [newMessageId, conversation.id, 'chatbot', chatbotMessage, new Date()]
    );

    await pool.query('UPDATE chat.conversations SET status = $1 WHERE session_id = $2', ['replied', sessionId]);

    res.status(200).json({
      message: 'Email sent successfully',
      chatbotResponse: chatbotMessage,
    });
  } catch (emailError) {
    console.error('Error sending email:', emailError.message || emailError);
    res.status(500).json({
      message: 'Failed to send email.',
      error: emailError.message || emailError,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

setInterval(() => {
  checkEmailsAndReply().catch(console.error);
}, 60 * 1000);
