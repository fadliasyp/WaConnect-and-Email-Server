// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();
// const JWT_SECRET = process.env.JWT_SECRET || '123456';

// const authenticateToken = async (req, res, next) => {
//   try {
//     // 1. Ambil token dari header Authorization
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];

//     if (!token) {
//       return res.status(401).json({ error: 'Token autentikasi diperlukan' });
//     }

//     // 2. Cek apakah token valid di database (tanpa verifikasi JWT)
//     const validToken = await prisma.apiKey.findUnique({
//       where: { key: token },
//       select: {
//         userId: true,
//         expiresAt: true,
//         isActive: true,
//       },
//     });

//     if (!validToken || !validToken.isActive || new Date(validToken.expiresAt) < new Date()) {
//       return res.status(403).json({ error: 'Token tidak valid atau telah kadaluarsa' });
//     }

//     // 3. Tambahkan informasi user ke request
//     req.user = { userId: validToken.userId };
//     next();
//   } catch (error) {
//     console.error('Error autentikasi token:', error);
//     return res.status(403).json({ error: 'Token tidak valid' });
//   }
// };

// module.exports = { authenticateToken };
