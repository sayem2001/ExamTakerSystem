const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const User = require('../models/User');

// @desc    Get leaderboard for a specific exam
// @route   GET /api/leaderboard/exam/:examId
// @access  Public / Protected
exports.getExamLeaderboard = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId).select(
      'title topic difficulty durationMinutes scheduledDate showLeaderboard'
    );
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const attempts = await ExamAttempt.find({
      exam: examId,
      status: { $in: ['submitted', 'auto-submitted'] },
    })
      .populate('user', 'name email institution avatar')
      .sort({ score: -1, durationSeconds: 1, submittedAt: 1 })
      .lean();

    const currentUserId = req.user ? req.user.id.toString() : null;
    let currentUserEntry = null;

    const leaderboard = attempts.map((att, index) => {
      const rank = index + 1;
      const accuracy =
        att.attemptedCount > 0 ? Math.round((att.correctCount / att.attemptedCount) * 100) : 0;

      // Badges
      const badges = [];
      if (rank === 1) badges.push({ label: 'Champion', icon: '🏆', color: 'gold' });
      else if (rank === 2) badges.push({ label: 'Silver', icon: '🥈', color: 'silver' });
      else if (rank === 3) badges.push({ label: 'Bronze', icon: '🥉', color: 'bronze' });

      if (accuracy >= 95 && att.attemptedCount >= 10) {
        badges.push({ label: 'Sniper (95%+)', icon: '🎯', color: 'emerald' });
      }
      if (att.durationSeconds && exam.durationMinutes && att.durationSeconds < (exam.durationMinutes * 60) / 2 && att.percentage >= 80) {
        badges.push({ label: 'Speed Demon', icon: '⚡', color: 'amber' });
      }

      const item = {
        rank,
        attemptId: att._id,
        user: {
          id: att.user?._id,
          name: att.user?.name || 'Anonymous Student',
          institution: att.user?.institution || '',
          avatar: att.user?.avatar || '',
        },
        score: att.score,
        maxScore: att.maxScore,
        percentage: att.percentage,
        accuracy,
        durationSeconds: att.durationSeconds,
        submittedAt: att.submittedAt,
        badges,
        isCurrentUser: currentUserId ? att.user?._id?.toString() === currentUserId : false,
      };

      if (item.isCurrentUser) {
        currentUserEntry = item;
      }

      return item;
    });

    res.json({
      success: true,
      exam,
      totalParticipants: leaderboard.length,
      leaderboard,
      currentUserEntry,
    });
  } catch (error) {
    console.error('getExamLeaderboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get global platform leaderboard
// @route   GET /api/leaderboard/global
// @access  Public
exports.getGlobalLeaderboard = async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          status: { $in: ['submitted', 'auto-submitted'] },
        },
      },
      {
        $group: {
          _id: '$user',
          totalScore: { $sum: '$score' },
          totalExamsTaken: { $sum: 1 },
          avgPercentage: { $avg: '$percentage' },
          bestScore: { $max: '$score' },
          totalPassed: {
            $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] },
          },
        },
      },
      {
        $sort: { totalScore: -1, avgPercentage: -1 },
      },
      {
        $limit: 100,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $project: {
          userId: '$_id',
          name: '$userDetails.name',
          institution: '$userDetails.institution',
          avatar: '$userDetails.avatar',
          totalScore: { $round: ['$totalScore', 2] },
          totalExamsTaken: 1,
          avgPercentage: { $round: ['$avgPercentage', 1] },
          totalPassed: 1,
        },
      },
    ];

    const results = await ExamAttempt.aggregate(pipeline);

    const ranked = results.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    res.json({
      success: true,
      count: ranked.length,
      leaderboard: ranked,
    });
  } catch (error) {
    console.error('getGlobalLeaderboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export exam leaderboard as CSV
// @route   GET /api/leaderboard/export/:examId
// @access  Private (Admin or completed student)
exports.exportLeaderboardCSV = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).send('Exam not found');

    const attempts = await ExamAttempt.find({
      exam: examId,
      status: { $in: ['submitted', 'auto-submitted'] },
    })
      .populate('user', 'name email institution')
      .sort({ score: -1, durationSeconds: 1 });

    const isExamAdmin = req.user && req.user.role === 'admin';

    let csv = 'Rank,Student Name,Email,Institution,Score,Max Score,Percentage,Time (Seconds),Status,Submitted At\n';

    attempts.forEach((att, idx) => {
      const name = (att.user?.name || 'Anonymous').replace(/,/g, ' ');
      const rawEmail = att.user?.email || '';
      let displayEmail = rawEmail;

      // PII Protection: Mask email for non-admins to prevent scraping student directories
      if (!isExamAdmin && rawEmail) {
        const [userPart, domain] = rawEmail.split('@');
        displayEmail = userPart.length > 2
          ? `${userPart[0]}***${userPart.slice(-1)}@${domain}`
          : `***@${domain || 'domain.com'}`;
      }
      displayEmail = displayEmail.replace(/,/g, ' ');
      const inst = (att.user?.institution || '').replace(/,/g, ' ');
      csv += `${idx + 1},"${name}","${displayEmail}","${inst}",${att.score},${att.maxScore},${att.percentage}%,${att.durationSeconds},${att.status},"${new Date(att.submittedAt).toISOString()}"\n`;
    });

    const safeTitle = (exam.title || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Leaderboard-${safeTitle}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).send(error.message);
  }
};
