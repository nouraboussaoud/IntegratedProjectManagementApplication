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
const passport = require('passport');
require("./middleware/passport")(); // Ensure passport is initialized

dotenv.config();


const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

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
app.use(passport.initialize());
app.use(passport.session());

// Start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



module.exports ={app , server};
