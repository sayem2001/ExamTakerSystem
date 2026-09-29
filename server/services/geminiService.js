const fs = require('fs');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const SystemSetting = require('../models/SystemSetting');
const { fetchGmatModificationIdeas } = require('./webSearchService');

/**
 * Extract raw text from an uploaded PDF file safely
 */
const extractTextFromPDF = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { text: '', numPages: 1, info: null };
    }
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return {
      text: pdfData.text || '',
      numPages: pdfData.numpages || 1,
      info: pdfData.info,
    };
  } catch (error) {
    console.warn('[PDF Parser] Warning reading PDF buffer text:', error.message);
    // Non-fatal, as Gemini can read PDF directly as inlineData
    return { text: '', numPages: 1, info: null };
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
    if (setting && setting.geminiApiKey && setting.geminiApiKey.trim().length > 10) {
      return setting.geminiApiKey.trim();
    }
  } catch (err) {
    // DB might be connecting
  }
  return '';
};

/**
 * Universal Question Converter:
 * Parses JSON, markdown blocks, LaTeX backslashes, or text-formatted questions,
 * converting into clean, standardized question objects.
 */
const convertResponseToQuestions = (rawText, defaultTopic = 'General Mathematics', defaultDifficulty = 'medium') => {
  if (!rawText || typeof rawText !== 'string') return [];

  let text = rawText
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/\s*```$/m, '')
    .trim();

  // Helper to standardize and validate question structure
  const normalizeQuestion = (q, idx = 0) => {
    if (!q || !q.questionText || typeof q.questionText !== 'string' || q.questionText.trim().length < 5) {
      return null;
    }

    let options = [];
    if (Array.isArray(q.options)) {
      options = q.options.map((opt, optIdx) => {
        const defaultKey = String.fromCharCode(65 + optIdx); // A, B, C, D, E
        if (typeof opt === 'string') {
          const match = opt.match(/^([A-E])[\).:\s]+(.*)$/i);
          return {
            key: match ? match[1].toUpperCase() : defaultKey,
            text: match ? match[2].trim() : opt.trim(),
          };
        }
        const key = (opt.key || defaultKey).toString().toUpperCase().trim();
        const optText = (opt.text || opt.value || opt.option || '')
          .toString()
          .replace(/^[A-E][\).:\s]+/i, '')
          .trim();
        return { key, text: optText };
      });
    }

    if (options.length < 2) return null;

    let correctOption = (q.correctOption || q.correctAnswer || q.answer || 'A')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/[^A-E]/g, '');
    if (!correctOption || correctOption.length === 0) correctOption = 'A';
    correctOption = correctOption[0];

    // Ensure correctOption exists in options
    const exists = options.some((o) => o.key === correctOption);
    if (!exists && options.length > 0) {
      correctOption = options[0].key;
    }

    return {
      questionText: q.questionText.trim(),
      difficulty: q.difficulty || defaultDifficulty,
      topic: q.topic || defaultTopic,
      options,
      correctOption,
      explanation: q.explanation ? q.explanation.trim() : 'Step-by-step mathematical derivation.',
      sourceQuestionIndex: q.sourceQuestionIndex || q.sourceIndex || null,
      caseType: q.caseType || q.archetype || 'General Case',
      modificationApplied: q.modificationApplied || '',
    };
  };

  // 1. Direct JSON parse
  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
    const valid = arr.map(normalizeQuestion).filter(Boolean);
    if (valid.length > 0) return valid;
  } catch (err) {}

  // 2. Sanitize unescaped LaTeX backslashes without corrupting JSON strings
  try {
    const sanitized = text.replace(/\\([a-zA-Z]+)/g, (match, word) => {
      if (/^(n|r|t|b|f)$/.test(word)) return match;
      return '\\\\' + word;
    });
    const parsed = JSON.parse(sanitized);
    const arr = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
    const valid = arr.map(normalizeQuestion).filter(Boolean);
    if (valid.length > 0) return valid;
  } catch (err) {}

  // 3. Escape all backslashes not followed by valid JSON escape character
  try {
    const fixed = text.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
    const parsed = JSON.parse(fixed);
    const arr = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
    const valid = arr.map(normalizeQuestion).filter(Boolean);
    if (valid.length > 0) return valid;
  } catch (err) {}

  // 3. Regex JSON block extraction
  const jsonBlockRegex = /\{[\s\r\n]*"questionText"[\s\S]*?"options"[\s\S]*?"correctOption"[\s\S]*?\}/g;
  let blockMatch;
  const jsonBlocks = [];
  while ((blockMatch = jsonBlockRegex.exec(text)) !== null) {
    try {
      const fixed = blockMatch[0]
        .replace(/\\/g, '\\\\')
        .replace(/\\\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\$1');
      const q = JSON.parse(fixed);
      const normalized = normalizeQuestion(q);
      if (normalized) jsonBlocks.push(normalized);
    } catch (e) {}
  }
  if (jsonBlocks.length > 0) return jsonBlocks;

  // 4. Fallback text parser (for formatted text outputs like: 1. Question... A) ... B) ... Answer: B)
  const textQuestions = [];
  const questionSplits = text.split(/(?:^|\n)(?=(?:Question\s*\d+[:.]?|\d+[\).]\s+))/i);
  for (const block of questionSplits) {
    if (!block.trim()) continue;
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    let qText = '';
    const options = [];
    let correctOpt = 'A';
    let explanation = '';

    for (const line of lines) {
      const optMatch = line.match(/^([A-E])[\).:\s]+(.*)$/i);
      const ansMatch = line.match(/^(?:Correct(?:\s*Option|\s*Answer)?|Answer)[:\s]+([A-E])/i);
      const expMatch = line.match(/^(?:Explanation|Solution)[:\s]+(.*)$/i);

      if (ansMatch) {
        correctOpt = ansMatch[1].toUpperCase();
      } else if (expMatch) {
        explanation = expMatch[1].trim();
      } else if (optMatch) {
        options.push({
          key: optMatch[1].toUpperCase(),
          text: optMatch[2].trim(),
        });
      } else if (options.length === 0) {
        qText += (qText ? ' ' : '') + line.replace(/^(?:Question\s*\d+[:.]?|\d+[\).]\s*)/i, '').trim();
      } else if (explanation) {
        explanation += ' ' + line;
      }
    }

    const normalized = normalizeQuestion({
      questionText: qText,
      options,
      correctOption: correctOpt,
      explanation,
      difficulty: defaultDifficulty,
      topic: defaultTopic,
    });
    if (normalized) textQuestions.push(normalized);
  }

  return textQuestions;
};

/**
 * Filter exact duplicate question texts
 */
const deduplicateQuestions = (questions) => {
  if (!Array.isArray(questions)) return [];
  const seen = new Set();
  const unique = [];

  for (const q of questions) {
    if (!q || !q.questionText) continue;
    const key = q.questionText.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(q);
    }
  }

  return unique;
};

/**
 * Model candidate cascade prioritizing reliable, high-speed models
 */
const MODEL_CANDIDATES = [
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-pro-latest',
];

/**
 * Call Gemini candidate models with automatic failover on 503 / 429
 */
const callGeminiWithFailover = async ({ genAI, contents, temperature = 0.25, responseMimeType = null }) => {
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      console.log(`[Gemini Engine] Trying model candidate: ${modelName}...`);
      const config = {
        temperature,
        maxOutputTokens: 8192,
      };
      if (responseMimeType) {
        config.responseMimeType = responseMimeType;
      }

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: config,
      });

      const result = await model.generateContent(contents);
      const response = await result.response;
      const rawText = response.text().trim();

      if (rawText.length > 20) {
        console.log(`[Gemini Engine] Model ${modelName} returned response (${rawText.length} chars).`);
        return { rawText, modelUsed: modelName };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini Engine] Model ${modelName} failed (${err.status || err.message}). Trying next candidate...`);
      // Brief sleep before next candidate if rate limit or overload
      if (err.status === 429 || err.status === 503) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to respond.');
};

/**
 * Build Gemini prompt content including native PDF inlineData if available
 */
const buildGeminiContentParts = ({ pdfPath, textContent, promptText }) => {
  const parts = [];

  // Attach native PDF document if under 20MB
  if (pdfPath && fs.existsSync(pdfPath)) {
    try {
      const stats = fs.statSync(pdfPath);
      if (stats.size > 0 && stats.size <= 20 * 1024 * 1024) {
        const base64Data = fs.readFileSync(pdfPath).toString('base64');
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf',
          },
        });
        console.log(`[Gemini Engine] Attached native PDF document (${(stats.size / 1024).toFixed(1)} KB) directly to Gemini.`);
      }
    } catch (err) {
      console.warn('[Gemini Engine] Error reading PDF for inline attachment:', err.message);
    }
  }

  // Include text content if available
  if (textContent && textContent.trim().length > 0) {
    const trimmed = textContent.slice(0, 70000);
    parts.push(`SOURCE DOCUMENT TEXT:\n---\n${trimmed}\n---\n`);
  }

  // Add the prompt instructions
  parts.push(promptText);

  return parts;
};

/**
 * =========================================================================
 * TASK 1: READ ENTIRE DOCUMENT & LIST ALL QUESTIONS PRESENT
 * Filters out theoretical text, explanations, and formulas, extracting all
 * raw questions along with their problem cases/archetypes.
 * =========================================================================
 */
const extractAllQuestionsFromDocument = async ({
  pdfPath = null,
  pdfText = '',
  targetTopic = '',
  apiKey = '',
}) => {
  const activeKey = await getActiveApiKey(apiKey);
  if (!activeKey) {
    throw new Error('Gemini API key is not configured. Please add your Gemini API Key in Admin Settings.');
  }

  const genAI = new GoogleGenerativeAI(activeKey);

  const promptText = `
You are a master academic curriculum auditor.
Read the ENTIRE attached document from start to finish.

CRITICAL TASK:
1. The document contains theoretical explanations, formula sheets, introductory notes, definitions, syllabus overviews, and actual practice problems/questions.
2. Filter out and IGNORE all theoretical content, chapter overviews, definitions, formula sheets, and explanatory remarks.
3. EXTRACT AND LIST EVERY SINGLE QUESTION OR PROBLEM present anywhere in the document.
4. For each extracted question:
   - "originalIndex": 1-based sequential integer (1, 2, 3...)
   - "questionText": The exact question statement. Preserve any mathematical formulas using clean LaTeX (e.g. $x^2 + 5x = 0$, $\\frac{a}{b}$, 25%).
   - "caseType": Categorize the specific problem case/archetype (e.g., "Direct Value Calculation", "Successive Discounts", "Faulty Weights / Dishonest Dealer", "Combined Multi-Item Transaction", "Markup & Discount Interaction", "Variable Price Shift", "Ratio/Mixture Problem", etc.).
   - "coreConcept": Concise 3-6 word summary of the math concept tested.
   - "options": Array of original multiple-choice options if present in document, e.g. [{"key": "A", "text": "100"}, ...], or empty array [] if open-ended.
   - "correctOption": The correct letter if indicated in the document or answer key (e.g. "A", "B", "C", "D"), or null.
   - "hasNumericalValues": boolean, true if the question contains numbers/figures that can be varied.

5. Identify the primary mathematical topic of the document (e.g., "Profit and Loss", "Time and Work", "Calculus").
6. Provide a complete list of all distinct problem cases identified across the questions.

Output ONLY a JSON object matching this schema:
{
  "detectedTopic": "Profit and Loss",
  "totalExtracted": 12,
  "distinctCases": ["Case 1 Name", "Case 2 Name", ...],
  "theoryFiltered": "Summary of theoretical sections and formula tables filtered out",
  "questions": [
    {
      "originalIndex": 1,
      "questionText": "...",
      "caseType": "...",
      "coreConcept": "...",
      "options": [{"key": "A", "text": "..."}],
      "correctOption": "B",
      "hasNumericalValues": true
    }
  ]
}
`;

  const contents = buildGeminiContentParts({
    pdfPath,
    textContent: pdfText,
    promptText,
  });

  console.log('[Gemini Engine] Phase 1: Scanning entire document to extract all questions and filter theoretical content...');

  const { rawText, modelUsed } = await callGeminiWithFailover({
    genAI,
    contents,
    temperature: 0.1,
    responseMimeType: 'application/json',
  });

  let parsedData = null;
  try {
    parsedData = JSON.parse(rawText);
  } catch (e) {
    try {
      const fixed = rawText
        .replace(/\\/g, '\\\\')
        .replace(/\\\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\$1');
      parsedData = JSON.parse(fixed);
    } catch (e2) {
      console.warn('[Gemini Engine] JSON parse fallback on document extraction:', e2.message);
    }
  }

  const rawQuestions = parsedData?.questions || [];
  const detectedTopic = parsedData?.detectedTopic || targetTopic || 'General Mathematics';
  const distinctCases = Array.isArray(parsedData?.distinctCases) && parsedData.distinctCases.length > 0
    ? parsedData.distinctCases
    : [...new Set(rawQuestions.map((q) => q.caseType).filter(Boolean))];

  // Standardize questions
  const standardizedQuestions = rawQuestions.map((q, idx) => ({
    originalIndex: q.originalIndex || idx + 1,
    questionText: q.questionText || '',
    caseType: q.caseType || 'General Case',
    coreConcept: q.coreConcept || 'Mathematical problem',
    options: Array.isArray(q.options) ? q.options : [],
    correctOption: q.correctOption || null,
    hasNumericalValues: q.hasNumericalValues !== false,
  })).filter((q) => q.questionText && q.questionText.trim().length > 5);

  console.log(
    `[Gemini Engine] Phase 1 Complete: Extracted ${standardizedQuestions.length} questions across ${distinctCases.length} distinct cases from document (${modelUsed}).`
  );

  return {
    success: true,
    modelUsed,
    detectedTopic,
    totalExtracted: standardizedQuestions.length,
    distinctCases,
    theoryFiltered: parsedData?.theoryFiltered || 'Filtered theoretical definitions, introductory remarks, and formula cheat-sheets.',
    questions: standardizedQuestions,
  };
};

/**
 * Helper to ensure a diverse distribution of questions across detected cases
 */
const selectDiverseSourceQuestions = (extractedQuestions, targetCount) => {
  if (!extractedQuestions || extractedQuestions.length === 0) return [];
  if (extractedQuestions.length <= targetCount) return extractedQuestions;

  // Group by caseType
  const caseMap = new Map();
  extractedQuestions.forEach((q) => {
    const cType = q.caseType || 'General Case';
    if (!caseMap.has(cType)) caseMap.set(cType, []);
    caseMap.get(cType).push(q);
  });

  const selected = [];
  const caseKeys = Array.from(caseMap.keys());
  let caseIdx = 0;

  // Round-robin selection across distinct cases to guarantee maximum diversity
  while (selected.length < targetCount && caseKeys.length > 0) {
    const currentKey = caseKeys[caseIdx % caseKeys.length];
    const pool = caseMap.get(currentKey);

    if (pool && pool.length > 0) {
      selected.push(pool.shift());
    }

    if (pool.length === 0) {
      caseKeys.splice(caseIdx % caseKeys.length, 1);
    } else {
      caseIdx++;
    }
  }

  // If still need more, take remainder from original array
  if (selected.length < targetCount) {
    for (const q of extractedQuestions) {
      if (!selected.includes(q)) {
        selected.push(q);
        if (selected.length === targetCount) break;
      }
    }
  }

  return selected;
};

/**
 * =========================================================================
 * TASK 2: GENERATE SELECTED NUMBER OF QUESTIONS WITH DIVERSITY & DIFFICULTY
 * - Easy: Modify question's numerical values only; preserve structure & context.
 * - Medium: Entire question intact with slight modifications (rephrasing,
 *   different variables, or adding contextual info while hiding details).
 * - Hard: GMAT-level difficulty within topic scope. Significant modifications
 *   into GMAT Problem Solving & Data Sufficiency. Searches GMAT forums/resources
 *   for real-world modification patterns and tricky traps.
 * =========================================================================
 */
const generateMCQsFromExtracted = async ({
  extractedQuestions = [],
  targetTopic = 'General Mathematics',
  targetDifficulty = 'medium', // 'easy' | 'medium' | 'hard'
  questionCount = 30,
  apiKey = '',
  pdfPath = null,
  pdfText = '',
}) => {
  const activeKey = await getActiveApiKey(apiKey);
  const targetCount = Math.max(1, parseInt(questionCount, 10) || 30);
  const diffNormalized = (targetDifficulty || 'medium').toLowerCase();

  if (!activeKey) {
    throw new Error('Gemini API key is not configured. Please add your Gemini API Key in Admin Settings.');
  }

  // If extracted questions are not supplied, extract them first
  let sourceQuestions = extractedQuestions;
  let detectedTopic = targetTopic;
  let distinctCases = [];

  if (!sourceQuestions || sourceQuestions.length === 0) {
    console.log('[Gemini Engine] No pre-extracted questions provided; running Phase 1 extraction first...');
    const extractRes = await extractAllQuestionsFromDocument({
      pdfPath,
      pdfText,
      targetTopic,
      apiKey: activeKey,
    });
    sourceQuestions = extractRes.questions;
    detectedTopic = extractRes.detectedTopic || targetTopic;
    distinctCases = extractRes.distinctCases || [];
  } else {
    distinctCases = [...new Set(sourceQuestions.map((q) => q.caseType).filter(Boolean))];
  }

  if (!sourceQuestions || sourceQuestions.length === 0) {
    throw new Error('No questions could be extracted from the document. Please ensure the document contains examination problems.');
  }

  const genAI = new GoogleGenerativeAI(activeKey);

  // Select diverse source questions across all distinct problem cases
  const diverseSubset = selectDiverseSourceQuestions(sourceQuestions, targetCount);

  // If Hard difficulty, initiate live web research into GMAT forums & competitive exam archives
  let gmatResearchContext = '';
  let webSearchData = null;
  if (diffNormalized === 'hard') {
    try {
      webSearchData = await fetchGmatModificationIdeas(detectedTopic);
      gmatResearchContext = webSearchData.formattedResearchNotes;
    } catch (searchErr) {
      console.warn('[Gemini Engine] Web search for GMAT patterns failed, utilizing curated blueprints:', searchErr.message);
    }
  }

  // Rules based on exact user specification
  const difficultyRules = {
    easy: `DIFFICULTY: EASY (VALUE MODIFICATION ONLY)
1. TAKE THE GIVEN QUESTIONS DIRECTLY FROM THE EXTRACTED SOURCE LIST.
2. SIMPLY MODIFY THE QUESTION'S VALUES:
   - Change the numerical figures, prices, percentages, quantities, or dimensions (e.g. change $960 to $1,440, 20% to 25%, 900 grams to 850 grams).
   - Keep the entire conceptual structure, scenario narrative, entities, and question relationships 100% INTACT.
3. Recalculate all 4 options (A, B, C, D) using the new substituted values.
4. Accurately identify the correctOption.
5. Provide a clear step-by-step mathematical explanation showing how the answer is calculated using the new values.
6. Tag each question with "modificationApplied": "Value modification: [briefly state values changed]".`,

    medium: `DIFFICULTY: MEDIUM (CONCEPT-PRESERVING SLIGHT MODIFICATIONS)
1. TAKE THE GIVEN QUESTIONS FROM THE EXTRACTED SOURCE LIST.
2. THE ENTIRE QUESTION AND TOPIC MUST REMAIN INTACT, BUT APPLY SLIGHT MODIFICATIONS:
   a) Rephrase the question wording or context slightly.
   b) Invert / ask for a different variable to find solutions (e.g. if the original asks for Selling Price given Cost Price & Profit %, ask for the Cost Price given Selling Price; or ask for the Discount % given the Marked Price and final amount).
   c) Add extra contextual information while hiding or requiring derivation of some intermediate details (e.g. adding an overhead maintenance/repair cost before resale, or requiring computing the cost price first before applying a second condition).
3. Formulate 4 realistic options (A, B, C, D) and identify the correctOption.
4. Provide a thorough, step-by-step mathematical derivation.
5. Tag each question with "modificationApplied": "Slight modification: [rephrased / inverted variable / added intermediate step]".`,

    hard: `DIFFICULTY: HARD (GMAT-LEVEL TRANSFORMATION WITH RESEARCHED COMPETITIVE EXAM IDEAS)
1. GENERATE GMAT-LEVEL DIFFICULTY QUESTIONS THAT REMAIN STRICTLY WITHIN THE TOPIC'S SCOPE ("${detectedTopic}").
2. READ THE ORIGINAL QUESTIONS AND MAKE SIGNIFICANT MODIFICATIONS TO PRODUCE GMAT-TYPE QUESTIONS:
   a) GMAT Problem Solving: Multi-step algebraic constraints, deceptive trap phrasing, percentage base confusion, and higher-order quantitative reasoning.
   b) GMAT Data Sufficiency format: Formulate questions with statements (1) and (2), asking whether statement (1) alone is sufficient, statement (2) alone is sufficient, both together are sufficient, each alone is sufficient, or neither is sufficient.
   c) Tricky Trap Distractors: Craft plausible distractor options that correspond to common GMAT traps (e.g., calculating percentage on cost instead of selling price, sign errors, off-by-one errors).
3. APPLY THE IDEAS GATHERED FROM WEBSITES, FORUMS (GMAT CLUB, BEAT THE GMAT), AND COMPETITIVE EXAM ARCHIVES:
${gmatResearchContext || 'Apply GMAT 700-level multi-constraint modeling and Data Sufficiency formats.'}
4. Options can be 4 or 5 choices (A-D or A-E standard GMAT format).
5. Accurately identify the correctOption.
6. Provide an in-depth, rigorous GMAT-style solution and logical proof.
7. Tag each question with "modificationApplied": "GMAT-level transformation: [GMAT Problem Solving / Data Sufficiency archetype with trap structure]".`,
  };

  const selectedRule = difficultyRules[diffNormalized] || difficultyRules.medium;
  const temp = diffNormalized === 'easy' ? 0.15 : diffNormalized === 'medium' ? 0.3 : 0.45;

  // Build the list of source questions to feed into the prompt
  const sourceQuestionsText = diverseSubset
    .map((q, idx) => `[Source Question ${idx + 1}] (Case: ${q.caseType})\n${q.questionText}`)
    .join('\n\n');

  const fetchBatch = async (countToFetch, startIdx = 1, excludeStatements = []) => {
    let exclusionText = '';
    if (excludeStatements.length > 0) {
      exclusionText = `\nDO NOT duplicate these already generated statements:\n- ${excludeStatements.slice(0, 5).join('\n- ')}\n`;
    }

    const promptText = `
You are an elite competitive examination architect specializing in IBA, CAT, and GMAT assessment design.
You have been provided with an extracted list of source questions from an examination document covering "${detectedTopic}".

DIVERSITY REQUIREMENT:
The questions provided below represent diverse problem cases (${distinctCases.join(', ')}).
Ensure the generated questions cover a balanced, diverse range of these question types or cases!

SPECIFIC DIFFICULTY CONDITION:
${selectedRule}
${exclusionText}

QUANTITY MANDATE:
- Generate EXACTLY ${countToFetch} questions (numbered ${startIdx} to ${startIdx + countToFetch - 1}).
- Use clean LaTeX for all mathematical expressions (e.g. $x^2 + 5x = 0$, $\\frac{a}{b}$, 25%).

SOURCE QUESTIONS FROM DOCUMENT (DIVERSE CASES):
---
${sourceQuestionsText}
---

Output the entire response as a valid JSON array of question objects:
[
  {
    "questionText": "Question statement with clean LaTeX...",
    "difficulty": "${diffNormalized}",
    "topic": "${detectedTopic}",
    "sourceQuestionIndex": 1,
    "caseType": "Case name from source",
    "modificationApplied": "Brief note on modification applied",
    "options": [
      {"key": "A", "text": "Option A"},
      {"key": "B", "text": "Option B"},
      {"key": "C", "text": "Option C"},
      {"key": "D", "text": "Option D"}
    ],
    "correctOption": "A",
    "explanation": "Step-by-step mathematical explanation..."
  }
]
`;

    const contents = [promptText];

    const { rawText, modelUsed } = await callGeminiWithFailover({
      genAI,
      contents,
      temperature: temp,
      responseMimeType: 'application/json',
    });

    const parsed = convertResponseToQuestions(rawText, detectedTopic, diffNormalized);
    if (parsed.length === 0) {
      console.warn('[Gemini Engine DEBUG] Raw response failed to parse into questions (length: ' + rawText.length + '):');
      console.warn(rawText.slice(0, 800));
    }
    return { questions: parsed, modelUsed };
  };

  console.log(
    `[Gemini Engine] Generating ${targetCount} ${diffNormalized.toUpperCase()} questions for "${detectedTopic}" with diverse case coverage...`
  );

  let allQuestions = [];
  let lastModelUsed = 'gemini';

  // Batching for large target counts to prevent token cutoff
  if (targetCount > 15) {
    const batch1Count = Math.ceil(targetCount / 2);
    const batch2Count = targetCount - batch1Count;

    console.log(`[Gemini Engine] Batch 1/2: Generating ${batch1Count} questions...`);
    const batch1 = await fetchBatch(batch1Count, 1);
    lastModelUsed = batch1.modelUsed;
    allQuestions.push(...batch1.questions);

    const alreadyGenerated = allQuestions.map((q) => q.questionText);
    console.log(`[Gemini Engine] Batch 2/2: Generating ${batch2Count} questions...`);
    const batch2 = await fetchBatch(batch2Count, batch1Count + 1, alreadyGenerated);
    lastModelUsed = batch2.modelUsed || lastModelUsed;
    allQuestions.push(...batch2.questions);
  } else {
    const single = await fetchBatch(targetCount, 1);
    lastModelUsed = single.modelUsed;
    allQuestions.push(...single.questions);
  }

  let finalQuestions = deduplicateQuestions(allQuestions);

  // Catch-up if slightly short
  if (finalQuestions.length < targetCount && finalQuestions.length > 0) {
    const missing = targetCount - finalQuestions.length;
    console.log(`[Gemini Engine] Collected ${finalQuestions.length}/${targetCount} questions. Fetching ${missing} additional questions...`);
    try {
      const catchUp = await fetchBatch(
        missing,
        finalQuestions.length + 1,
        finalQuestions.map((q) => q.questionText)
      );
      if (catchUp.questions.length > 0) {
        finalQuestions = deduplicateQuestions([...finalQuestions, ...catchUp.questions]);
      }
    } catch (catchUpErr) {
      console.warn('[Gemini Engine] Catch-up call skipped:', catchUpErr.message);
    }
  }

  if (finalQuestions.length > targetCount) {
    finalQuestions = finalQuestions.slice(0, targetCount);
  }

  console.log(`[Gemini Engine] Successfully generated ${finalQuestions.length} questions using ${lastModelUsed}.`);

  return {
    success: true,
    modelUsed: lastModelUsed,
    detectedTopic,
    totalExtracted: finalQuestions.length,
    questions: finalQuestions,
    distinctCasesCovered: distinctCases,
    searchGrounded: diffNormalized === 'hard',
    webSearchInsights: webSearchData ? {
      liveSnippetsCount: webSearchData.liveSnippetsFound,
      queriesUsed: webSearchData.queriesUsed,
      sampleSnippets: webSearchData.liveSnippets.slice(0, 3),
    } : null,
  };
};

/**
 * Legacy/Direct Wrapper to support one-shot generation from PDF or pasted text
 */
const generateMCQsWithGemini = async ({
  pdfPath = null,
  pdfText = '',
  targetTopic = 'General Mathematics',
  targetDifficulty = 'medium',
  questionCount = 30,
  apiKey = '',
}) => {
  // Step 1: Extract all questions from the document
  const extractResult = await extractAllQuestionsFromDocument({
    pdfPath,
    pdfText,
    targetTopic,
    apiKey,
  });

  // Step 2: Generate configured number of diverse questions based on difficulty
  const generateResult = await generateMCQsFromExtracted({
    extractedQuestions: extractResult.questions,
    targetTopic: extractResult.detectedTopic || targetTopic,
    targetDifficulty,
    questionCount,
    apiKey,
    pdfPath,
    pdfText,
  });

  return {
    ...generateResult,
    extractedSourceQuestions: extractResult.questions,
    distinctCases: extractResult.distinctCases,
  };
};

module.exports = {
  extractTextFromPDF,
  getActiveApiKey,
  convertResponseToQuestions,
  extractAllQuestionsFromDocument,
  generateMCQsFromExtracted,
  generateMCQsWithGemini,
};
