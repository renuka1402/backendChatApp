const User = require('../models/User');
const Message = require('../models/Message');

exports.getUsers = async (req, res) => {
  try {
    const me = req.user.username.toLowerCase();
    const users = await User.find({ username: { $ne: req.user.username } }).lean();

    const usersWithLastMessage = await Promise.all(users.map(async (user) => {
      const target = user.username.toLowerCase();
      const lastMsg = await Message.findOne({
        $or: [{ sender: me, recipient: target }, { sender: target, recipient: me }]
      }).sort({ timestamp: -1 }).lean();

      return {
        _id: user._id,
        username: user.username,
        lastMessage: lastMsg?.message || 'Tap to start chatting',
        lastMessageAt: lastMsg?.timestamp || 0
      };
    }));

    usersWithLastMessage.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    res.json(usersWithLastMessage);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};