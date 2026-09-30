import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrainCircuit, LogIn, AlertCircle, Mail, CheckCircle2, RefreshCw } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.43l4.03-3.14z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
    />
  </svg>
);

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Email verification state
  const [emailNeedsVerification, setEmailNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const { loginWithGoogle, loginWithEmail, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect path if redirected from protected exam or admin
  const from = location.state?.from?.pathname || '/dashboard';

  const handleGoogleSignIn = async () => {
    setError('');
    setEmailNeedsVerification(false);
    setResendStatus('');
    setGoogleLoading(true);

    try {
      const loggedInUser = await loginWithGoogle();
      if (loggedInUser.role === 'admin' && from === '/dashboard') {
        navigate('/admin');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      setError(err.message || 'Google authentication was not completed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailNeedsVerification(false);
    setResendStatus('');
    setLoading(true);

    try {
      const loggedInUser = await loginWithEmail(email.trim(), password);
      if (loggedInUser.role === 'admin' && from === '/dashboard') {
        navigate('/admin');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (err.requiresEmailVerification || err.message?.includes('not verified')) {
        setEmailNeedsVerification(true);
        setError(err.message || `Please verify your email address (${email.trim()}) before signing in.`);
      } else {
        setError(err.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError('Please provide your email address to resend verification.');
      return;
    }
    setResendLoading(true);
    setResendStatus('');
    try {
      await resendVerificationEmail(email.trim(), password);
      setResendStatus('Verification link dispatched! Please check your email inbox and spam folder.');
    } catch (err) {
      setError(err.message || 'Failed to dispatch verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 140px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      position: 'relative',
    }}>
      {/* Background glow */}
      <div
        className="gradient-glow"
        style={{
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          height: '500px',
          background: 'rgba(99, 102, 241, 0.12)',
        }}
      />

      <div className="glass-card" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '2.5rem',
        position: 'relative',
        zIndex: 1,
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
          }}>
            <BrainCircuit size={28} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', marginTop: '4px' }}>
            Sign in with Google or your verified email
          </p>
        </div>

        {/* GOOGLE SIGN IN BUTTON */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1.5px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--text-main, #f8fafc)',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: googleLoading ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            marginBottom: '1.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <GoogleIcon />
          <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google (Verified User)'}</span>
        </button>

        {/* DIVIDER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '1.5rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
          <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
            or continue with email
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
        </div>

        {/* ERROR / VERIFICATION REQUIRED NOTICES */}
        {error && (
          <div style={{
            background: emailNeedsVerification ? 'rgba(245, 158, 11, 0.12)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${emailNeedsVerification ? 'rgba(245, 158, 11, 0.35)' : 'rgba(244, 63, 94, 0.3)'}`,
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            color: emailNeedsVerification ? '#fde68a' : '#fda4af',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              {emailNeedsVerification ? (
                <Mail size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#fbbf24' }} />
              ) : (
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <span style={{ lineHeight: 1.5 }}>{error}</span>
            </div>

            {emailNeedsVerification && (
              <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fef3c7',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={13} className={resendLoading ? 'spin' : ''} />
                  <span>{resendLoading ? 'Sending link...' : 'Resend Verification Email'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {resendStatus && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#34d399',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{resendStatus}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="e.g. your-email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            className="btn-primary"
            disabled={loading || googleLoading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '12px' }}
          >
            {loading ? (
              <span>Verifying & Signing In...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In with Email</span>
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
            Register here
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;
