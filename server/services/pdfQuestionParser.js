/**
 * High-Precision Algorithmic Section & Question Parser for Competitive Test Prep Documents
 * Extracts multi-line problem stems, lowercase/uppercase options (a. b. c. d. / A. B. C. D.),
 * answer keys (Ans: b), exam citations ([Bank-2019]), and strictly separates solution blocks.
 */

// Normalize text spacing
const cleanText = (str) => {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
};

/**
 * Extract answer key tables like:
 * "Answers of past paper questions\n1.D 2.E 3.D 4.B 5.D 6.A"
 * or "1.C 2.A 3.D 4.C 5.C"
 */
const parseAnswerKeysFromSection = (sectionText) => {
  const answerMap = new Map();
  if (!sectionText) return answerMap;

  const answersBlockRegex = /(?:Answers?(?:\s+(?:of|to))?\s+(?:past\s+(?:paper|year)|practice)?\s*questions?[\s\S]*?)(?=(?:Solutions?|Past|\n\n\n|$))/i;
  const match = sectionText.match(answersBlockRegex);
  const targetText = match ? match[0] : sectionText;

  // Match patterns like "1.D", "2. E", "3: B", "(1) C", "1 - A", "10. C"
  const itemRegex = /(?:^|\s)(?:#|\()?(\d+)[\.:\)\-]\s*([A-Ea-e])\b/g;
  let m;
  while ((m = itemRegex.exec(targetText)) !== null) {
    const qNum = parseInt(m[1], 10);
    const key = m[2].toUpperCase();
    if (!answerMap.has(qNum)) {
      answerMap.set(qNum, key);
    }
  }

  return answerMap;
};

/**
 * Robust Option & Answer Parser:
 * Supports uppercase "(A) ... (B) ...", "A. ... B. ...",
 * and lowercase single-line/multi-line "a. ... b. ... c. ... d. ... Ans: b".
 */
const parseOptionsAndAnswer = (rawBlock) => {
  const options = [];
  let correctOption = null;

  if (!rawBlock || typeof rawBlock !== 'string') {
    return { options, correctOption };
  }

  // 1. Detect and extract inline or trailing Ans: / Answer:
  const ansMatch = rawBlock.match(/(?:Ans(?:wer)?|DËi)\s*[:\.]?\s*([A-Ea-e])/i);
  if (ansMatch) {
    correctOption = ansMatch[1].toUpperCase();
  }

  // Clean out the answer token when parsing options
  const cleanBlock = rawBlock.replace(/(?:Ans(?:wer)?|DËi)\s*[:\.]?\s*[A-Ea-e]/gi, '').trim();

  // 2. Pattern A: Inline options on single or multiple lines
  // e.g. "a. 25m b. 20 m c. 22.5m d. 9 m" or "A. 10 B. 20 C. 30 D. 40" or "(A) 10 (B) 20"
  const optionRegex = /(?:^|\s)(?:[\(]?([A-Ea-e])[\.:\)]|\(([A-Ea-e])\))\s*([\s\S]*?)(?=(?:^|\s)(?:[\(]?[A-Ea-e][\.:\)]|\([A-Ea-e]\))\s*|$)/g;
  let m;
  while ((m = optionRegex.exec(cleanBlock)) !== null) {
    const key = (m[1] || m[2]).toUpperCase();
    let text = (m[3] || '').trim();

    // Clean trailing punctuation or delimiters
    text = text.replace(/[\r\n]+/g, ' ').replace(/\s*[\(\)]\s*$/, '').trim();

    if (text.length > 0 && !options.some((o) => o.key === key)) {
      options.push({ key, text });
    }
  }

  return { options, correctOption };
};

/**
 * Gate 1: Check if a question candidate is complete, valid, and not a cut-off fragment
 */
const isValidQuestionCandidate = (stem, options = []) => {
  if (!stem || typeof stem !== 'string') return false;
  const s = stem.trim();

  // 1. Minimum word count: Real exam questions require at least 10 words
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 10) return false;

  // 2. Reject dangling incomplete sentence endings (prepositions, conjunctions, verbs)
  if (/\b(?:at|by|is|in|than|with|of|if|to|and|or|from|for|on|the|a|an)\s*$/i.test(s)) {
    return false;
  }

  // 3. Reject unfinished open parentheses
  const openParens = (s.match(/\(/g) || []).length;
  const closeParens = (s.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    return false;
  }

  // 4. Must have at least 2 distinct non-dummy options if options are provided
  if (options && options.length > 0) {
    if (options.length < 2) return false;
    const isDummy = options.every((o) => /^Option\s+[A-D]$/i.test(o.text));
    if (isDummy) return false;
  }

  return true;
};

/**
 * Clean Question Stem:
 * Separates English question from exam source tags ([Bank-2019]) and parenthetical translations.
 */
const cleanStemAndExtractCitation = (rawStem) => {
  let stem = cleanText(rawStem);
  let sourceExam = '';

  // 1. Strip leading question numbers like "1. ", "88. ", "Q2: "
  stem = stem.replace(/^(?:Question\s*)?\d+[\.:\)]\s*/i, '').trim();

  // 2. Extract trailing source exam citation e.g. [Janata Bank (EO)-2017], (Al-Arafah IB 2013)
  const citeMatch = stem.match(/\s*\[([^\]]+)\]\s*$/) || stem.match(/\s*\(([A-Za-z0-9\s\.\-\(\)]+(?:Bank|BCS|IBA|MB|TO|PO|Officer|Cash|SO)[^)]*)\)\s*$/i);
  if (citeMatch) {
    sourceExam = citeMatch[1].trim();
    stem = stem.substring(0, citeMatch.index).trim();
  }

  // 3. Strip trailing bilingual Bengali subtext in parentheses e.g. (A n‡”Q B Gi †_‡K ... KZ?)
  // Only remove if it contains non-ASCII characters or Bijoy glyphs, preserving English parens like (to the nearest hour)
  const bengaliParenMatch = stem.match(/\s*\(([^)]*[\u0080-\u00FF\u0980-\u09FF][^)]*)\)\s*$/);
  if (bengaliParenMatch) {
    stem = stem.slice(0, bengaliParenMatch.index).trim();
  }

  // 4. If stem ends with "is" or "equal to" without punctuation, add colon
  if (/\b(?:equal to|is|will be|by|are)\s*$/i.test(stem) && !/[:\?\.]$/.test(stem)) {
    stem += ':';
  }

  return { stem, sourceExam };
};

/**
 * Extract structured questions directly from document text with multi-line greedy scanning
 */
const extractStructuredQuestionsFromText = (rawText, defaultTopic = 'Time, Speed & Distance') => {
  if (!rawText || typeof rawText !== 'string') return [];

  const questions = [];
  const text = cleanText(rawText);
  const seenSignatures = new Set();

  // Universal question block splitter: matches questions starting with "1. ", "2. ", "10. ", "100. "
  const questionBlocks = text.split(/(?:^|\n)(?=\s*\d+[\.:\)]\s+[A-Za-z])/);

  for (const block of questionBlocks) {
    if (!block.trim()) continue;

    // Must start with a question number
    const numMatch = block.match(/^\s*(\d+)[\.:\)]\s+([\s\S]+)/);
    if (!numMatch) continue;

    const qNum = parseInt(numMatch[1], 10);
    const fullBlock = numMatch[2].trim();

    // Skip table of contents or answer summary tables
    if (/^Answers?\s+(?:of|to)/i.test(fullBlock)) continue;

    // 1. Isolate question + options strictly BEFORE the solution block
    const solSplit = fullBlock.split(/(?:^|\n)\s*(?:[]\s*)?(?:Solution|Ans(?:wer)?)\s*:/i);
    const questionAndOptsPart = solSplit[0].trim();
    const solutionPart = solSplit.length > 1 ? solSplit.slice(1).join('\n').trim() : '';

    // 2. Separate question stem from options
    // Find where options start: e.g. "a. 25m b. 20m ..." or "(A) 10 (B) 20"
    const optMatch = questionAndOptsPart.match(/(?:^|\n)\s*(?:[\(]?[a-eA-E][\.:\)]|\([a-eA-E]\))\s+[\s\S]+$/);

    let rawStem = questionAndOptsPart;
    let rawOptText = '';

    if (optMatch) {
      rawOptText = optMatch[0].trim();
      rawStem = questionAndOptsPart.substring(0, optMatch.index).trim();
    }

    // 3. Clean stem and extract exam citation
    const { stem, sourceExam } = cleanStemAndExtractCitation(rawStem);

    // 4. Parse options and answer key
    const { options, correctOption: parsedAns } = parseOptionsAndAnswer(rawOptText || fullBlock);

    // 5. Run Gate 1 Quality Firewall: Reject incomplete fragments
    if (!isValidQuestionCandidate(stem, options)) {
      continue;
    }

    // 6. Gate 4: Canonical Deduplication
    const signature = stem.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 70);
    if (seenSignatures.has(signature)) {
      continue;
    }
    seenSignatures.add(signature);

    // 7. Case Type Determination
    let caseType = 'Time, Speed & Distance Problem';
    if (/race/i.test(stem)) caseType = 'Race Related Problem';
    else if (/train/i.test(stem)) caseType = 'Train & Platform Problem';
    else if (/average speed/i.test(stem)) caseType = 'Average Speed Problem';
    else if (/relative|chase|policeman|thief/i.test(stem)) caseType = 'Relative Speed Problem';
    else if (/ratio/i.test(stem)) caseType = 'Speed & Time Ratio';

    questions.push({
      originalIndex: questions.length + 1,
      questionNumber: qNum,
      questionText: stem,
      caseType,
      coreConcept: `${defaultTopic} Principle`,
      sourceExam: sourceExam || null,
      options: options.length >= 2 ? options : [],
      correctOption: parsedAns || 'A',
      referenceSolution: solutionPart.slice(0, 500) || '',
      hasNumericalValues: /\d/.test(stem),
    });
  }

  return questions;
};

module.exports = {
  cleanText,
  parseAnswerKeysFromSection,
  parseOptionsAndAnswer,
  isValidQuestionCandidate,
  cleanStemAndExtractCitation,
  extractStructuredQuestionsFromText,
};
