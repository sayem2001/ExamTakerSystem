import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  Calendar,
  Clock,
  Pin,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  Megaphone,
  BookOpen,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Plus,
  Tag,
  CheckCircle2,
  X,
} from 'lucide-react';

export const NoticeBoard = () => {
  const { user, isAdmin } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotice, setSelectedNotice] = useState(null);

  useEffect(() => {
    fetchNotices();
  }, [selectedCategory]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const res = await api.getNotices(params);
      if (res.success) {
        setNotices(res.notices || []);
      }
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchNotices();
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'routine':
        return {
          label: 'Exam Routine',
          color: '#60a5fa',
          bg: 'rgba(59, 130, 246, 0.15)',
          border: 'rgba(59, 130, 246, 0.3)',
          icon: <Calendar size={13} />,
        };
      case 'exam_date':
        return {
          label: 'Exam Date',
          color: '#a78bfa',
          bg: 'rgba(167, 139, 250, 0.15)',
          border: 'rgba(167, 139, 250, 0.3)',
          icon: <Clock size={13} />,
        };
      case 'instruction':
        return {
          label: 'Instructions',
          color: '#34d399',
          bg: 'rgba(52, 211, 153, 0.15)',
          border: 'rgba(52, 211, 153, 0.3)',
          icon: <FileText size={13} />,
        };
      case 'urgent':
        return {
          label: 'Urgent Alert',
          color: '#f43f5e',
          bg: 'rgba(244, 63, 94, 0.15)',
          border: 'rgba(244, 63, 94, 0.3)',
          icon: <AlertTriangle size={13} />,
        };
      default:
        return {
          label: 'Announcement',
          color: '#fbbf24',
          bg: 'rgba(251, 191, 36, 0.15)',
          border: 'rgba(251, 191, 36, 0.3)',
          icon: <Megaphone size={13} />,
        };
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'urgent') {
      return (
        <span style={{
          fontSize: '0.7rem',
          padding: '2px 8px',
          borderRadius: '999px',
          background: 'rgba(244, 63, 94, 0.2)',
          color: '#f43f5e',
          fontWeight: 700,
          border: '1px solid rgba(244, 63, 94, 0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          Urgent
        </span>
      );
    }
    if (priority === 'high') {
      return (
        <span style={{
          fontSize: '0.7rem',
          padding: '2px 8px',
          borderRadius: '999px',
          background: 'rgba(245, 158, 11, 0.2)',
          color: '#fbbf24',
          fontWeight: 700,
          border: '1px solid rgba(245, 158, 11, 0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          High Priority
        </span>
      );
    }
    return null;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter notices locally for quick typing responsiveness
  const filteredNotices = notices.filter((n) => {
    if (selectedCategory !== 'all' && n.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchContent = n.content?.toLowerCase().includes(q);
      const matchTags = n.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTags) return false;
    }
    return true;
  });

  const pinnedNotices = filteredNotices.filter((n) => n.isPinned);
  const regularNotices = filteredNotices.filter((n) => !n.isPinned);

  return (
    <div style={{ maxWidth: '1280px', margin: '2rem auto 5rem', padding: '0 1.5rem', position: 'relative' }}>
      
      {/* Background ambient glow */}
      <div
        className="gradient-glow"
        style={{
          top: '10%',
          right: '15%',
          width: '500px',
          height: '500px',
          background: 'rgba(99, 102, 241, 0.08)',
        }}
      />

      {/* HEADER SECTION */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '2.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
            <Bell size={16} />
            <span>Official Portal Communications</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Notice Board & Exam Routines
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Stay updated with upcoming exam schedules, routine dates, anti-cheat instructions, and academic notices.
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/admin/notices"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '0.9rem',
                background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                boxShadow: '0 4px 15px rgba(244, 63, 94, 0.35)',
              }}
            >
              <Plus size={16} />
              <span>Publish Notice / Routine</span>
            </Link>
          </div>
        )}
      </div>

      {/* SEARCH AND CATEGORY FILTER TABS */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Notices' },
              { id: 'routine', label: '📅 Exam Routines' },
              { id: 'exam_date', label: '⏰ Exam Dates' },
              { id: 'instruction', label: '📌 Instructions' },
              { id: 'announcement', label: '📢 Announcements' },
              { id: 'urgent', label: '🚨 Urgent' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: selectedCategory === tab.id
                    ? '1.5px solid #818cf8'
                    : '1px solid var(--border-subtle)',
                  background: selectedCategory === tab.id
                    ? 'rgba(99, 102, 241, 0.18)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: selectedCategory === tab.id ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: selectedCategory === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search notices, routines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); fetchNotices(); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>
      </div>

      {/* NOTICES LIST */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
          Loading official notices and schedules...
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Bell size={40} style={{ color: 'var(--text-dim)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
            No Notices Found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px', maxWidth: '400px', margin: '4px auto 0' }}>
            {searchQuery || selectedCategory !== 'all'
              ? 'No notices match your current filters. Try selecting "All Notices" or clearing your search.'
              : 'There are currently no published notices or exam routines.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* PINNED NOTICES SECTION */}
          {pinnedNotices.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Pin size={14} />
                <span>Pinned Announcements & Major Routines</span>
              </div>

              {pinnedNotices.map((notice) => {
                const cat = getCategoryBadge(notice.category);
                return (
                  <div
                    key={notice._id}
                    className="glass-card"
                    onClick={() => setSelectedNotice(notice)}
                    style={{
                      padding: '1.5rem',
                      cursor: 'pointer',
                      border: '1.5px solid rgba(245, 158, 11, 0.45)',
                      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.08)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.7)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.45)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                        }}>
                          <Pin size={11} /> PINNED
                        </span>

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: cat.bg,
                          color: cat.color,
                          border: `1px solid ${cat.border}`,
                        }}>
                          {cat.icon}
                          {cat.label}
                        </span>

                        {getPriorityBadge(notice.priority)}
                      </div>

                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        Published {formatDateTime(notice.createdAt)}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem', lineHeight: 1.35 }}>
                      {notice.title}
                    </h2>

                    {/* Event / Exam Date Highlight Banner */}
                    {notice.eventDate && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        color: '#c7d2fe',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '0.75rem',
                      }}>
                        <Calendar size={15} color="#818cf8" />
                        <span>Scheduled Date / Time: {formatDateTime(notice.eventDate)}</span>
                      </div>
                    )}

                    <p style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-line',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      marginBottom: '1rem',
                    }}>
                      {notice.content}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        <span>By {notice.authorName || 'Central Administration'}</span>
                        {notice.tags && notice.tags.length > 0 && (
                          <>
                            <span>•</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {notice.tags.slice(0, 3).map((t, idx) => (
                                <span key={idx} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontSize: '0.82rem', fontWeight: 600 }}>
                        Read Details <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* REGULAR NOTICES LIST */}
          {regularNotices.map((notice) => {
            const cat = getCategoryBadge(notice.category);
            return (
              <div
                key={notice._id}
                className="glass-card"
                onClick={() => setSelectedNotice(notice)}
                style={{
                  padding: '1.5rem',
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: cat.bg,
                      color: cat.color,
                      border: `1px solid ${cat.border}`,
                    }}>
                      {cat.icon}
                      {cat.label}
                    </span>

                    {getPriorityBadge(notice.priority)}
                  </div>

                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Published {formatDateTime(notice.createdAt)}
                  </span>
                </div>

                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', lineHeight: 1.35 }}>
                  {notice.title}
                </h2>

                {notice.eventDate && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: '#c7d2fe',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '0.75rem',
                  }}>
                    <Calendar size={14} color="#818cf8" />
                    <span>Event / Exam Date: {formatDateTime(notice.eventDate)}</span>
                  </div>
                )}

                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  marginBottom: '1rem',
                }}>
                  {notice.content}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    <span>By {notice.authorName || 'Administrator'}</span>
                    {notice.tags && notice.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {notice.tags.slice(0, 3).map((t, idx) => (
                            <span key={idx} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#818cf8', fontSize: '0.82rem', fontWeight: 600 }}>
                    Read Notice <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED NOTICE POPUP MODAL */}
      {selectedNotice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
        }}>
          <div className="glass-card" style={{
            maxWidth: '680px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            border: selectedNotice.isPinned
              ? '1.5px solid rgba(245, 158, 11, 0.5)'
              : '1px solid var(--border-subtle)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {selectedNotice.isPinned && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                  }}>
                    <Pin size={11} /> PINNED
                  </span>
                )}
                {(() => {
                  const cat = getCategoryBadge(selectedNotice.category);
                  return (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: cat.bg,
                      color: cat.color,
                      border: `1px solid ${cat.border}`,
                    }}>
                      {cat.icon}
                      {cat.label}
                    </span>
                  );
                })()}
                {getPriorityBadge(selectedNotice.priority)}
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Title */}
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', lineHeight: 1.35 }}>
              {selectedNotice.title}
            </h2>

            {/* Event / Scheduled Date Highlight */}
            {selectedNotice.eventDate && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#c7d2fe',
                fontSize: '0.9rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
              }}>
                <Calendar size={16} color="#818cf8" />
                <span>Scheduled Date & Time: {formatDateTime(selectedNotice.eventDate)}</span>
              </div>
            )}

            {/* Content Body (Scrollable) */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '0.5rem',
              marginRight: '-0.5rem',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
            }}>
              {selectedNotice.content}

              {selectedNotice.link && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <a
                    href={selectedNotice.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#818cf8',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>External Resource / Attached Document</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
            }}>
              <div>
                <span>Published by <strong>{selectedNotice.authorName || 'Administrator'}</strong></span>
                <span style={{ margin: '0 6px' }}>•</span>
                <span>{formatDateTime(selectedNotice.createdAt)}</span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NoticeBoard;
