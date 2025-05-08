module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ message: 'Token tidak ditemukan' });
    }
  
    const token = authHeader.split(' ')[1];
  
    if (token !== '1234567890abcdef') {
      return res.status(403).json({ message: 'Token tidak valid' });
    }
  
    next();
  };
  