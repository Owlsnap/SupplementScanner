import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Moon, Barbell, Leaf, Lightning, Brain,
  ArrowRight, Clock, Books, Flask, Medal, Atom,
} from '@phosphor-icons/react';
import { encyclopediaSupplements } from '../data/encyclopediaData';
import type { EvidenceTier, EncyclopediaCategory } from '../data/encyclopediaData';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLanguage } from '../contexts/LanguageContext';

// ── Data ──────────────────────────────────────────────────────────────────────

interface GoalSupplement { slug: string; why: string }
interface GoalDef {
  key: string; label: string;
  Icon: React.ElementType;
  intro: string;
  supplements: GoalSupplement[];
}

const GOALS: GoalDef[] = [
  {
    key: 'sleep', label: 'Better Sleep', Icon: Moon,
    intro: 'Good sleep is the foundation of every other health goal. Before stacking supplements, address the basics: consistent wake time, a dark cool room, and no screens 30 minutes before bed.',
    supplements: [
      { slug: 'magnesium-glycinate', why: 'Relaxes muscles and supports GABA — the calm-down neurotransmitter — for deeper, less interrupted sleep. The highest-impact foundational sleep supplement.' },
      { slug: 'l-theanine',         why: 'Promotes relaxing alpha brain waves without sedation, quieting mental chatter without morning grogginess.' },
      { slug: 'ashwagandha',        why: 'Chronically lowers cortisol over weeks of use — most useful when a racing mind or daily stress is the primary sleep disruptor.' },
      { slug: 'glycine',            why: 'Lowers core body temperature and improves sleep architecture — research-backed for improving sleep quality and morning freshness.' },
      { slug: 'melatonin',          why: 'Resets the circadian rhythm. Most effective for jet lag or shift work; less so for garden-variety insomnia. Start at 0.5mg.' },
    ],
  },
  {
    key: 'muscle', label: 'Build Muscle', Icon: Barbell,
    intro: 'Supplements accelerate gains — but only on a foundation of adequate protein (1.6–2.2 g/kg), progressive overload, and 7–9 h sleep. Get those right first.',
    supplements: [
      { slug: 'creatine-monohydrate', why: 'The single best return-on-investment supplement for strength. Refuels ATP during explosive sets and accelerates protein synthesis over time.' },
      { slug: 'caffeine',             why: 'Reduces perceived effort so you train harder and longer — directly increasing total training volume, the key driver of hypertrophy.' },
      { slug: 'citrulline-malate',    why: 'Increases blood flow and reduces ammonia buildup, improving endurance in high-rep sets and cutting next-day soreness by up to 40%.' },
      { slug: 'beta-alanine',         why: 'Builds carnosine over weeks to buffer muscle acid in sustained high-rep efforts — lets you squeeze more reps at the edge of failure.' },
      { slug: 'hmb',                  why: 'Reduces muscle protein breakdown during a caloric deficit or detraining. Most useful for beginners and those cutting aggressively.' },
    ],
  },
  {
    key: 'health', label: 'General Health', Icon: Leaf,
    intro: 'A short, evidence-led list covers most nutritional gaps from a modern diet. Whole foods come first — but these fill in what diet alone commonly misses, especially at northern latitudes.',
    supplements: [
      { slug: 'vitamin-d3-k2',   why: 'The most common deficiency in northern climates. D3 supports immunity, mood, and bone density; K2 steers calcium to bones, not arteries.' },
      { slug: 'omega-3',         why: 'EPA and DHA reduce systemic inflammation and support heart, brain, and joint health. Most people eating a Western diet are chronically deficient.' },
      { slug: 'magnesium-glycinate', why: 'Involved in 300+ enzymatic reactions. Most adults fall short through diet alone, affecting sleep, energy, and muscle function.' },
      { slug: 'probiotics',      why: 'Restores gut microbiome diversity, supporting immunity, digestion, and mood via the gut–brain axis.' },
      { slug: 'zinc-bisglycinate', why: 'Critical for testosterone synthesis, immune response, and wound healing — commonly depleted in athletes who sweat heavily.' },
    ],
  },
  {
    key: 'energy', label: 'Energy & Focus', Icon: Lightning,
    intro: 'Low energy is almost always a lifestyle problem first — poor sleep, chronic stress, or nutrient deficiency. Fix those root causes before adding stimulants.',
    supplements: [
      { slug: 'caffeine',       why: 'Blocks adenosine to reduce fatigue and sharpen focus — the most evidence-backed acute cognitive enhancer available.' },
      { slug: 'rhodiola-rosea', why: 'An adaptogen that blunts the physiological stress response, reducing burnout-type fatigue without any stimulant effect.' },
      { slug: 'alpha-gpc',      why: 'Raises acetylcholine — the learning neurotransmitter — improving working memory, focus, and reaction time within hours.' },
      { slug: 'panax-ginseng',  why: 'Combines mild anti-fatigue effects with cognitive support. Most effective for sustained mental performance under stress.' },
      { slug: 'coq10',          why: 'Directly fuels mitochondrial ATP production. Most valuable if you are over 40 or on statins, which deplete CoQ10 levels significantly.' },
    ],
  },
  {
    key: 'cognition', label: 'Brain & Cognition', Icon: Brain,
    intro: 'Sleep is the number-one nootropic. Aerobic exercise (BDNF) and stress management come next. Supplements then optimize on top of that foundation.',
    supplements: [
      { slug: 'lions-mane',         why: 'Stimulates Nerve Growth Factor (NGF) synthesis, supporting neuron repair and potentially new synapse formation with consistent use.' },
      { slug: 'bacopa-monnieri',    why: 'Builds over 8–12 weeks to meaningfully improve memory consolidation and reduce anxiety — one of the best-studied cognitive enhancers.' },
      { slug: 'alpha-gpc',          why: 'Rapidly raises acetylcholine, improving attention, learning speed, and reaction time in both healthy adults and older populations.' },
      { slug: 'phosphatidylserine', why: 'Maintains neuron membrane fluidity. Strongest evidence for slowing age-related cognitive decline and supporting memory recall.' },
      { slug: 'rhodiola-rosea',     why: 'Reduces mental fatigue under sustained cognitive load — helps maintain accuracy and decision quality under pressure.' },
    ],
  },
];

const categoryIcon: Record<EncyclopediaCategory, React.ElementType> = {
  Performance: Barbell, Sleep: Moon, Nootropics: Brain, Recovery: Lightning, Health: Leaf,
};

const evidenceTierStyle: Record<EvidenceTier, { color: string }> = {
  Strong:    { color: '#4ade80' },
  Moderate:  { color: '#60a5fa' },
  Emerging:  { color: '#fb923c' },
  Anecdotal: { color: '#c084fc' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecommendationsPage(): JSX.Element {
  const [selectedGoal, setSelectedGoal] = useState<string>('sleep');
  const navigate = useNavigate();
  const { isDark } = useDarkMode();
  const { t } = useLanguage();

  const goal = GOALS.find(g => g.key === selectedGoal) ?? GOALS[0];

  const goalSupplements = goal.supplements
    .map(gs => {
      const supp = encyclopediaSupplements.find(s => s.slug === gs.slug);
      return supp ? { ...supp, why: gs.why } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const [p1, p2, p3, p4, p5] = goalSupplements;

  // Adaptive colors for Stitch-inspired dark aesthetic
  const cardBg     = isDark ? '#1a2826' : 'var(--bg-surface)';
  const cardBorder = isDark ? 'rgba(43,63,59,0.6)' : 'var(--border)';
  const elevatedBg = isDark ? '#1e2f2c' : 'var(--bg-subtle)';
  const iconPanelBg = isDark ? '#111c1a' : '#e6f4f1';

  // Priority 01 badge — warm amber (Stitch tertiary)
  const p01BadgeBg    = isDark ? '#3d2012' : '#fff3e0';
  const p01BadgeColor = isDark ? '#f0bba3' : '#b45309';

  // Lower priority badge — neutral
  const pnBadgeBg    = isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f4';
  const pnBadgeColor = isDark ? '#8fa9a4' : '#6d7a77';

  function PriorityBadge({ index }: { index: number }) {
    const isFirst = index === 0;
    return (
      <span style={{
        background: isFirst ? p01BadgeBg : pnBadgeBg,
        color: isFirst ? p01BadgeColor : pnBadgeColor,
        fontSize: '0.5625rem', fontWeight: 900,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        padding: '0.2rem 0.5rem', borderRadius: '4px',
        fontFamily: "'Inter', sans-serif",
        display: 'inline-block',
      }}>
        PRIORITY {String(index + 1).padStart(2, '0')}
      </span>
    );
  }

  function SmallCard({ supp, index }: { supp: typeof p2; index: number }) {
    if (!supp) return null;
    const CatIcon = categoryIcon[supp.category] ?? Leaf;
    return (
      <div
        onClick={() => navigate(`/encyclopedia/${supp.slug}`)}
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '12px', padding: '2rem',
          cursor: 'pointer', transition: 'border-color 0.25s ease',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,104,95,0.5)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = cardBorder; }}
      >
        {/* Top: badge + icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <PriorityBadge index={index} />
          <div style={{
            width: '44px', height: '44px', borderRadius: '10px',
            background: elevatedBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CatIcon size={20} color="#00685f" weight="duotone" />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: '1.25rem', color: 'var(--text-primary)',
            margin: '0 0 0.625rem', lineHeight: 1.3, letterSpacing: '-0.3px',
          }}>
            {supp.name}
          </h3>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
            color: 'var(--text-secondary)', lineHeight: 1.65,
            margin: '0 0 1.5rem',
          }}>
            {supp.why}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: '1.25rem', borderTop: `1px solid ${cardBorder}`,
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: isDark ? 'rgba(226,237,234,0.35)' : 'var(--text-secondary)',
          }}>
            {supp.typicalDose}
          </span>
          <ArrowRight
            size={20} color="#00685f"
            style={{ transition: 'transform 0.2s ease' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <div style={{
        maxWidth: '1000px', margin: '0 auto',
        padding: 'calc(80px + 3.5rem) 1.5rem 5rem',
        boxSizing: 'border-box',
      }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '3.5rem' }}>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            color: 'var(--text-primary)', margin: '0 0 1rem',
            letterSpacing: '-1px', lineHeight: 1.1,
          }}>
            {t('recommendations.pageTitle')} <span style={{
              background: 'linear-gradient(135deg, #00685f 0%, #0284c7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{t('recommendations.pageTitleHighlight')}</span>
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: '1.0625rem',
            color: 'var(--text-secondary)', maxWidth: '560px',
            lineHeight: 1.7, margin: '0 auto',
          }}>
            {t(`recommendations.goals.${goal.key}.intro`)}
          </p>
        </div>

        {/* ── Category switcher ────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.625rem',
          marginBottom: '3.5rem',
          paddingBottom: '2rem',
          borderBottom: `1px solid ${cardBorder}`,
        }}>
          {GOALS.map(g => {
            const isActive = selectedGoal === g.key;
            return (
              <button
                key={g.key}
                onClick={() => setSelectedGoal(g.key)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: isActive ? '#00685f' : (isDark ? '#1e2f2c' : 'var(--bg-surface)'),
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontFamily: "'Manrope', sans-serif", fontWeight: 700,
                  fontSize: '0.9375rem', cursor: 'pointer',
                  transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                }}
              >
                {t(`recommendations.goals.${g.key}.label`)}
              </button>
            );
          })}
        </div>

        {/* ── Recommendations ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Priority 01 — large featured card */}
          {p1 && (() => {
            const P1Icon = categoryIcon[p1.category] ?? Leaf;
            const tierCol = evidenceTierStyle[p1.evidenceTier].color;
            return (
              <div
                onClick={() => navigate(`/encyclopedia/${p1.slug}`)}
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: '16px', overflow: 'hidden',
                  cursor: 'pointer', transition: 'border-color 0.3s ease',
                  display: 'flex', flexWrap: 'wrap',
                  minHeight: '360px',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,104,95,0.45)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = cardBorder; }}
              >
                {/* Left: content */}
                <div style={{
                  flex: '1 1 340px',
                  padding: 'clamp(2rem, 5vw, 3rem)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  {/* Badges row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <PriorityBadge index={0} />
                    <span style={{
                      color: tierCol, fontSize: '0.75rem', fontWeight: 700,
                      fontFamily: "'Manrope', sans-serif",
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {p1.evidenceTier} {t('recommendations.evidenceSuffix')}
                    </span>
                  </div>

                  <h2 style={{
                    fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                    fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)',
                    color: 'var(--text-primary)', margin: '0 0 1rem',
                    lineHeight: 1.2, letterSpacing: '-0.5px',
                  }}>
                    {p1.name}
                  </h2>

                  <p style={{
                    fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem',
                    color: 'var(--text-secondary)', lineHeight: 1.7,
                    margin: '0 0 2rem', maxWidth: '420px',
                  }}>
                    {p1.why}
                  </p>

                  {/* Stats row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      color: '#00685f', fontWeight: 700,
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      <Clock size={16} weight="fill" />
                      {p1.typicalDose}
                    </div>
                    <div style={{ width: '1px', height: '14px', background: cardBorder }} />
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      color: '#00685f', fontWeight: 700,
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      <Flask size={16} weight="fill" />
                      {t('recommendations.viewDeepDive')}
                    </div>
                  </div>
                </div>

                {/* Right: decorative visual panel */}
                <div style={{
                  flex: '0 0 260px',
                  background: iconPanelBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden', minHeight: '220px',
                }}>
                  {/* Radial glow */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle at center, rgba(0,104,95,0.35) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                  {/* Large icon */}
                  <P1Icon
                    size={100}
                    color="#00685f"
                    weight="thin"
                    style={{ position: 'relative', zIndex: 1, opacity: isDark ? 0.55 : 0.45 }}
                  />
                  {/* Evidence tier label */}
                  <div style={{
                    position: 'absolute', bottom: '1.25rem', left: 0, right: 0,
                    textAlign: 'center',
                    fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem',
                    fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em',
                    color: tierCol, opacity: 0.9,
                  }}>
                    {p1.evidenceTier} {t('recommendations.evidenceSuffix')}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* P2 + P3 grid */}
          {(p2 || p3) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {p2 && <SmallCard supp={p2} index={1} />}
              {p3 && <SmallCard supp={p3} index={2} />}
            </div>
          )}

          {/* P4 + P5 grid */}
          {(p4 || p5) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {p4 && <SmallCard supp={p4} index={3} />}
              {p5 && <SmallCard supp={p5} index={4} />}
            </div>
          )}
        </div>

        {/* ── Footer action ────────────────────────────────────────────────── */}
        <div style={{ marginTop: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(135deg, #00685f 0%, #005048 100%)',
              color: '#ffffff', border: 'none', borderRadius: '10px',
              padding: '1.125rem 3rem',
              fontFamily: "'Manrope', sans-serif", fontWeight: 800,
              fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em',
              cursor: 'pointer', width: '100%', maxWidth: '440px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
              boxShadow: '0 8px 32px rgba(0,104,95,0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(0,104,95,0.45)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,104,95,0.35)';
            }}
          >
            <Books size={18} />
            {t('recommendations.browseFullIndex')}
          </button>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--text-secondary)', opacity: 0.55, margin: 0,
          }}>
            {t('recommendations.footerNote')}
          </p>
        </div>

      </div>
    </div>
  );
}
