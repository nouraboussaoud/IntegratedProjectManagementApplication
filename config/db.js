const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
    try {
        // Remove deprecated options for the latest MongoDB driver version
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected...");
    } catch (error) {
        console.error("MongoDB Connection Failed:", error);
        process.exit(1); // Exit the process if the connection fails
    }
};

module.exports = connectDB;
