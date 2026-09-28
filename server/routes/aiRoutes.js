const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, adminOnly } = require('../middleware/auth');
const { processPdf, autoCreateThreeExams, scheduleGeneratedExam } = require('../controllers/aiController');

router.post('/process-pdf', protect, adminOnly, upload.single('pdf'), processPdf);
router.post('/auto-create-three-exams', protect, adminOnly, autoCreateThreeExams);
router.post('/schedule-generated-exam', protect, adminOnly, scheduleGeneratedExam);

module.exports = router;
