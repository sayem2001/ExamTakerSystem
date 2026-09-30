const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');

const escapeRegex = (str = '') => {
  return typeof str === 'string' ? str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
};

// @desc    Get all published exams (with filters for topic, difficulty)
// @route   GET /api/exams
// @access  Public or Protected
exports.getExams = async (req, res) => {
  try {
    const { topic, difficulty, status } = req.query;
    const filter = {};

    // Students only see published exams unless admin
    if (!req.user || req.user.role !== 'admin') {
      filter.status = 'published';
    } else if (status && ['draft', 'published', 'archived'].includes(status)) {
      filter.status = status;
    }

    // Exclude private practice exams from public / admin general catalog
    filter.isPractice = { $ne: true };

    if (topic && topic !== 'All') {
      filter.topic = new RegExp(escapeRegex(topic.trim()), 'i');
    }
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (difficulty && validDifficulties.includes(difficulty.toLowerCase())) {
      filter.difficulty = difficulty.toLowerCase();
    }

    const exams = await Exam.find(filter)
      .populate('createdBy', 'name email')
      .sort({ scheduledDate: -1, createdAt: -1 });

    // If user is logged in, attach their attempt status to each exam
    let examsWithStatus = exams.map((exam) => exam.toObject());

    if (req.user) {
      const userAttempts = await ExamAttempt.find({
        user: req.user.id,
      }).select('exam status score percentage');

      const attemptMap = {};
      userAttempts.forEach((att) => {
        attemptMap[att.exam.toString()] = att;
      });

      examsWithStatus = examsWithStatus.map((exam) => {
        const att = attemptMap[exam._id.toString()];
        return {
          ...exam,
          userAttempt: att ? { status: att.status, score: att.score, percentage: att.percentage } : null,
          userAttemptId: att ? att._id : null,
          hasAttempted: att ? (att.status === 'submitted' || att.status === 'auto-submitted') : false,
        };
      });
    }

    res.json({
      success: true,
      count: examsWithStatus.length,
      exams: examsWithStatus,
    });
  } catch (error) {
    console.error('getExams error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single exam by ID or ExamCode
// @route   GET /api/exams/:identifier
// @access  Public/Protected
exports.getExamByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    let query;

    // Check if identifier is a valid MongoDB ObjectId or an examCode
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: identifier };
    } else {
      query = { examCode: identifier.toUpperCase() };
    }

    const exam = await Exam.findOne(query).populate({
      path: 'questions',
      select: req.user?.role === 'admin' ? '' : '-correctOption -explanation', // Hide answers from students!
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Verify privacy if this is a student's private practice exam
    if (exam.isPractice) {
      const isOwner = req.user && exam.createdBy && exam.createdBy.toString() === req.user.id.toString();
      const isAdmin = req.user?.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'This is a private student practice test. Access is restricted to the student who created it.',
        });
      }
    }

    // Check if user already attempted this exam
    let userAttempt = null;
    let hasAttempted = false;

    if (req.user) {
      userAttempt = await ExamAttempt.findOne({
        user: req.user.id,
        exam: exam._id,
      }).sort({ createdAt: -1 });

      if (userAttempt && (userAttempt.status === 'submitted' || userAttempt.status === 'auto-submitted')) {
        hasAttempted = true;
      }
    }

    res.json({
      success: true,
      exam,
      hasAttempted,
      userAttemptId: userAttempt?._id,
      userAttemptStatus: userAttempt?.status,
    });
  } catch (error) {
    console.error('getExamByIdentifier error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private (Admin only)
exports.createExam = async (req, res) => {
  try {
    const {
      title,
      topic,
      difficulty,
      description,
      scheduledDate,
      scheduledEndDate,
      durationMinutes,
      passPercentage,
      negativeMarking,
      negativeMarkingRate,
      antiCheatSettings,
      questions,
      status,
      pdfDocument,
    } = req.body;

    if (!title || !topic || !difficulty) {
      return res.status(400).json({ success: false, message: 'Please provide title, topic and difficulty' });
    }

    const exam = new Exam({
      title,
      topic,
      difficulty: difficulty.toLowerCase(),
      description: description || '',
      scheduledDate: scheduledDate || new Date(),
      scheduledEndDate: scheduledEndDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
      durationMinutes: durationMinutes || 60,
      passPercentage: passPercentage || 50,
      negativeMarking: negativeMarking !== undefined ? negativeMarking : true,
      negativeMarkingRate: negativeMarkingRate !== undefined ? negativeMarkingRate : 0.25,
      antiCheatSettings: antiCheatSettings || {
        fullScreenRequired: true,
        maxTabSwitches: 3,
        blockCopyPaste: true,
        disableRightClick: true,
      },
      questions: questions || [],
      status: status || 'published',
      pdfDocument: pdfDocument || null,
      createdBy: req.user.id,
    });

    await exam.save();

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      exam,
    });
  } catch (error) {
    console.error('createExam error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update an exam
// @route   PUT /api/exams/:id
// @access  Private (Admin only)
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    Object.assign(exam, req.body);
    await exam.save();

    res.json({
      success: true,
      message: 'Exam updated successfully',
      exam,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete an exam
// @route   DELETE /api/exams/:id
// @access  Private (Admin only)
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Remove associated attempts or keep for record
    await ExamAttempt.deleteMany({ exam: exam._id });
    await exam.deleteOne();

    res.json({
      success: true,
      message: 'Exam and related attempts deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user's private AI practice exams
// @route   GET /api/exams/my-practice
// @access  Private (Protected)
exports.getMyPracticeExams = async (req, res) => {
  try {
    const exams = await Exam.find({
      isPractice: true,
      createdBy: req.user.id,
    })
      .populate('questions')
      .sort({ createdAt: -1 });

    const examIds = exams.map((e) => e._id);
    const userAttempts = await ExamAttempt.find({
      user: req.user.id,
      exam: { $in: examIds },
    })
      .select('_id exam status score maxScore percentage passed submittedAt createdAt')
      .sort({ createdAt: -1 });

    const attemptMap = {};
    userAttempts.forEach((att) => {
      // Keep most recent attempt per exam
      if (!attemptMap[att.exam.toString()]) {
        attemptMap[att.exam.toString()] = att;
      }
    });

    const examsWithAttempts = exams.map((exam) => {
      const att = attemptMap[exam._id.toString()];
      return {
        ...exam.toObject(),
        userAttempt: att || null,
        userAttemptId: att ? att._id : null,
        hasAttempted: att ? (att.status === 'submitted' || att.status === 'auto-submitted') : false,
      };
    });

    res.json({
      success: true,
      count: examsWithAttempts.length,
      exams: examsWithAttempts,
    });
  } catch (error) {
    console.error('getMyPracticeExams error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a personal practice exam
// @route   DELETE /api/exams/my-practice/:id
// @access  Private (Protected)
exports.deletePracticeExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      isPractice: true,
      createdBy: req.user.id,
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Practice exam not found or unauthorized' });
    }

    // Delete associated practice questions if created for this exam
    if (exam.questions && exam.questions.length > 0) {
      await Question.deleteMany({ _id: { $in: exam.questions }, isPractice: true, createdBy: req.user.id });
    }

    // Delete attempts for this practice exam
    await ExamAttempt.deleteMany({ exam: exam._id, user: req.user.id });

    await Exam.findByIdAndDelete(exam._id);

    res.json({ success: true, message: 'Practice exam deleted successfully' });
  } catch (error) {
    console.error('deletePracticeExam error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

