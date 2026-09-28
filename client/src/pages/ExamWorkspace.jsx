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
      // Exit fullscreen before redirect
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      const res = await api.submitAttempt(attempt._id, {
        answers,
        isAutoSubmit,
      });

      if (res.success && res.attemptId) {
        navigate(`/results/${res.attemptId}`, { replace: true });
      }
    } catch (err) {
      alert(err.message || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem', color: '#94a3b8' }}>
        Preparing your assessment workspace...
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#070a13' }}>
      
      {/* Anti-cheat Proctoring Guard */}
      <AntiCheatGuard
        antiCheatSettings={exam.antiCheatSettings}
        onViolation={handleViolation}
        onAutoSubmit={() => handleFinalSubmit(true, 'Maximum anti-cheat strikes exceeded.')}
      />

      {/* TOP WORKSPACE BAR */}
      <header style={{
        background: 'rgba(15, 20, 34, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        {/* Left: Exam Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`badge badge-${exam.difficulty}`}>
                {exam.difficulty}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                {exam.title}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Question <strong>{currentIndex + 1}</strong> of <strong>{exam.questions.length}</strong>
            </div>
          </div>
        </div>

        {/* Right: Actions, Timer & Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Scratchpad Button */}
          <button
            onClick={() => setShowScratchpad(true)}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            title="Open Virtual Scratchpad"
          >
            <Edit3 size={15} color="#818cf8" />
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
            onClick={() => setShowConfirmModal(true)}
            className="btn-primary"
            style={{
              padding: '6px 16px',
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderColor: '#34d399',
            }}
          >
            <Send size={15} />
            <span>Finish Exam</span>
          </button>
        </div>
      </header>

      {/* WORKSPACE MAIN BODY (Question Area + Question Palette) */}
      <main style={{
        flex: 1,
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 340px',
        gap: '1.5rem',
        alignItems: 'start',
      }}>
        
        {/* QUESTION DISPLAY & INTERACTION CARD */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
          
          {/* Question Metadata Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#6366f1',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}>
                Q{currentIndex + 1}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Topic: <strong>{currentQuestion.topic}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
              <span>Marks: <strong>+{currentQuestion.points || 1}</strong></span>
              {exam.negativeMarking && (
                <span style={{ color: '#f87171' }}>
                  (-{currentQuestion.negativePoints !== undefined ? currentQuestion.negativePoints : exam.negativeMarkingRate || 0.25})
                </span>
              )}
            </div>
          </div>

          {/* Question Statement with KaTeX */}
          <div style={{ fontSize: '1.15rem', color: '#f8fafc', lineHeight: 1.7, marginBottom: '2rem' }}>
            <MathRenderer text={currentQuestion.questionText} />
          </div>

          {/* MCQ Options List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2.5rem' }}>
            {currentQuestion.options.map((option) => {
              const isSelected = currentAnswer.selectedOption === option.key;

              return (
                <div
                  key={option.key}
                  onClick={() => handleSelectOption(option.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                    boxShadow: isSelected ? '0 0 20px rgba(99, 102, 241, 0.3)' : 'none',
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
                    fontSize: '0.9rem',
                    flexShrink: 0,
                    background: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                  }}>
                    {isSelected ? <Check size={18} /> : option.key}
                  </div>

                  {/* Option Text with Math Rendering */}
                  <div style={{ fontSize: '1rem', color: isSelected ? '#ffffff' : '#cbd5e1', flex: 1 }}>
                    <MathRenderer text={option.text} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Toolbar */}
          <div style={{
            marginTop: 'auto',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}>
            {/* Left Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleToggleReview}
                className="btn-secondary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                  background: currentAnswer.markedForReview ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  borderColor: currentAnswer.markedForReview ? '#f59e0b' : 'var(--border-subtle)',
                  color: currentAnswer.markedForReview ? '#fbbf24' : '#94a3b8',
                }}
              >
                <Bookmark size={15} />
                <span>{currentAnswer.markedForReview ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>

              {currentAnswer.selectedOption && (
                <button
                  onClick={handleClearResponse}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.85rem', color: '#94a3b8' }}
                  title="Clear selected option"
                >
                  <RotateCcw size={14} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              {currentIndex < exam.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                >
                  <span>Save & Next</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  <span>Review & Finish</span>
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: QUESTION PALETTE */}
        <div>
          <QuestionPalette
            questions={exam.questions}
            answers={answers}
            currentIndex={currentIndex}
            onSelectQuestion={(idx) => setCurrentIndex(idx)}
          />
        </div>

      </main>

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
