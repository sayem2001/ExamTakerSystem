const fs = require('fs');
const path = require('path');
const { extractTextFromPDF, generateMCQsWithGemini } = require('../services/geminiService');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const Topic = require('../models/Topic');

// @desc    Process uploaded PDF with Gemini API to extract MCQs
// @route   POST /api/ai/process-pdf
// @access  Private (Admin only)
exports.processPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF file' });
    }

    const filePath = req.file.path;
    const { topic = 'Higher Mathematics', difficulty = 'auto', questionCount = 30 } = req.body;

    console.log(`Processing PDF: ${req.file.originalname} (${req.file.size} bytes)`);

    // 1. Extract text from PDF
    const { text, numPages, info } = await extractTextFromPDF(filePath);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from this PDF. It may contain scanned images without OCR.',
      });
    }

    // 2. Call Gemini service
    const aiResult = await generateMCQsWithGemini({
      pdfText: text,
      targetTopic: topic,
      targetDifficulty: difficulty,
      questionCount: parseInt(questionCount, 10) || 30,
    });

    const questions = aiResult.questions || [];

    res.json({
      success: true,
      message: `Successfully extracted ${questions.length} questions from PDF`,
      meta: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        numPages,
        detectedTopic: aiResult.detectedTopic || topic,
        modelUsed: aiResult.modelUsed,
      },
      questions,
    });
  } catch (error) {
    console.error('processPdf error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error processing PDF with Gemini' });
  }
};

// @desc    Auto-create 3 Exams (Easy, Medium, Hard) for a Topic from questions
// @route   POST /api/ai/auto-create-three-exams
// @access  Private (Admin only)
exports.autoCreateThreeExams = async (req, res) => {
  try {
    const {
      topic,
      scheduledDate,
      durationMinutes = 60,
      questions,
      pdfDocument,
    } = req.body;

    if (!topic || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide topic name and questions to build the 3 difficulty exams',
      });
    }

    // Ensure topic exists in Topic collection
    let existingTopic = await Topic.findOne({ name: new RegExp(`^${topic}$`, 'i') });
    if (!existingTopic) {
      existingTopic = await Topic.create({
        name: topic,
        slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: `Mathematical assessments in ${topic}`,
      });
    }

    // Group questions by difficulty
    const easyQs = [];
    const mediumQs = [];
    const hardQs = [];

    // Distribute if some don't have explicit difficulty
    questions.forEach((q, idx) => {
      const diff = (q.difficulty || '').toLowerCase();
      if (diff === 'easy') easyQs.push(q);
      else if (diff === 'hard') hardQs.push(q);
      else if (diff === 'medium') mediumQs.push(q);
      else {
        // distribute evenly
        if (idx % 3 === 0) easyQs.push(q);
        else if (idx % 3 === 1) mediumQs.push(q);
        else hardQs.push(q);
      }
    });

    const createExamForDifficulty = async (diffLabel, rawQuestions, durationMins) => {
      if (rawQuestions.length === 0) return null;

      // Save questions in DB
      const createdQuestionDocs = await Question.insertMany(
        rawQuestions.map((q) => ({
          topic,
          difficulty: diffLabel,
          questionText: q.questionText,
          options: q.options,
          correctOption: q.correctOption,
          explanation: q.explanation || '',
          points: diffLabel === 'hard' ? 2 : 1,
          negativePoints: diffLabel === 'hard' ? 0.5 : 0.25,
          sourcePdf: pdfDocument ? { filename: pdfDocument.filename, uploadedAt: new Date() } : undefined,
        }))
      );

      const examCode = `${topic.substring(0, 4).toUpperCase()}-${diffLabel[0].toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;

      const exam = await Exam.create({
        title: `${topic} Exam - ${diffLabel.toUpperCase()} Level`,
        topic,
        difficulty: diffLabel,
        description: `Official comprehensive ${diffLabel}-level assessment for ${topic}. Evaluates fundamental to advanced conceptual mastery.`,
        examCode,
        scheduledDate: scheduledDate || new Date(),
        scheduledEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days window
        durationMinutes: durationMins,
        passPercentage: diffLabel === 'hard' ? 45 : 50,
        negativeMarking: true,
        negativeMarkingRate: diffLabel === 'hard' ? 0.5 : 0.25,
        questions: createdQuestionDocs.map((q) => q._id),
        pdfDocument: pdfDocument || null,
        createdBy: req.user.id,
        status: 'published',
      });

      return exam;
    };

    const createdExams = [];

    const easyExam = await createExamForDifficulty('easy', easyQs, Math.max(30, durationMinutes - 15));
    if (easyExam) createdExams.push(easyExam);

    const mediumExam = await createExamForDifficulty('medium', mediumQs, durationMinutes);
    if (mediumExam) createdExams.push(mediumExam);

    const hardExam = await createExamForDifficulty('hard', hardQs, durationMinutes + 15);
    if (hardExam) createdExams.push(hardExam);

    res.status(201).json({
      success: true,
      message: `Successfully generated ${createdExams.length} difficulty-based exams for ${topic}`,
      topic,
      breakdown: {
        easy: easyQs.length,
        medium: mediumQs.length,
        hard: hardQs.length,
      },
      exams: createdExams,
    });
  } catch (error) {
    console.error('autoCreateThreeExams error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
