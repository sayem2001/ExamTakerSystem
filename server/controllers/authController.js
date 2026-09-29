const User = require('../models/User');
const AdminOtp = require('../models/AdminOtp');
const { MAIN_ADMIN_EMAIL, sendAdminOtpEmail } = require('../services/emailService');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secure_jwt_secret_exam_taker_system_2026_xyz987', {
    expiresIn: '30d',
  });
};

// @desc    Request OTP to create a new Administrator (sent to Main Admin's Gmail)
// @route   POST /api/auth/request-admin-otp
// @access  Public
exports.requestAdminOtp = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide the applicant email address' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists' });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes valid

    const targetAdminEmail = (process.env.MAIN_ADMIN_EMAIL || MAIN_ADMIN_EMAIL).toLowerCase().trim();

    // Invalidate prior unused OTPs for this registrant
    await AdminOtp.deleteMany({ registrantEmail: email.toLowerCase().trim() });

    // Store new OTP
    await AdminOtp.create({
      targetEmail: targetAdminEmail,
      registrantName: name ? name.trim() : '',
      registrantEmail: email.toLowerCase().trim(),
      otp,
      expiresAt,
    });

    // Send email to Main Admin's Gmail
    await sendAdminOtpEmail({
      toEmail: targetAdminEmail,
      otp,
      registrantName: name || 'Admin Applicant',
      registrantEmail: email.toLowerCase().trim(),
    });

    res.json({
      success: true,
      message: `Authorization OTP dispatched to Primary Administrator (${targetAdminEmail}). Please obtain the code to grant admin access.`,
      targetAdminEmail,
    });
  } catch (error) {
    console.error('requestAdminOtp error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to dispatch authorization OTP' });
  }
};

// @desc    Register a new user (with mandatory Admin OTP verification for admin role)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'student', institution, adminOtp } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const count = await User.countDocuments();
    let assignedRole = 'student';

    // If first user in an empty DB, grant admin automatically
    if (count === 0) {
      assignedRole = 'admin';
    } else if (role === 'admin') {
      // Require OTP from Main Admin
      if (!adminOtp || !adminOtp.trim()) {
        return res.status(400).json({
          success: false,
          message: `Admin authorization code required. Please enter the OTP sent to primary administrator (${process.env.MAIN_ADMIN_EMAIL || MAIN_ADMIN_EMAIL}).`,
        });
      }

      const activeOtpRecord = await AdminOtp.findOne({
        targetEmail: (process.env.MAIN_ADMIN_EMAIL || MAIN_ADMIN_EMAIL).toLowerCase().trim(),
        registrantEmail: email.toLowerCase().trim(),
        otp: adminOtp.trim(),
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!activeOtpRecord) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired Administrator Authorization OTP. Please request a new code.',
        });
      }

      // Mark OTP as used
      activeOtpRecord.used = true;
      await activeOtpRecord.save();
      assignedRole = 'admin';
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      institution: institution ? institution.trim() : '',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
