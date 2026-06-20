const express = require('express');
const jwt = require('jsonwebtoken');
const { getUsers } = require('../controllers/userController');

const router = express.Router();

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization; // Header se token le rahe hain

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token' });
  }

  const token = authHeader.split(' ')[1]; // "Bearer " hata kar sirf token nikal rahe hain

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

router.get('/users', requireAuth, getUsers);

module.exports = router;


