const fs = require('fs');
const path = require('path');
const { extractTextFromPDF, generateMCQsWithGemini } = require('../services/geminiService');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const Topic = require('../models/Topic');

// @desc    Process uploaded PDF or directly pasted text with Gemini API to extract MCQs
// @route   POST /api/ai/process-pdf
// @access  Private (Admin only)
exports.processPdf = async (req, res) => {
  try {
    const {
      topic = 'General Mathematics',
      difficulty = 'medium',
      questionCount = 30,
      pastedText = '',
    } = req.body;

    let text = '';
    let numPages = 1;
    let originalName = 'Pasted Text';
    let filename = `pasted-text-${Date.now()}`;
    let isDirectPaste = false;

    if (req.file) {
      const filePath = req.file.path;
      originalName = req.file.originalname;
      filename = req.file.filename;
      console.log(`Processing PDF: ${originalName} (${req.file.size} bytes)`);

      const pdfData = await extractTextFromPDF(filePath);
      text = pdfData.text;
      numPages = pdfData.numPages || 1;
    } else {
      const rawText = pastedText || req.body.text || '';
      if (rawText && rawText.trim().length > 0) {
        text = rawText.trim();
        isDirectPaste = true;
        originalName = 'Directly Pasted Text';
        console.log(`Processing direct pasted text (${text.length} characters)`);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Please upload a PDF document or paste question text directly.',
        });
      }
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not find readable text. Ensure the PDF contains readable text (or paste text directly).',
      });
    }

    // Call Gemini service
    const targetCount = parseInt(questionCount, 10) || 30;
    const aiResult = await generateMCQsWithGemini({
      pdfText: text,
      targetTopic: topic,
      targetDifficulty: difficulty,
      questionCount: targetCount,
    });

    let questions = aiResult.questions || [];
    let isFallback = false;

    if (!questions || questions.length === 0) {
      if (aiResult.fallback && aiResult.fallback.length > 0) {
        questions = aiResult.fallback;
        isFallback = true;
      }
    }

    if (!questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: aiResult.error || 'Could not synthesize questions from the provided input.',
      });
    }

    const detectedTopic = aiResult.detectedTopic || topic;

    res.json({
      success: true,
      message: `Successfully synthesized ${questions.length} questions from ${isDirectPaste ? 'pasted text' : 'PDF'}${isFallback ? ' (using verified standard bank)' : ''}`,
      meta: {
        originalName,
        filename,
        numPages,
        detectedTopic,
        modelUsed: aiResult.modelUsed || (isFallback ? 'fallback-standard-bank' : 'gemini'),
        isFallback,
        isDirectPaste,
      },
      questions,
    });
  } catch (error) {
    console.error('processPdf error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error processing document with Gemini' });
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

// @desc    Schedule a custom exam with the AI-synthesized questions
// @route   POST /api/ai/schedule-generated-exam
// @access  Private (Admin only)
exports.scheduleGeneratedExam = async (req, res) => {
  try {
    const {
      title,
      topic,
      difficulty = 'medium',
      description,
      scheduledDate,
      scheduledEndDate,
      durationMinutes = 60,
      passPercentage = 50,
      negativeMarking = true,
      negativeMarkingRate = 0.25,
      antiCheatSettings = {
        fullScreenRequired: true,
        maxTabSwitches: 3,
        blockCopyPaste: true,
        disableRightClick: true,
      },
      questions,
      pdfDocument,
    } = req.body;

    if (!title || !topic || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide exam title, topic, and at least one question.',
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

    // Save questions in Question collection
    const createdQuestionDocs = await Question.insertMany(
      questions.map((q) => ({
        topic,
        difficulty: (q.difficulty || difficulty).toLowerCase(),
        questionText: q.questionText,
        options: q.options,
        correctOption: (q.correctOption || 'A').toUpperCase().trim(),
        explanation: q.explanation || '',
        points: difficulty === 'hard' ? 2 : 1,
        negativePoints: difficulty === 'hard' ? 0.5 : (parseFloat(negativeMarkingRate) || 0.25),
        sourcePdf: pdfDocument ? { filename: pdfDocument.filename, uploadedAt: new Date() } : undefined,
      }))
    );

    const topicPrefix = topic.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'EX') || 'EXAM';
    const diffPrefix = (difficulty || 'M')[0].toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const examCode = `${topicPrefix}-${diffPrefix}${rand}`;

    const exam = await Exam.create({
      title: title.trim(),
      topic,
      difficulty: difficulty.toLowerCase(),
      description: description || `Official assessment for ${topic} (${difficulty.toUpperCase()} tier). Tests conceptual mastery and quantitative problem solving.`,
      examCode,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      scheduledEndDate: scheduledEndDate ? new Date(scheduledEndDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      durationMinutes: parseInt(durationMinutes, 10) || 60,
      passPercentage: parseInt(passPercentage, 10) || 50,
      negativeMarking: !!negativeMarking,
      negativeMarkingRate: parseFloat(negativeMarkingRate) || 0.25,
      antiCheatSettings: {
        fullScreenRequired: antiCheatSettings?.fullScreenRequired !== false,
        maxTabSwitches: antiCheatSettings?.maxTabSwitches || 3,
        blockCopyPaste: antiCheatSettings?.blockCopyPaste !== false,
        disableRightClick: antiCheatSettings?.disableRightClick !== false,
      },
      questions: createdQuestionDocs.map((q) => q._id),
      pdfDocument: pdfDocument || null,
      createdBy: req.user.id,
      status: 'published',
    });

    res.status(201).json({
      success: true,
      message: `Exam "${exam.title}" successfully scheduled!`,
      exam,
    });
  } catch (error) {
    console.error('scheduleGeneratedExam error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error scheduling exam' });
  }
};

