const express = require('express');
const { google } = require('googleapis');

const CLIENT_ID = '899772173579-c5kt079ntd2m846vle64s15spl8dlaev.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/gmail.modify'];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

const app = express();

app.get('/', (req, res) => {
  res.send(`<a href="${authUrl}">Login dengan Google</a>`);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    
    if (tokens.refresh_token) {
      console.log('Refresh Token:', tokens.refresh_token);
    }

    res.send('Autentikasi berhasil! Token sudah disimpan di server.');
    console.log('Access token:', tokens.access_token);
  } catch (err) {
    console.error('Gagal mengambil token', err);
    res.send('Gagal autentikasi.');
  }
});

app.listen(3000, () => {
  console.log('Server berjalan di http://localhost:3000');
  console.log('Buka ini di browser: http://localhost:3000');
});
