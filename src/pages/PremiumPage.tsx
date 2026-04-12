import React, { useState } from 'react';
import { ArrowLeft, Check, Lightning, Star, Sparkle, ArrowRight } from '@phosphor-icons/react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface PremiumPageProps {
  onBack: () => void;
}

type BillingPeriod = 'monthly' | 'yearly';

const PLANS = {
  dive: {
    id: 'dive',
    label: 'Pay per Dive',
    price: '$1.99',
    per: 'per deep dive',
    description: 'Perfect if you only need occasional lookups.',
    cta: 'Buy a Deep Dive',
    highlight: false,
  },
  monthly: {
    id: 'monthly',
    label: 'Monthly',
    price: '$7.99',
    per: 'per month',
    description: 'Unlimited deep dives. Cancel anytime.',
    cta: 'Start Monthly',
    highlight: false,
  },
  yearly: {
    id: 'yearly',
    label: 'Yearly',
    price: '$59.99',
    per: 'per year  ·  ~$5/mo',
    description: 'Best value. Save 37% vs monthly.',
    cta: 'Start Yearly',
    highlight: true,
  },
} as const;

const FREE_FEATURES = [
  'Encyclopedia of 30 supplements',
  'Evidence tier badges',
  'URL & barcode scanner',
  'Basic ingredient breakdown',
];

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Full AI Deep Dives (What it is, How it works)',
  'Dosing guide — conservative / standard / high',
  'Forms & bioavailability rankings',
  'Synergy pairings (e.g. Mg + Zn)',
  'Cautions & drug interactions',
  'Web + mobile access with one account',
  'New supplements added regularly',
];

const COMING_SOON = [
  'RAG-powered evidence citations (PubMed / NIH)',
  'Confidence scores per study type',
  'Dosage gap: studied dose vs. retail dose',
  'Red/Yellow/Green interaction engine',
  'Personalized stack optimizer',
];

const FAQ = [
  {
    q: 'Do I need an account?',
    a: 'Not for a single deep dive. For subscriptions you will need a free account so your access follows you across devices.',
  },
  {
    q: 'Does it work on the mobile app too?',
    a: 'Yes. One subscription unlocks both the web dashboard and the iOS/Android app. Mobile-specific perks (scan-to-deep-dive, push notifications) are rolling out shortly.',
  },
  {
    q: 'What happens when my subscription expires?',
    a: 'You drop back to the free tier instantly. Your account and history are preserved — you can resubscribe any time.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Within 7 days of purchase, yes. Email us and we will sort it.',
  },
];

export default function PremiumPage({ onBack }: PremiumPageProps) {
  const { isDark } = useDarkMode();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const surface = isDark ? '#1a2420' : '#ffffff';
  const pageBg = isDark ? '#0f1a17' : '#f5faf8';
  const textPrimary = isDark ? '#e8f0ee' : '#0d1b19';
  const textSecondary = isDark ? '#8aada8' : '#4a6560';
  const textMuted = isDark ? '#6a8d88' : '#6d7a77';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const borderStrong = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const checkBg = isDark ? '#0d2e2a' : '#e6f4f1';

  const cardBase: React.CSSProperties = {
    background: surface,
    borderRadius: '20px',
    padding: '1.75rem',
    border: `1.5px solid ${border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  const highlightCard: React.CSSProperties = {
    ...cardBase,
    border: '2px solid #00685f',
    boxShadow: '0 0 0 4px rgba(0,104,95,0.12)',
    position: 'relative',
  };

  return (
    <div style={{ background: pageBg, minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingTop: '100px' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
        padding: 'calc(100px + 2rem) 1.5rem 4rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        marginTop: '-100px',
      }}>
        <div style={{ position: 'absolute', right: '-3rem', top: '-3rem', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '-1rem', bottom: '-2rem', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: '6rem', left: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '28px', padding: '0.375rem 0.875rem',
            color: 'rgba(255,255,255,0.9)', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.8125rem',
          }}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            background: 'rgba(255,255,255,0.15)', borderRadius: '999px',
            padding: '0.3125rem 0.875rem', marginBottom: '1rem',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <Sparkle size={13} weight="fill" color="rgba(255,255,255,0.85)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.4px' }}>
              SUPPLEMENT SCANNER PREMIUM
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
            color: '#ffffff', margin: '0 0 0.75rem', lineHeight: 1.15,
            letterSpacing: '-0.5px',
          }}>
            Know exactly what you're taking
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)', fontSize: '1.0625rem',
            fontWeight: 400, lineHeight: 1.6, margin: 0,
          }}>
            Full evidence-grounded deep dives on every supplement — dosing, forms,
            interactions, and synergies in one place.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.25rem 5rem' }}>

        {/* --- SKU cards --- */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '3.5rem',
        }}>
          {Object.values(PLANS).map(plan => {
            const isHighlight = plan.highlight;
            return (
              <div key={plan.id} style={isHighlight ? highlightCard : cardBase}>
                {isHighlight && (
                  <div style={{
                    position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                    background: '#00685f', color: '#fff',
                    borderRadius: '999px', padding: '0.2rem 0.875rem',
                    fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.5px',
                    whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif",
                  }}>
                    BEST VALUE
                  </div>
                )}

                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    marginBottom: '0.375rem',
                  }}>
                    {isHighlight
                      ? <Star size={16} weight="fill" color="#00685f" />
                      : <Lightning size={16} color={textSecondary} />
                    }
                    <span style={{
                      fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                      fontSize: '0.9375rem', color: textPrimary,
                    }}>
                      {plan.label}
                    </span>
                  </div>
                  <p style={{
                    fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem',
                    color: textMuted, margin: 0, lineHeight: 1.5,
                  }}>
                    {plan.description}
                  </p>
                </div>

                <div>
                  <span style={{
                    fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                    fontSize: '2rem', color: textPrimary, letterSpacing: '-1px',
                  }}>
                    {plan.price}
                  </span>
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem',
                    color: textMuted, marginLeft: '0.375rem',
                  }}>
                    {plan.per}
                  </span>
                </div>

                <button
                  style={{
                    background: isHighlight ? '#00685f' : 'transparent',
                    color: isHighlight ? '#ffffff' : '#00685f',
                    border: isHighlight ? 'none' : '1.5px solid #00685f',
                    borderRadius: '28px',
                    padding: '0.75rem 1rem',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                  onClick={() => {
                    // TODO: wire Stripe Checkout for each plan
                    alert(`Stripe Checkout coming soon — ${plan.label}`);
                  }}
                >
                  {plan.cta}
                  <ArrowRight size={15} />
                </button>
              </div>
            );
          })}
        </div>

        {/* --- Feature comparison --- */}
        <div style={{ marginBottom: '3.5rem' }}>
          <h2 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: '1.375rem', color: textPrimary,
            margin: '0 0 1.5rem', letterSpacing: '-0.3px',
          }}>
            What you get
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

            {/* Free */}
            <div style={cardBase}>
              <div style={{
                fontFamily: "'Manrope', sans-serif", fontWeight: 700,
                fontSize: '0.9375rem', color: textSecondary, marginBottom: '0.5rem',
              }}>
                Free
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {FREE_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: checkBg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, marginTop: '1px',
                    }}>
                      <Check size={11} weight="bold" color="#00685f" />
                    </div>
                    <span style={{
                      fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
                      color: textMuted, lineHeight: 1.5,
                    }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium */}
            <div style={{ ...cardBase, border: `1.5px solid #00685f` }}>
              <div style={{
                fontFamily: "'Manrope', sans-serif", fontWeight: 700,
                fontSize: '0.9375rem', color: '#00685f', marginBottom: '0.5rem',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
              }}>
                <Sparkle size={15} weight="fill" />
                Premium
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {PREMIUM_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: checkBg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, marginTop: '1px',
                    }}>
                      <Check size={11} weight="bold" color="#00685f" />
                    </div>
                    <span style={{
                      fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
                      color: textMuted, lineHeight: 1.5,
                    }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* Coming soon block */}
              <div style={{
                marginTop: '0.5rem',
                borderTop: `1px solid ${border}`,
                paddingTop: '0.875rem',
              }}>
                <div style={{
                  fontSize: '0.6875rem', fontWeight: 600, color: textSecondary,
                  letterSpacing: '0.5px', textTransform: 'uppercase',
                  fontFamily: "'Inter', sans-serif", marginBottom: '0.5rem',
                }}>
                  Coming soon
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {COMING_SOON.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        border: `1.5px dashed ${borderStrong}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: '1px',
                      }}>
                        <span style={{ fontSize: '0.5rem', color: textMuted }}>●</span>
                      </div>
                      <span style={{
                        fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem',
                        color: textMuted, lineHeight: 1.5, opacity: 0.7,
                      }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- FAQ --- */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: '1.375rem', color: textPrimary,
            margin: '0 0 1.25rem', letterSpacing: '-0.3px',
          }}>
            Frequently asked
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {FAQ.map((item, i) => (
              <div
                key={i}
                style={{
                  background: surface, borderRadius: '14px',
                  border: `1.5px solid ${openFaq === i ? borderStrong : border}`,
                  overflow: 'hidden', cursor: 'pointer',
                }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1rem 1.25rem',
                }}>
                  <span style={{
                    fontFamily: "'Manrope', sans-serif", fontWeight: 700,
                    fontSize: '0.9375rem', color: textPrimary,
                  }}>
                    {item.q}
                  </span>
                  <span style={{
                    fontSize: '1.125rem', color: textSecondary,
                    transform: openFaq === i ? 'rotate(45deg)' : 'none',
                    transition: 'transform 0.2s ease', flexShrink: 0,
                  }}>
                    +
                  </span>
                </div>
                {openFaq === i && (
                  <div style={{
                    padding: '0 1.25rem 1rem',
                    fontFamily: "'Inter', sans-serif", fontSize: '0.9rem',
                    color: textMuted, lineHeight: 1.65,
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* --- Bottom CTA --- */}
        <div style={{
          ...cardBase,
          background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
          border: 'none',
          textAlign: 'center',
          alignItems: 'center',
        }}>
          <h3 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: '1.375rem', color: '#ffffff', margin: 0, letterSpacing: '-0.3px',
          }}>
            Ready to go deeper?
          </h3>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.6,
          }}>
            Start with a single deep dive for $1.99 — no account needed.
          </p>
          <button
            style={{
              background: '#ffffff', color: '#00685f',
              border: 'none', borderRadius: '28px',
              padding: '0.875rem 2rem',
              fontFamily: "'Inter', sans-serif", fontWeight: 700,
              fontSize: '1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            onClick={() => alert('Stripe Checkout coming soon — per-dive')}
          >
            Buy a Deep Dive
            <ArrowRight size={17} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
