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

mongoose.set("bufferCommands", false);

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

MessageSchema.index({ sender: 1, recipient: 1, timestamp: 1 });

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

function createToken(user) {
  return jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
    expiresIn: "7d",
  });
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

app.get("/", (req, res) => {
  res.json({ status: "Chat server running" });
});

app.post("/api/register", async (req, res) => {
  try {
    const username = `${req.body.username || ""}`.trim();
    const password = `${req.body.password || ""}`;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });
    res.status(201).json({
      message: "User registered successfully",
      token: createToken(user),
      username: user.username,
    });
  } catch (err) {
    const isDuplicate = err.code === 11000;
    res.status(isDuplicate ? 409 : 500).json({
      error: isDuplicate ? "Username already exists" : "Registration failed",
    });
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
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// HAR USER KE SAATH UNKA LAST MESSAGE FETCH KARNE KA ROUTE
app.get("/api/users", requireAuth, async (req, res) => {
  try {
    const loggedInUser = req.user.username;

    const users = await User.find({ username: { $ne: loggedInUser } })
      .select("username")
      .lean();

    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMsg = await Message.findOne({
          $or: [
            { sender: loggedInUser, recipient: user.username },
            { sender: user.username, recipient: loggedInUser },
          ],
        })
        .sort({ timestamp: -1 })
        .select("message timestamp")
        .lean();

        return {
          _id: user._id,
          username: user.username,
          lastMessage: lastMsg ? lastMsg.message : "", 
          lastMessageAt: lastMsg ? lastMsg.timestamp : null,
        };
      })
    );

    usersWithLastMessage.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    res.json({ users: usersWithLastMessage });
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/messages/:recipient", requireAuth, async (req, res) => {
  try {
    const recipient = `${req.params.recipient || ""}`.trim();
    const messages = await Message.find({
      $or: [
        { sender: req.user.username, recipient },
        { sender: recipient, recipient: req.user.username },
      ],
    })
      .sort({ timestamp: 1 })
      .limit(200)
      .lean();
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      console.log("[socket:auth:error] token missing");
      return next(new Error("Authentication error"));
    }

    socket.user = jwt.verify(token, JWT_SECRET);
    console.log("[socket:auth:ok]", socket.user.username);
    next();
  } catch (err) {
    console.log("[socket:auth:error]", err.message);
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  const username = socket.user.username;
  
  // FIXED: Har user ko unke username wale personal room mein join karwayein
  socket.join(username);

  console.log("[socket:connect]", {
    id: socket.id,
    username: username,
    transport: socket.conn.transport.name,
  });

  socket.conn.on("upgrade", (transport) => {
    console.log("[socket:upgrade]", {
      id: socket.id,
      username: username,
      transport: transport.name,
    });
  });

  socket.on("send_message", async (data, ack) => {
    try {
      const recipient = `${data.recipient || ""}`.trim();
      const text = `${data.message || data.text || ""}`.trim();

      console.log("[socket:message:in]", { from: username, recipient, hasText: Boolean(text) });

      if (!recipient || !text) {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }

      const saved = await Message.create({
        sender: username,
        recipient,
        message: text,
      });

      console.log("[socket:message:saved]", { id: saved._id, from: saved.sender, recipient: saved.recipient });
      
      // FIXED: Pure server par broadcast karne ki jagah ab sirf Sender aur Recipient ke specific rooms me message jayega
      io.to(username).to(recipient).emit("receive_message", saved);
      
      if (typeof ack === "function") ack({ ok: true });
    } catch (err) {
      console.error("[socket:message:error]", err.message);
      if (typeof ack === "function") ack({ ok: false });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket:disconnect]", {
      id: socket.id,
      username: username,
      reason,
    });
  });
});

// MONGODB CLOUD ATLAS CONNECTION
const dbURI = "mongodb+srv://renu1402:Ankit%401705@cluster0.q0h1cvi.mongodb.net/chatDatabase?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbURI)
    .then(() => console.log("MongoDB Atlas Cloud Connected Successfully! ✅"))
    .catch((err) => console.error("Database Connection Error ❌:", err));

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server live on port ${PORT}`);
});