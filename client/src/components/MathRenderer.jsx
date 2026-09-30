import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * Universal math and text sanitizer
 */
export const sanitizeMathText = (str) => {
  if (!str || typeof str !== 'string') return '';
  let s = str;

  // 1. Clean rogue trailing $ immediately after percentage (e.g. "20%$" -> "20%")
  s = s.replace(/(\d+(?:\.\d+)?%)\$/g, '$1');

  // 2. Clean rogue leading $ immediately before percentage (e.g. "$20%" -> "20%")
  s = s.replace(/\$(\d+(?:\.\d+)?%)(?!\w)/g, '$1');

  // 3. Unescape literal newlines / tabs
  s = s
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');

  // 4. Collapse rogue \f sequences before \frac (e.g. \f\f\f\frac)
  s = s.replace(/(?:\\[fF]|\u000c|\f)+(\s*\\?frac\b)/gi, '\\frac');

  // 5. Collapse rogue \t sequences before \times or \text (e.g. \t\t\t\times)
  s = s.replace(/(?:\\[tT]|\t)+(\s*\\?times\b)/gi, ' \\times ');
  s = s.replace(/(?:\\[tT]|\t)+(\s*\\?text\b)/gi, '\\text');

  // 6. Collapse rogue \r sequences before \rightarrow
  s = s.replace(/(?:\\[rR]|\r)+(\s*\\?rightarrow\b)/gi, '\\rightarrow');

  // 7. If rogue \t preceded words inside math mode (e.g. \t\t\tTotal unrestricted)
  s = s.replace(/(?:\\[tT]|\t)+(Total\s+unrestricted|Restricted\s*\(together\))/gi, '\\text{$1}');

  // 8. Clean isolated backslash-letter that are not valid KaTeX macros
  s = s.replace(/\\[fF](?![a-zA-Z])/g, '');
  s = s.replace(/\\[tT](?![a-zA-Z])/g, '');
  s = s.replace(/\\[rR](?![a-zA-Z])/g, '');

  // 9. Fix missing leading characters on common macros
  s = s
    .replace(/\\rac(?=[{\s\d])/g, '\\frac')
    .replace(/\\ext(?=[{\s])/g, '\\text')
    .replace(/\\imes(?=[{\s\d])/g, '\\times')
    .replace(/\\ightarrow\b/g, '\\rightarrow');

  // 10. Fix double-typed numbers and percentages (e.g. 40%40% -> 40%)
  s = s.replace(/\b(\d+(?:\.\d+)?%?)\1\b/g, '$1');

  // 11. Clean backslashes before $
  s = s.replace(/\\(\$)/g, '$');

  // 12. Clean ASCII form-feed characters
  s = s.replace(/[\f\u000c]/g, '');

  return s;
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
    // A currency value is $ followed optionally by space, then digits
    cleanedText = cleanedText.replace(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(?!\w)/g, '@@CURRENCY_USD@@$1');

    // 2. Split text into tokens by math delimiters ($$...$$ or $...$)
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
