import React, { useState } from 'react';
import { MagnifyingGlass, ArrowRight, Barbell, Moon, Brain, Lightning, Leaf } from '@phosphor-icons/react';
import {
  encyclopediaSupplements,
  encyclopediaCategories,
  type EvidenceTier,
  type EncyclopediaCategory,
} from '../data/encyclopediaData';

interface EncyclopediaPageProps {
  onOpenInfo: (slug: string) => void;
}

const evidenceTierStyle: Record<EvidenceTier, React.CSSProperties> = {
  Strong:    { background: '#00685f', color: '#ffffff', border: '1px solid #00685f' },
  Moderate:  { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd' },
  Emerging:  { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' },
  Anecdotal: { background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' },
};

type CategoryConfig = { Icon: React.ElementType; bg: string; light: string };
const categoryConfig: Record<EncyclopediaCategory, CategoryConfig> = {
  Performance: { Icon: Barbell,   bg: '#00685f', light: '#e6f4f1' },
  Sleep:       { Icon: Moon,      bg: '#6366f1', light: '#eef2ff' },
  Nootropics:  { Icon: Brain,     bg: '#0891b2', light: '#e0f2fe' },
  Recovery:    { Icon: Lightning, bg: '#ea580c', light: '#fff7ed' },
  Health:      { Icon: Leaf,      bg: '#16a34a', light: '#f0fdf4' },
};

// Display order for category sections
const categoryOrder: EncyclopediaCategory[] = ['Performance', 'Recovery', 'Sleep', 'Nootropics', 'Health'];

export default function EncyclopediaPage({ onOpenInfo }: EncyclopediaPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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
    <div style={{ background: '#f5faf8', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Hero section — top padding accounts for fixed navbar */}
      <div style={{
        background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
        padding: 'calc(68px + 2.5rem) 1.5rem 0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-3rem', top: '-3rem', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '-1rem', bottom: '-2rem', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
            Supplement Encyclopedia
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: '1rem',
            color: 'rgba(255,255,255,0.8)', margin: '0 0 1.75rem',
            fontWeight: 400, maxWidth: '460px', lineHeight: 1.6,
          }}>
            Mechanisms, dosing &amp; AI deep dives — all in one place
          </p>

          {/* Search bar — white bg so text is readable */}
          <div style={{ position: 'relative', maxWidth: '480px', marginBottom: '1.5rem' }}>
            <MagnifyingGlass size={17} color="#6d7a77" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search supplements…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.8125rem 1rem 0.8125rem 2.75rem',
                borderRadius: '28px', border: '1.5px solid rgba(255,255,255,0.3)',
                background: '#ffffff',
                fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem',
                color: '#171d1c', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.15s ease',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#00685f'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
            />
          </div>

          {/* Category filter pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingBottom: '1.5rem' }}>
            {encyclopediaCategories.map(cat => {
              const isActive = activeCategory === cat;
              const cfg = cat !== 'All' ? categoryConfig[cat as EncyclopediaCategory] : null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.4375rem 1rem', borderRadius: '999px',
                    border: isActive ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px solid rgba(255,255,255,0.2)',
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    color: '#ffffff', fontFamily: "'Inter', sans-serif",
                    fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cfg && <cfg.Icon size={13} />}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <MagnifyingGlass size={40} color="#bcc9c6" style={{ marginBottom: '1rem' }} />
            <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#3d4947', margin: '0 0 0.5rem' }}>
              No supplements found
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem', color: '#6d7a77', margin: 0 }}>
              Try a different search or category
            </p>
          </div>
        ) : isFiltered ? (
          /* Flat grid when searching/filtering */
          <>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: '#6d7a77', marginBottom: '1.25rem' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
              {searchQuery ? ` for "${searchQuery}"` : ''}
            </p>
            <CardGrid items={filtered} hoveredCard={hoveredCard} setHoveredCard={setHoveredCard} onOpenInfo={onOpenInfo} />
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
                        fontSize: '1.125rem', color: '#171d1c',
                        margin: 0, letterSpacing: '-0.3px',
                      }}>
                        {cat}
                      </h2>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: '#6d7a77', margin: 0 }}>
                        {items.length} supplement{items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {/* Divider */}
                  <div style={{ height: '1px', background: `linear-gradient(to right, ${cfg.bg}40, transparent)`, marginBottom: '1.25rem' }} />
                  <CardGrid items={items} hoveredCard={hoveredCard} setHoveredCard={setHoveredCard} onOpenInfo={onOpenInfo} />
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
function CardGrid({ items, hoveredCard, setHoveredCard, onOpenInfo }: {
  items: ReturnType<typeof encyclopediaSupplements.filter>;
  hoveredCard: string | null;
  setHoveredCard: (s: string | null) => void;
  onOpenInfo: (slug: string) => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '1rem',
    }}>
      {items.map(supp => {
        const cfg = categoryConfig[supp.category];
        const isHovered = hoveredCard === supp.slug;
        return (
          <button
            key={supp.slug}
            onClick={() => onOpenInfo(supp.slug)}
            onMouseEnter={() => setHoveredCard(supp.slug)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              background: '#ffffff', borderRadius: '16px',
              border: `1.5px solid ${isHovered ? cfg.bg : '#e4e9e7'}`,
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
              <span style={{
                ...evidenceTierStyle[supp.evidenceTier],
                borderRadius: '999px', padding: '0.125rem 0.5rem',
                fontSize: '0.6875rem', fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
              }}>
                {supp.evidenceTier}
              </span>
            </div>

            {/* Card body */}
            <div style={{ padding: '1rem 1.125rem 1.125rem' }}>
              <div style={{
                fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                fontSize: '0.9375rem', color: '#171d1c',
                letterSpacing: '-0.3px', marginBottom: '0.375rem', lineHeight: 1.3,
              }}>
                {supp.name}
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem',
                color: '#6d7a77', lineHeight: 1.55, marginBottom: '0.875rem',
              }}>
                {supp.tagline}
              </div>

              {/* CTA row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: '0.75rem',
                borderTop: `1px solid ${isHovered ? cfg.bg + '30' : '#f0f4f3'}`,
                transition: 'border-color 0.18s ease',
              }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem',
                  fontWeight: 600, color: cfg.bg,
                }}>
                  View details
                </span>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '999px',
                  background: cfg.light, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <ArrowRight size={13} color={cfg.bg} weight="bold" />
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
