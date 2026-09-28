const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    geminiApiKey: {
      type: String,
      default: '',
    },
    platformName: {
      type: String,
      default: 'ApexExam - Advanced Exam Platform',
    },
    allowPublicRegistration: {
      type: Boolean,
      default: true,
    },
    defaultDurationMinutes: {
      type: Number,
      default: 60,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
