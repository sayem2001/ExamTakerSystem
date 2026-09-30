const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const mongoose = require('mongoose');

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

const healText = (str) => {
  if (!str || typeof str !== 'string') return '';
  let s = str;

  // 1. Clean rogue trailing/leading $ attached to percentage (e.g. "20%$" -> "20%")
  s = s.replace(/(\d+(?:\.\d+)?%)\$/g, '$1');
  s = s.replace(/\$(\d+(?:\.\d+)?%)(?!\w)/g, '$1');

  // 2. Unescape literal newlines (ONLY \\r\\n and \\n - NEVER solitary \\r followed by letters!)
  s = s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

  // 3. Fix ASCII control characters that got injected by JSON/escape bugs
  s = s
    .replace(/[\u000c\f]+[\u000d\r]*\s*\\?r?a?c(?=[{\d\s])/gi, '\\frac')
    .replace(/[\u000c\f]+\s*\\?frac/gi, '\\frac')
    .replace(/[\u0009\t]+\s*\\?t?e?x?t(?=[{\s])/gi, '\\text')
    .replace(/[\u0009\t]+\s*\\?t?i?m?e?s/gi, ' \\times ')
    .replace(/[\u000d\r]+\s*\\?r?i?g?h?t?a?r?r?o?w/gi, '\\rightarrow');

  // 4. Collapse rogue backslashes and repair damaged macros
  s = s
    .replace(/(?:\\[fF]|\u000c|\f)+(\s*\\?frac\b)/gi, '\\frac')
    .replace(/(?:\\+|(?:\\[tT]|[\u0009\t\u000c\f\u000d\r])+)+(?:\\?text\b|ext(?=[{\s\$]|$))/gi, '\\text')
    .replace(/(?:\\+|(?:\\[tT]|[\u0009\t\u000c\f\u000d\r])+)+(?:\\?times\b|imes(?=[{\s\d\$]|$))/gi, ' \\times ')
    .replace(/(?:\\[rR]|\r)+(\s*\\?rightarrow\b)/gi, '\\rightarrow');

  // 5. Replace nested and simple fractions: \rac{1}{2}, ac{1}{2} -> \frac{1}{2}
  s = replaceNestedFractions(s);

  // 6. Fix \ext, \ ext, or ext before {
  s = s
    .replace(/\\?\s*ext(?=\{)/gi, '\\text')
    .replace(/\\?\s*imes(?=[{\s\d])/gi, ' \\times ');

  // 7. Clean stray tabs and literal \t artifacts and backslashes before operators
  s = s.replace(/\\+\s*(?:\\t|\t)?\s*([×=+\-\/])/g, ' $1 ');
  s = s.replace(/\\t\b/gi, '').replace(/[\t\u0009]+/g, ' ');
  s = s.replace(/Taka(?=\d)/gi, 'Taka ');

  // 8. Fix camelCase broken tokens: extTotalCost -> Total Cost, extSavingsperitem -> Savings per item
  s = s.replace(/\bext([A-Z][a-zA-Z0-9_]*)/g, (match, p1) => {
    return p1
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/per([a-z])/i, ' per $1')
      .replace(/of([a-z])/i, ' of $1');
  });

  // 9. Fix arithmetic multiplication
  s = s.replace(/(\d+|[a-zA-Z])\s*(?:\\+t?times|\\*t?imes)\s*(\d+|[a-zA-Z])/gi, '$1 × $2');
  s = s.replace(/\s*×\s*/g, ' × ');
  // Inside $...$, ensure math multiplication uses \times for KaTeX
  s = s.replace(/\$([^$]+)\$/g, (m, inner) => '$' + inner.replace(/×/g, '\\times') + '$');
  // Remove rogue solitary backslashes not followed by valid LaTeX command letters or { }
  s = s.replace(/\\(?![a-zA-Z{}$%])/g, '');

  // 10. Fix broken variable in parentheses: "(\n n)" -> "(n)"
  s = s.replace(/\(\s*\n+\s*([a-zA-Z])\s*\)/g, '($1)');

  // 11. Fix rogue math sentences where English words were enclosed in $...$
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

  // 12. Fix bare fractions outside math: e.g. "Taka \frac{1}{8}" -> "Taka $\frac{1}{8}$"
  s = s.replace(/(^|[^$])\\frac\{([^{}]+)\}\{([^{}]+)\}(?![^$]*\$)/g, '$1$\\frac{$2}{$3}$');

  // 13. Clean duplicate percentages, rogue backslashes before $
  s = s.replace(/\\(\$)/g, '$');
  s = s.replace(/\\\\%/g, '%');
  s = s.replace(/\b(\d+(?:\.\d+)?%?)\1\b/g, '$1');

  // 14. Ensure space between currency and fraction: "Taka$\\frac" -> "Taka $\\frac"
  s = s.replace(/Taka(\$\\[a-zA-Z]+)/gi, 'Taka $1');

  return s.trim();
};

async function healDatabase() {
  await connectDB();
  const qColl = mongoose.connection.collection('questions');

  const cursor = qColl.find({});
  let totalScanned = 0;
  let totalHealed = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    totalScanned++;

    let modified = false;
    const updateObj = {};

    // Heal questionText
    const newQuestionText = healText(doc.questionText);
    if (newQuestionText !== doc.questionText) {
      updateObj.questionText = newQuestionText;
      modified = true;
    }

    // Heal explanation
    if (doc.explanation) {
      const newExplanation = healText(doc.explanation);
      if (newExplanation !== doc.explanation) {
        updateObj.explanation = newExplanation;
        modified = true;
      }
    }

    // Heal options
    if (Array.isArray(doc.options)) {
      let optionsChanged = false;
      const newOptions = doc.options.map((opt) => {
        if (!opt) return opt;
        const newText = healText(opt.text);
        if (newText !== opt.text) {
          optionsChanged = true;
          return { ...opt, text: newText };
        }
        return opt;
      });
      if (optionsChanged) {
        updateObj.options = newOptions;
        modified = true;
      }
    }

    if (modified) {
      await qColl.updateOne({ _id: doc._id }, { $set: updateObj });
      totalHealed++;
      console.log(`[Healed #${totalHealed}] Question ID: ${doc._id}`);
      if (updateObj.questionText) {
        console.log(`  OLD: ${doc.questionText.slice(0, 90)}...`);
        console.log(`  NEW: ${updateObj.questionText.slice(0, 90)}...`);
      }
      if (updateObj.explanation) {
        console.log(`  EXPL HEALED: Yes`);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Healing complete!`);
  console.log(`Scanned: ${totalScanned} questions`);
  console.log(`Healed:  ${totalHealed} questions`);
  console.log(`========================================`);

  await mongoose.disconnect();
}

healDatabase().catch(console.error);
