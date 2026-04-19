import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Warning, Lightning, Sparkle, MagnifyingGlass,
  CheckCircle, ArrowsClockwise, Flask,
} from '@phosphor-icons/react';
import type { EvidenceTier } from '../data/encyclopediaData';
import SourceCard, { type Citation } from '../components/SourceCard';

interface PremiumDeepDiveData {
  slug: string;
  supplement: string;
  question: string;
  summary: string;
  the_catch: string[];
  dosage_gap: string | null;
  confidence_score: number | null;
  citations: Citation[];
  studies_found: number;
}

interface PremiumDeepDivePageProps {
  slug: string;
  supplementName: string;
  evidenceTier: EvidenceTier;
  tagline: string;
  authToken: string;
  stripeSessionId?: string;
  onBack: () => void;
}

function ConfidenceMeter({ score }: { score: number }) {
  const color = score >= 70 ? '#00685f' : score >= 45 ? '#d97706' : '#ba1a1a';
  const label = score >= 70 ? 'High confidence' : score >= 45 ? 'Moderate confidence' : 'Low confidence';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Evidence confidence
        </span>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem', fontWeight: 800, color }}>
          {score}% · {label}
        </span>
      </div>
      <div style={{ height: '6px', borderRadius: '999px', background: 'var(--bg-hover)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '999px',
          width: `${score}%`,
          background: color,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <p style={{
        fontFamily: "'Inter', sans-serif", fontSize: '0.75rem',
        color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5,
      }}>
        Weighted by study type: meta-analysis (100%) → RCT — Randomized Controlled Trial (80%) → observational (40%) → animal (10%)
      </p>
    </div>
  );
}

function renderSummaryWithCitations(text: string): React.ReactNode {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      return (
        <sup key={i} style={{
          background: '#00685f',
          color: '#fff',
          borderRadius: '4px',
          padding: '0 4px',
          fontSize: '0.6rem',
          fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
          marginLeft: '1px',
          verticalAlign: 'super',
        }}>
          {match[1]}
        </sup>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function PremiumDeepDivePage({
  slug,
  supplementName,
  evidenceTier,
  tagline,
  authToken,
  stripeSessionId,
  onBack,
}: PremiumDeepDivePageProps) {
  const [data, setData] = useState<PremiumDeepDiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState<{ q: string; answer: string; citations: Citation[] } | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

  const fetchFromApi = (body: object) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (stripeSessionId) headers['x-stripe-session'] = stripeSessionId;
    else headers['Authorization'] = `Bearer ${authToken}`;
    return fetch(`${apiUrl}/api/premium/deep-dive/${slug}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).then(r => r.json());
  };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchFromApi({})
      .then(json => {
        if (json.success) setData(json.data);
        else setError(json.error || 'Failed to load premium content');
      })
      .catch(() => setError('Network error — make sure the server is running'))
      .finally(() => setLoading(false));
  }, [slug, authToken, apiUrl]);

  const askQuestion = (q: string) => {
    setAsking(true);
    setQuestionAnswer(null);
    setQuestionError(null);
    fetchFromApi({ question: q })
      .then(json => {
        if (json.success) {
          setQuestionAnswer({ q, answer: json.data.summary, citations: json.data.citations });
        } else {
          setQuestionError(json.error || 'Failed to answer question');
        }
      })
      .catch(() => setQuestionError('Network error'))
      .finally(() => setAsking(false));
  };

  useEffect(() => { load(); }, [load]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '1.5rem',
    marginBottom: '1rem',
  };

  const sectionTitle: React.CSSProperties = {
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 800, fontSize: '1rem',
    color: 'var(--text-primary)', letterSpacing: '-0.3px',
    marginBottom: '0.75rem',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
  };

  const bodyText: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400, fontSize: '0.9375rem',
    color: 'var(--text-muted)', lineHeight: 1.65, margin: 0,
  };

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', paddingTop: '100px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* Back */}
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            background: 'transparent', border: 'none', padding: '0.25rem 0', marginBottom: '1rem',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Sparkle size={16} color="#00685f" weight="fill" />
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600,
              color: '#00685f', letterSpacing: '0.4px', textTransform: 'uppercase',
            }}>
              Premium · Evidence-grounded
            </span>
          </div>
          <p style={{ ...bodyText, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{tagline}</p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              border: '3px solid var(--border)', borderTopColor: '#00685f',
              animation: 'spin 1s linear infinite', margin: '0 auto 1.25rem',
            }} />
            <p style={{ ...bodyText, color: 'var(--text-muted)', margin: '0 0 0.375rem' }}>
              Retrieving clinical evidence…
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
              Searching PubMed database · Grounding answer in studies
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ ...cardStyle, borderLeft: '4px solid #ba1a1a' }}>
            <p style={{ color: '#ba1a1a', fontWeight: 600, margin: '0 0 0.5rem', fontFamily: "'Inter', sans-serif" }}>
              Failed to load
            </p>
            <p style={{ ...bodyText, color: 'var(--text-secondary)', marginBottom: '1rem' }}>{error}</p>
            <button
              onClick={() => load()}
              style={{
                background: '#00685f', color: '#fff', border: 'none',
                borderRadius: '28px', padding: '0.625rem 1.25rem',
                fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && data && (
          <>
            {/* Confidence score */}
            {data.confidence_score !== null && (
              <div style={cardStyle}>
                <ConfidenceMeter score={data.confidence_score} />
              </div>
            )}

            {/* Evidence summary */}
            <div style={cardStyle}>
              <div style={sectionTitle}>
                <Flask size={18} color="#00685f" weight="fill" />
                Evidence Summary
              </div>
              <p style={{ ...bodyText, lineHeight: 1.75 }}>
                {renderSummaryWithCitations(data.summary)}
              </p>
            </div>

            {/* The Catch */}
            {data.the_catch.length > 0 && (
              <div style={{ ...cardStyle, borderLeft: '3px solid var(--card-warning-border)' }}>
                <div style={sectionTitle}>
                  <Warning size={18} color="#d97706" weight="fill" />
                  The Catch
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                  Limitations identified in the available evidence:
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {data.the_catch.map((c, i) => (
                    <li key={i} style={{ ...bodyText, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dosage gap */}
            {data.dosage_gap && (
              <div style={{ ...cardStyle, borderLeft: '3px solid #3f6560' }}>
                <div style={sectionTitle}>
                  <Lightning size={18} color="#3f6560" weight="fill" />
                  Dosage Gap
                </div>
                <p style={{ ...bodyText, fontSize: '0.9rem' }}>{data.dosage_gap}</p>
              </div>
            )}

            {/* Ask a question */}
            <div style={cardStyle}>
              <div style={sectionTitle}>
                <MagnifyingGlass size={18} color="#00685f" />
                Ask the evidence
              </div>
              <p style={{ ...bodyText, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>
                Ask a specific question — answered using only the retrieved PubMed studies.
              </p>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <input
                  type="text"
                  value={question}
                  onChange={e => { setQuestion(e.target.value); setQuestionAnswer(null); setQuestionError(null); }}
                  onKeyDown={e => { if (e.key === 'Enter' && question.trim()) askQuestion(question.trim()); }}
                  placeholder={`e.g. "What dose was most effective?"`}
                  style={{
                    flex: 1,
                    fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-strong)',
                    background: 'var(--bg-page)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <button
                  disabled={!question.trim() || asking}
                  onClick={() => { if (question.trim()) askQuestion(question.trim()); }}
                  style={{
                    background: '#00685f', color: '#fff', border: 'none',
                    borderRadius: '10px', padding: '0.625rem 1rem',
                    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.875rem',
                    cursor: question.trim() && !asking ? 'pointer' : 'not-allowed',
                    opacity: question.trim() && !asking ? 1 : 0.5,
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    transition: 'opacity 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {asking
                    ? <><div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 1s linear infinite' }} /> Searching</>
                    : <><ArrowsClockwise size={14} /> Ask</>
                  }
                </button>
              </div>

              {/* Inline answer */}
              {asking && (
                <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'var(--bg-hover)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#00685f', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Searching studies for an answer…
                  </span>
                </div>
              )}

              {questionError && (
                <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'var(--card-warning-bg)', border: '1px solid var(--card-warning-border)', borderRadius: '10px' }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#d97706', margin: 0 }}>
                    {questionError}
                  </p>
                </div>
              )}

              {questionAnswer && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.625rem' }}>
                    Answer
                  </p>
                  <p style={{ ...bodyText, fontSize: '0.9rem', lineHeight: 1.7, marginBottom: questionAnswer.citations.length ? '0.875rem' : 0 }}>
                    {renderSummaryWithCitations(questionAnswer.answer)}
                  </p>
                  {questionAnswer.citations.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {questionAnswer.citations.map(c => <SourceCard key={c.pmid} citation={c} />)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Source cards */}
            {data.citations.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitle}>
                  <CheckCircle size={18} color="#00685f" />
                  Sources ({data.citations.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {data.citations.map(citation => (
                    <SourceCard key={citation.pmid} citation={citation} />
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: '0.75rem',
              color: 'var(--text-secondary)', textAlign: 'center',
              lineHeight: 1.6, margin: '0.5rem 0 0',
            }}>
              Answers are grounded in retrieved PubMed abstracts and do not constitute medical advice.
              Always consult a healthcare professional before changing your supplement regimen.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
