import React, { useMemo, useState } from 'react';
import MathRenderer, { sanitizeMathText } from './MathRenderer';
import {
  CheckCircle,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';

/**
 * Intelligent Parser to break down raw mathematical explanations
 * into rich, structured pedagogical sections.
 */
function parseExplanationSections(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      givenData: '',
      formula: '',
      steps: [],
      conclusion: '',
      trapAlert: '',
      raw: '',
    };
  }

  // Pre-clean LaTeX corruptions and unescape literal \n
  const cleaned = sanitizeMathText(rawText);

  let givenData = '';
  let formula = '';
  let steps = [];
  let conclusion = '';
  let trapAlert = '';

  // Extract sections by markdown heading (### Title or **Title**)
  const sectionRegex = /(?:###|\*\*)\s*([^\n*#]+?)(?:\*\*|#|\n|$)([\s\S]*?)(?=(?:###|\*\*)\s*[^\n*#]+?(?:\*\*|#|\n|$)|$)/g;
  let match;
  let hasStructuredHeaders = false;

  while ((match = sectionRegex.exec(cleaned)) !== null) {
    hasStructuredHeaders = true;
    const title = match[1].toLowerCase().trim();
    let content = match[2].trim();

    if (title.includes('breakdown') || title.includes('given') || title.includes('condition')) {
      givenData = content;
    } else if (title.includes('formula') || title.includes('principle') || title.includes('strategy') || title.includes('concept')) {
      formula = content;
    } else if (title.includes('step') || title.includes('derivation')) {
      // Split into individual numbered steps
      const rawSteps = content
        .split(/(?=\n\s*(?:[-*]\s*)?(?:\*\*Step\s*\d+|\bStep\s*\d+|\d+\.)\b)/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 3);
      steps = rawSteps;
      if (steps.length === 0 && content) {
        steps = [content];
      }
    } else if (title.includes('conclusion') || title.includes('answer') || title.includes('result')) {
      conclusion = content;
    } else if (title.includes('trap') || title.includes('pitfall') || title.includes('mistake') || title.includes('beware')) {
      trapAlert = content;
    }
  }

  if (hasStructuredHeaders && (givenData || formula || steps.length > 0 || conclusion || trapAlert)) {
    return { givenData, formula, steps, conclusion, trapAlert, raw: cleaned };
  }

  // Fallback / Legacy Parser: Extract from numbered points and paragraphs
  let legacyText = cleaned;

  // Extract Trap alert if present at bottom
  const trapMatch = legacyText.match(/(?:Common [Tt]rap|Key [Pp]itfall|Trap [Aa]lert|Beware)[:\s]+([\s\S]+)$/i);
  if (trapMatch) {
    trapAlert = trapMatch[1].trim();
    legacyText = legacyText.slice(0, trapMatch.index).trim();
  }

  // Extract Conclusion if present at bottom
  const conclusionMatch = legacyText.match(/(?:Therefore|Thus|Hence|In conclusion|Consequently),?[\s\S]+?(?:Option\s+[A-E]|correct|is the answer)[\s\S]*$/i);
  if (conclusionMatch) {
    conclusion = conclusionMatch[0].trim();
    legacyText = legacyText.slice(0, conclusionMatch.index).trim();
  }

  // Look for numbered steps: "1. ... 2. ... 3. ..."
  const stepSplitRegex = /(?:\n|^)\s*(\d+)[\.\)]\s+/g;
  const matches = [...legacyText.matchAll(stepSplitRegex)];

  if (matches.length >= 2) {
    const firstStepIdx = matches[0].index;
    if (firstStepIdx > 0) {
      givenData = legacyText.substring(0, firstStepIdx).trim();
    }

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : legacyText.length;
      const stepText = legacyText.substring(start, end).trim();
      if (stepText) {
        steps.push(stepText);
      }
    }
  } else {
    const lines = legacyText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 2) {
      givenData = lines[0];
      steps = lines.slice(1);
    } else {
      steps = [legacyText];
    }
  }

  return { givenData, formula, steps, conclusion, trapAlert, raw: cleaned };
}

/**
 * Clean step text so redundant leading "Step 1: " or "- Step 1: " isn't repeated inside step cards
 */
function cleanStepContent(text) {
  if (!text) return '';
  return text
    .replace(/^\s*[-*]?\s*(?:\*\*Step\s*\d+[:\s*]*|\bStep\s*\d+[:\s*]*|\d+[\.\)]\s*)/i, '')
    .trim();
}

export const ExplanationRenderer = ({
  explanation = '',
  correctOption = '',
  className = '',
  defaultExpanded = false, // Collapsed by default as requested
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const parsed = useMemo(() => {
    return parseExplanationSections(explanation);
  }, [explanation]);

  if (!explanation || explanation.trim().length === 0) {
    return null;
  }

  return (
    <div
      className={`explanation-expander ${className}`}
      style={{
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        overflow: 'hidden',
        marginTop: '1rem',
        boxShadow: expanded
          ? '0 8px 30px -4px rgba(0, 0, 0, 0.25)'
          : '0 2px 8px -2px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Expander Header Bar - Always visible, clickable toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: expanded
            ? 'rgba(99, 102, 241, 0.08)'
            : 'var(--bg-card)',
          border: 'none',
          borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!expanded) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
        }}
        onMouseLeave={(e) => {
          if (!expanded) e.currentTarget.style.background = 'var(--bg-card)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              flexShrink: 0,
            }}
          >
            <Lightbulb size={18} />
          </div>

          <div>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span>Detailed Solution & Step-by-Step Breakdown</span>
              {correctOption && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={12} />
                  <span>Correct: Option {correctOption}</span>
                </span>
              )}
            </div>
            {!expanded && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Click to expand full mathematical derivation, formulas & key traps
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: expanded ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: expanded ? '#818cf8' : 'var(--text-muted)',
            fontSize: '0.825rem',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <span>{expanded ? 'Collapse' : 'View Solution'}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Content Body */}
      {expanded && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            background: 'var(--bg-card)',
          }}
        >
          {/* Section 1: Problem Breakdown & Given Data */}
          {parsed.givenData && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.04)',
                border: '1px solid rgba(99, 102, 241, 0.16)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#818cf8',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Bookmark size={15} />
                <span>Problem Breakdown & Given Conditions</span>
              </div>
              <div style={{ fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: 1.65 }}>
                <MathRenderer text={parsed.givenData} />
              </div>
            </div>
          )}

          {/* Section 2: Core Formula / Mathematical Principle */}
          {parsed.formula && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.04)',
                border: '1px solid rgba(6, 182, 212, 0.18)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#06b6d4',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Sparkles size={15} />
                <span>Governing Mathematical Principle / Formula</span>
              </div>
              <div style={{ fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: 1.65 }}>
                <MathRenderer text={parsed.formula} />
              </div>
            </div>
          )}

          {/* Section 3: Step-by-Step Derivation */}
          {parsed.steps.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <Layers size={16} color="#818cf8" />
                  <span>Step-by-Step Mathematical Derivation</span>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-secondary)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {parsed.steps.length} {parsed.steps.length === 1 ? 'Step' : 'Steps'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {parsed.steps.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: '#818cf8',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        marginTop: '2px',
                      }}
                    >
                      Step {idx + 1}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: '0.925rem',
                        color: 'var(--text-main)',
                        lineHeight: 1.65,
                      }}
                    >
                      <MathRenderer text={cleanStepContent(step)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Conclusion & Option Confirmation */}
          {parsed.conclusion && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.22)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <CheckCircle size={16} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#10b981',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  Conclusion & Final Answer
                </div>
                <div style={{ fontSize: '0.925rem', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.6 }}>
                  <MathRenderer text={parsed.conclusion.replace(/^[-*]\s*/, '')} />
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Trap Alert & Common Pitfall */}
          {parsed.trapAlert && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.22)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <AlertTriangle size={15} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#f59e0b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  Competitive Exam Trap / Common Pitfall
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <MathRenderer text={parsed.trapAlert.replace(/^⚠️\s*/, '').replace(/^[-*]\s*/, '')} />
                </div>
              </div>
            </div>
          )}

          {/* Bottom Collapse Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-main)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <span>Collapse Solution</span>
              <ChevronUp size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplanationRenderer;
