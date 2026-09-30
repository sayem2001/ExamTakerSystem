const crypto = require('crypto');
const User = require('../models/User');
const AdminOtp = require('../models/AdminOtp');
const { MAIN_ADMIN_EMAIL, sendAdminOtpEmail } = require('../services/emailService');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secure_jwt_secret_exam_taker_system_2026_xyz987', {
    expiresIn: '30d',
  });
};

/**
 * Cryptographically verify Firebase ID token using Google's Identity Toolkit API.
 * Ensures the token was genuinely signed by Google/Firebase, belongs to this project,
 * and extracts the authentic email, uid, and email verification status.
 */
const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Valid Firebase ID token is required');
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('FIREBASE_API_KEY is not configured in server environment');
  }
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();
  if (!response.ok || !data.users || data.users.length === 0) {
    const errorMsg = data?.error?.message || 'Token verification failed';
    throw new Error(`Firebase token verification failed: ${errorMsg}`);
  }

  const fbUser = data.users[0];
  const primaryProvider = fbUser.providerUserInfo?.[0]?.providerId || '';
  let providerType = 'google';
  if (primaryProvider.includes('facebook')) {
    providerType = 'facebook';
  } else if (primaryProvider.includes('password')) {
    providerType = 'firebase-email';
  } else if (primaryProvider.includes('google')) {
    providerType = 'google';
  }

  return {
    uid: fbUser.localId,
    email: (fbUser.email || '').toLowerCase().trim(),
    emailVerified: Boolean(fbUser.emailVerified),
    displayName: fbUser.displayName || '',
    photoUrl: fbUser.photoUrl || '',
    providerType,
  };
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

    // Generate cryptographically secure 6-digit OTP (CSPRNG)
    const otp = crypto.randomInt(100000, 1000000).toString();
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

// @desc    Firebase Auth (Google, Facebook, or Verified Email Sign-In)
// @route   POST /api/auth/firebase
// @access  Public (Protected via Cryptographic Firebase ID Token Verification)
exports.firebaseAuth = async (req, res) => {
  try {
    const { idToken, role = 'student', institution = '', adminOtp = '', authProvider = '' } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Firebase authentication token is required.' });
    }

    // Cryptographically verify ID token with Google Identity API
    let verifiedUser;
    try {
      verifiedUser = await verifyFirebaseIdToken(idToken);
    } catch (verr) {
      return res.status(401).json({ success: false, message: verr.message });
    }

    const normalizedEmail = verifiedUser.email;
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'No email address associated with this verified account.' });
    }

    // Determine auth provider (google, facebook, firebase-email)
    const effectiveProvider = authProvider || verifiedUser.providerType || 'google';

    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // If user exists and email is verified by Google/Facebook, update verified status
      if (verifiedUser.emailVerified) {
        user.isEmailVerified = true;
      }
      if (verifiedUser.photoUrl && !user.avatar) {
        user.avatar = verifiedUser.photoUrl;
      }
      if (verifiedUser.uid && !user.firebaseUid) {
        user.firebaseUid = verifiedUser.uid;
      }
      if (effectiveProvider && (!user.authProvider || user.authProvider === 'local')) {
        user.authProvider = effectiveProvider;
      }
      await user.save();
    } else {
      // New user registration via Google, Facebook, or Firebase Email
      let assignedRole = 'student';
      const userCount = await User.countDocuments();

      if (userCount === 0) {
        assignedRole = 'admin';
      } else if (role === 'admin') {
        // Enforce Admin OTP check for admin registration
        if (!adminOtp || !adminOtp.trim()) {
          return res.status(400).json({
            success: false,
            message: `Admin authorization code required. Please enter the OTP sent to primary administrator (${process.env.MAIN_ADMIN_EMAIL || MAIN_ADMIN_EMAIL}).`,
          });
        }

        const activeOtpRecord = await AdminOtp.findOne({
          targetEmail: (process.env.MAIN_ADMIN_EMAIL || MAIN_ADMIN_EMAIL).toLowerCase().trim(),
          registrantEmail: normalizedEmail,
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

        activeOtpRecord.used = true;
        await activeOtpRecord.save();
        assignedRole = 'admin';
      }

      user = await User.create({
        name: verifiedUser.displayName ? verifiedUser.displayName.trim() : normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: assignedRole,
        institution: institution ? institution.trim() : '',
        avatar: verifiedUser.photoUrl || '',
        firebaseUid: verifiedUser.uid || '',
        isEmailVerified: Boolean(verifiedUser.emailVerified),
        authProvider: effectiveProvider,
      });
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
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('firebaseAuth error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during Firebase authentication' });
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

// @desc    Save student's personal Gemini API key
// @route   PUT /api/auth/gemini-key
// @access  Private
exports.saveGeminiApiKey = async (req, res) => {
  try {
    const { geminiApiKey } = req.body;

    if (geminiApiKey !== undefined && geminiApiKey !== null) {
      const trimmedKey = (geminiApiKey || '').trim();

      // Basic validation — allow empty string (to remove key) or proper key format
      if (trimmedKey.length > 0 && trimmedKey.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Invalid API key format. A valid Gemini API key should be at least 10 characters. You can leave it empty to remove your key.',
        });
      }

      await User.findByIdAndUpdate(req.user.id, { geminiApiKey: trimmedKey });

      res.json({
        success: true,
        message: trimmedKey.length > 0
          ? 'Your personal Gemini API key has been saved securely. All AI practice generation will now use your key.'
          : 'Your Gemini API key has been removed. AI practice generation will use the platform\'s shared key (if available).',
        hasKey: trimmedKey.length > 0,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide the geminiApiKey field in the request body.',
      });
    }
  } catch (error) {
    console.error('saveGeminiApiKey error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check if student has a Gemini API key saved (returns masked status, never the raw key)
// @route   GET /api/auth/gemini-key
// @access  Private
exports.getGeminiApiKeyStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+geminiApiKey');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const rawKey = user.geminiApiKey || '';
    const hasKey = rawKey.length > 10;

    res.json({
      success: true,
      hasKey,
      maskedKey: hasKey
        ? `${rawKey.substring(0, 4)}${'•'.repeat(Math.min(rawKey.length - 8, 20))}${rawKey.substring(rawKey.length - 4)}`
        : '',
    });
  } catch (error) {
    console.error('getGeminiApiKeyStatus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Test a Gemini API key to verify it is valid and working
// @route   POST /api/auth/gemini-key/test
// @access  Private
exports.testGeminiApiKey = async (req, res) => {
  try {
    let keyToTest = (req.body.geminiApiKey || '').trim();
    if (!keyToTest) {
      const user = await User.findById(req.user.id).select('+geminiApiKey');
      keyToTest = (user?.geminiApiKey || '').trim();
    }

    if (!keyToTest || keyToTest.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Gemini API key to test (must be at least 10 characters).',
      });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(keyToTest);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const startTime = Date.now();
    const result = await model.generateContent('Respond with only the word: CONNECTED');
    const latency = Date.now() - startTime;
    const responseText = result.response.text();

    res.json({
      success: true,
      message: `API Key successfully verified with Google AI Studio! (Response time: ${latency}ms)`,
      latencyMs: latency,
      sampleResponse: responseText.trim().substring(0, 50),
    });
  } catch (error) {
    console.error('testGeminiApiKey error:', error.message);
    let userMsg = error.message;
    if (userMsg.includes('API_KEY_INVALID') || userMsg.includes('key not valid')) {
      userMsg = 'Invalid Gemini API key. Please check that you copied the complete key from Google AI Studio.';
    } else if (userMsg.includes('RESOURCE_EXHAUSTED')) {
      userMsg = 'This API key has exceeded its rate limit or quota on Google AI Studio.';
    }
    res.status(400).json({
      success: false,
      message: userMsg,
    });
  }
};

