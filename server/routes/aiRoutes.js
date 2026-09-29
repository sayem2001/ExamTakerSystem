const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, adminOnly } = require('../middleware/auth');
const {
  extractQuestions,
  generateFromExtracted,
  processPdf,
  autoCreateThreeExams,
  scheduleGeneratedExam,
} = require('../controllers/aiController');

// Phase 1: Read entire document, filter theoretical text/notes, and extract all questions
router.post('/extract-questions', protect, adminOnly, upload.single('pdf'), extractQuestions);

// Phase 2: Generate configured number of diverse questions with specific difficulty rules
router.post('/generate-from-extracted', protect, adminOnly, generateFromExtracted);

// Legacy / One-shot endpoint
router.post('/process-pdf', protect, adminOnly, upload.single('pdf'), processPdf);

// Exam creation & scheduling
router.post('/auto-create-three-exams', protect, adminOnly, autoCreateThreeExams);
router.post('/schedule-generated-exam', protect, adminOnly, scheduleGeneratedExam);

module.exports = router;
