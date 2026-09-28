import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import MathRenderer from '../../components/MathRenderer';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Edit2,
  Trash2,
  Zap,
} from 'lucide-react';

export const AdminAiPdfImport = () => {
  const navigate = useNavigate();

  const [pdfFile, setPdfFile] = useState(null);
  const [topic, setTopic] = useState('Calculus');
  const [questionCount, setQuestionCount] = useState(30);
  const [mode, setMode] = useState('auto-3-exams'); // 'auto-3-exams' | 'review'

  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [createdExams, setCreatedExams] = useState([]);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setError('Please select a valid PDF document.');
        return;
      }
      setPdfFile(file);
      setError('');

      // Auto-detect topic from filename
      const filename = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      if (/profit|loss/i.test(filename)) {
        setTopic('Profit and Loss');
      } else if (/calculus|integral|derivative/i.test(filename)) {
        setTopic('Calculus');
      } else if (/algebra|matrix|vector/i.test(filename)) {
        setTopic('Linear Algebra');
      } else if (/geometry/i.test(filename)) {
        setTopic('Geometry');
      } else if (/trigonometry/i.test(filename)) {
        setTopic('Trigonometry');
      } else if (/probability|statistics/i.test(filename)) {
        setTopic('Probability & Statistics');
      } else {
        const cleaned = filename
          .replace(/^ACS\s*IBA\s*Math\s*Quant\s*/i, '')
          .replace(/^Chapter\s*\d+\s*/i, '')
          .trim();
        if (cleaned.length > 2) {
          setTopic(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
        }
      }
    }
  };

  const handleProcess = async () => {
    if (!pdfFile) {
      setError('Please upload an examination PDF first.');
      return;
    }
    if (!topic.trim()) {
      setError('Please provide a subject topic.');
      return;
    }

    setProcessing(true);
    setError('');
    setProgressMsg('Uploading PDF and extracting textual content...');

    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('topic', topic.trim());
      formData.append('questionCount', questionCount);
      formData.append('difficulty', 'auto');

      setProgressMsg('Connecting to Gemini AI Engine & analyzing mathematical difficulty...');
      const res = await api.uploadAndProcessPdf(formData);

      if (!res.success || !res.questions || res.questions.length === 0) {
        throw new Error(res.message || 'No questions could be extracted from PDF.');
      }

      const effectiveTopic = res.meta?.detectedTopic || topic.trim();
      setExtractedQuestions(res.questions);

      if (mode === 'auto-3-exams') {
        setProgressMsg('Auto-synthesizing 3 exams: Easy, Medium, and Hard...');
        const autoRes = await api.autoCreateThreeExams({
          topic: effectiveTopic,
          questions: res.questions,
          pdfDocument: {
            filename: res.meta?.filename,
            originalName: res.meta?.originalName,
          },
        });

        if (autoRes.success) {
          setCreatedExams(autoRes.exams);
        }
      }
    } catch (err) {
      console.error('PDF AI processing error:', err);
      setError(err.message || 'Failed to process PDF with Gemini');
    } finally {
      setProcessing(false);
      setProgressMsg('');
    }
  };

  const handleCopyExamLink = (code) => {
    const link = `${window.location.origin}/exam/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '2.5rem auto 5rem', padding: '0 1.5rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
          <Sparkles size={18} />
          <span>Gemini AI PDF Synthesis</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc' }}>
          AI PDF Exam Generator
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '750px' }}>
          Upload PDF files containing 100 to 200 mathematical MCQs. The AI parses the text, derives formulas in LaTeX, and automatically stratifies questions into <strong>Easy, Medium, and Hard</strong> difficulty assessments.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#fda4af',
          marginBottom: '2rem',
        }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS STATE: 3 EXAMS GENERATED */}
      {createdExams.length > 0 ? (
        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(16, 185, 129, 0.4)', marginBottom: '3rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <CheckCircle2 size={32} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
              3 Difficulty Exams Successfully Generated!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              The questions from your PDF have been classified and published for <strong>{topic}</strong>.
            </p>
          </div>

          {/* Cards for the 3 generated exams */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {createdExams.map((ex) => {
              const isCopied = copiedCode === ex.examCode;
              return (
                <div
                  key={ex._id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className={`badge badge-${ex.difficulty}`}>
                        {ex.difficulty} Level
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                        {ex.examCode}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                      {ex.title}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                      {ex.questions?.length || 0} Questions • {ex.durationMinutes} Mins Duration
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleCopyExamLink(ex.examCode)}
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '0.8rem',
                        background: isCopied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                        borderColor: isCopied ? '#10b981' : 'var(--border-subtle)',
                        color: isCopied ? '#34d399' : '#cbd5e1',
                      }}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    <Link
                      to={`/exam/${ex.examCode}`}
                      target="_blank"
                      className="btn-primary"
                      style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                    >
                      <span>Preview</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              onClick={() => {
                setCreatedExams([]);
                setPdfFile(null);
              }}
              className="btn-secondary"
            >
              Upload Another PDF
            </button>
            <Link to="/admin/exams" className="btn-primary">
              View All Scheduled Exams
            </Link>
          </div>
        </div>
      ) : (
        /* UPLOAD & CONFIGURATION FORM */
        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          
          {/* Dropzone */}
          <div style={{
            border: '2px dashed rgba(99, 102, 241, 0.4)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            textAlign: 'center',
            background: 'rgba(99, 102, 241, 0.03)',
            marginBottom: '2rem',
            position: 'relative',
            cursor: 'pointer',
          }}>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <UploadCloud size={28} color="#818cf8" />
            </div>

            {pdfFile ? (
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>
                  📄 {pdfFile.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                  {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI Extraction
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                  Click to select or drag and drop your exam PDF
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px' }}>
                  Supports up to 50MB PDFs containing 100 to 200 MCQs
                </div>
              </div>
            )}
          </div>

          {/* Form Options */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Mathematical Topic
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Calculus, Linear Algebra, Real Analysis"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Target Questions to Extract
              </label>
              <select
                className="form-select"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
              >
                <option value={15}>15 Questions (Quick Sample)</option>
                <option value={30}>30 Questions (Standard Test)</option>
                <option value={60}>60 Questions (Comprehensive)</option>
                <option value={100}>100 Questions (Full Assessment)</option>
                <option value={150}>150 Questions (Mega Bank)</option>
                <option value={200}>200 Questions (Maximum Capacity)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Generation Mode
              </label>
              <select
                className="form-select"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="auto-3-exams">
                  ⚡ Auto-create 3 Exams (Easy, Med, Hard)
                </option>
                <option value="review">
                  🔍 Extract & Review in Question Bank
                </option>
              </select>
            </div>
          </div>

          {/* Progress / Status banner during processing */}
          {processing && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '10px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '2rem',
            }}>
              <div className="animate-spin" style={{
                width: '24px',
                height: '24px',
                border: '3px solid rgba(99, 102, 241, 0.3)',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
              }} />
              <div>
                <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                  Processing with Google Gemini AI...
                </div>
                <div style={{ fontSize: '0.8rem', color: '#a5b4fc', marginTop: '2px' }}>
                  {progressMsg}
                </div>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleProcess}
              disabled={!pdfFile || processing}
              className="btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              }}
            >
              {processing ? (
                <span>Extracting Questions...</span>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Start AI PDF Processing</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* If Review Mode, Show Extracted Questions Table */}
      {extractedQuestions.length > 0 && createdExams.length === 0 && (
        <div style={{ marginTop: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
                Extracted Questions ({extractedQuestions.length})
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Review extracted MCQs before finalizing into assessments.
              </p>
            </div>
            <button
              onClick={async () => {
                const autoRes = await api.autoCreateThreeExams({
                  topic: topic.trim(),
                  questions: extractedQuestions,
                });
                if (autoRes.success) {
                  setCreatedExams(autoRes.exams);
                }
              }}
              className="btn-primary"
            >
              <span>Convert to 3 Difficulty Exams Now</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {extractedQuestions.map((q, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#818cf8' }}>#{idx + 1}</span>
                    <span className={`badge badge-${q.difficulty}`}>
                      {q.difficulty}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                    Correct: Option {q.correctOption}
                  </span>
                </div>

                <div style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '1rem' }}>
                  <MathRenderer text={q.questionText} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.85rem' }}>
                  {q.options?.map((opt) => (
                    <div
                      key={opt.key}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: opt.key === q.correctOption ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: opt.key === q.correctOption ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                        color: opt.key === q.correctOption ? '#34d399' : '#cbd5e1',
                      }}
                    >
                      <strong>{opt.key})</strong> <MathRenderer text={opt.text} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminAiPdfImport;
