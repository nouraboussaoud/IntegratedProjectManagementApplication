const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();  // Ensure dotenv loads the .env file correctly

const aiAuth = async (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
  
    console.log("Received Token:", token);  // Debugging line to log the token
  
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error("JWT Verification Error:", error.message);
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  };
  

module.exports = aiAuth;
