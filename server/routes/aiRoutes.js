const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, adminOnly } = require('../middleware/auth');
const { processPdf, autoCreateThreeExams } = require('../controllers/aiController');

router.post('/process-pdf', protect, adminOnly, upload.single('pdf'), processPdf);
router.post('/auto-create-three-exams', protect, adminOnly, autoCreateThreeExams);

module.exports = router;
