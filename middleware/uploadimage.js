const multer = require('multer');
const path = require('path');

// Set up Multer storage configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'C:/Users/abous/OneDrive/Bureau/FlowPi'); // Adjust this path if necessary
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Initialize Multer with the storage configuration
const upload = multer({ storage: storage });

// Export the `upload` middleware
module.exports = { upload };
