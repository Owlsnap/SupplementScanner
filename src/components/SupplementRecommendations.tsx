import React, { useState } from "react";
import { Target, Star, ArrowUp, Clock, CurrencyDollar, Medal, CaretDown, CaretUp, Info, Moon, Barbell, Leaf, Lightning, Lightbulb, CheckCircle, XCircle } from "@phosphor-icons/react";
import { healthGoalRecommendations, getRecommendationsForGoal } from '../data/supplementData.js';
import type { Product, AnalyzedProduct } from '../types/index.js';
import { useLanguage } from '../contexts/LanguageContext';

interface SupplementRecommendationsProps {
  analyzedProducts?: Record<string, AnalyzedProduct[]>;
}

export default function SupplementRecommendations({ analyzedProducts = {} }: SupplementRecommendationsProps): JSX.Element {
  const { t } = useLanguage();
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [expandedSupplement, setExpandedSupplement] = useState<string | null>(null);

  const goalOptions = [
    { key: 'better sleep', Icon: Moon, label: t('supplementRecommendations.goals.betterSleep.label'), description: t('supplementRecommendations.goals.betterSleep.description') },
    { key: 'build muscle', Icon: Barbell, label: t('supplementRecommendations.goals.buildMuscle.label'), description: t('supplementRecommendations.goals.buildMuscle.description') },
    { key: 'general health', Icon: Leaf, label: t('supplementRecommendations.goals.generalHealth.label'), description: t('supplementRecommendations.goals.generalHealth.description') },
    { key: 'energy boost', Icon: Lightning, label: t('supplementRecommendations.goals.energyFocus.label'), description: t('supplementRecommendations.goals.energyFocus.description') },
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

    const priorityColors = {
      1: { bg: 'var(--card-warning-bg)', border: 'var(--card-warning-border)', text: 'var(--card-warning-heading)' },
      2: { bg: 'var(--card-info-bg)',    border: 'var(--card-info-border)',    text: 'var(--card-info-heading)' },
      3: { bg: 'var(--card-purple-bg)',  border: 'var(--card-purple-border)',   text: 'var(--card-purple-heading)' },
    };
    const pc = priorityColors[supplement.priority] || priorityColors[3];

    return (
      <div
        key={index}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1.5px solid var(--border)',
          marginBottom: '0.75rem',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header */}
        <div
          style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
          onClick={() => setExpandedSupplement(isExpanded ? null : index)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              {/* Priority Badge */}
              <div style={{
                background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text,
                padding: '0.25rem 0.75rem', borderRadius: '999px',
                fontSize: '0.75rem', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                fontFamily: "'Inter', sans-serif", flexShrink: 0,
              }}>
                {supplement.priority === 1 && <Medal size={12} />}
                {t('supplementRecommendations.priorityLabel', { number: supplement.priority })}
              </div>

              {/* Supplement Info */}
              <div>
                <h3 style={{
                  margin: 0, fontSize: '1rem', fontWeight: 700,
                  color: 'var(--text-primary)', fontFamily: "'Manrope', sans-serif",
                }}>
                  {supplement.name}
                </h3>
                <p style={{
                  margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)',
                  marginTop: '0.125rem', fontFamily: "'Inter', sans-serif",
                }}>
                  {supplement.dosage} · {supplement.timing}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {productMatch && (
                <div style={{
                  background: 'var(--primary-light)', color: '#00685f',
                  border: '1px solid var(--primary-border)',
                  padding: '0.375rem 0.875rem', borderRadius: '999px',
                  fontSize: '0.75rem', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  <Star size={11} weight="fill" />
                  {t('supplementRecommendations.inYourList')}
                </div>
              )}
              {isExpanded
                ? <CaretUp size={16} color="var(--text-secondary)" />
                : <CaretDown size={16} color="var(--text-secondary)" />
              }
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div style={{ padding: '1.25rem 1.5rem' }}>
            {/* Why It Works */}
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{
                color: '#00685f', fontSize: '0.875rem', fontWeight: 700,
                marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem',
                fontFamily: "'Inter', sans-serif",
              }}>
                <Info size={15} />
                {t('supplementRecommendations.whyItWorks')}
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                {supplement.reason}
              </p>
            </div>

            {/* Quality Comparison */}
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{
                color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 700,
                marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem',
                fontFamily: "'Inter', sans-serif",
              }}>
                <ArrowUp size={15} />
                {t('supplementRecommendations.qualityComparison')}
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{
                  background: 'var(--card-success-bg)', border: '1px solid var(--card-success-border)',
                  borderRadius: '12px', padding: '0.875rem',
                }}>
                  <h5 style={{ color: 'var(--card-success-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <CheckCircle size={13} />
                    {t('supplementRecommendations.premiumForms')}
                  </h5>
                  {supplement.qualityIngredients.map((ingredient, idx) => (
                    <div key={idx} style={{ color: 'var(--card-success-text)', fontSize: '0.75rem', marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif" }}>
                      · {ingredient}
                    </div>
                  ))}
                </div>

                <div style={{
                  background: 'var(--card-danger-bg)', border: '1px solid var(--card-danger-border)',
                  borderRadius: '12px', padding: '0.875rem',
                }}>
                  <h5 style={{ color: 'var(--card-danger-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <XCircle size={13} />
                    {t('supplementRecommendations.avoidThese')}
                  </h5>
                  {supplement.poorIngredients.map((ingredient, idx) => (
                    <div key={idx} style={{ color: 'var(--card-danger-text)', fontSize: '0.75rem', marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif" }}>
                      · {ingredient}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget Option */}
            <div style={{
              background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
              borderRadius: '12px', padding: '0.875rem', marginBottom: '0.875rem',
            }}>
              <h5 style={{
                color: '#00685f', fontSize: '0.8125rem', fontWeight: 700,
                marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem',
                margin: '0 0 0.375rem', fontFamily: "'Inter', sans-serif",
              }}>
                <CurrencyDollar size={14} />
                {t('supplementRecommendations.budgetFriendly')}
              </h5>
              <p style={{ color: '#3f6560', fontSize: '0.8125rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                {supplement.budgetOption}
              </p>
            </div>

            {/* Product Match Details */}
            {productMatch && (
              <div style={{
                background: 'var(--primary-light)', border: '1.5px solid var(--primary-border)',
                borderRadius: '12px', padding: '0.875rem',
              }}>
                <h5 style={{
                  color: '#00685f', fontSize: '0.8125rem', fontWeight: 700,
                  marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem',
                  margin: '0 0 0.75rem', fontFamily: "'Inter', sans-serif",
                }}>
                  <Star size={14} />
                  {t('supplementRecommendations.foundInProducts')}
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: "'Inter', sans-serif" }}>{t('supplementRecommendations.product')}</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, fontFamily: "'Manrope', sans-serif" }}>{productMatch.name}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: "'Inter', sans-serif" }}>{t('supplementRecommendations.qualityScore')}</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, fontFamily: "'Manrope', sans-serif" }}>
                      {productMatch.supplementInfo?.quality?.score || '—'}/100
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Goal Selection */}
      <div style={{
        background: 'var(--bg-surface)', borderRadius: '16px',
        border: '1.5px solid var(--border)', padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1.5rem',
      }}>
        <h2 style={{
          fontFamily: "'Manrope', sans-serif", fontWeight: 800,
          fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0 0 0.375rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          letterSpacing: '-0.3px',
        }}>
          <Target size={20} color="#00685f" />
          {t('supplementRecommendations.title')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.25rem', fontFamily: "'Inter', sans-serif" }}>
          {t('supplementRecommendations.subtitle')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {goalOptions.map(goal => {
            const isActive = selectedGoal === goal.key;
            return (
              <div
                key={goal.key}
                onClick={() => setSelectedGoal(goal.key)}
                style={{
                  background: isActive ? 'var(--primary-light)' : 'var(--bg-page)',
                  border: isActive ? '1.5px solid #00685f' : '1.5px solid var(--border)',
                  borderRadius: '12px', padding: '1rem',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                <h3 style={{
                  margin: '0 0 0.25rem', fontSize: '0.9375rem', fontWeight: 700,
                  color: isActive ? '#00685f' : 'var(--text-primary)',
                  fontFamily: "'Manrope', sans-serif",
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <goal.Icon size={16} weight={isActive ? 'fill' : 'regular'} />
                  {goal.label}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
                  {goal.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations && (
        <div>
          {/* Goal summary */}
          <div style={{
            background: '#00685f', border: '1px solid #00685f',
            borderRadius: '16px', padding: '1.25rem',
            marginBottom: '1.25rem', textAlign: 'center',
          }}>
            <h3 style={{
              color: '#ffffff', fontSize: '1.125rem', fontWeight: 800,
              margin: '0 0 0.25rem', fontFamily: "'Manrope', sans-serif",
            }}>
              {recommendations.name}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.875rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
              {recommendations.description}
            </p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{
              color: 'var(--text-muted)', fontSize: '0.9375rem', fontWeight: 700,
              marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem',
              fontFamily: "'Inter', sans-serif",
            }}>
              <Clock size={16} color="#00685f" />
              {t('supplementRecommendations.recommendedSupplements')}
            </h4>

            {recommendations.supplements.map((supplement, index) =>
              renderSupplementCard(supplement, index)
            )}
          </div>

          {/* Pro Tips */}
          <div style={{
            background: 'var(--bg-surface)', border: '1.5px solid var(--border)',
            borderRadius: '16px', padding: '1.25rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <h4 style={{
              color: '#00685f', fontSize: '0.9375rem', fontWeight: 700,
              marginBottom: '0.75rem', margin: '0 0 0.75rem',
              fontFamily: "'Inter', sans-serif",
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}>
              <Lightbulb size={16} weight="fill" />
              {t('supplementRecommendations.proTips')}
            </h4>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.7', margin: 0, paddingLeft: '1.25rem', fontFamily: "'Inter', sans-serif" }}>
              {(t('supplementRecommendations.proTipsList', { returnObjects: true }) as string[]).map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
