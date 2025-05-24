require("dotenv").config();
const pool = require("./config/db");
const axios = require("axios");
const express = require("express");
const nodemailer = require("nodemailer");
const checkEmailsAndReply = require("./gmailReader");
const app = express();
const port = process.env.PORT || 3000;
const chatbotRoutes = require("./routes/chatbotRoutes");
app.use("/api", chatbotRoutes);
const { getConversationBySessionId } = require("./models/index");
const bodyParser = require("body-parser");
const conversationRoutes = require("./routes/conversation");
app.use(bodyParser.json());
app.use("/api", conversationRoutes);
const { v4: uuidv4 } = require("uuid");

const authRouter = require("./waConnect/src/service/routes/auth");
const chatbotRouter = require("./waConnect/src/service/routes/chatbot");
const {
  authenticateToken,
} = require("./waConnect/src/middleware/auth-middleware");
const sendReplyRouter = require("./waConnect/src/service/routes/webhok");

app.use(express.json());

waConnectApp = express();
waConnectApp.use(express.json());
waConnectApp.use(sendReplyRouter);
waConnectApp.use("/auth", authRouter);
waConnectApp.use("/api", authenticateToken, chatbotRouter);
const port2 = 21465;

app.get("/conversation/:sessionId", async (req, res) => {
  const sessionId = req.params.sessionId;
  try {
    const conversation = await getConversationBySessionId(sessionId);
    if (conversation && conversation.status === "replied") {
      return res.send("This conversation has already been replied.");
    }
    res.json(conversation || { message: "Conversation not found." });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

app.post("/api/send-message", async (req, res) => {
  const { question, userEmail, sessionId } = req.body;

  if (!question || !userEmail || !sessionId) {
    return res.status(400).json({
      message: "Field question, userEmail, and sessionId are required.",
    });
  }

  const username = userEmail.replace(/@(gmail\.com|icloud\.com)$/, "");

  // Ambil conversation berdasarkan session_id
  const convoResult = await pool.query(
    "SELECT * FROM chat.conversations WHERE session_id = $1 LIMIT 1",
    [sessionId]
  );
  let conversation = convoResult.rows[0];

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found." });
  }

  // Cek apakah ada pesan user dengan read_status = 'unread'
  const unreadUserMsgResult = await pool.query(
    `SELECT * FROM chat.messages 
     WHERE conversation_id = $1 AND sender_type = 'user' AND read_status = 'unread'`,
    [conversation.id]
  );

  if (unreadUserMsgResult.rows.length === 0) {
    // Tidak ada pesan user yang belum dibaca berarti chatbot sudah membalas
    return res.status(400).json({
      message:
        "This conversation has already been replied (no unread user messages).",
    });
  }

  // Kirim ke chatbot API
  let chatbotMessage = "No response from chatbot.";
  try {
    const chatbotRes = await axios.post(
      "https://api.majadigidev.jatimprov.go.id/api/external/chatbot/send-message",
      {
        question,
        session_id: sessionId,
        additional_context: "",
      }
    );

    const messages = chatbotRes.data?.data?.message || [];
    if (messages.length > 0) {
      chatbotMessage = messages.map((msg) => msg.text).join("\n\n");

      const links = messages[0]?.suggest_links || [];
      if (links.length > 0) {
        let linkText = "\n\nLink Pages:\n";
        links.forEach((link) => {
          linkText += `${link.title}: ${link.link}\n`;
        });
        chatbotMessage += linkText;
      }
    }
  } catch (error) {
    console.error("Chatbot API Error:", error.message || error);
    return res.status(500).json({
      message: "Failed to get chatbot response.",
      error: error.message || error,
    });
  }

  try {
    // Kirim email ke user
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Majadigi Chatbot" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Response from Majadigi Chatbot",
      html: `<p>Hi ${username || "there"}!</p><p>${chatbotMessage}</p>`,
    });

    // Simpan pesan chatbot ke database
    const newMessageId = uuidv4();
    await pool.query(
      "INSERT INTO chat.messages (id, conversation_id, sender_type, content, sent_at, read_status) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        newMessageId,
        conversation.id,
        "chatbot",
        chatbotMessage,
        new Date(),
        "unread",
      ]
    );

    // Update semua pesan user yang belum dibaca menjadi 'read'
    await pool.query(
      `UPDATE chat.messages 
       SET read_status = 'read', updated_at = NOW() 
       WHERE conversation_id = $1 AND sender_type = 'user' AND read_status = 'unread'`,
      [conversation.id]
    );

    // Update status conversation jadi replied
    await pool.query(
      "UPDATE chat.conversations SET status = $1, last_message = $2, read_status = $3, last_date = NOW() WHERE id = $4",
      ["replied", chatbotMessage, "unread", conversation.id]
    );

    res.status(200).json({
      message: "Email sent and chatbot response saved successfully",
      chatbotResponse: chatbotMessage,
    });
  } catch (emailError) {
    console.error("Error sending email:", emailError.message || emailError);
    res.status(500).json({
      message: "Failed to send email.",
      error: emailError.message || emailError,
    });
  }
});

setInterval(() => {
  checkEmailsAndReply().catch(console.error);
}, 60 * 1000);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// ===============

const {
  createWhatsAppSession,
} = require("./waConnect/src/service/chatbot_no_database");

(async () => {
  try {
    // Membuat sesi WhatsApp tanpa database
    const client = await createWhatsAppSession("mySession");

    console.log('✅ WhatsApp session "mySession" berhasil dibuat.');
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat menjalankan bot:", error);
  }
})();

// === Error Handling ===
waConnectApp.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Terjadi kesalahan internal" });
});

waConnectApp.listen(port2, () => {
  console.log(`Server running on http://localhost:${port2}`);
});
