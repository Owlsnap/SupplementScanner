import React from 'react';
import {
  ArrowLeft, Lock, Sparkle, Flask, Gauge, ArrowsHorizontal,
  ShieldWarning, ArrowRight, Barbell, Moon, Brain, Lightning, Leaf,
} from '@phosphor-icons/react';
import type { EvidenceTier, EncyclopediaCategory } from '../data/encyclopediaData';

interface SupplementInfoPageProps {
  slug: string;
  name: string;
  category: EncyclopediaCategory;
  evidenceTier: EvidenceTier;
  tagline: string;
  primaryUse: string;
  typicalDose: string;
  bestFor: string[];
  keyFacts: string[];
  onBack: () => void;
  onDeepDive: () => void;
}

const categoryColors: Record<EncyclopediaCategory, { bg: string; light: string }> = {
  Performance: { bg: '#00685f', light: '#e6f4f1' },
  Sleep:       { bg: '#6366f1', light: '#eef2ff' },
  Nootropics:  { bg: '#0891b2', light: '#e0f2fe' },
  Recovery:    { bg: '#ea580c', light: '#fff7ed' },
  Health:      { bg: '#16a34a', light: '#f0fdf4' },
};

const categoryIcon: Record<EncyclopediaCategory, React.ElementType> = {
  Performance: Barbell,
  Sleep:       Moon,
  Nootropics:  Brain,
  Recovery:    Lightning,
  Health:      Leaf,
};

const evidenceTierStyle: Record<EvidenceTier, { bg: string; color: string; border: string; label: string }> = {
  Strong:    { bg: '#00685f', color: '#ffffff', border: '#00685f',  label: 'Well-established science with multiple RCTs' },
  Moderate:  { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd',  label: 'Several quality studies with consistent results' },
  Emerging:  { bg: '#fef9c3', color: '#854d0e', border: '#fde047',  label: 'Promising early research, more trials needed' },
  Anecdotal: { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1',  label: 'Primarily user reports, limited clinical data' },
};

const deepDiveFeatures: Array<{ Icon: React.ElementType; label: string; desc: string }> = [
  { Icon: Flask,          label: 'Mechanism of action',          desc: 'How it works at the cellular level' },
  { Icon: Gauge,          label: 'Optimal dosing protocols',     desc: 'Conservative, standard, and loading ranges' },
  { Icon: ArrowsHorizontal, label: 'Best forms & bioavailability', desc: 'Which form absorbs best and why' },
  { Icon: Sparkle,        label: 'Synergies & stacks',           desc: 'What to combine it with for best results' },
  { Icon: ShieldWarning,  label: 'Cautions & interactions',      desc: 'What to watch out for' },
];

export default function SupplementInfoPage({
  name, category, evidenceTier, tagline, primaryUse,
  typicalDose, bestFor, keyFacts, onBack, onDeepDive,
}: SupplementInfoPageProps) {
  const cat = categoryColors[category];
  const tier = evidenceTierStyle[evidenceTier];
  const CatIcon = categoryIcon[category];

  return (
    <div style={{ background: '#f5faf8', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingTop: '100px' }}>
      {/* Hero banner */}
      <div style={{
        background: `linear-gradient(135deg, ${cat.bg} 0%, ${cat.bg}cc 100%)`,
        padding: '2rem 1.5rem 2.5rem', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-2rem', top: '-2rem', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '999px', padding: '0.375rem 0.75rem 0.375rem 0.5rem',
              color: '#ffffff', cursor: 'pointer', marginBottom: '1.25rem',
              fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.8125rem',
            }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
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
            background: '#ffffff', borderRadius: '14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            padding: '1.125rem 1.25rem',
            borderTop: `3px solid ${cat.bg}`,
          }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: '#6d7a77', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.5rem' }}>
              Typical Dose
            </div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#171d1c', letterSpacing: '-0.2px' }}>
              {typicalDose}
            </div>
          </div>
          <div style={{
            background: tier.bg === '#00685f' ? '#e6f4f1' : '#ffffff',
            borderRadius: '14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            padding: '1.125rem 1.25rem',
            borderTop: `3px solid ${tier.border}`,
          }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: '#6d7a77', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.5rem' }}>
              Evidence Level
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`,
                borderRadius: '999px', padding: '0.1875rem 0.625rem',
                fontSize: '0.75rem', fontWeight: 700, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
              }}>
                {evidenceTier}
              </span>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: '#6d7a77', marginTop: '0.375rem', lineHeight: 1.4 }}>
              {tier.label}
            </div>
          </div>
        </div>

        {/* Primary use */}
        <div style={{
          background: '#ffffff', borderRadius: '14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          padding: '1.375rem 1.5rem', marginBottom: '1rem',
          borderLeft: `4px solid ${cat.bg}`,
        }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: '#6d7a77', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.625rem' }}>
            How It Works
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem', color: '#171d1c', lineHeight: 1.7, margin: 0 }}>
            {primaryUse}
          </p>
        </div>

        {/* Key facts */}
        <div style={{
          background: '#ffffff', borderRadius: '14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          padding: '1.375rem 1.5rem', marginBottom: '1rem',
        }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: '#6d7a77', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.875rem' }}>
            Key Facts
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
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#3d4947', lineHeight: 1.6, margin: 0 }}>
                  {fact}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Best for */}
        <div style={{
          background: '#ffffff', borderRadius: '14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          padding: '1.375rem 1.5rem', marginBottom: '1.75rem',
        }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: '#6d7a77', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '0.75rem' }}>
            Best For
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

        {/* Divider */}
        <div style={{ height: '1px', background: `linear-gradient(to right, ${cat.bg}40, transparent)`, marginBottom: '1.75rem' }} />

        {/* Deep Dive premium section */}
        <div style={{
          background: '#ffffff', borderRadius: '20px',
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
                <Sparkle size={18} weight="fill" />
                AI Deep Dive
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.25rem' }}>
                Full research breakdown — generated on demand
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
              {deepDiveFeatures.map(({ Icon, label, desc }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.875rem 1rem',
                  background: '#f5faf8', borderRadius: '12px',
                  border: '1px solid #e4e9e7',
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    background: '#e6f4f1', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={44} color="#00685f" weight="duotone" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: '#171d1c' }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: '#6d7a77', marginTop: '0.125rem' }}>
                      {desc}
                    </div>
                  </div>
                  <Lock size={14} color="#bcc9c6" style={{ flexShrink: 0 }} />
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
              Unlock Deep Dive
              <ArrowRight size={16} weight="bold" />
            </button>
            <p style={{ textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: '#6d7a77', margin: '0.75rem 0 0' }}>
              AI-generated · cached for 30 days after first load
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
