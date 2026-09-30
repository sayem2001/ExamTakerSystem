import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Maximize2, AlertOctagon } from 'lucide-react';

export const AntiCheatGuard = ({
  antiCheatSettings = {
    fullScreenRequired: true,
    maxTabSwitches: 3,
    blockCopyPaste: true,
    disableRightClick: true,
  },
  onViolation,
  onAutoSubmit,
  isSubmitting = false,
  className = '',
  compact = false,
}) => {
  const [violationsCount, setViolationsCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [lastViolationMsg, setLastViolationMsg] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const maxStrikes = antiCheatSettings?.maxTabSwitches || 3;
  const lastViolationTimeRef = useRef(0);
  const countRef = useRef(0);
  const isSubmittingRef = useRef(isSubmitting);

  // Check if device is mobile or touch device where full-screen lockdown is physically unsupported/disruptive
  const isMobileDevice = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 800) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 800)
  );

  const isFullscreenSupported = typeof document !== 'undefined' && !!(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled
  );

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
    if (isSubmitting) {
      setShowWarningModal(false);
    }
  }, [isSubmitting]);

  const handleViolation = useCallback((type, message) => {
    if (isSubmittingRef.current) return;

    // Cooldown throttle to prevent simultaneous events (e.g. fullscreen exit + tab blur)
    const now = Date.now();
    if (now - lastViolationTimeRef.current < 2500) return;
    lastViolationTimeRef.current = now;

    const nextCount = countRef.current + 1;
    countRef.current = nextCount;

    setViolationsCount(nextCount);
    setLastViolationMsg(message);

    if (!isSubmittingRef.current) {
      setShowWarningModal(true);
    }

    if (onViolation) {
      onViolation(type, `${message} (Strike ${nextCount}/${maxStrikes})`);
    }

    if (nextCount >= maxStrikes) {
      if (onAutoSubmit) {
        onAutoSubmit(true, 'Disqualified / Auto-submitted due to maximum anti-cheat violations reached.');
      }
    }
  }, [maxStrikes, onViolation, onAutoSubmit]);

  // Request fullscreen with safe fallback
  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request denied or not supported on this platform');
    }
  };

  useEffect(() => {
    // Check initial fullscreen state
    if (typeof document !== 'undefined') {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    }

    // 1. Fullscreen change listener
    const onFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFull);

      // Only penalize fullscreen exit if fullscreen is natively supported and not a touch device
      if (antiCheatSettings.fullScreenRequired && !isFull && isFullscreenSupported && !isMobileDevice) {
        handleViolation('fullscreen_exit', 'You have exited full-screen mode. Please stay in full-screen during the examination.');
      }
    };

    // 2. Tab switch / Window blur listener
    const onVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('tab_switch', 'Tab switch or window minimized detected! Leaving the exam tab is prohibited.');
      }
    };

    // 3. Copy / Paste prevention
    const onCopy = (e) => {
      if (antiCheatSettings.blockCopyPaste) {
        e.preventDefault();
        handleViolation('copy_paste_attempt', 'Copying exam content is disabled.');
      }
    };

    const onPaste = (e) => {
      if (antiCheatSettings.blockCopyPaste) {
        e.preventDefault();
        handleViolation('copy_paste_attempt', 'Pasting into the exam is disabled.');
      }
    };

    // 4. Right click prevention
    const onContextMenu = (e) => {
      if (antiCheatSettings.disableRightClick) {
        e.preventDefault();
      }
    };

    // 5. Devtools / Inspect shortcuts prevention
    const onKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        handleViolation('devtools_opened', 'Developer tools and inspection shortcuts are disabled.');
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('copy', onCopy);
    window.addEventListener('paste', onPaste);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('copy', onCopy);
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [antiCheatSettings, handleViolation, isFullscreenSupported, isMobileDevice]);

  return (
    <>
      {/* Security Indicator in Exam Workspace */}
      <div
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '6px',
          background: violationsCount > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.12)',
          border: `1px solid ${violationsCount > 0 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
          fontSize: '0.72rem',
          fontWeight: 600,
          color: violationsCount > 0 ? '#fda4af' : '#34d399',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {violationsCount > 0 ? <AlertTriangle size={13} /> : <ShieldAlert size={13} />}
        <span className={violationsCount === 0 && compact ? 'desktop-only' : ''}>
          {violationsCount === 0
            ? compact ? 'Proctored' : 'Proctored Active'
            : `${violationsCount}/${maxStrikes}`}
        </span>
      </div>

      {/* Warning Popup Modal on Violation */}
      {showWarningModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1.25rem',
        }}>
          <div className="glass-card" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '1.75rem',
            textAlign: 'center',
            border: '2px solid rgba(244, 63, 94, 0.5)',
            boxShadow: '0 0 40px rgba(244, 63, 94, 0.3)',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.2)',
              border: '2px solid #f43f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <AlertOctagon size={28} color="#f43f5e" />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Security Violation Detected!
            </h3>

            <p style={{ color: '#fda4af', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              {lastViolationMsg}
            </p>

            <div style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: '#f8fafc',
            }}>
              Strike <strong>{violationsCount}</strong> of <strong>{maxStrikes}</strong>.{' '}
              {violationsCount >= maxStrikes
                ? 'Maximum strikes exceeded. Your exam will now be automatically submitted.'
                : 'Further infractions will result in immediate disqualification and auto-submission.'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {antiCheatSettings.fullScreenRequired && !isFullscreen && isFullscreenSupported && !isMobileDevice && (
                <button
                  onClick={async () => {
                    await enterFullscreen();
                    setShowWarningModal(false);
                  }}
                  className="btn-primary"
                  style={{ width: '100%', minHeight: '44px' }}
                >
                  <Maximize2 size={16} />
                  <span>Return to Fullscreen</span>
                </button>
              )}

              <button
                onClick={() => setShowWarningModal(false)}
                className={antiCheatSettings.fullScreenRequired && !isFullscreen && isFullscreenSupported && !isMobileDevice ? 'btn-secondary' : 'btn-danger'}
                style={{ width: '100%', minHeight: '44px' }}
              >
                I Understand, Resume Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AntiCheatGuard;
