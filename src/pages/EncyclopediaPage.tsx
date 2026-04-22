import React, { useState } from 'react';
import { MagnifyingGlass, ArrowRight, Barbell, Moon, Brain, Lightning, Leaf, Robot, X, Plus, Check } from '@phosphor-icons/react';
import {
  encyclopediaSupplements,
  encyclopediaCategories,
  type EvidenceTier,
  type EncyclopediaCategory,
} from '../data/encyclopediaData';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useStack } from '../contexts/StackContext';

interface EncyclopediaPageProps {
  onOpenInfo: (slug: string) => void;
}

const evidenceTierStyle: Record<EvidenceTier, React.CSSProperties> = {
  Strong:    { background: '#00685f', color: '#ffffff', border: '1px solid #00685f' },
  Moderate:  { background: 'var(--card-info-bg)', color: 'var(--card-info-heading)', border: '1px solid var(--card-info-border)' },
  Emerging:  { background: 'var(--card-warning-bg)', color: 'var(--card-warning-heading)', border: '1px solid var(--card-warning-border)' },
  Anecdotal: { background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
};

type CategoryConfig = { Icon: React.ElementType; bg: string; light: string };
const categoryConfigLight: Record<EncyclopediaCategory, CategoryConfig> = {
  Performance: { Icon: Barbell,   bg: '#00685f', light: '#e6f4f1' },
  Sleep:       { Icon: Moon,      bg: '#6366f1', light: '#eef2ff' },
  Nootropics:  { Icon: Brain,     bg: '#0891b2', light: '#e0f2fe' },
  Recovery:    { Icon: Lightning, bg: '#ea580c', light: '#fff7ed' },
  Health:      { Icon: Leaf,      bg: '#16a34a', light: '#f0fdf4' },
};
const categoryConfigDark: Record<EncyclopediaCategory, CategoryConfig> = {
  Performance: { Icon: Barbell,   bg: '#14b8a6', light: '#0d2e2a' },
  Sleep:       { Icon: Moon,      bg: '#818cf8', light: '#150d2a' },
  Nootropics:  { Icon: Brain,     bg: '#22d3ee', light: '#0d1f3a' },
  Recovery:    { Icon: Lightning, bg: '#fb923c', light: '#1f0e00' },
  Health:      { Icon: Leaf,      bg: '#4ade80', light: '#071c12' },
};

// Display order for category sections
const categoryOrder: EncyclopediaCategory[] = ['Performance', 'Recovery', 'Sleep', 'Nootropics', 'Health'];

export default function EncyclopediaPage({ onOpenInfo }: EncyclopediaPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [showAiDisclaimer, setShowAiDisclaimer] = useState(false);
  const { isDark } = useDarkMode();
  const categoryConfig = isDark ? categoryConfigDark : categoryConfigLight;
  const { inStack, addToStack, removeFromStack } = useStack();
  const onToggleStack = (slug: string) => {
    if (inStack(slug)) removeFromStack(slug);
    else addToStack(slug);
  };

  const filtered = encyclopediaSupplements.filter(s => {
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (s.name + s.tagline + s.primaryUse + s.category).toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // For grouped view: build sections
  const isFiltered = activeCategory !== 'All' || searchQuery.trim() !== '';
  const sections = categoryOrder
    .map(cat => ({ cat, items: filtered.filter(s => s.category === cat) }))
    .filter(s => s.items.length > 0);

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Hero section — top padding accounts for fixed navbar */}
      <div style={{
        background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
        padding: 'calc(100px + 5rem) 1.5rem 5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-3rem', top: '-3rem', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '-1rem', bottom: '-2rem', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <img
          src="/supplement-scanner-logo-notext.svg"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', right: '-4rem', bottom: '-3rem',
            width: '700px', height: 'auto',
            opacity: 0.35,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />

        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            background: 'rgba(255,255,255,0.15)', borderRadius: '999px',
            padding: '0.3125rem 0.875rem', marginBottom: '1rem',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontFamily: "'Inter', sans-serif", letterSpacing: '0.4px' }}>
              {encyclopediaSupplements.length} supplements · Evidence-based
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#ffffff',
            margin: '0 0 0.625rem', letterSpacing: '-0.5px', lineHeight: 1.15,
          }}>
            Supplement <span style={{ color: '#fde68a' }}>Index</span>
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: '1rem',
            color: 'rgba(255,255,255,0.8)', margin: '0 auto 1.75rem',
            fontWeight: 400, maxWidth: '460px', lineHeight: 1.6,
          }}>
            Mechanisms, dosing &amp; AI deep dives — all in one place
          </p>

          {/* Search bar — white bg so text is readable */}
          <div style={{ position: 'relative', maxWidth: '480px', marginBottom: '1.5rem', margin: '0 auto 1.5rem' }}>
            <MagnifyingGlass size={17} color="#6d7a77" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search supplements…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.8125rem 1rem 0.8125rem 2.75rem',
                borderRadius: '28px', border: '1.5px solid rgba(255,255,255,0.3)',
                background: 'var(--bg-surface)',
                fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem',
                color: 'var(--text-primary)', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.15s ease',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#00685f'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
            />
          </div>

          {/* Category filter pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingBottom: '1.5rem', justifyContent: 'center' }}>
            {encyclopediaCategories.map(cat => {
              const isActive = activeCategory === cat;
              const cfg = cat !== 'All' ? categoryConfig[cat as EncyclopediaCategory] : null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  onMouseEnter={() => setHoveredCategory(cat)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.4375rem 1rem', borderRadius: '999px',
                    border: isActive ? '1.5px solid rgba(255,255,255,0.5)' : hoveredCategory === cat ? '1.5px solid rgba(255,255,255,0.4)' : '1.5px solid rgba(255,255,255,0.2)',
                    background: isActive ? 'rgba(255,255,255,0.25)' : hoveredCategory === cat ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                    color: '#ffffff', fontFamily: "'Inter', sans-serif",
                    fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    transform: hoveredCategory === cat && !isActive ? 'translateY(-1px)' : 'none',
                  }}
                >
                  {cfg && <cfg.Icon size={13} />}
                  {cat}
                </button>
              );
            })}
          </div>

        </div>

        {/* AI disclosure — absolute to hero, centered at bottom */}
        <div style={{ position: 'absolute', bottom: '1rem', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif", letterSpacing: '0.2px' }}>
              Research-backed · Not medical advice
            </span>
            <button
              onClick={() => setShowAiDisclaimer(v => !v)}
              style={{
                width: '20px', height: '20px', borderRadius: '999px',
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#ffffff', fontSize: '0.6875rem', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Inter', sans-serif", flexShrink: 0,
                transition: 'background 0.15s ease',
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
                <p style={{
                  margin: 0, fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.55,
                }}>
                  Content is grounded in peer-reviewed research and cited sources.
                  It is <strong style={{ color: 'var(--text-primary)' }}>not medical advice</strong> and does not replace guidance from a qualified healthcare professional.
                  Consult a doctor before changing your supplement regimen.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <MagnifyingGlass size={40} color="#bcc9c6" style={{ marginBottom: '1rem' }} />
            <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
              No supplements found
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: 0 }}>
              Try a different search or category
            </p>
          </div>
        ) : isFiltered ? (
          /* Flat grid when searching/filtering */
          <>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
              {searchQuery ? ` for "${searchQuery}"` : ''}
            </p>
            <CardGrid items={filtered} hoveredCard={hoveredCard} setHoveredCard={setHoveredCard} onOpenInfo={onOpenInfo} inStack={inStack} onToggleStack={onToggleStack} />
          </>
        ) : (
          /* Grouped by category */
          <>
            {sections.map(({ cat, items }, idx) => {
              const cfg = categoryConfig[cat];
              return (
                <div key={cat} style={{ marginBottom: idx < sections.length - 1 ? '3rem' : 0 }}>
                  {/* Section header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: cfg.bg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                    }}>
                      <cfg.Icon size={20} color="#ffffff" weight="bold" />
                    </div>
                    <div>
                      <h2 style={{
                        fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                        fontSize: '1.125rem', color: 'var(--text-primary)',
                        margin: 0, letterSpacing: '-0.3px',
                      }}>
                        {cat}
                      </h2>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {items.length} supplement{items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {/* Divider */}
                  <div style={{ height: '1px', background: `linear-gradient(to right, ${cfg.bg}40, transparent)`, marginBottom: '1.25rem' }} />
                  <CardGrid items={items} hoveredCard={hoveredCard} setHoveredCard={setHoveredCard} onOpenInfo={onOpenInfo} inStack={inStack} onToggleStack={onToggleStack} />
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// Extracted card grid component for reuse
function CardGrid({ items, hoveredCard, setHoveredCard, onOpenInfo, inStack, onToggleStack }: {
  items: ReturnType<typeof encyclopediaSupplements.filter>;
  hoveredCard: string | null;
  setHoveredCard: (s: string | null) => void;
  onOpenInfo: (slug: string) => void;
  inStack: (slug: string) => boolean;
  onToggleStack: (slug: string) => void;
}) {
  const { isDark } = useDarkMode();
  const categoryConfig = isDark ? categoryConfigDark : categoryConfigLight;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '1rem',
    }}>
      {items.map(supp => {
        const cfg = categoryConfig[supp.category];
        const isHovered = hoveredCard === supp.slug;
        const added = inStack(supp.slug);
        return (
          <div
            key={supp.slug}
            onClick={() => onOpenInfo(supp.slug)}
            onMouseEnter={() => setHoveredCard(supp.slug)}
            onMouseLeave={() => setHoveredCard(null)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenInfo(supp.slug); } }}
            style={{
              background: 'var(--bg-surface)', borderRadius: '16px',
              border: `1.5px solid ${isHovered ? cfg.bg : 'var(--border)'}`,
              boxShadow: isHovered ? `0 6px 20px ${cfg.bg}22` : '0 1px 4px rgba(0,0,0,0.06)',
              padding: 0, cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.18s ease',
              transform: isHovered ? 'translateY(-3px)' : 'none',
              overflow: 'hidden',
            }}
          >
            {/* Colored category bar */}
            <div style={{
              background: cfg.bg, padding: '0.75rem 1.125rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.2)', borderRadius: '8px',
                  padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <cfg.Icon size={16} color="#ffffff" weight="bold" />
                </div>
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 600,
                  fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)',
                  textTransform: 'uppercase', letterSpacing: '0.6px',
                }}>
                  {supp.category}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 500,
                  color: 'rgba(255,255,255,0.65)',
                  fontFamily: "'Inter', sans-serif",
                  textTransform: 'uppercase', letterSpacing: '0.4px',
                }}>
                  Evidence level
                </span>
                <span style={{
                  ...evidenceTierStyle[supp.evidenceTier],
                  borderRadius: '999px', padding: '0.125rem 0.5rem',
                  fontSize: '0.6875rem', fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {supp.evidenceTier}
                </span>
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '1rem 1.125rem 1.125rem' }}>
              <div style={{
                fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                fontSize: '0.9375rem', color: 'var(--text-primary)',
                letterSpacing: '-0.3px', marginBottom: '0.375rem', lineHeight: 1.3,
              }}>
                {supp.name}
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem',
                color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '0.875rem',
              }}>
                {supp.tagline}
              </div>

              {/* CTA row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: '0.75rem',
                borderTop: `1px solid ${isHovered ? cfg.bg + '30' : 'var(--border-subtle)'}`,
                transition: 'border-color 0.18s ease',
              }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem',
                  fontWeight: 600, color: cfg.bg,
                }}>
                  View details
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <button
                    onClick={e => { e.stopPropagation(); onToggleStack(supp.slug); }}
                    title={added ? 'Remove from stack' : 'Add to stack'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.25rem 0.625rem', borderRadius: '999px',
                      border: added ? 'none' : `1.5px dashed ${cfg.bg}`,
                      background: added ? '#00685f' : 'transparent',
                      color: added ? '#ffffff' : cfg.bg,
                      cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                      fontWeight: 600, fontSize: '0.6875rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {added
                      ? <><Check size={11} weight="bold" /> Added</>
                      : <><Plus size={11} weight="bold" /> Stack</>
                    }
                  </button>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '999px',
                    background: cfg.light, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ArrowRight size={13} color={cfg.bg} weight="bold" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
