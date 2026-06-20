const express = require('express');
const jwt = require('jsonwebtoken');
const { getUsers } = require('../controllers/userController');

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

router.get('/users', requireAuth, getUsers);

module.exports = router;