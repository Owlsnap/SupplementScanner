import React from 'react';
import { Globe } from '@phosphor-icons/react';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSwitcherProps {
  onLanguageChange?: () => void;
}

export default function LanguageSwitcher({ onLanguageChange }: LanguageSwitcherProps) {
  const { language, changeLanguage } = useLanguage();

  const handleLanguageChange = (lng: string) => {
    changeLanguage(lng);
    if (onLanguageChange) {
      onLanguageChange();
    }
  };

  return (
    <div style={{
      width: '100%',
      background: 'transparent',
      border: 'none',
      color: 'var(--text-primary)',
      fontSize: '0.9375rem',
      fontFamily: "'Inter', sans-serif",
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      textAlign: 'left',
      padding: '1rem 1.25rem',
      transition: 'background 0.15s ease',
    }}>
      <Globe size={18} color="var(--text-secondary)" />
      <div>
        <div>Språk / Language</div>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          fontWeight: 400,
          marginTop: '0.125rem',
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button
            onClick={() => handleLanguageChange('sv')}
            style={{
              background: language === 'sv' ? '#00685f' : 'transparent',
              color: language === 'sv' ? '#ffffff' : 'var(--text-secondary)',
              border: language === 'sv' ? 'none' : '1px solid var(--border)',
              borderRadius: '4px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            SV
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            style={{
              background: language === 'en' ? '#00685f' : 'transparent',
              color: language === 'en' ? '#ffffff' : 'var(--text-secondary)',
              border: language === 'en' ? 'none' : '1px solid var(--border)',
              borderRadius: '4px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            EN
          </button>
        </div>
      </div>
    </div>
  );
}