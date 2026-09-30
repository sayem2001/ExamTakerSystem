const fs = require('fs');
const path = require('path');

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

  s = s.replace(/(\d+(?:\.\d+)?%)\$/g, '$1');
  s = s.replace(/\$(\d+(?:\.\d+)?%)(?!\w)/g, '$1');
  s = s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

  s = s
    .replace(/[\u000c\f]+[\u000d\r]*\s*\\?r?a?c(?=[{\d\s])/gi, '\\frac')
    .replace(/[\u000c\f]+\s*\\?frac/gi, '\\frac')
    .replace(/[\u0009\t]+\s*\\?t?e?x?t(?=[{\s])/gi, '\\text')
    .replace(/[\u0009\t]+\s*\\?t?i?m?e?s/gi, ' \\times ')
    .replace(/[\u000d\r]+\s*\\?r?i?g?h?t?a?r?r?o?w/gi, '\\rightarrow');

  s = s
    .replace(/(?:\\[fF]|\u000c|\f)+(\s*\\?frac\b)/gi, '\\frac')
    .replace(/(?:\\+|(?:\\[tT]|[\u0009\t\u000c\f\u000d\r])+)+(?:\\?text\b|ext(?=[{\s\$]|$))/gi, '\\text')
    .replace(/(?:\\+|(?:\\[tT]|[\u0009\t\u000c\f\u000d\r])+)+(?:\\?times\b|imes(?=[{\s\d\$]|$))/gi, ' \\times ')
    .replace(/(?:\\[rR]|\r)+(\s*\\?rightarrow\b)/gi, '\\rightarrow');

  s = replaceNestedFractions(s);

  s = s
    .replace(/\\?\s*ext(?=\{)/gi, '\\text')
    .replace(/\\?\s*imes(?=[{\s\d])/gi, ' \\times ');

  s = s.replace(/\\+\s*(?:\\t|\t)?\s*([×=+\-\/])/g, ' $1 ');
  s = s.replace(/\\t\b/gi, '').replace(/[\t\u0009]+/g, ' ');
  s = s.replace(/Taka(?=\d)/gi, 'Taka ');

  s = s.replace(/\bext([A-Z][a-zA-Z0-9_]*)/g, (match, p1) => {
    return p1
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/per([a-z])/i, ' per $1')
      .replace(/of([a-z])/i, ' of $1');
  });

  s = s.replace(/(\d+|[a-zA-Z])\s*(?:\\+t?times|\\*t?imes)\s*(\d+|[a-zA-Z])/gi, '$1 × $2');
  s = s.replace(/\s*×\s*/g, ' × ');
  s = s.replace(/\$([^$]+)\$/g, (m, inner) => '$' + inner.replace(/×/g, '\\times') + '$');
  s = s.replace(/\\(?![a-zA-Z{}$%])/g, '');

  s = s.replace(/\(\s*\n+\s*([a-zA-Z])\s*\)/g, '($1)');

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

  s = s.replace(/(^|[^$])\\frac\{([^{}]+)\}\{([^{}]+)\}(?![^$]*\$)/g, '$1$\\frac{$2}{$3}$');
  s = s.replace(/\\(\$)/g, '$');
  s = s.replace(/\\\\%/g, '%');
  s = s.replace(/\b(\d+(?:\.\d+)?%?)\1\b/g, '$1');
  s = s.replace(/Taka(\$\\[a-zA-Z]+)/gi, 'Taka $1');

  return s.trim();
};

const files = [
  path.join(__dirname, '..', 'generated_30_hard_questions.json'),
  path.join(__dirname, '..', 'generated_latest_questions.json'),
];

for (const filePath of files) {
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const questions = JSON.parse(raw);
    let healedCount = 0;

    for (const q of questions) {
      const newQ = healText(q.questionText);
      const newExp = healText(q.explanation);
      if (newQ !== q.questionText || newExp !== q.explanation) {
        healedCount++;
        q.questionText = newQ;
        q.explanation = newExp;
      }
      if (Array.isArray(q.options)) {
        for (const opt of q.options) {
          opt.text = healText(opt.text);
        }
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf8');
    console.log(`Healed ${healedCount} questions in ${path.basename(filePath)}`);
  }
}
