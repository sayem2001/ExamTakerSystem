const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'auto-submitted', 'disqualified'],
      default: 'in-progress',
      index: true,
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
          required: true,
        },
        selectedOption: {
          type: String, // 'A', 'B', 'C', 'D' or null/empty
          default: '',
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
        pointsEarned: {
          type: Number,
          default: 0,
        },
        markedForReview: {
          type: Boolean,
          default: false,
        },
      },
    ],
    totalQuestions: {
      type: Number,
      default: 0,
    },
    attemptedCount: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    wrongCount: {
      type: Number,
      default: 0,
    },
    unansweredCount: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
      index: true,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    proctorViolations: [
      {
        type: {
          type: String,
          enum: ['tab_switch', 'fullscreen_exit', 'copy_paste_attempt', 'devtools_opened'],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: String,
      },
    ],
  },
  { timestamps: true }
);

// Compound index to guarantee one completed attempt per user per exam!
examAttemptSchema.index({ user: 1, exam: 1 });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
