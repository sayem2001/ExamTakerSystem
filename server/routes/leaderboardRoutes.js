const express = require('express');
const router = express.Router();
const {
  getExamLeaderboard,
  getGlobalLeaderboard,
  exportLeaderboardCSV,
} = require('../controllers/leaderboardController');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secure_jwt_secret_exam_taker_system_2026_xyz987');
      req.user = await User.findById(decoded.id).select('-password');
    } catch (e) {
      // ignore
    }
  }
  next();
};

router.get('/exam/:examId', optionalAuth, getExamLeaderboard);
router.get('/global', getGlobalLeaderboard);
router.get('/export/:examId', optionalAuth, exportLeaderboardCSV);

module.exports = router;
