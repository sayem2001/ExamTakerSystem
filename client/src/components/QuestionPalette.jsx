import React, { useState } from 'react';
import { Filter, CheckCircle2, Bookmark, HelpCircle, X } from 'lucide-react';

export const QuestionPalette = ({
  questions = [],
  answers = [],
  currentIndex = 0,
  onSelectQuestion,
  onClose = null,
}) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'answered' | 'unanswered' | 'review'

  const answerMap = {};
  answers.forEach((ans) => {
    answerMap[ans.questionId] = ans;
  });

  const getStatus = (question) => {
    const ans = answerMap[question._id];
    const hasAnswer = ans && ans.selectedOption && ans.selectedOption.trim() !== '';
    const isReview = ans && ans.markedForReview;

    if (hasAnswer && isReview) return 'answered-review';
    if (hasAnswer) return 'answered';
    if (isReview) return 'review';
    return 'unanswered';
  };

  const answeredCount = questions.filter((q) => {
    const st = getStatus(q);
    return st === 'answered' || st === 'answered-review';
  }).length;

  const reviewCount = questions.filter((q) => {
    const st = getStatus(q);
    return st === 'review' || st === 'answered-review';
  }).length;

  const unansweredCount = Math.max(0, questions.length - answeredCount);

  return (
    <div className="glass-card" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header & Metrics */}
      <div style={{ marginBottom: '0.85rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
              Question Palette
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {answeredCount}/{questions.length} completed
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#818cf8', fontFamily: 'var(--font-mono)', fontWeight: 600, background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Total: {questions.length}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Close Palette"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Status Counter Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '0.72rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '6px', padding: '4px 4px', textAlign: 'center', color: '#34d399' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{answeredCount}</div>
            <div>Answered</div>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', padding: '4px 4px', textAlign: 'center', color: '#fbbf24' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{reviewCount}</div>
            <div>Review</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '4px 4px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{unansweredCount}</div>
            <div>Unanswered</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0.85rem' }}>
        {['all', 'answered', 'unanswered', 'review'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: '5px 0',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              borderRadius: '6px',
              border: filter === f ? '1px solid #6366f1' : '1px solid transparent',
              background: filter === f ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: filter === f ? '#a5b4fc' : '#94a3b8',
              cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Question Grid (Scrollable) */}
      <div
        className="palette-grid"
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '380px',
          paddingRight: '2px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          alignContent: 'start',
        }}
      >
        {questions.map((q, idx) => {
          const status = getStatus(q);
          const isCurrent = idx === currentIndex;

          // Check if matches active filter
          if (filter === 'answered' && status !== 'answered' && status !== 'answered-review') return null;
          if (filter === 'unanswered' && status !== 'unanswered') return null;
          if (filter === 'review' && status !== 'review' && status !== 'answered-review') return null;

          let btnClass = 'palette-unanswered';
          if (status === 'answered') btnClass = 'palette-answered';
          if (status === 'review') btnClass = 'palette-review';
          if (status === 'answered-review') btnClass = 'palette-answered-review';
          if (isCurrent) btnClass += ' palette-current';

          return (
            <button
              key={q._id || idx}
              type="button"
              onClick={() => {
                onSelectQuestion(idx);
                if (onClose) onClose();
              }}
              className={`palette-btn ${btnClass}`}
              title={`Question ${idx + 1} (${status})`}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.68rem', color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981', flexShrink: 0 }}></span>
          <span>Answered</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b', flexShrink: 0 }}></span>
          <span>Review</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#8b5cf6', flexShrink: 0 }}></span>
          <span>Ans + Review</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }}></span>
          <span>Unanswered</span>
        </div>
      </div>

    </div>
  );
};

export default QuestionPalette;
