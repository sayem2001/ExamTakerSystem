import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  Crown,
  Download,
  Search,
  Clock,
  CheckCircle,
  Zap,
  Filter,
  Users,
  ChevronDown,
} from 'lucide-react';

export const LeaderboardView = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(examId || 'global');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [examMeta, setExamMeta] = useState(null);
  const [currentUserEntry, setCurrentUserEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch list of exams for dropdown
  useEffect(() => {
    const fetchExamList = async () => {
      try {
        const res = await api.getExams();
        if (res.success) {
          setExams(res.exams);
        }
      } catch (err) {
        console.error('Failed to load exams list:', err);
      }
    };
    fetchExamList();
  }, []);

  // Update selectedExamId if route param changes
  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId);
    }
  }, [examId]);

  // Fetch leaderboard content
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        if (selectedExamId === 'global') {
          const res = await api.getGlobalLeaderboard();
          if (res.success) {
            setLeaderboardData(res.leaderboard);
            setExamMeta(null);
            setCurrentUserEntry(null);
          }
        } else {
          const res = await api.getExamLeaderboard(selectedExamId);
          if (res.success) {
            setLeaderboardData(res.leaderboard);
            setExamMeta(res.exam);
            setCurrentUserEntry(res.currentUserEntry);
          }
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedExamId]);

  const handleExamChange = (newId) => {
    setSelectedExamId(newId);
    if (newId === 'global') {
      navigate('/leaderboard');
    } else {
      navigate(`/leaderboard/exam/${newId}`);
    }
  };

  const handleExportCSV = () => {
    if (selectedExamId !== 'global') {
      const token = localStorage.getItem('apex_token');
      const url = `/api/leaderboard/export/${selectedExamId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(url, '_blank');
    }
  };

  // Filter by search
  const filteredData = leaderboardData.filter((item) => {
    const q = searchQuery.toLowerCase();
    const name = (item.user?.name || item.name || '').toLowerCase();
    const inst = (item.user?.institution || item.institution || '').toLowerCase();
    return name.includes(q) || inst.includes(q);
  });

  const topThree = filteredData.slice(0, 3);

  return (
    <div style={{ maxWidth: '1200px', margin: '2.5rem auto 5rem', padding: '0 1.5rem' }}>
      
      {/* Header & Selector */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '2.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
            <Award size={18} />
            <span>Competitive Standings</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc' }}>
            {examMeta ? `${examMeta.title} Leaderboard` : 'Global Academic Standings'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '4px' }}>
            Live performance records ranked by score, completion time, and accuracy.
          </p>
        </div>

        {/* Dropdown Selector & Export */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={selectedExamId}
            onChange={(e) => handleExamChange(e.target.value)}
            style={{ minWidth: '240px' }}
          >
            <option value="global">🏆 Global Overall Standings</option>
            {exams.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.title} ({ex.difficulty.toUpperCase()})
              </option>
            ))}
          </select>

          {selectedExamId !== 'global' && (
            <button
              onClick={handleExportCSV}
              className="btn-secondary"
              title="Download official CSV audit log"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP 3 PODIUM DISPLAY */}
      {topThree.length >= 1 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginBottom: '3rem',
        }}>
          {topThree.map((item, idx) => {
            const rank = item.rank || idx + 1;
            const isFirst = rank === 1;
            const name = item.user?.name || item.name;
            const inst = item.user?.institution || item.institution || 'Candidate';
            const score = item.score !== undefined ? item.score : item.totalScore;

            return (
              <div
                key={item.attemptId || item.userId || idx}
                className="glass-card"
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  position: 'relative',
                  border: isFirst ? '2px solid rgba(234, 179, 8, 0.6)' : '1px solid var(--border-subtle)',
                  boxShadow: isFirst ? '0 0 35px rgba(234, 179, 8, 0.25)' : 'none',
                }}
              >
                {/* Crown / Rank Icon */}
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  margin: '0 auto 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isFirst
                    ? 'linear-gradient(135deg, #fde047 0%, #ca8a04 100%)'
                    : rank === 2
                    ? 'linear-gradient(135deg, #e2e8f0 0%, #64748b 100%)'
                    : 'linear-gradient(135deg, #fed7aa 0%, #b45309 100%)',
                  color: '#000',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                }}>
                  {isFirst ? <Crown size={28} /> : <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>#{rank}</span>}
                </div>

                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                  {name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                  {inst}
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '10px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-around',
                  fontSize: '0.85rem',
                }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>SCORE</div>
                    <div style={{ fontWeight: 800, color: isFirst ? '#fde047' : '#f8fafc', fontSize: '1.1rem' }}>
                      {score}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                      {item.accuracy !== undefined ? 'ACCURACY' : 'AVG %'}
                    </div>
                    <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>
                      {item.accuracy !== undefined ? `${item.accuracy}%` : `${item.avgPercentage}%`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SEARCH TOOLBAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '1rem',
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Search candidate by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Showing <strong>{filteredData.length}</strong> participants
        </div>
      </div>

      {/* LEADERBOARD TABLE */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            Loading rankings...
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
            No submissions recorded yet for this assessment.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 18px', width: '70px' }}>Rank</th>
                  <th style={{ padding: '14px 18px' }}>Candidate</th>
                  <th style={{ padding: '14px 18px' }}>Score</th>
                  <th style={{ padding: '14px 18px' }}>{selectedExamId === 'global' ? 'Avg %' : 'Accuracy'}</th>
                  {selectedExamId !== 'global' && <th style={{ padding: '14px 18px' }}>Duration</th>}
                  <th style={{ padding: '14px 18px' }}>Badges</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => {
                  const isCurrent = row.isCurrentUser;
                  const name = row.user?.name || row.name;
                  const inst = row.user?.institution || row.institution || '';
                  const score = row.score !== undefined ? row.score : row.totalScore;
                  const maxScore = row.maxScore;
                  const acc = row.accuracy !== undefined ? `${row.accuracy}%` : `${row.avgPercentage}%`;

                  return (
                    <tr
                      key={row.attemptId || row.userId}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isCurrent ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          color: row.rank === 1 ? '#fde047' : row.rank === 2 ? '#e2e8f0' : row.rank === 3 ? '#fb923c' : '#94a3b8',
                        }}>
                          #{row.rank}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isCurrent ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            fontSize: '0.8rem',
                          }}>
                            {name ? name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{name}</span>
                              {isCurrent && (
                                <span style={{
                                  background: '#6366f1',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                }}>
                                  YOU
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {inst || 'Candidate'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#f8fafc' }}>
                        {score} {maxScore ? <span style={{ color: '#64748b', fontSize: '0.8rem' }}>/ {maxScore}</span> : ''}
                      </td>

                      <td style={{ padding: '14px 18px', color: '#10b981', fontWeight: 600 }}>
                        {acc}
                      </td>

                      {selectedExamId !== 'global' && (
                        <td style={{ padding: '14px 18px', color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {Math.floor((row.durationSeconds || 0) / 60)}m {(row.durationSeconds || 0) % 60}s
                        </td>
                      )}

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {row.badges?.map((b, i) => (
                            <span
                              key={i}
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.7rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#e2e8f0',
                              }}
                            >
                              <span>{b.icon}</span>
                              <span>{b.label}</span>
                            </span>
                          ))}
                        </div>
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

export default LeaderboardView;
