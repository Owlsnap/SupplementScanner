import { useState, useEffect } from "react";
import { Calculator, TrendingUp, Award, AlertCircle, Info, DollarSign, Zap } from "lucide-react";
import { parseSupplementInfo, calculateNutrientCost, compareSupplementValue, getQualityInsights, generateRecommendations } from '../utils/supplementAnalysis.js';

export default function NutrientCostAnalysis({ products }) {
  const [analyzedData, setAnalyzedData] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    console.log('🔍 NutrientCostAnalysis received products:', products);
    // Analyze all products when they change
    const validProducts = products.filter(p => p.name && p.price && p.quantity);
    console.log('🔍 Valid products for nutrient analysis:', validProducts);
    
    if (validProducts.length > 0) {
      console.log('🧪 Running compareSupplementValue from NutrientCostAnalysis...');
      const analysis = compareSupplementValue(validProducts);
      console.log('📊 Analysis result in NutrientCostAnalysis:', analysis);
      console.log('📊 Available categories:', Object.keys(analysis));
      setAnalyzedData(analysis);
      
      // Generate recommendations
      const recs = generateRecommendations(analysis);
      console.log('💡 Generated recommendations:', recs);
      setRecommendations(recs);

      // Auto-select first category
      if (Object.keys(analysis).length > 0 && !selectedCategory) {
        const firstCategory = Object.keys(analysis)[0];
        console.log('🎯 Auto-selecting first category:', firstCategory);
        setSelectedCategory(firstCategory);
      }
    } else {
      console.log('❌ No valid products for nutrient analysis');
      setAnalyzedData({});
      setRecommendations([]);
      setSelectedCategory('');
    }
  }, [products, selectedCategory]);

  const categoryProducts = selectedCategory ? (analyzedData[selectedCategory] || []) : [];
  const availableCategories = Object.keys(analyzedData);

  const formatCurrency = (amount) => {
    return `${amount.toFixed(3)} kr`;
  };

  const renderCostPerMgCard = (product, index) => {
    const isTopValue = index === 0;
    const nutrientCost = product.nutrientCost;
    const supplementInfo = product.supplementInfo;
    const insights = getQualityInsights(supplementInfo);

    return (
      <div
        key={product.id}
        style={{
          background: isTopValue 
            ? 'linear-gradient(135deg, rgba(56, 243, 171, 0.2) 0%, rgba(29, 209, 161, 0.2) 100%)'
            : 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(16px)',
          borderRadius: '20px',
          padding: '2rem',
          border: isTopValue 
            ? '2px solid rgba(56, 243, 171, 0.4)'
            : '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: isTopValue
            ? '0 10px 40px rgba(56, 243, 171, 0.2)'
            : '0 8px 32px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s ease',
          position: 'relative',
          marginBottom: '1.5rem'
        }}
      >
        {/* Top Value Badge */}
        {isTopValue && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '20px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: '#0f172a',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 20px rgba(251, 191, 36, 0.3)'
          }}>
            <Award size={14} />
            BEST VALUE
          </div>
        )}

        {/* Product Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#f1f5f9',
            marginBottom: '0.5rem'
          }}>
            {product.name}
          </h3>
          <div style={{ 
            color: '#38f3ab', 
            fontSize: '1rem', 
            fontWeight: '600',
            textTransform: 'capitalize'
          }}>
            {supplementInfo.activeIngredient}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Cost per mg */}
          <div style={{
            background: 'rgba(56, 243, 171, 0.1)',
            border: '1px solid rgba(56, 243, 171, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              Cost per mg
            </div>
            <div style={{ 
              color: '#38f3ab', 
              fontSize: '1.25rem', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <DollarSign size={16} />
              {formatCurrency(nutrientCost.costPerMg)}
            </div>
          </div>

          {/* Quality Score */}
          <div style={{
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              Quality Score
            </div>
            <div style={{ 
              color: '#667eea', 
              fontSize: '1.25rem', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <Zap size={16} />
              {supplementInfo.quality.score}/100
            </div>
          </div>

          {/* Value Score */}
          <div style={{
            background: 'rgba(249, 115, 22, 0.1)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              Value Score
            </div>
            <div style={{ 
              color: '#f97316', 
              fontSize: '1.25rem', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <TrendingUp size={16} />
              {nutrientCost.valueScore.toFixed(1)}/100
            </div>
          </div>

          {/* Dosage per Unit */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              Dosage per {supplementInfo.unit === 'g' ? 'serving' : supplementInfo.unit.slice(0, -1)}
            </div>
            <div style={{ 
              color: '#8b5cf6', 
              fontSize: '1.25rem', 
              fontWeight: 'bold'
            }}>
              {supplementInfo.dosagePerUnit}mg
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h5 style={{ 
            color: '#f1f5f9', 
            fontSize: '0.875rem', 
            fontWeight: '600',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Calculator size={14} />
            Cost Breakdown
          </h5>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem' }}>
            <div style={{ color: '#94a3b8' }}>
              Total price: <span style={{ color: '#f1f5f9', fontWeight: '500' }}>{product.price} kr</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              Total active ingredient: <span style={{ color: '#f1f5f9', fontWeight: '500' }}>{nutrientCost.totalActiveIngredient}mg</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              Cost per 100mg: <span style={{ color: '#f1f5f9', fontWeight: '500' }}>{formatCurrency(nutrientCost.costPer100mg)}</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              Cost per unit: <span style={{ color: '#f1f5f9', fontWeight: '500' }}>{formatCurrency(nutrientCost.costPerUnit)}</span>
            </div>
          </div>
        </div>

        {/* Quality Insights */}
        {insights && insights.qualityWarnings.length > 0 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem'
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
              <AlertCircle size={14} />
              Quality Alerts
            </h5>
            
            {insights.qualityWarnings.map((warning, idx) => (
              <div key={idx} style={{ 
                color: '#fecaca', 
                fontSize: '0.75rem',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <div style={{ 
                  width: '4px', 
                  height: '4px', 
                  borderRadius: '50%', 
                  background: '#ef4444',
                  marginTop: '0.5rem',
                  flexShrink: 0
                }} />
                <div>
                  <div style={{ fontWeight: '500' }}>{warning.message}</div>
                  {warning.explanation && (
                    <div style={{ color: '#cbd5e1', marginTop: '0.25rem' }}>
                      {warning.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {insights && insights.recommendations.length > 0 && (
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
              <Info size={14} />
              Recommendations
            </h5>
            
            {insights.recommendations.map((rec, idx) => (
              <div key={idx} style={{ 
                color: '#bbf7d0', 
                fontSize: '0.75rem',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <div style={{ 
                  width: '4px', 
                  height: '4px', 
                  borderRadius: '50%', 
                  background: '#22c55e',
                  marginTop: '0.5rem',
                  flexShrink: 0
                }} />
                <div>
                  <div style={{ fontWeight: '500' }}>{rec.message}</div>
                  {rec.suggestion && (
                    <div style={{ color: '#cbd5e1', marginTop: '0.25rem' }}>
                      {rec.suggestion}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (availableCategories.length === 0) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '3rem 2rem',
        border: '1px solid rgba(56, 243, 171, 0.1)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <Calculator size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
        <h3 style={{ color: '#94a3b8', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          No Supplement Data to Analyze
        </h3>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
          Add supplement products with names, prices, and quantities to see detailed nutrient cost analysis
        </p>
      </div>
    );
  }

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
          background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)',
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
          <Calculator size={32} />
          Nutrient Cost Analysis
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
          Compare price per active ingredient to find the best supplement value
        </p>
      </div>

      {/* Category Selection */}
      {availableCategories.length > 1 && (
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'block',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#f1f5f9',
            marginBottom: '1rem'
          }}>
            💊 Select supplement category:
          </label>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            {availableCategories.map(category => (
              <div
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  background: selectedCategory === category 
                    ? 'linear-gradient(135deg, rgba(56, 243, 171, 0.2) 0%, rgba(29, 209, 161, 0.2) 100%)'
                    : 'rgba(30, 41, 59, 0.6)',
                  border: selectedCategory === category 
                    ? '2px solid rgba(56, 243, 171, 0.4)'
                    : '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: '16px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(16px)',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== category) {
                    e.target.style.borderColor = 'rgba(56, 243, 171, 0.3)';
                    e.target.style.background = 'rgba(56, 243, 171, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== category) {
                    e.target.style.borderColor = 'rgba(148, 163, 184, 0.1)';
                    e.target.style.background = 'rgba(30, 41, 59, 0.6)';
                  }
                }}
              >
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '1rem', 
                  fontWeight: '700', 
                  color: selectedCategory === category ? '#38f3ab' : '#f1f5f9',
                  textTransform: 'capitalize',
                  marginBottom: '0.5rem'
                }}>
                  {category}
                </h3>
                <div style={{ 
                  fontSize: '0.75rem',
                  color: '#94a3b8'
                }}>
                  {analyzedData[category].length} products
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Analysis */}
      {categoryProducts.length > 0 && (
        <div>
          <h3 style={{
            color: '#f1f5f9',
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            textTransform: 'capitalize'
          }}>
            {selectedCategory} Analysis ({categoryProducts.length} products)
          </h3>
          
          {categoryProducts.map((product, index) => renderCostPerMgCard(product, index))}
        </div>
      )}

      {/* Summary Recommendations */}
      {recommendations.length > 0 && (
        <div style={{
          background: 'rgba(102, 126, 234, 0.1)',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          marginTop: '2rem'
        }}>
          <h3 style={{
            color: '#667eea',
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Award size={24} />
            Smart Recommendations
          </h3>
          
          {recommendations.map((rec, index) => (
            <div key={index} style={{
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1rem'
            }}>
              <h4 style={{
                color: '#f1f5f9',
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.75rem'
              }}>
                {rec.message}
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {Object.entries(rec.details).map(([key, value]) => (
                  <div key={key} style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: '#94a3b8' }}>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                    <span style={{ color: '#f1f5f9', marginLeft: '0.5rem', fontWeight: '500' }}>
                      {value === null || value === undefined ? 'N/A' : typeof value === 'string' ? value : value.toFixed ? value.toFixed(2) : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}