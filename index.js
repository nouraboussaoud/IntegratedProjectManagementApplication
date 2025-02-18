const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const cors = require("cors");
dotenv.config();

const app = express();

// CORS middleware should be placed before route handlers
app.use(cors({
    origin: 'http://localhost:3000'  // Allow requests only from this origin
}));

app.use(express.json());  // Middleware to parse JSON

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected..."))
    .catch(err => console.error(err));

// User Routes
app.use("/api/users", userRoutes);
if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));  // Start the server only if not in test mode
}
module.exports = app;
