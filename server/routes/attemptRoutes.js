const express = require('express');
const router = express.Router();
const {
  startAttempt,
  syncAnswers,
  logViolation,
  submitAttempt,
  getAttemptResults,
} = require('../controllers/attemptController');
const { protect } = require('../middleware/auth');

router.post('/start/:examId', protect, startAttempt);
router.put('/:attemptId/sync', protect, syncAnswers);
router.post('/:attemptId/violation', protect, logViolation);
router.post('/:attemptId/submit', protect, submitAttempt);
router.get('/:attemptId/results', protect, getAttemptResults);

module.exports = router;
