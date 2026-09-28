import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Users,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState('');

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await api.getSubmissions({ flaggedOnly });
      if (res.success) {
        setSubmissions(res.submissions);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [flaggedOnly]);

  const filtered = submissions.filter((sub) => {
    const q = search.toLowerCase();
    const name = (sub.user?.name || '').toLowerCase();
    const examTitle = (sub.exam?.title || '').toLowerCase();
    return name.includes(q) || examTitle.includes(q);
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '2.5rem auto 5rem', padding: '0 1.5rem' }}>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '2.5rem',
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#f43f5e', fontWeight: 700, marginBottom: '4px' }}>
            Security Audit Trail
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc' }}>
            Candidate Submissions & Proctor Log
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Audit all finalized exam sessions, tab-switching infractions, and candidate performance scores.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setFlaggedOnly(!flaggedOnly)}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              background: flaggedOnly ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              borderColor: flaggedOnly ? '#f43f5e' : 'var(--border-subtle)',
              color: flaggedOnly ? '#fda4af' : '#cbd5e1',
            }}
          >
            <AlertTriangle size={15} />
            <span>{flaggedOnly ? 'Showing Flagged Only' : 'Filter Flagged Violations'}</span>
          </button>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            Loading candidate submission records...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            No submissions found matching criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.03)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 18px' }}>Candidate</th>
                  <th style={{ padding: '14px 18px' }}>Assessment</th>
                  <th style={{ padding: '14px 18px' }}>Score</th>
                  <th style={{ padding: '14px 18px' }}>Percentage</th>
                  <th style={{ padding: '14px 18px' }}>Duration</th>
                  <th style={{ padding: '14px 18px' }}>Proctor Violations</th>
                  <th style={{ padding: '14px 18px' }}>Submitted At</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => {
                  const hasViolations = sub.proctorViolations && sub.proctorViolations.length > 0;

                  return (
                    <tr key={sub._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>
                          {sub.user?.name || 'Anonymous Candidate'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {sub.user?.email}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ color: '#cbd5e1', fontWeight: 600 }}>
                          {sub.exam?.title}
                        </div>
                        <span className={`badge badge-${sub.exam?.difficulty || 'medium'}`} style={{ marginTop: '2px' }}>
                          {sub.exam?.difficulty}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#f8fafc' }}>
                        {sub.score} <span style={{ color: '#64748b', fontSize: '0.8rem' }}>/ {sub.maxScore}</span>
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 700, color: sub.passed ? '#34d399' : '#f87171' }}>
                        {sub.percentage}%
                      </td>

                      <td style={{ padding: '14px 18px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                        {Math.floor((sub.durationSeconds || 0) / 60)}m {(sub.durationSeconds || 0) % 60}s
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {hasViolations ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(244, 63, 94, 0.15)',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            color: '#fda4af',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}>
                            <AlertTriangle size={13} />
                            <span>{sub.proctorViolations.length} Violations</span>
                          </div>
                        ) : (
                          <span style={{ color: '#34d399', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Clean
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.8rem' }}>
                        {new Date(sub.submittedAt).toLocaleString()}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <Link
                          to={`/results/${sub._id}`}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          target="_blank"
                        >
                          <ExternalLink size={14} />
                          <span>View Review</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminSubmissions;
