import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Eraser, Trash2, X } from 'lucide-react';

export const ScratchpadModal = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState('notes'); // 'notes' | 'canvas'
  const [scratchNotes, setScratchNotes] = useState(() => localStorage.getItem('apex_scratch_notes') || '');
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    localStorage.setItem('apex_scratch_notes', scratchNotes);
  }, [scratchNotes]);

  // Setup canvas size and context
  useEffect(() => {
    if (tab === 'canvas' && canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.floor(rect.width) || 300;
      const height = Math.min(350, Math.floor(window.innerHeight * 0.45));
      
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [tab, isOpen]);

  if (!isOpen) return null;

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '0.75rem',
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '650px',
        maxHeight: '90vh',
        height: '520px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={17} color="#818cf8" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
              Virtual Scratchpad
            </h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setTab('notes')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  background: tab === 'notes' ? '#6366f1' : 'transparent',
                  color: tab === 'notes' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Notes
              </button>
              <button
                type="button"
                onClick={() => setTab('canvas')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  background: tab === 'canvas' ? '#6366f1' : 'transparent',
                  color: tab === 'canvas' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Drawing
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#94a3b8',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {tab === 'notes' ? (
            <textarea
              className="form-textarea"
              style={{
                flex: 1,
                resize: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                width: '100%',
                height: '100%',
              }}
              placeholder="Jot down rough steps, formulas, or numbers here... (Saved automatically)"
              value={scratchNotes}
              onChange={(e) => setScratchNotes(e.target.value)}
            />
          ) : (
            <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <Trash2 size={13} />
                  <span>Clear Canvas</span>
                </button>
              </div>
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: '#070a12' }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    cursor: 'crosshair',
                    touchAction: 'none',
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '0.65rem 1rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#64748b',
          gap: '8px',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Rough work stays inside this tab.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem', minHeight: '36px', flexShrink: 0 }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default ScratchpadModal;
