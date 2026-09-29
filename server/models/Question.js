const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
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
    questionText: {
      type: String,
      required: true,
    },
    questionImage: {
      type: String,
      default: '',
    },
    options: [
      {
        key: {
          type: String,
          required: true, // 'A', 'B', 'C', 'D'
          uppercase: true,
          trim: true,
        },
        text: {
          type: String,
          required: true,
        },
      },
    ],
    correctOption: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    explanation: {
      type: String,
      default: '',
    },
    points: {
      type: Number,
      default: 1,
    },
    negativePoints: {
      type: Number,
      default: 0.25,
    },
    tags: [String],
    sourcePdf: {
      filename: String,
      uploadedAt: Date,
    },
    isPractice: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);
