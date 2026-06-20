const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};
