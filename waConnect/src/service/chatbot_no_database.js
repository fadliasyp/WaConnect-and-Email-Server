const fs = require('fs');
const wppconnect = require('@wppconnect-team/wppconnect');
const sharp = require('sharp');
const moment = require('moment-timezone');
const ffmpeg = require('ffmpeg-static');
const { execSync } = require('child_process');
const axios = require('axios');
const path = require('path');
const { v4: uuid } = require('uuid');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { SESSION_PATH, QR_FOLDER_PATH } = require('../config/paths');

dayjs.extend(utc);
dayjs.extend(timezone);

const sessions = new Map();

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Folder dibuat: ${dirPath}`);
  }
}

async function createWhatsAppSession(sessionName) {
  try {
    ensureDirExists(QR_FOLDER_PATH);
    for (const sub of ['images', 'videos', 'documents', 'voice_notes/ogg', 'voice_notes/mp3']) {
      ensureDirExists(`./media/${sub}`);
    }

    const qrPath = path.join(QR_FOLDER_PATH, `${sessionName}.png`);

    if (!fs.existsSync(QR_FOLDER_PATH)) {
      fs.mkdirSync(QR_FOLDER_PATH, { recursive: true });
    }

    if (sessions.has(sessionName)) {
      return sessions.get(sessionName);
    }

    const client = await wppconnect.create({
      session: sessionName,
      sessionPath: SESSION_PATH,
      autoClose: false,
      catchQR: async (base64Qr) => {
        const matches = base64Qr.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches) return;
        const imageBuffer = Buffer.from(matches[2], 'base64');
        await sharp(imageBuffer)
          .extend({ top: 20, bottom: 20, left: 20, right: 20, background: 'white' })
          .toFile(qrPath);
        console.log(`✅ QR code disimpan: ${qrPath}`);
      },
      puppeteerOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: process.env.CHROME_PATH || undefined,
      },
    });

    client.onStateChange((state) => {
      console.log(`📡 State berubah: ${state}`);
    });

    client.onMessage(async (message) => {
      try {
        await processMessage(client, message);
      } catch (err) {
        console.error('❌ Error process message:', err);
      }
      if (forwardMessageToAdonis == true) {
        try {
          await forwardMessageToAdonis(message);
        } catch (err) {
          console.error('Error forwarding message to Adonis:', err);
        }
      }
    });

    sessions.set(sessionName, client);
    return client;
  } catch (error) {
    console.error('❌ Gagal membuat sesi:', error);
    throw error;
  }
}

async function processMessage(client, message) {
  if (message.isStatus || message.isStory || message.isGroupMsg || isChannelMessage(message)) {
    console.log('Pesan status/story/saluran diabaikan.');
    return;
  }

  if (
    !message.body &&
    !message.caption &&
    !message.isLocation &&
    !message.mimetype &&
    !message.isVoiceMessage
  ) {
    console.log('Pesan tanpa konten diabaikan.');
    return;
  }

  if (message.isGroupMsg) {
    console.log('Pesan dari grup diabaikan.');
    return;
  }

  if (message.type === 'sticker') {
    console.log('Pesan stiker diabaikan.');
    return;
  }

  const now = dayjs().tz('Asia/Jakarta');
  console.log(`[${now.format('YYYY-MM-DD HH:mm:ss')}] Pesan diterima dari ${message.from}`);
  const phoneNumber = message.from.split('@')[0];
  const sessionName = client.session;

  let mediaUrl = null;
  let messageType = 'text';
  let content = '';

  try {
    if (message.isVoiceMessage) {
      messageType = 'voice_note';
      const buffer = await client.downloadMedia(message);
      const voiceOggPath = `./media/voice_notes/ogg/vn_${now.valueOf()}.ogg`;
      const voiceMp3Path = `./media/voice_notes/mp3/vn_${now.valueOf()}.mp3`;

      fs.writeFileSync(voiceOggPath, buffer);

      try {
        execSync(
          `"${ffmpeg}" -i "${voiceOggPath}" -codec:a libmp3lame -qscale:a 2 "${voiceMp3Path}"`,
          { timeout: 10000 },
        );
        mediaUrl = voiceMp3Path;
        content = 'Voice note (MP3)';
      } catch (err) {
        mediaUrl = voiceOggPath;
        content = 'Voice note (OGG)';
      }
    } else if (message.isLocation) {
      messageType = 'location';
      mediaUrl = `https://maps.google.com/?q=${message.lat},${message.lng}`;
      content = `Lokasi: ${message.description || 'Tanpa deskripsi'} (${message.lat}, ${
        message.lng
      })`;
    } else if (message.mimetype) {
      const buffer = await client.decryptFile(message);
      const extension = message.mimetype.split('/')[1] || 'bin';
      const folderConfig = getMediaFolder(message.mimetype);
      ensureDirExists(folderConfig.folder);

      // Gunakan nama file asli (jika ada)
      const originalFileName = message.filename || `${now.valueOf()}`;
      const filePath = `${folderConfig.folder}/${originalFileName}.${extension}`;
      fs.writeFileSync(filePath, buffer);

      mediaUrl = filePath;
      messageType = folderConfig.type;

      if (message.caption) {
        content = message.caption;
      }

      console.log(
        `[${now.format('YYYY-MM-DD HH:mm:ss')}] File ${folderConfig.type} disimpan: ${filePath}`,
      );
    }

    if (message.body && message.type === 'chat') {
      content = message.body;
      const result = await sendToChatbot(message.body);
      try {
        // Kirim webhook ke AdonisJS dan tunggu respons sukses
        const adonisResponse = await axios.post(
          `${process.env.ADONIS_SERVER_URL}/api/whatsapp/webhook/whatsapp`,
          // 'http://localhost:3333/api/webhook/whatsapp',
          {
            from: message.from,
            pushname: message.sender.pushname,
            sessionName: sessionName,
            message: {
              body: message.body,
              caption: message.caption,
              type: message.type,
              mimetype: message.mimetype,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              // 'Authorization': `Bearer ${process.env.ADONIS_API_KEY}` // Tambahkan ini jika perlu autentikasi
            },
            timeout: 30000, // 10 detik timeout
          },
        );

        // -----------fadli----------
        // if (result.success) {
        //   console.log(`Mengirim jawaban (${result.fullReply.length} chars, ${result.responseTime}s)`);
        //   await sendWithTimeout(client, message.from, result.fullReply);
        // } else {
        //   await sendWithTimeout(client, message.from, result.error || 'Terjadi kesalahan.');
        // }

        console.log(
          `[${now.format('YYYY-MM-DD HH:mm:ss')}] Pesan ${messageType} dari ${message.from}: ${
            message.body
          }`,
        );

        console.log(`✅ Pesan berhasil dikirim ke AdonisJS: ${adonisResponse.data.success}`);

        // Tidak perlu menunggu respons dari chatbot - AdonisJS akan menangani itu
        // dan akan mengirim respons ke pengguna secara asinkron
      } catch (error) {
        console.error('❌ Gagal mengirim pesan ke AdonisJS:', error.message);

        // Fallback: Proses seperti biasa jika AdonisJS tidak tersedia
        const result = await sendToChatbot(message.body);

        if (result.success) {
          console.log(
            `Mengirim jawaban (${result.fullReply.length} chars, ${result.responseTime}s)`,
          );
          await sendWithTimeout(client, message.from, result.fullReply);
        } else {
          await sendWithTimeout(client, message.from, result.error || 'Terjadi kesalahan.');
        }
      }
    } else {
      content = message.body;
      // Untuk pesan non-teks, simpan ke database tanpa reply
      try {
        // Kirim webhook ke AdonisJS dan tunggu respons sukses
        const adonisResponse = await axios.post(
          `${process.env.ADONIS_SERVER_URL}/api/whatsapp/webhook/whatsapp`,
          // 'http://localhost:3333/api/webhook/whatsapp',
          {
            from: message.from,
            pushname: message.sender.pushname,
            sessionName: sessionName,
            message: {
              body: message.body,
              caption: message.caption,
              type: message.type,
              mimetype: message.mimetype,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              // 'Authorization': `Bearer ${process.env.ADONIS_API_KEY}` // Tambahkan ini jika perlu autentikasi
            },
            timeout: 30000, // 10 detik timeout
          },
        );

        console.log(
          `[${now.format('YYYY-MM-DD HH:mm:ss')}] Pesan ${messageType} dari ${message.from}: ${
            message.body
          }`,
        );
        console.log(`✅ Pesan berhasil dikirim ke AdonisJS: ${adonisResponse.data.success}`);
      } catch (error) {
        console.error('❌ Gagal mengirim pesan ke AdonisJS:', error.message);

        const result = await sendToChatbot(message.body);

        if (result.success) {
          console.log(
            `Mengirim jawaban (${result.fullReply.length} chars, ${result.responseTime}s)`,
          );
          await sendWithTimeout(client, message.from, result.fullReply);
        } else {
          await sendWithTimeout(client, message.from, result.error || 'Terjadi kesalahan.');
        }
      }
    }

    // Handle perintah logout
    if (content && content.toLowerCase() === 'logout') {
      await client.logout();
      await client.restartService();
      console.log('✅ Berhasil logout dan restart layanan.');
      await client.sendText(
        message.from,
        '✅ Anda telah logout. Silakan scan QR code baru untuk login kembali.',
      );
    }
  } catch (err) {
    console.error(`❌ Error memproses pesan:`, err.message);
  }
}

function getMediaFolder(mimetype) {
  if (mimetype.startsWith('image/')) {
    return { folder: './media/images', type: 'image' };
  }
  if (mimetype.startsWith('video/')) {
    return { folder: './media/videos', type: 'video' };
  }
  if (mimetype.startsWith('audio/')) {
    return { folder: './media/audios', type: 'audio' };
  }
  return { folder: './media/documents', type: 'document' };
}

function isChannelMessage(message) {
  const from = message.from.toLowerCase();
  return (
    from.includes('@broadcast') ||
    from.includes('status@') ||
    (from.includes('@c.us') && message.isStatus)
  );
}

async function forwardMessageToAdonis(message) {
  try {
    // Format data yang akan dikirim
    const payload = {
      from: message.from, // e.g. "6281234567890@c.us"
      pushname: message.sender?.pushname || '',
      message: {
        body: message.body || message.caption || '',
        type: message.type,
        mimetype: message.mimetype,
      },
    };

    // Ganti 'whatsapp' dengan nama channel sesuai kebutuhan
    const response = await axios.post(
      `${process.env.ADONIS_SERVER_URL}/whatsapp/conversation`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Pesan berhasil diteruskan ke Adonis:', response.data);
  } catch (error) {
    console.error('❌ Gagal mengirim ke Adonis:', error.response?.data || error.message);
  }
}

// chatbotnya sudah bisa tapi kalau be pusat engga nyala maka tidak bisa menjawab pertanyaan
// async function sendToChatbot(message) {
//   try {
//     const response = await axios.post(`${process.env.CHATBOT_API_URL}/api/chat`, {
//       message,
//     });
//     return response.data;
//   } catch (err) {
//     return { success: false, error: 'Gagal menghubungi chatbot.' };
//   }
// }

async function sendToChatbot(question) {
  const data = JSON.stringify({ question });

  const config = {
    method: 'post',
    url: 'https://api.majadigidev.jatimprov.go.id/api/external/chatbot/send-message',
    headers: {
      'Content-Type': 'application/json',
      Cookie:
        'adonis-session=s%3AeyJtZXNzYWdlIjoiY204c2Z1eWl4MDc4azAxbnVld2FqMnY0aiIsInB1cnBvc2UiOiJhZG9uaXMtc2Vzc2lvbiJ9.AcThXp7bikyoST3mnyromozkXvIItQRaPWTbmh0vfxs; cm8sfuyix078k01nuewaj2v4j=e%3AEGkeKzKuF2lOF2zE80Eorr5Xa_PVq3ZhsW6RiB1Yq7noSo9YlbbwTU3Lj_jMYYUFa1YGBkbRMGyYrqvsNBZp2w.V2p3NWxXcjQzSzI5eW1nRA.H0xpbbSqQIL4m9DGksFfU6NGz7qrBkv4iz5udBbKEpM', // cookie lengkap
    },
    data: data,
    timeout: 40000,
  };

  try {
    // Tambahkan log untuk tracking
    console.log('Mengirim pertanyaan ke chatbot:', question.substring(0, 50) + '...');
    const startTime = Date.now();

    const response = await axios.request(config);

    const processingTime = (Date.now() - startTime) / 1000;
    console.log(`Chatbot merespons dalam ${processingTime} detik`);

    if (!response.data?.data?.message?.[0]?.text) {
      throw new Error('Struktur respons tidak valid');
    }

    const chatbotMessage = response.data.data.message[0];
    let fullReply = chatbotMessage.text;

    // Formatting
    fullReply = fullReply
      .replace(/\*\*/g, '') // Hapus markdown bold
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1: $2') // Konversi markdown links
      .replace(/\\n/g, '\n'); // Konversi newline

    // Tambahkan link terkait
    if (chatbotMessage.suggest_links?.length > 0) {
      fullReply += '\n\n Link Terkait:';
      chatbotMessage.suggest_links.forEach((link) => {
        fullReply += `\n- ${link.title}: ${link.link}`;
      });
    }

    return {
      success: true,
      fullReply: fullReply,
      responseTime: processingTime,
      messageType: 'text',
    };
  } catch (error) {
    console.error('Error details:', {
      config: {
        url: config.url,
        data: config.data.length > 100 ? config.data.substring(0, 100) + '...' : config.data,
      },
      error: error.message,
      stack: error.stack,
    });

    // Retry mechanism untuk timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('Mencoba kembali...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return sendToChatbot(question);
    }

    return {
      success: false,
      error: 'Chatbot sedang sibuk, silakan coba lagi nanti',
    };
  }
}

async function sendWithTimeout(client, to, text) {
  return new Promise((resolve) => {
    setTimeout(() => {
      client.sendText(to, text).then(resolve).catch(console.error);
    }, 1000);
  });
}

module.exports = {
  sessions,
  createWhatsAppSession,
  sendToChatbot,
};
