const express = require('express');
const router = express.Router();
const {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  togglePinNotice,
} = require('../controllers/noticeController');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

// Public route to view notices (uses optionalAuth so admin view can see inactive notices if requested)
router.get('/', optionalAuth, getNotices);
router.get('/:id', getNoticeById);

// Admin-protected routes
router.post('/', protect, adminOnly, createNotice);
router.put('/:id', protect, adminOnly, updateNotice);
router.delete('/:id', protect, adminOnly, deleteNotice);
router.patch('/:id/pin', protect, adminOnly, togglePinNotice);

module.exports = router;
