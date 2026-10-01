import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import MathRenderer from '../../components/MathRenderer';
import ExplanationRenderer from '../../components/ExplanationRenderer';
import {
  FileQuestion,
  Plus,
  Trash2,
  Search,
  CheckCircle,
  X,
  Eye,
  FileCode,
  UploadCloud,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { parseJsonQuestionsString, SAMPLE_JSON_STRING } from '../../utils/jsonQuestionParser';

export const AdminQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Direct JSON Import State
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonFile, setJsonFile] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [jsonValidation, setJsonValidation] = useState(null);
  const [jsonImporting, setJsonImporting] = useState(false);
  const [jsonSuccessMsg, setJsonSuccessMsg] = useState('');
  const [jsonError, setJsonError] = useState('');

  // New Question Form
  const [formData, setFormData] = useState({
    topic: 'Calculus',
    difficulty: 'easy',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
    points: 1,
    negativePoints: 0.25,
  });

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await api.getQuestions({
        topic: selectedTopic,
        difficulty: selectedDifficulty,
        search,
      });
      if (res.success) {
        setQuestions(res.questions);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedTopic, selectedDifficulty, search]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this question from question bank?')) {
      try {
        await api.deleteQuestion(id);
        fetchQuestions();
      } catch (err) {
        alert(err.message || 'Failed to delete question');
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        topic: formData.topic,
        difficulty: formData.difficulty,
        questionText: formData.questionText,
        options: [
          { key: 'A', text: formData.optionA },
          { key: 'B', text: formData.optionB },
          { key: 'C', text: formData.optionC },
          { key: 'D', text: formData.optionD },
        ],
        correctOption: formData.correctOption,
        explanation: formData.explanation,
        points: formData.points,
        negativePoints: formData.negativePoints,
      };

      await api.createQuestion(payload);
      setShowModal(false);
      setFormData({
        topic: 'Calculus',
        difficulty: 'easy',
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
        points: 1,
        negativePoints: 0.25,
      });
      fetchQuestions();
    } catch (err) {
      alert(err.message || 'Failed to create question');
    }
  };

  const handleJsonFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
        setJsonError('Please select a valid .json file.');
        return;
      }
      setJsonFile(file);
      setJsonError('');
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setJsonText(content);
        validateJson(content);
      };
      reader.onerror = () => setJsonError('Failed to read JSON file.');
      reader.readAsText(file);
    }
  };

  const validateJson = (text) => {
    if (!text || !text.trim()) {
      setJsonValidation(null);
      return;
    }
    try {
      const res = parseJsonQuestionsString(text);
      setJsonValidation({
        valid: true,
        count: res.questions.length,
        topic: res.topic,
        questions: res.questions,
      });
      setJsonError('');
    } catch (err) {
      setJsonValidation({
        valid: false,
        count: 0,
        error: err.message,
      });
    }
  };

  const handleBulkImportJson = async () => {
    if (!jsonText.trim()) {
      setJsonError('Please upload a JSON file or paste JSON code first.');
      return;
    }
    try {
      setJsonImporting(true);
      setJsonError('');
      const res = parseJsonQuestionsString(jsonText);
      const importRes = await api.bulkImportQuestions(res.questions);
      if (importRes.success) {
        setJsonSuccessMsg(`✅ Successfully imported ${importRes.count || res.questions.length} questions verbatim!`);
        setTimeout(() => {
          setShowJsonModal(false);
          setJsonFile(null);
          setJsonText('');
          setJsonValidation(null);
          setJsonSuccessMsg('');
          fetchQuestions();
        }, 1800);
      }
    } catch (err) {
      setJsonError(err.message || 'Failed to import JSON questions.');
    } finally {
      setJsonImporting(false);
    }
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
          <div style={{ fontSize: '0.85rem', color: '#a855f7', fontWeight: 700, marginBottom: '4px' }}>
            Mathematical Repository
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc' }}>
            Central Question Bank
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Store, search, and manage mathematical MCQs with LaTeX expressions and step-by-step explanations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => {
              setShowJsonModal(true);
              setJsonError('');
              setJsonSuccessMsg('');
            }}
            className="btn-secondary"
            style={{
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#6ee7b7',
            }}
          >
            <FileCode size={18} color="#34d399" />
            <span>Import JSON</span>
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            <span>Add New Question</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Search question text or formulas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy Level</option>
            <option value="medium">Medium Level</option>
            <option value="hard">Hard Level</option>
          </select>

          <select
            className="form-select"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="All">All Topics</option>
            <option value="Calculus">Calculus</option>
            <option value="Linear Algebra">Linear Algebra</option>
            <option value="Probability & Statistics">Probability & Statistics</option>
          </select>
        </div>
      </div>

      {/* Question Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            Loading repository questions...
          </div>
        ) : questions.length === 0 ? (
          <div className="glass-card" style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
            No questions found in repository matching criteria.
          </div>
        ) : (
          questions.map((q, idx) => (
            <div key={q._id} className="glass-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#818cf8', fontSize: '0.95rem' }}>#{idx + 1}</span>
                  <span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Topic: {q.topic}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>
                    Correct: Option {q.correctOption}
                  </span>
                  <button
                    onClick={() => handleDelete(q._id)}
                    className="btn-danger"
                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    title="Delete Question"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Question Statement */}
              <div style={{ fontSize: '1.05rem', color: '#f8fafc', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                <MathRenderer text={q.questionText} />
              </div>

              {/* Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: '1rem' }}>
                {q.options.map((opt) => (
                  <div
                    key={opt.key}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: opt.key === q.correctOption ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: opt.key === q.correctOption ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                      color: opt.key === q.correctOption ? '#34d399' : '#cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  >
                    <strong>{opt.key})</strong> <MathRenderer text={opt.text} />
                  </div>
                ))}
              </div>

              {/* Detailed Explanation */}
              {q.explanation && (
                <ExplanationRenderer
                  explanation={q.explanation}
                  correctOption={q.correctOption}
                  defaultExpanded={false}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* CREATE QUESTION MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
        }}>
          <div className="glass-card" style={{
            maxWidth: '750px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            border: '1px solid rgba(99, 102, 241, 0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                Add Mathematical MCQ
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Topic
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Difficulty Level
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
                  Question Statement (Supports LaTeX e.g. $\int_0^1 x^2 dx$)
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Find the determinant of matrix $A = \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}$."
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  required
                />
              </div>

              {/* Live Preview */}
              {formData.questionText && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 700, marginBottom: '4px' }}>Live LaTeX Preview:</div>
                  <MathRenderer text={formData.questionText} />
                </div>
              )}

              {/* 4 Options */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Option A</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.optionA}
                    onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Option B</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.optionB}
                    onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Option C</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.optionC}
                    onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Option D</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.optionD}
                    onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Correct Option</label>
                  <select
                    className="form-select"
                    value={formData.correctOption}
                    onChange={(e) => setFormData({ ...formData, correctOption: e.target.value })}
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Points (+)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value, 10) })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Negative Penalty (-)</label>
                  <input
                    type="number"
                    step="0.05"
                    className="form-input"
                    value={formData.negativePoints}
                    onChange={(e) => setFormData({ ...formData, negativePoints: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Mathematical Explanation & Derivation
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Step-by-step reasoning showing why the correct option holds..."
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save to Question Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT JSON IMPORT MODAL */}
      {showJsonModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            border: '1px solid rgba(16, 185, 129, 0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34d399',
                  fontWeight: 800,
                }}>
                  <FileCode size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    Direct JSON Question Import
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '2px 0 0' }}>
                    Zero Modification • Stems, Options, Formulas & Solutions preserved verbatim
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {jsonSuccessMsg && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '12px',
                color: '#6ee7b7',
                fontSize: '0.9rem',
                fontWeight: 700,
                marginBottom: '1rem',
              }}>
                {jsonSuccessMsg}
              </div>
            )}

            {jsonError && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                borderRadius: '8px',
                padding: '12px',
                color: '#fda4af',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertTriangle size={18} color="#f43f5e" style={{ flexShrink: 0 }} />
                <span>{jsonError}</span>
              </div>
            )}

            {/* Dropzone */}
            <div style={{
              border: '2px dashed rgba(16, 185, 129, 0.4)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              background: 'rgba(16, 185, 129, 0.02)',
              position: 'relative',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFileChange}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                }}
              />
              <UploadCloud size={24} color="#34d399" style={{ margin: '0 auto 6px' }} />
              {jsonFile ? (
                <div>
                  <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>
                    📄 {jsonFile.name}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                    {(jsonFile.size / 1024).toFixed(2)} KB • Loaded into editor below
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem' }}>
                    Click or drag & drop a .json file here
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                    Accepts any standard JSON question array
                  </div>
                </div>
              )}
            </div>

            {/* Code Textarea */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>
                  Raw JSON Payload:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setJsonText(SAMPLE_JSON_STRING);
                      validateJson(SAMPLE_JSON_STRING);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#34d399', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Load Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SAMPLE_JSON_STRING);
                      alert('Sample JSON copied!');
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    Copy Template
                  </button>
                </div>
              </div>

              <textarea
                className="form-input"
                rows={8}
                placeholder="Paste question JSON array here..."
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  validateJson(e.target.value);
                }}
                style={{
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  background: 'rgba(0, 0, 0, 0.4)',
                }}
              />
            </div>

            {/* Validation Badge */}
            {jsonValidation && (
              <div style={{ marginBottom: '1.25rem' }}>
                {jsonValidation.valid ? (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#6ee7b7',
                    fontSize: '0.82rem',
                  }}>
                    <CheckCircle size={16} color="#34d399" />
                    <span>
                      <strong>Ready:</strong> {jsonValidation.count} valid questions detected. Topic: <strong>"{jsonValidation.topic}"</strong>
                    </span>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.35)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#fda4af',
                    fontSize: '0.82rem',
                  }}>
                    <AlertTriangle size={16} color="#f43f5e" style={{ flexShrink: 0 }} />
                    <span>{jsonValidation.error}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImportJson}
                disabled={jsonImporting || !jsonText.trim() || (jsonValidation && !jsonValidation.valid)}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: '10px 20px',
                }}
              >
                {jsonImporting ? 'Importing Questions...' : `Import ${jsonValidation?.count ? `${jsonValidation.count} ` : ''}Questions`}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminQuestionBank;
