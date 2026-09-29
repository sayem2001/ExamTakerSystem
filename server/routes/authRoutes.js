const express = require('express');
const router = express.Router();
const { register, login, getMe, requestAdminOtp } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/request-admin-otp', requestAdminOtp);
router.get('/me', protect, getMe);

module.exports = router;
