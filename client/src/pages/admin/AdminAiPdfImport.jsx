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
  Calendar,
  Clock,
  Shield,
  Zap,
  Sliders,
  RefreshCw,
  Eye,
} from 'lucide-react';

export const AdminAiPdfImport = () => {
  const navigate = useNavigate();

  // Wizard Steps: 1 = Upload & Configure, 2 = Review Questions, 3 = Schedule Exam, 4 = Success
  const [step, setStep] = useState(1);

  // Configuration state
  const [pdfFile, setPdfFile] = useState(null);
  const [topic, setTopic] = useState('Profit and Loss');
  const [questionCount, setQuestionCount] = useState(30);
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [generationMode, setGenerationMode] = useState('single-scheduled'); // 'single-scheduled' | 'auto-3-exams'

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [pdfMeta, setPdfMeta] = useState(null);
  const [createdExams, setCreatedExams] = useState([]);
  const [singleScheduledExam, setSingleScheduledExam] = useState(null);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Scheduling Form state
  const nowStr = new Date().toISOString().slice(0, 16);
  const futureStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [scheduledStartDate, setScheduledStartDate] = useState(nowStr);
  const [scheduledEndDate, setScheduledEndDate] = useState(futureStr);
  const [passPercentage, setPassPercentage] = useState(50);
  const [negativeMarking, setNegativeMarking] = useState(true);
  const [negativeRate, setNegativeRate] = useState(0.25);
  const [antiCheatSettings, setAntiCheatSettings] = useState({
    fullScreenRequired: true,
    maxTabSwitches: 3,
    blockCopyPaste: true,
    disableRightClick: true,
  });

  // Handle PDF file selection and auto-detect topic from filename
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

  // Step 1 -> Process PDF with Gemini AI
  const handleProcessPdf = async () => {
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
    setProgressMsg('Extracting document text and scanning problem archetypes...');

    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('topic', topic.trim());
      formData.append('questionCount', questionCount);
      formData.append('difficulty', difficulty);

      setProgressMsg(`Synthesizing ${questionCount} ${difficulty.toUpperCase()} questions (applying transformation rules)...`);
      const res = await api.uploadAndProcessPdf(formData);

      if (!res.success || !res.questions || res.questions.length === 0) {
        throw new Error(res.message || 'No questions could be synthesized from PDF.');
      }

      const effectiveTopic = res.meta?.detectedTopic || topic.trim();
      setTopic(effectiveTopic);
      setExtractedQuestions(res.questions);
      setPdfMeta(res.meta);

      if (generationMode === 'auto-3-exams') {
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
          setStep(4);
        }
      } else {
        // Pre-fill schedule title
        setScheduleTitle(`${effectiveTopic} Assessment (${difficulty.toUpperCase()} Tier)`);
        setStep(2); // Proceed to Review Step
      }
    } catch (err) {
      console.error('PDF AI processing error:', err);
      setError(err.message || 'Failed to process PDF with Gemini');
    } finally {
      setProcessing(false);
      setProgressMsg('');
    }
  };

  // Step 3 -> Schedule Exam
  const handleScheduleExam = async (e) => {
    e.preventDefault();
    if (!scheduleTitle.trim()) {
      setError('Please enter an exam title.');
      return;
    }

    setProcessing(true);
    setError('');
    setProgressMsg('Publishing and scheduling assessment...');

    try {
      const res = await api.scheduleGeneratedExam({
        title: scheduleTitle.trim(),
        topic: topic.trim(),
        difficulty,
        scheduledDate: scheduledStartDate,
        scheduledEndDate: scheduledEndDate,
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        passPercentage: parseInt(passPercentage, 10) || 50,
        negativeMarking,
        negativeMarkingRate: parseFloat(negativeRate) || 0.25,
        antiCheatSettings,
        questions: extractedQuestions,
        pdfDocument: pdfMeta
          ? {
              filename: pdfMeta.filename,
              originalName: pdfMeta.originalName,
            }
          : undefined,
      });

      if (res.success && res.exam) {
        setSingleScheduledExam(res.exam);
        setStep(4); // Success step
      }
    } catch (err) {
      console.error('Schedule error:', err);
      setError(err.message || 'Failed to schedule exam.');
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

  // Difficulty explanation helper
  const getDifficultyInfo = (diff) => {
    switch (diff) {
      case 'easy':
        return {
          title: 'Easy: Numerical Variation',
          color: '#34d399',
          bg: 'rgba(16, 185, 129, 0.1)',
          border: 'rgba(16, 185, 129, 0.3)',
          desc: 'Preserves the identical 1-step problem structure, but changes all numbers, values, and entities with newly recalculated options & solutions.',
        };
      case 'hard':
        return {
          title: 'Hard: Complex Word Problem',
          color: '#f43f5e',
          bg: 'rgba(244, 63, 94, 0.1)',
          border: 'rgba(244, 63, 94, 0.3)',
          desc: 'Synthesizes challenging multi-tier word problems with realistic real-world constraints (e.g. faulty weights, fractional spoilage, compound algebraic equations).',
        };
      case 'medium':
      default:
        return {
          title: 'Medium: Conceptual Extension',
          color: '#fbbf24',
          bg: 'rgba(245, 158, 11, 0.1)',
          border: 'rgba(245, 158, 11, 0.3)',
          desc: 'Adds a secondary calculation step, inverts unknown variables (e.g. solve for original cost), or combines sequential discounts/taxes.',
        };
    }
  };

  const currentDiffInfo = getDifficultyInfo(difficulty);

  return (
    <div style={{ maxWidth: '1100px', margin: '2.5rem auto 5rem', padding: '0 1.5rem' }}>
      
      {/* Header & Stepper */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
          <Sparkles size={18} />
          <span>Gemini AI Intelligent PDF Exam Creator</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
          AI PDF Exam Generator & Scheduler
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '800px' }}>
          Upload math examination PDFs. The AI scans the problem archetypes and synthesizes customized, brand-new MCQs at your selected difficulty level without copy-pasting the original.
        </p>

        {/* Wizard Step Indicators */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { num: 1, label: '1. Upload & Difficulty Rule' },
            { num: 2, label: '2. Review Synthesized Questions' },
            { num: 3, label: '3. Schedule & Proctoring' },
            { num: 4, label: '4. Published & Active' },
          ].map((s) => (
            <div
              key={s.num}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: step === s.num ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                border: step === s.num ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                color: step === s.num ? '#a5b4fc' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{s.label}</span>
            </div>
          ))}
        </div>
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

      {/* ================= STEP 1: UPLOAD & DIFFICULTY ================= */}
      {step === 1 && (
        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          
          {/* Dropzone */}
          <div style={{
            border: '2px dashed rgba(99, 102, 241, 0.4)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
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
                  {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI Synthesis
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                  Click to select or drag and drop your exam PDF
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px' }}>
                  Extracts complete document text and identifies diverse question types
                </div>
              </div>
            )}
          </div>

          {/* Form Options */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Mathematical Topic (Auto-Detected)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Profit and Loss, Calculus, Linear Algebra"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Target Question Count
              </label>
              <select
                className="form-select"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
              >
                <option value={10}>10 Questions (Short Test)</option>
                <option value={20}>20 Questions (Standard Quiz)</option>
                <option value={30}>30 Questions (Full Assessment)</option>
                <option value={40}>40 Questions (Comprehensive Exam)</option>
                <option value={50}>50 Questions (Mega Bank)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Workflow Mode
              </label>
              <select
                className="form-select"
                value={generationMode}
                onChange={(e) => setGenerationMode(e.target.value)}
              >
                <option value="single-scheduled">
                  📅 Synthesize Questions & Schedule Exam
                </option>
                <option value="auto-3-exams">
                  ⚡ Auto-create 3 Exams (Easy, Med, Hard)
                </option>
              </select>
            </div>
          </div>

          {/* Difficulty Selection & Indicator Box */}
          {generationMode === 'single-scheduled' && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                Select Target Difficulty Level & Modification Strength:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                {[
                  { id: 'easy', label: 'Easy (Number Variation Only)', color: '#34d399' },
                  { id: 'medium', label: 'Medium (Concept Extension)', color: '#fbbf24' },
                  { id: 'hard', label: 'Hard (Word Problem / Multi-Tier)', color: '#f43f5e' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      textAlign: 'left',
                      background: difficulty === d.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: difficulty === d.id ? `2px solid ${d.color}` : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: d.color }}>
                      {d.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Dynamic Indicator Callout */}
              <div style={{
                background: currentDiffInfo.bg,
                border: `1px solid ${currentDiffInfo.border}`,
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}>
                <Sliders size={20} color={currentDiffInfo.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: currentDiffInfo.color }}>
                    {currentDiffInfo.title}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '3px', lineHeight: 1.5 }}>
                    {currentDiffInfo.desc}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Banner */}
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
                  Processing with Gemini AI Engine...
                </div>
                <div style={{ fontSize: '0.8rem', color: '#a5b4fc', marginTop: '2px' }}>
                  {progressMsg}
                </div>
              </div>
            </div>
          )}

          {/* Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleProcessPdf}
              disabled={!pdfFile || processing}
              className="btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              }}
            >
              {processing ? (
                <span>Synthesizing Questions...</span>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Start AI Question Synthesis</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* ================= STEP 2: REVIEW QUESTIONS ================= */}
      {step === 2 && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className={`badge badge-${difficulty}`}>
                  {difficulty.toUpperCase()} LEVEL
                </span>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Topic: <strong>{topic}</strong>
                </span>
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
                Synthesized Questions ({extractedQuestions.length})
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                All questions have been uniquely modified and solved. Review below before setting the exam schedule.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(1)}
                className="btn-secondary"
                style={{ padding: '10px 16px', fontSize: '0.85rem' }}
              >
                <RefreshCw size={14} />
                <span>Re-configure</span>
              </button>

              <button
                onClick={() => setStep(3)}
                className="btn-primary"
                style={{
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
              >
                <span>Proceed to Schedule Exam</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Question Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {extractedQuestions.map((q, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 800, color: '#818cf8', fontSize: '1rem' }}>
                    Question {idx + 1} of {extractedQuestions.length}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#34d399',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}>
                    Correct Option: {q.correctOption}
                  </span>
                </div>

                <div style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  <MathRenderer text={q.questionText} />
                </div>

                {/* Options grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: '1rem' }}>
                  {q.options?.map((opt) => {
                    const isCorrect = opt.key.toUpperCase() === (q.correctOption || '').toUpperCase();
                    return (
                      <div
                        key={opt.key}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          border: isCorrect ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                          color: isCorrect ? '#34d399' : '#cbd5e1',
                          fontSize: '0.85rem',
                        }}
                      >
                        <strong>{opt.key})</strong> <MathRenderer text={opt.text} />
                      </div>
                    );
                  })}
                </div>

                {/* Step-by-Step Explanation */}
                {q.explanation && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderLeft: '3px solid #6366f1',
                    padding: '0.75rem 1rem',
                    borderRadius: '0 8px 8px 0',
                    fontSize: '0.85rem',
                    color: '#cbd5e1',
                  }}>
                    <strong style={{ color: '#a5b4fc' }}>Derivation / Solution: </strong>
                    <MathRenderer text={q.explanation} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Next Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              onClick={() => setStep(3)}
              className="btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}
            >
              <span>Proceed to Schedule Exam</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: SCHEDULE EXAM FORM ================= */}
      {step === 3 && (
        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
              <Calendar size={18} />
              <span>Step 3: Assessment Scheduling</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
              Schedule & Publish Assessment
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Set testing window, duration, passing criteria, and anti-cheat lockdown policies for your {extractedQuestions.length} synthesized questions.
            </p>
          </div>

          <form onSubmit={handleScheduleExam}>
            {/* Title & Topic */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Exam Title
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Topic / Subject
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={topic}
                  disabled
                  style={{ opacity: 0.8 }}
                />
              </div>
            </div>

            {/* Timing & Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Scheduled Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={scheduledStartDate}
                  onChange={(e) => setScheduledStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Scheduled End Date (Expiry)
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={scheduledEndDate}
                  onChange={(e) => setScheduledEndDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Test Duration (Minutes)
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="5"
                  max="300"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="100"
                  value={passPercentage}
                  onChange={(e) => setPassPercentage(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Anti-cheat Policies */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#f8fafc', fontWeight: 700 }}>
                <Shield size={18} color="#6366f1" />
                <span>Anti-Cheat Proctoring Rules</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={antiCheatSettings.fullScreenRequired}
                    onChange={(e) => setAntiCheatSettings({ ...antiCheatSettings, fullScreenRequired: e.target.checked })}
                  />
                  <span>Enforce Fullscreen Mode</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={antiCheatSettings.blockCopyPaste}
                    onChange={(e) => setAntiCheatSettings({ ...antiCheatSettings, blockCopyPaste: e.target.checked })}
                  />
                  <span>Block Copy & Paste</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={antiCheatSettings.disableRightClick}
                    onChange={(e) => setAntiCheatSettings({ ...antiCheatSettings, disableRightClick: e.target.checked })}
                  />
                  <span>Disable Right Click & Inspect</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Max Allowed Tab Switches:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-input"
                    style={{ width: '70px', padding: '4px 8px' }}
                    value={antiCheatSettings.maxTabSwitches}
                    onChange={(e) => setAntiCheatSettings({ ...antiCheatSettings, maxTabSwitches: parseInt(e.target.value, 10) || 3 })}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-secondary"
              >
                Back to Questions
              </button>

              <button
                type="submit"
                disabled={processing}
                className="btn-primary"
                style={{
                  padding: '14px 32px',
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
              >
                {processing ? (
                  <span>Publishing Exam...</span>
                ) : (
                  <>
                    <Zap size={18} />
                    <span>Publish & Schedule Exam</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= STEP 4: SUCCESS / CONFIRMATION ================= */}
      {step === 4 && (
        <div>
          {singleScheduledExam ? (
            <div className="glass-card" style={{ padding: '3rem', border: '1px solid rgba(16, 185, 129, 0.4)', textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}>
                <CheckCircle2 size={36} color="#10b981" />
              </div>

              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
                Exam Successfully Scheduled!
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '2rem' }}>
                Your assessment has been generated and published. Students can now take the exam using the code below.
              </p>

              {/* Exam Info Card */}
              <div style={{
                maxWidth: '540px',
                margin: '0 auto 2.5rem',
                padding: '1.5rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className={`badge badge-${singleScheduledExam.difficulty}`}>
                    {singleScheduledExam.difficulty.toUpperCase()} TIER
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    Code: {singleScheduledExam.examCode}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                  {singleScheduledExam.title}
                </h3>

                <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>📚 <strong>Topic:</strong> {singleScheduledExam.topic}</div>
                  <div>⏱️ <strong>Duration:</strong> {singleScheduledExam.durationMinutes} Minutes</div>
                  <div>📝 <strong>Questions:</strong> {singleScheduledExam.questions?.length || extractedQuestions.length}</div>
                  <div>📅 <strong>Available From:</strong> {new Date(singleScheduledExam.scheduledDate).toLocaleString()}</div>
                </div>
              </div>

              {/* Share Actions */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleCopyExamLink(singleScheduledExam.examCode)}
                  className="btn-secondary"
                  style={{
                    padding: '12px 24px',
                    fontSize: '0.95rem',
                    background: copiedCode === singleScheduledExam.examCode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {copiedCode === singleScheduledExam.examCode ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copiedCode === singleScheduledExam.examCode ? 'Link Copied!' : 'Copy Exam Link'}</span>
                </button>

                <Link
                  to={`/exam/${singleScheduledExam.examCode}`}
                  target="_blank"
                  className="btn-primary"
                  style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                >
                  <Eye size={18} />
                  <span>Preview Exam Lobby</span>
                </Link>

                <Link
                  to="/admin/exams"
                  className="btn-secondary"
                  style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                >
                  <span>View All Scheduled Exams</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Multi-exam generated fallback */
            <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(16, 185, 129, 0.4)', textAlign: 'center' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
                Exams Successfully Created!
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                <Link to="/admin/exams" className="btn-primary">
                  View Scheduled Exams
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AdminAiPdfImport;
