const express = require('express');
const router = express.Router();
const {
  insertConversation,
  getAllConversations,
  getConversationById,
  updateConversation,
  deleteConversation,
  insertMessage,
  getMessagesByConversationId,
} = require('../models'); // Make sure to define these functions in your models

// Route to fetch all conversations
router.get('/conversations', async (req, res) => {
  try {
    const data = await getAllConversations();  // Get all conversations from the DB
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations', detail: err.message });
  }
});

// Route to fetch a specific conversation by ID
router.get('/conversations/:id', async (req, res) => {
  try {
    const data = await getConversationById(req.params.id);  // Fetch conversation by ID
    if (!data) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation', detail: err.message });
  }
});

// Route to create a new conversation
router.post('/conversations', async (req, res) => {
  const { channel_id, user_id, username, last_message, read_status, last_date, session_id, status } = req.body;

  if (!channel_id || !user_id || !username || !last_message || !read_status || !last_date || !session_id || !status) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const data = await insertConversation(channel_id, user_id, username, last_message, read_status, last_date, session_id, status);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create conversation', detail: err.message });
  }
});

// Route to update a conversation
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

// Route to delete a conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    const data = await deleteConversation(req.params.id);  // Delete conversation by ID
    if (!data) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation', detail: err.message });
  }
});

// Route to fetch messages of a conversation
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await getMessagesByConversationId(req.params.id);  // Get messages for a specific conversation
    if (!messages) {
      return res.status(404).json({ message: 'No messages found for this conversation' });
    }
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages', detail: err.message });
  }
});

// Route to post a new message for a conversation
router.post('/conversations/:id/messages', async (req, res) => {
  const { sender_type, content, read_status } = req.body;

  if (!sender_type || !content || !read_status) {
    return res.status(400).json({ message: 'Sender type, content, and read status are required' });
  }

  try {
    const newMessage = await insertMessage(req.params.id, sender_type, content, read_status);  // Insert a new message
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message', detail: err.message });
  }
});

module.exports = router;
