require('dotenv').config();
const { google } = require('googleapis');

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

async function test() {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    console.log('[OK] Access Token berhasil:', token);
  } catch (err) {
    console.error('[ERROR] Refresh Token Gagal:', err.message);
  }
}

test();
