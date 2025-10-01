import { useState, useEffect } from 'react';
import { Cookie, Shield, X, Settings } from 'lucide-react';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    // Check if CookieBot is loaded and if consent is needed
    const checkCookieConsent = () => {
      if (window.Cookiebot) {
        // Show banner only if consent is needed
        if (!window.Cookiebot.hasResponse) {
          setShowBanner(true);
        }
        
        // Listen for CookieBot events
        window.addEventListener('CookiebotOnLoad', () => {
          if (!window.Cookiebot.hasResponse) {
            setShowBanner(true);
          }
        });
        
        window.addEventListener('CookiebotOnAccept', () => {
          setShowBanner(false);
          setShowPreferences(false);
        });
        
        window.addEventListener('CookiebotOnDecline', () => {
          setShowBanner(false);
          setShowPreferences(false);
        });
      } else {
        // Fallback if CookieBot is not loaded - show custom banner
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
          setShowBanner(true);
        }
      }
    };

    checkCookieConsent();
    
    // Also check after a delay in case CookieBot loads late
    setTimeout(checkCookieConsent, 1000);
  }, []);

  const handleAcceptAll = () => {
    if (window.Cookiebot) {
      window.Cookiebot.submitCustomConsent(true, true, true, true);
    } else {
      // Fallback
      localStorage.setItem('cookie-consent', 'accepted');
      setShowBanner(false);
    }
  };

  const handleRejectAll = () => {
    if (window.Cookiebot) {
      window.Cookiebot.submitCustomConsent(false, false, false, true); // Only necessary cookies
    } else {
      // Fallback
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
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(56, 243, 171, 0.2)',
          padding: '1.5rem',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap'
        }}>
          {/* Cookie Icon */}
          <div
            style={{
              background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)',
              borderRadius: '12px',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}
          >
            <Cookie size={24} color="#0f172a" />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h3 style={{
              margin: '0 0 0.5rem 0',
              color: '#f1f5f9',
              fontSize: '1.125rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Shield size={18} />
              Cookie Consent
            </h3>
            <p style={{
              margin: 0,
              color: '#94a3b8',
              fontSize: '0.875rem',
              lineHeight: '1.4'
            }}>
              We use cookies to enhance your experience and analyze usage. Essential cookies are required for basic functionality.
              <br />
              <span style={{ color: '#38f3ab', fontSize: '0.8rem' }}>
                🔒 Your privacy matters - we don't sell or share personal data.
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Preferences Button */}
            <button
              onClick={openPreferences}
              style={{
                background: 'transparent',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                color: '#94a3b8',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = 'rgba(56, 243, 171, 0.5)';
                e.target.style.color = '#38f3ab';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                e.target.style.color = '#94a3b8';
              }}
            >
              <Settings size={16} />
              Settings
            </button>

            {/* Reject Button */}
            <button
              onClick={handleRejectAll}
              style={{
                background: 'rgba(148, 163, 184, 0.2)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                color: '#f1f5f9',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(148, 163, 184, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(148, 163, 184, 0.2)';
              }}
            >
              Reject All
            </button>

            {/* Accept Button */}
            <button
              onClick={handleAcceptAll}
              style={{
                background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                color: '#0f172a',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(56, 243, 171, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 24px rgba(56, 243, 171, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 20px rgba(56, 243, 171, 0.3)';
              }}
            >
              Accept All
            </button>
          </div>
        </div>
      </div>

      {/* Custom Preferences Modal (fallback) */}
      {showPreferences && !window.Cookiebot && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10001,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setShowPreferences(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid rgba(56, 243, 171, 0.2)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 'bold' }}>
                Cookie Preferences
              </h3>
              <button
                onClick={() => setShowPreferences(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: '1.5' }}>
                We use different types of cookies to optimize your experience:
              </p>
              
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(56, 243, 171, 0.1)', borderRadius: '8px', border: '1px solid rgba(56, 243, 171, 0.2)' }}>
                  <strong style={{ color: '#38f3ab' }}>Essential Cookies (Required)</strong>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.5rem 0 0 0' }}>
                    Required for basic site functionality and security.
                  </p>
                </div>
                
                <div style={{ padding: '1rem', background: 'rgba(148, 163, 184, 0.1)', borderRadius: '8px' }}>
                  <strong style={{ color: '#f1f5f9' }}>Analytics Cookies</strong>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.5rem 0 0 0' }}>
                    Help us understand how you use our site to improve performance.
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleRejectAll}
                style={{
                  background: 'rgba(148, 163, 184, 0.2)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  color: '#f1f5f9',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Essential Only
              </button>
              <button
                onClick={handleAcceptAll}
                style={{
                  background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  color: '#0f172a',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}