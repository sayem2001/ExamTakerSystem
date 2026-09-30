import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MathRenderer from '../components/MathRenderer';
import ExplanationRenderer from '../components/ExplanationRenderer';
import { SUBJECT_CONFIGS } from './admin/AdminAiPdfImport';
import {
  Upload,
  FileText,
  Sparkles,
  Zap,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Sliders,
  Play,
  RotateCcw,
  Layers,
  Lock,
  Key,
  Shield,
  ExternalLink,
  Check,
} from 'lucide-react';

export const StudentPracticeAi = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Subject Generator: 'math' | 'english' | 'universal'
  const [subjectType, setSubjectType] = useState('math');
  const currentSubjectConfig = SUBJECT_CONFIGS[subjectType] || SUBJECT_CONFIGS.math;

  const handleSubjectChange = (newSubject) => {
    if (newSubject === subjectType) return;
    setSubjectType(newSubject);
    const cfg = SUBJECT_CONFIGS[newSubject];
    if (cfg) {
      setTopic(cfg.defaultTopic);
    }
    setError('');
  };

  // Mode: 'pdf' or 'paste'
  const [inputMode, setInputMode] = useState('pdf');
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [topic, setTopic] = useState('Profit and Loss');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [title, setTitle] = useState('');

  // Generation state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedExam, setGeneratedExam] = useState(null);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  // Gemini API key state
  const [hasPersonalKey, setHasPersonalKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [quickKeyInput, setQuickKeyInput] = useState('');
  const [quickKeySaving, setQuickKeySaving] = useState(false);
  const [quickKeyMsg, setQuickKeyMsg] = useState('');

  useEffect(() => {
    fetchKeyStatus();
  }, []);

  const fetchKeyStatus = async () => {
    try {
      const res = await api.getStudentGeminiKeyStatus();
      if (res.success) {
        setHasPersonalKey(res.hasKey);
        setMaskedKey(res.maskedKey || '');
      }
    } catch (e) {
      // Non-fatal
    }
  };

  const handleQuickSaveKey = async () => {
    if (!quickKeyInput.trim()) return;
    try {
      setQuickKeySaving(true);
      setError('');
      setQuickKeyMsg('');
      const res = await api.saveStudentGeminiKey(quickKeyInput.trim());
      if (res.success) {
        setHasPersonalKey(true);
        setMaskedKey(res.maskedKey || `${quickKeyInput.slice(0, 4)}...${quickKeyInput.slice(-4)}`);
        setQuickKeyInput('');
        setQuickKeyMsg('Gemini API key successfully saved and activated!');
      } else {
        throw new Error(res.message || 'Failed to save key');
      }
    } catch (e) {
      setError(e.message || 'Failed to save Gemini key');
    } finally {
      setQuickKeySaving(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const ext = selected.name.toLowerCase();
      const isValid =
        selected.type === 'application/pdf' ||
        selected.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        selected.type === 'application/msword' ||
        ext.endsWith('.pdf') ||
        ext.endsWith('.docx') ||
        ext.endsWith('.doc');

      if (!isValid) {
        setError('Please select a valid PDF or Word (.docx) document.');
        return;
      }
      setFile(selected);
      setError('');
      const cleanName = selected.name.replace(/\.(pdf|docx|doc)$/i, '').replace(/[-_]/g, ' ');
      if (!title) {
        setTitle(`${cleanName} - Practice Set`);
      }

      if (subjectType === 'english') {
        if (/sentence\s*correction|parallel|modifier|grammar/i.test(cleanName)) {
          setTopic('Sentence Correction & Grammar');
        } else if (/critical\s*reasoning|argument|assumption|weaken/i.test(cleanName)) {
          setTopic('Critical Reasoning');
        } else if (/vocab|synonym|antonym/i.test(cleanName)) {
          setTopic('Vocabulary & Analogy');
        }
      } else if (subjectType === 'universal') {
        if (/বাংলা|সাহিত্য|ব্যাকরণ/i.test(cleanName)) {
          setTopic('বাংলা ব্যাকরণ ও সাহিত্য');
        } else if (/science|বিজ্ঞান/i.test(cleanName)) {
          setTopic('সাধারণ বিজ্ঞান');
        } else if (/ict|computer|তথ্য/i.test(cleanName)) {
          setTopic('তথ্য ও যোগাযোগ প্রযুক্তি (ICT)');
        }
      }
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');

    // Strictly enforce personal Gemini key requirement for non-admin students
    if (!isAdmin && !hasPersonalKey) {
      setError('Personal Gemini API key required. Regular users must configure their own Google Gemini API key to generate practice exams. Only administrators can use the system Gemini API. Please activate your free key below.');
      return;
    }

    if (inputMode === 'pdf' && !file) {
      setError('Please choose a PDF or Word (.docx) document containing your questions or study material.');
      return;
    }
    if (inputMode === 'paste' && (!pastedText || pastedText.trim().length < 20)) {
      setError('Please paste at least 20 characters of problem descriptions, syllabus, or exercise text.');
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(`Analyzing document and extracting ${currentSubjectConfig.name} concepts...`);

      let payload;
      if (inputMode === 'pdf') {
        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('topic', topic);
        formData.append('subjectType', subjectType);
        formData.append('difficulty', difficulty);
        formData.append('questionCount', questionCount);
        formData.append('title', title || `${topic} AI Practice Test`);
        payload = formData;
      } else {
        payload = {
          pastedText: pastedText.trim(),
          topic,
          subjectType,
          difficulty,
          questionCount,
          title: title || `${topic} AI Practice Test`,
        };
      }

      setStatusMessage(
        subjectType === 'math'
          ? 'Gemini AI is synthesizing high-caliber quantitative questions with clean LaTeX solutions...'
          : subjectType === 'english'
          ? 'Gemini AI is synthesizing verbal aptitude & sentence correction questions with nuanced explanations...'
          : 'Gemini AI is synthesizing high-discrimination academic & BCS-standard questions with full explanations...'
      );
      const res = await api.studentGeneratePractice(payload);

      if (res.success) {
        setGeneratedExam(res.exam);
        setGeneratedQuestions(res.exam.questions || []);
        setStatusMessage('Success! Your personal practice test has been compiled.');
      } else {
        throw new Error(res.message || 'Generation failed');
      }
    } catch (err) {
      console.error('Practice generation error:', err);
      setError(err.message || 'Failed to synthesize questions. Please verify your document and try again.');
    } finally {
      setLoading(false);
    }
  };

  const startExamImmediately = () => {
    if (generatedExam) {
      navigate(`/workspace/${generatedExam._id}`);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      
      {/* Header Banner */}
      <div
        className="glass-card"
        style={{
          padding: '2.5rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
            <Sparkles size={16} />
            <span>Isolated Student Practice Studio</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
            AI Practice Test Generator
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', maxWidth: '680px', lineHeight: 1.6 }}>
            Upload lecture PDFs or paste questions for Math, English Verbal, or Universal subjects (Bangla, Science, ICT). Our system synthesizes custom, trap-aware questions with comprehensive explanations—strictly private and isolated to your account.
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px 22px',
          borderRadius: '14px',
          textAlign: 'center',
          minWidth: '180px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#10b981', marginBottom: '4px' }}>
            <Lock size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>100% Private</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Visible only to you</div>
        </div>
      </div>

      {/* Gemini API Key Policy Banner */}
      {isAdmin ? (
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#818cf8', fontSize: '0.9rem', fontWeight: 600 }}>
            <Shield size={18} />
            <span>Administrator Authorized: System Gemini API access enabled.</span>
          </div>
          <Link to="/settings" style={{ color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Manage in Settings</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : hasPersonalKey ? (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', fontSize: '0.9rem', fontWeight: 600 }}>
            <CheckCircle size={18} />
            <span>Using your personal Gemini API key ({maskedKey}) for dedicated AI question generation.</span>
          </div>
          <Link to="/settings" style={{ color: '#818cf8', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Manage in Settings</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1.5px solid rgba(239, 68, 68, 0.35)',
          padding: '16px 20px',
          borderRadius: '14px',
          marginBottom: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Key size={18} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>
                  Personal Gemini API Key Required
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Regular users must provide their own Gemini API key. Only administrators can use the system Gemini API.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Get Free Key (Google AI Studio)</span>
                <ExternalLink size={13} />
              </a>
              <Link
                to="/settings"
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                <span>Settings</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Quick Key Activation Bar */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <input
              type="password"
              placeholder="Paste your Gemini API key here to activate immediately (starts with AIzaSy...)"
              value={quickKeyInput}
              onChange={(e) => setQuickKeyInput(e.target.value)}
              className="form-input"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
            />
            <button
              type="button"
              onClick={handleQuickSaveKey}
              disabled={quickKeySaving || !quickKeyInput.trim()}
              className="btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', flexShrink: 0 }}
            >
              {quickKeySaving ? 'Saving...' : 'Activate Key'}
            </button>
          </div>
          {quickKeyMsg && (
            <div style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 600 }}>{quickKeyMsg}</div>
          )}
        </div>
      )}

      {/* Main Workspace */}
      {!generatedExam ? (
        <form onSubmit={handleGenerate}>
          <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            
            {/* 3-WAY SPECIALIZED QUESTION GENERATOR SELECTOR */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color={currentSubjectConfig.accentColor} />
                  <span>3 Specialized Question Generators</span>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: currentSubjectConfig.accentColor,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${currentSubjectConfig.accentColor}40`,
                  padding: '3px 12px',
                  borderRadius: '20px',
                }}>
                  Active: {currentSubjectConfig.name} ({currentSubjectConfig.badgeText})
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {Object.values(SUBJECT_CONFIGS).map((subj) => {
                  const isSelected = subjectType === subj.id;
                  return (
                    <div
                      key={subj.id}
                      onClick={() => handleSubjectChange(subj.id)}
                      style={{
                        padding: '1.1rem 1.25rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.015)',
                        border: isSelected ? `2px solid ${subj.accentColor}` : '1px solid var(--border-subtle)',
                        boxShadow: isSelected ? `0 0 16px ${subj.accentColor}25` : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            background: `${subj.accentColor}25`,
                            color: subj.accentColor,
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                          }}>
                            {subj.id === 'math' ? '∑' : subj.id === 'english' ? 'Aa' : 'ব'}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isSelected ? '#fff' : '#e2e8f0' }}>
                              {subj.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: subj.accentColor, fontWeight: 700 }}>
                              {subj.badgeText}
                            </div>
                          </div>
                        </div>
                        {isSelected ? (
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: subj.accentColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Check size={12} color="#fff" />
                          </div>
                        ) : (
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: '1.5px solid #475569',
                          }} />
                        )}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                        {subj.tagline}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Input Selection Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setInputMode('pdf')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: inputMode === 'pdf' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                  color: inputMode === 'pdf' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Upload size={18} />
                <span>Upload PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => setInputMode('paste')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: inputMode === 'paste' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                  color: inputMode === 'paste' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <FileText size={18} />
                <span>Paste Problem Text / Notes</span>
              </button>
            </div>

            {/* Upload Area */}
            {inputMode === 'pdf' ? (
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Upload Source Document (PDF or Word DOCX)
                </label>
                <div
                  style={{
                    border: '2px dashed var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onClick={() => document.getElementById('student-pdf-upload').click()}
                >
                  <input
                    id="student-pdf-upload"
                    type="file"
                    accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <Upload size={36} color="#818cf8" style={{ margin: '0 auto 12px' }} />
                  {file ? (
                    <div>
                      <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.05rem', marginBottom: '4px' }}>
                        Selected: {file.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Click to replace document
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '6px' }}>
                        Click to select PDF or Word DOCX document or drag and drop here
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        Supports chapter PDFs, Word (.docx) notes, and question sets for {currentSubjectConfig.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Paste {currentSubjectConfig.name} Problems, Theory, or Exercise Text
                </label>
                <textarea
                  className="form-input"
                  rows={8}
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                  placeholder={currentSubjectConfig.placeholder}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                />
              </div>
            )}

            {/* Test Configuration Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {currentSubjectConfig.name} Topic / Focus
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`e.g. ${currentSubjectConfig.defaultTopic}`}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                />
                {currentSubjectConfig.quickTopics && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {currentSubjectConfig.quickTopics.slice(0, 4).map((qt) => (
                      <button
                        key={qt}
                        type="button"
                        onClick={() => setTopic(qt)}
                        style={{
                          background: topic === qt ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          border: topic === qt ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: topic === qt ? '#a5b4fc' : '#cbd5e1',
                          padding: '1px 7px',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                        }}
                      >
                        {qt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Target Difficulty
                </label>
                <select
                  className="form-input"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="easy">🟢 {currentSubjectConfig.difficulties.easy.title}</option>
                  <option value="medium">🟡 {currentSubjectConfig.difficulties.medium.title}</option>
                  <option value="hard">🔴 {currentSubjectConfig.difficulties.hard.title}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Number of Questions
                </label>
                <select
                  className="form-input"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                >
                  <option value={5}>5 Questions (Quick Drill - 12 mins)</option>
                  <option value={10}>10 Questions (Standard Practice - 25 mins)</option>
                  <option value={15}>15 Questions (Intensive Session - 40 mins)</option>
                  <option value={20}>20 Questions (Full Assessment - 50 mins)</option>
                  <option value={30}>30 Questions (Mastery Benchmark - 60 mins)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Custom Test Title (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sprint Practice Set"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Error & Status Display */}
            {error && (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
                {error.toLowerCase().includes('gemini') && (
                  <Link
                    to="/settings"
                    className="btn-primary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      background: '#ef4444',
                      border: 'none',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Open Settings to Add Key</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}

            {/* Action Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  padding: '14px 28px',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <Zap size={18} className="animate-spin" />
                    <span>Synthesizing Questions with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Generate Private Practice Exam</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

            {loading && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#818cf8', fontSize: '0.9rem', fontWeight: 500 }}>
                {statusMessage}
              </div>
            )}

          </div>
        </form>
      ) : (
        /* Generated Exam Success & Preview */
        <div>
          <div
            className="glass-card"
            style={{
              padding: '2rem',
              marginBottom: '2rem',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                  <CheckCircle size={18} />
                  <span>Practice Test Successfully Compiled & Saved</span>
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {generatedExam.title}
                </h2>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.85rem', color: '#94a3b8' }}>
                  <span>Topic: <strong style={{ color: 'var(--text-main)' }}>{generatedExam.topic}</strong></span>
                  <span>•</span>
                  <span>Difficulty: <strong style={{ color: '#818cf8', textTransform: 'capitalize' }}>{generatedExam.difficulty}</strong></span>
                  <span>•</span>
                  <span>Questions: <strong style={{ color: 'var(--text-main)' }}>{generatedQuestions.length}</strong></span>
                  <span>•</span>
                  <span>Duration: <strong style={{ color: 'var(--text-main)' }}>{generatedExam.durationMinutes} mins</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedExam(null);
                    setGeneratedQuestions([]);
                  }}
                  className="btn-secondary"
                  style={{ padding: '12px 18px', fontSize: '0.9rem' }}
                >
                  <RotateCcw size={16} />
                  <span>Generate Another</span>
                </button>

                <button
                  type="button"
                  onClick={startExamImmediately}
                  className="btn-primary"
                  style={{
                    padding: '12px 24px',
                    fontSize: '0.95rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  }}
                >
                  <Play size={16} />
                  <span>Start Practice Test Now</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>Exam Code: <code style={{ color: '#818cf8', fontWeight: 700 }}>{generatedExam.examCode}</code> (Private to your account)</span>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>

          {/* Question Previews */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#818cf8" />
              <span>Question Preview ({generatedQuestions.length} Problems)</span>
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Verified formulas & step-by-step LaTeX derivations
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {generatedQuestions.map((q, idx) => (
              <div
                key={idx}
                className="glass-card"
                style={{
                  padding: '1.75rem',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 800, color: '#818cf8', fontSize: '0.9rem' }}>
                    Problem {idx + 1} of {generatedQuestions.length}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#a5b4fc',
                    fontWeight: 600,
                  }}>
                    {q.topic || generatedExam.topic}
                  </span>
                </div>

                {/* Problem Statement */}
                <div style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                  <MathRenderer text={q.questionText} />
                </div>

                {/* Options List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginBottom: '1.25rem' }}>
                  {(q.options || []).map((opt) => {
                    const isCorrect = opt.key === q.correctOption;
                    return (
                      <div
                        key={opt.key}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isCorrect ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-subtle)',
                          background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '10px',
                        }}
                      >
                        <span style={{
                          fontWeight: 700,
                          color: isCorrect ? '#10b981' : '#818cf8',
                          minWidth: '22px',
                        }}>
                          {opt.key})
                        </span>
                        <div style={{ flex: 1, fontSize: '0.9rem', color: isCorrect ? '#10b981' : 'var(--text-main)' }}>
                          <MathRenderer text={opt.text} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detailed Pedagogical Explanation */}
                {q.explanation && (
                  <ExplanationRenderer
                    explanation={q.explanation}
                    correctOption={q.correctOption}
                    defaultExpanded={false}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Bottom Launch Bar */}
          <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={startExamImmediately}
              className="btn-primary"
              style={{
                padding: '16px 36px',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.4)',
              }}
            >
              <Play size={20} />
              <span>Launch Practice Test Workspace Now</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentPracticeAi;
