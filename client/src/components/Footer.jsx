import React from 'react';
import { BrainCircuit, Shield, CheckCircle, Code } from 'lucide-react';

export const Footer = () => {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      background: 'rgba(10, 13, 20, 0.95)',
      marginTop: 'auto',
      padding: '2.5rem 1.5rem 1.5rem',
      color: '#64748b',
      fontSize: '0.85rem'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <BrainCircuit size={16} color="#fff" />
          </div>
          <div>
            <span style={{ fontWeight: 700, color: '#f8fafc' }}>ApexExam</span> — Enterprise Mathematical Examination & Assessment Engine
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981' }}>
            <Shield size={14} />
            <span>Anti-Cheat Guard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6366f1' }}>
            <CheckCircle size={14} />
            <span>One-Attempt Policy</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#a855f7' }}>
            <Code size={14} />
            <span>Gemini AI Engine</span>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '1280px', margin: '1.5rem auto 0', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <div>&copy; {new Date().getFullYear()} ApexExam Platform. Built for mathematical excellence.</div>
        <div>All rights reserved. Secure assessment protocol active.</div>
      </div>
    </footer>
  );
};

export default Footer;
