import { useState } from "react";
import { FlaskConical, Scale, TrendingUp, TrendingDown, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { ingredientQuality, compareIngredients, getIngredientQuality } from '../data/supplementData.js';

export default function IngredientQualityComparison({ analyzedProducts = {} }) {
  console.log('🔬 IngredientQualityComparison received analyzedProducts:', analyzedProducts);
  console.log('🔬 Available categories:', Object.keys(analyzedProducts));
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [comparisonResults, setComparisonResults] = useState(null);

  // Get available categories from analyzed products
  const availableCategories = Object.keys(analyzedProducts);
  
  // Available categories for manual comparison
  const allCategories = [
    { key: 'magnesium', label: '🧲 Magnesium', description: 'Essential mineral for muscle & nerve function' },
    { key: 'vitamin_d', label: '☀️ Vitamin D', description: 'Critical for immune system & bone health' },
    { key: 'protein', label: '🥩 Protein', description: 'Building blocks for muscle growth' },
    { key: 'omega_3', label: '🐟 Omega-3', description: 'Essential fatty acids for heart & brain' },
    { key: 'creatine', label: '💪 Creatine', description: 'Proven strength and muscle mass enhancer' },
    { key: 'amino_acids', label: '🔗 Amino Acids', description: 'Building blocks for protein synthesis' },
    { key: 'pre_workout', label: '⚡ Pre-Workout', description: 'Energy and performance boosters' }
  ];

  // Get products in the selected category
  const categoryProducts = selectedCategory ? (analyzedProducts[selectedCategory] || []) : [];
  
  // Get all unique ingredients in the category
  const categoryIngredients = categoryProducts
    .map(product => product.supplementInfo?.activeIngredient)
    .filter(Boolean)
    .filter((ingredient, index, self) => self.indexOf(ingredient) === index);

  const getQualityLabel = (score) => {
    if (score === null) return 'Individual Choice';
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const getQualityColor = (score) => {
    if (score === null) return '#8b5cf6'; // Purple for individual choice
    if (score >= 90) return '#22c55e'; // Green
    if (score >= 80) return '#84cc16'; // Light green
    if (score >= 70) return '#eab308'; // Yellow
    if (score >= 50) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const renderIngredientCard = (ingredientName) => {
    const quality = getIngredientQuality(ingredientName);
    if (!quality) return null;

    const matchingProducts = categoryProducts.filter(p => 
      p.supplementInfo?.activeIngredient === ingredientName
    );

    return (
      <div
        key={ingredientName}
        style={{
          background: 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: `2px solid ${getQualityColor(quality.score)}40`,
          padding: '1.5rem',
          marginBottom: '1rem',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Header with quality score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.25rem', 
              fontWeight: '700', 
              color: '#f1f5f9',
              textTransform: 'capitalize' 
            }}>
              {ingredientName}
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '0.875rem', 
              color: getQualityColor(quality.score),
              fontWeight: '600',
              marginTop: '0.25rem'
            }}>
              {getQualityLabel(quality.score)} Quality
            </p>
            {/* Show which products contain this ingredient */}
            {matchingProducts.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  Found in: {matchingProducts.map(p => `Product #${p.id}`).join(', ')}
                </span>
              </div>
            )}
          </div>
          
          {/* Quality Score Badge */}
          <div style={{
            background: `linear-gradient(135deg, ${getQualityColor(quality.score)}20 0%, ${getQualityColor(quality.score)}40 100%)`,
            border: `2px solid ${getQualityColor(quality.score)}`,
            borderRadius: '20px',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ 
              fontSize: quality.score === null ? '0.875rem' : '1.5rem', 
              fontWeight: 'bold', 
              color: getQualityColor(quality.score),
              textAlign: 'center'
            }}>
              {quality.score === null ? 'Individual\nChoice' : quality.score}
            </div>
            {quality.score !== null && (
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#94a3b8' 
              }}>
                /100
              </div>
            )}
          </div>
        </div>

        {/* Quality Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ 
            color: '#cbd5e1', 
            fontSize: '0.875rem', 
            lineHeight: '1.6',
            marginBottom: '1rem' 
          }}>
            {quality.description}
          </p>

          {/* Quality Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                Bioavailability
              </div>
              <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: '600' }}>
                {quality.bioavailability}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                Absorption
              </div>
              <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: '600' }}>
                {quality.absorption}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                Side Effects
              </div>
              <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: '600' }}>
                {quality.sideEffects}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Supplement Information */}
        {(() => {
          const getSupplementInfo = (ingredient) => {
            const supplementDB = {
              'magnesium bisglycinate': {
                generalUsage: 'Premium magnesium form used for muscle function, bone health, and energy production. Essential for over 300 enzymatic reactions.',
                dosage: '200-400mg daily with meals. Start with lower dose to assess tolerance.',
                warnings: 'This is a superior form with excellent bioavailability. Much better than magnesium oxide.',
                inferiorForms: ['Magnesium oxide (only 4% absorption)', 'Magnesium carbonate (poor bioavailability)']
              },
              'magnesium oxide': {
                generalUsage: 'Common but poorly absorbed form of magnesium found in cheap supplements.',
                dosage: 'NOT RECOMMENDED as primary magnesium source due to poor absorption.',
                warnings: '⚠️ AVOID: Only 4% bioavailability. Causes digestive issues. Choose bisglycinate instead.',
                inferiorForms: []
              },
              'vitamin d3': {
                generalUsage: 'Essential hormone-like vitamin for immune function, bone health, and mood regulation.',
                dosage: '1000-4000 IU daily with fat-containing meal for optimal absorption.',
                warnings: 'D3 (cholecalciferol) is superior to D2 (ergocalciferol). Monitor blood levels.',
                inferiorForms: ['Vitamin D2 (ergocalciferol) - less effective at raising blood levels']
              }
            };
            
            const key = ingredient?.toLowerCase();
            return supplementDB[key] || {
              generalUsage: 'General supplement information not available in our database.',
              dosage: 'Consult product label and healthcare provider for dosing guidance.',
              warnings: 'Research this ingredient thoroughly before use.',
              inferiorForms: []
            };
          };

          const suppInfo = getSupplementInfo(ingredientName);

          return (
            <>
              {/* General Usage */}
              <div style={{ 
                background: 'rgba(56, 243, 171, 0.1)',
                border: '1px solid rgba(56, 243, 171, 0.2)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <h5 style={{ 
                  color: '#38f3ab', 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📋 General Supplement Usage
                </h5>
                <p style={{ 
                  color: '#cbd5e1', 
                  fontSize: '0.875rem', 
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  {suppInfo.generalUsage}
                </p>
              </div>

              {/* Dosage Recommendations */}
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <h5 style={{ 
                  color: '#3b82f6', 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🎯 Dosage Recommendations
                </h5>
                <p style={{ 
                  color: '#cbd5e1', 
                  fontSize: '0.875rem', 
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  {suppInfo.dosage}
                </p>
              </div>

              {/* Warnings and Inferior Ingredients */}
              <div style={{ 
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h5 style={{ 
                  color: '#fbbf24', 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  ⚠️ Important Warnings
                </h5>
                <p style={{ 
                  color: '#cbd5e1', 
                  fontSize: '0.875rem', 
                  lineHeight: '1.6',
                  margin: 0,
                  marginBottom: suppInfo.inferiorForms.length > 0 ? '0.75rem' : 0
                }}>
                  {suppInfo.warnings}
                </p>
                
                {suppInfo.inferiorForms.length > 0 && (
                  <div>
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      🚫 AVOID these inferior forms:
                    </div>
                    {suppInfo.inferiorForms.map((form, idx) => (
                      <div key={idx} style={{ 
                        color: '#fca5a5', 
                        fontSize: '0.75rem', 
                        marginBottom: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444' }} />
                        {form}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        })()}
        {/* End Enhanced Supplement Information */}

        {/* Pre-workout Considerations (for ingredients without scores) */}
        {quality.score === null && quality.considerations && (
          <div style={{ 
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h5 style={{ 
              color: '#8b5cf6', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🤔 Individual Considerations
            </h5>
            <p style={{ 
              color: '#cbd5e1', 
              fontSize: '0.875rem', 
              lineHeight: '1.6',
              margin: 0
            }}>
              {quality.considerations}
            </p>
          </div>
        )}

        {/* Benefits and Drawbacks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Benefits */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '12px',
            padding: '1rem'
          }}>
            <h5 style={{ 
              color: '#22c55e', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle size={14} />
              Benefits
            </h5>
            {quality.benefits.map((benefit, idx) => (
              <div key={idx} style={{ 
                color: '#cbd5e1', 
                fontSize: '0.75rem', 
                marginBottom: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22c55e' }} />
                {benefit}
              </div>
            ))}
          </div>

          {/* Drawbacks */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '1rem'
          }}>
            <h5 style={{ 
              color: '#ef4444', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <XCircle size={14} />
              Drawbacks
            </h5>
            {quality.drawbacks.map((drawback, idx) => (
              <div key={idx} style={{ 
                color: '#cbd5e1', 
                fontSize: '0.75rem', 
                marginBottom: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444' }} />
                {drawback}
              </div>
            ))}
          </div>
        </div>

        {/* Matching Products */}
        {matchingProducts.length > 0 && (
          <div style={{
            background: 'rgba(56, 243, 171, 0.1)',
            border: '1px solid rgba(56, 243, 171, 0.2)',
            borderRadius: '12px',
            padding: '1rem'
          }}>
            <h5 style={{ 
              color: '#38f3ab', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Info size={14} />
              Your Products Using This Ingredient
            </h5>
            {matchingProducts.map((product, idx) => (
              <div key={idx} style={{ marginBottom: '0.5rem' }}>
                <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: '500' }}>
                  {product.name}
                </div>
                {product.nutrientCost && (
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    {product.nutrientCost.costPerMg.toFixed(4)} kr/mg • Value Score: {product.nutrientCost.valueScore.toFixed(1)}/100
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCategoryComparison = () => {
    if (!selectedCategory || categoryIngredients.length < 2) return null;

    // Sort ingredients by quality score, handling null scores  
    const sortedIngredients = categoryIngredients
      .map(ingredient => ({ name: ingredient, quality: getIngredientQuality(ingredient) }))
      .filter(item => item.quality && item.quality.score !== null) // Only include ingredients with numeric scores
      .sort((a, b) => b.quality.score - a.quality.score);

    // Skip comparison if we don't have at least 2 scoreable ingredients
    if (sortedIngredients.length < 2) return null;

    const best = sortedIngredients[0];
    const worst = sortedIngredients[sortedIngredients.length - 1];
    
    // Calculate quality gap to determine if there's a meaningful difference
    const qualityGap = best.quality.score - worst.quality.score;
    const isCloseComparison = qualityGap <= 10; // If scores are within 10 points, consider them similar
    const isSameScore = qualityGap === 0; // Exact same score

    return (
      <div style={{
        background: 'rgba(102, 126, 234, 0.1)',
        border: '2px solid rgba(102, 126, 234, 0.3)',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 50% 0%, rgba(102, 126, 234, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{
            color: '#667eea',
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Scale size={24} />
            Quality Comparison: {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Best Option */}
            <div style={{
              background: 'rgba(34, 197, 94, 0.2)',
              border: '2px solid rgba(34, 197, 94, 0.4)',
              borderRadius: '16px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#0f172a',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                marginBottom: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <TrendingUp size={14} />
                BEST QUALITY
              </div>
              
              <h4 style={{ 
                color: '#f1f5f9', 
                fontSize: '1.25rem', 
                fontWeight: '700',
                margin: 0,
                marginBottom: '0.5rem',
                textTransform: 'capitalize'
              }}>
                {best.name}
              </h4>
              
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: '#22c55e',
                marginBottom: '0.5rem'
              }}>
                {best.quality.score}/100
              </div>
              
              <p style={{ 
                color: '#cbd5e1', 
                fontSize: '0.875rem',
                margin: 0 
              }}>
                {best.quality.description}
              </p>
            </div>

            {/* Second Option - Smart labeling based on score difference */}
            <div style={{
              background: isCloseComparison 
                ? 'rgba(34, 197, 94, 0.2)' 
                : 'rgba(239, 68, 68, 0.2)',
              border: isCloseComparison 
                ? '2px solid rgba(34, 197, 94, 0.4)' 
                : '2px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                background: isCloseComparison 
                  ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                marginBottom: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {isCloseComparison ? (
                  <>
                    <CheckCircle size={14} />
                    {isSameScore ? 'EQUALLY GOOD OPTION' : 'GOOD OPTION'}
                  </>
                ) : (
                  <>
                    <TrendingDown size={14} />
                    AVOID IF POSSIBLE
                  </>
                )}
              </div>
              
              <h4 style={{ 
                color: '#f1f5f9', 
                fontSize: '1.25rem', 
                fontWeight: '700',
                margin: 0,
                marginBottom: '0.5rem',
                textTransform: 'capitalize'
              }}>
                {worst.name}
              </h4>
              
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: isCloseComparison ? '#22c55e' : '#ef4444',
                marginBottom: '0.5rem'
              }}>
                {worst.quality.score}/100
              </div>
              
              <p style={{ 
                color: '#cbd5e1', 
                fontSize: '0.875rem',
                margin: 0 
              }}>
                {worst.quality.description}
              </p>
            </div>
          </div>

          {/* Quality Gap */}
          <div style={{
            textAlign: 'center',
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(56, 243, 171, 0.1)',
            border: '1px solid rgba(56, 243, 171, 0.2)',
            borderRadius: '12px'
          }}>
            <div style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#38f3ab',
              marginBottom: '0.5rem'
            }}>
              Quality Gap: {qualityGap} points
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', margin: 0 }}>
              {isSameScore 
                ? 'Both options have identical quality scores - choose based on price or preference'
                : isCloseComparison 
                  ? 'Both options are high quality with minimal difference in effectiveness'
                  : 'This represents a significant difference in bioavailability and effectiveness'
              }
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '2rem',
      border: '1px solid rgba(56, 243, 171, 0.1)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      marginBottom: '2rem'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: 0,
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem'
        }}>
          <FlaskConical size={32} />
          Ingredient Quality Analysis
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
          Compare supplement forms to make informed purchasing decisions
        </p>
      </div>

      {/* Category Selection */}
      {availableCategories.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'block',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#f1f5f9',
            marginBottom: '1rem'
          }}>
            🔬 Select supplement category to analyze:
          </label>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem' 
          }}>
            {allCategories
              .filter(cat => availableCategories.includes(cat.key))
              .map(category => (
                <div
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  style={{
                    background: selectedCategory === category.key 
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)'
                      : 'rgba(30, 41, 59, 0.6)',
                    border: selectedCategory === category.key 
                      ? '2px solid rgba(102, 126, 234, 0.4)'
                      : '1px solid rgba(148, 163, 184, 0.1)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(16px)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCategory !== category.key) {
                      e.target.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                      e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== category.key) {
                      e.target.style.borderColor = 'rgba(148, 163, 184, 0.1)';
                      e.target.style.background = 'rgba(30, 41, 59, 0.6)';
                    }
                  }}
                >
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    color: selectedCategory === category.key ? '#667eea' : '#f1f5f9',
                    marginBottom: '0.5rem'
                  }}>
                    {category.label}
                  </h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.875rem', 
                    color: '#94a3b8' 
                  }}>
                    {category.description}
                  </p>
                  <div style={{ 
                    marginTop: '0.75rem',
                    fontSize: '0.75rem',
                    color: '#38f3ab',
                    fontWeight: '600'
                  }}>
                    {(analyzedProducts[category.key] || []).length} products found
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* No products warning */}
      {availableCategories.length === 0 && (
        <div style={{
          background: 'rgba(249, 115, 22, 0.1)',
          border: '1px solid rgba(249, 115, 22, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <AlertTriangle size={48} style={{ color: '#f97316', marginBottom: '1rem' }} />
          <h3 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            No Supplement Data Available
          </h3>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', margin: 0 }}>
            Add supplement products with URLs to see ingredient quality analysis
          </p>
        </div>
      )}

      {/* Category Comparison */}
      {selectedCategory && renderCategoryComparison()}

      {/* Individual Ingredient Cards */}
      {selectedCategory && categoryIngredients.length > 0 && (
        <div>
          <h3 style={{
            color: '#f1f5f9',
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Info size={20} />
            Detailed Analysis
          </h3>
          
          {categoryIngredients.map(ingredient => renderIngredientCard(ingredient))}
        </div>
      )}
    </div>
  );
}