const { google } = require('googleapis');
const axios = require('axios');
require('dotenv').config();

const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
);

oAuth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

async function checkEmailsAndReply() {
  console.log('[INFO] Memeriksa email masuk...');

  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) {
      console.log('[INFO] Tidak ada email baru.');
      return;
    }

    for (const message of messages) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      const headers = msg.data.payload.headers;
      const from = getHeader(headers, 'From');
      const subject = getHeader(headers, 'Subject');
      const emailBody = msg.data.snippet;

      if (from.includes('mailer-daemon@') || from.includes('noreply') || from.includes('no-reply')) {
        console.log(`[INFO] Email dari ${from} dilewati karena bukan pengirim valid.`);
        continue;
      }

      console.log(`[INFO] Email baru dari ${from}: ${emailBody}`);

      try {
        const chatbotResponse = await axios.post('http://localhost:3000/api/send-message', {
          question: emailBody,
          userEmail: from,
          sessionId: 'default-session-123',
        });

        if (!chatbotResponse.data || !chatbotResponse.data.chatbotResponse) {
          throw new Error('Respons dari chatbot tidak valid');
        }

        const replyText = chatbotResponse.data.chatbotResponse;

        const reply = [
          'To: ' + from,
          'Subject: Re: ' + subject,
          '',
          replyText,
        ].join('\n');

        const encoded = Buffer.from(reply)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encoded,
          },
        });

        console.log(`[INFO] Balasan dikirim ke ${from}`);

        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        });

      } catch (err) {
        console.error('[ERROR] Gagal membalas email:', err.message || err);
      }
    }
  } catch (err) {
    console.error('[ERROR] Gagal memeriksa email:', err.message || err);
  }
}

function getHeader(headers, name) {
  const found = headers.find(h => h.name === name);
  return found ? found.value : '';
}

module.exports = checkEmailsAndReply;
