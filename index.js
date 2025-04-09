const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require("express-session");
const cors = require("cors");
const { initializeSocketServer } = require("./socket/socketServer");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const axios = require('axios');

const User = require("./models/User");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const progressRoutes = require("./routes/progressRoutes"); // Add progressRoutes
const taskRoutes = require("./routes/taskRoutes");
const projectRoutes = require("./routes/projectRoutes");
const passport = require('passport');
require("./middleware/passport")();
const path = require("path");
require("./passport"); 


dotenv.config();

// Create Express app
const app = express();
app.use(session({
  secret: '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',  // Utilisez un secret aléatoire pour sécuriser la session
  resave: false,
  saveUninitialized: false,
  cookie: {
      secure: false,  // Mets `true` si tu es en HTTPS
      httpOnly: true,
      sameSite: "lax"
  }
}));
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
app.use("/api/progress", progressRoutes); // Add progress tracking routes
app.use("/api/tasks", taskRoutes);
app.use("/api/projects",projectRoutes);

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
app.post('/predict', async (req, res) => {
  try {
    const { completionPercentage } = req.body;

    if (!completionPercentage) {
      return res.status(400).json({ error: "completionPercentage is required" });
    }

    // Make a request to your Flask API
    const response = await axios.post('http://localhost:5000/predict', {
      completionPercentage: completionPercentage,
    });

    const predictedDelay = response.data.predictedDelay;
    res.status(200).json({ predictedDelay });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error fetching prediction');
  }
});

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
