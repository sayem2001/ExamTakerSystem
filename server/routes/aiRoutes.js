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
  getVerifiedQuestions,
  deployVerifiedExam,
  studentGeneratePractice,
  studentExtractQuestions,
  studentGenerateQuestions,
  studentSavePractice,
} = require('../controllers/aiController');

// Student isolated AI practice generator routes (accessible to authenticated students & admins)
router.post('/student-generate-practice', protect, upload.single('pdf'), studentGeneratePractice);
router.post('/student-extract', protect, upload.single('pdf'), studentExtractQuestions);
router.post('/student-generate', protect, studentGenerateQuestions);
router.post('/student-save-practice', protect, studentSavePractice);

// Phase 1: Read entire document, filter theoretical text/notes, and extract all questions
router.post('/extract-questions', protect, adminOnly, upload.single('pdf'), extractQuestions);

// Phase 2: Generate configured number of diverse questions with specific difficulty rules
router.post('/generate-from-extracted', protect, adminOnly, generateFromExtracted);

// Legacy / One-shot endpoint
router.post('/process-pdf', protect, adminOnly, upload.single('pdf'), processPdf);

// Verified 30 Questions Fallback & 1-Click Deploy
router.get('/verified-questions', protect, adminOnly, getVerifiedQuestions);
router.post('/deploy-verified-exam', protect, adminOnly, deployVerifiedExam);

// Exam creation & scheduling
router.post('/auto-create-three-exams', protect, adminOnly, autoCreateThreeExams);
router.post('/schedule-generated-exam', protect, adminOnly, scheduleGeneratedExam);

module.exports = router;
