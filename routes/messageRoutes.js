const express = require('express');
const jwt = require('jsonwebtoken');
const { getMessages, deleteMessage } = require('../controllers/messageController'); // 1. deleteMessage yahan add karein

const router = express.Router();

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// Routes
router.get('/messages/:recipient', requireAuth, getMessages);
router.delete('/messages/:id', requireAuth, deleteMessage);

module.exports = router;