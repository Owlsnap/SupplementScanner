import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Check, Lightning, Star, Sparkle, ArrowRight,
  X, Article, Flask, Gauge, ArrowsHorizontal, ShieldWarning, Lock,
} from '@phosphor-icons/react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface PremiumPageProps {
  onBack: () => void;
  onOpenAuthModal?: () => void;
}


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
  'Index of 30 supplements',
  'Evidence tier badges',
  'URL & barcode scanner',
  'Basic ingredient breakdown',
];

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Full Research Deep Dives',
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

const DEEP_DIVE_FEATURES = [
  { Icon: Article,            label: 'Cited Research',           desc: 'Direct links to PubMed and primary sources for every claim' },
  { Icon: Flask,              label: 'Mechanism of Action',      desc: 'Molecular pathways and cellular receptor interactions' },
  { Icon: Gauge,              label: 'Optimal Dosing',           desc: 'Conservative, standard, and loading ranges from clinical trials' },
  { Icon: ArrowsHorizontal,   label: 'Forms & Bioavailability',  desc: 'Which specific form absorbs best and why' },
  { Icon: Sparkle,            label: 'Synergies & Stacks',       desc: 'Strategic combinations to optimise pathways and co-factors' },
  { Icon: ShieldWarning,      label: 'Cautions & Interactions',  desc: 'Safety profiles and contraindications with pharmaceuticals' },
];


export default function PremiumPage({ onBack, onOpenAuthModal }: PremiumPageProps) {
  const { isDark } = useDarkMode();
  const { t } = useLanguage();
  const { user, session, isPremium } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showAiDisclaimer, setShowAiDisclaimer] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [justSubscribed, setJustSubscribed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === '1') {
      setJustSubscribed(true);
      window.history.replaceState({}, '', '/premium');
    }
  }, []);

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setSubscribeError(null);
    if (!user || !session) {
      onOpenAuthModal?.();
      return;
    }
    setCheckoutLoading(plan);
    const apiUrl = (import.meta as any).env?.VITE_API_URL || '';
    try {
      const res = await fetch(`${apiUrl}/api/payment/create-subscription-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setSubscribeError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubscribeError('Network error. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const freeFeatures = t('premium.freeFeatures', { returnObjects: true }) as string[];
  const premiumFeatures = t('premium.premiumFeatures', { returnObjects: true }) as string[];
  const comingSoonFeatures = t('premium.comingSoonFeatures', { returnObjects: true }) as string[];
  const faqItems = t('premium.faq', { returnObjects: true }) as Array<{ q: string; a: string }>;
  const deepDiveFeaturesList = (t('premium.deepDiveFeatures', { returnObjects: true }) as Array<{ label: string; desc: string }>).map(
    (f, i) => ({ Icon: DEEP_DIVE_FEATURES[i].Icon, label: f.label, desc: f.desc })
  );

  const surface = isDark ? '#1a2420' : '#ffffff';
  const pageBg = isDark ? '#0f1a17' : '#f5faf8';
  const textPrimary = isDark ? '#e8f0ee' : '#0d1b19';
  const textSecondary = isDark ? '#8aada8' : '#4a6560';
  const textMuted = isDark ? '#6a8d88' : '#6d7a77';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const borderStrong = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const checkBg = isDark ? '#0d2e2a' : '#e6f4f1';
  const featureIconBg = isDark ? '#1e2e2b' : '#f0f7f5';

  const cardBase: React.CSSProperties = {
    background: surface,
    borderRadius: '20px',
    padding: '1.75rem',
    border: `1.5px solid ${border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  return (
    <div style={{ background: pageBg, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .premium-hero-grid { grid-template-columns: 1fr !important; }
          .premium-hero-preview { display: none !important; }
          .premium-research-grid { grid-template-columns: 1fr !important; }
          .premium-feature-grid { grid-template-columns: 1fr !important; }
          .premium-plans-grid { grid-template-columns: 1fr !important; }
          .premium-what-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .premium-feature-grid { grid-template-columns: 1fr !important; }
          .premium-hero-grid { padding: 0 1rem !important; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
        padding: 'calc(100px + 3rem) 1.5rem 4rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-3rem', top: '-3rem', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <img
          src="/supplement-scanner-logo-notext.svg"
          alt="" aria-hidden="true"
          style={{ position: 'absolute', left: '-4rem', bottom: '-3rem', width: '600px', height: 'auto', opacity: 0.15, pointerEvents: 'none', userSelect: 'none' }}
        />

        <div className="premium-hero-grid" style={{ maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>

          {/* Left — text */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={onBack}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '28px', padding: '0.375rem 0.875rem',
                  color: 'rgba(255,255,255,0.9)', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.8125rem',
                }}
              >
                <ArrowLeft size={14} />
                {t('common.back')}
              </button>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                background: 'rgba(255,255,255,0.15)', borderRadius: '999px',
                padding: '0.3125rem 0.875rem',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <Sparkle size={13} weight="fill" color="rgba(255,255,255,0.85)" />
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>
                  Premium
                </span>
              </div>
            </div>

            <h1 style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 800,
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              color: '#ffffff', margin: '0 0 1rem', lineHeight: 1.1,
              letterSpacing: '-1px',
            }}>
              {t('premium.heroTitle')}{' '}
              <span style={{
                background: 'linear-gradient(90deg, #fde68a, #fb923c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{t('premium.heroTitleHighlight')}</span>
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.75)', fontSize: '1rem',
              fontWeight: 400, lineHeight: 1.65, margin: '0 0 1.75rem',
              fontFamily: "'Inter', sans-serif",
            }}>
              {t('premium.heroSubtitle')}
            </p>

            {justSubscribed ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '28px', padding: '0.875rem 1.75rem', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: '#ffffff' }}>
                <Check size={16} weight="bold" /> Welcome to Premium!
              </div>
            ) : isPremium ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '28px', padding: '0.875rem 1.75rem', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: '#ffffff' }}>
                <Check size={16} weight="bold" /> You have Premium
              </div>
            ) : (
              <button
                onClick={() => handleSubscribe('yearly')}
                disabled={!!checkoutLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#ffffff', color: '#00685f', border: 'none', borderRadius: '28px', padding: '0.875rem 1.75rem', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.9375rem', cursor: checkoutLoading ? 'not-allowed' : 'pointer', opacity: checkoutLoading ? 0.7 : 1, transition: 'opacity 0.15s ease' }}
                onMouseEnter={e => { if (!checkoutLoading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = checkoutLoading ? '0.7' : '1'; }}
              >
                {checkoutLoading === 'yearly' ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(0,104,95,0.3)', borderTopColor: '#00685f', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Sparkle size={16} weight="fill" />}
                Get Premium
              </button>
            )}
          </div>

          {/* Right — deep dive preview card */}
          <div className="premium-hero-preview" style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: '-3rem',
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              background: isDark ? 'rgba(15,26,23,0.9)' : 'rgba(255,255,255,0.92)',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              backdropFilter: 'blur(12px)',
              position: 'relative',
            }}>
              {/* Card header */}
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: `1px solid ${border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.9375rem', color: textPrimary }}>
                    Magnesium Glycinate
                  </div>
                  <div style={{ fontSize: '0.75rem', color: textSecondary, marginTop: '0.125rem', fontFamily: "'Inter', sans-serif" }}>
                    {t('premium.previewSubtitle')}
                  </div>
                </div>
                <div style={{
                  background: '#00685f', color: '#fff',
                  borderRadius: '999px', padding: '0.2rem 0.625rem',
                  fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.5px',
                  fontFamily: "'Inter', sans-serif", textTransform: 'uppercase',
                }}>
                  {t('premium.previewBadge')}
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '1.125rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#00685f', letterSpacing: '0.6px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", marginBottom: '0.375rem' }}>
                    {t('premium.previewMechanism')}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: textSecondary, lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
                    Acts as a cofactor in 300+ enzymatic reactions. Glycinate chelation improves CNS penetration and sleep-onset latency vs. oxide forms.
                  </p>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    marginTop: '0.5rem',
                    background: checkBg, borderRadius: '6px',
                    padding: '0.25rem 0.625rem',
                  }}>
                    <Article size={12} color="#00685f" weight="fill" />
                    <span style={{ fontSize: '0.6875rem', color: '#00685f', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>PubMed · PMC4603826</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#00685f', letterSpacing: '0.6px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", marginBottom: '0.5rem' }}>
                    {t('premium.previewDosing')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {[
                      { label: t('premium.dosingLabels.conservative'), dose: '200 mg', active: false },
                      { label: t('premium.dosingLabels.standard'), dose: '400 mg', active: true },
                      { label: t('premium.dosingLabels.high'), dose: '800 mg', active: false },
                    ].map(({ label, dose, active }) => (
                      <div key={label} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.375rem 0.625rem',
                        borderRadius: '8px',
                        background: active ? '#00685f' : featureIconBg,
                      }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: active ? '#fff' : textSecondary, fontFamily: "'Inter', sans-serif" }}>{label}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: active ? '#fff' : textMuted, fontFamily: "'Manrope', sans-serif" }}>{dose}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fade-out lock overlay */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
                background: `linear-gradient(to top, ${isDark ? 'rgba(15,26,23,0.95)' : 'rgba(255,255,255,0.95)'}, transparent)`,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: '0.875rem',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary, fontFamily: "'Inter', sans-serif" }}>
                  {t('premium.moreSectionsLocked', { count: 4 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ position: 'absolute', bottom: '1rem', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif", letterSpacing: '0.2px' }}>
              {t('common.researchBacked')}
            </span>
            <button
              onClick={() => setShowAiDisclaimer(v => !v)}
              style={{
                width: '20px', height: '20px', borderRadius: '999px',
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#ffffff', fontSize: '0.6875rem', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Inter', sans-serif", flexShrink: 0,
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
                <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {t('common.aiDisclaimer')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.25rem 5rem' }}>

        {/* ── Success banner ── */}
        {justSubscribed && (
          <div style={{
            background: isDark ? '#0d2e2a' : '#e6f4f1',
            border: '1.5px solid #6bd8cb',
            borderRadius: '16px', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            marginBottom: '2rem',
          }}>
            <Check size={20} weight="bold" color="#00685f" />
            <div>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.9375rem', color: textPrimary }}>
                You're in — welcome to Premium!
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: textMuted, marginTop: '0.125rem' }}>
                All deep dives are now unlocked. Head to the encyclopedia to explore.
              </div>
            </div>
          </div>
        )}

        {/* ── Checkout error ── */}
        {subscribeError && (
          <div style={{
            background: '#fff1f1', border: '1.5px solid #ffcdd2',
            borderRadius: '16px', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            marginBottom: '2rem',
          }}>
            <X size={18} color="#ba1a1a" />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#ba1a1a' }}>{subscribeError}</span>
          </div>
        )}

        {/* ── Pricing cards ── */}
        <div className="premium-plans-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.25rem',
          marginBottom: '3.5rem',
        }}>
          {Object.values(PLANS).map(plan => {
            const isHighlight = plan.highlight;
            const isDive = plan.id === 'dive';
            const planT = t(`premium.plans.${plan.id}`, { returnObjects: true }) as { label: string; price: string; per: string; description: string; cta: string };
            return (
              <div
                key={plan.id}
                style={{
                  ...cardBase,
                  ...(isHighlight ? {
                    border: '2px solid #00685f',
                    boxShadow: '0 0 0 4px rgba(0,104,95,0.12)',
                    position: 'relative',
                  } : {}),
                  ...(isDive ? { position: 'relative' } : {}),
                }}
              >
                {isHighlight && (
                  <div style={{
                    position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                    background: '#00685f', color: '#fff',
                    borderRadius: '999px', padding: '0.2rem 0.875rem',
                    fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.5px',
                    whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif",
                  }}>
                    {t('premium.bestValue')}
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    {isHighlight
                      ? <Star size={16} weight="fill" color="#00685f" />
                      : <Lightning size={16} color={textSecondary} />
                    }
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.9375rem', color: textPrimary }}>
                      {planT.label}
                    </span>
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: textMuted, margin: 0, lineHeight: 1.5 }}>
                    {planT.description}
                  </p>
                </div>

                <div>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '2rem', color: textPrimary, letterSpacing: '-1px' }}>
                    {planT.price}
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: textMuted, marginLeft: '0.375rem' }}>
                    {planT.per}
                  </span>
                </div>

                {isDive ? (
                  <a
                    href="/encyclopedia"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                      padding: '0.75rem 1rem', borderRadius: '28px',
                      border: '1.5px solid #00685f', color: '#00685f',
                      fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.9375rem',
                      textDecoration: 'none', transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.75'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
                  >
                    {planT.cta} <ArrowRight size={14} weight="bold" />
                  </a>
                ) : isPremium ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                    padding: '0.75rem 1rem', borderRadius: '28px',
                    background: isDark ? '#0d2e2a' : '#e6f4f1',
                    border: '1.5px solid #6bd8cb',
                    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: '#00685f',
                  }}>
                    <Check size={15} weight="bold" />
                    Active
                  </div>
                ) : (
                  <button
                    disabled={!!checkoutLoading}
                    style={{
                      background: isHighlight ? '#00685f' : 'transparent',
                      color: isHighlight ? '#ffffff' : '#00685f',
                      border: isHighlight ? 'none' : '1.5px solid #00685f',
                      borderRadius: '28px', padding: '0.75rem 1rem',
                      fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.9375rem',
                      cursor: checkoutLoading ? 'not-allowed' : 'pointer', width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                      opacity: checkoutLoading === plan.id ? 0.7 : 1,
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!checkoutLoading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = checkoutLoading === plan.id ? '0.7' : '1'; }}
                    onClick={() => handleSubscribe(plan.id as 'monthly' | 'yearly')}
                  >
                    {checkoutLoading === plan.id
                      ? <div style={{ width: '15px', height: '15px', border: `2px solid ${isHighlight ? 'rgba(255,255,255,0.3)' : 'rgba(0,104,95,0.3)'}`, borderTopColor: isHighlight ? '#ffffff' : '#00685f', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      : <Sparkle size={15} weight="fill" />
                    }
                    {planT.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Trust signals ── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
          gap: '1.5rem', marginBottom: '3.5rem',
          padding: '1rem 1.5rem',
          background: surface, borderRadius: '14px',
          border: `1px solid ${border}`,
        }}>
          {/* Guarantee */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: checkBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={14} weight="bold" color="#00685f" />
            </div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', fontWeight: 600, color: textPrimary }}>{t('premium.moneyBack')}</span>
          </div>

          <div style={{ width: '1px', height: '20px', background: border }} />

          {/* Cancel anytime */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: checkBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={14} weight="bold" color="#00685f" />
            </div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', fontWeight: 600, color: textPrimary }}>{t('premium.cancelAnytime')}</span>
          </div>

          <div style={{ width: '1px', height: '20px', background: border }} />

          {/* Secure + payment logos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Lock size={14} color={textMuted} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: textMuted }}>{t('premium.secureCheckout')}</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: textMuted, opacity: 0.6 }}>·</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: textMuted, letterSpacing: '0.3px' }}>Stripe</span>
          </div>
        </div>

        {/* ── Research Standard section ── */}
        <div style={{
          background: surface, borderRadius: '24px',
          border: `1.5px solid ${border}`,
          padding: '2.5rem',
          position: 'relative', overflow: 'hidden',
          marginBottom: '3.5rem',
        }}>
          <div style={{ position: 'absolute', bottom: '-4rem', right: '-4rem', width: '280px', height: '280px', background: 'rgba(0,104,95,0.05)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

          <div className="premium-research-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '3rem', alignItems: 'start', position: 'relative', zIndex: 1 }}>

            {/* Left */}
            <div>
              <h2 style={{
                fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                color: textPrimary, margin: '0 0 0.875rem', letterSpacing: '-0.5px', lineHeight: 1.2,
              }}>
                {t('premium.researchStandardTitle')} <span style={{ color: '#00685f' }}>{t('premium.researchStandardHighlight')}</span>
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: textMuted, lineHeight: 1.7, margin: '0 0 1.5rem' }}>
                {t('premium.researchStandardBody')}
              </p>
              <div style={{
                background: isDark ? '#0d2420' : '#f0f7f5',
                borderRadius: '14px',
                border: `1px solid ${border}`,
                padding: '1rem 1.125rem',
              }}>
                <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: textSecondary, lineHeight: 1.6, fontStyle: 'italic' }}>
                  {t('premium.testimonial')}
                </p>
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: checkBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: '#00685f', fontFamily: "'Inter', sans-serif" }}>
                    SS
                  </div>
                  <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, color: textMuted, fontFamily: "'Inter', sans-serif" }}>
                    {t('premium.testimonialAuthor')}
                  </span>
                </div>
              </div>
            </div>

            {/* Right — 2-col feature grid */}
            <div className="premium-feature-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem 2rem' }}>
              {deepDiveFeaturesList.map(({ Icon, label, desc }) => (
                <div key={label} style={{ display: 'flex', gap: '0.875rem' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: featureIconBg,
                    border: `1px solid ${border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={18} color="#00685f" weight="duotone" />
                  </div>
                  <div>
                    <div style={{
                      fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.875rem',
                      color: textPrimary, marginBottom: '0.25rem',
                    }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: textMuted, lineHeight: 1.5 }}>
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── What you get ── */}
        <div style={{ marginBottom: '3.5rem' }}>
          <h2 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: '1.375rem', color: textPrimary,
            margin: '0 0 1.5rem', letterSpacing: '-0.3px',
          }}>
            {t('premium.whatYouGet')}
          </h2>

          <div className="premium-what-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

            <div style={cardBase}>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: textSecondary, marginBottom: '0.5rem' }}>
                {t('premium.free')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {freeFeatures.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: checkBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <Check size={11} weight="bold" color="#00685f" />
                    </div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: textMuted, lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...cardBase, border: `1.5px solid #00685f` }}>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: '#00685f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Sparkle size={15} weight="fill" />
                Premium
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {premiumFeatures.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: checkBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <Check size={11} weight="bold" color="#00685f" />
                    </div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: textMuted, lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.5rem', borderTop: `1px solid ${border}`, paddingTop: '0.875rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: textSecondary, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", marginBottom: '0.5rem' }}>
                  {t('premium.comingSoon')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {comingSoonFeatures.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1.5px dashed ${borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <span style={{ fontSize: '0.5rem', color: textMuted }}>●</span>
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: textMuted, lineHeight: 1.5, opacity: 0.7 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.375rem', color: textPrimary, margin: '0 0 1.25rem', letterSpacing: '-0.3px' }}>
            {t('premium.faqTitle')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {faqItems.map((item, i) => (
              <div
                key={i}
                style={{ background: surface, borderRadius: '14px', border: `1.5px solid ${openFaq === i ? borderStrong : border}`, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem' }}>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: textPrimary }}>
                    {item.q}
                  </span>
                  <span style={{ fontSize: '1.125rem', color: textSecondary, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}>+</span>
                </div>
                {openFaq === i && (
                  <div style={{ padding: '0 1.25rem 1rem', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: textMuted, lineHeight: 1.65 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div style={{
          ...cardBase,
          background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
          border: 'none', textAlign: 'center', alignItems: 'center',
        }}>
          <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.375rem', color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>
            {t('premium.readyToDeeper')}
          </h3>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.6 }}>
            {t('premium.readyToDeeperBody')}
          </p>
          {isPremium ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '28px', padding: '0.875rem 2rem', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>
              <Check size={17} weight="bold" />
              You have Premium
            </div>
          ) : (
            <button
              disabled={!!checkoutLoading}
              style={{ background: '#ffffff', color: '#00685f', border: 'none', borderRadius: '28px', padding: '0.875rem 2rem', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '1rem', cursor: checkoutLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: checkoutLoading ? 0.7 : 1, transition: 'opacity 0.15s ease' }}
              onMouseEnter={e => { if (!checkoutLoading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = checkoutLoading ? '0.7' : '1'; }}
              onClick={() => handleSubscribe('yearly')}
            >
              {checkoutLoading === 'yearly'
                ? <div style={{ width: '17px', height: '17px', border: '2px solid rgba(0,104,95,0.3)', borderTopColor: '#00685f', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <Sparkle size={17} weight="fill" />
              }
              Get Premium
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
