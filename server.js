const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_change_this";

// MongoDB Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  password: { type: String, required: true },
});

const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true, trim: true, index: true },
  recipient: { type: String, required: true, trim: true, index: true },
  message: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now, index: true },
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

// Auth Helpers
function createToken(user) {
  return jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
}

function getToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

function requireAuth(req, res, next) {
  try {
    req.user = jwt.verify(getToken(req), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Routes
app.get("/", (req, res) => { res.json({ status: "Chat server running" }); });

app.post("/api/register", async (req, res) => {
  try {
    const username = `${req.body.username || ""}`.trim();
    const password = `${req.body.password || ""}`;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });
    res.status(201).json({ token: createToken(user), username: user.username });
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 500).json({ error: "Registration failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const username = `${req.body.username || ""}`.trim();
    const password = `${req.body.password || ""}`;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ token: createToken(user), username: user.username });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// ====== FIXED & CLEAN CASE-INSENSITIVE USER ROUTE ======
app.get("/api/users", requireAuth, async (req, res) => {
  try {
    const loggedInUser = req.user.username;
    
    // 1. Apne alawa baaki saare users find karein
    const users = await User.find({ username: { $ne: loggedInUser } }).select("username").lean();
    const usersWithLastMessage = [];

    // 2. Safe Loop ke sath har ek user ka last message nikalein (Case-Insensitive)
    for (const user of users) {
      const lastMsg = await Message.findOne({
        $or: [
          { sender: { $regex: new RegExp(`^${loggedInUser}$`, "i") }, recipient: { $regex: new RegExp(`^${user.username}$`, "i") } },
          { sender: { $regex: new RegExp(`^${user.username}$`, "i") }, recipient: { $regex: new RegExp(`^${loggedInUser}$`, "i") } }
        ]
      })
      .sort({ timestamp: -1 })
      .select("message timestamp")
      .lean();

      usersWithLastMessage.push({
        _id: user._id,
        username: user.username,
        lastMessage: lastMsg ? lastMsg.message : "Tap to start chatting",
        lastMessageAt: lastMsg ? lastMsg.timestamp : null
      });
    }

    // 3. Chat order filter (Latest messages wale upar aayenge)
    usersWithLastMessage.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    // 4. Send Clean Array Direct Response
    res.json(usersWithLastMessage);

  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/messages/:recipient", requireAuth, async (req, res) => {
  try {
    const recipient = `${req.params.recipient || ""}`.trim();
    const messages = await Message.find({
      $or: [
        { sender: { $regex: new RegExp(`^${req.user.username}$`, "i") }, recipient: { $regex: new RegExp(`^${recipient}$`, "i") } },
        { sender: { $regex: new RegExp(`^${recipient}$`, "i") }, recipient: { $regex: new RegExp(`^${req.user.username}$`, "i") } }
      ]
    }).sort({ timestamp: 1 }).lean();
    res.json(messages);
  } catch { res.status(500).json({ error: "Failed to fetch messages" }); }
});

// Socket.io Secure Room Connection Logic
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error"));
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { next(new Error("Authentication error")); }
});

io.on("connection", (socket) => {
  const username = socket.user.username;
  socket.join(username);

  socket.on("send_message", async (data, ack) => {
    try {
      const recipient = `${data.recipient || ""}`.trim();
      const text = `${data.message || data.text || ""}`.trim();
      if (!recipient || !text) return;

      const saved = await Message.create({ sender: username, recipient, message: text });
      
      // Personal Secure Rooms logic (Bina pooray app par broadcast kiye)
      io.to(username).to(recipient).emit("receive_message", saved);
      if (typeof ack === "function") ack({ ok: true });
    } catch { if (typeof ack === "function") ack({ ok: false }); }
  });
});

// Database Connection & Server Init
const dbURI = "mongodb+srv://renu1402:Ankit%401705@cluster0.q0h1cvi.mongodb.net/chatDatabase?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(dbURI).then(() => console.log("MongoDB Atlas Connected Successfully! ✅"));

server.listen(PORT, "0.0.0.0", () => { console.log(`Server live on port ${PORT}`); });