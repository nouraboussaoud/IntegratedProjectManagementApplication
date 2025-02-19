require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require('express-session');
const passport = require("passport");
const userRoutes = require("./routes/userRoutes");
require("./passport"); 






console.log(process.env.GOOGLE_CLIENT_ID);
console.log(process.env.GOOGLE_CLIENT_SECRET);


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
// CORS middleware should be placed before route handlers
app.use(cors({
    origin: "http://localhost:3000",
    methods:"GET,POST,PUT,DELETE",
    credentials:true// Allow requests only from this origin
}));

app.use(express.json());  // Middleware to parse JSON

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected..."))
    .catch(err => console.error(err));

// User Routes
app.use("/api/users", userRoutes);
app.use(passport.initialize());
app.use(passport.session());
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      // ✅ Rediriger vers le frontend après connexion réussie
      res.redirect('http://localhost:3000/courses');
    }
  );

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
