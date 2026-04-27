import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Warning, Lightning, Sparkle, MagnifyingGlass,
  CheckCircle, ArrowsClockwise, Flask, Info, XCircle,
} from '@phosphor-icons/react';
import type { EvidenceTier } from '../data/encyclopediaData';
import SourceCard, { type Citation } from '../components/SourceCard';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PremiumDeepDiveData {
  slug: string;
  supplement: string;
  question: string;
  summary: string;
  the_catch: string[];
  dosage_gap: string | null;
  interesting_findings: string[];
  confidence_score: number | null;
  citations: Citation[];
  studies_found: number;
}

interface DosingInfo { low: string; standard: string; high: string; timing: string; }
interface FormInfo { name: string; bioavailability: 'Excellent' | 'Good' | 'Fair' | 'Poor'; notes: string; }
interface SynergyInfo { supplement: string; reason: string; }
interface FreeDeepDiveContent {
  whatItIs: string;
  howItWorks: string;
  dosing: DosingInfo;
  forms: FormInfo[];
  synergies: SynergyInfo[];
  cautions: string[];
  recommendationsLink: string;
}

interface Interaction {
  id: string;
  substance_a: string;
  substance_b: string;
  severity: 'danger' | 'caution' | 'synergy';
  mechanism: string;
  source: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSubstanceName(slug: string) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getStudyBreakdown(citations: Citation[]) {
  const counts: Record<string, number> = {};
  for (const c of citations) {
    const type = c.study_type || 'other';
    counts[type] = (counts[type] || 0) + 1;
  }
  const order = ['meta-analysis', 'rct', 'observational', 'animal', 'other'];
  return Object.entries(counts)
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([type, n]) => `${n} ${type}${n > 1 && !type.endsWith('s') ? 's' : ''}`)
    .join(', ');
}

function renderSummaryWithCitations(text: string): React.ReactNode {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      return (
        <sup key={i} style={{
          background: '#00685f', color: '#fff', borderRadius: '4px',
          padding: '0 4px', fontSize: '0.6rem', fontWeight: 700,
          fontFamily: "'Inter', sans-serif", marginLeft: '1px', verticalAlign: 'super',
        }}>
          {match[1]}
        </sup>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceMeter({ score, citations }: { score: number; citations: Citation[] }) {
  const { t } = useLanguage();
  const color = score >= 70 ? '#00685f' : score >= 45 ? '#d97706' : '#ba1a1a';
  const label = score >= 70
    ? t('premiumDeepDive.confidenceLabels.high')
    : score >= 45
    ? t('premiumDeepDive.confidenceLabels.moderate')
    : t('premiumDeepDive.confidenceLabels.low');
  const breakdown = citations.length > 0 ? getStudyBreakdown(citations) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {t('premiumDeepDive.evidenceConfidence')}
        </span>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem', fontWeight: 800, color }}>
          {score}% · {label}
        </span>
      </div>
      <div style={{ height: '6px', borderRadius: '999px', background: 'var(--bg-hover)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '999px', width: `${score}%`,
          background: color, transition: 'width 0.6s ease',
        }} />
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
        {t('premiumDeepDive.confidenceWeighting')}
      </p>
      {breakdown && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Based on {citations.length} {citations.length === 1 ? 'study' : 'studies'}: {breakdown}
        </p>
      )}
    </div>
  );
}

const SEVERITY_CONFIG = {
  danger:  { color: '#ba1a1a', bg: 'var(--card-danger-bg, #fff5f5)',  border: '#ba1a1a', Icon: XCircle,     labelKey: 'dangerLabel'  },
  caution: { color: '#d97706', bg: 'var(--card-warning-bg)',          border: 'var(--card-warning-border)', Icon: Warning,   labelKey: 'cautionLabel' },
  synergy: { color: '#00685f', bg: 'var(--primary-light)',            border: '#6bd8cb', Icon: CheckCircle, labelKey: 'synergyLabel' },
} as const;

function InteractionCard({ interaction }: { interaction: Interaction }) {
  const { t } = useLanguage();
  const cfg = SEVERITY_CONFIG[interaction.severity];
  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: '12px', padding: '0.875rem 1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <cfg.Icon size={15} color={cfg.color} weight="fill" />
        <span style={{
          fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: cfg.color,
        }}>
          {formatSubstanceName(interaction.substance_b)}
        </span>
        <span style={{
          marginLeft: 'auto', background: cfg.color, color: '#fff',
          borderRadius: '999px', padding: '0.125rem 0.5rem',
          fontSize: '0.6875rem', fontWeight: 600, fontFamily: "'Inter', sans-serif",
          whiteSpace: 'nowrap',
        }}>
          {t(`premiumDeepDive.${cfg.labelKey}` as any)}
        </span>
      </div>
      <p style={{
        fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem',
        color: 'var(--text-muted)', lineHeight: 1.55, margin: 0,
      }}>
        {interaction.mechanism}
      </p>
    </div>
  );
}

const bioavailabilityColors: Record<string, string> = {
  Excellent: '#00685f', Good: '#3f6560', Fair: '#d97706', Poor: '#ba1a1a',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function PremiumDeepDivePage({
  slug, supplementName, evidenceTier, tagline, authToken, stripeSessionId, onBack,
}: PremiumDeepDivePageProps) {
  const { t } = useLanguage();
  const [data, setData]         = useState<PremiumDeepDiveData | null>(null);
  const [freeData, setFreeData] = useState<FreeDeepDiveContent | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking]     = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState<{ q: string; answer: string; citations: Citation[] } | null>(null);
  const [questionError, setQuestionError]   = useState<string | null>(null);

  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

  const premiumHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (stripeSessionId) h['x-stripe-session'] = stripeSessionId;
    else h['Authorization'] = `Bearer ${authToken}`;
    return h;
  };

  const fetchFromApi = (body: object) =>
    fetch(`${apiUrl}/api/premium/deep-dive/${slug}`, {
      method: 'POST', headers: premiumHeaders(), body: JSON.stringify(body),
    }).then(r => r.json());

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    // Fetch free encyclopedia data in parallel (no auth, fast from cache)
    fetch(`${apiUrl}/api/encyclopedia/deep-dive/${slug}`)
      .then(r => r.json())
      .then(json => { if (json.success) setFreeData(json.data); })
      .catch(() => {});

    // Fetch interactions in parallel (with premium auth)
    const { 'Content-Type': _ct, ...getHeaders } = premiumHeaders();
    fetch(`${apiUrl}/api/premium/interactions/${slug}`, { headers: getHeaders })
      .then(r => r.json())
      .then(json => { if (json.success) setInteractions(json.data || []); })
      .catch(() => {});

    // Main premium RAG call — controls loading state (slowest)
    fetchFromApi({})
      .then(json => {
        if (json.success) setData(json.data);
        else setError(json.error || 'Failed to load premium content');
      })
      .catch(() => setError('Network error — make sure the server is running'))
      .finally(() => setLoading(false));
  }, [slug, authToken, stripeSessionId, apiUrl]);

  const askQuestion = (q: string) => {
    setAsking(true);
    setQuestionAnswer(null);
    setQuestionError(null);
    fetchFromApi({ question: q })
      .then(json => {
        if (json.success) setQuestionAnswer({ q, answer: json.data.summary, citations: json.data.citations });
        else setQuestionError(json.error || 'Failed to answer question');
      })
      .catch(() => setQuestionError('Network error'))
      .finally(() => setAsking(false));
  };

  useEffect(() => { load(); }, [load]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '1.5rem', marginBottom: '1rem',
  };
  const sectionTitle: React.CSSProperties = {
    fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem',
    color: 'var(--text-primary)', letterSpacing: '-0.3px',
    marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
  };
  const bodyText: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: '0.9375rem',
    color: 'var(--text-muted)', lineHeight: 1.65, margin: 0,
  };

  const dangerInteractions  = interactions.filter(i => i.severity === 'danger');
  const cautionInteractions = interactions.filter(i => i.severity === 'caution');
  const synergyInteractions = interactions.filter(i => i.severity === 'synergy');

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
          <ArrowLeft size={16} /> {t('premiumDeepDive.back')}
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Sparkle size={16} color="#00685f" weight="fill" />
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600,
              color: '#00685f', letterSpacing: '0.4px', textTransform: 'uppercase',
            }}>
              {t('premiumDeepDive.badge')}
            </span>
          </div>
          <p style={{ ...bodyText, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{tagline}</p>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              border: '3px solid var(--border)', borderTopColor: '#00685f',
              animation: 'spin 1s linear infinite', margin: '0 auto 1.25rem',
            }} />
            <p style={{ ...bodyText, color: 'var(--text-muted)', margin: '0 0 0.375rem' }}>
              {t('premiumDeepDive.retrievingEvidence')}
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
              {t('premiumDeepDive.searchingPubMed')}
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div style={{ ...cardStyle, borderLeft: '4px solid #ba1a1a' }}>
            <p style={{ color: '#ba1a1a', fontWeight: 600, margin: '0 0 0.5rem', fontFamily: "'Inter', sans-serif" }}>
              {t('premiumDeepDive.failedToLoad')}
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
              {t('premiumDeepDive.tryAgain')}
            </button>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && data && (
          <>
            {/* 1 — What it is [FREE] */}
            {freeData?.whatItIs && (
              <div style={cardStyle}>
                <div style={sectionTitle}>
                  <Info size={18} color="#00685f" />
                  {t('deepDive.whatItIs')}
                </div>
                <p style={bodyText}>{freeData.whatItIs}</p>
              </div>
            )}

            {/* 2 — How it works [FREE] */}
            {freeData?.howItWorks && (
              <div style={cardStyle}>
                <div style={sectionTitle}>
                  <Lightning size={18} color="#00685f" weight="fill" />
                  {t('deepDive.howItWorks')}
                </div>
                <p style={bodyText}>{freeData.howItWorks}</p>
              </div>
            )}

            {/* 3 — Evidence confidence [PREMIUM] */}
            {data.confidence_score !== null && (
              <div style={cardStyle}>
                <ConfidenceMeter score={data.confidence_score} citations={data.citations} />
              </div>
            )}

            {/* 4 — Evidence summary [PREMIUM] */}
            <div style={cardStyle}>
              <div style={sectionTitle}>
                <Flask size={18} color="#00685f" weight="fill" />
                {t('premiumDeepDive.evidenceSummary')}
              </div>
              <p style={{ ...bodyText, lineHeight: 1.75 }}>
                {renderSummaryWithCitations(data.summary)}
              </p>
            </div>

            {/* 5 — Interesting findings [PREMIUM] */}
            {data.interesting_findings.length > 0 && (
              <div style={{ ...cardStyle, borderLeft: '3px solid #3f6560' }}>
                <div style={sectionTitle}>
                  <Sparkle size={18} color="#3f6560" weight="fill" />
                  {t('premiumDeepDive.interestingFindings')}
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                  {t('premiumDeepDive.interestingFindingsIntro')}
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {data.interesting_findings.map((finding, i) => (
                    <li key={i} style={{ ...bodyText, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                      {renderSummaryWithCitations(finding)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 6 — Dosing [FREE] */}
            {freeData?.dosing && (
              <div style={cardStyle}>
                <div style={sectionTitle}>
                  <CheckCircle size={18} color="#00685f" />
                  {t('deepDive.dosing')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {([
                    { label: t('deepDive.dosingLabels.conservative'), value: freeData.dosing.low,      accent: 'var(--bg-hover)',      border: 'var(--border-strong)' },
                    { label: t('deepDive.dosingLabels.standard'),     value: freeData.dosing.standard, accent: 'var(--primary-light)', border: '#00685f' },
                    { label: t('deepDive.dosingLabels.highLoading'),  value: freeData.dosing.high,     accent: 'var(--bg-hover)',      border: 'var(--border-strong)' },
                  ] as const).map(({ label, value, accent, border }) => (
                    <div key={label} style={{
                      background: accent, border: `1px solid ${border}`,
                      borderRadius: '12px', padding: '0.875rem', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '0.375rem', fontFamily: "'Inter', sans-serif" }}>
                        {label}
                      </div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', paddingTop: '2px' }}>
                    {t('deepDive.timing')}
                  </span>
                  <span style={{ ...bodyText, fontSize: '0.875rem' }}>{freeData.dosing.timing}</span>
                </div>
              </div>
            )}

            {/* 6 — Dosage gap [PREMIUM] */}
            {data.dosage_gap && (
              <div style={{ ...cardStyle, borderLeft: '3px solid #3f6560' }}>
                <div style={sectionTitle}>
                  <Lightning size={18} color="#3f6560" weight="fill" />
                  {t('premiumDeepDive.dosageGap')}
                </div>
                <p style={{ ...bodyText, fontSize: '0.9rem' }}>{data.dosage_gap}</p>
              </div>
            )}

            {/* 7 — Forms & Bioavailability [FREE] */}
            {freeData?.forms && freeData.forms.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitle}>
                  {t('deepDive.formsAndBioavailability')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {freeData.forms.map((form, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-hover)', borderRadius: '10px' }}>
                      <span style={{
                        background: bioavailabilityColors[form.bioavailability] || '#6d7a77',
                        color: '#fff', borderRadius: '999px', padding: '0.1875rem 0.5rem',
                        fontSize: '0.6875rem', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                        whiteSpace: 'nowrap', flexShrink: 0, marginTop: '1px',
                      }}>
                        {form.bioavailability}
                      </span>
                      <div>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.125rem' }}>
                          {form.name}
                        </div>
                        <div style={{ ...bodyText, fontSize: '0.8125rem' }}>{form.notes}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8 — Interactions [PREMIUM] */}
            <div style={{ ...cardStyle, borderLeft: dangerInteractions.length > 0 ? '3px solid #ba1a1a' : undefined }}>
              <div style={sectionTitle}>
                <Warning size={18} color={dangerInteractions.length > 0 ? '#ba1a1a' : '#d97706'} weight="fill" />
                {t('premiumDeepDive.interactionsTitle')}
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 0.875rem', lineHeight: 1.5 }}>
                {t('premiumDeepDive.interactionsSubtitle')}
              </p>
              {interactions.length === 0 ? (
                <p style={{ ...bodyText, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('premiumDeepDive.noInteractions')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {dangerInteractions.map(i => <InteractionCard key={i.id} interaction={i} />)}
                  {cautionInteractions.map(i => <InteractionCard key={i.id} interaction={i} />)}
                  {synergyInteractions.map(i => <InteractionCard key={i.id} interaction={i} />)}
                </div>
              )}
            </div>

            {/* 9 — Synergies [FREE] */}
            {freeData?.synergies && freeData.synergies.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitle}>
                  {t('deepDive.synergies')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {freeData.synergies.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <span style={{
                        background: 'var(--primary-light)', color: '#00685f',
                        border: '1px solid #6bd8cb', borderRadius: '999px',
                        padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600,
                        fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        {s.supplement}
                      </span>
                      <span style={{ ...bodyText, fontSize: '0.8125rem', paddingTop: '3px' }}>{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10 — The Catch [PREMIUM] */}
            {data.the_catch.length > 0 && (
              <div style={{ ...cardStyle, borderLeft: '3px solid var(--card-warning-border)' }}>
                <div style={sectionTitle}>
                  <Warning size={18} color="#d97706" weight="fill" />
                  {t('premiumDeepDive.theCatch')}
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                  {t('premiumDeepDive.catchIntro')}
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {data.the_catch.map((c, i) => (
                    <li key={i} style={{ ...bodyText, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 11 — Cautions [FREE] */}
            {freeData?.cautions && freeData.cautions.length > 0 && (
              <div style={{ ...cardStyle, borderLeft: '3px solid var(--card-warning-border)' }}>
                <div style={sectionTitle}>
                  <Warning size={18} color="#d97706" weight="fill" />
                  {t('deepDive.cautionsAndInteractions')}
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {freeData.cautions.map((c, i) => (
                    <li key={i} style={{ ...bodyText, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 12 — Ask a question [PREMIUM] */}
            <div style={cardStyle}>
              <div style={sectionTitle}>
                <MagnifyingGlass size={18} color="#00685f" />
                {t('premiumDeepDive.askEvidence')}
              </div>
              <p style={{ ...bodyText, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>
                {t('premiumDeepDive.askEvidenceSubtitle')}
              </p>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <input
                  type="text"
                  value={question}
                  onChange={e => { setQuestion(e.target.value); setQuestionAnswer(null); setQuestionError(null); }}
                  onKeyDown={e => { if (e.key === 'Enter' && question.trim()) askQuestion(question.trim()); }}
                  placeholder={t('premiumDeepDive.askPlaceholder')}
                  style={{
                    flex: 1, fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
                    padding: '0.625rem 0.875rem', borderRadius: '10px',
                    border: '1.5px solid var(--border-strong)',
                    background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none',
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
                    transition: 'opacity 0.15s ease', whiteSpace: 'nowrap',
                  }}
                >
                  {asking
                    ? <><div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 1s linear infinite' }} /> {t('premiumDeepDive.searching')}</>
                    : <><ArrowsClockwise size={14} /> {t('premiumDeepDive.ask')}</>
                  }
                </button>
              </div>

              {asking && (
                <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'var(--bg-hover)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#00685f', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {t('premiumDeepDive.searchingStudies')}
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
                    {t('premiumDeepDive.answer')}
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

            {/* 13 — Source cards [PREMIUM] */}
            {data.citations.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitle}>
                  <CheckCircle size={18} color="#00685f" />
                  {t('premiumDeepDive.sources', { count: data.citations.length })}
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
              {t('premiumDeepDive.disclaimer')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
