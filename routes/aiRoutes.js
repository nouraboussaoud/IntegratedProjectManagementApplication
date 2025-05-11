const express = require('express');
const router = express.Router();
const { verifyToken } = require("../controllers/userController");
const { recommendProjects, suggestTeamFormations } = require('../controllers/projectMatchingController');

// Project recommendation routes
router.get('/recommend-projects/:userId', verifyToken, recommendProjects);

// Team formation routes
router.post('/suggest-teams/:projectId', verifyToken, suggestTeamFormations);

module.exports = router;