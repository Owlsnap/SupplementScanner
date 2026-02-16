import React from "react";
import { ArrowLeft, Bot } from "lucide-react";
import AIExtractionGuide from '../components/AIExtractionGuide';

interface GuidePageProps {
  onBack: () => void;
}

export default function GuidePage({ onBack }: GuidePageProps): JSX.Element {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        minHeight: '100vh',
        padding: '1rem',
        paddingTop: '120px',
        paddingBottom: '120px',
        position: 'relative'
      }}
    >
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(56, 243, 171, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(8, 145, 178, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        maxWidth: '1200px', 
        margin: '0 auto',
        width: '100%',
        padding: window.innerWidth < 768 ? '0 1rem' : '0 2rem',
        boxSizing: 'border-box'
      }}>
        {/* Page Header */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid rgba(56, 243, 171, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          marginBottom: '2rem'
        }}>
          {/* Back Button */}
          <button
            onClick={onBack}
            style={{
              background: 'rgba(148, 163, 184, 0.1)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              color: '#f1f5f9',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '2rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(148, 163, 184, 0.2)';
              e.target.style.borderColor = 'rgba(148, 163, 184, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(148, 163, 184, 0.1)';
              e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)';
            }}
          >
            <ArrowLeft size={16} />
            Back to Scanner
          </button>

          {/* Page Title */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <Bot size={48} />
              AI Extraction Guide
            </h1>
            <p style={{
              color: '#94a3b8',
              fontSize: '1.25rem',
              margin: 0,
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: '1.6'
            }}>
              Learn how to use the AI-powered extraction feature to automatically fill product information from supplement websites
            </p>
          </div>
        </div>

        {/* AI Extraction Guide Component */}
        <AIExtractionGuide />
      </div>
    </div>
  );
}