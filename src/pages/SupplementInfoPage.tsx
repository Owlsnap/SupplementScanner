import React from 'react';
import {
  ArrowLeft, Lock, Sparkle, Flask, Gauge, ArrowsHorizontal,
  ShieldWarning, ArrowRight, Barbell, Moon, Brain, Lightning, Leaf, Warning, Article,
} from '@phosphor-icons/react';
import type { EvidenceTier, EncyclopediaCategory } from '../data/encyclopediaData';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface SupplementInfoPageProps {
  slug: string;
  name: string;
  category: EncyclopediaCategory;
  evidenceTier: EvidenceTier;
  tagline: string;
  primaryUse: string;
  overview: string;
  typicalDose: string;
  bestFor: string[];
  keyFacts: string[];
  commonMistakes: string[];
  onBack: () => void;
  onDeepDive: () => void;
  onBuyDive: () => void;
  hasPaidDive: boolean;
}

const categoryColorsLight: Record<EncyclopediaCategory, { bg: string; light: string }> = {
  Performance: { bg: '#00685f', light: '#e6f4f1' },
  Sleep:       { bg: '#6366f1', light: '#eef2ff' },
  Nootropics:  { bg: '#0891b2', light: '#e0f2fe' },
  Recovery:    { bg: '#ea580c', light: '#fff7ed' },
  Health:      { bg: '#16a34a', light: '#f0fdf4' },
};
const categoryColorsDark: Record<EncyclopediaCategory, { bg: string; light: string }> = {
  Performance: { bg: '#14b8a6', light: '#0d2e2a' },
  Sleep:       { bg: '#818cf8', light: '#150d2a' },
  Nootropics:  { bg: '#22d3ee', light: '#0d1f3a' },
  Recovery:    { bg: '#fb923c', light: '#1f0e00' },
  Health:      { bg: '#4ade80', light: '#071c12' },
};

const categoryIcon: Record<EncyclopediaCategory, React.ElementType> = {
  Performance: Barbell,
  Sleep:       Moon,
  Nootropics:  Brain,
  Recovery:    Lightning,
  Health:      Leaf,
};

const evidenceTierStyle: Record<EvidenceTier, { bg: string; color: string; border: string }> = {
  Strong:    { bg: '#00685f',                color: '#ffffff',                    border: '#00685f'                       },
  Moderate:  { bg: 'var(--card-info-bg)',    color: 'var(--card-info-heading)',   border: 'var(--card-info-border)'       },
  Emerging:  { bg: 'var(--card-warning-bg)', color: 'var(--card-warning-heading)', border: 'var(--card-warning-border)'  },
  Anecdotal: { bg: 'var(--bg-subtle)',       color: 'var(--text-secondary)',      border: 'var(--border)'                 },
};

const deepDiveFeatureIcons: React.ElementType[] = [
  Article, Flask, Gauge, ArrowsHorizontal, Sparkle, ShieldWarning,
];

export default function SupplementInfoPage({
  name, category, evidenceTier, tagline, primaryUse, overview,
  typicalDose, bestFor, keyFacts, commonMistakes, onBack, onDeepDive, onBuyDive, hasPaidDive,
}: SupplementInfoPageProps) {
  const { t } = useLanguage();
  const { isDark } = useDarkMode();
  const categoryColors = isDark ? categoryColorsDark : categoryColorsLight;
  const cat = categoryColors[category];
  const tier = evidenceTierStyle[evidenceTier];
  const CatIcon = categoryIcon[category];
  const tierLabel = t(`supplementInfo.evidenceTierLabels.${evidenceTier}`);
  const deepDiveFeatures = (t('supplementInfo.deepDiveFeatures', { returnObjects: true }) as Array<{ label: string; desc: string }>).map(
    (f, i) => ({ Icon: deepDiveFeatureIcons[i], label: f.label, desc: f.desc })
  );

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingTop: '100px' }}>
      {/* Hero banner */}
      <div style={{
        background: `linear-gradient(135deg, ${cat.bg} 0%, ${cat.bg}cc 100%)`,
        padding: '2rem 1.5rem 2.5rem', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-2rem', top: '-2rem', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
            <button
              onClick={onBack}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '999px', padding: '0.375rem 0.75rem 0.375rem 0.5rem',
                color: '#ffffff', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.8125rem',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={14} />
              {t('supplementInfo.back')}
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.375rem', display: 'flex' }}>
                <CatIcon size={18} color="#ffffff" weight="bold" />
              </div>
              <span style={{
                background: 'rgba(255,255,255,0.18)', borderRadius: '999px',
                padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600,
                color: '#ffffff', fontFamily: "'Inter', sans-serif",
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                {category}
              </span>
            </div>
            <div style={{ width: '60px', flexShrink: 0 }} />
          </div>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: '#ffffff',
            margin: '0 0 0.75rem', letterSpacing: '-0.5px', lineHeight: 1.2,
          }}>
            {name}
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: '1rem',
            color: 'rgba(255,255,255,0.85)', margin: '0 auto', lineHeight: 1.6, maxWidth: '540px',
          }}>
            {tagline}
          </p>
        </div>
      </div>

      {/* Content — centered column */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.75rem 1.5rem 5rem' }}>

        {/* Typical dose + evidence row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: '14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            padding: '1.125rem 1.25rem',
            borderTop: `3px solid ${cat.bg}`,
          }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.5rem' }}>
              {t('supplementInfo.typicalDose')}
            </div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              {typicalDose}
            </div>
          </div>
          <div style={{
            background: tier.bg === '#00685f' ? 'var(--primary-light)' : 'var(--bg-surface)',
            borderRadius: '14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            padding: '1.125rem 1.25rem',
            borderTop: `3px solid ${tier.border}`,
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.5rem' }}>
              {t('supplementInfo.evidenceLevel')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span style={{
                background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`,
                borderRadius: '999px', padding: '0.1875rem 0.625rem',
                fontSize: '0.75rem', fontWeight: 700, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
              }}>
                {evidenceTier}
              </span>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.375rem', lineHeight: 1.4 }}>
              {tierLabel}
            </div>
          </div>
        </div>

        {/* Overview */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          padding: '1.375rem 1.5rem', marginBottom: '1rem',
        }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.625rem' }}>
            {t('supplementInfo.overview')}
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.75, margin: 0 }}>
            {overview}
          </p>
        </div>

        {/* Primary use */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          padding: '1.375rem 1.5rem', marginBottom: '1rem',
          borderLeft: `4px solid ${cat.bg}`,
        }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.625rem' }}>
            {t('supplementInfo.howItWorks')}
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
            {primaryUse}
          </p>
        </div>

        {/* Key facts */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          padding: '1.375rem 1.5rem', marginBottom: '1rem',
        }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.875rem' }}>
            {t('supplementInfo.keyFacts')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {keyFacts.map((fact, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  background: cat.light, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px',
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.bg }} />
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  {fact}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Best for */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          padding: '1.375rem 1.5rem', marginBottom: '1rem',
        }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.75rem' }}>
            {t('supplementInfo.bestFor')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {bestFor.map((item, i) => (
              <span key={i} style={{
                background: cat.light, color: cat.bg,
                border: `1px solid ${cat.bg}30`,
                borderRadius: '999px', padding: '0.375rem 0.875rem',
                fontSize: '0.8125rem', fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
              }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Common mistakes */}
        <div style={{
          background: 'var(--card-warning-bg, #fffbeb)', borderRadius: '14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          padding: '1.375rem 1.5rem', marginBottom: '1.75rem',
          border: '1px solid var(--card-warning-border, #fcd34d)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <Warning size={15} color="var(--card-warning-heading, #92400e)" weight="fill" />
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: 'var(--card-warning-heading, #92400e)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              {t('supplementInfo.commonMistakes')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {commonMistakes.map((mistake, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--card-warning-border, #fcd34d)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', marginTop: '2px',
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--card-warning-heading, #92400e)' }} />
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  {mistake}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: `linear-gradient(to right, ${cat.bg}40, transparent)`, marginBottom: '1.75rem' }} />

        {/* Deep Dive premium section */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '20px',
          border: '1.5px solid #00685f',
          boxShadow: '0 4px 20px rgba(0,104,95,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
            padding: '1.25rem 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                fontSize: '1.125rem', color: '#ffffff', letterSpacing: '-0.3px',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <Article size={18} weight="fill" />
                {t('supplementInfo.researchDeepDive')}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.25rem' }}>
                {t('supplementInfo.researchDeepDiveSubtitle')}
              </div>
            </div>
            <span style={{
              background: 'rgba(255,255,255,0.15)', borderRadius: '999px',
              padding: '0.25rem 0.75rem', fontSize: '0.75rem',
              fontWeight: 700, color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)',
              fontFamily: "'Inter', sans-serif",
            }}>
              Premium
            </span>
          </div>

          <div style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem', marginBottom: '1.5rem',
            }}>
              {deepDiveFeatures.map(({ Icon, label, desc }) => (
                <div key={label} style={{
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  padding: '0.875rem',
                  background: 'var(--bg-page)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={17} color="#00685f" weight="duotone" />
                  </div>
                  <div>
                    <div style={{
                      fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.875rem',
                      background: 'linear-gradient(90deg, #00685f 0%, #3f9e8a 100%)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text', lineHeight: 1.2,
                    }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onDeepDive}
              style={{
                width: '100%', padding: '1rem',
                background: '#00685f', color: '#ffffff',
                border: 'none', borderRadius: '14px',
                fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                fontSize: '1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', letterSpacing: '-0.2px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#005049'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#00685f'; }}
            >
              <Sparkle size={18} weight="fill" />
              {hasPaidDive ? t('supplementInfo.openResearchDeepDive') : t('supplementInfo.unlockWithPremium')}
              <ArrowRight size={16} weight="bold" />
            </button>

            {!hasPaidDive && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('common.or')}</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>
                <button
                  onClick={onBuyDive}
                  style={{
                    width: '100%', padding: '0.875rem 1rem',
                    background: 'transparent', color: 'var(--text-primary)',
                    border: '1.5px solid var(--border)', borderRadius: '14px',
                    fontFamily: "'Inter', sans-serif", fontWeight: 600,
                    fontSize: '0.9375rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.5rem', transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00685f'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                >
                  {t('supplementInfo.buyThisDive')}
                </button>
              </>
            )}

            <p style={{ textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.75rem 0 0' }}>
              {t('supplementInfo.researchCached')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
