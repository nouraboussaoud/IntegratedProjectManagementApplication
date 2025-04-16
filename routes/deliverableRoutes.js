const express = require("express");
const multer = require("multer");
const { 
  createDeliverable, 
  getDeliverablesHistory, 
  getCommits, 
  getBranches, 
  getRepositories ,
  submitEvaluation,
  getEvaluation,
  getFile 
} = require("../controllers/DeliverableController");
const { authenticateToken } = require("../middleware/verifyTokenMiddleware");



const router = express.Router();

// Set up multer for file upload
const upload = multer({ dest: 'uploads/' });

// Submit a new deliverable
router.post('/submit', authenticateToken, upload.single('file'), createDeliverable);

// Get deliverables history
router.get('/history', authenticateToken, getDeliverablesHistory);

// Get commits for a specific repo and branch
router.get('/commits/:repo/:branch', authenticateToken, getCommits);

// Get branches for a specific repo
router.get('/branches/:repo', authenticateToken, getBranches);

// Get all repositories for the authenticated user
router.get('/repositories', authenticateToken, getRepositories);

// ... (existing imports and routes)

// Submit evaluation
router.post('/:deliverableId/evaluate', authenticateToken, submitEvaluation);

// Get evaluation
router.get('/:deliverableId/evaluation', authenticateToken, getEvaluation);

router.get('/:deliverableId/file', authenticateToken, getFile);



module.exports = router;