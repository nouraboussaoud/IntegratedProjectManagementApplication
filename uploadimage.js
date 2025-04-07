const multer = require("multer");
const path = require("path");

// Set up Multer storage configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads")); // Saves to `backend/uploads`
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Initialize Multer with the storage configuration
const upload = multer({ storage: storage });

module.exports = { upload };
