exports.getUsers = async (req, res) => {
  try {
    const me = req.user.username.toLowerCase();
    // 'me' variable ko case-insensitive rakhein
    const users = await User.find({ username: { $ne: req.user.username } }).lean();

    const usersWithData = await Promise.all(users.map(async (user) => {
      const target = user.username.toLowerCase();
      
      // 1. Last message dhundhein
      const lastMsg = await Message.findOne({
        $or: [{ sender: me, recipient: target }, { sender: target, recipient: me }]
      }).sort({ timestamp: -1 }).lean();

      // 2. Unread messages count karein (Sirf wo jo samne wale ne bheje hain)
      const unreadCount = await Message.countDocuments({
        sender: target,
        recipient: me,
        isRead: false
      });

      return {
        _id: user._id,
        username: user.username,
        lastMessage: lastMsg?.message || 'Tap to start chatting',
        lastMessageAt: lastMsg?.timestamp || 0,
        unreadCount: unreadCount // Yeh field ab frontend ko milegi
      };
    }));

    // Sorting (Latest message upar rahega)
    usersWithData.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json(usersWithData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};