import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  BookOpen,
  Users,
  FileQuestion,
  CheckCircle,
  TrendingUp,
  Sparkles,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Settings,
  Plus,
  Bell,
  Megaphone,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.getAdminStats();
        if (res.success) {
          setStats(res.stats);
          setRecentAttempts(res.recentAttempts || []);
          setTopics(res.topics || []);
        }
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem', color: '#94a3b8' }}>
        Loading administrative telemetry...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '2rem auto 5rem', padding: '0 1.5rem' }}>
      
      {/* Top Banner & Quick Actions */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '2.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
            <ShieldAlert size={16} />
            <span>Administrative Command Center</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc' }}>
            Examination & Assessment Hub
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '4px' }}>
            Schedule exams, synthesize 100-200 MCQs via Gemini AI, and audit security telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="/admin/ai-import"
            className="btn-primary"
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            }}
          >
            <Sparkles size={16} />
            <span>AI PDF Importer</span>
          </Link>

          <Link
            to="/admin/exams"
            className="btn-primary"
            style={{ padding: '10px 18px', fontSize: '0.9rem' }}
          >
            <Plus size={16} />
            <span>Schedule Exam</span>
          </Link>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem',
      }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#818cf8', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Active Exams</span>
            <BookOpen size={20} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc' }}>
            {stats?.totalExams || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Categorized across 3 difficulty tiers
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Registered Students</span>
            <Users size={20} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc' }}>
            {stats?.totalStudents || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Active candidate profiles
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a855f7', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Question Bank</span>
            <FileQuestion size={20} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc' }}>
            {stats?.totalQuestions || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Mathematical MCQs with derivations
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Completed Submissions</span>
            <CheckCircle size={20} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc' }}>
            {stats?.totalAttempts || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>
            {stats?.passRate || 0}% overall pass rate
          </div>
        </div>
      </div>

      {/* QUICK WORKFLOW NAVIGATION PANELS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '3rem',
      }}>
        <Link
          to="/admin/ai-import"
          className="glass-card"
          style={{
            padding: '1.75rem',
            textDecoration: 'none',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Sparkles size={22} color="#c084fc" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Gemini AI PDF Importer
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Upload 100-200 question PDFs. Gemini AI extracts mathematical equations and automatically splits them into Easy, Medium, and Hard assessments.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontSize: '0.85rem', fontWeight: 600, marginTop: '1.25rem' }}>
            <span>Launch PDF Importer</span>
            <ArrowRight size={15} />
          </div>
        </Link>

        <Link
          to="/admin/exams"
          className="glass-card"
          style={{
            padding: '1.75rem',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Calendar size={22} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Exam Manager & Links
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Set examination dates, time limits, negative markings, anti-cheat limits, and generate shareable links for students.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontSize: '0.85rem', fontWeight: 600, marginTop: '1.25rem' }}>
            <span>Manage Exam Schedules</span>
            <ArrowRight size={15} />
          </div>
        </Link>

        <Link
          to="/admin/submissions"
          className="glass-card"
          style={{
            padding: '1.75rem',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(244, 63, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <ShieldAlert size={22} color="#f43f5e" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Submissions & Anti-Cheat Audit
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Inspect live student submission logs, tab-switch infractions, scores, completion durations, and export CSV reports.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f43f5e', fontSize: '0.85rem', fontWeight: 600, marginTop: '1.25rem' }}>
            <span>Audit Submissions</span>
            <ArrowRight size={15} />
          </div>
        </Link>

        <Link
          to="/admin/notices"
          className="glass-card"
          style={{
            padding: '1.75rem',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Bell size={22} color="#60a5fa" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Notice Board & Routines
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Publish official exam routines, dates, anti-cheat instructions, and pin critical announcements for candidates.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 600, marginTop: '1.25rem' }}>
            <span>Manage Notices</span>
            <ArrowRight size={15} />
          </div>
        </Link>

        <Link
          to="/admin/settings"
          className="glass-card"
          style={{
            padding: '1.75rem',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Settings size={22} color="#cbd5e1" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              System & Gemini Key
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Update your free Google Gemini API Key directly, set platform branding, and adjust default exam policies.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginTop: '1.25rem' }}>
            <span>Configure Settings</span>
            <ArrowRight size={15} />
          </div>
        </Link>
      </div>

      {/* RECENT SUBMISSIONS FEED */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
              Recent Candidate Submissions
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Real-time audit log of student attempts and scores.
            </p>
          </div>
          <Link to="/admin/submissions" style={{ color: '#818cf8', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
            View Full Audit Log →
          </Link>
        </div>

        {recentAttempts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No submissions recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  <th style={{ padding: '10px 14px' }}>Student</th>
                  <th style={{ padding: '10px 14px' }}>Exam</th>
                  <th style={{ padding: '10px 14px' }}>Difficulty</th>
                  <th style={{ padding: '10px 14px' }}>Score</th>
                  <th style={{ padding: '10px 14px' }}>Percentage</th>
                  <th style={{ padding: '10px 14px' }}>Security Flags</th>
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((att) => (
                  <tr key={att._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#f8fafc' }}>
                      {att.user?.name || 'Anonymous'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                      {att.exam?.title || 'Exam'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge badge-${att.exam?.difficulty || 'medium'}`}>
                        {att.exam?.difficulty || 'medium'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f8fafc' }}>
                      {att.score}
                    </td>
                    <td style={{ padding: '12px 14px', color: att.passed ? '#34d399' : '#f87171', fontWeight: 600 }}>
                      {att.percentage}%
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {att.proctorViolations?.length > 0 ? (
                        <span style={{ color: '#f87171', fontWeight: 700 }}>
                          ⚠️ {att.proctorViolations.length} Violations
                        </span>
                      ) : (
                        <span style={{ color: '#34d399' }}>Clean Session</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                      {new Date(att.submittedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;
