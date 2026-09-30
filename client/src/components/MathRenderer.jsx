import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * Recursively repairs nested fraction expressions like \frac{...}{...}, \rac{...}{...}, ac{...}{...}
 * correctly handling balanced nested braces (such as \text{...} inside the numerator/denominator).
 */
export const replaceNestedFractions = (str) => {
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
          res += `${prefixMatch}\\frac{${replaceNestedFractions(numContent)}}{${replaceNestedFractions(denContent)}}`;
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
 * Universal math and text sanitizer:
 * Restores corrupted LaTeX escapes, control codes, and unwraps mistakenly enclosed English sentences.
 */
export const sanitizeMathText = (str) => {
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
  // Example: "$ \frac{1}{2} the stock at 20% profit, \frac{1}{4} $" -> normal English text with isolated $\frac{1}{2}$
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

  // 12. Clean duplicate percentages, rogue backslashes before $
  s = s.replace(/\\(\$)/g, '$');
  s = s.replace(/\\\\%/g, '%');
  s = s.replace(/\b(\d+(?:\.\d+)?%?)\1\b/g, '$1');

  return s.trim();
};

/**
 * Clean individual formula before passing to KaTeX
 */
const cleanFormula = (formula) => {
  if (!formula) return '';
  let f = sanitizeMathText(formula);
  // Restore currency tokens inside math mode if any were caught
  f = f.replace(/@@CURRENCY_USD@@/g, '\\$');
  // In KaTeX, unescaped % comments out the remainder of the formula! Must escape as \%
  f = f.replace(/\\+%/g, '%');
  f = f.replace(/%/g, '\\%');
  return f.replace(/\\\\+/g, '\\\\').trim();
};

/**
 * Formats plain text segments with basic markdown (bold, italic, bullets, code)
 */
const formatPlainText = (str) => {
  if (!str) return '';

  let s = str
    // Clean dangling section artifacts if passed accidentally
    .replace(/^& (?:Given Data|Strategy)\s*/i, '')
    // Escape HTML special characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Markdown bold **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-main); font-weight: 700;">$1</strong>')
    // Markdown italic *text*
    .replace(/\*(.*?)\*/g, '<em style="color: var(--text-muted); font-style: italic;">$1</em>')
    // Inline code `code`
    .replace(/`([^`]+)`/g, '<code style="background: rgba(99, 102, 241, 0.12); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.88em; color: #818cf8;">$1</code>')
    // Markdown bullet lines (- Item or * Item)
    .replace(/^\s*[-*]\s+(.*$)/gim, '<div style="display: flex; gap: 8px; margin: 4px 0;"><span style="color: #818cf8; font-weight: bold; flex-shrink: 0;">•</span><span>$1</span></div>')
    // Real newlines
    .replace(/\n\n+/g, '<div style="margin: 8px 0;"></div>')
    .replace(/\n/g, '<br/>');

  return s;
};

/**
 * Parses a string containing LaTeX formulas delimited by $...$ (inline) or $$...$$ (display)
 * and renders clean HTML using KaTeX.
 */
export const MathRenderer = ({ text = '', className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!text || typeof text !== 'string') return '';

    let cleanedText = sanitizeMathText(text);

    // 1. Protect currency amounts ($960, $ 960, $1,200, $45.50, $3000, $18,000) from being misidentified as LaTeX delimiters
    cleanedText = cleanedText.replace(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(?!\w)/g, '@@CURRENCY_USD@@$1');

    // 2. Normalize internal newlines inside $...$ so they don't break inline math parsing
    cleanedText = cleanedText.replace(/\$([^\$]+)\$/g, (m, inner) => `$${inner.replace(/\n+/g, ' ')}$`);

    // 3. Split text into tokens by math delimiters ($$...$$ or $...$)
    const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
    const parts = cleanedText.split(regex);

    return parts
      .map((part) => {
        if (!part) return '';

        // Display math ($$...$$)
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = cleanFormula(part.slice(2, -2));
          try {
            return `<div class="katex-display-wrapper" style="overflow-x: auto; margin: 0.75rem 0; padding: 0.5rem 0; text-align: center;">${katex.renderToString(formula, {
              displayMode: true,
              throwOnError: false,
              output: 'html',
            })}</div>`;
          } catch (e) {
            return `<div class="katex-error">${formula}</div>`;
          }
        }

        // Inline math ($...$)
        if (part.startsWith('$') && part.endsWith('$')) {
          const formula = cleanFormula(part.slice(1, -1));
          try {
            return katex.renderToString(formula, {
              displayMode: false,
              throwOnError: false,
              output: 'html',
            });
          } catch (e) {
            return `<span class="katex-error">${formula}</span>`;
          }
        }

        // Plain text segment: restore currency amounts and format with markdown
        const restoredPart = part.replace(/@@CURRENCY_USD@@/g, '$');
        return formatPlainText(restoredPart);
      })
      .join('');
  }, [text]);

  return (
    <span
      className={`inline-math-container ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
};

export default MathRenderer;
