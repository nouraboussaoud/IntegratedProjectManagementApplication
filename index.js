const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require("express-session"); // Import express-session
const passport = require("passport"); // Import passport
const userRoutes = require("./routes/userRoutes");
const cors = require("cors");

dotenv.config();

const app = express();

// CORS middleware should be placed before route handlers
app.use(cors({
    origin: 'http://localhost:3000' // Allow requests only from this origin
}));

app.use(express.json()); // Middleware to parse JSON

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected..."))
    .catch(err => console.error(err));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Use a secure secret from environment variables
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Load Passport configuration
require("./middleware/passport"); // Ensure this file exists and configures Passport strategies

// User Routes
app.use("/api/users", userRoutes);

// Start the server only if not in test mode
if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;