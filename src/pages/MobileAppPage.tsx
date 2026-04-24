import React, { useState } from 'react';
import {
  Check,
  Bell,
  ArrowRight,
  Barcode,
  TestTube,
  Warning,
  BookOpen,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileAppPageProps {
  onBack: () => void;
}

const NOTIFY_KEY = 'ss_app_notify';

const C = {
  bg: '#0d1514',
  surface: '#192120',
  surfaceHigh: '#232c2a',
  surfaceHighest: '#2e3635',
  surfaceVariant: '#2e3635',
  surfaceLow: '#151d1c',
  primary: '#95d1cf',
  primaryContainer: '#004543',
  onPrimary: '#003736',
  text: '#dce4e2',
  textMuted: '#c0c8c7',
  textFaint: '#8a9291',
  outlineVariant: '#414848',
  tertiary: '#f0bba3',
  tertiaryContainer: '#573423',
  onTertiaryContainer: '#ce9c86',
};

const FEATURE_ICONS = [
  <Barcode size={24} />,
  <TestTube size={24} />,
  <Warning size={24} />,
  <BookOpen size={24} />,
];

const STEP_NUMBERS = ['01', '02', '03'];

export default function MobileAppPage({ onBack }: MobileAppPageProps) {
  const { t } = useLanguage();
  const [notified, setNotified] = useState<boolean>(() => !!localStorage.getItem(NOTIFY_KEY));
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const features = (t('mobileApp.features', { returnObjects: true }) as Array<{ title: string; body: string }>).map(
    (f, i) => ({ icon: FEATURE_ICONS[i], title: f.title, body: f.body })
  );
  const steps = (t('mobileApp.steps', { returnObjects: true }) as Array<{ title: string; body: string }>).map(
    (s, i) => ({ number: STEP_NUMBERS[i], title: s.title, body: s.body })
  );

  const handleNotify = () => {
    localStorage.setItem(NOTIFY_KEY, '1');
    setNotified(true);
  };

  const handleEmailSubmit = () => {
    if (email.trim()) {
      localStorage.setItem(NOTIFY_KEY, '1');
      setNotified(true);
      setEmailSubmitted(true);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: C.text }}>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        background: 'linear-gradient(to bottom, #0d1514 0%, transparent 100%)',
        boxSizing: 'border-box',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem', fontWeight: 700, color: C.primary, fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.5px', padding: 0 }}>
            SupplementScanner
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <button onClick={() => scrollTo('features')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: `${C.text}99`, fontWeight: 500, fontSize: '0.9375rem', padding: 0, transition: 'color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = `${C.text}99`)}>{t('mobileApp.navFeatures')}</button>
            <button onClick={() => scrollTo('how-it-works')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: `${C.text}99`, fontWeight: 500, fontSize: '0.9375rem', padding: 0, transition: 'color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = `${C.text}99`)}>{t('mobileApp.navMethodology')}</button>
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: `${C.text}99`, fontWeight: 500, fontSize: '0.9375rem', padding: 0, transition: 'color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = `${C.text}99`)}>{t('mobileApp.navIndex')}</button>
            <button onClick={() => scrollTo('lead-capture')} style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryContainer} 100%)`, color: C.onPrimary, border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', transition: 'opacity 0.15s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              {t('mobileApp.navGetNotified')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: '8rem', paddingBottom: '6rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', overflow: 'hidden', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>

          {/* Left text */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: C.tertiaryContainer, color: C.onTertiaryContainer, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              {t('mobileApp.badge')}
            </span>
            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.1, letterSpacing: '-1.5px', margin: '0 0 1.5rem', maxWidth: '600px' }}>
              {t('mobileApp.heroTitle')}{' '}
              <span style={{ color: C.primary }}>{t('mobileApp.heroTitleHighlight')}</span>
            </h1>
            <p style={{ fontSize: '1.0625rem', color: C.textMuted, maxWidth: '520px', marginBottom: '2.5rem', lineHeight: 1.7, margin: '0 0 2.5rem' }}>
              {t('mobileApp.heroSubtitle')}
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {notified ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(149,209,207,0.1)', border: `1.5px solid ${C.primary}`, borderRadius: '6px', padding: '1rem 2rem', fontWeight: 700, color: C.primary }}>
                  <Check size={17} weight="bold" /> {t('mobileApp.onTheList')}
                </div>
              ) : (
                <>
                  <button onClick={handleNotify} style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryContainer} 100%)`, color: C.onPrimary, border: 'none', borderRadius: '6px', padding: '1rem 2rem', fontWeight: 700, fontSize: '1.0625rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'transform 0.15s' }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(0.97)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                    <Bell size={17} /> {t('mobileApp.notifyOnLaunch')}
                  </button>
                  <button onClick={onBack} style={{ background: C.surfaceHighest, color: C.text, border: `1px solid ${C.outlineVariant}33`, borderRadius: '6px', padding: '1rem 2rem', fontWeight: 600, fontSize: '1.0625rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = C.surfaceVariant)} onMouseLeave={e => (e.currentTarget.style.background = C.surfaceHighest)}>
                    {t('mobileApp.tryWebApp')} <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right phone mockup */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', width: '300px', height: '600px', background: '#000', borderRadius: '3rem', border: `8px solid ${C.surfaceHigh}`, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, width: '100%', height: '24px', background: '#000', zIndex: 20, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '80px', height: '16px', background: '#000', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }} />
              </div>
              <div style={{ position: 'relative', height: '100%', background: C.bg, padding: '1rem', paddingTop: '2.5rem' }}>
                <div style={{ borderRadius: '12px', overflow: 'hidden', height: '100%', position: 'relative' }}>
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2WuWZmMKP6D45cLE3ovwe47dgF5Op_xJP1gHMoIczuOOGaJHZMmlnGGxabmlcZ2gLObDFsZwNY979xRisYPJD2q_YBdUopj-i2RS31TzRPGE79JYL9KKisIEHgGS6snrP0pLyk4YEcQH7v702qkEqmmNitQvZvG7ZOPTxDxlyprLJTbT9AGkkVUMGxfMyUcJ_4okhXBM_F0cesCrmpy7_Kc_AhqbAQEyCMUdv2ZuOq_nOFZlJMjOm_Uh2CAExDXS5Nj916iST33cN"
                    alt="Supplement barcode scanner interface"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Scanner overlay */}
                  <div style={{ position: 'absolute', inset: '2rem', border: `2px solid ${C.primary}66`, borderRadius: '12px', pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '16px', height: '16px', borderTop: `2px solid ${C.primary}`, borderLeft: `2px solid ${C.primary}` }} />
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '16px', height: '16px', borderTop: `2px solid ${C.primary}`, borderRight: `2px solid ${C.primary}` }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '16px', height: '16px', borderBottom: `2px solid ${C.primary}`, borderLeft: `2px solid ${C.primary}` }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderBottom: `2px solid ${C.primary}`, borderRight: `2px solid ${C.primary}` }} />
                  </div>
                </div>
              </div>
            </div>
            {/* Glow */}
            <div style={{ position: 'absolute', zIndex: -1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', height: '500px', background: `${C.primary}1a`, borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none' }} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '6rem 1.5rem', background: C.surfaceLow }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(1.75rem, 4vw, 3rem)', margin: '0 0 1rem', letterSpacing: '-0.5px' }}>
              {t('mobileApp.featuresTitle')}
            </h2>
            <p style={{ fontSize: '1.0625rem', color: C.textMuted }}>{t('mobileApp.featuresSubtitle')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {features.map(f => (
              <div key={f.title} style={{ background: C.surface, padding: '2rem', borderRadius: '12px', border: `1px solid ${C.outlineVariant}1a`, transition: 'border-color 0.2s' }} onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = `${C.primary}4d`)} onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = `${C.outlineVariant}1a`)}>
                <div style={{ width: '48px', height: '48px', background: C.surfaceVariant, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: C.primary }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '1.125rem', margin: '0 0 0.75rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: C.textMuted, margin: 0, lineHeight: 1.65 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '8rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', gap: '4rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 auto', width: '280px' }}>
            <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', position: 'sticky', top: '8rem', margin: 0, letterSpacing: '-0.5px' }}>
              {t('mobileApp.howItWorksTitle')} <span style={{ color: C.tertiary }}>{t('mobileApp.howItWorksHighlight')}</span>
            </h2>
          </div>
          <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {steps.map(step => (
              <div key={step.number} style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '3rem', color: `${C.primary}33`, lineHeight: 1, flexShrink: 0 }}>{step.number}</span>
                <div>
                  <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '1.375rem', margin: '0 0 0.75rem' }}>{step.title}</h3>
                  <p style={{ color: C.textMuted, margin: 0, lineHeight: 1.7 }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sync Section */}
      <section style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ position: 'relative', background: C.surface, borderRadius: '16px', padding: '3rem', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div>
                <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', margin: '0 0 1.5rem', letterSpacing: '-0.5px' }}>
                  {t('mobileApp.syncTitle')}
                </h2>
                <p style={{ fontSize: '1.0625rem', color: C.textMuted, marginBottom: '2rem', lineHeight: 1.7 }}>
                  {t('mobileApp.syncBody')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: C.primary, fontWeight: 700 }}>
                  <ArrowsClockwise size={20} weight="bold" />
                  <span>{t('mobileApp.cloudSync')}</span>
                </div>
              </div>
              <div style={{ borderRadius: '12px', overflow: 'hidden', height: '256px', background: `${C.surfaceVariant}66`, border: `1px solid ${C.outlineVariant}1a` }}>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDcBd2enNz1MROhYBbX6heSFzSXcBgsoLEOZBwuGJeUF3DfveLmWrLbVWwegcyPRnO744yRtp4fLKXCnnrY99zqaY5wMj-D4w2j8h34hjRQOVHclzikCXsOjwLYW6wgSgPyX9OJngtQRPpC_TmujFWuWXcSdaP5Wroqvzg67uXc9M5zEUqj2ZIdgpVEeYTJQ94PoJF1kpj9GyY57ctnSKMy7vT-5YxjwEqZ3-uU-Q2x2yE5S-tP1cBSatUAOS8rgFXlCYSBn5DuYM2"
                  alt="Web and mobile sync"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                />
              </div>
            </div>
            {/* Glow */}
            <div style={{ position: 'absolute', bottom: '-6rem', right: '-6rem', width: '384px', height: '384px', background: `${C.primary}0d`, borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />
          </div>
        </div>
      </section>

      {/* Lead Capture */}
      <section id="lead-capture" style={{ padding: '8rem 1.5rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(1.75rem, 4vw, 3rem)', margin: '0 0 2rem', letterSpacing: '-0.5px' }}>
            {t('mobileApp.learnMoreTitle')}
          </h2>
          {emailSubmitted || notified ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(149,209,207,0.1)', border: `1.5px solid ${C.primary}`, borderRadius: '8px', padding: '1rem 2rem', fontWeight: 700, color: C.primary, fontSize: '1.0625rem' }}>
              <Check size={20} weight="bold" /> {t('mobileApp.onTheList')}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: C.surface, borderRadius: '8px', border: `1px solid ${C.outlineVariant}33` }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                placeholder={t('mobileApp.emailPlaceholder')}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '0.75rem 1rem', color: C.text, fontSize: '1rem', fontFamily: "'Inter', sans-serif' " }}
              />
              <button onClick={handleEmailSubmit} style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryContainer} 100%)`, color: C.onPrimary, border: 'none', borderRadius: '6px', padding: '0.75rem 2rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'transform 0.15s', whiteSpace: 'nowrap' }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(0.98)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                {t('mobileApp.notifyButton')}
              </button>
            </div>
          )}
          <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: `${C.textMuted}99` }}>
            {t('mobileApp.noSpam')}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem 1.5rem', borderTop: `1px solid ${C.outlineVariant}33`, background: C.bg }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
          <p style={{ color: `${C.text}40`, fontSize: '0.875rem', margin: 0 }}>{t('mobileApp.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>

    </div>
  );
}
