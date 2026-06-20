const Message = require('./models/Message');
const socketAuthMiddleware = require('./middleware/socketAuthMiddleware');

module.exports = (io) => {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const username = socket.user.username;
    socket.join(username);

    socket.on('send_message', async (data, ack) => {
      try {
        const recipient = `${data.recipient || ''}`.trim();
        const text = `${data.message || data.text || ''}`.trim();

        if (!recipient || !text) return;

        const saved = await Message.create({
          sender: username,
          recipient,
          message: text,
        });

        io.to(username).to(recipient).emit('receive_message', saved);

        if (typeof ack === 'function') {
          ack({ ok: true });
        }
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ ok: false });
        }
      }
    });
  });
};
