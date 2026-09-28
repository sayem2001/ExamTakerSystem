import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Settings,
  Key,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const AdminSettings = () => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [platformName, setPlatformName] = useState('');
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [maskedKey, setMaskedKey] = useState('');
  const [hasKey, setHasKey] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getSettings();
        if (res.success && res.settings) {
          setPlatformName(res.settings.platformName || 'ApexExam Assessment Platform');
          setDefaultDuration(res.settings.defaultDurationMinutes || 60);
          setAllowRegistration(res.settings.allowPublicRegistration ?? true);
          setHasKey(res.settings.hasGeminiApiKey);
          setMaskedKey(res.settings.geminiApiKeyMasked || '');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        platformName,
        defaultDurationMinutes: defaultDuration,
        allowPublicRegistration: allowRegistration,
      };

      if (geminiApiKey.trim()) {
        payload.geminiApiKey = geminiApiKey.trim();
      }

      const res = await api.updateSettings(payload);
      if (res.success) {
        setMessage('Platform configuration saved successfully.');
        if (geminiApiKey.trim()) {
          setHasKey(true);
          setMaskedKey(`${geminiApiKey.substring(0, 6)}...${geminiApiKey.substring(geminiApiKey.length - 4)}`);
          setGeminiApiKey('');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem', color: '#94a3b8' }}>
        Loading platform configurations...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '2.5rem auto 5rem', padding: '0 1.5rem' }}>
      
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 700, marginBottom: '4px' }}>
          Platform Preferences & Integrations
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc' }}>
          System Settings & Gemini AI Key
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
          Configure API credentials, exam defaults, and platform branding.
        </p>
      </div>

      {message && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#34d399',
          marginBottom: '1.5rem',
        }}>
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#fda4af',
          marginBottom: '1.5rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* GEMINI API CONFIGURATION */}
        <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#c084fc" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                  Google Gemini AI API Key
                </h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
                Used to parse 100-200 MCQ PDF documents, extract LaTeX math, and auto-stratify difficulty.
              </p>
            </div>

            <div style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: hasKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${hasKey ? '#10b981' : '#f59e0b'}`,
              color: hasKey ? '#34d399' : '#fbbf24',
            }}>
              {hasKey ? 'Active Key Configured' : 'No Key Set (Using Demo Bank)'}
            </div>
          </div>

          {hasKey && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              color: '#cbd5e1',
            }}>
              Current Key: <code style={{ color: '#818cf8', fontWeight: 700 }}>{maskedKey}</code>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              {hasKey ? 'Update Gemini API Key' : 'Enter Free Gemini API Key'}
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Paste AI Studio API Key (AIzaSy...)"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.75rem', color: '#64748b' }}>
              <span>You can get a free API key at Google AI Studio.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
              >
                <span>Get Free Gemini Key</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* GENERAL PLATFORM PREFERENCES */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.25rem' }}>
            Platform Customization
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Platform Display Name
              </label>
              <input
                type="text"
                className="form-input"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Default Exam Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  className="form-input"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseInt(e.target.value, 10))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Public Candidate Registration
                </label>
                <select
                  className="form-select"
                  value={allowRegistration ? 'enabled' : 'disabled'}
                  onChange={(e) => setAllowRegistration(e.target.value === 'enabled')}
                >
                  <option value="enabled">Enabled (Open Registration)</option>
                  <option value="disabled">Disabled (Invite Only)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ padding: '12px 28px', fontSize: '0.95rem' }}
          >
            {saving ? (
              <span>Saving Changes...</span>
            ) : (
              <>
                <Save size={18} />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};

export default AdminSettings;
