import React, { useState, useEffect } from "react";
import { Target } from "@phosphor-icons/react";
import SupplementRecommendations from '../components/SupplementRecommendations';
import type { Product } from '../types/index.js';

interface RecommendationsPageProps {
  products?: Product[];
}

export default function RecommendationsPage({ products = [] }: RecommendationsPageProps): JSX.Element {
  const [analyzedSupplements, setAnalyzedSupplements] = useState<Record<string, Product[]>>({});

  useEffect(() => {
    const validProducts = products.filter(p => p.name && p.quantity);
    if (validProducts.length > 0) {
      const grouped: Record<string, Product[]> = {};
      validProducts.forEach(p => {
        const key = p.activeIngredient || p.name || 'other';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
      });
      setAnalyzedSupplements(grouped);
    } else {
      setAnalyzedSupplements({});
    }
  }, [products]);

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      {/* Page hero */}
      <div style={{
        background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
        padding: 'calc(100px + 3.5rem) 1.5rem 3.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-2rem', top: '-2rem', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <h2 style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            color: '#ffffff',
            margin: '0 0 0.625rem',
            letterSpacing: '-0.5px',
            lineHeight: 1.15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.625rem',
          }}>
            <Target size={28} />
            Goals & Recommendations
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', margin: 0, fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
            Discover the best supplements for your health goals
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.75rem 1.5rem 4rem', boxSizing: 'border-box' }}>
        <SupplementRecommendations analyzedProducts={analyzedSupplements} />
      </div>
    </div>
  );
}
