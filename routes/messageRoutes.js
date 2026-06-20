const express = require('express');
const jwt = require('jsonwebtoken');
const { getMessages } = require('../controllers/messageController');

const router = express.Router();

const requireAuth = (req, res, next) => {
  try {
    const token = req.cookies.token;
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

router.get('/messages/:recipient', requireAuth, getMessages);

module.exports = router;