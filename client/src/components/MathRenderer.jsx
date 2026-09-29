import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * Helper to clean corrupted escape sequences before KaTeX rendering
 */
const cleanFormula = (formula) => {
  if (!formula) return '';
  return formula
    .replace(/\r(?=ightarrow)/g, '\\r')
    .replace(/\t(?=imes|ext)/g, '\\t')
    .replace(/\f(?=rac)/g, '\\f')
    .replace(/\u000c(?=rac)/g, '\\f')
    .replace(/\\?(\f|\\f|\u000c)rac/g, '\\frac')
    .replace(/\\?(\r|\\r)ightarrow/g, '\\rightarrow')
    .replace(/\\?(\t|\\t)imes/g, '\\times')
    .replace(/\\?(\t|\\t)ext/g, '\\text')
    .replace(/\\?(?:ext|\\ext)\b/g, '\\text')
    .replace(/\\?(?:imes|\\imes)\b/g, '\\times')
    .replace(/\\?(?:rac|\\rac)\b/g, '\\frac')
    .replace(/\\?(?:ightarrow|\\ightarrow)\b/g, '\\rightarrow')
    .replace(/\\{2,}/g, '\\')
    .replace(/\\(\$)/g, '$');
};

/**
 * Formats plain text segments with basic markdown (bold, italic, bullets, code)
 */
const formatPlainText = (str) => {
  if (!str) return '';

  let s = str
    // Fix double typed numbers/percentages (e.g. 40%40% -> 40%, 1.51.5 -> 1.5)
    .replace(/\b(\d+(?:\.\d+)?%?)\1\b/g, '$1')
    // Escape standard HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Markdown bold **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-main); font-weight: 700;">$1</strong>')
    // Markdown italic *text*
    .replace(/\*(.*?)\*/g, '<em style="color: var(--text-muted);">$1</em>')
    // Inline code `code`
    .replace(/`([^`]+)`/g, '<code style="background: rgba(99, 102, 241, 0.12); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.88em; color: #818cf8;">$1</code>')
    // Headings (e.g. ### Heading)
    .replace(/^###\s*(.*$)/gim, '<div style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 8px 0 4px;">$1</div>')
    // Bullet lines (- Item)
    .replace(/^\s*[-*]\s+(.*$)/gim, '<div style="padding-left: 14px; position: relative; margin: 3px 0;"><span style="position: absolute; left: 0; color: #818cf8;">•</span>$1</div>')
    // Line breaks
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

    // Pre-clean common raw string corruptions
    const cleanedText = text
      .replace(/\r(?=ightarrow)/g, '\\r')
      .replace(/\t(?=imes|ext)/g, '\\t')
      .replace(/\\?(\f|\\f|\u000c)rac/g, '\\frac')
      .replace(/\\?(\r|\\r)ightarrow/g, '\\rightarrow')
      .replace(/\\?(\t|\\t)imes/g, '\\times')
      .replace(/\\?(\t|\\t)ext/g, '\\text')
      .replace(/\\?(?:ext|\\ext)\b/g, '\\text')
      .replace(/\\?(?:imes|\\imes)\b/g, '\\times')
      .replace(/\\?(?:rac|\\rac)\b/g, '\\frac')
      .replace(/\\?(?:ightarrow|\\ightarrow)\b/g, '\\rightarrow');

    // Split text into tokens by math delimiters
    // Pattern matches $$...$$ or $...$
    const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
    const parts = cleanedText.split(regex);

    return parts
      .map((part) => {
        if (!part) return '';

        // Display math ($$...$$)
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = cleanFormula(part.slice(2, -2).trim());
          try {
            return `<div class="katex-display-wrapper" style="overflow-x: auto; margin: 0.75rem 0; padding: 0.5rem 0;">${katex.renderToString(formula, {
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
          const formula = cleanFormula(part.slice(1, -1).trim());
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

        // Plain text: format with markdown and clean HTML
        return formatPlainText(part);
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
