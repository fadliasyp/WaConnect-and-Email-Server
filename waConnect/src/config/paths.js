const path = require('path');

// __filename dan __dirname sudah tersedia secara otomatis di CommonJS
// Jadi tidak perlu import atau definisi khusus seperti di ES module

// Folder sessions
const SESSION_PATH = path.join(__dirname, '../../sessions');

// Folder QR Codes (optional)
const QR_FOLDER_PATH = path.join(SESSION_PATH, 'qrcodes');

module.exports = {
  SESSION_PATH,
  QR_FOLDER_PATH,
};
