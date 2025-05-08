const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/email/conversation', async (req, res) => {
  try {
    const response = await axios.get('https://be-pusat.example.com/email/conversation');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations', detail: err.message });
  }
});

router.post('/email/conversation', async (req, res) => {
  try {
    const response = await axios.post('https://be-pusat.example.com/email/conversation', req.body);
    res.status(201).json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create conversation', detail: err.message });
  }
});

router.get('/email/messages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`https://be-pusat.example.com/email/messages/${id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch message by ID', detail: err.message });
  }
});

router.post('/email/messages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.post(`https://be-pusat.example.com/email/messages/${id}`, req.body);
    res.status(201).json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to post message by ID', detail: err.message });
  }
});

module.exports = router;
