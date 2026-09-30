import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Award,
  BookOpen,
  ShieldCheck,
  LogOut,
  LogIn,
  BrainCircuit,
  Sun,
  Moon,
  Sparkles,
  Settings,
  Menu,
  X,
  ChevronRight,
  Bell,
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className="glass-panel"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid var(--border-subtle)',
        width: '100%',
        maxWidth: '100vw',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)',
              flexShrink: 0,
            }}
          >
            <BrainCircuit size={20} color="#ffffff" />
          </div>
          <div>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-main)',
                lineHeight: 1.1,
              }}
            >
              Apex<span style={{ color: '#818cf8' }}>Exam</span>
            </div>
            <div
              style={{
                fontSize: '0.62rem',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Testing Portal
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="nav-desktop-links">
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: isActive('/dashboard') ? '#818cf8' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: '8px',
              background: isActive('/dashboard') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <BookOpen size={16} />
            <span>Exams</span>
          </Link>

          <Link
            to="/practice/ai"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: isActive('/practice/ai') ? '#818cf8' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: '8px',
              background: isActive('/practice/ai') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={16} />
            <span>AI Practice</span>
          </Link>

          <Link
            to="/leaderboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: isActive('/leaderboard') ? '#818cf8' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: '8px',
              background: isActive('/leaderboard') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <Award size={16} />
            <span>Leaderboard</span>
          </Link>

          <Link
            to="/notices"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: isActive('/notices') ? '#818cf8' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: '8px',
              background: isActive('/notices') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <Bell size={16} />
            <span>Notices & Routines</span>
          </Link>

          {isAuthenticated && (
            <Link
              to="/settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: isActive('/settings') ? '#818cf8' : 'var(--text-muted)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: '8px',
                background: isActive('/settings') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <Settings size={16} />
              <span>Settings</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: location.pathname.startsWith('/admin') ? '#f43f5e' : '#fda4af',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                transition: 'all 0.2s',
              }}
            >
              <ShieldCheck size={16} />
              <span>Admin Panel</span>
            </Link>
          )}
        </div>

        {/* Right Section: Theme Toggle, User info / Auth & Mobile Menu Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle visual theme"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isDark ? '#fbbf24' : '#6366f1',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Desktop User Section */}
          <div className="nav-desktop-user">
            {isAuthenticated ? (
              <>
                <Link
                  to="/settings"
                  title="View Account & AI Settings"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 10px',
                    background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                    borderRadius: '9999px',
                    border: isActive('/settings') ? '1px solid #818cf8' : '1px solid var(--border-subtle)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  >
                    {user?.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name}
                  </div>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      background: user?.role === 'admin' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                      color: user?.role === 'admin' ? '#f43f5e' : '#818cf8',
                    }}
                  >
                    {user?.role}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                  title="Log out"
                  style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link to="/login" className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.85rem' }}>
                  <LogIn size={14} />
                  <span>Log In</span>
                </Link>
                <Link to="/register" className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.85rem' }}>
                  <span>Get Started</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            className="nav-mobile-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              width: '38px',
              height: '38px',
              color: 'var(--text-main)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: '60px',
            background: 'rgba(7, 10, 19, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 49,
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem',
            overflowY: 'auto',
          }}
        >
          {/* User Profile Banner on Mobile */}
          {isAuthenticated && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  flexShrink: 0,
                }}
              >
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  background: user?.role === 'admin' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  color: user?.role === 'admin' ? '#f43f5e' : '#818cf8',
                }}
              >
                {user?.role}
              </span>
            </div>
          )}

          {/* Navigation Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '10px',
                background: isActive('/dashboard') ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isActive('/dashboard') ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                color: isActive('/dashboard') ? '#a5b4fc' : 'var(--text-main)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BookOpen size={18} color="#818cf8" />
                <span>Assessments Catalog</span>
              </div>
              <ChevronRight size={16} color="#64748b" />
            </Link>

            <Link
              to="/practice/ai"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '10px',
                background: isActive('/practice/ai') ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isActive('/practice/ai') ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                color: isActive('/practice/ai') ? '#a5b4fc' : 'var(--text-main)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles size={18} color="#c084fc" />
                <span>AI Practice Studio</span>
              </div>
              <ChevronRight size={16} color="#64748b" />
            </Link>

            <Link
              to="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '10px',
                background: isActive('/leaderboard') ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isActive('/leaderboard') ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                color: isActive('/leaderboard') ? '#a5b4fc' : 'var(--text-main)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Award size={18} color="#fbbf24" />
                <span>Live Leaderboards</span>
              </div>
              <ChevronRight size={16} color="#64748b" />
            </Link>

            <Link
              to="/notices"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '10px',
                background: isActive('/notices') ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isActive('/notices') ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                color: isActive('/notices') ? '#a5b4fc' : 'var(--text-main)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Bell size={18} color="#38bdf8" />
                <span>Notice Board & Routines</span>
              </div>
              <ChevronRight size={16} color="#64748b" />
            </Link>

            {isAuthenticated && (
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: isActive('/settings') ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: isActive('/settings') ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                  color: isActive('/settings') ? '#a5b4fc' : 'var(--text-main)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Settings size={18} color="#818cf8" />
                  <span>Account & AI Settings</span>
                </div>
                <ChevronRight size={16} color="#64748b" />
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fda4af',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldCheck size={18} color="#f43f5e" />
                  <span>Admin Management Panel</span>
                </div>
                <ChevronRight size={16} color="#fda4af" />
              </Link>
            )}
          </div>

          {/* Mobile Footer Auth Buttons */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="btn-danger"
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
              >
                <LogOut size={16} />
                <span>Log Out of ApexExam</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px', textAlign: 'center' }}
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', textAlign: 'center' }}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
