const mongoose = require('mongoose');

const adminOtpSchema = new mongoose.Schema(
  {
    targetEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    registrantName: {
      type: String,
      default: '',
    },
    registrantEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically delete document when expiresAt is reached
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminOtp', adminOtpSchema);
