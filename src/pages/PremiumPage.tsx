import React, { useState } from 'react';
import { ArrowLeft, Check, Lightning, Star, Sparkle, ArrowRight, Bell, Robot, X } from '@phosphor-icons/react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface PremiumPageProps {
  onBack: () => void;
}

type BillingPeriod = 'monthly' | 'yearly';

const NOTIFY_KEY = 'ss_premium_notify';

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
  'Evidence citations linked to PubMed studies',
  'Confidence score weighted by study type',
  'Dosage gap: studied dose vs. retail dose',
  'Supplement interaction engine (danger / caution / synergy)',
  'Web + mobile access with one account',
  'New supplements added regularly',
];

const COMING_SOON = [
  'Personalized stack optimizer (requires account)',
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
  const [notified, setNotified] = useState<boolean>(() => !!localStorage.getItem(NOTIFY_KEY));
  const [showAiDisclaimer, setShowAiDisclaimer] = useState(false);

  const handleNotify = () => {
    localStorage.setItem(NOTIFY_KEY, '1');
    setNotified(true);
  };

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
    <div style={{ background: pageBg, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
        padding: 'calc(100px + 5rem) 1.5rem 5rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-3rem', top: '-3rem', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '-1rem', bottom: '-2rem', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <img
          src="/3-pills.svg"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', left: '-2.5rem', bottom: '-1rem',
            width: '300px', height: 'auto',
            opacity: 0.35,
            transform: 'rotate(-15deg)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
          {/* Back button + pill badge on same row */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
            <button
              onClick={onBack}
              style={{
                position: 'absolute', left: 0,
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
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              background: 'rgba(255,255,255,0.15)', borderRadius: '999px',
              padding: '0.3125rem 0.875rem',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <Sparkle size={13} weight="fill" color="rgba(255,255,255,0.85)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.4px' }}>
                SUPPLEMENT SCANNER PREMIUM
              </span>
            </div>
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
            fontWeight: 400, lineHeight: 1.6, margin: '0 0 1.25rem',
          }}>
            Full evidence-grounded deep dives on every supplement — dosing, forms,
            interactions, and synergies in one place.
          </p>

        </div>

        {/* AI disclosure — absolute to hero, centered at bottom */}
        <div style={{ position: 'absolute', bottom: '1rem', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif", letterSpacing: '0.2px' }}>
              AI-generated · Not medical advice
            </span>
            <button
              onClick={() => setShowAiDisclaimer(v => !v)}
              style={{
                width: '20px', height: '20px', borderRadius: '999px',
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#ffffff', fontSize: '0.6875rem', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Inter', sans-serif", flexShrink: 0,
                transition: 'background 0.15s ease',
              }}
            >
              {showAiDisclaimer ? <X size={10} weight="bold" /> : '?'}
            </button>
            {showAiDisclaimer && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 0.625rem)', left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bg-surface)', borderRadius: '14px',
                padding: '1rem 1.125rem',
                border: '1.5px solid var(--border)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                width: '300px', zIndex: 10, textAlign: 'left',
              }}>
                <p style={{
                  margin: 0, fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.55,
                }}>
                  Supplement information on this site is generated by AI and reviewed for general accuracy.
                  It is <strong style={{ color: 'var(--text-primary)' }}>not medical advice</strong> and does not replace guidance from a qualified healthcare professional.
                  Always consult a doctor before starting, stopping, or changing any supplement regimen.
                </p>
              </div>
            )}
          </div>
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

                {notified ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                    padding: '0.75rem 1rem', borderRadius: '28px',
                    background: isDark ? '#0d2e2a' : '#e6f4f1',
                    border: '1.5px solid #6bd8cb',
                    fontFamily: "'Inter', sans-serif", fontWeight: 600,
                    fontSize: '0.875rem', color: '#00685f',
                  }}>
                    <Check size={15} weight="bold" />
                    You're on the list
                  </div>
                ) : (
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
                    onClick={handleNotify}
                  >
                    <Bell size={15} />
                    Notify me when live
                  </button>
                )}
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
            Payments launching soon — drop your interest below and we'll let you know first.
          </p>
          {notified ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '28px', padding: '0.875rem 2rem',
              fontFamily: "'Inter', sans-serif", fontWeight: 700,
              fontSize: '1rem', color: '#ffffff',
            }}>
              <Check size={17} weight="bold" />
              You're on the list
            </div>
          ) : (
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
              onClick={handleNotify}
            >
              <Bell size={17} />
              Notify me when live
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
