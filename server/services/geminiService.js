const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const SystemSetting = require('../models/SystemSetting');
const { fetchGmatModificationIdeas, fetchSubjectModificationIdeas } = require('./webSearchService');
const { extractStructuredQuestionsFromText } = require('./pdfQuestionParser');

/**
 * Extract raw text from an uploaded PDF or Word DOCX document safely
 */
const extractTextFromPDF = async (filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { text: '', numPages: 1, info: null, fileType: 'none' };
    }

    const ext = path.extname(filePath).toLowerCase();

    // Word Document (.docx, .doc)
    if (ext === '.docx' || ext === '.doc') {
      console.log(`[Document Parser] Extracting text from Word document: ${path.basename(filePath)}`);
      const result = await mammoth.extractRawText({ path: filePath });
      const docxText = result.value || '';
      console.log(`[Document Parser] Extracted ${docxText.length} characters from DOCX.`);
      return {
        text: docxText,
        numPages: Math.max(1, Math.ceil(docxText.length / 2500)),
        info: { title: path.basename(filePath) },
        fileType: 'docx',
      };
    }

    // PDF Document
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return {
      text: pdfData.text || '',
      numPages: pdfData.numpages || 1,
      info: pdfData.info,
      fileType: 'pdf',
    };
  } catch (error) {
    console.warn('[Document Parser] Warning reading document buffer text:', error.message);
    return { text: '', numPages: 1, info: null, fileType: 'error' };
  }
};

/**
 * Retrieve the active Gemini API key.
 * Only administrators are permitted to fall back to the system's process.env.GEMINI_API_KEY.
 * Regular users must supply their own Gemini API key.
 */
const getActiveApiKey = async (providedKey = '', allowSystemFallback = true) => {
  if (providedKey && providedKey.trim().length > 10) {
    return providedKey.trim();
  }
  // If user is not authorized to use the system key, do not fall back
  if (!allowSystemFallback) {
    return '';
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

  // Helper to remove scratchpad monologue and fix LaTeX escaping
  const cleanMathAndExplanation = (str) => {
    if (!str || typeof str !== 'string') return '';
    let s = str;

    // 1. Remove LLM chain-of-thought scratchpad leakage
    const scratchpadPatterns = [
      /\s*(?:Wait,?\s+)?let'?s\s+(?:recalculate|re-verify|check|adjust|solve|use|correct|ensure|rewrite|make|see|analyze\s+carefully).*$/is,
      /\s*\?\s*No,?\s+let'?s.*$/is,
      /\s*Regardless,?\s+the\s+rigorous\s+calculation.*$/is,
    ];
    for (const pat of scratchpadPatterns) {
      const m = s.search(pat);
      if (m !== -1 && m > 30) {
        const before = s.slice(0, m).trim();
        const conclusionMatch = s.match(/(?:Therefore|Thus|Hence)[^.!?\n]+(?:Option\s+[A-E]|is\s+correct|\$[0-9.]+|[0-9.]+\%)[^.!?\n]*[.!?]/i);
        s = before + (conclusionMatch ? ' ' + conclusionMatch[0] : '');
      }
    }

    // 2. Unescape literal newlines and control characters
    s = s
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n');

    // 3. Collapse rogue \f or \t sequences before standard macros
    s = s.replace(/(?:\\[fF]|\u000c|\f)+(\s*\\?frac\b)/gi, '\\frac');
    s = s.replace(/(?:\\[tT]|\t)+(\s*\\?times\b)/gi, ' \\times ');
    s = s.replace(/(?:\\[tT]|\t)+(\s*\\?text\b)/gi, '\\text');
    s = s.replace(/(?:\\[rR]|\r)+(\s*\\?rightarrow\b)/gi, '\\rightarrow');
    s = s.replace(/(?:\\[tT]|\t)+(Total\s+unrestricted|Restricted\s*\(together\))/gi, '\\text{$1}');

    // 4. Remove isolated rogue backslashes before letters that are not valid macros
    s = s.replace(/\\[fF](?![a-zA-Z])/g, '');
    s = s.replace(/\\[tT](?![a-zA-Z])/g, '');
    s = s.replace(/\\[rR](?![a-zA-Z])/g, '');

    // 5. Fix missing leading characters on common macros
    s = s
      .replace(/\\rac(?=[{\s\d])/g, '\\frac')
      .replace(/\\ext(?=[{\s])/g, '\\text')
      .replace(/\\imes(?=[{\s\d])/g, '\\times')
      .replace(/\\ightarrow\b/g, '\\rightarrow');

    // 6. Fix double-typed numbers and percentages (e.g. 40%40% -> 40%, 1.51.5 -> 1.5)
    s = s.replace(/\b(\d+(?:\.\d+)?%?)\1\b/g, '$1');

    // 7. Clean rogue $ attached to percentage and clean backslashes before $
    s = s.replace(/(\d+(?:\.\d+)?%)\$/g, '$1'); // e.g. "20%$" -> "20%"
    s = s.replace(/\$(\d+(?:\.\d+)?%)(?!\w)/g, '$1'); // e.g. "$20%" -> "20%"
    s = s.replace(/\\(\$)/g, '$');
    s = s.replace(/[\f\u000c]/g, '');

    // 8. Fix letter-spacing caused by ASCII control characters
    s = s.replace(/([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])(?:\s+([a-zA-Z]))*/g, (match) => {
      const condensed = match.replace(/\s+/g, '');
      if (condensed.length >= 4 && !/^[A-Z]+$/.test(condensed) && !/\b[A-E]\b/.test(match)) {
        return condensed;
      }
      return match;
    });

    return s.trim();
  };

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
            text: cleanMathAndExplanation(match ? match[2].trim() : opt.trim()),
          };
        }
        const key = (opt.key || defaultKey).toString().toUpperCase().trim();
        const optText = (opt.text || opt.value || opt.option || '')
          .toString()
          .replace(/^[A-E][\).:\s]+/i, '')
          .trim();
        return { key, text: cleanMathAndExplanation(optText) };
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
      questionText: cleanMathAndExplanation(q.questionText),
      difficulty: q.difficulty || defaultDifficulty,
      topic: q.topic || defaultTopic,
      options,
      correctOption,
      explanation: cleanMathAndExplanation(q.explanation ? q.explanation.trim() : 'Step-by-step mathematical derivation.'),
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
      return Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || (parsed.questionText ? parsed : null));
    } catch (e) {
      try {
        const doubleEsc = sanitized.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        const parsed = JSON.parse(doubleEsc);
        return Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || (parsed.questionText ? parsed : null));
      } catch (e2) {
        return null;
      }
    }
  };

  const sanitizedResult = trySanitizedParse(text);
  if (sanitizedResult) {
    const list = Array.isArray(sanitizedResult) ? sanitizedResult : [sanitizedResult];
    const valid = list.map(normalizeQuestion).filter(Boolean);
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
 * Filter duplicate and near-duplicate question scenarios
 */
const deduplicateQuestions = (questions) => {
  if (!Array.isArray(questions)) return [];
  const seen = new Set();
  const seenStems = new Set();
  const unique = [];

  for (const q of questions) {
    if (!q || !q.questionText) continue;
    const key = q.questionText.toLowerCase().replace(/\s+/g, ' ').trim();

    // Abstract common merchant synonyms and specific numbers to detect identical problem scenarios
    const stem = key
      .replace(/\b(?:a\s+)?(?:merchant|trader|vendor|dealer|shopkeeper|retailer|store owner|wholesaler|company|manufacturer)\b/gi, 'person')
      .replace(/\b(?:consignment of goods|pair of shoes|batch of tablets|item|article|product|merchandise|goods)\b/gi, 'item')
      .replace(/[\d,.]+/g, '#')
      .replace(/[^a-z#]/g, '');

    if (!seen.has(key) && !seenStems.has(stem)) {
      seen.add(key);
      seenStems.add(stem);
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
      const ext = path.extname(pdfPath).toLowerCase();
      const stats = fs.statSync(pdfPath);
      if (ext === '.pdf' && stats.size > 0 && stats.size <= 20 * 1024 * 1024) {
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
  subjectType = 'math',
  apiKey = '',
  allowSystemFallback = true,
}) => {
  const activeKey = await getActiveApiKey(apiKey, allowSystemFallback);
  if (!activeKey) {
    if (!allowSystemFallback) {
      throw new Error('Personal Gemini API key required. Regular users must configure their own Google Gemini API key in Settings (get a free key at https://aistudio.google.com/app/apikey). Only administrators can use the system Gemini API.');
    }
    throw new Error('Gemini API key is not configured. Please add your Gemini API Key in Admin Settings.');
  }

  const genAI = new GoogleGenerativeAI(activeKey);

  const normalizedSubjectType = ['math', 'english', 'universal'].includes((subjectType || '').toLowerCase())
    ? (subjectType || '').toLowerCase()
    : 'math';

  let defaultFallbackTopic = 'Profit and Loss';
  if (normalizedSubjectType === 'english') defaultFallbackTopic = 'English Language & Verbal Reasoning';
  if (normalizedSubjectType === 'universal') defaultFallbackTopic = 'General Studies & Academic Topics';
  const detectedTopic = targetTopic || defaultFallbackTopic;

  let documentText = (pdfText || '').trim();
  if (!documentText && pdfPath) {
    try {
      const pdfRes = await extractTextFromPDF(pdfPath);
      if (pdfRes && pdfRes.text) {
        documentText = pdfRes.text.trim();
        console.log(`[Gemini Engine] Extracted ${documentText.length} characters from PDF file.`);
      }
    } catch (pdfErr) {
      console.warn('[Gemini Engine] Could not extract text from PDF file directly:', pdfErr.message);
    }
  }

  console.log(`[Phase 1] Initiating full document extraction for [${normalizedSubjectType.toUpperCase()}] topic: "${detectedTopic}"...`);

  // Step 1: Algorithmic extraction across all sections and answer key tables
  let algoQuestions = [];
  if (documentText && documentText.length > 0) {
    algoQuestions = extractStructuredQuestionsFromText(documentText, detectedTopic);
    console.log(
      `[Heuristic Parser] Extracted ${algoQuestions.length} structured past paper/practice questions with authentic answer keys directly from document text.`
    );
  }

  // Step 2: Gemini Segmented Deep Extraction
  // Divide document text into manageable segments (~18,000 chars each) so Gemini processes 100% of pages
  const CHUNK_SIZE = 18000;
  const textChunks = [];

  if (documentText && documentText.length > 0) {
    const fullText = documentText;
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

    let chunkPrompt = '';
    if (normalizedSubjectType === 'english') {
      chunkPrompt = `
You are an expert English language and verbal aptitude examination auditor.
Read this segment (Segment ${cIdx + 1} of ${textChunks.length}) of an examination booklet covering "${detectedTopic}".

CRITICAL TASK:
1. Filter out pure theoretical grammar rules, reading passage instructions, general editorial commentary, and answer keys without context.
2. EXTRACT EVERY SINGLE QUESTION OR VERBAL EXERCISE present in this text segment (Sentence Correction, Critical Reasoning, Reading Comprehension questions, Fill in the blanks, Idioms/Prepositions, Vocabulary/Synonyms-Antonyms, Spotting Errors).
3. For each question:
   - "questionText": Full sentence or question prompt with underlined or highlighted target portions.
   - "caseType": Categorize the specific verbal case (e.g. "Sentence Correction - Subject-Verb Agreement", "Critical Reasoning - Assumption", "Vocabulary in Context", "Idiomatic Preposition", "Parallelism & Modifiers").
   - "coreConcept": Concise 3-6 word summary of verbal or grammar rule.
   - "options": Multiple choice options if present (e.g. [{"key": "A", "text": "..."}, ...]).
   - "correctOption": Correct letter if indicated in answer key or solution, or null.
   - "hasNumericalValues": false.

Output ONLY a JSON array of question objects:
[
  {
    "questionText": "...",
    "caseType": "...",
    "coreConcept": "...",
    "options": [{"key": "A", "text": "..."}, ...],
    "correctOption": "A",
    "hasNumericalValues": false
  }
]
`;
    } else if (normalizedSubjectType === 'universal') {
      chunkPrompt = `
You are an expert academic and competitive examination auditor (for subjects such as Bangla Literature & Grammar, General Science, Bangladesh & International Affairs, ICT, Social Science, History, etc.).
Read this segment (Segment ${cIdx + 1} of ${textChunks.length}) of an examination booklet covering "${detectedTopic}".

CRITICAL TASK:
1. Filter out pure textbook paragraph explanations, syllabus overviews, and general book commentary.
2. EXTRACT EVERY SINGLE QUESTION OR MULTIPLE-CHOICE ITEM present in this text segment in its ORIGINAL LANGUAGE (Bengali/বাংলা or English as written in the document). Preserve Unicode Bengali characters flawlessly without any corruption!
3. For each question:
   - "questionText": Full question stem (including multi-statement evaluation prompts like 'i. ..., ii. ..., iii. ... নিচের কোনটি সঠিক?').
   - "caseType": Categorize the specific topic or question case (e.g. "বাংলা ব্যাকরণ - সন্ধি", "সাহিত্য ও রচয়িতা", "General Science - Laws of Motion", "ICT - Computer Networking", "Multi-statement Evaluation").
   - "coreConcept": Concise 3-6 word summary of the concept.
   - "options": Multiple choice options if present (e.g. [{"key": "A", "text": "..."}, ...]).
   - "correctOption": Correct letter or option key if indicated, or null.
   - "hasNumericalValues": false.

Output ONLY a JSON array of question objects:
[
  {
    "questionText": "...",
    "caseType": "...",
    "coreConcept": "...",
    "options": [{"key": "A", "text": "..."}, ...],
    "correctOption": "A",
    "hasNumericalValues": false
  }
]
`;
    } else {
      chunkPrompt = `
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
   - "hasNumericalValues": true.

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
    }

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
  const defaultCaseType =
    normalizedSubjectType === 'english'
      ? 'General Verbal Exercise'
      : normalizedSubjectType === 'universal'
      ? 'General Subject Topic'
      : 'General Quantitative Problem';

  const standardizedQuestions = uniqueQuestions.map((q, idx) => ({
    originalIndex: idx + 1,
    questionText: q.questionText || '',
    caseType: q.caseType || defaultCaseType,
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
    `[Gemini Engine] Phase 1 Complete: Extracted ${standardizedQuestions.length} complete [${normalizedSubjectType.toUpperCase()}] questions across ${distinctCases.length} distinct cases from document (${modelUsedForExtraction}).`
  );

  return {
    success: true,
    subjectType: normalizedSubjectType,
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
 * - Easy: Modify question's values / vocabulary only; preserve structure & context.
 * - Medium: Entire question intact with slight modifications (rephrasing,
 *   different variables, multi-statement options, or adding contextual info).
 * - Hard:
 *   * Math: GMAT Problem Solving & Data Sufficiency with web forum research.
 *   * English: GMAT/GRE Verbal (Sentence Correction & Critical Reasoning).
 *   * Universal: High-discrimination BCS & University Admission standard (NON-GMAT).
 * =========================================================================
 */
const generateMCQsFromExtracted = async ({
  extractedQuestions = [],
  targetTopic = '',
  topic = '',
  targetDifficulty = '',
  difficulty = '',
  subjectType = 'math', // 'math' | 'english' | 'universal'
  questionCount = 30,
  apiKey = '',
  pdfPath = null,
  pdfText = '',
  allowSystemFallback = true,
}) => {
  const activeKey = await getActiveApiKey(apiKey, allowSystemFallback);
  const targetCount = Math.max(1, parseInt(questionCount, 10) || 30);
  const diffNormalized = (targetDifficulty || difficulty || 'medium').toLowerCase();

  const normalizedSubjectType = ['math', 'english', 'universal'].includes((subjectType || '').toLowerCase())
    ? (subjectType || '').toLowerCase()
    : 'math';

  let defaultTopic = 'Profit and Loss';
  if (normalizedSubjectType === 'english') defaultTopic = 'English Language & Verbal Reasoning';
  if (normalizedSubjectType === 'universal') defaultTopic = 'General Studies & Academic Topics';

  const requestedTopic = targetTopic || topic || defaultTopic;

  if (!activeKey) {
    if (!allowSystemFallback) {
      throw new Error('Personal Gemini API key required. Regular users must configure their own Google Gemini API key in Settings (get a free key at https://aistudio.google.com/app/apikey). Only administrators can use the system Gemini API.');
    }
    throw new Error('Gemini API key is not configured. Please add your Gemini API Key in Admin Settings.');
  }

  // If extracted questions are not supplied, extract them first
  let sourceQuestions = extractedQuestions;
  let detectedTopic = requestedTopic;
  let distinctCases = [];

  if (!sourceQuestions || sourceQuestions.length === 0) {
    console.log(`[Gemini Engine] No pre-extracted questions provided; running Phase 1 extraction for [${normalizedSubjectType.toUpperCase()}] first...`);
    const extractRes = await extractAllQuestionsFromDocument({
      pdfPath,
      pdfText,
      targetTopic: requestedTopic,
      subjectType: normalizedSubjectType,
      apiKey: activeKey,
    });
    sourceQuestions = extractRes.questions;
    detectedTopic = extractRes.detectedTopic || requestedTopic;
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

  // If Hard difficulty, initiate live web research tailored to subjectType
  let subjectResearchContext = '';
  let webSearchData = null;
  if (diffNormalized === 'hard') {
    try {
      webSearchData = await fetchSubjectModificationIdeas(detectedTopic, normalizedSubjectType);
      subjectResearchContext = webSearchData.formattedResearchNotes;
    } catch (searchErr) {
      console.warn(`[Gemini Engine] Web search for ${normalizedSubjectType} patterns failed, utilizing curated blueprints:`, searchErr.message);
    }
  }

  // Rules based on exact subject type and user specification
  let difficultyRules = {};

  if (normalizedSubjectType === 'english') {
    difficultyRules = {
      easy: `DIFFICULTY: EASY (DIRECT VOCABULARY & GRAMMAR RULE VARIATION)
1. TAKE THE GIVEN QUESTIONS AND VERBAL ARCHETYPES AS BLUEPRINTS.
2. SIMPLY MODIFY THE VOCABULARY, SUBJECT-NOUNS, OR DIRECT CONTEXT WHILE PRESERVING THE EXACT SAME GRAMMATICAL RULE OR VOCABULARY CONCEPT:
   - Keep the sentence structure, target rule (e.g. singular subject with singular verb, or basic preposition pair) 100% INTACT.
   - If generating multiple questions, formulate distinct verbal variations across the diverse question archetypes.
3. Formulate 4 clean options (A, B, C, D) and accurately identify the correctOption.
4. Provide a structured explanation breaking down: Sentence / Question Breakdown, Governing Grammar/Language Rule, Option Analysis, and Conclusion.
5. Tag each question with "modificationApplied": "Vocabulary/Subject variation: [briefly state change]".`,

      medium: `DIFFICULTY: MEDIUM (CLAUSE INVERSION, IDIOMATIC NUANCES & DECEPTIVE PHRASING)
1. TAKE THE GIVEN QUESTIONS AND VERBAL ARCHETYPES AS BLUEPRINTS.
2. KEEP THE CORE CONCEPT INTACT, BUT APPLY MODIFICATIONS:
   a) Invert clauses, use compound/complex sentences, or introduce modifying phrases between subject and verb.
   b) Test idiomatic usage, phrasal verbs, prepositional nuances, or pronoun antecedent ambiguity.
   c) Add subtle distractors that mimic common colloquial mistakes.
   d) If generating multiple questions, formulate distinct concept-preserving problem variations across the diverse archetypes.
3. Formulate 4 realistic options (A, B, C, D) with plausible distractors and identify the correctOption.
4. Provide a detailed explanation: Sentence Structure Analysis, Key Rule & Idiom Nuance, Distractor Elimination, and Conclusion.
5. Tag each question with "modificationApplied": "Sentence restructuring & nuance: [stated modification]".`,

      hard: `DIFFICULTY: HARD (GMAT/GRE VERBAL STANDARD - SENTENCE CORRECTION & CRITICAL REASONING)
1. GENERATE GMAT/GRE-LEVEL VERBAL QUESTIONS STRICTLY WITHIN TOPIC SCOPE ("${detectedTopic}").
2. SIGNIFICANTLY MODIFY AND ELEVATE ORIGINAL QUESTIONS TO ELITE VERBAL STANDARDS:
   a) Sentence Correction: Strict parallelism (correlative conjunctions, lists), dangling/misplaced modifiers, subjunctive mood, comparison logic ('like' vs 'as', 'more than'), and concise phrasing avoiding wordiness.
   b) Critical Reasoning: Argument passages testing unstated assumptions, strengthening/weakening evidence, boldface role, or paradox resolution.
   c) Tricky Distractor Traps: Options that fix one error while introducing a subtle secondary error, or distractors that sound fluent but violate strict grammatical parallelism.
   d) If generating multiple questions, formulate distinct high-tier competitive problem variations across diverse archetypes.
3. APPLY VERBAL RESEARCH BLUEPRINTS:
${subjectResearchContext || 'Apply GMAT 700+ Verbal parallelism, modifier, and critical reasoning standards.'}
4. Formulate 4 or 5 options (A-D or A-E) and accurately identify the correctOption.
5. Rigorous verbal solution breakdown: Argument/Sentence Breakdown, Core Linguistic/Logic Rule, Step-by-Step Option Elimination (why each wrong choice fails), Conclusion, and Trap/Pitfall Alert.
6. Tag each question with "modificationApplied": "GMAT/GRE Verbal transformation: [archetype and trap structure]".`,
    };
  } else if (normalizedSubjectType === 'universal') {
    difficultyRules = {
      easy: `DIFFICULTY: EASY (DIRECT CONCEPTUAL & FACTUAL VARIATION - NO GMAT FORMAT)
1. TAKE THE GIVEN QUESTIONS AND TOPIC CONCEPTS AS BLUEPRINTS.
2. PRESERVE THE EXACT SUBJECT AND LANGUAGE (IF BENGALI/বাংলা, WRITE IN ELEGANT ACCURATE BENGALI; IF ENGLISH, WRITE IN ENGLISH).
3. SIMPLY SUBSTITUTE OR VARY THE SPECIFIC ENTITY, POET/AUTHOR, YEAR, SPECIES, TERM, OR EVENT WHILE RETAINING THE IDENTICAL CORE DEFINITION OR LAW:
   - Keep the structural framing and relationship 100% INTACT.
   - If generating multiple questions, formulate distinct conceptual variations across the diverse topic cases.
4. Provide 4 clear options (A, B, C, D) and accurately identify the correctOption.
5. Explanation broken down into: মূল ধারণা (Concept Overview), সঠিক উত্তরের ব্যাখ্যা (Justification), বিকল্পসমূহের বিশ্লেষণ (Distractor Notes), and চূড়ান্ত সিদ্ধান্ত (Conclusion).
6. Tag each question with "modificationApplied": "Direct factual/conceptual substitution: [stated change]".`,

      medium: `DIFFICULTY: MEDIUM (CONCEPTUAL APPLICATION, RELATIONSHIPS & MULTI-STATEMENT EVALUATION - NO GMAT FORMAT)
1. TAKE THE GIVEN QUESTIONS AND TOPIC SCOPE AS BLUEPRINTS IN ITS NATIVE LANGUAGE (Bangla or English).
2. APPLY MODIFICATIONS REQUIRING CRITICAL UNDERSTANDING (STANDARD BCS, UNIVERSITY ADMISSION & ACADEMIC BOARD EXAM LEVEL - DO NOT USE GMAT FORMAT):
   a) Frame questions as cause-and-effect, comparative analysis, or contextual scenarios.
   b) Include Multi-Statement Evaluation questions (বহুপদী সমাপ্তিসূচক প্রশ্ন): Statements i, ii, iii with options like: A) i ও ii, B) ii ও iii, C) i ও iii, D) i, ii ও iii.
   c) Formulate plausible distractors based on commonly confused terms, grammatical homonyms (e.g. ণ-ত্ব ও ষ-ত্ব বিধান, সমাস, কারক), or related historical/scientific milestones.
   d) If generating multiple questions, formulate distinct concept-preserving problem variations across diverse archetypes.
3. Provide 4 well-balanced options (A, B, C, D) and accurately identify the correctOption.
4. Provide an in-depth explanation: বিষয়বস্তু ও পটভূমি (Context & Principles), সঠিকতার প্রমাণ (Logical Verification), ভুল বিকল্প বর্জনের কারণ (Why distractors are incorrect), and চূড়ান্ত সিদ্ধান্ত (Conclusion).
5. Tag each question with "modificationApplied": "Conceptual application & multi-statement format: [stated change]".`,

      hard: `DIFFICULTY: HARD (HIGH-DISCRIMINATION COMPETITIVE EXAM MASTERY - BCS / UNIVERSITY ADMISSION STANDARD - NO GMAT FORMAT)
1. GENERATE ADVANCED, HIGH-DISCRIMINATION QUESTIONS STRICTLY WITHIN TOPIC SCOPE ("${detectedTopic}").
2. DO NOT USE GMAT FORMAT OR GMAT TERMINOLOGY (NO DATA SUFFICIENCY, NO GMAT BUSINESS-SCHOOL TRAPS). Instead, apply the highest tier of national competitive examinations (BCS Cadre, Premier Public University Admission A/B/C/D units, Advanced Board Examinations):
   a) Deep Conceptual Discrimination: Questions testing subtle exceptions to grammar rules (ব্যতিক্রমী নিয়ম), obscure literary attributions/manuscripts, nuanced scientific mechanisms, or constitutional/geopolitical article clauses.
   b) Multi-Tier Assertion & Synthesis: Synthesize multiple interrelated facts or rules into a single challenging evaluation (e.g. 'নিচের কোন তথ্যগুচ্ছটি সম্পূর্ণ নির্ভুল?').
   c) Highly Deceptive Distractor Traps: Distractors that differ by a single subtle nuance, chronological inversion, or deceptive phonetic/morphological similarities.
   d) If generating multiple questions, formulate distinct high-tier competitive problem variations across diverse archetypes.
3. INCORPORATE RESEARCH BLUEPRINTS:
${subjectResearchContext || 'Apply top-tier BCS and University Admission discrimination standards.'}
4. Write in the native language of the source document (Bangla or English) with flawless grammar and spelling.
5. Provide comprehensive master-class explanation: মূল প্রতিপাদ্য ও উৎস (Core Thesis & Source Reference), পূর্ণাঙ্গ যৌক্তিক বিশ্লেষণ (Comprehensive Analysis), বিকল্পসমূহের তুলনামূলক পর্যালোচনা (Distractor Comparison), and ভ্রান্ত ধারণা ও ফাঁদ সতর্কতা (Common Misconceptions & Trap Alert).
6. Tag each question with "modificationApplied": "High-discrimination competitive synthesis: [stated challenge and archetype]".`,
    };
  } else {
    // Default: Mathematics with GMAT Quantitative Problem Solving & Data Sufficiency
    difficultyRules = {
      easy: `DIFFICULTY: EASY (VALUE MODIFICATION ONLY)
1. TAKE THE GIVEN QUESTIONS AND PROBLEM ARCHETYPES AS BLUEPRINTS.
2. SIMPLY MODIFY THE QUESTION'S VALUES:
   - Change the numerical figures, prices, percentages, quantities, or dimensions (e.g. change $960 to $1,440, 20% to 25%, 900 grams to 850 grams).
   - Keep the entire conceptual structure, scenario narrative, entities, and question relationships 100% INTACT.
   - If generating multiple questions, formulate distinct numerical variations across the diverse problem archetypes.
3. Recalculate all 4 options (A, B, C, D) using the new substituted values.
4. Accurately identify the correctOption.
5. Provide a detailed, pedagogical step-by-step mathematical explanation breaking down given data, core formula, numbered derivation steps, and conclusion.
6. Tag each question with "modificationApplied": "Value modification: [briefly state values changed]".`,

      medium: `DIFFICULTY: MEDIUM (CONCEPT-PRESERVING SLIGHT MODIFICATIONS)
1. TAKE THE GIVEN QUESTIONS AND PROBLEM ARCHETYPES AS BLUEPRINTS.
2. THE ENTIRE QUESTION AND TOPIC MUST REMAIN INTACT, BUT APPLY SLIGHT MODIFICATIONS:
   a) Rephrase the question wording or context slightly.
   b) Invert / ask for a different variable to find solutions (e.g. if the original asks for Selling Price given Cost Price & Profit %, ask for the Cost Price given Selling Price; or ask for the Discount % given the Marked Price and final amount).
   c) Add extra contextual information while hiding or requiring derivation of some intermediate details (e.g. adding an overhead maintenance/repair cost before resale, or requiring computing the cost price first before applying a second condition).
   d) If generating multiple questions, formulate distinct concept-preserving problem variations across the diverse problem archetypes.
3. Formulate 4 realistic options (A, B, C, D) and identify the correctOption.
4. Provide a thorough, step-by-step mathematical derivation breaking down the problem conceptually, algebraically, and highlighting pitfalls.
5. Tag each question with "modificationApplied": "Slight modification: [rephrased / inverted variable / added intermediate step]".`,

      hard: `DIFFICULTY: HARD (GMAT-LEVEL TRANSFORMATION WITH RESEARCHED COMPETITIVE EXAM IDEAS)
1. GENERATE GMAT-LEVEL DIFFICULTY QUESTIONS THAT REMAIN STRICTLY WITHIN THE TOPIC'S SCOPE ("${detectedTopic}").
2. READ THE ORIGINAL QUESTIONS AND MAKE SIGNIFICANT MODIFICATIONS TO PRODUCE GMAT-TYPE QUESTIONS:
   a) GMAT Problem Solving: Multi-step algebraic constraints, deceptive trap phrasing, percentage base confusion, and higher-order quantitative reasoning.
   b) GMAT Data Sufficiency format: Formulate questions with statements (1) and (2), asking whether statement (1) alone is sufficient, statement (2) alone is sufficient, both together are sufficient, each alone is sufficient, or neither is sufficient.
   c) Tricky Trap Distractors: Craft plausible distractor options that correspond to common GMAT traps (e.g., calculating percentage on cost instead of selling price, sign errors, off-by-one errors).
   d) If generating multiple questions, formulate distinct high-tier competitive problem variations across the diverse problem archetypes.
3. APPLY THE IDEAS GATHERED FROM WEBSITES, FORUMS (GMAT CLUB, BEAT THE GMAT), AND COMPETITIVE EXAM ARCHIVES:
${subjectResearchContext || 'Apply GMAT 700-level multi-constraint modeling and Data Sufficiency formats.'}
4. Options can be 4 or 5 choices (A-D or A-E standard GMAT format).
5. Accurately identify the correctOption.
6. Provide an in-depth, rigorous GMAT-style solution broken down into: Problem Breakdown & Given Data, Governing Formula, Step-by-Step Derivation, Conclusion, and Trap/Pitfall Alert.
7. Tag each question with "modificationApplied": "GMAT-level transformation: [GMAT Problem Solving / Data Sufficiency archetype with trap structure]".`,
    };
  }

  const selectedRule = difficultyRules[diffNormalized] || difficultyRules.medium;
  const temp = diffNormalized === 'easy' ? 0.15 : diffNormalized === 'medium' ? 0.3 : 0.45;

  // Build the list of source questions to feed into the prompt
  const sourceQuestionsText = diverseSubset
    .map((q, idx) => `[Source Question ${idx + 1}] (Case: ${q.caseType})\n${q.questionText}`)
    .join('\n\n');

  let architectRole = `You are an elite competitive examination architect specializing in quantitative mathematics (IBA, CAT, and GMAT assessment design).`;
  if (normalizedSubjectType === 'english') {
    architectRole = `You are an elite verbal aptitude and English language examination architect (IBA, SAT, GRE, GMAT Verbal, and BCS English assessment design).`;
  } else if (normalizedSubjectType === 'universal') {
    architectRole = `You are an elite academic and competitive examination architect (BCS, Premier University Admission, and Academic Board assessment design). Formulate questions in the exact language of the source topic (Bengali/বাংলা or English as supplied) with pristine grammar, zero formatting artifacts, and clear option labels. DO NOT USE GMAT FORMAT.`;
  }

  let explanationInstructions = '';
  if (normalizedSubjectType === 'english') {
    explanationInstructions = `
- CRITICAL EXPLANATION MANDATE:
  Break every solution down into these exact structured sections:
  ### Sentence & Argument Breakdown
  - Break down the underlying sentence structure, clauses, or argument components.
  ### Core Grammar / Verbal Rule
  - State the governing grammatical rule, idiom standard, or logic principle.
  ### Step-by-Step Option Elimination
  - Explicitly explain why each incorrect option (distractor) fails (e.g. parallelism failure, pronoun ambiguity, modifier error).
  ### Conclusion
  - State the correct option definitively.
  ### Trap & Pitfall Alert
  - Highlight the deceptive trap that distractors are built upon.`;
  } else if (normalizedSubjectType === 'universal') {
    explanationInstructions = `
- CRITICAL EXPLANATION MANDATE (IN THE NATIVE LANGUAGE OF THE QUESTION, E.G. BENGALI OR ENGLISH):
  Break every solution down into these exact structured sections:
  ### বিষয়বস্তুর সারসংক্ষেপ / Concept Overview
  - মূল ধারণা ও পটভূমি উপস্থাপন করুন।
  ### মূল নীতি ও সঠিকতা / Key Principle & Justification
  - সঠিক উত্তরের পক্ষে সুনির্দিষ্ট ঐতিহাসিক, ব্যাকরণিক, বৈজ্ঞানিক বা তাত্ত্বিক প্রমাণ ও তথ্য দিন।
  ### বিকল্পসমূহের বিশ্লেষণ / Distractor Analysis
  - অন্যান্য অপশনগুলো কেন সঠিক নয় তার কারণ ব্যাখ্যা করুন।
  ### চূড়ান্ত সিদ্ধান্ত / Conclusion
  - নিশ্চিতভাবে সঠিক অপশনটি উল্লেখ করুন।
  ### পরীক্ষা সতর্কতা ও বিভ্রান্তি / Exam Tip & Trap Alert
  - শিক্ষার্থীরা সচরাচর যে ভুলে বিভ্রান্ত হয় তা নির্দেশ করুন।`;
  } else {
    explanationInstructions = `
- CRITICAL EXPLANATION MANDATE (HIGHLY REFINED, DETAILED PEDAGOGICAL BREAKDOWN):
  The "explanation" field must NEVER be an unformatted or rushed blob of text.
  Break every solution down into these exact structured sections:
  ### Problem Breakdown & Given Data
  - Clearly identify what is given, baseline investments, damaged/unsellable portions, or constraints.
  ### Core Formula & Strategy
  - State the primary economic/algebraic formula or theorem governing the problem.
  ### Step-by-Step Derivation
  - Step 1: Compute the initial base investment/quantity.
  - Step 2: Formulate the target condition (e.g. revenue required for overall profit).
  - Step 3: Set up the algebraic equation and solve step-by-step with clean KaTeX.
  - Step 4: Calculate the final numerical result.
  ### Conclusion
  - State the definitive calculated value and explicitly confirm which Option it matches.
  ### Trap & Common Mistake Alert
  - Explain the deceptive trap that distractors are built upon and why students pick the wrong option.`;
  }

  const fetchBatch = async (countToFetch, startIdx = 1, excludeStatements = [], batchSources = []) => {
    let exclusionText = '';
    if (excludeStatements.length > 0) {
      exclusionText = `\nDO NOT duplicate or re-use scenarios from any of these already generated statements:\n- ${excludeStatements.slice(0, 20).join('\n- ')}\n`;
    }

    const currentSources = batchSources && batchSources.length > 0 ? batchSources : diverseSubset;
    const currentSourcesText = currentSources
      .map((q, idx) => `[Source Question ${idx + 1}] (Case: ${q.caseType})\n${q.questionText}`)
      .join('\n\n');

    const promptText = `
${architectRole}
You have been provided with an extracted list of source questions from an examination document covering "${detectedTopic}".

DIVERSITY REQUIREMENT:
The questions provided below represent diverse problem cases (${distinctCases.join(', ')}).
Ensure the generated questions cover a balanced, diverse range of these question types or cases!

SPECIFIC DIFFICULTY CONDITION:
${selectedRule}
${exclusionText}

QUANTITY & CRITICAL FORMATTING MANDATES:
- Generate EXACTLY ${countToFetch} questions (numbered ${startIdx} to ${startIdx + countToFetch - 1}).
- CRITICAL FORMATTING RULES:
  1. Write all currency values in plain text (e.g. '$120', '$960', '$1,500', 'Taka 120'). NEVER wrap currency numbers inside LaTeX math delimiters ($...$).
  2. Write all percentages in plain text (e.g. '20%', '25%', '50%'). NEVER omit the '%' symbol (e.g. write 'marks up by 50% above cost', NEVER write 'marks up by 50 above cost'). NEVER put a '$' sign after a percentage (do NOT write '20%$').
  3. Use LaTeX delimiters ($...$) ONLY for true algebraic equations, formulas, fractions (\\frac{a}{b}), and variables ($x$, $y$).
- When writing LaTeX inside JSON strings, ALWAYS double-escape backslashes (use \\\\times, \\\\frac, \\\\rightarrow, \\\\text, \\\\%).
- NEVER corrupt Bengali (বাংলা) or non-English characters into question marks or broken escapes. Output authentic Unicode text.
${explanationInstructions}
- NEVER include internal draft thoughts or phrases like "Wait, let's check" or "No, let's adjust".

SOURCE QUESTIONS FROM DOCUMENT (DIVERSE CASES):
---
${currentSourcesText}
---

Output the entire response as a valid JSON array of question objects:
[
  {
    "questionText": "Question statement...",
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
    "explanation": "Detailed explanation..."
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
    `[Gemini Engine] Generating ${targetCount} [${normalizedSubjectType.toUpperCase()}] ${diffNormalized.toUpperCase()} questions for "${detectedTopic}" with diverse case coverage...`
  );

  let allQuestions = [];
  let lastModelUsed = 'gemini';

  // Resilient Micro-Batching Loop: Chunks of 6 (Hard) or 10 (Easy/Medium) to guarantee exact counts without token cutoff
  const BATCH_SIZE = diffNormalized === 'hard' ? 6 : 10;
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
    const startSourceIdx = ((batchIndex - 1) * BATCH_SIZE) % Math.max(1, diverseSubset.length);
    const batchSources = diverseSubset.slice(startSourceIdx, startSourceIdx + countToFetch);
    const sourcesForBatch = batchSources.length > 0 ? batchSources : diverseSubset.slice(0, countToFetch);

    try {
      const batchRes = await fetchBatch(countToFetch, allQuestions.length + 1, alreadyGeneratedSnippets, sourcesForBatch);
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

  console.log(`[Gemini Engine] Successfully generated ${finalQuestions.length} [${normalizedSubjectType.toUpperCase()}] questions using ${lastModelUsed}.`);

  return {
    success: true,
    subjectType: normalizedSubjectType,
    modelUsed: lastModelUsed,
    detectedTopic,
    totalExtracted: finalQuestions.length,
    questions: finalQuestions,
    distinctCasesCovered: distinctCases,
    searchGrounded: diffNormalized === 'hard',
    webSearchInsights: webSearchData ? {
      subjectType: normalizedSubjectType,
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
  targetTopic = '',
  topic = '',
  subjectType = 'math',
  targetDifficulty = 'medium',
  difficulty = '',
  questionCount = 30,
  apiKey = '',
}) => {
  const normalizedSubjectType = ['math', 'english', 'universal'].includes((subjectType || '').toLowerCase())
    ? (subjectType || '').toLowerCase()
    : 'math';

  let defaultTopic = 'Profit and Loss';
  if (normalizedSubjectType === 'english') defaultTopic = 'English Language & Verbal Reasoning';
  if (normalizedSubjectType === 'universal') defaultTopic = 'General Studies & Academic Topics';

  const effectiveTopic = targetTopic || topic || defaultTopic;
  const effectiveDiff = targetDifficulty || difficulty || 'medium';

  // Step 1: Extract all questions from the document
  const extractResult = await extractAllQuestionsFromDocument({
    pdfPath,
    pdfText,
    targetTopic: effectiveTopic,
    subjectType: normalizedSubjectType,
    apiKey,
  });

  // Step 2: Generate configured number of diverse questions based on difficulty
  const generateResult = await generateMCQsFromExtracted({
    extractedQuestions: extractResult.questions,
    targetTopic: extractResult.detectedTopic || effectiveTopic,
    subjectType: normalizedSubjectType,
    targetDifficulty: effectiveDiff,
    questionCount,
    apiKey,
    pdfPath,
    pdfText,
  });

  return {
    ...generateResult,
    subjectType: normalizedSubjectType,
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
