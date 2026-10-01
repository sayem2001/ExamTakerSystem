/**
 * jsonQuestionParser.js
 * Utility for parsing, validating, and normalizing JSON question files
 * with zero modifications (verbatim pass-through).
 */

export const SAMPLE_JSON_STRUCTURE = [
  {
    "questionText": "A merchant marks an item up by 25% above its cost price and offers a discount of 10%. If the selling price is $450, what was the original cost price?",
    "difficulty": "medium",
    "topic": "Profit and Loss",
    "options": [
      { "key": "A", "text": "$360" },
      { "key": "B", "text": "$400" },
      { "key": "C", "text": "$420" },
      { "key": "D", "text": "$450" }
    ],
    "correctOption": "B",
    "explanation": "### Step-by-Step Solution\nLet the cost price be $CP$.\n1. Marked Price: $MP = 1.25 \\times CP$\n2. Selling Price: $SP = MP \\times (1 - 0.10) = 1.25 \\times 0.90 \\times CP = 1.125 \\times CP$\n3. Given $SP = 450$:\n$$CP = \\frac{450}{1.125} = 400$$\nHence, the correct option is **B** ($400).",
    "points": 1,
    "negativePoints": 0.25,
    "caseType": "Markup and Discount",
    "tags": ["Arithmetic", "GMAT", "Profit & Loss"]
  },
  {
    "questionText": "If $2^{x+3} = 32$, what is the numerical value of $(x - 1)^3$?",
    "difficulty": "easy",
    "topic": "Algebra & Exponents",
    "options": [
      { "key": "A", "text": "1" },
      { "key": "B", "text": "4" },
      { "key": "C", "text": "8" },
      { "key": "D", "text": "16" }
    ],
    "correctOption": "A",
    "explanation": "Since $32 = 2^5$, we have $x + 3 = 5 \\implies x = 2$.\nThen $(x - 1)^3 = (2 - 1)^3 = 1^3 = 1$.",
    "points": 1,
    "negativePoints": 0.25,
    "caseType": "Exponential Equations",
    "tags": ["Algebra", "Powers"]
  }
];

export const SAMPLE_JSON_STRING = JSON.stringify(SAMPLE_JSON_STRUCTURE, null, 2);

/**
 * Normalizes and strictly validates raw parsed JSON question array or object
 * @param {Array|Object} rawJson 
 * @param {string} defaultTopic 
 * @param {string} defaultDifficulty 
 * @returns {{ questions: Array, topic: string, difficulty: string }}
 */
export function normalizeJsonQuestions(rawJson, defaultTopic = 'Direct JSON Import', defaultDifficulty = 'medium') {
  let questionsArray = [];
  let detectedTopic = defaultTopic;
  let detectedDifficulty = defaultDifficulty;

  if (Array.isArray(rawJson)) {
    questionsArray = rawJson;
  } else if (rawJson && typeof rawJson === 'object') {
    if (Array.isArray(rawJson.questions)) {
      questionsArray = rawJson.questions;
      if (rawJson.topic && typeof rawJson.topic === 'string') {
        detectedTopic = rawJson.topic.trim();
      }
      if (rawJson.difficulty && typeof rawJson.difficulty === 'string') {
        detectedDifficulty = rawJson.difficulty.toLowerCase().trim();
      }
    } else if (rawJson.questionText || rawJson.question || rawJson.stem) {
      questionsArray = [rawJson];
    } else {
      throw new Error(
        'Invalid JSON format. Expected either a JSON array of question objects `[...]` or an object containing a `"questions": [...]` array.'
      );
    }
  } else {
    throw new Error('Invalid JSON root type. Expected an array `[...]` or object `{...}`.');
  }

  if (questionsArray.length === 0) {
    throw new Error('The JSON file contains 0 questions.');
  }

  const normalized = questionsArray.map((q, idx) => {
    const qNum = idx + 1;
    if (!q || typeof q !== 'object') {
      throw new Error(`Question #${qNum} is not a valid object.`);
    }

    // 1. Question Stem (Verbatim)
    const text = q.questionText || q.question || q.stem || q.text;
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new Error(`Question #${qNum} is missing the required "questionText" string.`);
    }

    // 2. Options (Verbatim keys and texts)
    let opts = [];
    if (Array.isArray(q.options)) {
      if (q.options.length > 0 && typeof q.options[0] === 'object' && q.options[0] !== null) {
        opts = q.options.map((opt, oIdx) => {
          const key = (opt.key || String.fromCharCode(65 + oIdx)).toUpperCase().trim();
          const optText = String(opt.text !== undefined ? opt.text : (opt.value || opt.label || '')).trim();
          if (!optText) {
            throw new Error(`Question #${qNum}, Option ${key} has empty text.`);
          }
          return { key, text: optText };
        });
      } else {
        // Simple array of strings e.g. ["10", "20", "30", "40"]
        opts = q.options.map((optStr, oIdx) => ({
          key: String.fromCharCode(65 + oIdx),
          text: String(optStr).trim(),
        }));
      }
    } else if (q.options && typeof q.options === 'object') {
      // Key-value map e.g. { "A": "...", "B": "..." }
      opts = Object.entries(q.options).map(([k, v]) => ({
        key: k.toUpperCase().trim(),
        text: String(v).trim(),
      }));
    } else {
      throw new Error(`Question #${qNum} must provide an "options" array or object with at least 2 choices.`);
    }

    if (opts.length < 2) {
      throw new Error(`Question #${qNum} must have at least 2 options (found ${opts.length}).`);
    }

    // Sort options alphabetically by key if possible
    opts.sort((a, b) => a.key.localeCompare(b.key));

    // 3. Correct Option
    const rawCorrect = q.correctOption || q.correctAnswer || q.answer || q.correct;
    if (!rawCorrect) {
      throw new Error(`Question #${qNum} is missing "correctOption" (e.g. "A", "B", "C", "D").`);
    }
    const correctOption = String(rawCorrect).toUpperCase().trim();
    const hasMatchingKey = opts.some((o) => o.key === correctOption);
    if (!hasMatchingKey) {
      throw new Error(
        `Question #${qNum}: "correctOption" "${correctOption}" does not match any available option key (${opts
          .map((o) => o.key)
          .join(', ')}).`
      );
    }

    // 4. Topic & Difficulty
    const qTopic = (q.topic || detectedTopic || defaultTopic).trim();
    const rawDiff = (q.difficulty || detectedDifficulty || defaultDifficulty).toLowerCase().trim();
    const validDiff = ['easy', 'medium', 'hard'].includes(rawDiff) ? rawDiff : 'medium';

    // 5. Points & Penalties
    const points = q.points !== undefined && !isNaN(Number(q.points))
      ? Number(q.points)
      : validDiff === 'hard' ? 2 : 1;
    const negativePoints = q.negativePoints !== undefined && !isNaN(Number(q.negativePoints))
      ? Number(q.negativePoints)
      : 0.25;

    // 6. Explanation (Verbatim KaTeX & Markdown)
    const explanation = String(q.explanation || q.solution || q.rationale || '').trim();

    // 7. Case Type / Subtopic / Tags
    const caseType = String(q.caseType || q.subtopic || 'Direct JSON Import').trim();
    const tags = Array.isArray(q.tags)
      ? q.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    return {
      questionText: text.trim(),
      options: opts,
      correctOption,
      explanation,
      topic: qTopic,
      difficulty: validDiff,
      points,
      negativePoints,
      caseType,
      tags,
      isDirectJsonImport: true,
    };
  });

  // If top-level topic wasn't explicitly set, take topic of first question if available
  if (detectedTopic === 'Direct JSON Import' && normalized[0]?.topic && normalized[0].topic !== 'Direct JSON Import') {
    detectedTopic = normalized[0].topic;
  }

  return {
    questions: normalized,
    topic: detectedTopic,
    difficulty: detectedDifficulty,
  };
}

/**
 * Parses raw JSON string and normalizes questions
 * @param {string} jsonString 
 * @param {string} defaultTopic 
 * @param {string} defaultDifficulty 
 */
export function parseJsonQuestionsString(jsonString, defaultTopic = 'Direct JSON Import', defaultDifficulty = 'medium') {
  if (!jsonString || !jsonString.trim()) {
    throw new Error('JSON content is empty. Please upload a .json file or paste JSON code.');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonString.trim());
  } catch (err) {
    throw new Error(`JSON Syntax Error: ${err.message}. Please check brackets, commas, and quotes.`);
  }

  return normalizeJsonQuestions(parsed, defaultTopic, defaultDifficulty);
}
