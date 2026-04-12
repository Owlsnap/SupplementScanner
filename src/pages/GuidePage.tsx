import React from "react";
import { ArrowLeft, Robot } from "@phosphor-icons/react";
import AIExtractionGuide from '../components/AIExtractionGuide';

interface GuidePageProps {
  onBack: () => void;
}

export default function GuidePage({ onBack }: GuidePageProps): JSX.Element {
  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      {/* Page hero */}
      <div style={{
        background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
        padding: 'calc(100px + 2rem) 1.5rem 2.25rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-2rem', top: '-2rem', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '999px', padding: '0.5rem 1rem',
              color: '#ffffff', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600,
              fontFamily: "'Inter', sans-serif", marginBottom: '1.25rem',
            }}
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <h2 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.375rem, 3vw, 1.875rem)',
            color: '#ffffff', margin: '0 0 0.375rem', letterSpacing: '-0.4px',
            display: 'flex', alignItems: 'center', gap: '0.625rem',
          }}>
            <Robot size={24} />
            AI Extraction Guide
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Learn how to use AI-powered extraction to automatically fill product information
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.75rem 1.5rem 4rem', boxSizing: 'border-box' }}>
        <AIExtractionGuide />
      </div>
    </div>
  );
}
