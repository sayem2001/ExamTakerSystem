import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * Parses a string containing LaTeX formulas delimited by $...$ (inline) or $$...$$ (display)
 * and renders clean HTML using KaTeX.
 */
export const MathRenderer = ({ text = '', className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!text || typeof text !== 'string') return '';

    // Split text into tokens by math delimiters
    // Pattern matches $$...$$ or $...$
    const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
    const parts = text.split(regex);

    return parts
      .map((part) => {
        if (!part) return '';

        // Display math ($$...$$)
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2).trim();
          try {
            return katex.renderToString(formula, {
              displayMode: true,
              throwOnError: false,
            });
          } catch (e) {
            return `<div class="katex-error">${formula}</div>`;
          }
        }

        // Inline math ($...$)
        if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1).trim();
          try {
            return katex.renderToString(formula, {
              displayMode: false,
              throwOnError: false,
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
