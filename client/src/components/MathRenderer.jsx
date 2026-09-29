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
    .replace(/\\?(\f|\\f)rac/g, '\\frac')
    .replace(/\\?(\r|\\r)ightarrow/g, '\\rightarrow')
    .replace(/\\?(\t|\\t)imes/g, '\\times')
    .replace(/\\?(\t|\\t)ext/g, '\\text')
    .replace(/\\{2,}/g, '\\');
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
      .replace(/\\?(\f|\\f)rac/g, '\\frac')
      .replace(/\\?(\r|\\r)ightarrow/g, '\\rightarrow')
      .replace(/\\?(\t|\\t)imes/g, '\\times')
      .replace(/\\?(\t|\\t)ext/g, '\\text');

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
            return katex.renderToString(formula, {
              displayMode: true,
              throwOnError: false,
              output: 'html', // Render visual HTML only, preventing duplicate mathml elements
            });
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
              output: 'html', // Render visual HTML only, preventing duplicate mathml elements
            });
          } catch (e) {
            return `<span class="katex-error">${formula}</span>`;
          }
        }

        // Plain text: escape basic HTML
        return part
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>');
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
