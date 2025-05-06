const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require("express-session");
const cors = require("cors");
const { initializeSocketServer } = require("./socket/socketServer");
const setupVideoCallHandlers = require("./socket/videoCallHandler");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const axios = require('axios');
require("dotenv").config();

const User = require("./models/User");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const progressRoutes = require("./routes/progressRoutes"); // Add progressRoutes
const taskRoutes = require("./routes/taskRoutes");
const groupRoutes = require("./routes/groupRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const projectRoutes = require("./routes/projectRoutes");
const deliverableRoutes = require("./routes/deliverableRoutes"); // Import the deliverable routes
const passport = require('passport');
require("./middleware/passport")();
const path = require("path");
require("./passport"); 
dotenv.config(); // Load environment variables

require("./middleware/passport")(); // Ensure passport is initialized
const attendanceRoutes = require("./routes/attendanceRoutes");


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
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.error(err));
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
app.use("/api/groups", groupRoutes);
app.use("/api/subject", subjectRoutes);
app.use("/api/users", userRoutes);
app.use("/api/deliverables", deliverableRoutes); // Use the updated deliverable routes
app.use("/api/messages", messageRoutes);
app.use("/api/progress", progressRoutes); // Add progress tracking routes
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/attendance", attendanceRoutes);
// Prediction API endpoint
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

  const io = initializeSocketServer(server);
  setupVideoCallHandlers(io); // Add this line to initialize video call handlers
  app.set('io', io);

  return server;
};

// Only connect to the database and start the server if this file is run directly
let server;
if (require.main === module) {
  connectDB();
  server = startServer();
}
app.get('/auth/google/callback',
  passport.authenticate("google", { failureRedirect: "/login/failed" }),
  (req, res) => {
    if (!req.user) {
      console.error("❌ No user found after Google Auth.");
      return res.redirect("http://localhost:3000/login?error=auth_failed");
    }

    console.log("✅ Authenticated user:", req.user);
    console.log("User from Passport:", {
      id: req.user._id,
      role: req.user.role,
      profile: req.user.profilePic
    });
    // Generate JWT token
    const token = jwt.sign(
      { userId: req.user._id, role: req.user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    

    // Prepare user data
    const userData = {
      _id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      profilePic: req.user.profilePic,
      role: req.user.role,
    };
    console.log("✅ Données utilisateur à envoyer :", userData);
    // Determine redirect path based on role
    let redirectPath = "/home";
    if (req.user.role === "admin") redirectPath = "/admin-dashboard";
    else if (req.user.role === "tutor") redirectPath = "/tutor-dashboard";
    else if (req.user.role === "student") redirectPath = "/student-dashboard";
    // Construct redirect URL (now declared BEFORE usage)
    const redirectURL = `http://localhost:3000${redirectPath}?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    
    
    console.log("✅ URL de redirection :", redirectURL);

    res.redirect(redirectURL);
  }
);
module.exports = { app, server, connectDB, startServer };