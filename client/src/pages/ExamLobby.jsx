import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Award,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const ExamLobby = () => {
  const { identifier } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await api.getExam(identifier);
        if (res.success) {
          setExam(res.exam);
          setHasAttempted(res.hasAttempted);
          setAttemptId(res.userAttemptId);
        }
      } catch (err) {
        setError(err.message || 'Could not load exam details');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [identifier, isAuthenticated]);

  const handleStartExam = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/exam/${identifier}` } } });
      return;
    }

    if (!agreed) {
      alert('Please agree to the examination rules before launching.');
      return;
    }

    setStarting(true);
    try {
      // Request fullscreen first (gracefully ignored on mobile/safari if unsupported)
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        }
      } catch (fsErr) {
        console.warn('Fullscreen not supported or allowed on this device:', fsErr);
      }

      // Initialize or resume attempt on backend
      const res = await api.startAttempt(exam._id);
      if (res.success && res.attempt) {
        navigate(`/workspace/${exam._id}`, { state: { attemptId: res.attempt._id } });
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize exam attempt');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 1.5rem', color: '#94a3b8' }}>
        Verifying exam credentials and schedule...
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <AlertTriangle size={48} color="#f43f5e" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
            Exam Not Accessible
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {error || 'The requested exam code or link is invalid or has expired.'}
          </p>
          <Link to="/dashboard" className="btn-primary">
            Return to Assessment Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '1.5rem auto 4rem', padding: '0 1rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Already Attempted Banner */}
      {hasAttempted ? (
        <div className="glass-card" style={{
          padding: 'clamp(1.5rem, 4vw, 2.5rem)',
          textAlign: 'center',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          boxShadow: '0 20px 40px -15px rgba(16, 185, 129, 0.2)',
          marginBottom: '2rem',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '2px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <CheckCircle2 size={32} color="#10b981" />
          </div>

          <h2 style={{ fontSize: 'clamp(1.35rem, 3.5vw, 1.75rem)', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
            Exam Attempt Already Completed
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto 1.75rem', lineHeight: 1.5 }}>
            You have already finalized your attempt for <strong>{exam.title}</strong>. Under the strict single-attempt policy, retakes are not permitted to ensure fairness across all participants.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {attemptId && (
              <Link to={`/results/${attemptId}`} className="btn-primary" style={{ padding: '12px 20px', minHeight: '44px' }}>
                <span>View My Results & Solutions</span>
                <ArrowRight size={16} />
              </Link>
            )}
            <Link to={`/leaderboard/exam/${exam._id}`} className="btn-secondary" style={{ padding: '12px 20px', minHeight: '44px' }}>
              <Award size={16} />
              <span>View Live Leaderboard</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Exam Pre-Flight Check & Instructions */
        <div className="glass-card" style={{ padding: 'clamp(1.25rem, 3.5vw, 2.5rem)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          
          {/* Header */}
          <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className={`badge badge-${exam.difficulty}`}>
                {exam.difficulty} Level
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                Code: {exam.examCode}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.35rem, 3.5vw, 2rem)', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem', lineHeight: 1.25 }}>
              {exam.title}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.5 }}>
              {exam.description || `Comprehensive examination on ${exam.topic}.`}
            </p>
          </div>

          {/* Key Parameters */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            marginBottom: '1.75rem',
          }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
              <Clock size={18} color="#818cf8" style={{ marginBottom: '6px' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>{exam.durationMinutes} Mins</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Time Limit</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
              <FileText size={18} color="#818cf8" style={{ marginBottom: '6px' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>{exam.questions?.length || 0} Questions</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Multiple Choice</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
              <AlertTriangle size={18} color="#f59e0b" style={{ marginBottom: '6px' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                {exam.negativeMarking ? `-${exam.negativeMarkingRate || 0.25} pts` : 'None'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Negative Marking</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
              <Award size={18} color="#10b981" style={{ marginBottom: '6px' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>{exam.passPercentage}%</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Passing Benchmark</div>
            </div>
          </div>

          {/* Examination Rules & Proctoring Advisory */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: 700, marginBottom: '0.75rem' }}>
              <ShieldAlert size={18} />
              <span>Security & Honor Code Requirements</span>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#cbd5e1' }}>
              <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                <span><strong>Proctored Environment:</strong> The test runs in a focused browser mode. Please remain inside the exam tab.</span>
              </li>
              <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                <span><strong>Tab Switch Interception:</strong> Switching apps or tabs is actively logged. Exceeding 3 strikes triggers disqualification.</span>
              </li>
              <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                <span><strong>Single-Attempt Policy:</strong> You have exactly one attempt. Answers are finalized upon submit or timer expiration.</span>
              </li>
              <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                <span><strong>Built-in Virtual Scratchpad:</strong> A digital rough notepad and drawing board is provided on-screen so you do not need external tools.</span>
              </li>
            </ul>
          </div>

          {/* Agreement Checkbox */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              fontSize: '0.88rem',
              color: '#f8fafc',
              lineHeight: 1.45,
            }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ width: '20px', height: '20px', minWidth: '20px', accentColor: '#6366f1', marginTop: '2px', cursor: 'pointer' }}
              />
              <span>
                I agree to the proctoring conditions, understand the 1-attempt rule, and certify that I will complete this assessment without unauthorized aids.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="btn-secondary" style={{ padding: '12px 20px', minHeight: '44px' }}>
              Back to Catalog
            </Link>

            <button
              onClick={handleStartExam}
              disabled={!agreed || starting}
              className="btn-primary"
              style={{
                padding: '14px 28px',
                fontSize: '0.95rem',
                opacity: agreed ? 1 : 0.5,
                minHeight: '48px',
                flex: '1 1 auto',
              }}
            >
              {starting ? (
                <span>Launching Secure Session...</span>
              ) : (
                <>
                  <Maximize2 size={18} />
                  <span>Launch & Start Exam</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default ExamLobby;
