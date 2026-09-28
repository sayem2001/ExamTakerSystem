import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  BrainCircuit,
  ArrowRight,
  Award,
  ShieldCheck,
  Zap,
  BookOpen,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const Home = () => {
  const [examCode, setExamCode] = useState('');
  const [featuredExams, setFeaturedExams] = useState([]);
  const [globalLeaders, setGlobalLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, leadersRes] = await Promise.all([
          api.getExams({ limit: 6 }),
          api.getGlobalLeaderboard(),
        ]);
        if (examsRes.success) setFeaturedExams(examsRes.exams.slice(0, 6));
        if (leadersRes.success) setGlobalLeaders(leadersRes.leaderboard.slice(0, 5));
      } catch (err) {
        console.error('Home data load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (examCode.trim()) {
      navigate(`/exam/${examCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: '4rem' }}>
      
      {/* Background Decorative Glows */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div
          className="gradient-glow animate-glow"
          style={{
            top: '-10%',
            left: '20%',
            width: '500px',
            height: '500px',
            background: 'rgba(99, 102, 241, 0.15)',
          }}
        />
        <div
          className="gradient-glow"
          style={{
            top: '20%',
            right: '15%',
            width: '450px',
            height: '450px',
            background: 'rgba(139, 92, 246, 0.12)',
          }}
        />

        {/* HERO SECTION */}
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '4.5rem 1.5rem 3rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#a5b4fc',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
          }}>
            <Sparkles size={16} color="#818cf8" />
            <span>AI-Driven Examination & Real-Time Performance Analytics</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4.25rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
          }}>
            Next-Gen Testing Engine for{' '}
            <span className="gradient-text">Higher Mathematics</span>
          </h1>

          <p style={{
            fontSize: '1.2rem',
            color: '#94a3b8',
            maxWidth: '750px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.6,
          }}>
            Evaluate deep conceptual understanding with difficulty-stratified exams (Easy, Medium, Hard).
            Powered by Google Gemini AI PDF question synthesis, anti-cheat proctoring, and live competitive leaderboards.
          </p>

          {/* Direct Exam Access / Quick Join Input */}
          <div style={{ maxWidth: '540px', margin: '0 auto 3rem' }}>
            <form
              onSubmit={handleJoinByCode}
              style={{
                display: 'flex',
                gap: '8px',
                background: 'rgba(15, 20, 34, 0.85)',
                backdropFilter: 'blur(16px)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.25)',
              }}
            >
              <input
                type="text"
                placeholder="Enter Exam Code (e.g. CALC-EASY-101)..."
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.05em',
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                <span>Enter Exam</span>
                <ArrowRight size={16} />
              </button>
            </form>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
              Have an exam invitation link? Simply paste or open the URL to start immediately.
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.25rem',
            maxWidth: '900px',
            margin: '0 auto',
          }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8' }}>3 Levels</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Easy • Medium • Hard</div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a855f7' }}>100-200+</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>MCQs via Gemini AI</div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>1 Attempt</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Anti-Cheat & Strict Ranking</div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>Real-Time</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Live Dynamic Leaderboard</div>
            </div>
          </div>

        </section>
      </div>

      {/* CORE CAPABILITIES / ADVANCED FEATURES */}
      <section style={{ maxWidth: '1200px', margin: '4rem auto 2rem', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>
            Built for Serious Assessment Integrity
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '6px' }}>
            Everything required for robust mathematics evaluations in one integrated platform.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}>
          
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}>
              <BrainCircuit size={24} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
              Gemini AI PDF Synthesis
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Administrators upload topic PDF documents with 100 to 200 questions. Google Gemini AI automatically categorizes and converts them into structured MCQs with step-by-step mathematical explanations.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}>
              <ShieldCheck size={24} color="#34d399" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
              Strict Anti-Cheat & 1-Attempt
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Enforces fullscreen mode, tab-switch interception, and clipboard locking. Once submitted, users cannot retake the exam, maintaining absolute leaderboard veracity.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}>
              <Award size={24} color="#fbbf24" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
              Live Competitive Leaderboard
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Ranks students by score, accuracy, and completion speed. Visual podium for champions, instant percentiles, and downloadable audit sheets for faculty.
            </p>
          </div>

        </div>
      </section>

      {/* FEATURED EXAMS & TOP PERFORMERS SPLIT */}
      <section style={{ maxWidth: '1200px', margin: '4rem auto 0', padding: '0 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          
          {/* Featured Exams Column */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
                  Available Exams
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Select an exam to review syllabus and enter.
                </p>
              </div>
              <Link to="/dashboard" style={{ fontSize: '0.85rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}>
                <span>View All</span>
                <ChevronRight size={16} />
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {featuredExams.length === 0 ? (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No published exams available yet.
                </div>
              ) : (
                featuredExams.map((exam) => (
                  <Link
                    key={exam._id}
                    to={`/exam/${exam.examCode || exam._id}`}
                    className="glass-card"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className={`badge badge-${exam.difficulty}`}>
                          {exam.difficulty}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                          {exam.examCode}
                        </span>
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                        {exam.title}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} /> {exam.durationMinutes} mins
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <BookOpen size={13} /> {exam.questions?.length || 0} MCQs
                        </span>
                      </div>
                    </div>
                    <div className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                      <span>Start</span>
                      <ChevronRight size={14} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Top Leaderboard Podium Preview */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
                  Top Performers
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Global rankings across all assessments.
                </p>
              </div>
              <Link to="/leaderboard" style={{ fontSize: '0.85rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}>
                <span>Full Board</span>
                <ChevronRight size={16} />
              </Link>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              {globalLeaders.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  Leaderboard will populate as students complete exams.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {globalLeaders.map((leader, idx) => (
                    <div
                      key={leader.userId || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: idx === 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: idx === 0 ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : idx === 2 ? '#d97706' : 'rgba(255,255,255,0.1)',
                          color: idx < 3 ? '#000' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                        }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>
                            {leader.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {leader.institution || 'Independent Student'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: idx === 0 ? '#fde047' : '#f8fafc' }}>
                          {leader.totalScore} pts
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#10b981' }}>
                          {leader.avgPercentage}% avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default Home;
