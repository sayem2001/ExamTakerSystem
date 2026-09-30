const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a notice title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Please provide notice content/instructions'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['routine', 'exam_date', 'instruction', 'announcement', 'urgent'],
      default: 'announcement',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    eventDate: {
      type: Date,
      default: null, // For exam dates or routine schedule timestamps
    },
    targetAudience: {
      type: String,
      enum: ['all', 'students', 'admins'],
      default: 'all',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      default: 'Administrator',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

// Index for efficient sorting and query performance
noticeSchema.index({ isPinned: -1, createdAt: -1 });
noticeSchema.index({ category: 1, isActive: 1 });
noticeSchema.index({ eventDate: 1 });

module.exports = mongoose.model('Notice', noticeSchema);
