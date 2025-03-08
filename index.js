const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require("express-session");
const cors = require("cors");
const jwt = require("jsonwebtoken"); // Import JWT
const fetch = require("node-fetch"); // Import fetch (if needed for Node.js)
const User = require("./models/User"); 
const path = require("path");
const passport = require('passport');
const userRoutes = require("./routes/userRoutes");
const deliverableRoutes = require("./routes/deliverableRoutes");

dotenv.config(); // Load environment variables

require("./middleware/passport")(); // Ensure passport is initialized

const app = express();

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

app.use(passport.initialize());
app.use(passport.session());

// Register Routes
app.use("/api/users", userRoutes);
app.use("/api/deliverables", deliverableRoutes);

// Start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server };