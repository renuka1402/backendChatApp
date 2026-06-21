const User = require('../models/User');
const Message = require('../models/Message');

exports.getUsers = async (req, res) => {
  try {
    const me = req.user.username.toLowerCase();

    const users = await User.aggregate([
      { $match: { username: { $ne: req.user.username } } },
      {
        $lookup: {
          from: 'messages',
          let: { targetUser: { $toLower: "$username" } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $or: [ { $eq: ["$sender", me] }, { $eq: ["$sender", "$$targetUser"] } ] },
                    { $or: [ { $eq: ["$recipient", "$$targetUser"] }, { $eq: ["$recipient", me] } ] }
                  ]
                }
              }
            },
            { $sort: { timestamp: -1 } },
            { $limit: 1 }
          ],
          as: 'lastMsg'
        }
      },
      {
        $lookup: {
          from: 'messages',
          let: { targetUser: { $toLower: "$username" } },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ["$sender", "$$targetUser"] }, { $eq: ["$recipient", me] }, { $eq: ["$isRead", false] } ] } } },
            { $count: "count" }
          ],
          as: 'unreadData'
        }
      },
      {
        $project: {
          username: 1,
          lastMessage: { $ifNull: [{ $arrayElemAt: ["$lastMsg.message", 0] }, "Tap to start chatting"] },
          lastMessageAt: { $ifNull: [{ $arrayElemAt: ["$lastMsg.timestamp", 0] }, 0] },
          unreadCount: { $ifNull: [{ $arrayElemAt: ["$unreadData.count", 0] }, 0] }
        }
      }
    ]);

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};