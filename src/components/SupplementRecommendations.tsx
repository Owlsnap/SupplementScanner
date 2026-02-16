import React, { useState } from "react";
import { Target, Star, TrendingUp, Clock, DollarSign, Award, ChevronDown, ChevronUp, Info } from "lucide-react";
import { healthGoalRecommendations, getRecommendationsForGoal } from '../data/supplementData.js';
import type { Product, AnalyzedProduct } from '../types/index.js';

interface SupplementRecommendationsProps {
  analyzedProducts?: Record<string, AnalyzedProduct[]>;
}

export default function SupplementRecommendations({ analyzedProducts = {} }: SupplementRecommendationsProps): JSX.Element {
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [expandedSupplement, setExpandedSupplement] = useState<string | null>(null);

  const goalOptions = [
    { key: 'better sleep', label: '🛌 Better Sleep', description: 'Natural sleep quality improvement' },
    { key: 'build muscle', label: '💪 Build Muscle', description: 'Muscle growth and recovery' },
    { key: 'general health', label: '🌟 General Health', description: 'Overall wellness and vitality' },
    { key: 'energy boost', label: '⚡ Energy & Focus', description: 'Natural energy and mental clarity' }
  ];

  const recommendations = selectedGoal ? getRecommendationsForGoal(selectedGoal) : null;

  const getProductMatch = (supplementName, category) => {
    const categoryProducts = analyzedProducts[category] || [];
    return categoryProducts.find(product => 
      product.name.toLowerCase().includes(supplementName.toLowerCase()) ||
      (product.supplementInfo?.activeIngredient || product.activeIngredient)?.toLowerCase().includes(supplementName.toLowerCase())
    );
  };

  const renderSupplementCard = (supplement, index) => {
    const isExpanded = expandedSupplement === index;
    const productMatch = getProductMatch(supplement.name, supplement.name.toLowerCase().includes('magnesium') ? 'magnesium' : 'general');

    return (
      <div
        key={index}
        style={{
          background: 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          marginBottom: '1rem',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '1.5rem',
            borderBottom: isExpanded ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
            cursor: 'pointer'
          }}
          onClick={() => setExpandedSupplement(isExpanded ? null : index)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Priority Badge */}
              <div
                style={{
                  background: supplement.priority === 1 ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' :
                             supplement.priority === 2 ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' :
                             'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                  color: '#0f172a',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {supplement.priority === 1 && <Award size={12} />}
                Priority {supplement.priority}
              </div>

              {/* Supplement Info */}
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '1.125rem', 
                  fontWeight: '700', 
                  color: '#f1f5f9' 
                }}>
                  {supplement.name}
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.875rem', 
                  color: '#94a3b8',
                  marginTop: '0.25rem'
                }}>
                  {supplement.dosage} • {supplement.timing}
                </p>
              </div>
            </div>

            {/* Product Match Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {productMatch && (
                <div style={{
                  background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)',
                  color: '#0f172a',
                  padding: '0.5rem 1rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Star size={12} />
                  In Your List!
                </div>
              )}
              
              {isExpanded ? <ChevronUp color="#94a3b8" size={20} /> : <ChevronDown color="#94a3b8" size={20} />}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div style={{ padding: '1.5rem' }}>
            {/* Why It Works */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ 
                color: '#38f3ab', 
                fontSize: '1rem', 
                fontWeight: '600', 
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Info size={16} />
                Why It Works
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.6' }}>
                {supplement.reason}
              </p>
            </div>

            {/* Quality Comparison */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ 
                color: '#f59e0b', 
                fontSize: '1rem', 
                fontWeight: '600', 
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <TrendingUp size={16} />
                Quality Comparison
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Quality Ingredients */}
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
                    marginBottom: '0.5rem' 
                  }}>
                    ✅ Premium Forms
                  </h5>
                  {supplement.qualityIngredients.map((ingredient, idx) => (
                    <div key={idx} style={{ 
                      color: '#cbd5e1', 
                      fontSize: '0.75rem', 
                      marginBottom: '0.25rem' 
                    }}>
                      • {ingredient}
                    </div>
                  ))}
                </div>

                {/* Poor Ingredients */}
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
                    marginBottom: '0.5rem' 
                  }}>
                    ❌ Avoid These
                  </h5>
                  {supplement.poorIngredients.map((ingredient, idx) => (
                    <div key={idx} style={{ 
                      color: '#cbd5e1', 
                      fontSize: '0.75rem', 
                      marginBottom: '0.25rem' 
                    }}>
                      • {ingredient}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget Option */}
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
                <DollarSign size={14} />
                Budget-Friendly Option
              </h5>
              <p style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
                If premium forms are too expensive, start with: <strong>{supplement.budgetOption}</strong>
              </p>
            </div>

            {/* Product Match Details */}
            {productMatch && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(56, 243, 171, 0.2) 0%, rgba(29, 209, 161, 0.2) 100%)',
                border: '2px solid rgba(56, 243, 171, 0.3)',
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
                  <Star size={14} />
                  Found in Your Products
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Product:</span>
                    <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: '500' }}>
                      {productMatch.name}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Quality Score:</span>
                    <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: '500' }}>
                      {productMatch.supplementInfo?.quality?.score || 'Unknown'}/100
                    </div>
                  </div>
                  {productMatch.nutrientCost && (
                    <>
                      <div>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Cost per mg:</span>
                        <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: '500' }}>
                          {productMatch.nutrientCost.costPerMg.toFixed(4)} kr
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Value Score:</span>
                        <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: '500' }}>
                          {productMatch.nutrientCost.valueScore.toFixed(1)}/100
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
          <Target size={32} />
          Supplement Recommendations
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
          Get personalized supplement suggestions based on your health goals
        </p>
      </div>

      {/* Goal Selection */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{
          display: 'block',
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#f1f5f9',
          marginBottom: '1rem'
        }}>
          🎯 What's your primary health goal?
        </label>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)', 
          gap: '1rem' 
        }}>
          {goalOptions.map(goal => (
            <div
              key={goal.key}
              onClick={() => setSelectedGoal(goal.key)}
              style={{
                background: selectedGoal === goal.key 
                  ? 'linear-gradient(135deg, rgba(56, 243, 171, 0.2) 0%, rgba(29, 209, 161, 0.2) 100%)'
                  : 'rgba(30, 41, 59, 0.6)',
                border: selectedGoal === goal.key 
                  ? '2px solid rgba(56, 243, 171, 0.4)'
                  : '1px solid rgba(148, 163, 184, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(16px)'
              }}
              onMouseEnter={(e) => {
                if (selectedGoal !== goal.key) {
                  const target = e.target as HTMLElement;
                  target.style.borderColor = 'rgba(56, 243, 171, 0.3)';
                  target.style.background = 'rgba(56, 243, 171, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedGoal !== goal.key) {
                  const target = e.target as HTMLElement;
                  target.style.borderColor = 'rgba(148, 163, 184, 0.1)';
                  target.style.background = 'rgba(30, 41, 59, 0.6)';
                }
              }}
            >
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.125rem', 
                fontWeight: '700', 
                color: selectedGoal === goal.key ? '#38f3ab' : '#f1f5f9',
                marginBottom: '0.5rem'
              }}>
                {goal.label}
              </h3>
              <p style={{ 
                margin: 0, 
                fontSize: '0.875rem', 
                color: '#94a3b8' 
              }}>
                {goal.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations && (
        <div>
          <div style={{ 
            marginBottom: '2rem',
            textAlign: 'center',
            padding: '1.5rem',
            background: 'rgba(56, 243, 171, 0.1)',
            border: '1px solid rgba(56, 243, 171, 0.2)',
            borderRadius: '16px'
          }}>
            <h3 style={{ 
              color: '#38f3ab', 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              margin: 0,
              marginBottom: '0.5rem'
            }}>
              {recommendations.name}
            </h3>
            <p style={{ 
              color: '#cbd5e1', 
              fontSize: '1rem', 
              margin: 0 
            }}>
              {recommendations.description}
            </p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ 
              color: '#f1f5f9', 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Clock size={20} />
              Recommended Supplements (in order of priority)
            </h4>
            
            {recommendations.supplements.map((supplement, index) => 
              renderSupplementCard(supplement, index)
            )}
          </div>

          {/* Additional Tips */}
          <div style={{
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginTop: '2rem'
          }}>
            <h4 style={{ 
              color: '#667eea', 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              💡 Pro Tips
            </h4>
            <ul style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.6', margin: 0, paddingLeft: '1rem' }}>
              <li>Start with Priority 1 supplements first, add others gradually</li>
              <li>Take supplements consistently for at least 4-6 weeks to see benefits</li>
              <li>Buy from reputable brands with third-party testing</li>
              <li>Consider getting blood tests to check for deficiencies</li>
              <li>Quality matters more than quantity - invest in better forms when possible</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}