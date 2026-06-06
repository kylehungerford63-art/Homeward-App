const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const userRepo = require('../db/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const existing = await userRepo.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = {
      id: uuidv4(),
      name,
      email,
      password_hash
    };

    await userRepo.createUser(user);

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userRepo.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.logout = (req, res) => {
  res.json({ message: 'Logged out' });
};
