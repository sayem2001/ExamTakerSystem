const User = require('../models/User');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const SystemSetting = require('../models/SystemSetting');
const Topic = require('../models/Topic');

// @desc    Get dashboard statistics for Admin
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getAdminStats = async (req, res) => {
  try {
    const [
      totalExams,
      totalStudents,
      totalQuestions,
      totalAttempts,
      recentAttempts,
      topics,
    ] = await Promise.all([
      Exam.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Question.countDocuments(),
      ExamAttempt.countDocuments({ status: { $in: ['submitted', 'auto-submitted'] } }),
      ExamAttempt.find({ status: { $in: ['submitted', 'auto-submitted'] } })
        .populate('user', 'name email institution')
        .populate('exam', 'title topic difficulty')
        .sort({ submittedAt: -1 })
        .limit(10),
      Topic.find().lean(),
    ]);

    // Calculate average score and pass rate
    const aggregateMetrics = await ExamAttempt.aggregate([
      { $match: { status: { $in: ['submitted', 'auto-submitted'] } } },
      {
        $group: {
          _id: null,
          avgPercentage: { $avg: '$percentage' },
          passedCount: { $sum: { $cond: ['$passed', 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]);

    const avgPercentage = aggregateMetrics.length > 0 ? Math.round(aggregateMetrics[0].avgPercentage * 10) / 10 : 0;
    const passRate =
      aggregateMetrics.length > 0 && aggregateMetrics[0].total > 0
        ? Math.round((aggregateMetrics[0].passedCount / aggregateMetrics[0].total) * 100)
        : 0;

    res.json({
      success: true,
      stats: {
        totalExams,
        totalStudents,
        totalQuestions,
        totalAttempts,
        avgPercentage,
        passRate,
      },
      topics,
      recentAttempts,
    });
  } catch (error) {
    console.error('getAdminStats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all questions in bank with pagination & filters
// @route   GET /api/admin/questions
// @access  Private (Admin only)
exports.getQuestions = async (req, res) => {
  try {
    const { topic, difficulty, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (topic && topic !== 'All') {
      filter.topic = new RegExp(topic, 'i');
    }
    if (difficulty && difficulty !== 'all') {
      filter.difficulty = difficulty.toLowerCase();
    }
    if (search) {
      filter.questionText = new RegExp(search, 'i');
    }

    const total = await Question.countDocuments(filter);
    const questions = await Question.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / limit),
      questions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new question manually
// @route   POST /api/admin/questions
// @access  Private (Admin only)
exports.createQuestion = async (req, res) => {
  try {
    const { topic, difficulty, questionText, options, correctOption, explanation, points, negativePoints } = req.body;

    if (!topic || !difficulty || !questionText || !options || !correctOption) {
      return res.status(400).json({ success: false, message: 'All required question fields must be provided' });
    }

    const question = await Question.create({
      topic,
      difficulty,
      questionText,
      options,
      correctOption: correctOption.toUpperCase(),
      explanation: explanation || '',
      points: points || 1,
      negativePoints: negativePoints !== undefined ? negativePoints : 0.25,
    });

    res.status(201).json({ success: true, question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a question
// @route   PUT /api/admin/questions/:id
// @access  Private (Admin only)
exports.updateQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a question
// @route   DELETE /api/admin/questions/:id
// @access  Private (Admin only)
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all exam submissions / proctoring audit logs
// @route   GET /api/admin/submissions
// @access  Private (Admin only)
exports.getSubmissions = async (req, res) => {
  try {
    const { examId, flaggedOnly } = req.query;
    const filter = { status: { $in: ['submitted', 'auto-submitted'] } };

    if (examId) {
      filter.exam = examId;
    }
    if (flaggedOnly === 'true') {
      filter['proctorViolations.0'] = { $exists: true };
    }

    const submissions = await ExamAttempt.find(filter)
      .populate('user', 'name email institution')
      .populate('exam', 'title topic difficulty scheduledDate durationMinutes')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get & Update System Settings (including Gemini API Key)
// @route   GET /api/admin/settings & PUT /api/admin/settings
// @access  Private (Admin only)
exports.getSettings = async (req, res) => {
  try {
    let setting = await SystemSetting.findOne();
    if (!setting) {
      setting = await SystemSetting.create({});
    }

    // Mask Gemini key for security when returning
    const maskedKey = setting.geminiApiKey
      ? `${setting.geminiApiKey.substring(0, 6)}...${setting.geminiApiKey.substring(setting.geminiApiKey.length - 4)}`
      : (process.env.GEMINI_API_KEY ? 'Configured in server .env' : '');

    res.json({
      success: true,
      settings: {
        platformName: setting.platformName,
        allowPublicRegistration: setting.allowPublicRegistration,
        defaultDurationMinutes: setting.defaultDurationMinutes,
        hasGeminiApiKey: !!(setting.geminiApiKey || process.env.GEMINI_API_KEY),
        geminiApiKeyMasked: maskedKey,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { geminiApiKey, platformName, allowPublicRegistration, defaultDurationMinutes } = req.body;

    let setting = await SystemSetting.findOne();
    if (!setting) {
      setting = new SystemSetting({});
    }

    if (geminiApiKey !== undefined && geminiApiKey.trim() !== '') {
      setting.geminiApiKey = geminiApiKey.trim();
    }
    if (platformName !== undefined) setting.platformName = platformName;
    if (allowPublicRegistration !== undefined) setting.allowPublicRegistration = allowPublicRegistration;
    if (defaultDurationMinutes !== undefined) setting.defaultDurationMinutes = defaultDurationMinutes;

    await setting.save();

    res.json({
      success: true,
      message: 'System settings updated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
