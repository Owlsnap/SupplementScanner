import React, { useState } from 'react';
import { X, Sparkle, EnvelopeSimple, Lock, ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

type Mode = 'signin' | 'signup' | 'magic';

interface AuthModalProps {
  onClose: () => void;
  /** If set, navigate there after successful sign-in */
  redirectPath?: string;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

export default function AuthModal({ onClose }: AuthModalProps) {
  const { t } = useLanguage();
  const { signIn, signUp, signInWithMagicLink, signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'magic') {
      const { error } = await signInWithMagicLink(email.trim());
      setLoading(false);
      if (error) { setError(error); return; }
      setSuccess(t('auth.magicLinkSent'));
      return;
    }

    if (mode === 'signup') {
      const { error, needsConfirmation } = await signUp(email.trim(), password);
      setLoading(false);
      if (error) { setError(error); return; }
      if (needsConfirmation) {
        setSuccess(t('auth.accountCreated'));
        setMode('signin');
      } else {
        onClose();
      }
      return;
    }

    // signin
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) { setError(error); return; }
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 0.875rem 0.75rem 2.5rem',
    border: '1.5px solid var(--border-strong)',
    borderRadius: '12px',
    background: 'var(--bg-page)',
    color: 'var(--text-primary)',
    fontSize: '0.9375rem',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  };

  const inputWrap: React.CSSProperties = {
    position: 'relative',
    width: '100%',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-secondary)',
    pointerEvents: 'none',
  };

  const primaryBtn: React.CSSProperties = {
    width: '100%',
    padding: '0.8125rem',
    background: loading ? '#bcc9c6' : '#00685f',
    color: '#ffffff',
    border: 'none',
    borderRadius: '28px',
    fontSize: '0.9375rem',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem',
    transition: 'background 0.15s ease',
  };

  const linkBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#00685f',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  };

  const titles: Record<Mode, string> = {
    signin: t('auth.titles.signin'),
    signup: t('auth.titles.signup'),
    magic: t('auth.titles.magic'),
  };

  const subtitles: Record<Mode, string> = {
    signin: t('auth.subtitles.signin'),
    signup: t('auth.subtitles.signup'),
    magic: t('auth.subtitles.magic'),
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: '24px',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'var(--bg-hover)', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: '#e6f4f1', display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginBottom: '1.25rem',
        }}>
          <Sparkle size={24} weight="fill" color="#00685f" />
        </div>

        {/* Heading */}
        <h3 style={{
          fontFamily: "'Manrope', sans-serif", fontWeight: 800,
          fontSize: '1.25rem', color: 'var(--text-primary)',
          margin: '0 0 0.375rem', letterSpacing: '-0.3px',
        }}>
          {titles[mode]}
        </h3>
        <p style={{
          fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
          color: 'var(--text-muted)', margin: '0 0 1.5rem', lineHeight: 1.5,
        }}>
          {subtitles[mode]}
        </p>

        {/* Success message */}
        {success && (
          <div style={{
            background: '#e6f4f1', border: '1px solid #b3ddd8',
            borderRadius: '10px', padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
            color: '#00685f', lineHeight: 1.5,
          }}>
            {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            background: '#fff1f1', border: '1px solid #ffcdd2',
            borderRadius: '10px', padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
            color: '#ba1a1a', lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Google OAuth — shown on signin and signup */}
        {mode !== 'magic' && (
          <>
            <button
              type="button"
              disabled={googleLoading || loading}
              onClick={async () => {
                setGoogleLoading(true);
                const { error } = await signInWithGoogle();
                if (error) { setError(error); setGoogleLoading(false); }
                // on success Supabase redirects — no further action needed
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--bg-page)',
                border: '1.5px solid var(--border-strong)',
                borderRadius: '28px',
                fontSize: '0.9375rem',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                color: 'var(--text-primary)',
                cursor: googleLoading || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                transition: 'border-color 0.15s ease, background 0.15s ease',
                opacity: googleLoading ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!googleLoading && !loading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#00685f'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'; }}
            >
              {googleLoading
                ? <div style={{ width: '16px', height: '16px', border: '2px solid var(--border-strong)', borderTopColor: '#4285F4', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <GoogleIcon />
              }
              {t('auth.continueWithGoogle')}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.125rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-strong)' }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{t('common.or')}</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-strong)' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Email */}
          <div style={inputWrap}>
            <EnvelopeSimple size={16} style={iconStyle} />
            <input
              type="email"
              required
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          {/* Password — not shown for magic link */}
          {mode !== 'magic' && (
            <div style={inputWrap}>
              <Lock size={16} style={iconStyle} />
              <input
                type="password"
                required
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 8 : undefined}
              />
            </div>
          )}

          {/* Submit */}
          <button type="submit" style={{ ...primaryBtn, marginTop: '0.25rem' }} disabled={loading}>
            {loading
              ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> {t('auth.loading')}</>
              : <><ArrowRight size={16} /> {mode === 'signin' ? t('auth.signIn') : mode === 'signup' ? t('auth.createAccount') : t('auth.sendMagicLink')}</>
            }
          </button>
        </form>

        {/* Footer links */}
        <div style={{
          marginTop: '1.25rem', display: 'flex', flexDirection: 'column',
          gap: '0.5rem', alignItems: 'center',
        }}>
          {mode === 'signin' && (
            <>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {t('auth.noAccount')}{' '}
                <button style={linkBtn} onClick={() => reset('signup')}>{t('auth.signUp')}</button>
              </span>
              <button style={linkBtn} onClick={() => reset('magic')}>
                {t('auth.magicLinkInstead')}
              </button>
            </>
          )}
          {mode === 'signup' && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {t('auth.alreadyHaveAccount')}{' '}
              <button style={linkBtn} onClick={() => reset('signin')}>{t('auth.signIn')}</button>
            </span>
          )}
          {mode === 'magic' && (
            <button style={linkBtn} onClick={() => reset('signin')}>
              {t('auth.backToPassword')}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
