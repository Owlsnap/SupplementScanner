import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Warning, Lightning, Sparkle, CheckCircle } from '@phosphor-icons/react';
import { useStack } from '../contexts/StackContext';
import { useAuth } from '../contexts/AuthContext';
import { encyclopediaSupplements } from '../data/encyclopediaData';

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

export default function StackEvaluationPage() {
  const navigate = useNavigate();
  const { stack } = useStack();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bySeverity, setBySeverity] = useState<BySeverity | null>(null);

  const stackSupplements = encyclopediaSupplements.filter(s => stack.includes(s.slug));

  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (stack.length < 2) { setLoading(false); return; }

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
        if (data.success) setBySeverity(data.data.by_severity);
        else setError(data.error ?? 'Failed to evaluate stack');
      })
      .catch(() => setError('Network error — please try again'))
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
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.375rem, 4vw, 1.75rem)',
            color: 'var(--text-primary)', margin: '0 0 0.375rem', letterSpacing: '-0.5px',
          }}>
            Stack <span style={{ color: '#00685f' }}>Evaluation</span>
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            Interactions, synergies, and warnings for your supplement stack
          </p>
        </div>

        {/* Stack summary */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '16px',
          border: '1.5px solid var(--border)', padding: '1rem 1.25rem', marginBottom: '1.5rem',
        }}>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Your Stack
          </div>
          {stackSupplements.length === 0 ? (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              No supplements in your stack yet. Add some from the{' '}
              <button
                onClick={() => navigate('/')}
                style={{ color: '#00685f', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', padding: 0 }}
              >
                encyclopedia
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
              Add at least 2 supplements
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              Interaction analysis requires 2 or more supplements in your stack.
            </p>
          </div>
        )}

        {loading && stack.length >= 2 && (
          <div style={{
            textAlign: 'center', padding: '2.5rem 1rem',
            color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid var(--border)',
              borderTopColor: '#00685f', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
            }} />
            Analyzing interactions…
          </div>
        )}

        {error && (
          <div style={{
            background: '#fff1f1', border: '1px solid #ffcdd2',
            borderRadius: '12px', padding: '0.875rem 1.125rem',
            fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#ba1a1a',
          }}>
            {error}
          </div>
        )}

        {!loading && !error && bySeverity && (
          <>
            {total === 0 ? (
              <div style={{
                textAlign: 'center', padding: '2.5rem 1rem',
                background: 'var(--bg-surface)', borderRadius: '16px',
                border: '1.5px solid #b3ddd8',
              }}>
                <CheckCircle size={36} color="#00685f" weight="fill" style={{ marginBottom: '0.75rem' }} />
                <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                  Your stack looks clean!
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                  No known interactions found between the supplements in your stack.
                </p>
              </div>
            ) : (
              <>
                <SeverityGroup
                  title="Danger — Avoid combining"
                  color="#ba1a1a"
                  icon={<Warning size={16} weight="fill" color="#ba1a1a" />}
                  items={bySeverity.danger}
                />
                <SeverityGroup
                  title="Caution — Use carefully"
                  color="#d97706"
                  icon={<Lightning size={16} weight="fill" color="#d97706" />}
                  items={bySeverity.caution}
                />
                <SeverityGroup
                  title="Synergy — Beneficial combinations"
                  color="#00685f"
                  icon={<Sparkle size={16} weight="fill" color="#00685f" />}
                  items={bySeverity.synergy}
                />
              </>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
