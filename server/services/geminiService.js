const fs = require('fs');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const SystemSetting = require('../models/SystemSetting');
const { fetchGmatModificationIdeas, fetchSubjectModificationIdeas } = require('./webSearchService');
const { extractStructuredQuestionsFromText, isValidQuestionCandidate } = require('./pdfQuestionParser');

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
 * Safely masks an API key for logs and diagnostics (e.g. "...AB12cd")
 */
const maskKey = (key = '') => {
  if (!key || typeof key !== 'string') return 'none';
  const clean = key.trim();
  if (clean.length <= 8) return '***';
  return `...${clean.slice(-6)}`;
};

/**
 * Checks whether an error is due to rate-limiting (429), quota limits, or resource exhaustion
 */
const isRateLimitError = (err) => {
  if (!err) return false;
  if (err.status === 429) return true;
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  );
};

/**
 * Collect all configured Gemini API keys from multiple sources:
 * - Explicit user-provided string or comma/semicolon-separated list
 * - GEMINI_API_KEY_EXTRACT, GEMINI_API_KEY_GENERATE, GEMINI_API_KEY_VERIFY, GEMINI_API_KEY_RESERVE
 * - GEMINI_API_KEY (supports comma-separated list: "key1,key2,key3")
 * - GEMINI_API_KEYS
 * - GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEY_4
 * - GEMINI_FALLBACK_KEY
 * - SystemSetting MongoDB collection (geminiApiKey / geminiApiKeys)
 */
const collectApiKeys = async (providedKey = '', allowSystemFallback = true) => {
  const collected = [];
  const dedicated = {
    extract: '',
    generate: '',
    verify: '',
    reserve: '',
  };

  const addKeys = (raw, phase = null) => {
    if (!raw) return;
    if (Array.isArray(raw)) {
      raw.forEach((r) => addKeys(r, phase));
      return;
    }
    if (typeof raw === 'string') {
      raw.split(/[,\n;]+/).forEach((k) => {
        const trimmed = k.trim();
        if (trimmed.length > 10) {
          collected.push(trimmed);
          if (phase && !dedicated[phase]) {
            dedicated[phase] = trimmed;
          }
        }
      });
    }
  };

  // 1. Explicitly provided keys from user / request
  addKeys(providedKey);

  // If user provided valid key(s) and cannot fall back to system, only use user keys
  if (collected.length > 0 && !allowSystemFallback) {
    const uniqueUserKeys = Array.from(new Set(collected));
    return {
      allKeys: uniqueUserKeys,
      dedicated: {
        extract: uniqueUserKeys[0] || '',
        generate: uniqueUserKeys[1] || uniqueUserKeys[0] || '',
        verify: uniqueUserKeys[2] || uniqueUserKeys[0] || '',
        reserve: uniqueUserKeys[3] || uniqueUserKeys[0] || '',
      },
    };
  }

  if (!allowSystemFallback && collected.length === 0) {
    return { allKeys: [], dedicated: { extract: '', generate: '', verify: '', reserve: '' } };
  }

  // 2. Phase-dedicated environment variables
  addKeys(process.env.GEMINI_API_KEY_EXTRACT, 'extract');
  addKeys(process.env.GEMINI_API_KEY_GENERATE, 'generate');
  addKeys(process.env.GEMINI_API_KEY_VERIFY, 'verify');
  addKeys(process.env.GEMINI_API_KEY_RESERVE, 'reserve');

  // 3. General environment variables (system fallback)
  addKeys(process.env.GEMINI_API_KEY);
  addKeys(process.env.GEMINI_API_KEYS);
  addKeys(process.env.GEMINI_API_KEY_1);
  addKeys(process.env.GEMINI_API_KEY_2);
  addKeys(process.env.GEMINI_API_KEY_3);
  addKeys(process.env.GEMINI_API_KEY_4);
  addKeys(process.env.GEMINI_FALLBACK_KEY);

  // 4. Database settings (only query if mongoose connection is active)
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const setting = await SystemSetting.findOne().lean().maxTimeMS(1500);
      if (setting) {
        if (setting.geminiApiKey) addKeys(setting.geminiApiKey);
        if (setting.geminiApiKeys) addKeys(setting.geminiApiKeys);
      }
    }
  } catch (err) {
    // Non-fatal if DB not yet connected or model unavailable
  }

  const uniqueKeys = Array.from(new Set(collected));

  // Auto-assign dedicated slots if not explicitly specified
  if (!dedicated.extract && uniqueKeys.length > 0) dedicated.extract = uniqueKeys[0];
  if (!dedicated.generate && uniqueKeys.length > 1) dedicated.generate = uniqueKeys[1];
  else if (!dedicated.generate && uniqueKeys.length > 0) dedicated.generate = uniqueKeys[0];
  if (!dedicated.verify && uniqueKeys.length > 2) dedicated.verify = uniqueKeys[2];
  else if (!dedicated.verify && uniqueKeys.length > 0) dedicated.verify = uniqueKeys[0];
  if (!dedicated.reserve && uniqueKeys.length > 3) dedicated.reserve = uniqueKeys[3];
  else if (!dedicated.reserve && uniqueKeys.length > 0) dedicated.reserve = uniqueKeys[0];

  return { allKeys: uniqueKeys, dedicated };
};

/**
 * Intelligent Phase-Dedicated Gemini API Key Manager:
 * Assigns dedicated keys for Phase 1 (Extract), Phase 2 (Generate), and Phase 3 (Verify),
 * with automatic cross-phase borrowing and cooldown state machine when 429 is encountered.
 */
class GeminiPhaseKeyManager {
  constructor(keysConfig = {}) {
    const all = Array.isArray(keysConfig.allKeys) ? keysConfig.allKeys : [];
    this.allKeys = Array.from(
      new Set(
        all
          .filter((k) => typeof k === 'string' && k.trim().length > 10)
          .map((k) => k.trim())
      )
    );
    const dedicated = keysConfig.dedicated || {};
    this.phaseKeys = {
      extract: dedicated.extract || this.allKeys[0] || '',
      generate: dedicated.generate || this.allKeys[1] || this.allKeys[0] || '',
      verify: dedicated.verify || this.allKeys[2] || this.allKeys[0] || '',
      reserve: dedicated.reserve || this.allKeys[3] || this.allKeys[0] || '',
    };
    this.cooldowns = new Map(); // key -> cooldownExpiry timestamp
    this.clientInstances = new Map(); // key -> GoogleGenerativeAI instance
  }

  get size() {
    return this.allKeys.length;
  }

  getGenAI(key) {
    if (!this.clientInstances.has(key)) {
      this.clientInstances.set(key, new GoogleGenerativeAI(key));
    }
    return this.clientInstances.get(key);
  }

  getKeyInfoForPhase(phase = 'generate') {
    if (this.allKeys.length === 0) return null;
    const now = Date.now();
    const primaryKey = this.phaseKeys[phase] || this.allKeys[0];

    // 1. If primary key for this phase is healthy (not cooling down), use it
    const primaryCooldown = this.cooldowns.get(primaryKey) || 0;
    if (now >= primaryCooldown) {
      return {
        key: primaryKey,
        genAI: this.getGenAI(primaryKey),
        phase,
        maskedKey: maskKey(primaryKey),
        isBorrowed: false,
        isCooling: false,
        totalKeys: this.allKeys.length,
      };
    }

    // 2. Primary key is in cooldown: borrow the next healthy key from the reserve pool
    console.warn(
      `[GeminiPhaseKeyManager] Primary key for phase "${phase}" (${maskKey(primaryKey)}) is cooling down. Borrowing reserve key...`
    );
    for (let i = 0; i < this.allKeys.length; i++) {
      const candidateKey = this.allKeys[i];
      const cooldownUntil = this.cooldowns.get(candidateKey) || 0;
      if (now >= cooldownUntil) {
        return {
          key: candidateKey,
          genAI: this.getGenAI(candidateKey),
          phase,
          maskedKey: maskKey(candidateKey),
          isBorrowed: true,
          isCooling: false,
          totalKeys: this.allKeys.length,
        };
      }
    }

    // 3. All keys are cooling down: return the key that expires soonest
    let earliestKey = this.allKeys[0];
    let earliestTime = this.cooldowns.get(earliestKey) || 0;
    for (const key of this.allKeys) {
      const time = this.cooldowns.get(key) || 0;
      if (time < earliestTime) {
        earliestTime = time;
        earliestKey = key;
      }
    }
    return {
      key: earliestKey,
      genAI: this.getGenAI(earliestKey),
      phase,
      maskedKey: maskKey(earliestKey),
      isBorrowed: true,
      isCooling: true,
      totalKeys: this.allKeys.length,
    };
  }

  markCooldown(key, durationMs = 60000) {
    if (!key) return;
    console.warn(
      `[GeminiPhaseKeyManager] API key ${maskKey(key)} marked in cooldown for ${Math.round(durationMs / 1000)}s (rate limit / 429).`
    );
    this.cooldowns.set(key, Date.now() + durationMs);
  }

  markRateLimited(key, durationMs = 60000) {
    this.markCooldown(key, durationMs);
  }

  getAllKeys() {
    return [...this.allKeys];
  }
}

/**
 * Retrieve the active Gemini Phase Key Manager
 */
const getActiveKeyManager = async (providedKey = '', allowSystemFallback = true) => {
  const config = await collectApiKeys(providedKey, allowSystemFallback);
  return new GeminiPhaseKeyManager(config);
};

/**
 * Legacy Helper: Retrieve the primary active Gemini API key
 */
const getActiveApiKey = async (providedKey = '', allowSystemFallback = true) => {
  const config = await collectApiKeys(providedKey, allowSystemFallback);
  return config.allKeys.length > 0 ? config.allKeys[0] : '';
};

/**
 * Recursively repairs nested fraction expressions like \frac{...}{...}, \rac{...}{...}, ac{...}{...}
 * correctly handling balanced nested braces (such as \text{...} inside the numerator/denominator).
 */
const replaceNestedFractions = (str) => {
  if (!str || typeof str !== 'string') return '';
  let res = '';
  let i = 0;
  while (i < str.length) {
    const slice = str.slice(i);
    const m = slice.match(/^(?:\\frac|\\rac|\\nac|(?:\b|\s|=|\$|\(|^|[+\-])ac)\s*\{/i);
    if (m) {
      const brace1Start = i + m[0].length - 1;
      let depth = 1;
      let j = brace1Start + 1;
      while (j < str.length && depth > 0) {
        if (str[j] === '{') depth++;
        else if (str[j] === '}') depth--;
        j++;
      }
      const numEnd = j;
      const afterNum = str.slice(numEnd).match(/^\s*\{/);
      if (depth === 0 && afterNum) {
        const brace2Start = numEnd + afterNum[0].length - 1;
        depth = 1;
        let k = brace2Start + 1;
        while (k < str.length && depth > 0) {
          if (str[k] === '{') depth++;
          else if (str[k] === '}') depth--;
          k++;
        }
        if (depth === 0) {
          const numContent = str.slice(brace1Start + 1, numEnd - 1);
          const denContent = str.slice(brace2Start + 1, k - 1);
          const prefixMatch = m[0].match(/^[^\w\\]*/)[0];
          let frac = `${prefixMatch}\\frac{${replaceNestedFractions(numContent)}}{${replaceNestedFractions(denContent)}}`;
          if (k < str.length && /[a-zA-Z]/.test(str[k])) {
            frac += ' ';
          }
          res += frac;
          i = k;
          continue;
        }
      }
    }
    res += str[i];
    i++;
  }
  return res;
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

    // 2. Clean rogue trailing/leading $ attached to percentage (e.g. "20%$" -> "20%")
    s = s.replace(/(\d+(?:\.\d+)?%)\$/g, '$1');
    s = s.replace(/\$(\d+(?:\.\d+)?%)(?!\w)/g, '$1');

    // 3. Unescape literal newlines (ONLY \\r\\n and \\n - NEVER solitary \\r followed by letters!)
    s = s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

    // 4. Fix ASCII control characters that got injected by JSON/escape bugs
    s = s
      .replace(/[\u000c\f]+[\u000d\r]*\s*\\?r?a?c(?=[{\d\s])/gi, '\\frac')
      .replace(/[\u000c\f]+\s*\\?frac/gi, '\\frac')
      .replace(/[\u0009\t]+\s*\\?t?e?x?t(?=[{\s])/gi, '\\text')
      .replace(/[\u0009\t]+\s*\\?t?i?m?e?s/gi, ' \\times ')
      .replace(/[\u000d\r]+\s*\\?r?i?g?h?t?a?r?r?o?w/gi, '\\rightarrow');

    // 5. Collapse rogue backslashes and repair damaged macros
    s = s
      .replace(/(?:\\[fF]|\u000c|\f)+(\s*\\?frac\b)/gi, '\\frac')
      .replace(/(?:\\+|(?:\\[tT]|[\u0009\t\u000c\f\u000d\r])+)+(?:\\?text\b|ext(?=[{\s\$]|$))/gi, '\\text')
      .replace(/(?:\\+|(?:\\[tT]|[\u0009\t\u000c\f\u000d\r])+)+(?:\\?times\b|imes(?=[{\s\d\$]|$))/gi, ' \\times ')
      .replace(/(?:\\[rR]|\r)+(\s*\\?rightarrow\b)/gi, '\\rightarrow');

    // 6. Replace nested and simple fractions: \rac{1}{2}, ac{1}{2} -> \frac{1}{2}
    s = replaceNestedFractions(s);

    // 7. Fix \ext, \ ext, or ext before {
    s = s
      .replace(/\\?\s*ext(?=\{)/gi, '\\text')
      .replace(/\\?\s*imes(?=[{\s\d])/gi, ' \\times ');

    // 8. Clean stray tabs and literal \t artifacts and backslashes before operators
    s = s.replace(/\\+\s*(?:\\t|\t)?\s*([×=+\-\/])/g, ' $1 ');
    s = s.replace(/\\t\b/gi, '').replace(/[\t\u0009]+/g, ' ');
    s = s.replace(/Taka(?=\d)/gi, 'Taka ');

    // 9. Fix camelCase broken tokens: extTotalCost -> Total Cost, extSavingsperitem -> Savings per item
    s = s.replace(/\bext([A-Z][a-zA-Z0-9_]*)/g, (match, p1) => {
      return p1
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/per([a-z])/i, ' per $1')
        .replace(/of([a-z])/i, ' of $1');
    });

    // 10. Fix arithmetic multiplication
    s = s.replace(/(\d+|[a-zA-Z])\s*(?:\\+t?times|\\*t?imes)\s*(\d+|[a-zA-Z])/gi, '$1 × $2');
    s = s.replace(/\s*×\s*/g, ' × ');
    // Inside $...$, ensure math multiplication uses \times for KaTeX
    s = s.replace(/\$([^$]+)\$/g, (m, inner) => '$' + inner.replace(/×/g, '\\times') + '$');
    // Remove rogue solitary backslashes not followed by valid LaTeX command letters or { }
    s = s.replace(/\\(?![a-zA-Z{}$%])/g, '');

    // 11. Fix broken variable in parentheses: "(\n n)" -> "(n)"
    s = s.replace(/\(\s*\n+\s*([a-zA-Z])\s*\)/g, '($1)');

    // 12. Fix rogue math sentences where English words were enclosed in $...$
    // e.g. "$ \frac{1}{2} the stock at 20% profit, \frac{1}{4} $" -> normal English text with isolated $\frac{1}{2}$
    s = s.replace(/\$([^$]+)\$/g, (match, inner) => {
      const englishWords = inner
        .replace(/\\(?:text|frac|times|rightarrow|left|right)\b/g, '')
        .replace(/\{[^{}]*\}/g, '')
        .match(/[a-zA-Z]{3,}/g) || [];

      if (englishWords.length >= 2) {
        return inner
          .replace(/(?:\\?f?rac|ac)\{([^{}]+)\}\{([^{}]+)\}/gi, '$\\frac{$1}{$2}$')
          .replace(/\\text\{([^{}]+)\}/gi, '$1')
          .replace(/\\times/gi, '×')
          .replace(/\\%/g, '%')
          .replace(/\n+/g, ' ');
      }
      return match;
    });

    // 13. Clean duplicate percentages, rogue backslashes before $
    s = s.replace(/\\(\$)/g, '$');
    s = s.replace(/\\\\%/g, '%');
    s = s.replace(/\b(\d+(?:\.\d+)?%?)\1\b/g, '$1');

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

  // Helper to sanitize unescaped LaTeX backslashes and control characters inside strings before JSON.parse
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
          if (next === '\\') {
            sanitized += '\\\\';
            i++; // skip next backslash
            continue;
          } else if (next === '"' || next === '/') {
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

  // 1. Sanitize unescaped LaTeX backslashes first so \f and \t are not corrupted into formfeed / tab by JSON.parse
  const sanitizedResult = trySanitizedParse(text);
  if (sanitizedResult) {
    const list = Array.isArray(sanitizedResult) ? sanitizedResult : [sanitizedResult];
    const valid = list.map(normalizeQuestion).filter(Boolean);
    if (valid.length > 0) return valid;
  }

  // 2. Direct JSON parse fallback
  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
    const valid = arr.map(normalizeQuestion).filter(Boolean);
    if (valid.length > 0) return valid;
  } catch (err) {}

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
 * Call Gemini candidate models with 2D failover:
 * 1. Phase-dedicated key routing with instant borrowing of reserve keys on 429 rate-limiting.
 * 2. Automatic candidate model failover on 503 (overloaded) or model errors.
 */
const callGeminiWithFailover = async ({
  keyManager = null,
  phase = 'generate',
  genAI = null,
  contents,
  temperature = 0.25,
  responseMimeType = null,
}) => {
  // If no keyManager was provided, create one or wrap genAI
  let manager = keyManager;
  if (!manager && genAI) {
    manager = {
      size: 1,
      getKeyInfoForPhase: () => ({ genAI, key: 'primary', maskedKey: '...primary', isCooling: false }),
      markCooldown: () => {},
    };
  } else if (!manager) {
    manager = await getActiveKeyManager('', true);
  }

  if (!manager || manager.size === 0) {
    throw new Error('No active Gemini API keys available in key manager.');
  }

  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    // For each model candidate, we allow up to manager.size key attempts
    const maxKeyAttempts = Math.max(1, manager.size);

    for (let kAttempt = 0; kAttempt < maxKeyAttempts; kAttempt++) {
      const keyInfo = manager.getKeyInfoForPhase(phase);
      if (!keyInfo) break;

      const currentGenAI = keyInfo.genAI;
      const currentKey = keyInfo.key;

      try {
        console.log(
          `[Gemini Engine] [Phase: ${phase.toUpperCase()}] Trying model "${modelName}" on Key ${keyInfo.maskedKey}${keyInfo.isBorrowed ? ' [borrowed]' : ''}${keyInfo.isCooling ? ' [cooling]' : ''}...`
        );

        const config = {
          temperature,
          maxOutputTokens: 8192,
        };
        if (responseMimeType) {
          config.responseMimeType = responseMimeType;
        }

        const model = currentGenAI.getGenerativeModel({
          model: modelName,
          generationConfig: config,
        });

        const result = await model.generateContent(contents);
        const response = await result.response;
        const rawText = response.text().trim();

        if (rawText.length > 20) {
          console.log(
            `[Gemini Engine] [Phase: ${phase.toUpperCase()}] Model "${modelName}" on Key ${keyInfo.maskedKey} succeeded (${rawText.length} chars).`
          );
          return { rawText, modelUsed: modelName, keyUsed: keyInfo.maskedKey };
        }
      } catch (err) {
        lastError = err;
        const rateLimit = isRateLimitError(err);

        console.warn(
          `[Gemini Engine] [Phase: ${phase.toUpperCase()}] Model "${modelName}" on Key ${keyInfo.maskedKey} failed (${err.status || err.message}).`
        );

        if (rateLimit) {
          // Key-level throttle: mark key in cooldown and retry on NEXT available key in pool immediately
          manager.markCooldown(currentKey, 60000);
          if (manager.size > 1 && kAttempt < maxKeyAttempts - 1) {
            console.log(`[Gemini Engine] Immediately failing over to next available healthy key for phase "${phase}"...`);
            continue; // Try next key on the same high-performing model candidate!
          }
          await new Promise((r) => setTimeout(r, 1200));
        } else {
          // Model-level or transient error (503 / 500 / 404)
          if (err.status === 503) {
            await new Promise((r) => setTimeout(r, 600));
          }
          // Break key loop to try next model candidate
          break;
        }
      }
    }
  }

  throw lastError || new Error(`All Gemini candidate models and keys failed to respond for phase "${phase}".`);
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
  const keyManager = await getActiveKeyManager(apiKey, allowSystemFallback);
  if (!keyManager || keyManager.size === 0) {
    if (!allowSystemFallback) {
      throw new Error('Personal Gemini API key required. Regular users must configure their own Google Gemini API key in Settings (get a free key at https://aistudio.google.com/app/apikey). Only administrators can use the system Gemini API.');
    }
    throw new Error('Gemini API key is not configured. Please add your Gemini API Key in Admin Settings.');
  }

  console.log(`[Gemini Engine] Phase 1 [Extract]: Key Manager initialized with ${keyManager.size} key(s) (Primary extract key: ${maskKey(keyManager.phaseKeys.extract)}).`);

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
  // Divide document text by clean question boundaries (~18,000 chars each) so zero questions are severed
  const splitTextByQuestionBoundaries = (text, targetSize = 18000) => {
    if (!text || text.length <= targetSize + 4000) return [text];
    const chunks = [];
    let currentPos = 0;

    while (currentPos < text.length) {
      let endPos = Math.min(currentPos + targetSize, text.length);
      if (endPos < text.length) {
        const searchWindow = text.slice(Math.max(currentPos, endPos - 3000), Math.min(text.length, endPos + 2500));
        const relativeOffset = Math.max(0, endPos - 3000 - currentPos);
        const boundaryMatches = [...searchWindow.matchAll(/(?:\n|^)(?=\s*\d+[\.:\)]\s+[A-Za-z])/g)];

        if (boundaryMatches.length > 0) {
          let bestMatch = boundaryMatches[0];
          let bestDist = Math.abs(currentPos + relativeOffset + bestMatch.index - endPos);
          for (const bm of boundaryMatches) {
            const dist = Math.abs(currentPos + relativeOffset + bm.index - endPos);
            if (dist < bestDist) {
              bestDist = dist;
              bestMatch = bm;
            }
          }
          endPos = currentPos + relativeOffset + bestMatch.index;
        } else {
          const doubleNewline = text.indexOf('\n\n', endPos - 1000);
          if (doubleNewline !== -1 && doubleNewline < endPos + 1500) {
            endPos = doubleNewline;
          } else {
            const singleNewline = text.indexOf('\n', endPos);
            if (singleNewline !== -1 && singleNewline - endPos < 1500) {
              endPos = singleNewline;
            }
          }
        }
      }

      const chunk = text.slice(currentPos, endPos).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      currentPos = endPos;
    }

    return chunks;
  };

  const textChunks = documentText && documentText.length > 0
    ? splitTextByQuestionBoundaries(documentText, 18000)
    : [];

  console.log(`[Gemini Engine] Partitioned document into ${textChunks.length} clean boundary segments for zero-truncation coverage.`);

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
You are an expert mathematical curriculum auditor and test-prep extraction engine.
Read this segment (Segment ${cIdx + 1} of ${textChunks.length}) of an examination booklet covering "${detectedTopic}".

CRITICAL EXTRACTION MANDATES:
1. Filter out pure theoretical definitions, chapter introductions, formulas, worked solutions, and general remarks.
2. EXTRACT EVERY SINGLE AUTHENTIC QUESTION OR PRACTICE PROBLEM present in this text segment.
3. For each question:
   - "questionText": The complete, multi-line question statement in clean, natural English.
     * Capture the ENTIRE question across all its lines. NEVER truncate or stop at line breaks.
     * Clean out any parenthetical Bengali translation or unrendered font text (e.g. "(A n‡”Q ... KZ?)").
     * Do NOT include the printed solution or author hints in questionText.
     * Write simple fractions as standard plain numbers (e.g. "1/2", "1/4", "1/9") or as clean KaTeX math ("$\\frac{1}{2}$").
     * Write currency and percentages in plain text ($500, Taka 300, 20%).
   - "caseType": Specific problem category (e.g. "Relative Speed", "Race Related", "Average Speed", "Train Meeting Time", "Speed & Time Ratio", "Stoppage & Speed").
   - "coreConcept": Concise 3-6 word summary of mathematical rule.
   - "options": All multiple choice options present in the document.
     * Extract actual choices from lines like "a. 25m b. 20m c. 22.5m d. 9m" or "A. ... B. ...".
     * Standardize keys to uppercase A, B, C, D, E.
     * NEVER output dummy placeholder text like "Option A", "Option B".
   - "correctOption": The correct answer letter (e.g. "A", "B", "C", "D", "E") if specified in "Ans:" or the solution.
   - "hasNumericalValues": true.
4. REJECTION MANDATE:
   - If a sentence is an incomplete fragment (e.g. "A is faster than", "returns on a bicycle at"), DO NOT output it.

Output ONLY a JSON array of question objects:
[
  {
    "questionText": "...",
    "caseType": "...",
    "coreConcept": "...",
    "options": [{"key": "A", "text": "100"}, ...],
    "correctOption": "A",
    "hasNumericalValues": true
  }
]
`;
    }

    try {
      const contents = [chunkText, chunkPrompt];
      const { rawText, modelUsed } = await callGeminiWithFailover({
        keyManager,
        phase: 'extract',
        contents,
        temperature: 0.1,
        responseMimeType: 'application/json',
      });
      modelUsedForExtraction = modelUsed || modelUsedForExtraction;

      const parsedArr = convertResponseToQuestions(rawText, detectedTopic);

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
    const singlePrompt = `Extract ALL complete questions and problems from this examination document with options and correct answers. Output a JSON array of question objects.`;
    const contents = buildGeminiContentParts({ pdfPath, textContent: '', promptText: singlePrompt });
    try {
      const { rawText, modelUsed } = await callGeminiWithFailover({
        keyManager,
        phase: 'extract',
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

  // Step 3: 4-Gate Quality Firewall & High-Precision Canonical Union
  // Gate 1 & 2: Filter out incomplete stems, dangling prepositions, and fake options
  const validGemini = allGeminiQuestions.filter((q) => {
    return q && q.questionText && isValidQuestionCandidate(q.questionText, q.options);
  });

  const validAlgo = algoQuestions.filter((q) => {
    return q && q.questionText && isValidQuestionCandidate(q.questionText, q.options);
  });

  // Canonical stem map: Gemini takes precedence; algo supplements answer keys or missed questions
  const canonicalMap = new Map();

  const getCanonicalKey = (str = '') => {
    return (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 65);
  };

  // 1. Register all valid Gemini questions
  for (const gq of validGemini) {
    const key = getCanonicalKey(gq.questionText);
    if (key.length >= 15 && !canonicalMap.has(key)) {
      canonicalMap.set(key, { ...gq });
    }
  }

  // 2. Cross-reference with algorithmic questions:
  // If algo found a verified correctOption from "Ans: b" and Gemini missed it, enrich Gemini's question!
  for (const aq of validAlgo) {
    const key = getCanonicalKey(aq.questionText);
    if (canonicalMap.has(key)) {
      const existing = canonicalMap.get(key);
      if ((!existing.correctOption || existing.correctOption === 'A') && aq.correctOption) {
        existing.correctOption = aq.correctOption;
      }
      if ((!existing.options || existing.options.length < 2) && aq.options && aq.options.length >= 2) {
        existing.options = aq.options;
      }
      if (!existing.sourceExam && aq.sourceExam) {
        existing.sourceExam = aq.sourceExam;
      }
      if (!existing.referenceSolution && aq.referenceSolution) {
        existing.referenceSolution = aq.referenceSolution;
      }
    } else if (key.length >= 15 && aq.options && aq.options.length >= 2) {
      canonicalMap.set(key, { ...aq });
    }
  }

  const uniqueQuestions = Array.from(canonicalMap.values());

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
  customInstructions = '',
  apiKey = '',
  pdfPath = null,
  pdfText = '',
  allowSystemFallback = true,
}) => {
  const keyPool = await collectApiKeys();
  const keyManager = new GeminiPhaseKeyManager(keyPool);
  const activeKeyInfo = keyManager.getKeyInfoForPhase('generate');
  const activeKey = apiKey && apiKey.trim() ? apiKey.trim() : (activeKeyInfo ? activeKeyInfo.key : null);
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
    throw new Error('Gemini API key is not configured. Please add your Gemini API Key in Admin Settings or .env.');
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

  // Build custom instruction block if user specified custom prompt requirements
  const cleanCustomInstructions = (customInstructions || '').trim();
  let customInstructionBlock = '';
  if (cleanCustomInstructions) {
    customInstructionBlock = `
================================================================================
🚨 CRITICAL OVERRIDE: CUSTOM USER INSTRUCTIONS (HIGHEST PRIORITY) 🚨
THE USER HAS PROVIDED SPECIFIC CUSTOM INSTRUCTIONS THAT OVERRIDE AND SUPERSEDE
ANY DEFAULT DIFFICULTY SETTINGS OR PRESETS. YOU MUST HONOR THESE CUSTOM
INSTRUCTIONS FULLY AND ADAPT ALL QUESTIONS, OPTIONS, VALUE RANGES, AND
FORMATS ACCORDINGLY:

"""
${cleanCustomInstructions}
"""

APPLY THESE USER SPECIFICATIONS STRICTLY TO ALL GENERATED QUESTIONS (VALUES,
QUESTION SCOPE, RESTRICTIONS, FORMAT, NUMBER OF OPTIONS, LANGUAGE, ETC.).
================================================================================
`;
    console.log(`[Gemini Engine] Active Custom Instructions Override applied (${cleanCustomInstructions.length} chars).`);
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
${customInstructionBlock}
SPECIFIC DIFFICULTY CONDITION:
${cleanCustomInstructions ? `(Note: The custom instructions above take absolute priority over presets. For baseline guidance:)\n${selectedRule}` : selectedRule}
${exclusionText}

QUANTITY & CRITICAL FORMATTING MANDATES:
- Generate EXACTLY ${countToFetch} questions (numbered ${startIdx} to ${startIdx + countToFetch - 1}).
- CRITICAL STUDENT-READABLE TEXT RULES:
  1. Question statements and explanations MUST be written in clean, natural, easily understandable language for students.
  2. NEVER wrap English words, sentences, or phrases inside math delimiters ($...$).
     - WRONG: "$ A trader sells \\frac{1}{2} the stock at 20% profit $" (This destroys formatting and collapses text into italic math variables!).
     - CORRECT: "A trader sells $\\frac{1}{2}$ of the stock at 20% profit, $\\frac{1}{4}$ at 10% loss, and the rest at $x$% profit..."
  3. Write simple fractions as standard plain fractions (e.g. 1/2, 1/4, 1/9, 2/3) or strictly isolate them as clean inline math with surrounding spaces: " $\\frac{1}{2}$ ".
  4. Write all currency values in plain text (e.g. '$120', '$960', '$1,500', 'Taka 120'). NEVER wrap currency numbers inside LaTeX math delimiters ($...$).
  5. Write all percentages in plain text (e.g. '20%', '25%', '50%'). NEVER omit the '%' symbol. NEVER put a '$' sign after a percentage (do NOT write '20%$').
  6. In explanations, write step-by-step arithmetic in clean plain text with standard symbols (e.g. "Total Cost = 3,000 × 25 = Taka 75,000"). NEVER abbreviate into broken tokens like "extTotalCost" or "imes25".
  7. For governing formulas, use standard LaTeX with \\text{...}:
     "$$\\text{Average Profit per book} = \\frac{\\text{Total Revenue} - \\text{Total Cost}}{\\text{Total Quantity}}$$"
  8. When writing LaTeX inside JSON strings, ALWAYS double-escape backslashes (use \\\\times, \\\\frac, \\\\rightarrow, \\\\text, \\\\%).
  9. NEVER corrupt Bengali (বাংলা) or non-English characters into question marks or broken escapes. Output authentic Unicode text.
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
      keyManager,
      phase: 'generate',
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
    customInstructionsApplied: !!cleanCustomInstructions,
    keyPoolSize: keyPool.length,
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
  customInstructions = '',
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

  // Step 1: Extract all questions from the document (Phase 1)
  const extractResult = await extractAllQuestionsFromDocument({
    pdfPath,
    pdfText,
    targetTopic: effectiveTopic,
    subjectType: normalizedSubjectType,
    apiKey,
  });

  // Step 2: Generate configured number of diverse questions based on difficulty & custom instructions (Phase 2)
  const generateResult = await generateMCQsFromExtracted({
    extractedQuestions: extractResult.questions,
    targetTopic: extractResult.detectedTopic || effectiveTopic,
    subjectType: normalizedSubjectType,
    targetDifficulty: effectiveDiff,
    questionCount,
    customInstructions,
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
  collectApiKeys,
  GeminiPhaseKeyManager,
  maskKey,
  convertResponseToQuestions,
  extractAllQuestionsFromDocument,
  generateMCQsFromExtracted,
  generateMCQsWithGemini,
};
