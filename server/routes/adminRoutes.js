const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getSubmissions,
  getSettings,
  updateSettings,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/stats', getAdminStats);
router.get('/questions', getQuestions);
router.post('/questions', createQuestion);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.get('/submissions', getSubmissions);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
