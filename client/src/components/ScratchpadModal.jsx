import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Eraser, Trash2, X } from 'lucide-react';

export const ScratchpadModal = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState('notes'); // 'notes' | 'canvas'
  const [scratchNotes, setScratchNotes] = useState(() => localStorage.getItem('apex_scratch_notes') || '');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    localStorage.setItem('apex_scratch_notes', scratchNotes);
  }, [scratchNotes]);

  // Setup canvas
  useEffect(() => {
    if (tab === 'canvas' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, [tab]);

  if (!isOpen) return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
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
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem',
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '650px',
        height: '520px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              Virtual Rough Scratchpad
            </h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => setTab('notes')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  background: tab === 'notes' ? '#6366f1' : 'transparent',
                  color: tab === 'notes' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Text Notes
              </button>
              <button
                onClick={() => setTab('canvas')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  background: tab === 'canvas' ? '#6366f1' : 'transparent',
                  color: tab === 'canvas' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Drawing Board
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#94a3b8',
                borderRadius: '6px',
                width: '30px',
                height: '30px',
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
        <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          {tab === 'notes' ? (
            <textarea
              className="form-textarea"
              style={{
                flex: 1,
                resize: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
              placeholder="Jot down formulas, steps, or rough calculations here... (Saved automatically to your local browser storage)"
              value={scratchNotes}
              onChange={(e) => setScratchNotes(e.target.value)}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={clearCanvas}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <Trash2 size={13} />
                  <span>Clear Board</span>
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={610}
                height={350}
                style={{
                  background: '#070a12',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  cursor: 'crosshair',
                  touchAction: 'none',
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#64748b',
        }}>
          <span>Keep your rough work inside this scratchpad without leaving the exam tab.</span>
          <button onClick={onClose} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default ScratchpadModal;
