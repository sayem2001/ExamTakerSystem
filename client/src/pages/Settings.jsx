import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import {
  Key,
  Sparkles,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  Zap,
  Info,
  Save,
  Trash2,
  Cpu,
  Moon,
  Sun,
  User,
  School,
  Mail,
  RefreshCw,
} from 'lucide-react';

export const Settings = () => {
  const { user } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  // API Key state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Action states
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchKeyStatus();
  }, []);

  const fetchKeyStatus = async () => {
    try {
      setLoadingStatus(true);
      setErrorMsg('');
      const res = await api.getStudentGeminiKeyStatus();
      if (res.success) {
        setHasKey(res.hasKey);
        setMaskedKey(res.maskedKey || '');
      }
    } catch (err) {
      console.error('Failed to fetch Gemini key status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSaveKey = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSaveSuccess('');
    setTestResult(null);

    const keyToSave = apiKeyInput.trim();
    if (!keyToSave && !hasKey) {
      setErrorMsg('Please enter an API key to save.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.saveStudentGeminiKey(keyToSave);
      if (res.success) {
        setSaveSuccess(res.message);
        setHasKey(res.hasKey);
        setApiKeyInput('');
        await fetchKeyStatus();
      } else {
        throw new Error(res.message || 'Failed to save API key');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error saving API key.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!window.confirm('Are you sure you want to remove your personal Gemini API key? Regular users must provide their own Gemini API key to generate practice exams, as only administrators can use the system Gemini API.')) {
      return;
    }
    setErrorMsg('');
    setSaveSuccess('');
    setTestResult(null);

    try {
      setSaving(true);
      const res = await api.saveStudentGeminiKey('');
      if (res.success) {
        setSaveSuccess('Your Gemini API key has been removed.');
        setHasKey(false);
        setMaskedKey('');
        setApiKeyInput('');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error removing API key.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setErrorMsg('');
    setTestResult(null);

    const keyToTest = apiKeyInput.trim();
    if (!keyToTest && !hasKey) {
      setErrorMsg('Please enter an API key to test, or save one first.');
      return;
    }

    try {
      setTesting(true);
      const res = await api.testStudentGeminiKey(keyToTest);
      if (res.success) {
        setTestResult({
          success: true,
          message: res.message,
          latency: res.latencyMs,
          sample: res.sampleResponse,
        });
      } else {
        throw new Error(res.message || 'API key test failed');
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to connect to Google AI Studio with this key.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKeyInput(text.trim());
      }
    } catch (err) {
      // Fallback
      console.warn('Clipboard read permission denied', err);
    }
  };

  const copyAiStudioUrl = () => {
    navigator.clipboard.writeText('https://aistudio.google.com/app/apikey');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
      
      {/* Page Title & Breadcrumb */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
          <Sparkles size={16} />
          <span>Candidate Preferences & Configuration</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
          Account & AI Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '6px' }}>
          Manage your personal credentials, Gemini AI API key for dedicated practice generation, and application theme.
        </p>
      </div>

      {/* Grid: Profile Card & Quick Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Profile Card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
          }}>
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Candidate'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <Mail size={13} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '6px',
                background: user?.role === 'admin' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                color: user?.role === 'admin' ? '#f43f5e' : '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}>
                {user?.role || 'student'}
              </span>
              {user?.institution && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  <School size={12} /> {user.institution}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Theme Preference Card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Visual Theme
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Currently in <strong style={{ color: 'var(--text-main)' }}>{isDark ? 'Dark Mode' : 'Light Mode'}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '0.875rem',
            }}
          >
            {isDark ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#6366f1" />}
            <span>Switch to {isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>

      </div>

      {/* Main Section: Personal Gemini API Key Studio */}
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          background: isDark
            ? 'linear-gradient(180deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)'
            : 'linear-gradient(180deg, rgba(238, 242, 255, 0.8) 0%, rgba(255, 255, 255, 0.9) 100%)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
            }}>
              <Key size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Personal Google Gemini API Key
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Dedicated compute key for high-speed, isolated AI practice test generation
              </div>
            </div>
          </div>

          {/* Key Status Pill */}
          <div>
            {loadingStatus ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Checking key status...</span>
            ) : hasKey ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#10b981',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                <CheckCircle size={16} />
                <span>Personal Key Active: {maskedKey}</span>
              </div>
            ) : user?.role === 'admin' ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#818cf8',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                <Shield size={16} />
                <span>Admin Mode (System Key Active)</span>
              </div>
            ) : (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                <AlertCircle size={16} />
                <span>Personal Key Required</span>
              </div>
            )}
          </div>
        </div>

        <div style={{
          background: 'rgba(99, 102, 241, 0.07)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '0.85rem',
          color: 'var(--text-main)',
          marginBottom: '1.25rem',
          lineHeight: 1.5,
        }}>
          <strong style={{ color: '#818cf8' }}>System Policy:</strong> Regular users must provide their own Google Gemini API key to generate private practice exams and extract question concepts. The system Gemini API is restricted exclusively to system administrators.
        </div>

        {/* Input Form */}
        <form onSubmit={handleSaveKey} style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
            {hasKey ? 'Update or Replace Your Gemini API Key' : 'Enter Your Google Gemini API Key'}
          </label>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={hasKey ? 'Enter new key to replace existing...' : 'AIzaSy... (paste your API key here)'}
                className="input-field"
                style={{
                  width: '100%',
                  paddingRight: '75px',
                  fontFamily: apiKeyInput ? 'monospace' : 'inherit',
                  letterSpacing: apiKeyInput && !showKey ? '0.1em' : 'normal',
                }}
              />
              <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="btn-secondary"
                  title={showKey ? 'Hide Key' : 'Show Key'}
                  style={{ padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem' }}
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePasteKey}
              className="btn-secondary"
              title="Paste from clipboard"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px' }}
            >
              <Copy size={15} />
              <span>Paste</span>
            </button>

            <button
              type="submit"
              disabled={saving || (!apiKeyInput.trim() && !hasKey)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', minWidth: '120px', justifyContent: 'center' }}
            >
              {saving ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Key</span>
                </>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              🔒 Your key is stored securely in encrypted DB format and is never exposed in client bundles or public APIs.
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || (!apiKeyInput.trim() && !hasKey)}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  color: '#818cf8',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                }}
              >
                {testing ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
                <span>{testing ? 'Testing Key...' : 'Test Connection'}</span>
              </button>

              {hasKey && (
                <button
                  type="button"
                  onClick={handleRemoveKey}
                  disabled={saving}
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    padding: '6px 12px',
                    color: '#f43f5e',
                    borderColor: 'rgba(244, 63, 94, 0.25)',
                  }}
                >
                  <Trash2 size={14} />
                  <span>Remove Key</span>
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Live Status / Alerts */}
        {saveSuccess && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '0.9rem',
            marginBottom: '1rem',
          }}>
            <CheckCircle size={18} />
            <span>{saveSuccess}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '0.9rem',
            marginBottom: '1rem',
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Test Result Feedback */}
        {testResult && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: testResult.success ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>
              {testResult.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{testResult.message}</span>
            </div>
            {testResult.success && testResult.latency && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px', marginLeft: '26px' }}>
                Connected to Google Gemini 1.5 Flash API • Round-trip latency: <strong>{testResult.latency}ms</strong>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Instructions: How to get your Gemini API Key */}
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Info size={16} />
              <span>Step-by-Step Tutorial</span>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px', margin: 0 }}>
              How to Get Your FREE Google Gemini API Key
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Google provides 100% free API access with 15 requests per minute for every Google account. It only takes about 60 seconds.
            </p>
          </div>

          {/* Primary CTA to Google AI Studio */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: 700,
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                boxShadow: '0 4px 15px rgba(37, 99, 235, 0.35)',
              }}
            >
              <span>Open Google AI Studio</span>
              <ExternalLink size={16} />
            </a>

            <button
              type="button"
              onClick={copyAiStudioUrl}
              className="btn-secondary"
              title="Copy URL"
              style={{ padding: '10px 14px' }}
            >
              {copiedLink ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* 5-Step Visual Walkthrough */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          
          <div style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#6366f1',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 800,
              marginBottom: '10px',
            }}>
              1
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Open AI Studio
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontWeight: 600 }}>aistudio.google.com</a> and sign in with your regular Google account.
            </div>
          </div>

          <div style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#8b5cf6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 800,
              marginBottom: '10px',
            }}>
              2
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Create API Key
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Click the blue <strong>"Create API key"</strong> button on the top left of the dashboard.
            </div>
          </div>

          <div style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#a855f7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 800,
              marginBottom: '10px',
            }}>
              3
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Select Project
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Choose "Create key in new project" (no credit card or billing information is required).
            </div>
          </div>

          <div style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#ec4899',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 800,
              marginBottom: '10px',
            }}>
              4
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Copy & Paste
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Click <strong>Copy</strong> on the generated key (starts with <code style={{ color: '#818cf8' }}>AIzaSy...</code>), paste it in the box above and save.
            </div>
          </div>

        </div>

        {/* Why use your own key */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          background: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} color="#6366f1" />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>Zero Rate-Limit Waiting</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dedicated quota exclusively for you</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} color="#10b981" />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>Strict Privacy</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Your questions & documents are isolated</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={20} color="#a855f7" />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>100% Free Forever</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Google provides 15 requests/minute free</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Settings;
