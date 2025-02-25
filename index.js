const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require("express-session"); // Import express-session
const passport = require("passport"); // Import passport
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const groupRoutes = require("./routes/groupRoutes");
const cors = require("cors");

dotenv.config();
const { default: axios } = require("axios");
const path = require("path");




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

    console.log("userRoutes type:", typeof userRoutes);
    console.log("projectRoutes type:", typeof projectRoutes);
    console.log("taskRoutes type:", typeof taskRoutes);
    console.log("groupRoutes type:", typeof groupRoutes);
// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// User Routes
app.use("/api/users", userRoutes);

// Start the server only if not in test mode
if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Group Routes
app.use("/api/groups", groupRoutes);

// Project Routes
app.use("/api/projects", projectRoutes);

// Task Routes
app.use("/api/tasks", taskRoutes);


module.exports = app;