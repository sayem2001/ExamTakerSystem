const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const Question = require('../models/Question');

// @desc    Start an exam attempt or resume in-progress attempt
// @route   POST /api/attempts/start/:examId
// @access  Private (Student)
exports.startAttempt = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.id;

    const exam = await Exam.findById(examId).populate({
      path: 'questions',
      select: '-correctOption -explanation', // Secure: hide answers during exam
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Check if scheduled date has arrived
    const now = new Date();
    if (exam.scheduledDate && new Date(exam.scheduledDate) > now) {
      return res.status(400).json({
        success: false,
        message: `This exam is scheduled for ${new Date(exam.scheduledDate).toLocaleString()}. Please return then!`,
        scheduledDate: exam.scheduledDate,
      });
    }

    // Check for existing attempt
    let attempt = await ExamAttempt.findOne({ user: userId, exam: examId });

    if (attempt) {
      // STRICT POLICY: If already submitted, prevent retake!
      if (attempt.status === 'submitted' || attempt.status === 'auto-submitted') {
        return res.status(403).json({
          success: false,
          hasCompleted: true,
          message: 'You have already attempted this exam. Retakes are not permitted.',
          attemptId: attempt._id,
        });
      }

      // If in-progress, resume attempt
      return res.json({
        success: true,
        message: 'Resuming in-progress exam attempt',
        attempt,
        exam,
      });
    }

    // Create new attempt
    attempt = new ExamAttempt({
      user: userId,
      exam: examId,
      startedAt: new Date(),
      status: 'in-progress',
      totalQuestions: exam.questions.length,
      maxScore: exam.questions.length,
      answers: exam.questions.map((q) => ({
        questionId: q._id,
        selectedOption: '',
        markedForReview: false,
      })),
    });

    await attempt.save();

    res.status(201).json({
      success: true,
      message: 'Exam attempt started',
      attempt,
      exam,
    });
  } catch (error) {
    console.error('startAttempt error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sync / auto-save answers during exam
// @route   PUT /api/attempts/:attemptId/sync
// @access  Private (Student)
exports.syncAnswers = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, timeSpentSeconds } = req.body;

    const attempt = await ExamAttempt.findOne({ _id: attemptId, user: req.user.id });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status === 'submitted' || attempt.status === 'auto-submitted') {
      return res.status(400).json({ success: false, message: 'Exam has already been submitted' });
    }

    if (answers && Array.isArray(answers)) {
      attempt.answers = answers;
    }
    if (timeSpentSeconds !== undefined) {
      attempt.durationSeconds = timeSpentSeconds;
    }

    await attempt.save();

    res.json({ success: true, message: 'Progress saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log a proctoring violation (tab switch, exit fullscreen, copy paste)
// @route   POST /api/attempts/:attemptId/violation
// @access  Private (Student)
exports.logViolation = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { type, details } = req.body;

    const attempt = await ExamAttempt.findOne({ _id: attemptId, user: req.user.id });
    if (!attempt || attempt.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Invalid or already finished attempt' });
    }

    attempt.proctorViolations.push({
      type,
      details: details || '',
      timestamp: new Date(),
    });

    await attempt.save();

    res.json({
      success: true,
      violationsCount: attempt.proctorViolations.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit exam attempt and calculate final score
// @route   POST /api/attempts/:attemptId/submit
// @access  Private (Student)
exports.submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, durationSeconds, isAutoSubmit } = req.body;

    const attempt = await ExamAttempt.findOne({ _id: attemptId, user: req.user.id });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status === 'submitted' || attempt.status === 'auto-submitted') {
      return res.status(400).json({ success: false, message: 'Exam is already submitted', attemptId: attempt._id });
    }

    const exam = await Exam.findById(attempt.exam).populate('questions');
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam details not found' });
    }

    const submittedAnswers = answers || attempt.answers || [];
    const questionMap = {};
    exam.questions.forEach((q) => {
      questionMap[q._id.toString()] = q;
    });

    let score = 0;
    let maxScore = 0;
    let attemptedCount = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const gradedAnswers = submittedAnswers.map((ans) => {
      const q = questionMap[ans.questionId.toString()];
      if (!q) return ans;

      const qPoints = q.points || 1;
      const qNegativePoints = exam.negativeMarking ? (q.negativePoints !== undefined ? q.negativePoints : exam.negativeMarkingRate || 0.25) : 0;
      maxScore += qPoints;

      const selected = (ans.selectedOption || '').trim().toUpperCase();
      const correct = (q.correctOption || '').trim().toUpperCase();

      let isCorrect = false;
      let pointsEarned = 0;

      if (!selected) {
        unansweredCount++;
      } else {
        attemptedCount++;
        if (selected === correct) {
          isCorrect = true;
          correctCount++;
          pointsEarned = qPoints;
          score += qPoints;
        } else {
          wrongCount++;
          pointsEarned = -qNegativePoints;
          score -= qNegativePoints;
        }
      }

      return {
        questionId: q._id,
        selectedOption: selected,
        isCorrect,
        pointsEarned,
        markedForReview: !!ans.markedForReview,
      };
    });

    // Score cannot be negative
    score = Math.max(0, Math.round(score * 100) / 100);
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100 * 10) / 10 : 0;
    const passed = percentage >= (exam.passPercentage || 50);

    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.totalQuestions = exam.questions.length;
    attempt.attemptedCount = attemptedCount;
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.unansweredCount = unansweredCount;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.durationSeconds = durationSeconds || attempt.durationSeconds || 0;
    attempt.submittedAt = new Date();
    attempt.status = isAutoSubmit ? 'auto-submitted' : 'submitted';

    await attempt.save();

    res.json({
      success: true,
      message: isAutoSubmit ? 'Exam auto-submitted due to time limit' : 'Exam submitted successfully!',
      attemptId: attempt._id,
      score,
      maxScore,
      percentage,
      passed,
    });
  } catch (error) {
    console.error('submitAttempt error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed results and question review for an attempt
// @route   GET /api/attempts/:attemptId/results
// @access  Private (Owner or Admin)
exports.getAttemptResults = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId)
      .populate('user', 'name email institution avatar')
      .populate('exam');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    // Security check: only the student who took it or an admin can view detailed results
    if (req.user.role !== 'admin' && attempt.user._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this attempt result' });
    }

    // Populate question details (text, options, correctOption, explanation)
    const questionIds = attempt.answers.map((a) => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = {};
    questions.forEach((q) => {
      questionMap[q._id.toString()] = q;
    });

    const detailedAnswers = attempt.answers.map((ans) => {
      const q = questionMap[ans.questionId.toString()];
      return {
        ...ans.toObject(),
        question: q
          ? {
              _id: q._id,
              questionText: q.questionText,
              questionImage: q.questionImage,
              options: q.options,
              correctOption: q.correctOption,
              explanation: q.explanation,
              difficulty: q.difficulty,
              topic: q.topic,
            }
          : null,
      };
    });

    // Compute rank & percentile in this exam
    const allAttempts = await ExamAttempt.find({
      exam: attempt.exam._id,
      status: { $in: ['submitted', 'auto-submitted'] },
    }).sort({ score: -1, durationSeconds: 1, submittedAt: 1 });

    const totalStudents = allAttempts.length;
    let rank = 1;
    let lowerScoresCount = 0;

    for (let i = 0; i < allAttempts.length; i++) {
      if (allAttempts[i]._id.toString() === attempt._id.toString()) {
        rank = i + 1;
      }
      if (allAttempts[i].score < attempt.score) {
        lowerScoresCount++;
      }
    }

    const percentile = totalStudents > 1 ? Math.round((lowerScoresCount / (totalStudents - 1)) * 100) : 100;

    res.json({
      success: true,
      attempt: {
        ...attempt.toObject(),
        answers: detailedAnswers,
      },
      stats: {
        rank,
        totalParticipants: totalStudents,
        percentile,
        accuracyPercentage:
          attempt.attemptedCount > 0 ? Math.round((attempt.correctCount / attempt.attemptedCount) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('getAttemptResults error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
