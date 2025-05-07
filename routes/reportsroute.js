const express = require('express');
const router = express.Router();
const { 
  createReport, 
  getAllReports, 
  getReportById, 
  getStudentReports, 
  updateReport, 
  deleteReport,
  getReportFile
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');

// Routes for reports
router.post('/', authenticate, upload.single('reportFile'), createReport);
router.get('/', authenticate, getAllReports);
router.get('/student', authenticate, getStudentReports);
router.get('/:id', authenticate, getReportById);
router.get('/:id/file', authenticate, getReportFile);
router.put('/:id', authenticate, updateReport);
router.delete('/:id', authenticate, deleteReport);

module.exports = router;