const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  analyzeAiContent,
  analyzeProvidedText,
  checkDeliverablePlagiarism,
  checkProvidedTextPlagiarism
} = require('../controllers/textAnalysisController');

// AI Detection routes
router.get('/deliverable/:deliverableId', authenticate, analyzeAiContent);
router.post('/analyze', authenticate, analyzeProvidedText);

// Plagiarism routes
router.get('/plagiarism/:deliverableId', authenticate, checkDeliverablePlagiarism);
router.post('/plagiarism/analyze', authenticate, checkProvidedTextPlagiarism);

module.exports = router;