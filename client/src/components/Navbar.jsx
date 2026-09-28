import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Award, BookOpen, ShieldCheck, LogOut, LogIn, LayoutDashboard, BrainCircuit } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="glass-panel" style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)'
          }}>
            <BrainCircuit size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Apex<span style={{ color: '#818cf8' }}>Exam</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '-3px' }}>
              Advanced Testing Portal
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: isActive('/dashboard') ? '#818cf8' : '#94a3b8',
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
            to="/leaderboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: isActive('/leaderboard') ? '#818cf8' : '#94a3b8',
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

        {/* User Account / Auth Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {isAuthenticated ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '9999px',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#ffffff',
                }}>
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                  {user.name}
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: user.role === 'admin' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  color: user.role === 'admin' ? '#fda4af' : '#a5b4fc',
                }}>
                  {user.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="btn-secondary"
                title="Log out"
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link to="/login" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <LogIn size={15} />
                <span>Log In</span>
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <span>Get Started</span>
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
