import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchExams();
  }, [selectedTopic, selectedDifficulty]);

  const fetchExams = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  // Derive unique topics
  const topics = ['All', ...new Set(exams.map((e) => e.topic).filter(Boolean))];

  // Filter by search query
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
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      
      {/* Welcome Banner */}
      <div className="glass-card" style={{
        padding: '2rem 2.5rem',
        marginBottom: '2.5rem',
        background: 'linear-gradient(135deg, rgba(24, 33, 56, 0.9) 0%, rgba(15, 20, 34, 0.9) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
            <TrendingUp size={16} />
            <span>Student Dashboard</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>
            Welcome back, {user?.name || 'Candidate'}!
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '4px' }}>
            Browse scheduled assessments, verify your scores, and view your placement on the live leaderboards.
          </p>
        </div>

        {/* Quick summary stats */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '12px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>{exams.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Available Exams</div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '12px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{completedCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Completed</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
      }}>
        {/* Search Input */}
        <div style={{
          position: 'relative',
          minWidth: '280px',
          flex: '1',
          maxWidth: '400px',
        }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Search by topic, title, or exam code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Difficulty Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          {[
            { label: 'All Difficulties', value: 'all' },
            { label: 'Easy', value: 'easy' },
            { label: 'Medium', value: 'medium' },
            { label: 'Hard', value: 'hard' },
          ].map((d) => (
            <button
              key={d.value}
              onClick={() => setSelectedDifficulty(d.value)}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: selectedDifficulty === d.value ? '#6366f1' : 'transparent',
                color: selectedDifficulty === d.value ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Topic Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTopic(t)}
            style={{
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 500,
              borderRadius: '9999px',
              border: selectedTopic === t ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
              background: selectedTopic === t ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              color: selectedTopic === t ? '#a5b4fc' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Exam Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          Loading assessment catalog...
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          No exams found matching your current filter criteria.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.5rem',
        }}>
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
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                        {exam.examCode}
                      </span>
                    </div>

                    {hasAttempted && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        <CheckCircle size={12} />
                        Attempted ({attemptInfo?.score} pts)
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
                    {exam.title}
                  </h3>
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    marginBottom: '1.25rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {exam.description || `Assessment covering fundamental to advanced mathematical concepts in ${exam.topic}.`}
                  </p>

                  {/* Exam Specs */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '10px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#cbd5e1',
                    marginBottom: '1.5rem',
                  }}>
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

                {/* Bottom Action Buttons */}
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
  );
};

export default Dashboard;
