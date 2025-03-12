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

// Start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.use(passport.initialize());
app.use(passport.session());
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Générer un token JWT pour l'utilisateur
    const token = jwt.sign(
        { userId: req.user._id, role: req.user.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '1h' }
    );

    // Rediriger vers le frontend avec le token et les informations de l'utilisateur
    res.redirect(`http://localhost:3000/student-dashboard`);
  }
);

module.exports = { app, server, connectDB, startServer };