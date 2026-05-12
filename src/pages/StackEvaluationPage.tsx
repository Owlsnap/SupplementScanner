import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Warning, Lightning, Sparkle, CheckCircle, UserCircle, Sun, Barbell, ForkKnife, Moon, Star, CopySimple, PlusCircle } from '@phosphor-icons/react';
import { useStack } from '../contexts/StackContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { encyclopediaSupplements } from '../data/encyclopediaData';
import AuthModal from '../components/AuthModal';

interface Interaction {
  id: string;
  substance_a: string;
  substance_b: string;
  severity: 'danger' | 'caution' | 'synergy';
  mechanism: string | null;
  source: string | null;
}

interface BySeverity {
  danger: Interaction[];
  caution: Interaction[];
  synergy: Interaction[];
}

type TimeOfDay = 'morning' | 'pre-workout' | 'with-meal' | 'afternoon' | 'evening' | 'before-bed';

interface ScheduleSlot {
  time_of_day: TimeOfDay;
  supplements: string[];
  note?: string;
}

interface Redundancy {
  supplements: string[];
  note: string;
}

interface MissingComplement {
  name: string;
  slug: string | null;
  reason: string;
}

interface StackInsights {
  schedule: ScheduleSlot[];
  redundancies: Redundancy[];
  missing_complements: MissingComplement[];
}

function supplementName(slug: string): string {
  return encyclopediaSupplements.find(s => s.slug === slug)?.name ?? slug;
}

function SeverityGroup({ title, color, icon, items }: {
  title: string;
  color: string;
  icon: React.ReactNode;
  items: Interaction[];
}) {
  if (items.length === 0) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: '16px',
      border: `1.5px solid ${color}33`, marginBottom: '1rem', overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.875rem 1.25rem',
        background: `${color}12`,
        borderBottom: `1px solid ${color}22`,
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        {icon}
        <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.9375rem', color }}>
          {title}
        </span>
        <span style={{
          marginLeft: 'auto',
          background: `${color}22`, color,
          border: `1px solid ${color}44`,
          borderRadius: '999px', padding: '0.125rem 0.625rem',
          fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.75rem',
        }}>
          {items.length}
        </span>
      </div>
      {items.map(item => (
        <div key={item.id} style={{
          padding: '0.875rem 1.25rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: item.mechanism ? '0.375rem' : 0 }}>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.875rem',
              color: 'var(--text-primary)',
            }}>
              {supplementName(item.substance_a)}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>+</span>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.875rem',
              color: 'var(--text-primary)',
            }}>
              {supplementName(item.substance_b)}
            </span>
          </div>
          {item.mechanism && (
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem',
              color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55,
            }}>
              {item.mechanism}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function InsightCard({ title, color, icon, children }: {
  title: string;
  color: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: '16px',
      border: `1.5px solid ${color}33`, marginBottom: '1rem', overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.875rem 1.25rem',
        background: `${color}12`,
        borderBottom: `1px solid ${color}22`,
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        {icon}
        <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.9375rem', color }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

const TIME_SLOT_CONFIG: Record<TimeOfDay, { label: string; headerBg: string; headerColor: string; iconColor: string; border: string; icon: React.ReactNode }> = {
  'morning':     { label: 'Morning',     headerBg: '#f59e0b', headerColor: '#fff', iconColor: '#fff', border: '#fcd34d', icon: <Sun      size={15} weight="fill" color="#fff" /> },
  'pre-workout': { label: 'Pre-Workout', headerBg: '#ef4444', headerColor: '#fff', iconColor: '#fff', border: '#fca5a5', icon: <Barbell  size={15} weight="fill" color="#fff" /> },
  'with-meal':   { label: 'With Meal',   headerBg: '#22c55e', headerColor: '#fff', iconColor: '#fff', border: '#86efac', icon: <ForkKnife size={15} weight="fill" color="#fff" /> },
  'afternoon':   { label: 'Afternoon',   headerBg: '#f97316', headerColor: '#fff', iconColor: '#fff', border: '#fdba74', icon: <Sun      size={15} weight="fill" color="#fff" /> },
  'evening':     { label: 'Evening',     headerBg: '#6366f1', headerColor: '#fff', iconColor: '#fff', border: '#a5b4fc', icon: <Star     size={15} weight="fill" color="#fff" /> },
  'before-bed':  { label: 'Before Bed',  headerBg: '#8b5cf6', headerColor: '#fff', iconColor: '#fff', border: '#c4b5fd', icon: <Moon    size={15} weight="fill" color="#fff" /> },
};

function ScheduleSection({ schedule }: { schedule: ScheduleSlot[] }) {
  if (schedule.length === 0) return null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{
        fontFamily: "'Manrope', sans-serif", fontWeight: 800,
        fontSize: '0.8125rem', color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: '0.75rem',
      }}>
        Daily Schedule
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.625rem' }}>
        {schedule.map((slot, i) => {
          const cfg = TIME_SLOT_CONFIG[slot.time_of_day] ?? {
            label: slot.time_of_day, headerBg: '#64748b', headerColor: '#fff', iconColor: '#fff', border: '#e2e8f0',
            icon: null,
          };
          return (
            <div key={i} style={{
              borderRadius: '14px',
              border: `1.5px solid ${cfg.border}`,
              background: 'var(--bg-surface)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '0.625rem 0.875rem 0.5rem',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                background: cfg.headerBg,
              }}>
                {cfg.icon}
                <span style={{
                  fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                  fontSize: '0.8125rem', color: cfg.headerColor,
                }}>
                  {cfg.label}
                </span>
              </div>
              <div style={{ padding: '0.625rem 0.875rem' }}>
                {slot.supplements.map(name => (
                  <div key={name} style={{
                    fontFamily: "'Inter', sans-serif", fontWeight: 600,
                    fontSize: '0.8125rem', color: 'var(--text-primary)',
                    lineHeight: 1.6,
                  }}>
                    {name}
                  </div>
                ))}
                {slot.note && (
                  <p style={{
                    fontFamily: "'Inter', sans-serif", fontSize: '0.75rem',
                    color: 'var(--text-muted)', margin: '0.375rem 0 0', lineHeight: 1.5,
                  }}>
                    {slot.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RedundancySection({ redundancies }: { redundancies: Redundancy[] }) {
  if (redundancies.length === 0) return null;
  return (
    <InsightCard title="Overlap / Redundancy" color="#d97706" icon={<CopySimple size={16} weight="fill" color="#d97706" />}>
      {redundancies.map((r, i) => (
        <div key={i} style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.375rem' }}>
            {r.supplements.map(name => (
              <span key={name} style={{
                padding: '0.125rem 0.5rem', borderRadius: '999px',
                background: '#fffbeb', border: '1px solid #fde68a',
                color: '#92400e', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem',
              }}>
                {name}
              </span>
            ))}
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
            {r.note}
          </p>
        </div>
      ))}
    </InsightCard>
  );
}

function ComplementsSection({ complements, onNavigate }: { complements: MissingComplement[]; onNavigate: (slug: string) => void }) {
  if (complements.length === 0) return null;
  return (
    <InsightCard title="Consider Adding" color="#00685f" icon={<PlusCircle size={16} weight="fill" color="#00685f" />}>
      {complements.map((c, i) => {
        const clickable = !!c.slug;
        return (
          <div
            key={i}
            onClick={() => clickable && onNavigate(c.slug!)}
            style={{
              padding: '0.875rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              cursor: clickable ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.3rem',
            }}>
              <span style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.875rem',
                color: clickable ? '#00685f' : 'var(--text-primary)',
              }}>
                {c.name}
              </span>
              {clickable && (
                <ArrowRight size={14} color="#00685f" weight="bold" />
              )}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
              {c.reason}
            </p>
          </div>
        );
      })}
    </InsightCard>
  );
}

export default function StackEvaluationPage() {
  const navigate = useNavigate();
  const { stack } = useStack();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bySeverity, setBySeverity] = useState<BySeverity | null>(null);
  const [insights, setInsights] = useState<StackInsights | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const stackSupplements = encyclopediaSupplements.filter(s => stack.includes(s.slug));

  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (stack.length < 2 || !session) { setLoading(false); return; }

    fetch(`${apiUrl}/api/premium/evaluate-stack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ slugs: stack }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setBySeverity(data.data.by_severity);
          setInsights({
            schedule: data.data.schedule ?? [],
            redundancies: data.data.redundancies ?? [],
            missing_complements: data.data.missing_complements ?? [],
          });
        } else {
          setError(data.error ?? 'Failed to evaluate stack');
        }
      })
      .catch(() => setError(t('stackEvaluation.networkError')))
      .finally(() => setLoading(false));
  }, []);

  const total = bySeverity
    ? bySeverity.danger.length + bySeverity.caution.length + bySeverity.synergy.length
    : 0;

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', paddingTop: '100px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

        <button
          onClick={() => navigate(-1 as any)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            background: 'transparent', border: 'none', padding: '0.25rem 0', marginBottom: '1.25rem',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} /> {t('stackEvaluation.back')}
        </button>

        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.375rem, 4vw, 1.75rem)',
            color: 'var(--text-primary)', margin: '0 0 0.375rem', letterSpacing: '-0.5px',
          }}>
            {t('stackEvaluation.title')} <span style={{ color: '#00685f' }}>{t('stackEvaluation.titleHighlight')}</span>
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            {t('stackEvaluation.subtitle')}
          </p>
        </div>

        {/* Stack summary */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '16px',
          border: '1.5px solid var(--border)', padding: '1rem 1.25rem', marginBottom: '1.5rem',
        }}>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('stackEvaluation.yourStack')}
          </div>
          {stackSupplements.length === 0 ? (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              {t('stackEvaluation.noStackYetPart1')}{' '}
              <button
                onClick={() => navigate('/')}
                style={{ color: '#00685f', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', padding: 0 }}
              >
                {t('stackEvaluation.noStackYetLink')}
              </button>.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {stackSupplements.map(s => (
                <span key={s.slug} style={{
                  padding: '0.25rem 0.75rem', borderRadius: '999px',
                  background: '#e6f4f1', border: '1px solid #b3ddd8',
                  color: '#00685f', fontFamily: "'Inter', sans-serif",
                  fontWeight: 600, fontSize: '0.8125rem',
                }}>
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {stack.length < 2 && (
          <div style={{
            textAlign: 'center', padding: '2.5rem 1rem',
            background: 'var(--bg-surface)', borderRadius: '16px',
            border: '1.5px solid var(--border)',
          }}>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {t('stackEvaluation.addAtLeast2')}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              {t('stackEvaluation.requiresMore')}
            </p>
          </div>
        )}

        {stack.length >= 2 && !session && (
          <div style={{
            textAlign: 'center', padding: '2.5rem 1.5rem',
            background: 'var(--bg-surface)', borderRadius: '16px',
            border: '1.5px solid var(--border)',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: '#e6f4f1', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <UserCircle size={28} color="#00685f" />
            </div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.0625rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {t('stackEvaluation.signInTitle')}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
              {t('stackEvaluation.signInBody')}
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                background: '#00685f', color: '#ffffff',
                border: 'none', borderRadius: '28px',
                padding: '0.75rem 1.5rem',
                fontFamily: "'Inter', sans-serif", fontWeight: 600,
                fontSize: '0.9375rem', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              }}
            >
              <UserCircle size={16} />
              {t('stackEvaluation.signInButton')}
            </button>
          </div>
        )}

        {loading && stack.length >= 2 && session && (
          <div style={{
            textAlign: 'center', padding: '2.5rem 1rem',
            color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid var(--border)',
              borderTopColor: '#00685f', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
            }} />
            {t('stackEvaluation.analyzing')}
          </div>
        )}

        {error && session && (
          <div style={{
            background: '#fff1f1', border: '1px solid #ffcdd2',
            borderRadius: '12px', padding: '0.875rem 1.125rem',
            fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#ba1a1a',
          }}>
            {error}
          </div>
        )}

        {!loading && !error && bySeverity && session && (
          <>
            {total === 0 && (
              <div style={{
                textAlign: 'center', padding: '2.5rem 1rem',
                background: 'var(--bg-surface)', borderRadius: '16px',
                border: '1.5px solid #b3ddd8', marginBottom: '1rem',
              }}>
                <CheckCircle size={36} color="#00685f" weight="fill" style={{ marginBottom: '0.75rem' }} />
                <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                  {t('stackEvaluation.cleanStack')}
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                  {t('stackEvaluation.noInteractions')}
                </p>
              </div>
            )}
            {total > 0 && (
              <>
                <SeverityGroup
                  title={t('stackEvaluation.dangerTitle')}
                  color="#ba1a1a"
                  icon={<Warning size={16} weight="fill" color="#ba1a1a" />}
                  items={bySeverity.danger}
                />
                <SeverityGroup
                  title={t('stackEvaluation.cautionTitle')}
                  color="#d97706"
                  icon={<Lightning size={16} weight="fill" color="#d97706" />}
                  items={bySeverity.caution}
                />
                <SeverityGroup
                  title={t('stackEvaluation.synergyTitle')}
                  color="#00685f"
                  icon={<Sparkle size={16} weight="fill" color="#00685f" />}
                  items={bySeverity.synergy}
                />
              </>
            )}
            {insights && (
              <>
                <ScheduleSection schedule={insights.schedule} />
                <RedundancySection redundancies={insights.redundancies} />
                <ComplementsSection complements={insights.missing_complements} onNavigate={slug => navigate(`/encyclopedia/${slug}`)} />
              </>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
