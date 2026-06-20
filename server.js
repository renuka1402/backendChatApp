const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
require("dotenv").config();

const setupMiddleware = require("./middleware/appMiddleware");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const initializeSocket = require("./socket");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

setupMiddleware(app);

app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", messageRoutes);

initializeSocket(io);

mongoose.connect(process.env.MONGO_URI)
  .then(() => server.listen(process.env.PORT || 5000, () => console.log("Server running")))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });