import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Bell,
  Calendar,
  Clock,
  Pin,
  Plus,
  Trash2,
  Edit,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  Megaphone,
  ArrowLeft,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const AdminNotices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('announcement');
  const [priority, setPriority] = useState('normal');
  const [eventDate, setEventDate] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [isPinned, setIsPinned] = useState(false);
  const [tags, setTags] = useState('');
  const [link, setLink] = useState('');

  useEffect(() => {
    fetchNotices();
  }, [selectedCategory]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = { includeInactive: 'true' };
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

  const handleOpenCreateModal = () => {
    setEditingNotice(null);
    setTitle('');
    setContent('');
    setCategory('routine');
    setPriority('normal');
    setEventDate('');
    setTargetAudience('all');
    setIsPinned(false);
    setTags('');
    setLink('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (notice) => {
    setEditingNotice(notice);
    setTitle(notice.title || '');
    setContent(notice.content || '');
    setCategory(notice.category || 'announcement');
    setPriority(notice.priority || 'normal');
    setEventDate(notice.eventDate ? new Date(notice.eventDate).toISOString().slice(0, 16) : '');
    setTargetAudience(notice.targetAudience || 'all');
    setIsPinned(Boolean(notice.isPinned));
    setTags(notice.tags ? notice.tags.join(', ') : '');
    setLink(notice.link || '');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        eventDate: eventDate ? new Date(eventDate).toISOString() : null,
        targetAudience,
        isPinned,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        link: link.trim(),
      };

      if (editingNotice) {
        const res = await api.updateNotice(editingNotice._id, payload);
        if (res.success) {
          setSuccessMsg('Notice updated successfully!');
          setModalOpen(false);
          fetchNotices();
        }
      } else {
        const res = await api.createNotice(payload);
        if (res.success) {
          setSuccessMsg('New notice published successfully!');
          setModalOpen(false);
          fetchNotices();
        }
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save notice');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNotice = async (id, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete notice "${title}"?`)) {
      return;
    }
    try {
      const res = await api.deleteNotice(id);
      if (res.success) {
        setNotices((prev) => prev.filter((n) => n._id !== id));
        setSuccessMsg('Notice deleted successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete notice');
    }
  };

  const handleTogglePin = async (id) => {
    try {
      const res = await api.togglePinNotice(id);
      if (res.success) {
        setNotices((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isPinned: res.isPinned } : n))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle pin');
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredNotices = notices.filter((n) => {
    if (selectedCategory !== 'all' && n.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '2rem auto 5rem', padding: '0 1.5rem' }}>
      
      {/* Back button & Title */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          to="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Administrative Hub</span>
        </Link>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
              <ShieldAlert size={16} />
              <span>Administrative Publishing Suite</span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Notice Board & Routine Management
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
              Publish, schedule, edit, and pin exam routines, future instructions, and announcements.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/notices"
              className="btn-secondary"
              style={{ padding: '10px 18px', fontSize: '0.9rem' }}
            >
              <span>View Public Board</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenCreateModal}
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
              <span>Publish New Notice</span>
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '8px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#34d399',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
        }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* CONTROLS BAR: CATEGORIES & SEARCH */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Categories */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Items' },
              { id: 'routine', label: '📅 Routines' },
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
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: selectedCategory === tab.id
                    ? '1.5px solid #f43f5e'
                    : '1px solid var(--border-subtle)',
                  background: selectedCategory === tab.id
                    ? 'rgba(244, 63, 94, 0.15)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: selectedCategory === tab.id ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: selectedCategory === tab.id ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search published notices..."
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
        </div>
      </div>

      {/* NOTICES TABLE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
          Loading administrative notice records...
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Bell size={40} style={{ color: 'var(--text-dim)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            No Notices Published
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Click "Publish New Notice" above to publish your first exam schedule, routine, or instruction.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px' }}>Status / Pin</th>
                  <th style={{ padding: '12px 16px' }}>Title & Content Preview</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Event / Exam Date</th>
                  <th style={{ padding: '12px 16px' }}>Published</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotices.map((n) => (
                  <tr
                    key={n._id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: n.isPinned ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                    }}
                  >
                    {/* Pin toggle */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(n._id)}
                        title={n.isPinned ? 'Unpin Notice' : 'Pin Notice to Top'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: n.isPinned ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: `1px solid ${n.isPinned ? 'rgba(245, 158, 11, 0.5)' : 'var(--border-subtle)'}`,
                          color: n.isPinned ? '#fbbf24' : 'var(--text-dim)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Pin size={12} />
                        <span>{n.isPinned ? 'Pinned' : 'Pin'}</span>
                      </button>
                    </td>

                    {/* Title & Preview */}
                    <td style={{ padding: '14px 16px', maxWidth: '380px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '4px' }}>
                        {n.title}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.content}
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#818cf8',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        textTransform: 'capitalize',
                      }}>
                        {n.category.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: n.priority === 'urgent'
                          ? 'rgba(244, 63, 94, 0.2)'
                          : n.priority === 'high'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: n.priority === 'urgent' ? '#f43f5e' : n.priority === 'high' ? '#fbbf24' : 'var(--text-muted)',
                      }}>
                        {n.priority}
                      </span>
                    </td>

                    {/* Event Date */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.82rem', color: n.eventDate ? '#c7d2fe' : 'var(--text-dim)' }}>
                      {n.eventDate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} color="#818cf8" />
                          <span>{formatDateTime(n.eventDate)}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Created Date */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {formatDateTime(n.createdAt)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(n)}
                          style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#818cf8',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                          }}
                          title="Edit Notice"
                        >
                          <Edit size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteNotice(n._id, n.title)}
                          style={{
                            background: 'rgba(244, 63, 94, 0.15)',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            color: '#f43f5e',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                          }}
                          title="Delete Notice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT NOTICE MODAL */}
      {modalOpen && (
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
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={20} color="#f43f5e" />
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {editingNotice ? 'Edit Published Notice' : 'Publish Notice or Exam Routine'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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

            {errorMsg && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fda4af',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveNotice} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Notice Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fall 2026 Calculus Final Exam Schedule & Guidelines"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              {/* Category, Priority, Audience (3 Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(20, 24, 39, 0.9)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="routine">📅 Exam Routine / Schedule</option>
                    <option value="exam_date">⏰ Exam Date Announcement</option>
                    <option value="instruction">📌 Instructions & Guidelines</option>
                    <option value="announcement">📢 General Announcement</option>
                    <option value="urgent">🚨 Urgent Notice</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(20, 24, 39, 0.9)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(20, 24, 39, 0.9)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="all">All Users & Students</option>
                    <option value="students">Candidates Only</option>
                    <option value="admins">Faculty / Admins Only</option>
                  </select>
                </div>
              </div>

              {/* Event / Scheduled Exam Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Event / Exam Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  If publishing an exam routine or upcoming assessment date, specify the exact start time.
                </span>
              </div>

              {/* Content / Instructions */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Notice Content & Instructions *
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Provide detailed instructions, exam guidelines, room numbers, allowed tools (e.g. scratchpad), and policies..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Tags & External Link */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Tags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Midterm, Calculus, Anti-Cheat"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Attachment / External Link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              {/* Pin to Top Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="pin-notice-checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="pin-notice-checkbox" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                  Pin this notice to the top of the Notice Board
                </label>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.85rem',
                    background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                  }}
                >
                  {saving ? 'Publishing...' : editingNotice ? 'Save Changes' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminNotices;
