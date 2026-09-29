import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import MathRenderer from '../components/MathRenderer';
import ExplanationRenderer from '../components/ExplanationRenderer';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Filter,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export const ExamResults = () => {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'correct' | 'wrong' | 'unanswered'

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.getAttemptResults(attemptId);
        if (res.success) {
          setResult(res);

          // Confetti celebration if passed
          if (res.attempt?.passed || res.attempt?.percentage >= 60) {
            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        }
      } catch (err) {
        setError(err.message || 'Could not load attempt results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [attemptId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem', color: '#94a3b8' }}>
        Calculating your performance metrics and ranking...
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem' }} className="glass-card">
        <h3 style={{ color: '#f43f5e', marginBottom: '1rem' }}>Result Not Found</h3>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{error}</p>
        <Link to="/dashboard" className="btn-primary">Return to Catalog</Link>
      </div>
    );
  }

  const { attempt, stats } = result;
  const exam = attempt.exam || {};

  const minutes = Math.floor((attempt.durationSeconds || 0) / 60);
  const seconds = (attempt.durationSeconds || 0) % 60;

  // Filter questions
  const filteredAnswers = (attempt.answers || []).filter((ans) => {
    if (reviewFilter === 'correct') return ans.isCorrect;
    if (reviewFilter === 'wrong') return ans.selectedOption && !ans.isCorrect;
    if (reviewFilter === 'unanswered') return !ans.selectedOption;
    return true;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto 5rem', padding: '0 1.5rem' }}>
      
      {/* SCORE CARD HEADER */}
      <div className="glass-card" style={{
        padding: '2.5rem',
        marginBottom: '2.5rem',
        background: 'linear-gradient(135deg, rgba(24, 33, 56, 0.95) 0%, rgba(15, 20, 34, 0.95) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={`badge badge-${exam.difficulty}`}>
                {exam.difficulty} Level
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                {exam.examCode}
              </span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc' }}>
              {exam.title} — Official Result
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              Completed by <strong>{attempt.user?.name}</strong> • Submitted on {new Date(attempt.submittedAt).toLocaleDateString()} at {new Date(attempt.submittedAt).toLocaleTimeString()}
            </p>
          </div>

          {/* Leaderboard CTA Button */}
          <Link
            to={`/leaderboard/exam/${exam._id}`}
            className="btn-primary"
            style={{
              padding: '12px 24px',
              fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderColor: '#fbbf24',
              color: '#ffffff',
            }}
          >
            <Award size={18} />
            <span>View Live Leaderboard</span>
          </Link>
        </div>

        {/* METRICS GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}>
          {/* Final Score */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Score</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1', marginTop: '4px' }}>
              {attempt.score} <span style={{ fontSize: '1rem', color: '#64748b' }}>/ {attempt.maxScore}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: attempt.passed ? '#34d399' : '#f87171', fontWeight: 600 }}>
              {attempt.passed ? 'Passed Assessment' : 'Needs Review'}
            </div>
          </div>

          {/* Current Rank */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Rank</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
              #{stats?.rank || 1} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>of {stats?.totalParticipants || 1}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
              Top {100 - (stats?.percentile || 0)}% Percentile
            </div>
          </div>

          {/* Accuracy */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accuracy Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {stats?.accuracyPercentage || 0}%
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {attempt.correctCount} Correct • {attempt.wrongCount} Wrong
            </div>
          </div>

          {/* Time Taken */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Consumed</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#e2e8f0', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {minutes}m {seconds}s
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Limit: {exam.durationMinutes} mins
            </div>
          </div>
        </div>

      </div>

      {/* QUESTION REVIEW & STEP-BY-STEP SOLUTIONS */}
      <section>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
              Comprehensive Question Solutions
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Detailed mathematical derivations and answer verification.
            </p>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '8px' }}>
            {[
              { label: `All (${attempt.answers?.length || 0})`, value: 'all' },
              { label: `Correct (${attempt.correctCount})`, value: 'correct' },
              { label: `Wrong (${attempt.wrongCount})`, value: 'wrong' },
              { label: `Unanswered (${attempt.unansweredCount})`, value: 'unanswered' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setReviewFilter(f.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: reviewFilter === f.value ? '#6366f1' : 'transparent',
                  color: reviewFilter === f.value ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredAnswers.map((ans, idx) => {
            const q = ans.question;
            if (!q) return null;

            const isCorrect = ans.isCorrect;
            const isUnanswered = !ans.selectedOption;

            return (
              <div
                key={q._id || idx}
                className="glass-card"
                style={{
                  padding: '1.75rem',
                  borderLeft: isCorrect
                    ? '4px solid #10b981'
                    : isUnanswered
                    ? '4px solid #64748b'
                    : '4px solid #f43f5e',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>
                      Question #{idx + 1}
                    </span>
                    <span className={`badge badge-${q.difficulty}`}>
                      {q.difficulty}
                    </span>
                  </div>

                  <div>
                    {isCorrect ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399', fontSize: '0.85rem', fontWeight: 700 }}>
                        <CheckCircle size={16} /> Correct (+{ans.pointsEarned} pts)
                      </span>
                    ) : isUnanswered ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.85rem' }}>
                        <HelpCircle size={16} /> Unanswered (0 pts)
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171', fontSize: '0.85rem', fontWeight: 700 }}>
                        <XCircle size={16} /> Incorrect ({ans.pointsEarned} pts)
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <div style={{ fontSize: '1.05rem', color: '#f8fafc', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  <MathRenderer text={q.questionText} />
                </div>

                {/* Options Review Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '1.25rem' }}>
                  {q.options.map((opt) => {
                    const isCandidateChoice = ans.selectedOption === opt.key;
                    const isTheCorrectOption = q.correctOption === opt.key;

                    let bg = 'rgba(255, 255, 255, 0.02)';
                    let border = 'var(--border-subtle)';
                    let textColor = '#cbd5e1';

                    if (isTheCorrectOption) {
                      bg = 'rgba(16, 185, 129, 0.15)';
                      border = '1px solid #10b981';
                      textColor = '#34d399';
                    } else if (isCandidateChoice && !isCorrect) {
                      bg = 'rgba(244, 63, 94, 0.15)';
                      border = '1px solid #f43f5e';
                      textColor = '#f87171';
                    }

                    return (
                      <div
                        key={opt.key}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: bg,
                          border,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '0.9rem',
                          color: textColor,
                        }}
                      >
                        <span style={{ fontWeight: 700, minWidth: '22px' }}>{opt.key})</span>
                        <div style={{ flex: 1 }}>
                          <MathRenderer text={opt.text} />
                        </div>
                        {isTheCorrectOption && <Check size={16} color="#10b981" />}
                        {isCandidateChoice && !isCorrect && <X size={16} color="#f43f5e" />}
                      </div>
                    );
                  })}
                </div>

                {/* Mathematical Step-by-Step Explanation */}
                {q.explanation && (
                  <ExplanationRenderer
                    explanation={q.explanation}
                    correctOption={q.correctOption}
                  />
                )}

              </div>
            );
          })}
        </div>

      </section>

    </div>
  );
};

export default ExamResults;
