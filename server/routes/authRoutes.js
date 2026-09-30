const express = require('express');
const router = express.Router();
const {
  register,
  login,
  firebaseAuth,
  getMe,
  requestAdminOtp,
  saveGeminiApiKey,
  getGeminiApiKeyStatus,
  testGeminiApiKey,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/firebase', firebaseAuth);
router.post('/request-admin-otp', requestAdminOtp);
router.get('/me', protect, getMe);

// Student personal Gemini API key management
router.get('/gemini-key', protect, getGeminiApiKeyStatus);
router.put('/gemini-key', protect, saveGeminiApiKey);
router.post('/gemini-key/test', protect, testGeminiApiKey);

module.exports = router;
