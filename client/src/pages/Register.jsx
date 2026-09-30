import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  BrainCircuit,
  UserPlus,
  AlertCircle,
  Shield,
  KeyRound,
  CheckCircle2,
  Send,
  Mail,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

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

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      fill="#1877F2"
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
    />
  </svg>
);

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [role, setRole] = useState('student');
  const [adminOtp, setAdminOtp] = useState('');

  // Admin OTP dispatch state
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');

  // Status and feedback states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  // Email verification required view
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const { user, isAuthenticated, registerWithEmail, loginWithGoogle, loginWithFacebook, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to /dashboard (or /admin)
  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleRequestOtp = async () => {
    if (!email.trim()) {
      setError('Please provide your email address before requesting an Admin Authorization code.');
      return;
    }
    setError('');
    setOtpLoading(true);
    setOtpSuccessMsg('');

    try {
      const res = await api.requestAdminOtp(name.trim(), email.trim());
      setOtpSent(true);
      setOtpSuccessMsg(res.message || 'Authorization OTP sent to primary administrator at sayemmd035@gmail.com');
    } catch (err) {
      setError(err.message || 'Failed to dispatch Admin Authorization OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    if (role === 'admin' && !adminOtp.trim()) {
      setError('Admin Authorization OTP required. Request OTP above and enter the 6-digit code received from sayemmd035@gmail.com before registering with Google.');
      return;
    }

    setGoogleLoading(true);
    try {
      const loggedUser = await loginWithGoogle({
        name: name.trim(),
        role,
        institution: institution.trim(),
        adminOtp: adminOtp.trim(),
      });

      if (loggedUser?.isRedirecting) {
        return; // Redirecting to Google on mobile
      }

      if (loggedUser) {
        if (loggedUser.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Google registration failed:', err);
      setError(err.message || 'Google registration was not completed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookRegister = async () => {
    setError('');
    if (role === 'admin' && !adminOtp.trim()) {
      setError('Admin Authorization OTP required. Request OTP above and enter the 6-digit code received from sayemmd035@gmail.com before registering with Facebook.');
      return;
    }

    setFacebookLoading(true);
    try {
      const loggedUser = await loginWithFacebook({
        name: name.trim(),
        role,
        institution: institution.trim(),
        adminOtp: adminOtp.trim(),
      });

      if (loggedUser?.isRedirecting) {
        return; // Redirecting to Facebook on mobile
      }

      if (loggedUser) {
        if (loggedUser.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Facebook registration failed:', err);
      setError(err.message || 'Facebook registration was not completed.');
    } finally {
      setFacebookLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (role === 'admin' && !adminOtp.trim()) {
      setError('Admin Authorization OTP is required. Please request the OTP and obtain approval from the primary administrator (sayemmd035@gmail.com).');
      return;
    }

    setLoading(true);
    try {
      const res = await registerWithEmail(
        name.trim(),
        email.trim(),
        password,
        role,
        institution.trim(),
        adminOtp.trim()
      );

      if (res.needsEmailVerification) {
        setVerificationPending(true);
        setVerificationEmail(email.trim());
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail && !email.trim()) return;
    setResendLoading(true);
    setResendStatus('');
    try {
      await resendVerificationEmail(verificationEmail || email.trim(), password);
      setResendStatus('A fresh verification link has been sent! Check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  // If email verification screen is active
  if (verificationPending) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 140px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}>
        <div className="glass-card" style={{
          maxWidth: '500px',
          width: '100%',
          padding: '2.75rem 2.25rem',
          textAlign: 'center',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '2px solid rgba(99, 102, 241, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Mail size={32} color="#818cf8" />
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)', marginBottom: '8px' }}>
            Verify Your Email Address
          </h2>

          <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            To ensure genuine users, a verification link has been sent to:
            <br />
            <strong style={{ color: '#818cf8', wordBreak: 'break-all', fontSize: '1.05rem' }}>
              {verificationEmail}
            </strong>
          </p>

          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'left',
            marginBottom: '1.75rem',
            fontSize: '0.85rem',
            color: 'var(--text-main, #e2e8f0)',
            lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', color: '#a5b4fc' }}>Next Steps:</div>
            1. Open your email inbox (and check spam or promotions).<br />
            2. Click the verification link to activate your account.<br />
            3. Once verified, sign in to begin taking exams.
          </div>

          {resendStatus && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#34d399',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}>
              <CheckCircle2 size={16} />
              <span>{resendStatus}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              <span>I've Verified, Continue to Sign In</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="btn-secondary"
              style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} className={resendLoading ? 'spin' : ''} />
              <span>{resendLoading ? 'Sending link...' : 'Resend Verification Email'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 140px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(1rem, 4vw, 2.5rem) clamp(0.75rem, 3vw, 1.5rem)',
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      <div className="glass-card" style={{
        maxWidth: '520px',
        width: '100%',
        padding: 'clamp(1.25rem, 5vw, 2.25rem)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        boxSizing: 'border-box',
      }}>
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
          }}>
            <BrainCircuit size={28} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Create an Account
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Register with Google, Facebook, or via Email
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fda4af',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* SOCIAL QUICK REGISTRATION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {/* GOOGLE QUICK REGISTRATION */}
          <button
            type="button"
            id="google-register-btn"
            onClick={handleGoogleRegister}
            disabled={googleLoading || facebookLoading || loading}
            style={{
              width: '100%',
              minHeight: '48px',
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
              touchAction: 'manipulation',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
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
            <span>{googleLoading ? 'Verifying with Google...' : 'Register with Google'}</span>
          </button>

          {/* FACEBOOK QUICK REGISTRATION */}
          <button
            type="button"
            id="facebook-register-btn"
            onClick={handleFacebookRegister}
            disabled={googleLoading || facebookLoading || loading}
            style={{
              width: '100%',
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 18px',
              borderRadius: '10px',
              background: 'rgba(24, 119, 242, 0.12)',
              border: '1.5px solid rgba(24, 119, 242, 0.35)',
              color: 'var(--text-main, #f8fafc)',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: facebookLoading ? 'wait' : 'pointer',
              touchAction: 'manipulation',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(24, 119, 242, 0.22)';
              e.currentTarget.style.borderColor = '#1877F2';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(24, 119, 242, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(24, 119, 242, 0.35)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <FacebookIcon />
            <span>{facebookLoading ? 'Verifying with Facebook...' : 'Register with Facebook'}</span>
          </button>
        </div>

        {/* DIVIDER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '1.5rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
          <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
            or register via email
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Sayem Ahmed"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Email Address (Verification Link Will Be Sent)
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. applicant@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Institution / School (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Department of Mathematics"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Account Type
            </label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setError('');
              }}
            >
              <option value="student">Student (Candidate)</option>
              <option value="admin">Administrator (Examiner / Teacher)</option>
            </select>
          </div>

          {/* ADMIN VERIFICATION SECTION VIA OTP */}
          {role === 'admin' && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1.5px solid rgba(99, 102, 241, 0.35)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="#f43f5e" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f43f5e' }}>
                  Admin Authorization Required
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Creating an administrator account requires approval. An authorization OTP must be sent to the primary administrator at <strong style={{ color: '#818cf8' }}>sayemmd035@gmail.com</strong>.
              </p>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpLoading}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.82rem',
                    padding: '8px 14px',
                    borderColor: 'rgba(99, 102, 241, 0.4)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={14} />
                  <span>{otpLoading ? 'Dispatching OTP...' : otpSent ? 'Resend OTP to Primary Admin' : 'Request OTP from Primary Admin'}</span>
                </button>
              </div>

              {otpSuccessMsg && (
                <div style={{
                  fontSize: '0.8rem',
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <CheckCircle2 size={16} />
                  <span>{otpSuccessMsg}</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  6-Digit Admin Grant OTP
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input"
                    placeholder="Enter 6-digit code received from sayemmd035@gmail.com"
                    value={adminOtp}
                    onChange={(e) => setAdminOtp(e.target.value.replace(/\D/g, ''))}
                    style={{ paddingLeft: '36px', letterSpacing: '2px', fontWeight: 600 }}
                    required={role === 'admin'}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || googleLoading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '12px' }}
          >
            {loading ? (
              <span>Sending Verification Email...</span>
            ) : (
              <>
                <UserPlus size={18} />
                <span>Create Account with Email Verification</span>
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
