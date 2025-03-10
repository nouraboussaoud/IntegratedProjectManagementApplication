const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require("express-session");
const cors = require("cors");
const { initializeSocketServer } = require("./socket/socketServer");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const User = require("./models/User");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const passport = require('passport');
require("./middleware/passport")();
const path = require("path");

dotenv.config();

// Create Express app
const app = express();

// Middleware setup
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Register Routes
app.use("/api/users", userRoutes);
app.use('/api/messages', messageRoutes);

// Create a function to connect to the database
const connectDB = async (connectionString = process.env.MONGO_URI) => {
  try {
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected...");
    return true;
  } catch (err) {
    console.error("Database connection error:", err);
    return false;
  }
};

// Create a function to start the server
const startServer = (port = process.env.PORT || 5001) => {
  const server = app.listen(port, () => console.log(`Server running on port ${port}`));
  
  // Initialize Socket.IO
  const io = initializeSocketServer(server);
  app.set('io', io);
  
  return server;
};

// Only connect to the database and start the server if this file is run directly
let server;
if (require.main === module) {
  connectDB();
  server = startServer();
}

module.exports = { app, server, connectDB, startServer };