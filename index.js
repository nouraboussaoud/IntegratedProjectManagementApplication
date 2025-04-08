const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require("express-session");
const cors = require("cors");
const jwt = require("jsonwebtoken"); // Import JWT
const fetch = require("node-fetch"); // Import fetch (if needed for Node.js)
const User = require("./models/User"); 
require("dotenv").config(); // Load environment variables
const userRoutes = require("./routes/userRoutes");
const groupRoutes = require("./routes/groupRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const projectRoutes = require("./routes/projectRoutes");
const passport = require('passport');
require("./middleware/passport")(); // Ensure passport is initialized
const path = require("path");
require("./passport"); 


dotenv.config();

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

// Register Routes
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/subject", subjectRoutes);
app.use("/api/projects",projectRoutes);
// Start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.use(passport.initialize());
app.use(passport.session());
app.get('/auth/google/callback',
  passport.authenticate("google", { failureRedirect: "/login/failed" }),
  (req, res) => {
    if (!req.user) {
      console.error("❌ No user found after Google Auth.");
      return res.redirect("http://localhost:3000/login?error=auth_failed");
    }

    console.log("✅ Authenticated user:", req.user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: req.user._id, role: req.user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Determine redirect path based on role
    let redirectPath = "/home";
    if (req.user.role === "admin") redirectPath = "/admin-dashboard";
    else if (req.user.role === "tutor") redirectPath = "/tutor-dashboard";
    else if (req.user.role === "student") redirectPath = "/student-dashboard";

    // Prepare user data
    const userData = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      profilePic: req.user.profilePic,
      role: req.user.role,
    };
    console.log("✅ Données utilisateur à envoyer :", userData);
    // Construct redirect URL (now declared BEFORE usage)
    const redirectURL = `http://localhost:3000${redirectPath}?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    
    
    console.log("✅ URL de redirection :", redirectURL);

    res.redirect(redirectURL);
  }
);

module.exports = { app, server };