const express = require('express');
const router = express.Router();
const {
  getExams,
  getExamByIdentifier,
  createExam,
  updateExam,
  deleteExam,
} = require('../controllers/examController');
const { protect, adminOnly } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Optional auth middleware so public can view exams while logged in users get personalized attempt status
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

router.get('/', optionalAuth, getExams);
router.get('/:identifier', optionalAuth, getExamByIdentifier);

// Admin routes
router.post('/', protect, adminOnly, createExam);
router.put('/:id', protect, adminOnly, updateExam);
router.delete('/:id', protect, adminOnly, deleteExam);

module.exports = router;
