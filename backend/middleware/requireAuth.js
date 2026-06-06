const jwt = require('jsonwebtoken');
const userRepo = require('../db/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

module.exports = async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // ⭐ If no token → allow guest mode
  if (!authHeader) {
    req.user = { id: 0, userId: 0, guest: true };
    return next();
  }

  // ⭐ If token exists but is malformed → reject
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // ⭐ Look up real user
    const user = await userRepo.findUserById(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
