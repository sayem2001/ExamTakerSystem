const fs = require('fs');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const SystemSetting = require('../models/SystemSetting');
const { fetchGmatModificationIdeas } = require('./webSearchService');
const { extractStructuredQuestionsFromText } = require('./pdfQuestionParser');

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
 * Retrieve the active Gemini API key from DB or process.env (supports comma-separated backup keys)
 */
const getActiveApiKey = async (providedKey = '') => {
  if (providedKey && providedKey.trim().length > 10) {
    return providedKey.trim();
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
    const keys = process.env.GEMINI_API_KEY.split(',').map((k) => k.trim()).filter((k) => k.length > 10);
    if (keys.length > 0) return keys[0];
  }
  if (process.env.GEMINI_FALLBACK_KEY && process.env.GEMINI_FALLBACK_KEY.trim().length > 10) {
    return process.env.GEMINI_FALLBACK_KEY.trim();
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

  // 2. Sanitize unescaped LaTeX backslashes and control characters inside strings
  const trySanitizedParse = (rawStr) => {
    let sanitized = '';
    let inStr = false;
    for (let i = 0; i < rawStr.length; i++) {
      const c = rawStr[i];
      if (inStr) {
        if (c === '"') {
          let slashes = 0;
          let p = i - 1;
          while (p >= 0 && rawStr[p] === '\\') {
            slashes++;
            p--;
          }
          if (slashes % 2 === 0) inStr = false;
          sanitized += c;
        } else if (c === '\\') {
          const next = rawStr[i + 1];
          if (next === '"' || next === '\\' || next === '/') {
            sanitized += c;
          } else if (next === 'n' || next === 'r' || next === 't') {
            const lookahead = rawStr.slice(i + 1, i + 6);
            if (/^(text|time|tan|the|frac|term)/i.test(lookahead)) {
              sanitized += '\\\\';
            } else {
              sanitized += c;
            }
          } else if (next === 'b' || next === 'f') {
            const lookahead = rawStr.slice(i + 1, i + 6);
            if (/^(frac)/i.test(lookahead)) {
              sanitized += '\\\\';
            } else {
              sanitized += c;
            }
          } else if (next === 'u' && /^[0-9a-fA-F]{4}/.test(rawStr.slice(i + 2, i + 6))) {
            sanitized += c;
          } else {
            // Non-standard JSON escape (like \(, \), \%, \$, \i, \s)
            sanitized += '\\\\';
          }
        } else if (c === '\n') {
          sanitized += '\\n';
        } else if (c === '\r') {
          sanitized += '\\r';
        } else if (c === '\t') {
          sanitized += '\\t';
        } else {
          sanitized += c;
        }
      } else {
        if (c === '"') inStr = true;
        sanitized += c;
      }
    }
    // Clean trailing commas
    sanitized = sanitized.replace(/,\s*([\]\}])/g, '$1');
    try {
      const parsed = JSON.parse(sanitized);
      return Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
    } catch (e) {
      try {
        const doubleEsc = sanitized.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        const parsed = JSON.parse(doubleEsc);
        return Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
      } catch (e2) {
        return null;
      }
    }
  };

  const sanitizedArr = trySanitizedParse(text);
  if (sanitizedArr) {
    const valid = sanitizedArr.map(normalizeQuestion).filter(Boolean);
    if (valid.length > 0) return valid;
  }

  // 3. Balanced Brace Object-by-Object Extractor (Resilient against partial batch cutoffs or single-item errors)
  const extractedByBraces = [];
  let depth = 0;
  let startIdx = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escapeNext) {
        escapeNext = false;
      } else if (ch === '\\') {
        escapeNext = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const objStr = text.slice(startIdx, i + 1);
        startIdx = -1;
        const objParsed = trySanitizedParse(objStr);
        if (objParsed) {
          const norm = normalizeQuestion(objParsed);
          if (norm) extractedByBraces.push(norm);
        }
      }
    }
  }

  if (extractedByBraces.length > 0) return extractedByBraces;

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

  // Include text content if available (preserve full document for segmented processing)
  if (textContent && textContent.trim().length > 0) {
    const trimmed = textContent.slice(0, 150000);
    parts.push(`SOURCE DOCUMENT TEXT:\n---\n${trimmed}\n---\n`);
  }

  // Add the prompt instructions
  parts.push(promptText);

  return parts;
};

/**
 * =========================================================================
 * TASK 1: READ ENTIRE DOCUMENT & LIST ALL QUESTIONS PRESENT
 * Filters out theoretical text, explanations, and formulas, extracting ALL
 * raw questions across the entire document without truncation.
 * Combines algorithmic structure parsing with Gemini AI deep comprehension.
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
  const detectedTopic = targetTopic || 'Profit and Loss';

  console.log(`[Phase 1] Initiating full document extraction for topic: "${detectedTopic}"...`);

  // Step 1: Algorithmic extraction across all sections and answer key tables
  let algoQuestions = [];
  if (pdfText && pdfText.trim().length > 0) {
    algoQuestions = extractStructuredQuestionsFromText(pdfText, detectedTopic);
    console.log(
      `[Heuristic Parser] Extracted ${algoQuestions.length} structured past paper/practice questions with authentic answer keys directly from document text.`
    );
  }

  // Step 2: Gemini Segmented Deep Extraction
  // Divide document text into manageable segments (~18,000 chars each) so Gemini processes 100% of pages
  const CHUNK_SIZE = 18000;
  const textChunks = [];

  if (pdfText && pdfText.trim().length > 0) {
    const fullText = pdfText.trim();
    if (fullText.length <= 22000) {
      textChunks.push(fullText);
    } else {
      let currentPos = 0;
      while (currentPos < fullText.length) {
        let endPos = Math.min(currentPos + CHUNK_SIZE, fullText.length);
        if (endPos < fullText.length) {
          const nextNewline = fullText.indexOf('\n', endPos);
          if (nextNewline !== -1 && nextNewline - endPos < 2500) {
            endPos = nextNewline;
          }
        }
        textChunks.push(fullText.slice(currentPos, endPos));
        currentPos = endPos;
      }
    }
  }

  console.log(`[Gemini Engine] Partitioned document into ${textChunks.length} segments for complete, zero-truncation coverage.`);

  const allGeminiQuestions = [];
  let modelUsedForExtraction = 'gemini';

  for (let cIdx = 0; cIdx < textChunks.length; cIdx++) {
    const chunkText = textChunks[cIdx];
    console.log(`[Gemini Engine] Processing segment ${cIdx + 1}/${textChunks.length} (${chunkText.length} chars)...`);

    const chunkPrompt = `
You are an academic curriculum auditor.
Read this segment (Segment ${cIdx + 1} of ${textChunks.length}) of an examination booklet covering "${detectedTopic}".

CRITICAL TASK:
1. Filter out pure theoretical definitions, chapter introductions, formulas, and general remarks.
2. EXTRACT EVERY SINGLE QUESTION OR PRACTICE PROBLEM present in this text segment.
3. For each question:
   - "questionText": Full statement. Preserve any mathematical formulas using clean LaTeX ($...$).
   - "caseType": Categorize the specific problem case (e.g. "Markup & Markdown", "Successive Discounts", "Faulty Weights", "Determining Cost Price", "Multi-Item Mixture", "Word Problem").
   - "coreConcept": Concise 3-6 word summary of mathematical rule.
   - "options": Multiple choice options if present (e.g. [{"key": "A", "text": "100"}, ...]).
   - "correctOption": Correct letter if indicated in answer key or solution, or null.
   - "hasNumericalValues": boolean.

Output ONLY a JSON array of question objects:
[
  {
    "questionText": "...",
    "caseType": "...",
    "coreConcept": "...",
    "options": [{"key": "A", "text": "..."}, ...],
    "correctOption": "A",
    "hasNumericalValues": true
  }
]
`;

    try {
      const contents = [chunkText, chunkPrompt];
      const { rawText, modelUsed } = await callGeminiWithFailover({
        genAI,
        contents,
        temperature: 0.1,
        responseMimeType: 'application/json',
      });
      modelUsedForExtraction = modelUsed || modelUsedForExtraction;

      let parsedArr = [];
      try {
        parsedArr = JSON.parse(rawText);
      } catch (e) {
        parsedArr = convertResponseToQuestions(rawText, detectedTopic);
      }

      if (Array.isArray(parsedArr) && parsedArr.length > 0) {
        console.log(`[Gemini Engine] Segment ${cIdx + 1} yielded ${parsedArr.length} questions.`);
        allGeminiQuestions.push(...parsedArr);
      }
    } catch (chunkErr) {
      console.warn(`[Gemini Engine] Segment ${cIdx + 1} warning:`, chunkErr.message);
    }
  }

  // If text was empty but native PDF exists, run single native pass
  if (textChunks.length === 0 && pdfPath) {
    const singlePrompt = `Extract ALL questions and problems from this examination document. Output a JSON array of question objects.`;
    const contents = buildGeminiContentParts({ pdfPath, textContent: '', promptText: singlePrompt });
    try {
      const { rawText, modelUsed } = await callGeminiWithFailover({
        genAI,
        contents,
        temperature: 0.1,
        responseMimeType: 'application/json',
      });
      modelUsedForExtraction = modelUsed;
      const parsedArr = convertResponseToQuestions(rawText, detectedTopic);
      allGeminiQuestions.push(...parsedArr);
    } catch (e) {
      console.warn('[Gemini Engine] Fallback native PDF pass failed:', e.message);
    }
  }

  // Step 3: Combine and Deduplicate
  const combined = [...allGeminiQuestions, ...algoQuestions];
  const uniqueQuestions = deduplicateQuestions(combined);

  // Standardize questions and re-index
  const standardizedQuestions = uniqueQuestions.map((q, idx) => ({
    originalIndex: idx + 1,
    questionText: q.questionText || '',
    caseType: q.caseType || 'General Quantitative Problem',
    coreConcept: q.coreConcept || `${detectedTopic} Application`,
    options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : (
      q.options || [
        { key: 'A', text: 'Option A' },
        { key: 'B', text: 'Option B' },
        { key: 'C', text: 'Option C' },
        { key: 'D', text: 'Option D' },
      ]
    ),
    correctOption: q.correctOption || 'A',
    hasNumericalValues: q.hasNumericalValues !== false,
  })).filter((q) => q.questionText && q.questionText.trim().length > 10);

  const distinctCases = [...new Set(standardizedQuestions.map((q) => q.caseType).filter(Boolean))];

  console.log(
    `[Gemini Engine] Phase 1 Complete: Extracted ${standardizedQuestions.length} complete questions across ${distinctCases.length} distinct cases from document (${modelUsedForExtraction}).`
  );

  return {
    success: true,
    modelUsed: modelUsedForExtraction,
    detectedTopic,
    totalExtracted: standardizedQuestions.length,
    distinctCases,
    theoryFiltered: 'Filtered theoretical definitions, introductory remarks, formula cheat-sheets, and explanatory notes.',
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
1. TAKE THE GIVEN QUESTIONS AND PROBLEM ARCHETYPES AS BLUEPRINTS.
2. SIMPLY MODIFY THE QUESTION'S VALUES:
   - Change the numerical figures, prices, percentages, quantities, or dimensions (e.g. change $960 to $1,440, 20% to 25%, 900 grams to 850 grams).
   - Keep the entire conceptual structure, scenario narrative, entities, and question relationships 100% INTACT.
   - If generating multiple questions, formulate distinct numerical variations across the diverse problem archetypes.
3. Recalculate all 4 options (A, B, C, D) using the new substituted values.
4. Accurately identify the correctOption.
5. Provide a clear step-by-step mathematical explanation showing how the answer is calculated using the new values.
6. Tag each question with "modificationApplied": "Value modification: [briefly state values changed]".`,

    medium: `DIFFICULTY: MEDIUM (CONCEPT-PRESERVING SLIGHT MODIFICATIONS)
1. TAKE THE GIVEN QUESTIONS AND PROBLEM ARCHETYPES AS BLUEPRINTS.
2. THE ENTIRE QUESTION AND TOPIC MUST REMAIN INTACT, BUT APPLY SLIGHT MODIFICATIONS:
   a) Rephrase the question wording or context slightly.
   b) Invert / ask for a different variable to find solutions (e.g. if the original asks for Selling Price given Cost Price & Profit %, ask for the Cost Price given Selling Price; or ask for the Discount % given the Marked Price and final amount).
   c) Add extra contextual information while hiding or requiring derivation of some intermediate details (e.g. adding an overhead maintenance/repair cost before resale, or requiring computing the cost price first before applying a second condition).
   d) If generating multiple questions, formulate distinct concept-preserving problem variations across the diverse problem archetypes.
3. Formulate 4 realistic options (A, B, C, D) and identify the correctOption.
4. Provide a thorough, step-by-step mathematical derivation.
5. Tag each question with "modificationApplied": "Slight modification: [rephrased / inverted variable / added intermediate step]".`,

    hard: `DIFFICULTY: HARD (GMAT-LEVEL TRANSFORMATION WITH RESEARCHED COMPETITIVE EXAM IDEAS)
1. GENERATE GMAT-LEVEL DIFFICULTY QUESTIONS THAT REMAIN STRICTLY WITHIN THE TOPIC'S SCOPE ("${detectedTopic}").
2. READ THE ORIGINAL QUESTIONS AND MAKE SIGNIFICANT MODIFICATIONS TO PRODUCE GMAT-TYPE QUESTIONS:
   a) GMAT Problem Solving: Multi-step algebraic constraints, deceptive trap phrasing, percentage base confusion, and higher-order quantitative reasoning.
   b) GMAT Data Sufficiency format: Formulate questions with statements (1) and (2), asking whether statement (1) alone is sufficient, statement (2) alone is sufficient, both together are sufficient, each alone is sufficient, or neither is sufficient.
   c) Tricky Trap Distractors: Craft plausible distractor options that correspond to common GMAT traps (e.g., calculating percentage on cost instead of selling price, sign errors, off-by-one errors).
   d) If generating multiple questions, formulate distinct high-tier competitive problem variations across the diverse problem archetypes.
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

  // Resilient Micro-Batching Loop: Chunks of 10 to guarantee exact counts (30, 40, 50 questions) without token cutoff
  const BATCH_SIZE = 10;
  const totalBatchesNeeded = Math.ceil(targetCount / BATCH_SIZE);
  console.log(
    `[Gemini Engine] Planned execution: ${totalBatchesNeeded} micro-batches of up to ${BATCH_SIZE} questions to guarantee all ${targetCount} questions without token cutoff.`
  );

  let batchIndex = 0;
  const maxAttempts = Math.max(totalBatchesNeeded * 3, 10);

  while (allQuestions.length < targetCount && batchIndex < maxAttempts) {
    batchIndex++;
    const countNeeded = targetCount - allQuestions.length;
    const countToFetch = Math.min(BATCH_SIZE, countNeeded);

    console.log(
      `[Gemini Engine] Micro-Batch ${batchIndex}/${totalBatchesNeeded}: Requesting ${countToFetch} questions (Progress: ${allQuestions.length}/${targetCount})...`
    );

    const alreadyGeneratedSnippets = allQuestions.map((q) => q.questionText);
    try {
      const batchRes = await fetchBatch(countToFetch, allQuestions.length + 1, alreadyGeneratedSnippets);
      lastModelUsed = batchRes.modelUsed || lastModelUsed;

      if (batchRes.questions && batchRes.questions.length > 0) {
        allQuestions = deduplicateQuestions([...allQuestions, ...batchRes.questions]);
        console.log(`[Gemini Engine] Accumulated ${allQuestions.length}/${targetCount} unique questions.`);
      }
    } catch (batchErr) {
      console.warn(`[Gemini Engine] Micro-Batch ${batchIndex} encountered an error:`, batchErr.message);
    }
  }

  let finalQuestions = allQuestions;
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
