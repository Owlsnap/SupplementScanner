import React, { useState, useEffect } from 'react';
import { Cookie, Shield, X, Gear } from '@phosphor-icons/react';
import { useLanguage } from '../contexts/LanguageContext';

declare global {
  interface Window {
    Cookiebot?: {
      hasResponse: boolean;
      consent: {
        necessary: boolean;
        preferences: boolean;
        statistics: boolean;
        marketing: boolean;
      };
    };
  }
}

export default function CookieBanner(): JSX.Element | null {
  const { t } = useLanguage();
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);

  useEffect(() => {
    const checkCookieConsent = () => {
      if (window.Cookiebot) {
        if (!window.Cookiebot.hasResponse) {
          setShowBanner(false);
        }
        window.addEventListener('CookiebotOnLoad', () => {
          if (!window.Cookiebot.hasResponse) setShowBanner(true);
        });
        window.addEventListener('CookiebotOnAccept', () => { setShowBanner(false); setShowPreferences(false); });
        window.addEventListener('CookiebotOnDecline', () => { setShowBanner(false); setShowPreferences(false); });
      } else {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) setShowBanner(true);
      }
    };
    checkCookieConsent();
    setTimeout(checkCookieConsent, 1000);
  }, []);

  const handleAcceptAll = () => {
    if (window.Cookiebot) {
      window.Cookiebot.submitCustomConsent(true, true, true, true);
    } else {
      localStorage.setItem('cookie-consent', 'accepted');
      setShowBanner(false);
    }
  };

  const handleRejectAll = () => {
    if (window.Cookiebot) {
      window.Cookiebot.submitCustomConsent(false, false, false, true);
    } else {
      localStorage.setItem('cookie-consent', 'rejected');
      setShowBanner(false);
    }
  };

  const openPreferences = () => {
    if (window.Cookiebot) {
      window.Cookiebot.show();
    } else {
      setShowPreferences(true);
    }
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000,
        background: 'var(--bg-surface)', borderTop: '1.5px solid var(--border)',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap',
        }}>
          {/* Cookie Icon */}
          <div style={{
            background: 'var(--primary-light)', borderRadius: '12px', padding: '0.625rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '44px', height: '44px', border: '1px solid var(--primary-border)',
          }}>
            <Cookie size={22} color="#00685f" />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <h3 style={{
              margin: '0 0 0.25rem', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              fontFamily: "'Manrope', sans-serif",
            }}>
              <Shield size={16} color="#00685f" />
              {t('cookieBanner.title')}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: '1.4', fontFamily: "'Inter', sans-serif" }}>
              {t('cookieBanner.body')}{' '}
              <span style={{ color: '#00685f', fontWeight: 600 }}>🔒 {t('cookieBanner.noDataSold')}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={openPreferences}
              style={{
                background: 'transparent', border: '1.5px solid #bcc9c6',
                borderRadius: '999px', padding: '0.5rem 1rem',
                color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center', gap: '0.375rem',
              }}
            >
              <Gear size={15} />
              {t('cookieBanner.settings')}
            </button>

            <button
              onClick={handleRejectAll}
              style={{
                background: 'var(--bg-page)', border: '1.5px solid var(--border-strong)',
                borderRadius: '999px', padding: '0.5rem 1.25rem',
                color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              {t('cookieBanner.rejectAll')}
            </button>

            <button
              onClick={handleAcceptAll}
              style={{
                background: '#00685f', border: 'none',
                borderRadius: '999px', padding: '0.5rem 1.25rem',
                color: '#ffffff', fontSize: '0.875rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              {t('cookieBanner.acceptAll')}
            </button>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && !window.Cookiebot && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10001, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={() => setShowPreferences(false)}
        >
          <div
            style={{
              background: 'var(--bg-surface)', borderRadius: '20px', padding: '1.75rem',
              maxWidth: '460px', width: '100%',
              border: '1.5px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>
                {t('cookieBanner.preferencesTitle')}
              </h3>
              <button
                onClick={() => setShowPreferences(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5', margin: '0 0 1rem', fontFamily: "'Inter', sans-serif" }}>
              {t('cookieBanner.preferencesBody')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.875rem', background: 'var(--primary-light)', borderRadius: '10px', border: '1px solid var(--primary-border)' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: "'Manrope', sans-serif" }}>{t('cookieBanner.essentialCookies')}</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.375rem 0 0', fontFamily: "'Inter', sans-serif" }}>
                  {t('cookieBanner.essentialCookiesDesc')}
                </p>
              </div>

              <div style={{ padding: '0.875rem', background: 'var(--bg-page)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: "'Manrope', sans-serif" }}>{t('cookieBanner.analyticsCookies')}</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.375rem 0 0', fontFamily: "'Inter', sans-serif" }}>
                  {t('cookieBanner.analyticsCookiesDesc')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleRejectAll}
                style={{
                  background: 'var(--bg-page)', border: '1.5px solid var(--border-strong)',
                  borderRadius: '999px', padding: '0.625rem 1.25rem',
                  color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >
                {t('cookieBanner.essentialOnly')}
              </button>
              <button
                onClick={handleAcceptAll}
                style={{
                  background: '#00685f', border: 'none',
                  borderRadius: '999px', padding: '0.625rem 1.25rem',
                  color: '#ffffff', fontSize: '0.875rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >
                {t('cookieBanner.acceptAll')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
