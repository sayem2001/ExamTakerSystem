import React, { useMemo, useState } from 'react';
import MathRenderer from './MathRenderer';
import {
  CheckCircle,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Bookmark,
  ArrowRight,
  Sparkles,
  Layers,
  Award,
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

  // Pre-clean LaTeX corruptions
  let cleaned = rawText
    .replace(/\\?(?:ext|\\ext)\b/g, '\\text')
    .replace(/\\?(?:imes|\\imes)\b/g, '\\times')
    .replace(/\\?(?:rac|\\rac)\b/g, '\\frac')
    .replace(/\\?(?:ightarrow|\\ightarrow)\b/g, '\\rightarrow')
    .replace(/\b(\d+(?:\.\d+)?%?)\1\b/g, '$1')
    .trim();

  // Check if text already contains markdown section headers (### or **)
  const hasStructuredHeaders =
    /###\s*(?:Problem Breakdown|Given Data|Core Formula|Step-by-Step|Conclusion|Trap)/i.test(cleaned) ||
    /\*\*(?:Problem Breakdown|Core Concept|Step-by-Step|Conclusion|Trap Alert)\*\*/i.test(cleaned);

  if (hasStructuredHeaders) {
    let givenData = '';
    let formula = '';
    let steps = [];
    let conclusion = '';
    let trapAlert = '';

    // Split sections by header
    const sectionRegex = /(?:###|\*\*)\s*(Problem Breakdown|Given Data|Core Formula|Core Concept|Strategy|Step-by-Step Derivation|Detailed Steps|Derivation|Conclusion|Correct Answer|Trap & Common Mistake Alert|Common Trap|Key Pitfall)[:*#\s]*([\s\S]*?)(?=(?:###|\*\*)\s*(?:Problem Breakdown|Given Data|Core Formula|Core Concept|Strategy|Step-by-Step Derivation|Detailed Steps|Derivation|Conclusion|Correct Answer|Trap & Common Mistake Alert|Common Trap|Key Pitfall)|$)/gi;

    let match;
    let foundAny = false;
    while ((match = sectionRegex.exec(cleaned)) !== null) {
      foundAny = true;
      const title = match[1].toLowerCase();
      const content = match[2].trim();

      if (title.includes('breakdown') || title.includes('given')) {
        givenData = content;
      } else if (title.includes('formula') || title.includes('concept') || title.includes('strategy')) {
        formula = content;
      } else if (title.includes('step') || title.includes('derivation')) {
        // Extract individual numbered steps
        const stepLines = content.split(/(?=\n\s*(?:[-*]\s*)?(?:\*\*Step\s*\d+|\bStep\s*\d+|\d+\.)\b)/i);
        steps = stepLines
          .map((s) => s.trim())
          .filter((s) => s.length > 5);
        if (steps.length === 0 && content) {
          steps = [content];
        }
      } else if (title.includes('conclusion') || title.includes('answer')) {
        conclusion = content;
      } else if (title.includes('trap') || title.includes('pitfall') || title.includes('mistake')) {
        trapAlert = content;
      }
    }

    if (foundAny) {
      return { givenData, formula, steps, conclusion, trapAlert, raw: cleaned };
    }
  }

  // Fallback / Legacy Parser: Extract from numbered points and paragraphs
  let givenData = '';
  let steps = [];
  let conclusion = '';
  let trapAlert = '';
  let formula = '';

  // Extract Trap alert if present at bottom
  const trapMatch = cleaned.match(/(?:Common [Tt]rap|Key [Pp]itfall|Trap [Aa]lert|Beware)[:\s]+([\s\S]+)$/i);
  if (trapMatch) {
    trapAlert = trapMatch[1].trim();
    cleaned = cleaned.slice(0, trapMatch.index).trim();
  }

  // Extract Conclusion if present at bottom
  const conclusionMatch = cleaned.match(/(?:Therefore|Thus|Hence|In conclusion|Consequently),?[\s\S]+?(?:Option\s+[A-E]|correct|is the answer)[\s\S]*$/i);
  if (conclusionMatch) {
    conclusion = conclusionMatch[0].trim();
    cleaned = cleaned.slice(0, conclusionMatch.index).trim();
  }

  // Look for numbered steps: "1. ... 2. ... 3. ..."
  const stepSplitRegex = /(?:\n|^)\s*(\d+)[\.\)]\s+/g;
  const matches = [...cleaned.matchAll(stepSplitRegex)];

  if (matches.length >= 2) {
    // Everything before the first numbered step is "Given Data"
    const firstStepIdx = matches[0].index;
    if (firstStepIdx > 0) {
      givenData = cleaned.substring(0, firstStepIdx).trim();
    }

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : cleaned.length;
      const stepText = cleaned.substring(start, end).trim();
      if (stepText) {
        steps.push(stepText);
      }
    }
  } else {
    // Single block or bullet points
    const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 2) {
      givenData = lines[0];
      steps = lines.slice(1);
    } else {
      steps = [cleaned];
    }
  }

  return { givenData, formula, steps, conclusion, trapAlert, raw: cleaned };
}

export const ExplanationRenderer = ({
  explanation = '',
  correctOption = '',
  className = '',
  defaultExpanded = true,
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
      className={`explanation-container ${className}`}
      style={{
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass-card, rgba(30, 27, 75, 0.25))',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
        marginTop: '1rem',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Header Bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
          borderBottom: expanded ? '1px solid rgba(129, 140, 248, 0.2)' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Lightbulb size={16} />
          </div>

          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Detailed Solution & Problem Breakdown</span>
              {correctOption && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#10b981',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle size={12} />
                  <span>Correct: Option {correctOption}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          <span>{expanded ? 'Collapse' : 'Expand Solution'}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded Content Body */}
      {expanded && (
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Section 1: Problem Breakdown & Given Data */}
          {parsed.givenData && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.18)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '10px' }}>
                <Layers size={16} color="#818cf8" />
                <span>Step-by-Step Mathematical Derivation</span>
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
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#818cf8',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        marginTop: '2px',
                      }}
                    >
                      Step {idx + 1}
                    </div>
                    <div style={{ flex: 1, fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: 1.65 }}>
                      <MathRenderer text={step.replace(/^(?:\*\*Step\s*\d+[:\s*]*|\bStep\s*\d+[:\s*]*|\d+[\.\)]\s*)/i, '')} />
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
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
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
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  Conclusion & Final Answer
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.6 }}>
                  <MathRenderer text={parsed.conclusion} />
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
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.28)',
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
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  Competitive Exam Trap / Common Pitfall
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <MathRenderer text={parsed.trapAlert.replace(/^⚠️\s*/, '')} />
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default ExplanationRenderer;
