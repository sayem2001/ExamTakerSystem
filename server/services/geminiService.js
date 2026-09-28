const fs = require('fs');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const SystemSetting = require('../models/SystemSetting');

/**
 * Extract raw text from an uploaded PDF file
 */
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return {
      text: pdfData.text,
      numPages: pdfData.numpages,
      info: pdfData.info,
    };
  } catch (error) {
    console.error('Error parsing PDF buffer:', error.message);
    throw new Error('Failed to parse PDF file. Ensure the PDF is not password protected.');
  }
};

/**
 * Retrieve the active Gemini API key from DB or process.env
 */
const getActiveApiKey = async (providedKey = '') => {
  if (providedKey && providedKey.trim().length > 10) {
    return providedKey.trim();
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    const setting = await SystemSetting.findOne().lean();
    if (setting && setting.geminiApiKey) {
      return setting.geminiApiKey.trim();
    }
  } catch (err) {
    // DB might be connecting
  }
  return '';
};

/**
 * Robust JSON parser that handles markdown fences, unescaped LaTeX backslashes,
 * and recovers question blocks even from truncated or imperfect JSON
 */
const robustParseJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;

  let text = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 1. Direct standard parse
  try {
    return JSON.parse(text);
  } catch (err) {}

  // 2. Fix unescaped backslashes commonly introduced by LaTeX formulas (\frac, \times, \approx, etc.)
  try {
    const fixedBackslashes = text
      .replace(/\\/g, '\\\\')
      .replace(/\\\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\$1');
    return JSON.parse(fixedBackslashes);
  } catch (err) {}

  // 3. Regex-based question block extractor
  const questions = [];
  const questionRegex = /\{\s*"questionText"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?"options"\s*:\s*\[([\s\S]*?)\][\s\S]*?"correctOption"\s*:\s*"([A-E])"[\s\S]*?(?:"explanation"\s*:\s*"((?:[^"\\]|\\.)*)")?\s*\}/g;

  let match;
  while ((match = questionRegex.exec(text)) !== null) {
    try {
      const qText = match[1].replace(/\\"/g, '"');
      const optionsRaw = match[2];
      const correctOpt = match[3];
      const explanation = match[4] ? match[4].replace(/\\"/g, '"') : '';

      const optRegex = /\{\s*"key"\s*:\s*"([A-E])"\s*,\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
      const options = [];
      let optMatch;
      while ((optMatch = optRegex.exec(optionsRaw)) !== null) {
        options.push({
          key: optMatch[1],
          text: optMatch[2].replace(/\\"/g, '"'),
        });
      }

      if (qText && options.length >= 2) {
        questions.push({
          questionText: qText,
          options,
          correctOption: correctOpt,
          explanation,
        });
      }
    } catch (parsePieceErr) {}
  }

  if (questions.length > 0) {
    return { questions };
  }

  throw new Error('Failed to parse questions from model response');
};

/**
 * Robust caller across candidate Gemini models with priority on gemini-3.8-flash
 */
const callGeminiCandidateModels = async ({ genAI, modelCandidates, contents }) => {
  let lastError = null;

  for (const modelName of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Calling ${modelName} (attempt ${attempt + 1})...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(contents);
        const response = await result.response;
        const rawText = response.text().trim();

        const parsed = robustParseJson(rawText);
        if (parsed) {
          return { parsed, modelUsed: modelName };
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} attempt ${attempt + 1} failed: ${err.status || err.message}`);
        if (err.status === 429 && err.message && err.message.includes('Quota exceeded')) {
          // If daily quota exceeded on this model, immediately try next candidate without retry
          break;
        }
        if (err.status === 503 || err.status === 429) {
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        } else {
          break; // Move to next model candidate
        }
      }
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to respond.');
};

/**
 * Optimized question generator modeled after the Gemini App
 * Uses gemini-3.8-flash as primary model with fast fallback candidates
 */
const generateMCQsWithGemini = async ({
  pdfPath = null,
  pdfText = '',
  targetTopic = 'General Mathematics',
  targetDifficulty = 'easy', // 'easy' | 'medium' | 'hard'
  questionCount = 30,
  apiKey = '',
}) => {
  const activeKey = await getActiveApiKey(apiKey);
  const targetCount = Math.max(1, parseInt(questionCount, 10) || 30);

  if (!activeKey) {
    console.warn('⚠️ No Gemini API Key configured. Generating intelligent fallback questions.');
    const fallbackObj = generateFallbackQuestions(targetTopic, targetDifficulty, targetCount);
    return {
      success: false,
      fallback: fallbackObj.questions || fallbackObj,
    };
  }

  const genAI = new GoogleGenerativeAI(activeKey);

  // Model candidates with gemini-3.8-flash as PRIMARY
  const modelCandidates = [
    'gemini-3.8-flash',
    'gemini-flash-lite-latest',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
  ];

  // Concise, effective modification rules
  const diffRules = {
    easy: '- Keep the exact same 1-step logic as the problem archetypes in the document.\n- Change all numbers, values, and names (e.g. change 80 to 120, 25% to 20%).\n- Recalculate options A-D, identify correctOption, and write a clear step-by-step mathematical explanation.',
    medium: '- Moderately increase difficulty by adding a secondary calculation step or reversing unknown variables (e.g. solve for original cost given final selling price).\n- Formulate 4 realistic options, identify correctOption, and write a clear derivation.',
    hard: '- Transform problem concepts into multi-tier challenging word problems with realistic real-world constraints (e.g. faulty weights, fractional spoilage, tiered bulk rates).\n- Formulate plausible trap answers, identify correctOption, and provide a comprehensive mathematical proof.',
  };

  const selectedRule = diffRules[targetDifficulty.toLowerCase()] || diffRules.easy;

  const prompt = `
You are an expert exam question creator.
Based on the provided document/math content, create EXACTLY ${targetCount} brand-new multiple-choice questions (MCQs) for "${targetTopic}" at ${targetDifficulty.toUpperCase()} difficulty.

MODIFICATION RULE (${targetDifficulty.toUpperCase()}):
${selectedRule}

IMPORTANT GUIDELINES:
- DO NOT copy-paste original questions verbatim; formulate newly modified, unique questions.
- Recalculate all 4 options (A, B, C, D) and specify the correctOption.
- Provide a clear, step-by-step mathematical explanation for each.
- Use clean LaTeX for all formulas (e.g. $x^2 + 5x = 0$, $\\frac{a}{b}$, 25%).

Return ONLY a valid raw JSON object (no markdown, no backticks):
{
  "detectedTopic": "${targetTopic}",
  "difficulty": "${targetDifficulty.toLowerCase()}",
  "questions": [
    {
      "questionText": "Question text...",
      "difficulty": "${targetDifficulty.toLowerCase()}",
      "topic": "${targetTopic}",
      "options": [
        {"key": "A", "text": "Option A"},
        {"key": "B", "text": "Option B"},
        {"key": "C", "text": "Option C"},
        {"key": "D", "text": "Option D"}
      ],
      "correctOption": "A",
      "explanation": "Step-by-step derivation..."
    }
  ]
}
You MUST output all ${targetCount} questions in the "questions" array.
`;

  // Prepare text payload (text-first ensures high reliability without 503 upload spikes)
  let textContent = pdfText;
  if (!textContent && pdfPath && fs.existsSync(pdfPath)) {
    try {
      const parsed = await extractTextFromPDF(pdfPath);
      textContent = parsed.text;
    } catch (e) {
      console.warn('PDF text extraction error:', e.message);
    }
  }

  const trimmedText = (textContent || '').slice(0, 35000);
  const contents = [
    `DOCUMENT SOURCE CONTENT:\n---\n${trimmedText}\n---\n\n${prompt}`,
  ];

  try {
    const { parsed, modelUsed } = await callGeminiCandidateModels({
      genAI,
      modelCandidates,
      contents,
    });

    let extractedQuestions = [];
    let detectedTopic = targetTopic;

    if (Array.isArray(parsed)) {
      if (parsed[0]?.questions && Array.isArray(parsed[0].questions)) {
        extractedQuestions = parsed[0].questions;
        detectedTopic = parsed[0].detectedTopic || detectedTopic;
      } else {
        extractedQuestions = parsed;
      }
    } else if (parsed && typeof parsed === 'object') {
      extractedQuestions = parsed.questions || parsed.mcqs || [];
      detectedTopic = parsed.detectedTopic || detectedTopic;
    }

    // Filter valid questions
    const validQuestions = (extractedQuestions || []).filter(
      (q) => q && q.questionText && Array.isArray(q.options) && q.options.length >= 2
    );

    console.log(`Gemini (${modelUsed}) returned ${validQuestions.length} valid questions in 1 call`);

    if (validQuestions.length > 0) {
      return {
        success: true,
        modelUsed,
        detectedTopic: detectedTopic || targetTopic,
        totalExtracted: validQuestions.length,
        questions: validQuestions.slice(0, targetCount),
      };
    }
  } catch (err) {
    console.error('Gemini question generation failed:', err.message);
  }

  // Fallback if all attempts failed
  console.warn('Falling back to standard verified math question bank');
  const fallbackObj = generateFallbackQuestions(targetTopic, targetDifficulty, targetCount);
  return {
    success: false,
    fallback: fallbackObj.questions || fallbackObj,
  };
};

/**
 * Intelligent math question generator fallback if API key is missing or quota exceeded
 */
const generateFallbackQuestions = (topic, difficulty, count = 15) => {
  const sampleBank = [
    // EASY
    {
      questionText: 'What is the derivative of $f(x) = 3x^4 - 5x^2 + 8$ with respect to $x$?',
      difficulty: 'easy',
      topic: topic || 'Calculus',
      options: [
        { key: 'A', text: '$12x^3 - 10x$' },
        { key: 'B', text: '$12x^3 - 10x + 8$' },
        { key: 'C', text: '$7x^3 - 10x$' },
        { key: 'D', text: '$12x^4 - 5x$' },
      ],
      correctOption: 'A',
      explanation: 'By the power rule: $d/dx(ax^n) = a \\cdot n \\cdot x^{n-1}$. Thus $d/dx(3x^4) = 12x^3$, $d/dx(-5x^2) = -10x$, and $d/dx(8) = 0$. Summing them yields $12x^3 - 10x$.',
    },
    {
      questionText: 'Evaluate the definite integral: $\\int_{0}^{2} 4x \\, dx$.',
      difficulty: 'easy',
      topic: topic || 'Calculus',
      options: [
        { key: 'A', text: '$4$' },
        { key: 'B', text: '$8$' },
        { key: 'C', text: '$16$' },
        { key: 'D', text: '$2$' },
      ],
      correctOption: 'B',
      explanation: 'The antiderivative of $4x$ is $2x^2$. Evaluating from $0$ to $2$: $2(2)^2 - 2(0)^2 = 2(4) - 0 = 8$.',
    },
    {
      questionText: 'If a matrix $A$ has dimensions $3 \\times 4$ and matrix $B$ has dimensions $4 \\times 2$, what are the dimensions of product $AB$?',
      difficulty: 'easy',
      topic: topic || 'Linear Algebra',
      options: [
        { key: 'A', text: '$4 \\times 4$' },
        { key: 'B', text: '$3 \\times 2$' },
        { key: 'C', text: '$2 \\times 3$' },
        { key: 'D', text: 'Multiplication is undefined' },
      ],
      correctOption: 'B',
      explanation: 'Matrix multiplication of $(m \\times k)$ and $(k \\times n)$ produces an $(m \\times n)$ matrix. Here $3 \\times 4$ and $4 \\times 2$ produces $3 \\times 2$.',
    },
    // MEDIUM
    {
      questionText: 'Find the eigenvalues of the $2 \\times 2$ matrix $M = \\begin{pmatrix} 2 & 1 \\\\ 1 & 2 \\end{pmatrix}$.',
      difficulty: 'medium',
      topic: topic || 'Linear Algebra',
      options: [
        { key: 'A', text: '$\\lambda_1 = 3, \\lambda_2 = 1$' },
        { key: 'B', text: '$\\lambda_1 = 2, \\lambda_2 = 2$' },
        { key: 'C', text: '$\\lambda_1 = 4, \\lambda_2 = 0$' },
        { key: 'D', text: '$\\lambda_1 = -1, \\lambda_2 = 3$' },
      ],
      correctOption: 'A',
      explanation: 'Characteristic equation: $\\det(M - \\lambda I) = (2-\\lambda)^2 - 1 = \\lambda^2 - 4\\lambda + 3 = 0$. Factoring gives $(\\lambda - 3)(\\lambda - 1) = 0$, so $\\lambda = 3, 1$.',
    },
    {
      questionText: 'What is the limit $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$?',
      difficulty: 'medium',
      topic: topic || 'Calculus',
      options: [
        { key: 'A', text: '$0$' },
        { key: 'B', text: '$1$' },
        { key: 'C', text: '$3$' },
        { key: 'D', text: 'Does not exist' },
      ],
      correctOption: 'C',
      explanation: 'Using the fundamental limit $\\lim_{u \\to 0} \\frac{\\sin u}{u} = 1$: $\\lim_{x \\to 0} \\frac{3 \\sin(3x)}{3x} = 3 \\times 1 = 3$. Or using L’Hôpital’s rule: $\\lim_{x \\to 0} \\frac{3\\cos(3x)}{1} = 3$.',
    },
    // HARD
    {
      questionText: 'Compute the contour integral $\\oint_C \\frac{e^z}{(z - 1)(z - 2)} dz$, where $C$ is the circle $|z| = 1.5$ traversed counterclockwise.',
      difficulty: 'hard',
      topic: topic || 'Complex Analysis',
      options: [
        { key: 'A', text: '$2\\pi i e$' },
        { key: 'B', text: '$-2\\pi i e$' },
        { key: 'C', text: '$\\pi i (e^2 - e)$' },
        { key: 'D', text: '$0$' },
      ],
      correctOption: 'B',
      explanation: 'The curve $|z| = 1.5$ encloses only the pole at $z=1$ (since $|1| = 1 < 1.5$ and $|2| = 2 > 1.5$). By Cauchy’s Residue Theorem, the residue at $z=1$ is $\\lim_{z \\to 1} \\frac{e^z}{z - 2} = \\frac{e}{-1} = -e$. Integral is $2\\pi i \\times (-e) = -2\\pi i e$.',
    },
    {
      questionText: 'Solve the initial value problem $\\frac{dy}{dx} + 2y = e^{-x}$ with $y(0) = 3$. What is $y(1)$?',
      difficulty: 'hard',
      topic: topic || 'Differential Equations',
      options: [
        { key: 'A', text: '$e^{-1} + 2e^{-2}$' },
        { key: 'B', text: '$3e^{-2}$' },
        { key: 'C', text: '$e^{-1} - e^{-2}$' },
        { key: 'D', text: '$2e^{-1} + e^{-2}$' },
      ],
      correctOption: 'A',
      explanation: 'Integrating factor is $\\mu(x) = e^{\\int 2 dx} = e^{2x}$. Then $d/dx[y e^{2x}] = e^x$. Integrating gives $y e^{2x} = e^x + C \\implies y = e^{-x} + C e^{-2x}$. Given $y(0) = 1 + C = 3 \\implies C = 2$. Thus $y(x) = e^{-x} + 2e^{-2x}$. At $x=1$, $y(1) = e^{-1} + 2e^{-2}$.',
    },
  ];

  let filtered = sampleBank;
  if (difficulty && difficulty !== 'auto') {
    const matched = sampleBank.filter((q) => q.difficulty === difficulty);
    if (matched.length > 0) filtered = matched;
  }

  // Duplicate with slight variation if count > length
  const result = [];
  while (result.length < count) {
    for (const item of filtered) {
      if (result.length >= count) break;
      result.push({
        ...item,
        topic: topic || item.topic,
      });
    }
  }

  return {
    success: true,
    modelUsed: 'educational-math-bank',
    detectedTopic: topic || 'Higher Mathematics',
    totalExtracted: result.length,
    questions: result,
  };
};

module.exports = {
  extractTextFromPDF,
  getActiveApiKey,
  generateMCQsWithGemini,
  generateFallbackQuestions,
};
