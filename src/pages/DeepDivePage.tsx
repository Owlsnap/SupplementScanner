import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Warning, Lightning, CheckCircle, Info } from '@phosphor-icons/react';
import type { EvidenceTier } from '../data/encyclopediaData';

interface DosingInfo {
  low: string;
  standard: string;
  high: string;
  timing: string;
}

interface FormInfo {
  name: string;
  bioavailability: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  notes: string;
}

interface SynergyInfo {
  supplement: string;
  reason: string;
}

interface DeepDiveContent {
  whatItIs: string;
  howItWorks: string;
  dosing: DosingInfo;
  forms: FormInfo[];
  synergies: SynergyInfo[];
  cautions: string[];
  recommendationsLink: string;
}

interface DeepDivePageProps {
  slug: string;
  supplementName: string;
  supplementCategory: string;
  evidenceTier: EvidenceTier;
  tagline: string;
  onBack: () => void;
  onGoToRecommendations?: () => void;
}

const evidenceTierColors: Record<EvidenceTier, { bg: string; text: string; border: string }> = {
  Strong: { bg: '#00685f', text: '#ffffff', border: '#00685f' },
  Moderate: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  Emerging: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  Anecdotal: { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
};

const bioavailabilityColors: Record<string, string> = {
  Excellent: '#00685f',
  Good: '#3f6560',
  Fair: '#d97706',
  Poor: '#ba1a1a',
};

export default function DeepDivePage({
  slug,
  supplementName,
  supplementCategory,
  evidenceTier,
  tagline,
  onBack,
  onGoToRecommendations,
}: DeepDivePageProps) {
  const [deepDive, setDeepDive] = useState<DeepDiveContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wasFreshlyGenerated, setWasFreshlyGenerated] = useState(false);

  const tierStyle = evidenceTierColors[evidenceTier];

  const loadContent = useCallback(() => {
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
    setLoading(true);
    setError(null);

    fetch(`${apiUrl}/api/encyclopedia/deep-dive/${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setDeepDive(json.data);
          setWasFreshlyGenerated(!json.cached);
        } else {
          setError(json.error || 'Failed to load content');
        }
      })
      .catch(() => setError('Network error — make sure the server is running'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '1.5rem',
    marginBottom: '1rem',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 800,
    fontSize: '1rem',
    color: '#171d1c',
    letterSpacing: '-0.3px',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const bodyTextStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: '0.9375rem',
    color: '#3d4947',
    lineHeight: 1.65,
    margin: 0,
  };

  return (
    <div style={{ background: '#f5faf8', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingTop: '68px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header — sticks below main navbar */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #bcc9c6',
        padding: '0.875rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        position: 'sticky',
        top: '68px',
        zIndex: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: 'transparent',
            border: '1px solid #bcc9c6',
            borderRadius: '28px',
            padding: '0.5rem 1rem',
            color: '#6d7a77',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#00685f';
            (e.currentTarget as HTMLButtonElement).style.color = '#00685f';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#bcc9c6';
            (e.currentTarget as HTMLButtonElement).style.color = '#6d7a77';
          }}
        >
          <ArrowLeft size={16} />
          Encyclopedia
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: '1.125rem',
            color: '#171d1c',
            letterSpacing: '-0.3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {supplementName}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#6d7a77', fontWeight: 400 }}>
            {supplementCategory}
          </div>
        </div>
        <span style={{
          background: tierStyle.bg,
          color: tierStyle.text,
          border: `1px solid ${tierStyle.border}`,
          borderRadius: '999px',
          padding: '0.25rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {evidenceTier}
        </span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* Hero tagline */}
        <p style={{ ...bodyTextStyle, color: '#6d7a77', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          {tagline}
        </p>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid #e4e9e7',
              borderTopColor: '#00685f',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.25rem',
            }} />
            <p style={{ ...bodyTextStyle, color: '#3d4947', margin: '0 0 0.5rem' }}>
              Generating deep dive with AI…
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: '#6d7a77', margin: 0 }}>
              ~5–10 seconds. Cached for 30 days after first load.
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ ...cardStyle, borderLeft: '4px solid #ba1a1a', textAlign: 'center' }}>
            <p style={{ color: '#ba1a1a', fontWeight: 600, margin: '0 0 0.5rem', fontFamily: "'Inter', sans-serif" }}>
              Failed to load content
            </p>
            <p style={{ ...bodyTextStyle, color: '#6d7a77', marginBottom: '1.25rem' }}>{error}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={loadContent}
                style={{
                  background: '#00685f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '28px',
                  padding: '0.625rem 1.25rem',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <button
                onClick={onBack}
                style={{
                  background: 'transparent',
                  color: '#6d7a77',
                  border: '1px solid #bcc9c6',
                  borderRadius: '28px',
                  padding: '0.625rem 1.25rem',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Deep dive content */}
        {!loading && deepDive && (
          <>
            {/* What it is */}
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>
                <Info size={18} color="#00685f" />
                What it is
              </div>
              <p style={bodyTextStyle}>{deepDive.whatItIs}</p>
            </div>

            {/* How it works */}
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>
                <Lightning size={18} color="#00685f" weight="fill" />
                How it works
              </div>
              <p style={bodyTextStyle}>{deepDive.howItWorks}</p>
            </div>

            {/* Dosing */}
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>
                <CheckCircle size={18} color="#00685f" />
                Dosing
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {[
                  { label: 'Conservative', value: deepDive.dosing.low, accent: '#f0f5f2', border: '#bcc9c6' },
                  { label: 'Standard', value: deepDive.dosing.standard, accent: '#e6f4f1', border: '#00685f' },
                  { label: 'High / Loading', value: deepDive.dosing.high, accent: '#f0f5f2', border: '#bcc9c6' },
                ].map(({ label, value, accent, border }) => (
                  <div key={label} style={{
                    background: accent,
                    border: `1px solid ${border}`,
                    borderRadius: '12px',
                    padding: '0.875rem',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6d7a77', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '0.375rem', fontFamily: "'Inter', sans-serif" }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.9375rem', color: '#171d1c' }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                background: '#f0f5f2',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6d7a77', textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', paddingTop: '2px' }}>
                  Timing
                </span>
                <span style={{ ...bodyTextStyle, fontSize: '0.875rem' }}>{deepDive.dosing.timing}</span>
              </div>
            </div>

            {/* Forms & bioavailability */}
            {deepDive.forms && deepDive.forms.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitleStyle}>
                  Forms & Bioavailability
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {deepDive.forms.map((form, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: '#f0f5f2',
                      borderRadius: '10px',
                    }}>
                      <span style={{
                        background: bioavailabilityColors[form.bioavailability] || '#6d7a77',
                        color: '#ffffff',
                        borderRadius: '999px',
                        padding: '0.1875rem 0.5rem',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}>
                        {form.bioavailability}
                      </span>
                      <div>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: '#171d1c', marginBottom: '0.125rem' }}>
                          {form.name}
                        </div>
                        <div style={{ ...bodyTextStyle, fontSize: '0.8125rem' }}>{form.notes}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synergies */}
            {deepDive.synergies && deepDive.synergies.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitleStyle}>
                  Synergies
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {deepDive.synergies.map((s, i) => (
                    <div key={i} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{
                          background: '#e6f4f1',
                          color: '#00685f',
                          border: '1px solid #6bd8cb',
                          borderRadius: '999px',
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          fontFamily: "'Inter', sans-serif",
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {s.supplement}
                        </span>
                        <span style={{ ...bodyTextStyle, fontSize: '0.8125rem', paddingTop: '3px' }}>{s.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cautions */}
            {deepDive.cautions && deepDive.cautions.length > 0 && (
              <div style={{ ...cardStyle, borderLeft: '3px solid #fde047' }}>
                <div style={sectionTitleStyle}>
                  <Warning size={18} color="#d97706" weight="fill" />
                  Cautions & Interactions
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 1.25rem' }}>
                  {deepDive.cautions.map((c, i) => (
                    <li key={i} style={{ ...bodyTextStyle, marginBottom: i < deepDive.cautions.length - 1 ? '0.5rem' : 0, color: '#3d4947' }}>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations link */}
            {deepDive.recommendationsLink && onGoToRecommendations && (
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <p style={{ ...bodyTextStyle, marginBottom: '1rem', color: '#6d7a77' }}>
                  This supplement is recommended for: <strong style={{ color: '#171d1c' }}>{deepDive.recommendationsLink}</strong>
                </p>
                <button
                  onClick={onGoToRecommendations}
                  style={{
                    background: '#3f6560',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '28px',
                    padding: '0.75rem 1.75rem',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#00685f'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#3f6560'; }}
                >
                  See Goal Recommendations →
                </button>
              </div>
            )}

            {/* Footer — freshly generated badge */}
            {wasFreshlyGenerated && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <span style={{
                  background: '#e6f4f1',
                  color: '#00685f',
                  border: '1px solid #6bd8cb',
                  borderRadius: '999px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  ✦ Freshly generated by AI — cached for 30 days
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
