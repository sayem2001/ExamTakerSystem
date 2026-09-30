import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Clock,
  Award,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  FileText,
  Calendar,
  Shield,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  Trash2,
  PieChart,
  BarChart2,
  CheckSquare,
  XCircle,
  Target,
  Layers,
  Lock,
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Dashboard View: 'official' | 'practice' | 'performance'
  const [activeTab, setActiveTab] = useState('official');

  // Official Exams State
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Practice Exams State
  const [practiceExams, setPracticeExams] = useState([]);
  const [loadingPractice, setLoadingPractice] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Performance Analytics State
  const [performance, setPerformance] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  useEffect(() => {
    fetchExams();
  }, [selectedTopic, selectedDifficulty]);

  useEffect(() => {
    if (activeTab === 'practice') {
      fetchPracticeExams();
    } else if (activeTab === 'performance') {
      fetchPerformance();
    }
  }, [activeTab]);

  const fetchExams = async () => {
    try {
      setLoadingExams(true);
      const res = await api.getExams({
        topic: selectedTopic,
        difficulty: selectedDifficulty,
      });
      if (res.success) {
        setExams(res.exams);
      }
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchPracticeExams = async () => {
    try {
      setLoadingPractice(true);
      const res = await api.getMyPracticeExams();
      if (res.success) {
        setPracticeExams(res.exams);
      }
    } catch (err) {
      console.error('Failed to fetch practice exams:', err);
    } finally {
      setLoadingPractice(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      setLoadingPerformance(true);
      const res = await api.getMyPerformance();
      if (res.success) {
        setPerformance(res);
      }
    } catch (err) {
      console.error('Failed to fetch performance analytics:', err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  const handleDeletePractice = async (examId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this personal practice exam?')) return;
    try {
      setDeletingId(examId);
      const res = await api.deletePracticeExam(examId);
      if (res.success) {
        setPracticeExams((prev) => prev.filter((ex) => ex._id !== examId));
      }
    } catch (err) {
      alert(err.message || 'Failed to delete practice exam');
    } finally {
      setDeletingId(null);
    }
  };

  // Derive unique topics for official filter
  const topics = ['All', ...new Set(exams.map((e) => e.topic).filter(Boolean))];

  // Filter official exams by search query
  const filteredExams = exams.filter((exam) => {
    const q = searchQuery.toLowerCase();
    return (
      exam.title.toLowerCase().includes(q) ||
      exam.topic.toLowerCase().includes(q) ||
      (exam.examCode && exam.examCode.toLowerCase().includes(q))
    );
  });

  const completedCount = exams.filter((e) => e.hasAttempted).length;

  return (
    <div className="page-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 3.5rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Welcome Banner */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem 1.75rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(24, 33, 56, 0.9) 0%, rgba(15, 20, 34, 0.9) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
            <TrendingUp size={16} />
            <span>Student Portal</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            Welcome back, {user?.name || 'Candidate'}!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px', maxWidth: '650px', lineHeight: 1.5 }}>
            Browse scheduled assessments, generate private AI practice tests from your study PDFs, and monitor your personal mastery metrics.
          </p>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link
            to="/practice/ai"
            className="btn-primary"
            style={{
              padding: '12px 20px',
              fontSize: '0.9rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Sparkles size={16} />
            <span>Generate AI Practice Set</span>
          </Link>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div
        className="horizontal-scroll-row"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
          paddingBottom: '2px',
          width: '100%',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('official')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            fontSize: '0.92rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'official' ? '3px solid #6366f1' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'official' ? '#818cf8' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <BookOpen size={18} />
          <span>Official Assessments ({exams.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('practice')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            fontSize: '0.92rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'practice' ? '3px solid #6366f1' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'practice' ? '#818cf8' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={18} />
          <span>My AI Practice Sets ({practiceExams.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            fontSize: '0.92rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'performance' ? '3px solid #6366f1' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'performance' ? '#818cf8' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <TrendingUp size={18} />
          <span>Performance Analytics</span>
        </button>
      </div>

      {/* TAB 1: OFFICIAL EXAMS */}
      {activeTab === 'official' && (
        <div>
          {/* Filters & Search Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              width: '100%',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                position: 'relative',
                minWidth: '0',
                flex: '1 1 260px',
                width: '100%',
                maxWidth: '420px',
              }}
            >
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '38px', width: '100%' }}
                placeholder="Search by topic, title, or exam code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Difficulty Filter Tabs */}
            <div
              className="horizontal-scroll-row"
              style={{
                display: 'flex',
                gap: '4px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                flexShrink: 0,
              }}
            >
              {[
                { label: 'All', value: 'all' },
                { label: 'Easy', value: 'easy' },
                { label: 'Medium', value: 'medium' },
                { label: 'Hard', value: 'hard' },
              ].map((d) => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDifficulty(d.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    background: selectedDifficulty === d.value ? '#6366f1' : 'transparent',
                    color: selectedDifficulty === d.value ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic Filter Pills */}
          <div
            className="horizontal-scroll-row"
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '1.75rem',
              paddingBottom: '4px',
              width: '100%',
            }}
          >
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTopic(t)}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  borderRadius: '9999px',
                  border: selectedTopic === t ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                  background: selectedTopic === t ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: selectedTopic === t ? '#a5b4fc' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Exam Cards Grid */}
          {loadingExams ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              Loading assessment catalog...
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No exams found matching your current filter criteria.
            </div>
          ) : (
            <div className="exam-cards-grid">
              {filteredExams.map((exam) => {
                const hasAttempted = exam.hasAttempted;
                const attemptInfo = exam.userAttempt;

                return (
                  <div
                    key={exam._id}
                    className="glass-card"
                    style={{
                      padding: '1.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: hasAttempted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      {/* Top Tags */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`badge badge-${exam.difficulty}`}>
                            {exam.difficulty}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            {exam.examCode}
                          </span>
                        </div>

                        {hasAttempted && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle size={12} />
                            Attempted ({attemptInfo?.score} pts)
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                        {exam.title}
                      </h3>
                      <p
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.85rem',
                          lineHeight: 1.5,
                          marginBottom: '1.25rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {exam.description || `Assessment covering fundamental to advanced mathematical concepts in ${exam.topic}.`}
                      </p>

                      {/* Exam Specs */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '10px',
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          marginBottom: '1.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="#818cf8" />
                          <span>{exam.durationMinutes} Minutes</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={14} color="#818cf8" />
                          <span>{exam.questions?.length || 0} Questions</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Shield size={14} color="#10b981" />
                          <span>Negative (-{exam.negativeMarkingRate || 0.25})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Award size={14} color="#fbbf24" />
                          <span>Pass Mark: {exam.passPercentage}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      {hasAttempted ? (
                        <>
                          <Link
                            to={`/leaderboard/exam/${exam._id}`}
                            className="btn-secondary"
                            style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                          >
                            <Award size={15} />
                            <span>Leaderboard</span>
                          </Link>
                          <Link
                            to={`/results/${exam.userAttemptId || exam._id}`}
                            className="btn-primary"
                            style={{ flex: 1, padding: '10px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                          >
                            <span>View Review</span>
                            <ArrowRight size={15} />
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            to={`/leaderboard/exam/${exam._id}`}
                            className="btn-secondary"
                            style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                            title="View Current Leaderboard"
                          >
                            <Award size={16} />
                          </Link>
                          <Link
                            to={`/exam/${exam.examCode || exam._id}`}
                            className="btn-primary"
                            style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                          >
                            <span>Enter Exam</span>
                            <ArrowRight size={15} />
                          </Link>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY AI PRACTICE SETS */}
      {activeTab === 'practice' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="#10b981" />
                <span>Personal AI Practice Sets</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                Practice exams generated exclusively by you. Unlimited retakes allowed.
              </p>
            </div>

            <Link
              to="/practice/ai"
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.85rem' }}
            >
              <Sparkles size={16} />
              <span>+ Generate New Set</span>
            </Link>
          </div>

          {loadingPractice ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              Loading your private practice tests...
            </div>
          ) : practiceExams.length === 0 ? (
            <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
              <Sparkles size={48} color="#818cf8" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                No Private Practice Sets Yet
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                Upload any lecture PDF or paste math exercises to generate a customized, trap-aware practice test with step-by-step solutions.
              </p>
              <Link to="/practice/ai" className="btn-primary" style={{ padding: '12px 24px' }}>
                <Sparkles size={16} />
                <span>Create Your First Practice Test</span>
              </Link>
            </div>
          ) : (
            <div className="exam-cards-grid">
              {practiceExams.map((exam) => {
                const hasAttempted = exam.hasAttempted;
                const attempt = exam.userAttempt;

                return (
                  <div
                    key={exam._id}
                    className="glass-card"
                    style={{
                      padding: '1.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`badge badge-${exam.difficulty}`}>
                            {exam.difficulty}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}>
                            <Lock size={10} />
                            Private
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeletePractice(exam._id, e)}
                          disabled={deletingId === exam._id}
                          title="Delete this practice test"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#f43f5e',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                        {exam.title}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                        {exam.description || `Custom practice session covering ${exam.topic}.`}
                      </p>

                      {/* Specs */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginBottom: '1.25rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={14} color="#818cf8" />
                          <span>{exam.questions?.length || 0} Questions</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="#818cf8" />
                          <span>{exam.durationMinutes} Mins</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <RotateCcw size={14} color="#10b981" />
                          <span>Unlimited Retakes</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Award size={14} color="#fbbf24" />
                          <span>{hasAttempted ? `${attempt?.score} / ${attempt?.maxScore || exam.questions?.length} pts (${attempt?.percentage}%)` : 'Not Attempted'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      {hasAttempted ? (
                        <>
                          <Link
                            to={`/results/${exam.userAttemptId}`}
                            className="btn-secondary"
                            style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                          >
                            <span>Review Answers</span>
                          </Link>
                          <Link
                            to={`/workspace/${exam._id}`}
                            className="btn-primary"
                            style={{ flex: 1, padding: '10px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                          >
                            <RotateCcw size={14} />
                            <span>Retake Test</span>
                          </Link>
                        </>
                      ) : (
                        <Link
                          to={`/workspace/${exam._id}`}
                          className="btn-primary"
                          style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                        >
                          <Play size={15} />
                          <span>Start Practice Exam</span>
                          <ArrowRight size={15} />
                        </Link>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PERFORMANCE ANALYTICS */}
      {activeTab === 'performance' && (
        <div>
          {loadingPerformance ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              Computing performance metrics and topic mastery...
            </div>
          ) : !performance || performance.summary?.totalAttempts === 0 ? (
            <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
              <BarChart2 size={48} color="#818cf8" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                No Exam Performance Data Available
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                Complete an official exam or an AI practice set to unlock in-depth accuracy analytics, topic mastery progress, and score breakdowns.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('official')}
                className="btn-primary"
                style={{ padding: '10px 20px' }}
              >
                <span>Browse Available Exams</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Top KPI Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                  gap: '1.25rem',
                  marginBottom: '2rem',
                }}
              >
                {/* Total Assessments */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Completed</span>
                    <CheckSquare size={18} color="#6366f1" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {performance.summary.totalAttempts}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    {performance.summary.officialAttemptsCount} Official • {performance.summary.practiceAttemptsCount} Practice
                  </div>
                </div>

                {/* Overall Accuracy */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Overall Accuracy</span>
                    <Target size={18} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
                    {performance.summary.overallAccuracy}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    {performance.summary.totalCorrectAnswers} / {performance.summary.totalQuestionsAnswered} correct answers
                  </div>
                </div>

                {/* Average Score */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Average Score</span>
                    <TrendingUp size={18} color="#818cf8" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8' }}>
                    {performance.summary.averagePercentage}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Pass Rate: {performance.summary.passRate}%
                  </div>
                </div>

                {/* Highest Score */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Personal Best</span>
                    <Award size={18} color="#fbbf24" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>
                    {performance.summary.highestPercentage}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Highest single test result
                  </div>
                </div>
              </div>

              {/* Topic Mastery Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="glass-card" style={{ padding: '1.75rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color="#6366f1" />
                    <span>Topic Mastery Breakdown</span>
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {performance.topicBreakdown.map((t) => (
                      <div key={t.topic}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.topic}</span>
                          <span style={{ color: '#818cf8', fontWeight: 700 }}>{t.accuracy}% Accuracy ({t.attempts} tests)</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${t.accuracy}%`,
                              background: t.accuracy >= 75 ? '#10b981' : t.accuracy >= 50 ? '#6366f1' : '#f43f5e',
                              borderRadius: '9999px',
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Difficulty Breakdown */}
                <div className="glass-card" style={{ padding: '1.75rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={18} color="#10b981" />
                    <span>Difficulty Performance</span>
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {['easy', 'medium', 'hard'].map((diff) => {
                      const d = performance.difficultyBreakdown?.[diff] || { attempts: 0, accuracy: 0, avgPercentage: 0 };
                      const label = diff.toUpperCase();
                      const color = diff === 'hard' ? '#f43f5e' : diff === 'medium' ? '#fbbf24' : '#10b981';

                      return (
                        <div
                          key={diff}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color,
                              background: `${color}20`,
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}>
                              {label}
                            </span>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                              {d.attempts} Assessments Taken
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                              {d.accuracy}%
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Accuracy
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Complete Attempt History Table */}
              <div className="glass-card" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
                  Recent Attempt History
                </h3>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                        <th style={{ padding: '10px' }}>Date</th>
                        <th style={{ padding: '10px' }}>Assessment</th>
                        <th style={{ padding: '10px' }}>Type</th>
                        <th style={{ padding: '10px' }}>Difficulty</th>
                        <th style={{ padding: '10px' }}>Score</th>
                        <th style={{ padding: '10px' }}>Result</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performance.recentAttempts.map((att) => (
                        <tr key={att.attemptId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                            {new Date(att.submittedAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {att.examTitle}
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: att.isPractice ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: att.isPractice ? '#10b981' : '#818cf8',
                            }}>
                              {att.isPractice ? 'Practice' : 'Official'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span className={`badge badge-${att.difficulty}`} style={{ fontSize: '0.7rem' }}>
                              {att.difficulty}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {att.score} / {att.maxScore} ({att.percentage}%)
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{
                              fontWeight: 700,
                              color: att.passed ? '#10b981' : '#f43f5e',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              {att.passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                              {att.passed ? 'PASSED' : 'RETAKE'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                            <Link
                              to={`/results/${att.attemptId}`}
                              style={{
                                color: '#818cf8',
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                              }}
                            >
                              Review &rarr;
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Dashboard;
