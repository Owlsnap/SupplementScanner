import React from "react";
import { Eye, MagnifyingGlass, FileText, Table, Package, Info } from "@phosphor-icons/react";

export default function AIExtractionGuide(): JSX.Element {
  const searchAreas = [
    {
      icon: <FileText size={18} color="#00685f" />,
      title: "Beskrivning or Produktbeskrivning (Description)",
      description: "Detailed ingredient breakdowns and supplement facts",
      examples: ["Innehåll per kapsel: Magnesium bisglycinat 400mg", "Aktiva ingredienser per portion"]
    },
    {
      icon: <Table size={18} color="#00685f" />,
      title: "Supplement Facts Tables",
      description: "Structured tables with dosage information",
      examples: ["Per kapsel: 500mg", "Per portion: 25g protein", "Näringsvärden per dos"]
    },
    {
      icon: <Package size={18} color="#00685f" />,
      title: "Product Summary Boxes",
      description: "Quick facts and key product details",
      examples: ["120 kapslar", "2000 IE D3", "Vassleprotein Isolat"]
    },
    {
      icon: <MagnifyingGlass size={18} color="#00685f" />,
      title: "Headers & Titles",
      description: "Product names and dosage in titles",
      examples: ["Magnesium Kelat 400mg", "D-vitamin 2000 IE", "Protein Isolat 90%"]
    }
  ];

  const supplementTerms = {
    "Ingredients": [
      "Magnesium: bisglycinat, kelat, citrat, oxid, malat",
      "Protein: vassleprotein, isolat, koncentrat, kasein",
      "Vitamin D: kolekalciferol, D-vitamin, D3",
      "Omega-3: fiskolja, triglycerid, etylester",
      "Creatine: kreatin, monohydrat"
    ],
    "Units": [
      "mg = milligram",
      "mcg/µg = mikrogram",
      "IE = Internationella enheter (IU)",
      "kapslar = capsules",
      "tabletter = tablets",
      "portioner = servings"
    ],
    "Dosage Phrases": [
      "Per kapsel = per capsule",
      "Per portion = per serving",
      "Daglig dos = daily dose",
      "Rekommenderad dos = recommended dose",
      "Innehåll per dos = content per dose"
    ]
  };

  return (
    <div>
      {/* Search Areas */}
      <div style={{
        background: 'var(--bg-surface)', borderRadius: '16px',
        border: '1.5px solid var(--border)', padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1.25rem',
      }}>
        <h3 style={{
          fontFamily: "'Manrope', sans-serif", fontWeight: 800,
          fontSize: '1.125rem', color: 'var(--text-primary)',
          margin: '0 0 0.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Eye size={18} color="#00685f" />
          Priority Search Areas
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.25rem', fontFamily: "'Inter', sans-serif" }}>
          How our AI finds supplement data on supplement websites
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {searchAreas.map((area, index) => (
            <div key={index} style={{
              background: 'var(--bg-page)', border: '1.5px solid var(--border)',
              borderRadius: '12px', padding: '1.125rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                {area.icon}
                <h5 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif" }}>
                  {area.title}
                </h5>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '0.75rem', lineHeight: '1.5', fontFamily: "'Inter', sans-serif" }}>
                {area.description}
              </p>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem', fontFamily: "'Inter', sans-serif" }}>
                  Examples:
                </div>
                {area.examples.map((example, idx) => (
                  <div key={idx} style={{
                    color: '#00685f', fontSize: '0.75rem', marginBottom: '0.25rem',
                    fontFamily: 'monospace',
                    background: 'var(--primary-light)', padding: '0.2rem 0.5rem',
                    borderRadius: '6px', display: 'inline-block', marginRight: '0.25rem',
                  }}>
                    "{example}"
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supplement Terms */}
      <div style={{
        background: 'var(--bg-surface)', borderRadius: '16px',
        border: '1.5px solid var(--border)', padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1.25rem',
      }}>
        <h3 style={{
          fontFamily: "'Manrope', sans-serif", fontWeight: 800,
          fontSize: '1.125rem', color: 'var(--text-primary)',
          margin: '0 0 1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Info size={18} color="#00685f" />
          Supplement Terms (Swedish → English)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {Object.entries(supplementTerms).map(([category, terms]) => (
            <div key={category} style={{
              background: 'var(--bg-page)', border: '1.5px solid var(--border)',
              borderRadius: '12px', padding: '1rem',
            }}>
              <h5 style={{ margin: '0 0 0.75rem', color: '#00685f', fontSize: '0.875rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif" }}>
                {category}
              </h5>
              {terms.map((term, idx) => (
                <div key={idx} style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.375rem', lineHeight: '1.4', fontFamily: "'Inter', sans-serif" }}>
                  {term}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div style={{
        background: 'var(--card-warning-bg)', border: '1px solid var(--card-warning-border)',
        borderRadius: '16px', padding: '1.25rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <h5 style={{ color: 'var(--card-warning-heading)', fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.75rem', fontFamily: "'Manrope', sans-serif" }}>
          💡 Tips for Best Results
        </h5>
        <ul style={{ color: 'var(--card-warning-text)', fontSize: '0.875rem', lineHeight: '1.7', margin: 0, paddingLeft: '1.25rem', fontFamily: "'Inter', sans-serif" }}>
          <li>Use URLs from major Swedish supplement stores (Proteinbolaget, Gymgrossisten, etc.)</li>
          <li>Make sure the page has loaded completely before AI extraction</li>
          <li>Products with detailed "Beskrivning" sections work best</li>
          <li>AI works better with structured supplement fact tables</li>
          <li>Single-ingredient supplements are easier to analyze than complex blends</li>
        </ul>
      </div>
    </div>
  );
}
