const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/db');
const nodemailer = require('nodemailer');

const {
  insertConversation,
  getAllConversations,
  getConversationById,
  updateConversation,
  deleteConversation,
  insertMessage,
  getAllMessages,
  getMessagesByConversationId,
  markUserMessagesAsRead,
} = require('../models/index');

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}


router.post('/conversations', async (req, res) => {
  const { channel_id, user_id, username, last_message, read_status, last_date, session_id, status } = req.body;

  if (!channel_id || !user_id || !username || !last_message || read_status === undefined || !session_id || !status) {
    return res.status(400).json({ message: 'All fields except last_date are required' });
  }

  const id = uuidv4();
  const parsedLastDate = (!last_date || isNaN(Date.parse(last_date))) ? null : last_date;

  try {
    const data = await insertConversation(id, channel_id, user_id, username, last_message, read_status, parsedLastDate, session_id, status);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create conversation', detail: err.message });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const data = await getAllConversations();
    console.log('Data conversations:', data);
    res.json(data);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations', detail: err.message });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const data = await getConversationById(req.params.id); 
    if (!data) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation', detail: err.message });
  }
});

// router.post('/messages/:id', async (req, res) => {
//   const conversation_id = req.params.id;
//   const { sender_type, content, read_status } = req.body;

//   if (!sender_type || !content || read_status === undefined) {
//     return res.status(400).json({ message: 'Sender type, content, and read status are required' });
//   }

//   try {
//     const newMessage = await insertMessage(conversation_id, sender_type, content, read_status);

//     // Jika yang kirim chatbot, update semua pesan user yang unread jadi read
//     if (sender_type === 'chatbot') {
//       await markUserMessagesAsRead(conversation_id);
//     }

//     res.status(201).json(newMessage);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to send message', detail: err.message });
//   }
// });

router.put('/conversations/:id', async (req, res) => {
  const { last_message, read_status, last_date, status } = req.body;

  if (!last_message || !read_status || !last_date || !status) {
    return res.status(400).json({ message: 'All fields are required to update the conversation' });
  }

  try {
    const data = await updateConversation(req.params.id, last_message, read_status, last_date, status);
    if (!data) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update conversation', detail: err.message });
  }
});

router.delete('/conversations/:id', async (req, res) => {
  try {
    const data = await deleteConversation(req.params.id); 
    if (!data) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation', detail: err.message });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const messages = await getAllMessages();
    if (!messages || messages.length === 0) {
      return res.status(404).json({ message: 'No messages found' });
    }
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages', detail: err.message });
  }
});

router.get('/messages/:id', async (req, res) => {
  try {
    const messages = await getMessagesByConversationId(req.params.id);
    if (!messages || messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this conversation' });
    }
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages', detail: err.message });
  }
});

module.exports = router;
