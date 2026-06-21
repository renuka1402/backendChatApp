const Message = require('../models/Message');

exports.getMessages = async (req, res) => {
  try {
    const sender = req.user.username.toLowerCase();
    const recipient = req.params.recipient.toLowerCase();

    // 1. Pehle saare unread messages ko 'read' mark karein
    await Message.updateMany(
      { sender: recipient, recipient: sender, isRead: false },
      { $set: { isRead: true } }
    );

    // 2. Ab messages fetch karein
    const messages = await Message.find({
      $or: [
        { sender, recipient },
        { sender: recipient, recipient: sender }
      ]
    }).sort({ timestamp: 1 }).lean();

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
exports.deleteMessage = async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
};