const express = require('express');
const nodemailer = require('nodemailer');
const Imap = require('imap');
const { google } = require('googleapis');
const router = express.Router();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const IMAP_HOST = process.env.IMAP_HOST;
const IMAP_PORT = process.env.IMAP_PORT;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const ENCRYPTION = process.env.ENCRYPTION;

const logEntry = require('../middlewares/logger');
const authMiddleware = require('../middlewares/auth');

const logActivity = (type, description, req) => {
  const logData = {
    type: type,
    description: description,
    user_id: req.user ? req.user.id : 'unknown', 
    ip_address: req.ip,
  };
  logEntry(logData);
};

router.post('/api/email-auth/master', (req, res) => {
  const { email, password, imap_host, imap_port, smtp_host, smtp_port, encryption } = req.body;

  if (!email || !password || !imap_host || !imap_port || !smtp_host || !smtp_port || !encryption) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  process.env.EMAIL_USER = email;
  process.env.EMAIL_PASS = password;
  process.env.IMAP_HOST = imap_host;
  process.env.IMAP_PORT = imap_port;
  process.env.SMTP_HOST = smtp_host;
  process.env.SMTP_PORT = smtp_port;
  process.env.ENCRYPTION = encryption;

  logActivity('auth', 'Email credentials stored successfully', req);
  res.status(200).json({ message: 'Email credentials stored successfully' });
});

router.get('/api/emails/inbox', authMiddleware, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Unauthorized' });

  const imap = new Imap({
    user: EMAIL_USER,
    password: EMAIL_PASS,
    host: IMAP_HOST,
    port: IMAP_PORT,
    tls: true,
  });

  const emails = [];
  
  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) return res.status(500).json({ message: 'Failed to open inbox' });

      const fetch = imap.seq.fetch('1:10', {
        bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'],
      });

      fetch.on('message', (msg, seqno) => {
        let emailData = {};

        msg.on('body', (stream) => {
          let buffer = '';
          stream.on('data', (chunk) => {
            buffer += chunk.toString();
          });
          stream.on('end', () => {
            emailData.body = buffer;
          });
        });

        msg.once('attributes', (attrs) => {
          emailData.attrs = attrs;
        });

        msg.once('end', () => {
          emails.push(emailData);
        });
      });

      fetch.once('end', () => {
        imap.end();
        res.json(emails);
        logActivity('email_in', 'Fetched emails from inbox', req);
      });
    });
  });

  imap.once('error', (err) => {
    console.error('IMAP error:', err);
    res.status(500).json({ message: 'IMAP connection error', error: err.message });
  });

  imap.connect();
});

router.post('/api/emails/fetch', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Unauthorized' });

  const imap = new Imap({
    user: EMAIL_USER,
    password: EMAIL_PASS,
    host: IMAP_HOST,
    port: IMAP_PORT,
    tls: true,
  });

  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) throw err;
      imap.search(['UNSEEN'], (err, results) => {
        if (err) throw err;
        imap.fetch(results, { bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)', struct: true });
        res.json({ message: 'Sync successful', fetched: results.length, new: results.length });
        logActivity('email_in', 'Synced unseen emails from inbox', req);
      });
    });
  });

  imap.connect();
});

router.post('/api/emails/send', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; 
  if (!token) return res.status(403).json({ message: 'Unauthorized' });

  const { to, subject, body, attachments } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: EMAIL_USER,
      to: to.join(','),
      subject: subject,
      text: body,
      attachments: attachments,
    });

    res.status(200).json({ status: 'sent', message_id: `<${Date.now()}>` });
    logActivity('email_out', `Email sent to ${to.join(',')}`, req);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send email', error: error.message });
    logActivity('error', `Failed to send email: ${error.message}`, req);
  }
});

router.get('/api/logs', authMiddleware, (req, res) => {
  const logs = [
    {
      id: 'log_001',
      timestamp: '2025-05-05T09:15:32Z',
      type: 'email_out',
      description: 'Email sent to user@example.com',
      ip_address: req.ip,
      user_id: req.user ? req.user.id : 'unknown',
    },
  ];

  res.json(logs);
});

module.exports = router;
