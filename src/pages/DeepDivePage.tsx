import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Warning, Lightning, CheckCircle, Info, BookmarkSimple, Lock } from '@phosphor-icons/react';
import type { EvidenceTier } from '../data/encyclopediaData';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, supabase } from '../contexts/AuthContext';

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

interface StudyInfo {
  pubmed_id: string;
  title: string;
  year: number;
  participant_count: number;
  finding: string;
}

// Legacy shape: ungrounded AI content. Still possible in snapshots users saved before the
// PubMed-grounded rewrite, so it keeps rendering; the API no longer produces it.
interface LegacyDeepDiveContent {
  whatItIs: string;
  howItWorks: string;
  dosing: DosingInfo;
  forms: FormInfo[];
  synergies: SynergyInfo[];
  cautions: string[];
  recommendationsLink: string;
  studies?: StudyInfo[];
}

interface GroundedCitation {
  index: number;
  pmid: string;
  title: string;
  year: number | null;
  study_type: string | null;
  sample_size: number | null;
  url: string;
}

// Current shape: a teaser built only from retrieved PubMed abstracts (see generateFreeDive in server.js)
interface GroundedDeepDiveContent {
  version: 2;
  summary: string;
  findings: { text: string; citations: number[] }[];
  citations: GroundedCitation[];
  stats: {
    studies_analyzed: number;
    type_counts: Record<string, number>;
    year_min: number | null;
    year_max: number | null;
  };
  insufficient_evidence: boolean;
}

type DeepDiveContent = LegacyDeepDiveContent | GroundedDeepDiveContent;

const isGroundedDive = (c: DeepDiveContent): c is GroundedDeepDiveContent =>
  (c as GroundedDeepDiveContent).version === 2;

const STUDY_TYPE_ORDER = ['meta-analysis', 'rct', 'observational', 'review', 'animal', 'other'];

interface DeepDivePageProps {
  slug: string;
  supplementName: string;
  supplementCategory: string;
  evidenceTier: EvidenceTier;
  tagline: string;
  onBack: () => void;
  onGoToRecommendations?: () => void;
  onUnlockFullReport?: () => void;
}

const evidenceTierColors: Record<EvidenceTier, { bg: string; text: string; border: string }> = {
  Strong:    { bg: '#00685f',                 text: '#ffffff',                      border: '#00685f' },
  Moderate:  { bg: 'var(--card-info-bg)',     text: 'var(--card-info-heading)',     border: 'var(--card-info-border)' },
  Emerging:  { bg: 'var(--card-warning-bg)',  text: 'var(--card-warning-heading)',  border: 'var(--card-warning-border)' },
  Anecdotal: { bg: 'var(--bg-subtle)',        text: 'var(--text-secondary)',        border: 'var(--border)' },
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
  onUnlockFullReport,
}: DeepDivePageProps) {
  const [deepDive, setDeepDive] = useState<DeepDiveContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wasFreshlyGenerated, setWasFreshlyGenerated] = useState(false);
  const [ddSaved, setDdSaved] = useState(false);
  const [ddSaving, setDdSaving] = useState(false);
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  const tierStyle = evidenceTierColors[evidenceTier];
  const grounded = deepDive && isGroundedDive(deepDive) ? deepDive : null;
  const legacy = deepDive && !isGroundedDive(deepDive) ? deepDive : null;

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
    // Wait for auth to resolve so a signed-in user's saved snapshot can be
    // checked first — hydrating from it is instant and avoids re-fetching
    // (and possibly regenerating) content the user already saved.
    if (authLoading) return;

    if (!user) {
      setDdSaved(false);
      loadContent();
      return;
    }

    setLoading(true);
    supabase
      .from('saved_deep_dives')
      .select('slug, content')
      .eq('user_id', user.id)
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        setDdSaved(!!data);
        if (data?.content) {
          setDeepDive(data.content);
          setWasFreshlyGenerated(false);
          setError(null);
          setLoading(false);
        } else {
          loadContent();
        }
      });
  }, [authLoading, user?.id, slug, loadContent]);

  const toggleSaveDeepDive = useCallback(async () => {
    if (!user || !deepDive || ddSaving) return;
    setDdSaving(true);
    if (ddSaved) {
      await supabase.from('saved_deep_dives').delete().eq('user_id', user.id).eq('slug', slug);
      setDdSaved(false);
    } else {
      await supabase
        .from('saved_deep_dives')
        .upsert({ user_id: user.id, slug, content: deepDive }, { onConflict: 'user_id,slug' });
      setDdSaved(true);
    }
    setDdSaving(false);
  }, [user, slug, deepDive, ddSaved, ddSaving]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '1.5rem',
    marginBottom: '1rem',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 800,
    fontSize: '1rem',
    color: 'var(--text-primary)',
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
    color: 'var(--text-muted)',
    lineHeight: 1.65,
    margin: 0,
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  };

  // Turn inline [N] markers into links to the matching PubMed citation
  const renderCited = (text: string, citations: GroundedCitation[]) =>
    text.split(/(\[\d+\])/g).map((part, i) => {
      const m = part.match(/^\[(\d+)\]$/);
      const c = m ? citations[Number(m[1]) - 1] : null;
      if (!c) return <React.Fragment key={i}>{part}</React.Fragment>;
      return (
        <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
          style={{ color: '#00685f', fontWeight: 600, fontSize: '0.75em', verticalAlign: 'super', textDecoration: 'none' }}>
          [{m![1]}]
        </a>
      );
    });

  const skeletonBlockStyle: React.CSSProperties = {
    background: 'var(--bg-hover)',
    borderRadius: '6px',
    animation: 'shimmer 1.4s ease-in-out infinite',
  };

  const SkeletonCard = ({ lines = 3 }: { lines?: number }) => (
    <div style={cardStyle}>
      <div style={{ ...skeletonBlockStyle, width: '40%', height: '1rem', marginBottom: '0.9rem' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            ...skeletonBlockStyle,
            width: i === lines - 1 ? '60%' : '100%',
            height: '0.8rem',
            marginBottom: i < lines - 1 ? '0.55rem' : 0,
          }}
        />
      ))}
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingTop: '100px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @media (max-width: 480px) {
          .dosing-grid { grid-template-columns: 1fr !important; }
          .synergy-row { flex-wrap: wrap !important; }
        }
      `}</style>

      {/* Content */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '1.5rem 1rem 3rem', overflowX: 'hidden' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            background: 'transparent', border: 'none',
            padding: '0.25rem 0', marginBottom: '1.25rem',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} />
          {t('deepDive.back')}
        </button>

        {/* Title + tagline */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: '1.75rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px',
            margin: '0 0 0.375rem',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}>
            {supplementName}
          </h1>
          {!loading && deepDive && user && (
            <button
              onClick={toggleSaveDeepDive}
              disabled={ddSaving}
              title={ddSaved ? 'Saved to Deep Dives' : 'Save Deep Dive'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                flexShrink: 0,
                marginTop: '2px',
                border: `1.5px solid ${ddSaved ? '#00685f' : 'var(--border-strong)'}`,
                background: ddSaved ? 'var(--primary-light)' : 'transparent',
                cursor: ddSaving ? 'default' : 'pointer',
                opacity: ddSaving ? 0.6 : 1,
              }}
            >
              <BookmarkSimple size={18} color={ddSaved ? '#00685f' : 'var(--text-secondary)'} weight={ddSaved ? 'fill' : 'regular'} />
            </button>
          )}
        </div>
        <p style={{ ...bodyTextStyle, color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          {t(tagline)}
        </p>

        {/* Loading */}
        {loading && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2.5px solid var(--border)',
                borderTopColor: '#00685f',
                animation: 'spin 1s linear infinite',
                flexShrink: 0,
              }} />
              <p style={{ ...bodyTextStyle, color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
                {t('deepDive.generatingAi')}
              </p>
            </div>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={4} />
          </>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ ...cardStyle, borderLeft: '4px solid #ba1a1a', textAlign: 'center' }}>
            <p style={{ color: '#ba1a1a', fontWeight: 600, margin: '0 0 0.5rem', fontFamily: "'Inter', sans-serif" }}>
              {t('deepDive.failedToLoad')}
            </p>
            <p style={{ ...bodyTextStyle, color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{error}</p>
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
                {t('deepDive.tryAgain')}
              </button>
              <button
                onClick={onBack}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '28px',
                  padding: '0.625rem 1.25rem',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {t('deepDive.back')}
              </button>
            </div>
          </div>
        )}

        {/* PubMed-grounded teaser */}
        {!loading && grounded && (
          <>
            {/* Evidence stats */}
            <div style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 0.75rem' }}>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: '#00685f', letterSpacing: '-0.5px' }}>
                {grounded.stats.studies_analyzed}
              </span>
              <span style={{ ...bodyTextStyle, fontSize: '0.875rem', marginRight: '0.25rem' }}>
                {t('deepDive.studiesAnalysed')}
                {grounded.stats.year_min && grounded.stats.year_max ? ` · ${grounded.stats.year_min}–${grounded.stats.year_max}` : ''}
              </span>
              {STUDY_TYPE_ORDER.filter(k => grounded.stats.type_counts[k] > 0).map(k => (
                <span key={k} style={{
                  background: 'var(--primary-light)', color: '#00685f', border: '1px solid #6bd8cb',
                  borderRadius: '999px', padding: '0.1875rem 0.625rem', fontSize: '0.75rem', fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {t(`deepDive.studyTypeLabels.${k}`)} · {grounded.stats.type_counts[k]}
                </span>
              ))}
            </div>

            {grounded.insufficient_evidence && (
              <div style={{ ...cardStyle, borderLeft: '3px solid var(--card-warning-border)' }}>
                <p style={bodyTextStyle}>{t('deepDive.insufficientEvidence')}</p>
              </div>
            )}

            {/* Summary */}
            {grounded.summary && (
              <div style={cardStyle}>
                <div style={sectionTitleStyle}>
                  <Info size={18} color="#00685f" />
                  {t('deepDive.groundedHeading')}
                </div>
                <p style={bodyTextStyle}>{renderCited(grounded.summary, grounded.citations)}</p>
              </div>
            )}

            {/* Findings */}
            {grounded.findings.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitleStyle}>
                  <Lightning size={18} color="#00685f" weight="fill" />
                  {t('deepDive.findingsHeading')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {grounded.findings.map((f, i) => (
                    <div key={i} style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '0.875rem 1rem' }}>
                      <p style={{ ...bodyTextStyle, marginBottom: '0.5rem' }}>{f.text}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {f.citations.map(n => {
                          const c = grounded.citations[n - 1];
                          if (!c) return null;
                          return (
                            <a key={n} href={c.url} target="_blank" rel="noopener noreferrer" style={{
                              textDecoration: 'none', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600,
                              color: '#00685f', border: '1px solid var(--border-strong)', borderRadius: '999px', padding: '0.125rem 0.5rem',
                            }}>
                              {t(`deepDive.studyTypeLabels.${c.study_type || 'other'}`)}{c.year ? ` · ${c.year}` : ''}{c.sample_size ? ` · n=${c.sample_size}` : ''} ↗
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {grounded.citations.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitleStyle}>{t('deepDive.sourcesHeading')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {grounded.citations.map(c => (
                    <a key={c.pmid} href={c.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#00685f', flexShrink: 0, paddingTop: '2px' }}>[{c.index}]</span>
                      <span style={{ ...bodyTextStyle, fontSize: '0.8125rem', minWidth: 0 }}>
                        {c.title} <span style={{ color: 'var(--text-secondary)' }}>· PMID {c.pmid}{c.year ? ` · ${c.year}` : ''}</span>
                      </span>
                    </a>
                  ))}
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
                  {t('deepDive.disclaimer')}
                </p>
              </div>
            )}

            {/* Hook: what the full deep-dive adds */}
            <div style={{ ...cardStyle, border: '1.5px solid #6bd8cb', background: 'var(--primary-light)' }}>
              <div style={sectionTitleStyle}>
                <Lock size={18} color="#00685f" weight="fill" />
                {t('deepDive.lockedHeading')}
              </div>
              <p style={{ ...bodyTextStyle, marginBottom: '0.75rem' }}>{t('deepDive.lockedIntro')}</p>
              <ul style={{ margin: '0 0 1.25rem', padding: '0 0 0 1.25rem' }}>
                {(t('deepDive.lockedItems', { returnObjects: true }) as unknown as string[]).map((item, i) => (
                  <li key={i} style={{ ...bodyTextStyle, marginBottom: '0.25rem' }}>{item}</li>
                ))}
              </ul>
              {onUnlockFullReport && (
                <button
                  onClick={onUnlockFullReport}
                  style={{
                    background: '#00685f', color: '#ffffff', border: 'none', borderRadius: '28px',
                    padding: '0.75rem 1.75rem', fontFamily: "'Inter', sans-serif", fontWeight: 600,
                    fontSize: '0.875rem', cursor: 'pointer',
                  }}
                >
                  {t('deepDive.unlockCta')}
                </button>
              )}
            </div>
          </>
        )}

        {/* Legacy (pre-PubMed-grounding) saved snapshot */}
        {!loading && legacy && (
          <>
            {/* What it is */}
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>
                <Info size={18} color="#00685f" />
                {t('legacy.whatItIs')}
              </div>
              <p style={bodyTextStyle}>{legacy.whatItIs}</p>
            </div>

            {/* How it works */}
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>
                <Lightning size={18} color="#00685f" weight="fill" />
                {t('legacy.howItWorks')}
              </div>
              <p style={bodyTextStyle}>{legacy.howItWorks}</p>
            </div>

            {/* Dosing */}
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>
                <CheckCircle size={18} color="#00685f" />
                {t('legacy.dosing')}
              </div>
              <div className="dosing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {[
                  { label: t('legacy.dosingLabels.conservative'), value: legacy.dosing.low, accent: 'var(--bg-hover)', border: 'var(--border-strong)' },
                  { label: t('legacy.dosingLabels.standard'), value: legacy.dosing.standard, accent: 'var(--primary-light)', border: '#00685f' },
                  { label: t('legacy.dosingLabels.highLoading'), value: legacy.dosing.high, accent: 'var(--bg-hover)', border: 'var(--border-strong)' },
                ].map(({ label, value, accent, border }) => (
                  <div key={label} style={{
                    background: accent,
                    border: `1px solid ${border}`,
                    borderRadius: '12px',
                    padding: '0.875rem',
                    textAlign: 'center',
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
              <div style={{
                background: 'var(--bg-hover)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', paddingTop: '2px', flexShrink: 0 }}>
                  {t('legacy.timing')}
                </span>
                <span style={{ ...bodyTextStyle, fontSize: '0.875rem', minWidth: 0 }}>{legacy.dosing.timing}</span>
              </div>
            </div>

            {/* Forms & bioavailability */}
            {legacy.forms && legacy.forms.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitleStyle}>
                  {t('legacy.formsAndBioavailability')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {legacy.forms.map((form, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: 'var(--bg-hover)',
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
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.125rem', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
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
            {legacy.synergies && legacy.synergies.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitleStyle}>
                  {t('legacy.synergies')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {legacy.synergies.map((s, i) => (
                    <div key={i} style={{ width: '100%' }}>
                      <div className="synergy-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{
                          background: 'var(--primary-light)',
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
                        <span style={{ ...bodyTextStyle, fontSize: '0.8125rem', paddingTop: '3px', minWidth: 0 }}>{s.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Studies */}
            {legacy.studies && legacy.studies.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionTitleStyle}>
                  Key Studies
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {legacy.studies.map((study, i) => (
                    <a
                      key={i}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${study.pubmed_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      <div style={{
                        padding: '0.875rem 1rem',
                        background: 'var(--bg-hover)',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        transition: 'border-color 0.15s ease',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#00685f'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.375rem' }}>
                          <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            {study.title}
                          </span>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: '#00685f', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            PMID {study.pubmed_id}
                          </span>
                        </div>
                        <p style={{ ...bodyTextStyle, fontSize: '0.8125rem', margin: '0 0 0.375rem' }}>{study.finding}</p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {study.year}
                          </span>
                          {study.participant_count > 0 && (
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              n={study.participant_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
                  Citations link to PubMed, the US National Library of Medicine's public research database.
                </p>
              </div>
            )}

            {/* Cautions */}
            {legacy.cautions && legacy.cautions.length > 0 && (
              <div style={{ ...cardStyle, borderLeft: '3px solid var(--card-warning-border)' }}>
                <div style={sectionTitleStyle}>
                  <Warning size={18} color="#d97706" weight="fill" />
                  {t('legacy.cautionsAndInteractions')}
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 1.25rem' }}>
                  {legacy.cautions.map((c, i) => (
                    <li key={i} style={{ ...bodyTextStyle, marginBottom: i < legacy.cautions.length - 1 ? '0.5rem' : 0, color: 'var(--text-muted)' }}>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations link */}
            {legacy.recommendationsLink && onGoToRecommendations && (
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <p style={{ ...bodyTextStyle, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  {t('legacy.recommendedFor')} <strong style={{ color: 'var(--text-primary)' }}>{legacy.recommendationsLink.replace(/\b\w/g, (c: string) => c.toUpperCase())}</strong>
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
                  {t('legacy.seeGoalRecommendations')}
                </button>
              </div>
            )}

            {/* Footer — freshly generated badge */}
            {wasFreshlyGenerated && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <span style={{
                  background: 'var(--primary-light)',
                  color: '#00685f',
                  border: '1px solid #6bd8cb',
                  borderRadius: '999px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {t('legacy.freshlyGenerated')}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
