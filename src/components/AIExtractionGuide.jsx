import { Eye, Search, FileText, Table, Package, Info } from "lucide-react";

export default function AIExtractionGuide() {
  const searchAreas = [
    {
      icon: <FileText size={20} />,
      title: "Beskrivning or Produktbeskrivning (Description)",
      description: "Detailed ingredient breakdowns and supplement facts",
      examples: ["Innehåll per kapsel: Magnesium bisglycinat 400mg", "Aktiva ingredienser per portion"]
    },
    {
      icon: <Table size={20} />,
      title: "Supplement Facts Tables", 
      description: "Structured tables with dosage information",
      examples: ["Per kapsel: 500mg", "Per portion: 25g protein", "Näringsvärden per dos"]
    },
    {
      icon: <Package size={20} />,
      title: "Product Summary Boxes",
      description: "Quick facts and key product details", 
      examples: ["120 kapslar", "2000 IE D3", "Vassleprotein Isolat"]
    },
    {
      icon: <Search size={20} />,
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
    <div style={{
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      padding: '2rem',
      border: '1px solid rgba(56, 243, 171, 0.1)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      marginBottom: '2rem'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Eye size={24} style={{ color: '#38f3ab' }} />
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#38f3ab'
            }}>
              AI Extraction Guide
            </h3>
            <p style={{ 
              margin: 0,
              color: '#94a3b8', 
              fontSize: '1rem' 
            }}>
              How our AI finds supplement data on Supplement websites
            </p>
          </div>
        </div>
      </div>

      {/* Search Areas */}
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ 
          color: '#f1f5f9', 
          fontSize: '1.25rem', 
          fontWeight: '600',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Search size={20} />
          Priority Search Areas
        </h4>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)', 
          gap: '1rem' 
        }}>
          {searchAreas.map((area, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                <div style={{ color: '#38f3ab' }}>
                  {area.icon}
                </div>
                <h5 style={{
                  margin: 0,
                  color: '#f1f5f9',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>
                  {area.title}
                </h5>
              </div>
              
              <p style={{
                color: '#cbd5e1',
                fontSize: '0.875rem',
                marginBottom: '1rem',
                lineHeight: '1.5'
              }}>
                {area.description}
              </p>
              
              <div>
                <div style={{
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  Examples:
                </div>
                {area.examples.map((example, idx) => (
                  <div
                    key={idx}
                    style={{
                      color: '#38f3ab',
                      fontSize: '0.75rem',
                      marginBottom: '0.25rem',
                      fontFamily: 'monospace',
                      background: 'rgba(56, 243, 171, 0.1)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px'
                    }}
                  >
                    "{example}"
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supplement Terms */}
      <div>
        <h4 style={{ 
          color: '#f1f5f9', 
          fontSize: '1.25rem', 
          fontWeight: '600',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Info size={20} />
          Supplement Terms
        </h4>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', 
          gap: '1rem' 
        }}>
          {Object.entries(supplementTerms).map(([category, terms]) => (
            <div
              key={category}
              style={{
                background: 'rgba(102, 126, 234, 0.1)',
                border: '1px solid rgba(102, 126, 234, 0.2)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}
            >
              <h5 style={{
                margin: 0,
                color: '#667eea',
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                {category}
              </h5>
              
              {terms.map((term, idx) => (
                <div
                  key={idx}
                  style={{
                    color: '#cbd5e1',
                    fontSize: '0.75rem',
                    marginBottom: '0.5rem',
                    lineHeight: '1.4'
                  }}
                >
                  {term}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div style={{
        background: 'rgba(249, 115, 22, 0.1)',
        border: '1px solid rgba(249, 115, 22, 0.2)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginTop: '2rem'
      }}>
        <h5 style={{
          color: '#f97316',
          fontSize: '1rem',
          fontWeight: '600',
          marginBottom: '1rem'
        }}>
          💡 Tips for Best Results
        </h5>
        
        <ul style={{
          color: '#cbd5e1',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          margin: 0,
          paddingLeft: '1.5rem'
        }}>
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