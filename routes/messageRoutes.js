const express = require('express');
const jwt = require('jsonwebtoken');
const { getMessages } = require('../controllers/messageController');

const router = express.Router();

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Check karein ki header hai aur 'Bearer' se shuru ho raha hai
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // "Bearer <token>" mein se sirf token nikalna
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // User ka info request mein save kar diya
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

router.get('/messages/:recipient', requireAuth, getMessages);

module.exports = router;