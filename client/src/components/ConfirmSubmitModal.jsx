import React from 'react';
import { Send, AlertTriangle, X, CheckCircle, HelpCircle, Bookmark } from 'lucide-react';

export const ConfirmSubmitModal = ({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions = 0,
  answeredCount = 0,
  reviewCount = 0,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 150,
      padding: '0.75rem',
    }}>
      <div className="glass-card" style={{
        maxWidth: '520px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 'clamp(1.25rem, 3.5vw, 2rem)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: 'clamp(1.15rem, 3vw, 1.35rem)', fontWeight: 800, color: '#f8fafc' }}>
              Submit Examination?
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
              Please review your attempt summary before final submission.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Breakdown Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '1.25rem',
        }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            padding: '10px 6px',
            textAlign: 'center',
          }}>
            <CheckCircle size={18} color="#10b981" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>{answeredCount}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Answered</div>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '10px',
            padding: '10px 6px',
            textAlign: 'center',
          }}>
            <Bookmark size={18} color="#f59e0b" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>{reviewCount}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>In Review</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '10px 6px',
            textAlign: 'center',
          }}>
            <HelpCircle size={18} color="#94a3b8" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#e2e8f0' }}>{unansweredCount}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Unanswered</div>
          </div>
        </div>

        {/* Important Warning Notice */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '8px',
          padding: '0.85rem',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
        }}>
          <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', color: '#fef3c7', lineHeight: 1.45 }}>
            <strong>One-Attempt Strict Policy:</strong> Once you submit, your responses are finalized and you will <em>not</em> be able to retake this exam.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap-reverse' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary"
            style={{ flex: '1 1 120px', minHeight: '44px', padding: '10px 14px', fontSize: '0.85rem' }}
          >
            Review Questions
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="btn-primary"
            style={{
              flex: '1.5 1 180px',
              minHeight: '44px',
              padding: '10px 18px',
              fontSize: '0.9rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderColor: '#34d399',
            }}
          >
            {isSubmitting ? (
              <span>Grading & Submitting...</span>
            ) : (
              <>
                <Send size={15} />
                <span>Confirm & Submit</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmSubmitModal;
