// /routes/progressRoutes.js
const express = require('express');
const progressController = require('../controllers/progressController');
const { verifyToken } = require("../controllers/userController");
const router = express.Router();

// Route to add or update progress - protected by JWT authentication
router.post('/progress', verifyToken, progressController.addOrUpdateProgress);

// Route to get progress for a specific student - protected by JWT authentication
router.get('/progress', verifyToken, progressController.getProgressByStudent);

module.exports = router;
