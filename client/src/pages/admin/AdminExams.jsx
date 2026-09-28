import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Edit,
  Share2,
  Calendar,
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';

export const AdminExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    topic: 'Calculus',
    difficulty: 'easy',
    description: '',
    durationMinutes: 60,
    passPercentage: 50,
    negativeMarking: true,
    negativeMarkingRate: 0.25,
    scheduledDate: new Date().toISOString().slice(0, 16),
    scheduledEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    antiCheatSettings: {
      fullScreenRequired: true,
      maxTabSwitches: 3,
      blockCopyPaste: true,
      disableRightClick: true,
    },
  });

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.getExams();
      if (res.success) {
        setExams(res.exams);
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleCopyLink = (exam) => {
    const link = `${window.location.origin}/exam/${exam.examCode || exam._id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(exam._id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this exam? Associated attempt records will be cleared.')) {
      try {
        await api.deleteExam(id);
        fetchExams();
      } catch (err) {
        alert(err.message || 'Failed to delete exam');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExam) {
        await api.updateExam(editingExam._id, formData);
      } else {
        await api.createExam(formData);
      }
      setShowModal(false);
      setEditingExam(null);
      fetchExams();
    } catch (err) {
      alert(err.message || 'Failed to save exam');
    }
  };

  const openCreateModal = () => {
    setEditingExam(null);
    setFormData({
      title: '',
      topic: 'Calculus',
      difficulty: 'easy',
      description: '',
      durationMinutes: 60,
      passPercentage: 50,
      negativeMarking: true,
      negativeMarkingRate: 0.25,
      scheduledDate: new Date().toISOString().slice(0, 16),
      scheduledEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      antiCheatSettings: {
        fullScreenRequired: true,
        maxTabSwitches: 3,
        blockCopyPaste: true,
        disableRightClick: true,
      },
    });
    setShowModal(true);
  };

  const openEditModal = (exam) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      topic: exam.topic,
      difficulty: exam.difficulty,
      description: exam.description || '',
      durationMinutes: exam.durationMinutes || 60,
      passPercentage: exam.passPercentage || 50,
      negativeMarking: exam.negativeMarking !== undefined ? exam.negativeMarking : true,
      negativeMarkingRate: exam.negativeMarkingRate || 0.25,
      scheduledDate: exam.scheduledDate ? new Date(exam.scheduledDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      scheduledEndDate: exam.scheduledEndDate ? new Date(exam.scheduledEndDate).toISOString().slice(0, 16) : '',
      antiCheatSettings: exam.antiCheatSettings || {
        fullScreenRequired: true,
        maxTabSwitches: 3,
        blockCopyPaste: true,
        disableRightClick: true,
      },
    });
    setShowModal(true);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '2.5rem auto 5rem', padding: '0 1.5rem' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '2.5rem',
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 700, marginBottom: '4px' }}>
            Administrative Exam Management
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc' }}>
            Exams, Schedules & Access Links
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Create custom exams, adjust time limits, configure anti-cheat policies, and generate shareable links.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn-primary" style={{ padding: '12px 20px' }}>
          <Plus size={18} />
          <span>Create New Exam</span>
        </button>
      </div>

      {/* EXAMS TABLE */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            Loading exam catalog...
          </div>
        ) : exams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            No exams created yet. Use "Create New Exam" or "AI PDF Importer" to add assessments.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.03)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 18px' }}>Exam Title & Topic</th>
                  <th style={{ padding: '14px 18px' }}>Difficulty</th>
                  <th style={{ padding: '14px 18px' }}>Exam Code</th>
                  <th style={{ padding: '14px 18px' }}>Duration</th>
                  <th style={{ padding: '14px 18px' }}>Questions</th>
                  <th style={{ padding: '14px 18px' }}>Pass Mark</th>
                  <th style={{ padding: '14px 18px' }}>Shareable Link</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => {
                  const isCopied = copiedId === exam._id;
                  const link = `${window.location.origin}/exam/${exam.examCode || exam._id}`;

                  return (
                    <tr key={exam._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                          {exam.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#818cf8', marginTop: '2px' }}>
                          Topic: {exam.topic}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span className={`badge badge-${exam.difficulty}`}>
                          {exam.difficulty}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#cbd5e1' }}>
                        {exam.examCode}
                      </td>

                      <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                        {exam.durationMinutes} mins
                      </td>

                      <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                        {exam.questions?.length || 0} MCQs
                      </td>

                      <td style={{ padding: '14px 18px', color: '#10b981', fontWeight: 600 }}>
                        {exam.passPercentage}%
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <button
                          onClick={() => handleCopyLink(exam)}
                          className="btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isCopied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                            borderColor: isCopied ? '#10b981' : 'var(--border-subtle)',
                            color: isCopied ? '#34d399' : '#cbd5e1',
                          }}
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{isCopied ? 'Link Copied!' : 'Copy Link'}</span>
                        </button>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Link
                            to={`/exam/${exam.examCode || exam._id}`}
                            className="btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="Preview Exam Lobby"
                            target="_blank"
                          >
                            <ExternalLink size={14} />
                          </Link>
                          <button
                            onClick={() => openEditModal(exam)}
                            className="btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="Edit Exam Settings"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(exam._id)}
                            className="btn-danger"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="Delete Exam"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* CREATE / EDIT EXAM MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
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
            border: '1px solid rgba(99, 102, 241, 0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
                {editingExam ? 'Edit Exam Settings' : 'Create & Schedule Exam'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Exam Title
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Calculus Midterm Examination - Easy Level"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Topic
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Calculus, Linear Algebra"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Difficulty Tier
                  </label>
                  <select
                    className="form-select"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy Level</option>
                    <option value="medium">Medium Level</option>
                    <option value="hard">Hard Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Description / Syllabus
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Brief summary of concepts covered..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="5"
                    className="form-input"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Pass Mark (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-input"
                    value={formData.passPercentage}
                    onChange={(e) => setFormData({ ...formData, passPercentage: parseInt(e.target.value, 10) })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Negative Mark (-pts)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    className="form-input"
                    value={formData.negativeMarkingRate}
                    onChange={(e) => setFormData({ ...formData, negativeMarkingRate: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Scheduled Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Scheduled End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.scheduledEndDate}
                    onChange={(e) => setFormData({ ...formData, scheduledEndDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Anti-cheat settings */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '8px',
                padding: '1rem',
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={16} />
                  <span>Proctoring Security Rules</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.antiCheatSettings.fullScreenRequired}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          antiCheatSettings: {
                            ...formData.antiCheatSettings,
                            fullScreenRequired: e.target.checked,
                          },
                        })
                      }
                      style={{ accentColor: '#6366f1' }}
                    />
                    <span>Full-Screen Required</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.antiCheatSettings.blockCopyPaste}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          antiCheatSettings: {
                            ...formData.antiCheatSettings,
                            blockCopyPaste: e.target.checked,
                          },
                        })
                      }
                      style={{ accentColor: '#6366f1' }}
                    />
                    <span>Block Copy & Paste</span>
                  </label>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                      Max Tab Switches (Strikes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      value={formData.antiCheatSettings.maxTabSwitches}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          antiCheatSettings: {
                            ...formData.antiCheatSettings,
                            maxTabSwitches: parseInt(e.target.value, 10),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  <span>{editingExam ? 'Update Exam' : 'Publish & Schedule Exam'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminExams;
