import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import MathRenderer from '../components/MathRenderer';
import QuestionPalette from '../components/QuestionPalette';
import ScratchpadModal from '../components/ScratchpadModal';
import AntiCheatGuard from '../components/AntiCheatGuard';
import TimerClock from '../components/TimerClock';
import ConfirmSubmitModal from '../components/ConfirmSubmitModal';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Send,
  Edit3,
  Shield,
  HelpCircle,
  Check,
  LayoutGrid,
  X,
} from 'lucide-react';

export const ExamWorkspace = () => {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [error, setError] = useState('');

  // Initial load
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        const res = await api.startAttempt(examId);
        if (res.success) {
          setExam(res.exam);
          setAttempt(res.attempt);

          // Restore answers from attempt or local draft
          const existingAnswers = res.attempt.answers || [];
          setAnswers(existingAnswers);
        }
      } catch (err) {
        if (err.hasCompleted && err.attemptId) {
          navigate(`/results/${err.attemptId}`);
        } else {
          setError(err.message || 'Failed to initialize exam workspace');
        }
      } finally {
        setLoading(false);
      }
    };

    initWorkspace();
  }, [examId, navigate]);

  // Periodic background auto-sync to server every 20 seconds
  useEffect(() => {
    if (!attempt?._id || answers.length === 0) return;

    const interval = setInterval(() => {
      api.syncAnswers(attempt._id, answers).catch((err) => {
        console.warn('Sync warning:', err);
      });
    }, 20000);

    return () => clearInterval(interval);
  }, [attempt, answers]);

  const currentQuestion = exam?.questions ? exam.questions[currentIndex] : null;

  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?._id) || {
    questionId: currentQuestion?._id,
    selectedOption: '',
    markedForReview: false,
  };

  // Handle option select
  const handleSelectOption = (key) => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const exists = prev.some((a) => a.questionId === currentQuestion._id);
      if (exists) {
        return prev.map((a) =>
          a.questionId === currentQuestion._id ? { ...a, selectedOption: key } : a
        );
      }
      return [
        ...prev,
        {
          questionId: currentQuestion._id,
          selectedOption: key,
          markedForReview: false,
        },
      ];
    });
  };

  // Clear current response
  const handleClearResponse = () => {
    if (!currentQuestion) return;
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === currentQuestion._id ? { ...a, selectedOption: '' } : a
      )
    );
  };

  // Toggle mark for review
  const handleToggleReview = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const exists = prev.some((a) => a.questionId === currentQuestion._id);
      if (exists) {
        return prev.map((a) =>
          a.questionId === currentQuestion._id
            ? { ...a, markedForReview: !a.markedForReview }
            : a
        );
      }
      return [
        ...prev,
        {
          questionId: currentQuestion._id,
          selectedOption: '',
          markedForReview: true,
        },
      ];
    });
  };

  // Log anti-cheat violation to backend
  const handleViolation = useCallback((type, details) => {
    if (attempt?._id) {
      api.logViolation(attempt._id, type, details).catch(console.error);
    }
  }, [attempt]);

  // Final submission handler
  const handleFinalSubmit = async (isAutoSubmit = false, reason = '') => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await api.submitAttempt(attempt._id, {
        answers,
        isAutoSubmit,
      });

      // Exit fullscreen cleanly AFTER submission succeeds
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      if (res.success && res.attemptId) {
        navigate(`/results/${res.attemptId}`, { replace: true });
      }
    } catch (err) {
      if (err.attemptId || (err.message && err.message.toLowerCase().includes('already submitted'))) {
        if (typeof document !== 'undefined' && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        navigate(`/results/${attempt._id}`, { replace: true });
        return;
      }
      alert(err.message || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 1rem', color: '#94a3b8' }}>
        Preparing your secure assessment workspace...
      </div>
    );
  }

  if (error || !exam || !currentQuestion) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem' }} className="glass-card">
        <h3 style={{ color: '#f43f5e', marginBottom: '1rem' }}>Assessment Error</h3>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{error || 'Questions could not be loaded.'}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const answeredCount = answers.filter((a) => a.selectedOption && a.selectedOption.trim() !== '').length;
  const reviewCount = answers.filter((a) => a.markedForReview).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#070a13', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      
      {/* TOP WORKSPACE BAR */}
      <header className="workspace-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
          
          {/* Left: Exam Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto' }}>
            <span className={`badge badge-${exam.difficulty}`} style={{ flexShrink: 0 }}>
              {exam.difficulty}
            </span>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={exam.title}
              >
                {exam.title}
              </div>
              <div className="desktop-only" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Q <strong>{currentIndex + 1}</strong> of <strong>{exam.questions.length}</strong>
              </div>
            </div>
          </div>

          {/* Right: Actions, Timer & Submit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Proctoring Status Pill */}
            <div style={{ display: 'inline-flex' }}>
              <AntiCheatGuard
                antiCheatSettings={exam.antiCheatSettings}
                onViolation={handleViolation}
                onAutoSubmit={() => handleFinalSubmit(true, 'Maximum anti-cheat strikes exceeded.')}
                isSubmitting={submitting}
                compact={true}
              />
            </div>

            {/* Scratchpad Button (Desktop Only - mobile has it in sub-bar) */}
            <button
              type="button"
              onClick={() => setShowScratchpad(true)}
              className="btn-secondary desktop-only"
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              title="Open Scratchpad"
            >
              <Edit3 size={14} color="#818cf8" />
              <span>Scratchpad</span>
            </button>

            {/* Countdown Clock */}
            <TimerClock
              durationMinutes={exam.durationMinutes}
              startedAt={attempt?.startedAt}
              onTimeUp={() => handleFinalSubmit(true, 'Time limit expired.')}
            />

            {/* Finish & Submit Button */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: '#34d399',
                minHeight: '34px',
              }}
            >
              <Send size={14} />
              <span>Finish</span>
            </button>
          </div>
        </div>

        {/* Mobile Quick Action Sub-bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '6px',
            marginTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>Question <strong>{currentIndex + 1}</strong>/<strong>{exam.questions.length}</strong></span>
            <span>•</span>
            <span style={{ color: '#34d399' }}>{answeredCount} ans</span>
            {reviewCount > 0 && (
              <>
                <span>•</span>
                <span style={{ color: '#fbbf24' }}>{reviewCount} rev</span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setShowScratchpad(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                fontSize: '0.72rem',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              <Edit3 size={12} color="#818cf8" />
              <span>Scratchpad</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMobilePalette(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 9px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#a5b4fc',
                cursor: 'pointer',
              }}
            >
              <LayoutGrid size={12} />
              <span>Palette</span>
            </button>
          </div>
        </div>
      </header>

      {/* WORKSPACE MAIN BODY */}
      <main className="workspace-main-grid">
        
        {/* QUESTION DISPLAY & INTERACTION CARD */}
        <div className="glass-card question-workspace-card">
          
          {/* Question Metadata Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.85rem',
            marginBottom: '1.25rem',
            gap: '8px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#6366f1',
                color: '#fff',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                flexShrink: 0,
              }}>
                Q{currentIndex + 1}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                Topic: <strong style={{ color: 'var(--text-main)' }}>{currentQuestion.topic}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
              <span>Marks: <strong style={{ color: '#34d399' }}>+{currentQuestion.points || 1}</strong></span>
              {exam.negativeMarking && (
                <span style={{ color: '#f87171' }}>
                  (-{currentQuestion.negativePoints !== undefined ? currentQuestion.negativePoints : exam.negativeMarkingRate || 0.25})
                </span>
              )}
            </div>
          </div>

          {/* Question Statement with KaTeX */}
          <div style={{
            fontSize: 'clamp(1rem, 2.8vw, 1.15rem)',
            color: '#f8fafc',
            lineHeight: 1.7,
            marginBottom: '1.75rem',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}>
            <MathRenderer text={currentQuestion.questionText} />
          </div>

          {/* MCQ Options List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
            {currentQuestion.options.map((option) => {
              const isSelected = currentAnswer.selectedOption === option.key;

              return (
                <div
                  key={option.key}
                  onClick={() => handleSelectOption(option.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                    boxShadow: isSelected ? '0 0 20px rgba(99, 102, 241, 0.3)' : 'none',
                    minHeight: '48px',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Option Key Badge (A, B, C, D) */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                    background: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                  }}>
                    {isSelected ? <Check size={18} /> : option.key}
                  </div>

                  {/* Option Text with Math Rendering */}
                  <div style={{
                    fontSize: '0.95rem',
                    color: isSelected ? '#ffffff' : '#cbd5e1',
                    flex: 1,
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    wordBreak: 'break-word',
                  }}>
                    <MathRenderer text={option.text} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Toolbar */}
          <div style={{
            marginTop: 'auto',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {/* Secondary Controls Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleToggleReview}
                  className="btn-secondary"
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    background: currentAnswer.markedForReview ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    borderColor: currentAnswer.markedForReview ? '#f59e0b' : 'var(--border-subtle)',
                    color: currentAnswer.markedForReview ? '#fbbf24' : '#94a3b8',
                    minHeight: '40px',
                  }}
                >
                  <Bookmark size={14} />
                  <span>{currentAnswer.markedForReview ? 'Marked' : 'Mark Review'}</span>
                </button>

                {currentAnswer.selectedOption && (
                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '0.82rem', color: '#94a3b8', minHeight: '40px' }}
                    title="Clear selected option"
                  >
                    <RotateCcw size={13} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Mobile Palette Button */}
              <button
                type="button"
                onClick={() => setShowMobilePalette(true)}
                className="btn-secondary"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  minHeight: '40px',
                  color: '#a5b4fc',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                }}
              >
                <LayoutGrid size={14} />
                <span>Palette</span>
              </button>
            </div>

            {/* Primary Navigation Buttons Row */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="btn-secondary"
                style={{ flex: '1', minHeight: '44px', padding: '10px 14px', fontSize: '0.88rem' }}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              {currentIndex < exam.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  className="btn-primary"
                  style={{ flex: '1.5', minHeight: '44px', padding: '10px 18px', fontSize: '0.88rem' }}
                >
                  <span>Save & Next</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="btn-primary"
                  style={{
                    flex: '1.5',
                    minHeight: '44px',
                    padding: '10px 18px',
                    fontSize: '0.88rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderColor: '#34d399',
                  }}
                >
                  <span>Review & Finish</span>
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* DESKTOP COLUMN: QUESTION PALETTE */}
        <div className="desktop-palette-container">
          <QuestionPalette
            questions={exam.questions}
            answers={answers}
            currentIndex={currentIndex}
            onSelectQuestion={(idx) => setCurrentIndex(idx)}
          />
        </div>

      </main>

      {/* MOBILE QUESTION PALETTE BOTTOM DRAWER */}
      {showMobilePalette && (
        <div
          className="mobile-bottom-sheet-overlay"
          onClick={() => setShowMobilePalette(false)}
        >
          <div
            className="mobile-bottom-sheet-container"
            onClick={(e) => e.stopPropagation()}
          >
            <QuestionPalette
              questions={exam.questions}
              answers={answers}
              currentIndex={currentIndex}
              onSelectQuestion={(idx) => {
                setCurrentIndex(idx);
                setShowMobilePalette(false);
              }}
              onClose={() => setShowMobilePalette(false)}
            />
          </div>
        </div>
      )}

      {/* Virtual Scratchpad Modal */}
      <ScratchpadModal
        isOpen={showScratchpad}
        onClose={() => setShowScratchpad(false)}
      />

      {/* Confirm Submission Modal */}
      <ConfirmSubmitModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => handleFinalSubmit(false)}
        totalQuestions={exam.questions.length}
        answeredCount={answeredCount}
        reviewCount={reviewCount}
        isSubmitting={submitting}
      />

    </div>
  );
};

export default ExamWorkspace;
