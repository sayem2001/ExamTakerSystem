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
 * Robust caller across candidate Gemini models with backoff retry
 */
const callGeminiCandidateModels = async ({ genAI, modelCandidates, prompt }) => {
  let lastError = null;

  for (const modelName of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Clean any accidental markdown fence
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(text);

        return { parsed, modelUsed: modelName };
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} (attempt ${attempt + 1}) encountered: ${err.status || err.message}`);
        if (err.status === 503 || err.status === 429) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        } else {
          break; // Move to next model candidate
        }
      }
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to respond.');
};

/**
 * Parse & generate structured MCQs from PDF or pasted text using Gemini
 * Batches requests (12-15 questions per call) to reliably return 30+ questions
 */
const generateMCQsWithGemini = async ({
  pdfText,
  targetTopic = 'General Mathematics',
  targetDifficulty = 'auto', // 'easy' | 'medium' | 'hard' | 'auto'
  questionCount = 30,
  apiKey = '',
}) => {
  const activeKey = await getActiveApiKey(apiKey);
  const targetCount = Math.max(1, parseInt(questionCount, 10) || 30);

  if (!activeKey) {
    console.warn('⚠️ No Gemini API Key configured. Generating intelligent fallback questions for demo.');
    return generateFallbackQuestions(targetTopic, targetDifficulty, targetCount);
  }

  const genAI = new GoogleGenerativeAI(activeKey);

  // Preferred models in priority order for Google AI Studio
  const modelCandidates = [
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-pro-latest',
  ];

  // Slice text into manageable chunks if too large (max ~50,000 chars per prompt)
  const trimmedText = (pdfText || '').slice(0, 50000);

  // Calculate batches to reliably generate full question count without LLM truncation
  const batches = [];
  if (targetCount <= 12) {
    batches.push(targetCount);
  } else {
    let remaining = targetCount;
    while (remaining > 0) {
      const currentBatch = Math.min(15, remaining);
      batches.push(currentBatch);
      remaining -= currentBatch;
    }
  }

  console.log(`Generating ${targetCount} questions across ${batches.length} batch(es): [${batches.join(', ')}]`);

  let allQuestions = [];
  let detectedTopic = targetTopic;
  let modelUsed = 'gemini-flash-lite-latest';
  let lastError = null;

  for (let bIndex = 0; bIndex < batches.length; bIndex++) {
    const batchSize = batches[bIndex];
    const offset = allQuestions.length;

    const prompt = `
You are an expert mathematical exam creator and problem synthesizer.
Analyze the following document/source content extracted from an examination preparation resource.
Your task is to synthesize brand-new Multiple-Choice Questions (MCQs) according to the selected difficulty tier.

DOCUMENT CONTENT:
---
${trimmedText}
---

CRITICAL DIFFICULTY & MODIFICATION RULES (NEVER DIRECTLY COPY-PASTE):
Difficulty Level Selected: "${targetDifficulty.toUpperCase()}"

1. If "EASY":
   * Pick straightforward, fundamental questions from the document.
   * KEEP THE EXACT SAME QUESTION STRUCTURE AND 1-STEP MATHEMATICAL LOGIC.
   * CRITICAL: YOU MUST CHANGE ALL NUMBERS, VALUES, AND CONTEXT ENTITIES (e.g., if original says cost price 80 and 25% profit on SP, change to cost price 120 and 20% profit on SP; change names/goods like pens to books).
   * Do NOT increase question complexity. Recalculate options A-D (or A-E), set the new correctOption, and write a fresh step-by-step mathematical explanation showing the calculation with the new numbers.

2. If "MEDIUM":
   * Pick medium difficulty problem archetypes from the document.
   * CRITICAL: Modify the problem to be moderately harder than the source question.
   * Add an extra step or condition (e.g., combine a discount with a sales tax/VAT, successive discounts, or ask for the original cost price given a two-stage transaction).
   * Formulate 4 to 5 options with realistic distractors, determine the correctOption, and provide a clear step-by-step derivation.

3. If "HARD":
   * Transform the document's concepts into ADVANCED MULTI-TIER REAL-WORLD WORD PROBLEMS.
   * Incorporate multiple interacting entities or constraints (e.g. faulty weights/measurements combined with markups, spoilage/breakage of a fraction of goods, unequal quantity batches with different profit rates, or algebraic system with unknowns).
   * Formulate 4 to 5 options with plausible trap answers, determine the correctOption, and write a detailed, rigorous step-by-step mathematical proof/derivation.

4. Question Diversity & Batch Requirement:
   * This is Batch ${bIndex + 1} of ${batches.length}.
   * You MUST generate EXACTLY ${batchSize} questions in the "questions" array, numbered from ${offset + 1} to ${offset + batchSize}.
   * DO NOT STOP EARLY. Return all ${batchSize} fully solved questions.
   * Ensure questions in this batch explore varied problem archetypes across the document.
   * Use clean LaTeX for all formulas and mathematical expressions (e.g. $x^2 + 5x = 0$, $\\frac{a}{b}$, 15%).

OUTPUT FORMAT:
Respond with ONLY a valid raw JSON object (no markdown, no backticks):
{
  "detectedTopic": "${targetTopic || 'General Mathematics'}",
  "difficulty": "${targetDifficulty.toLowerCase()}",
  "transformationRule": "Rule applied for ${targetDifficulty.toUpperCase()}",
  "questions": [
    {
      "questionText": "...",
      "difficulty": "${targetDifficulty.toLowerCase()}",
      "topic": "${targetTopic}",
      "options": [
        {"key": "A", "text": "..."},
        {"key": "B", "text": "..."},
        {"key": "C", "text": "..."},
        {"key": "D", "text": "..."}
      ],
      "correctOption": "A",
      "explanation": "..."
    }
  ]
}
`;

    try {
      const { parsed, modelUsed: usedModel } = await callGeminiCandidateModels({
        genAI,
        modelCandidates,
        prompt,
      });

      modelUsed = usedModel;

      let batchQuestions = [];
      if (Array.isArray(parsed)) {
        if (parsed[0]?.questions && Array.isArray(parsed[0].questions)) {
          batchQuestions = parsed[0].questions;
          detectedTopic = parsed[0].detectedTopic || detectedTopic;
        } else {
          batchQuestions = parsed;
        }
      } else if (parsed && typeof parsed === 'object') {
        batchQuestions = parsed.questions || parsed.mcqs || [];
        detectedTopic = parsed.detectedTopic || detectedTopic;
      }

      if (Array.isArray(batchQuestions) && batchQuestions.length > 0) {
        allQuestions.push(...batchQuestions);
        console.log(`Batch ${bIndex + 1} produced ${batchQuestions.length} questions. Total so far: ${allQuestions.length}`);
      }

      // Short delay between batches to stay well within free tier RPS
      if (bIndex < batches.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (err) {
      console.error(`Batch ${bIndex + 1} failed:`, err.message);
      lastError = err;
    }
  }

  // Top-up batch if we fell short of the user's requested count by 2 or more questions
  if (allQuestions.length < targetCount && allQuestions.length > 0 && (targetCount - allQuestions.length) >= 2) {
    const deficit = targetCount - allQuestions.length;
    console.log(`Target was ${targetCount} but got ${allQuestions.length}. Running top-up batch for ${deficit} questions...`);
    try {
      const topUpPrompt = `
Generate EXACTLY ${deficit} MORE distinct ${targetDifficulty.toUpperCase()} math MCQs derived from the document archetypes.
Document content excerpt:
${trimmedText.slice(0, 20000)}

Follow the ${targetDifficulty.toUpperCase()} rules strictly. Number from ${allQuestions.length + 1} to ${targetCount}.
Return JSON:
{
  "questions": [
    {
      "questionText": "...",
      "difficulty": "${targetDifficulty.toLowerCase()}",
      "topic": "${detectedTopic}",
      "options": [
        {"key": "A", "text": "..."},
        {"key": "B", "text": "..."},
        {"key": "C", "text": "..."},
        {"key": "D", "text": "..."}
      ],
      "correctOption": "A",
      "explanation": "..."
    }
  ]
}
`;
      const { parsed } = await callGeminiCandidateModels({
        genAI,
        modelCandidates,
        prompt: topUpPrompt,
      });
      const topUpQs = parsed?.questions || parsed?.mcqs || (Array.isArray(parsed) ? parsed : []);
      if (Array.isArray(topUpQs)) {
        allQuestions.push(...topUpQs);
      }
    } catch (topUpErr) {
      console.warn('Top-up batch failed:', topUpErr.message);
    }
  }

  // Clean & validate questions
  const validQuestions = allQuestions.filter(
    (q) => q && q.questionText && Array.isArray(q.options) && q.options.length >= 2
  );

  if (validQuestions.length > 0) {
    return {
      success: true,
      modelUsed,
      detectedTopic: detectedTopic || targetTopic,
      totalExtracted: Math.min(validQuestions.length, targetCount),
      questions: validQuestions.slice(0, targetCount),
    };
  }

  console.error('All Gemini extraction attempts failed or produced 0 questions:', lastError?.message);
  return {
    success: false,
    error: lastError ? (lastError.message || `Error status ${lastError.status}`) : 'Gemini extraction failed',
    fallback: generateFallbackQuestions(targetTopic, targetDifficulty, targetCount),
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
