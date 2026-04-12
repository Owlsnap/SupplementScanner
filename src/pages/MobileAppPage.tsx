import React, { useState } from 'react';
import { ArrowLeft, Check, DeviceMobile, Barcode, ShieldCheck, MagnifyingGlass, Bell, ArrowRight, Sparkle } from '@phosphor-icons/react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface MobileAppPageProps {
  onBack: () => void;
}

const NOTIFY_KEY = 'ss_app_notify';

const FEATURES = [
  {
    icon: <Barcode size={26} weight="regular" />,
    iconBg: 'rgba(0,80,73,0.12)',
    iconColor: '#005049',
    title: 'Instant Barcode Scan',
    body: 'Point your camera at any supplement barcode and get a full ingredient breakdown in seconds.',
  },
  {
    icon: <ShieldCheck size={26} weight="regular" />,
    iconBg: 'rgba(0,80,73,0.12)',
    iconColor: '#005049',
    title: 'Purity Check',
    body: 'AI screens for contaminants, underdosed ingredients, and label accuracy issues.',
  },
  {
    icon: <MagnifyingGlass size={26} weight="regular" />,
    iconBg: 'rgba(119,50,21,0.12)',
    iconColor: '#773215',
    title: 'Additives Flagging',
    body: 'Automatically flags fillers, artificial dyes, and questionable excipients so you know what you\'re really swallowing.',
  },
  {
    icon: <DeviceMobile size={26} weight="regular" />,
    iconBg: 'rgba(0,80,73,0.12)',
    iconColor: '#005049',
    title: 'Encyclopedia On the Go',
    body: 'The full supplement encyclopedia — evidence tiers, dosing, deep dives — in your pocket.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Scan the barcode',
    body: 'Open the app and point your camera at any supplement barcode. No typing required.',
  },
  {
    number: '02',
    title: 'AI analyzes instantly',
    body: 'Our AI cross-references ingredients against evidence databases and flags quality issues in real time.',
  },
  {
    number: '03',
    title: 'Know what you\'re taking',
    body: 'Get a plain-English quality report — purity score, additive warnings, and dosage accuracy.',
  },
];

export default function MobileAppPage({ onBack }: MobileAppPageProps) {
  const { isDark } = useDarkMode();
  const [notified, setNotified] = useState<boolean>(() => !!localStorage.getItem(NOTIFY_KEY));

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

  const cardBase: React.CSSProperties = {
    background: surface,
    borderRadius: '20px',
    padding: '1.75rem',
    border: `1.5px solid ${border}`,
  };

  const notifyButton = (large = false): React.CSSProperties => ({
    background: large ? '#ffffff' : '#00685f',
    color: large ? '#00685f' : '#ffffff',
    border: 'none',
    borderRadius: '28px',
    padding: large ? '0.875rem 2rem' : '0.75rem 1.5rem',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    fontSize: large ? '1rem' : '0.9375rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'opacity 0.15s ease',
  });

  const notifiedBadge = (large = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: isDark ? '#0d2e2a' : '#e6f4f1',
    border: '1.5px solid #6bd8cb',
    borderRadius: '28px',
    padding: large ? '0.875rem 2rem' : '0.75rem 1.5rem',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    fontSize: large ? '1rem' : '0.9375rem',
    color: '#00685f',
  });

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

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto' }}>
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
              <DeviceMobile size={13} weight="fill" color="rgba(255,255,255,0.85)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.4px' }}>
                iOS & ANDROID — COMING SOON
              </span>
            </div>
          </div>

          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
            color: '#ffffff', margin: '0 0 0.75rem', lineHeight: 1.15,
            letterSpacing: '-0.5px',
          }}>
            The supplement scanner<br />in your pocket
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)', fontSize: '1.0625rem',
            fontWeight: 400, lineHeight: 1.6, margin: '0 0 2rem',
          }}>
            Scan any supplement barcode and get an instant AI quality report —
            purity, additives, dosage accuracy, and more. No guessing.
          </p>

          {/* Store buttons */}
          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {notified ? (
              <div style={notifiedBadge(true)}>
                <Check size={17} weight="bold" />
                You're on the list
              </div>
            ) : (
              <>
                <button
                  style={notifyButton(true)}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                  onClick={handleNotify}
                >
                  <Bell size={17} />
                  Notify me on launch
                </button>
                <button
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '28px',
                    padding: '0.875rem 2rem',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onClick={onBack}
                >
                  Try the web app
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.25rem 5rem' }}>

        {/* Features grid */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 800,
              fontSize: '1.375rem', color: textPrimary,
              margin: '0 0 0.375rem', letterSpacing: '-0.3px',
            }}>
              Everything you need to shop smarter
            </h2>
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem',
              color: textMuted, margin: 0, lineHeight: 1.6,
            }}>
              All the power of the web dashboard, optimized for the shelf.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={cardBase}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: f.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem', color: f.iconColor,
                }}>
                  {f.icon}
                </div>
                <h3 style={{
                  fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                  fontSize: '1rem', color: textPrimary,
                  margin: '0 0 0.5rem', letterSpacing: '-0.2px',
                }}>
                  {f.title}
                </h3>
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
                  color: textMuted, margin: 0, lineHeight: 1.6,
                }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 800,
              fontSize: '1.375rem', color: textPrimary,
              margin: '0 0 0.375rem', letterSpacing: '-0.3px',
            }}>
              How it works
            </h2>
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem',
              color: textMuted, margin: 0,
            }}>
              Three steps from the shelf to a full quality report.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {STEPS.map((step, i) => (
              <div key={step.number} style={{
                ...cardBase,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.625rem',
                padding: '1.5rem 1.75rem',
              }}>
                <div style={{
                  fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                  fontSize: '1.375rem', color: '#00685f',
                  letterSpacing: '-0.5px', lineHeight: 1,
                  flexShrink: 0,
                  opacity: 0.5 + i * 0.25,
                }}>
                  {step.number}
                </div>
                <div>
                  <h3 style={{
                    fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                    fontSize: '1rem', color: textPrimary,
                    margin: '0 0 0.375rem', letterSpacing: '-0.2px',
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
                    color: textMuted, margin: 0, lineHeight: 1.6,
                  }}>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Web tie-in */}
        <div style={{
          ...cardBase,
          border: `1.5px solid #00685f`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '3.5rem',
          padding: '1.5rem 1.75rem',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: isDark ? '#0d2e2a' : '#e6f4f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Sparkle size={20} weight="fill" color="#00685f" />
          </div>
          <div>
            <h3 style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 800,
              fontSize: '1rem', color: textPrimary,
              margin: '0 0 0.375rem',
            }}>
              One account, web and mobile
            </h3>
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
              color: textMuted, margin: 0, lineHeight: 1.6,
            }}>
              Premium unlocks the full encyclopedia deep dives on both the web dashboard and
              the mobile app. Scan on your phone, research on your desktop — your data follows you.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{
          ...cardBase,
          background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
          border: 'none',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <h3 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: '1.375rem', color: '#ffffff', margin: 0, letterSpacing: '-0.3px',
          }}>
            Be first to know when it launches
          </h3>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.6,
          }}>
            The iOS and Android apps are in development. Drop your interest and
            we'll notify you the moment they hit the stores.
          </p>
          {notified ? (
            <div style={notifiedBadge(true)}>
              <Check size={17} weight="bold" />
              You're on the list
            </div>
          ) : (
            <button
              style={notifyButton(true)}
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
