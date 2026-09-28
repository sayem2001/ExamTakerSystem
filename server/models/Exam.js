const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    examCode: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    scheduledEndDate: {
      type: Date,
      default: function () {
        // default 24 hours after scheduledDate
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      },
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 60,
    },
    passPercentage: {
      type: Number,
      default: 50,
    },
    negativeMarking: {
      type: Boolean,
      default: true,
    },
    negativeMarkingRate: {
      type: Number,
      default: 0.25,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    pdfDocument: {
      filename: String,
      originalName: String,
      size: Number,
      url: String,
      uploadedAt: Date,
    },
    antiCheatSettings: {
      fullScreenRequired: {
        type: Boolean,
        default: true,
      },
      maxTabSwitches: {
        type: Number,
        default: 3,
      },
      blockCopyPaste: {
        type: Boolean,
        default: true,
      },
      disableRightClick: {
        type: Boolean,
        default: true,
      },
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    allowReviewAfterSubmit: {
      type: Boolean,
      default: true,
    },
    showLeaderboard: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Helper to auto-generate unique examCode if not provided
examSchema.pre('save', function (next) {
  if (!this.examCode) {
    const topicPrefix = (this.topic || 'EXAM').substring(0, 4).toUpperCase();
    const diffPrefix = (this.difficulty || 'M')[0].toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.examCode = `${topicPrefix}-${diffPrefix}${rand}`;
  }
  next();
});

module.exports = mongoose.model('Exam', examSchema);
