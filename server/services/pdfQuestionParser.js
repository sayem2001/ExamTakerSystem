/**
 * Algorithmic Section & Question Parser for Test Prep Documents
 * Parses standard past paper and practice problem formats with answer keys.
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
 * "Answers of past paper questions\n1.D 2.E 3.D 4.B 5.D 6.A 7.D 8.E 9.B"
 * or "1.C 2.A 3.D 4.C 5.C 6.A 7.A"
 */
const parseAnswerKeysFromSection = (sectionText) => {
  const answerMap = new Map();
  
  // Look for Answers block
  const answersBlockRegex = /(?:Answers?(?:\s+of|\s+to)?\s+(?:past\s+(?:paper|year)|practice)?\s*questions?[\s\S]*?)(?=(?:Solution|Past|\n\n\n|$))/i;
  const match = sectionText.match(answersBlockRegex);
  const targetText = match ? match[0] : sectionText;

  // Match patterns like "1.D", "2. E", "3: B", "(1) C", "1 - A"
  const itemRegex = /(?:^|\s)(?:#|\()?(\d+)[\.:\)\-]\s*([A-E])\b/gi;
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
 * Parse options like (A) ... (B) ... (C) ... (D) ... (E) ...
 */
const parseOptionsFromBlock = (text) => {
  const options = [];
  // Match standard option patterns: (A) Text (B) Text or A. Text B. Text
  const optRegex = /(?:\(|\b)([A-E])[\.:\)]\s*([^\(\n\r]+)/g;
  let match;
  let lastIndex = 0;

  // Alternative line-by-line option matcher
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const lineOptMatch = trimmed.match(/^[\(]?([A-E])[\.:\)]\s*(.*)$/i);
    if (lineOptMatch) {
      options.push({
        key: lineOptMatch[1].toUpperCase(),
        text: lineOptMatch[2].trim(),
      });
    }
  }

  if (options.length >= 2) return options;

  // Inline regex matcher if options were on one line
  const inlineRegex = /(?:[\(]|\b)([A-E])[\.:\)]\s*([^(\n]+?)(?=(?:[\(]|\b)[A-E][\.:\)]|$)/g;
  let inMatch;
  while ((inMatch = inlineRegex.exec(text)) !== null) {
    const key = inMatch[1].toUpperCase();
    const optText = inMatch[2].replace(/[\(\)]/g, '').trim();
    if (optText.length > 0 && !options.some((o) => o.key === key)) {
      options.push({ key, text: optText });
    }
  }

  return options;
};

/**
 * Extract structured questions directly from document text using regex
 */
const extractStructuredQuestionsFromText = (rawText, defaultTopic = 'Profit and Loss') => {
  if (!rawText || typeof rawText !== 'string') return [];

  const questions = [];
  const text = cleanText(rawText);

  // Split into major topic/question sections:
  // e.g. "Past Paper Questions", "Practice Problems", "Practice questions"
  const sectionSplitter = /(?:^|\n)(?=(?:Past\s+(?:Paper|Year)\s+Questions?|Practice\s+(?:Problems?|Questions?))\s*[:\.]?)/i;
  const sections = text.split(sectionSplitter);

  for (const sec of sections) {
    if (!sec.trim() || sec.trim().length < 50) continue;

    // Detect section title
    const titleMatch = sec.match(/^(Past\s+(?:Paper|Year)\s+Questions?|Practice\s+(?:Problems?|Questions?))/i);
    const sectionTitle = titleMatch ? titleMatch[1].trim() : 'Practice Questions';
    const isPastPaper = /past/i.test(sectionTitle);
    const caseType = isPastPaper ? 'IBA Past Paper Problem' : 'Comprehensive Practice Problem';

    // Parse answer keys in this section
    const answerKeys = parseAnswerKeysFromSection(sec);

    // Stop section before "Solution to"
    const contentBeforeSolution = sec.split(/(?:^|\n)Solution\s+to\s+/i)[0];

    // Find questions starting with "1. ", "2. ", etc.
    const qSplitter = /(?:^|\n)(?=\d+[\.:\)]\s+[A-Z])/;
    const rawQBlocks = contentBeforeSolution.split(qSplitter);

    for (const qBlock of rawQBlocks) {
      const qNumMatch = qBlock.match(/^(\d+)[\.:\)]\s+([\s\S]+)/);
      if (!qNumMatch) continue;

      const qNum = parseInt(qNumMatch[1], 10);
      const fullQText = qNumMatch[2].trim();

      // Don't mistake answer key row for a question
      if (/^Answers?\s+(?:of|to)/i.test(fullQText) || fullQText.length < 15) continue;

      // Separate question statement from options
      const optSplitMatch = fullQText.match(/([\s\S]+?)(?=(?:\([A-E]\)|(?:^|\s)[A-E][\.:\)]\s+))/);
      const questionStatement = optSplitMatch ? optSplitMatch[1].trim() : fullQText.split('\n')[0].trim();

      if (questionStatement.length < 15) continue;

      const options = parseOptionsFromBlock(fullQText);
      const correctOption = answerKeys.get(qNum) || (options.length > 0 ? options[0].key : 'A');

      questions.push({
        originalIndex: questions.length + 1,
        questionText: questionStatement,
        caseType,
        coreConcept: `${defaultTopic} Analysis`,
        options: options.length >= 2 ? options : [
          { key: 'A', text: 'Option A' },
          { key: 'B', text: 'Option B' },
          { key: 'C', text: 'Option C' },
          { key: 'D', text: 'Option D' },
        ],
        correctOption,
        hasNumericalValues: /\d/.test(questionStatement),
      });
    }
  }

  return questions;
};

module.exports = {
  extractStructuredQuestionsFromText,
  parseAnswerKeysFromSection,
};
