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
      // STRICT POLICY: If already submitted, prevent retake on official exams!
      if (attempt.status === 'submitted' || attempt.status === 'auto-submitted') {
        if (!exam.isPractice) {
          return res.status(403).json({
            success: false,
            hasCompleted: true,
            message: 'You have already attempted this exam. Retakes are not permitted.',
            attemptId: attempt._id,
          });
        }

        // For student practice exams, allow unlimited retakes by resetting attempt
        attempt.status = 'in-progress';
        attempt.startedAt = new Date();
        attempt.submittedAt = undefined;
        attempt.durationSeconds = 0;
        attempt.score = 0;
        attempt.maxScore = exam.questions.length;
        attempt.percentage = 0;
        attempt.passed = false;
        attempt.proctorViolations = [];
        attempt.answers = exam.questions.map((q) => ({
          questionId: q._id,
          selectedOption: '',
          markedForReview: false,
        }));
        await attempt.save();

        return res.json({
          success: true,
          message: 'Starting fresh practice attempt',
          attempt,
          exam,
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

    const updateData = {};
    if (answers && Array.isArray(answers)) {
      updateData.answers = answers;
    }
    if (timeSpentSeconds !== undefined) {
      updateData.durationSeconds = timeSpentSeconds;
    }

    const updated = await ExamAttempt.findOneAndUpdate(
      { _id: attemptId, user: req.user.id, status: 'in-progress' },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(200).json({ success: true, message: 'Progress recorded or exam already finished' });
    }

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

    const updated = await ExamAttempt.findOneAndUpdate(
      { _id: attemptId, user: req.user.id, status: 'in-progress' },
      {
        $push: {
          proctorViolations: {
            type,
            details: details || '',
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(200).json({ success: true, violationsCount: 0, message: 'Exam not active or already finalized' });
    }

    res.json({
      success: true,
      violationsCount: updated.proctorViolations.length,
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

    // If already submitted by concurrent request or timeout, return current result safely
    if (attempt.status === 'submitted' || attempt.status === 'auto-submitted') {
      return res.json({
        success: true,
        message: 'Exam is already submitted',
        attemptId: attempt._id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        passed: attempt.passed,
      });
    }

    const exam = await Exam.findById(attempt.exam).populate('questions');
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam details not found' });
    }

    const submittedAnswers = (answers && answers.length > 0) ? answers : (attempt.answers || []);
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

    // Atomically update attempt using findOneAndUpdate to prevent Mongoose version conflicts
    const updatedAttempt = await ExamAttempt.findOneAndUpdate(
      { _id: attempt._id, user: req.user.id },
      {
        $set: {
          answers: gradedAnswers,
          score,
          maxScore,
          totalQuestions: exam.questions.length,
          attemptedCount,
          correctCount,
          wrongCount,
          unansweredCount,
          percentage,
          passed,
          durationSeconds: durationSeconds || attempt.durationSeconds || 0,
          submittedAt: new Date(),
          status: isAutoSubmit ? 'auto-submitted' : 'submitted',
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      message: isAutoSubmit ? 'Exam auto-submitted due to time limit or violations' : 'Exam submitted successfully!',
      attemptId: (updatedAttempt || attempt)._id,
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

// @desc    Get current student's aggregated performance statistics
// @route   GET /api/attempts/my-performance
// @access  Private (Protected)
exports.getMyPerformance = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all completed attempts by this user
    const attempts = await ExamAttempt.find({
      user: userId,
      status: { $in: ['submitted', 'auto-submitted'] },
    })
      .populate('exam', 'title topic difficulty examCode passPercentage isPractice durationMinutes')
      .sort({ submittedAt: -1, createdAt: -1 });

    const totalAttempts = attempts.length;

    if (totalAttempts === 0) {
      return res.json({
        success: true,
        summary: {
          totalAttempts: 0,
          passedAttempts: 0,
          passRate: 0,
          averagePercentage: 0,
          highestPercentage: 0,
          totalQuestionsAnswered: 0,
          totalCorrectAnswers: 0,
          overallAccuracy: 0,
          officialAttemptsCount: 0,
          practiceAttemptsCount: 0,
        },
        topicBreakdown: [],
        difficultyBreakdown: {
          easy: { attempts: 0, avgPercentage: 0, accuracy: 0 },
          medium: { attempts: 0, avgPercentage: 0, accuracy: 0 },
          hard: { attempts: 0, avgPercentage: 0, accuracy: 0 },
        },
        recentAttempts: [],
      });
    }

    let totalScore = 0;
    let totalMaxScore = 0;
    let totalPercentage = 0;
    let highestPercentage = 0;
    let passedCount = 0;
    let totalAttemptedQuestions = 0;
    let totalCorrectAnswers = 0;
    let officialCount = 0;
    let practiceCount = 0;

    const topicMap = {};
    const difficultyMap = {
      easy: { totalAttempts: 0, totalPercentage: 0, correct: 0, attempted: 0 },
      medium: { totalAttempts: 0, totalPercentage: 0, correct: 0, attempted: 0 },
      hard: { totalAttempts: 0, totalPercentage: 0, correct: 0, attempted: 0 },
    };

    attempts.forEach((att) => {
      const exam = att.exam || {};
      const topic = exam.topic || 'General';
      const difficulty = (exam.difficulty || 'medium').toLowerCase();
      const isPractice = !!exam.isPractice;

      if (isPractice) practiceCount++;
      else officialCount++;

      const pct = att.percentage || 0;
      totalPercentage += pct;
      if (pct > highestPercentage) highestPercentage = pct;
      if (att.passed) passedCount++;

      totalScore += att.score || 0;
      totalMaxScore += att.maxScore || 0;
      totalAttemptedQuestions += att.attemptedCount || 0;
      totalCorrectAnswers += att.correctCount || 0;

      // Topic aggregation
      if (!topicMap[topic]) {
        topicMap[topic] = {
          topic,
          attempts: 0,
          totalPercentage: 0,
          correct: 0,
          attempted: 0,
          passed: 0,
        };
      }
      topicMap[topic].attempts += 1;
      topicMap[topic].totalPercentage += pct;
      topicMap[topic].correct += att.correctCount || 0;
      topicMap[topic].attempted += att.attemptedCount || 0;
      if (att.passed) topicMap[topic].passed += 1;

      // Difficulty aggregation
      if (difficultyMap[difficulty]) {
        difficultyMap[difficulty].totalAttempts += 1;
        difficultyMap[difficulty].totalPercentage += pct;
        difficultyMap[difficulty].correct += att.correctCount || 0;
        difficultyMap[difficulty].attempted += att.attemptedCount || 0;
      }
    });

    const averagePercentage = Math.round((totalPercentage / totalAttempts) * 10) / 10;
    const passRate = Math.round((passedCount / totalAttempts) * 100);
    const overallAccuracy = totalAttemptedQuestions > 0
      ? Math.round((totalCorrectAnswers / totalAttemptedQuestions) * 100)
      : 0;

    const topicBreakdown = Object.values(topicMap).map((t) => ({
      topic: t.topic,
      attempts: t.attempts,
      avgPercentage: Math.round((t.totalPercentage / t.attempts) * 10) / 10,
      accuracy: t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0,
      passRate: Math.round((t.passed / t.attempts) * 100),
    })).sort((a, b) => b.attempts - a.attempts);

    const difficultyBreakdown = {};
    ['easy', 'medium', 'hard'].forEach((diff) => {
      const data = difficultyMap[diff];
      difficultyBreakdown[diff] = {
        attempts: data.totalAttempts,
        avgPercentage: data.totalAttempts > 0 ? Math.round((data.totalPercentage / data.totalAttempts) * 10) / 10 : 0,
        accuracy: data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0,
      };
    });

    const recentAttempts = attempts.map((att) => ({
      attemptId: att._id,
      examId: att.exam?._id,
      examTitle: att.exam?.title || 'Assessment',
      topic: att.exam?.topic || 'General',
      difficulty: att.exam?.difficulty || 'medium',
      examCode: att.exam?.examCode || '',
      isPractice: !!att.exam?.isPractice,
      score: att.score,
      maxScore: att.maxScore,
      percentage: att.percentage,
      passed: att.passed,
      attemptedCount: att.attemptedCount,
      correctCount: att.correctCount,
      wrongCount: att.wrongCount,
      unansweredCount: att.unansweredCount,
      submittedAt: att.submittedAt || att.updatedAt,
      durationSeconds: att.durationSeconds,
    }));

    res.json({
      success: true,
      summary: {
        totalAttempts,
        passedAttempts: passedCount,
        passRate,
        averagePercentage,
        highestPercentage,
        totalQuestionsAnswered: totalAttemptedQuestions,
        totalCorrectAnswers,
        overallAccuracy,
        officialAttemptsCount: officialCount,
        practiceAttemptsCount: practiceCount,
      },
      topicBreakdown,
      difficultyBreakdown,
      recentAttempts,
    });
  } catch (error) {
    console.error('getMyPerformance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

