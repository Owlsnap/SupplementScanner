import React, { useState, useEffect } from "react";
import { Flask, Scales, ArrowUp, ArrowDown, CheckCircle, XCircle, Info, Warning, Shield, WarningCircle, Target } from "@phosphor-icons/react";
import { ingredientQuality, compareIngredients, getIngredientQuality } from '../data/supplementData.js';
import type { Product, AnalyzedProduct, StructuredSupplementData, IngredientAnalysis } from '../types/index.js';

interface IngredientQualityComparisonProps {
  analyzedProducts?: Record<string, AnalyzedProduct[]>;
}

interface ComparisonResult {
  ingredient: string;
  analysis: IngredientAnalysis[];
  averageQuality: number;
  bestOption: string;
  worstOption: string;
}

export default function IngredientQualityComparison({ analyzedProducts = {} }: IngredientQualityComparisonProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[] | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<Record<string, string>>({});
  const [expandedIngredients, setExpandedIngredients] = useState<Record<string, boolean>>({});

  // Get available categories from analyzed products
  const availableCategories = Object.keys(analyzedProducts);

  // Auto-select first category when data loads
  useEffect(() => {
    if (availableCategories.length > 0 && !selectedCategory) {
      const firstCategory = availableCategories[0];
      console.log('🎯 Auto-selecting first category for ingredient analysis:', firstCategory);
      setSelectedCategory(firstCategory);
    }
  }, [availableCategories, selectedCategory]);
  
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
    .map(product => {
      // For pre-workout products, always return 'Complex Formula'
      if (selectedCategory === 'pre_workout') {
        return 'Complex Formula';
      }
      return product.supplementInfo?.activeIngredient || product.activeIngredient;
    })
    .filter(Boolean)
    .filter((ingredient, index, self) => self.indexOf(ingredient) === index);
  
  // Only log when we have a selected category with issues
  if (selectedCategory && categoryIngredients.length === 0 && categoryProducts.length > 0) {
    console.log(`🐛 No ingredients found for category "${selectedCategory}":`, categoryProducts);
  }

  const getQualityLabel = (score) => {
    if (score === null) return 'Individual Choice';
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const getQualityColor = (score) => {
    if (score === null) return '#8b5cf6';
    if (score >= 90) return '#16a34a';
    if (score >= 80) return '#65a30d';
    if (score >= 70) return '#ca8a04';
    if (score >= 50) return '#ea580c';
    return '#dc2626';
  };

  // Enhanced dosage analysis that works with structured ingredient data
  const analyzeDosageFromStructured = (ingredientName, product) => {
    const key = ingredientName?.toLowerCase().replace(/[-\s]/g, '_');
    
    // Priority 1: Check structured ingredients data
    if (product.structuredIngredients?.ingredients && product.structuredIngredients.ingredients[key]) {
      const ingredient = product.structuredIngredients.ingredients[key];
      if (ingredient.isIncluded && ingredient.dosage_mg) {
        console.log(`🎯 Found dosage in structuredIngredients: ${ingredientName} = ${ingredient.dosage_mg}mg`);
        return analyzeDosage(ingredientName, ingredient.dosage_mg);
      }
    }
    
    // Priority 2: Check extraction result structured data
    if (product.extractionResult?.structuredData?.ingredients && product.extractionResult.structuredData.ingredients[key]) {
      const ingredient = product.extractionResult.structuredData.ingredients[key];
      if (ingredient.isIncluded && ingredient.dosage_mg) {
        console.log(`🎯 Found dosage in extractionResult: ${ingredientName} = ${ingredient.dosage_mg}mg`);
        return analyzeDosage(ingredientName, ingredient.dosage_mg);
      }
    }
    
    // Priority 3: Check extracted data
    if (product.extractedData?.structuredData?.ingredients && product.extractedData.structuredData.ingredients[key]) {
      const ingredient = product.extractedData.structuredData.ingredients[key];
      if (ingredient.isIncluded && ingredient.dosage_mg) {
        console.log(`🎯 Found dosage in extractedData: ${ingredientName} = ${ingredient.dosage_mg}mg`);
        return analyzeDosage(ingredientName, ingredient.dosage_mg);
      }
    }
    
    // Priority 4: Check from extracted product ingredients
    const extractedIngredients = extractProductIngredients(product);
    const matchingIngredient = extractedIngredients.find(ing => 
      ing.name.toLowerCase() === ingredientName.toLowerCase() ||
      ing.originalKey === key
    );
    
    if (matchingIngredient && matchingIngredient.dose) {
      console.log(`🎯 Found dosage in extracted ingredients: ${ingredientName} = ${matchingIngredient.dose}mg`);
      return analyzeDosage(ingredientName, matchingIngredient.dose);
    }
    
    // Fallback to AI-generated recommendations when no structured data is found
    console.log(`⚠️ No structured dosage found for ${ingredientName}, generating AI recommendation`);
    const recommendation = generateDosageRecommendation(ingredientName);
    return {
      level: 'recommended',
      color: '#3b82f6',
      message: `Recommended: ${recommendation.dosage}`,
      recommendation: recommendation.advice,
      isAIGenerated: true,
      source: recommendation.evidenceBased ? 'Evidence-based recommendation' : 'General guidance'
    };
  };

  // Generate evidence-based dosage recommendations when product data is unavailable
  const generateDosageRecommendation = (ingredientName) => {
    const ingredient = ingredientName?.toLowerCase();
    
    const recommendations = {
      'caffeine': {
        dosage: '150-300mg',
        advice: 'Start with 150mg and assess tolerance. Take 30-45 minutes before workout. Avoid within 6 hours of bedtime.',
        timing: 'Pre-workout',
        maxDaily: '400mg',
        notes: 'Most researched pre-workout ingredient with proven benefits for energy and focus.'
      },
      'beta-alanine': {
        dosage: '3-5g daily',
        advice: 'Split into 2-3 doses with meals to reduce tingling. Load for 4-6 weeks for maximum muscle carnosine levels.',
        timing: 'With meals',
        maxDaily: '6g',
        notes: 'Improves muscular endurance during 1-4 minute high-intensity exercise.'
      },
      'l-citrulline': {
        dosage: '6-8g',
        advice: 'Take on empty stomach 30-45 minutes before workout for optimal nitric oxide production and pumps.',
        timing: 'Pre-workout',
        maxDaily: '10g',
        notes: 'Superior to L-arginine for increasing nitric oxide and blood flow.'
      },
      'citrulline malate': {
        dosage: '8-10g',
        advice: 'Higher dose needed due to malic acid content. Take pre-workout for enhanced endurance and reduced soreness.',
        timing: 'Pre-workout',
        maxDaily: '12g',
        notes: 'May provide additional endurance benefits compared to pure L-citrulline.'
      },
      'creatine monohydrate': {
        dosage: '5g daily',
        advice: 'Take consistently at any time. Loading phase (20g/day for 5 days) optional. Mix with warm water for better dissolution.',
        timing: 'Any time',
        maxDaily: '5g maintenance',
        notes: 'Gold standard supplement for strength, power, and muscle mass. Most researched form.'
      },
      'taurine': {
        dosage: '1-3g daily',
        advice: 'Often included in pre-workouts. May support muscle function and hydration. Generally well tolerated.',
        timing: 'Pre-workout or throughout day',
        maxDaily: '4g',
        notes: 'Conditionally essential amino acid with calming properties that may offset stimulants.'
      },
      'l-tyrosine': {
        dosage: '500mg-2g',
        advice: 'Take on empty stomach away from protein meals. Most effective during stress or sleep deprivation.',
        timing: 'Between meals',
        maxDaily: '3g',
        notes: 'Precursor to dopamine and norepinephrine. Effects are subtle and individual.'
      },
      'l-theanine': {
        dosage: '100-200mg',
        advice: 'Often paired with caffeine in 1:1 or 2:1 ratio (theanine:caffeine) to reduce jitters and promote calm focus.',
        timing: 'With caffeine or any time',
        maxDaily: '300mg',
        notes: 'Natural amino acid from tea that promotes relaxation without sedation.'
      },
      'l-arginine': {
        dosage: '3-6g',
        advice: 'Less effective than L-citrulline for nitric oxide production. Consider switching to citrulline.',
        timing: 'Pre-workout',
        maxDaily: '6g',
        notes: '⚠️ Poor absorption compared to L-citrulline. Consider upgrading supplement choice.'
      },
      'betaine anhydrous': {
        dosage: '2.5g daily',
        advice: 'Take consistently with meals. May support power output and muscle growth over time.',
        timing: 'With meals',
        maxDaily: '2.5g',
        notes: 'Osmolyte that may support cellular hydration and power output.'
      },
      'choline bitartrate': {
        dosage: '250-500mg',
        advice: 'Supports acetylcholine production for cognitive function. Take with or without food.',
        timing: 'Any time',
        maxDaily: '1g',
        notes: 'Cholinergic compound that may support focus and mind-muscle connection.'
      }
    };

    const recommendation = recommendations[ingredient];
    
    if (recommendation) {
      return {
        dosage: recommendation.dosage,
        advice: `${recommendation.advice} Maximum daily: ${recommendation.maxDaily}. ${recommendation.notes}`,
        timing: recommendation.timing,
        evidenceBased: true
      };
    }

    // Generic recommendation for unknown ingredients
    return {
      dosage: 'Follow label',
      advice: `Research this ingredient thoroughly. Start with the lowest effective dose and assess tolerance. Consult healthcare provider for personalized guidance.`,
      timing: 'As directed',
      evidenceBased: false
    };
  };

  // Extract dosage ranges from recommendation data for analysis
  const getDosageRanges = (ingredientName) => {
    const ingredient = ingredientName?.toLowerCase();
    
    // Define ranges based on the comprehensive recommendation data
    const ranges = {
      'caffeine': { low: 100, optimal: [150, 300], high: 400, unit: 'mg' },
      'beta-alanine': { low: 1500, optimal: [3000, 5000], high: 6000, unit: 'mg' },
      'l-citrulline': { low: 4000, optimal: [6000, 8000], high: 10000, unit: 'mg' },
      'citrulline malate': { low: 5000, optimal: [8000, 10000], high: 12000, unit: 'mg' },
      'creatine monohydrate': { low: 3000, optimal: [5000, 5000], high: 10000, unit: 'mg' },
      'taurine': { low: 500, optimal: [1000, 3000], high: 4000, unit: 'mg' },
      'l-tyrosine': { low: 250, optimal: [500, 2000], high: 3000, unit: 'mg' },
      'l-theanine': { low: 50, optimal: [100, 200], high: 300, unit: 'mg' },
      'betaine anhydrous': { low: 1000, optimal: [2500, 2500], high: 5000, unit: 'mg' },
      'choline bitartrate': { low: 100, optimal: [250, 500], high: 1000, unit: 'mg' }
    };
    
    return ranges[ingredient];
  };

  // Analyze dosage levels for ingredients using consolidated data
  const analyzeDosage = (ingredientName, dosage, productName = '') => {
    const ranges = getDosageRanges(ingredientName);
    
    if (!ranges || !dosage) {
      // Generate AI-powered recommendation when no dosage ranges or values found
      const recommendation = generateDosageRecommendation(ingredientName);
      return {
        level: 'recommended',
        color: '#3b82f6', // Blue for AI recommendation
        message: `Recommended: ${recommendation.dosage}`,
        recommendation: recommendation.advice,
        isAIGenerated: true,
        source: 'Evidence-based recommendation'
      };
    }

    const dose = parseFloat(dosage);
    
    if (dose < ranges.low) {
      return {
        level: 'low',
        color: '#ef4444',
        message: `Low dose (${dose}${ranges.unit})`,
        recommendation: `Consider ${ranges.optimal[0]}-${ranges.optimal[1]}${ranges.unit} for optimal effects`
      };
    } else if (dose >= ranges.optimal[0] && dose <= ranges.optimal[1]) {
      return {
        level: 'optimal',
        color: '#22c55e',
        message: `Optimal dose (${dose}${ranges.unit})`,
        recommendation: `Perfect dosage range for maximum benefits`
      };
    } else if (dose > ranges.optimal[1] && dose <= ranges.high) {
      return {
        level: 'high',
        color: '#f97316',
        message: `High dose (${dose}${ranges.unit})`,
        recommendation: `Above optimal range but likely safe. Monitor tolerance.`
      };
    } else {
      return {
        level: 'excessive',
        color: '#ef4444',
        message: `Excessive dose (${dose}${ranges.unit})`,
        recommendation: `Consider lower dose to avoid side effects`
      };
    }
  };

  // Extract all ingredients from a product (for pre-workout analysis)
  const extractProductIngredients = (product: AnalyzedProduct) => {
    const ingredients: Array<{name: string; dose: number | null; source: string; originalKey?: string}> = [];
    
    // FIRST: Check for structured ingredients data from extraction (priority)
    if (product.structuredIngredients?.ingredients) {
      console.log('🧬 Found structured ingredients data:', Object.keys(product.structuredIngredients.ingredients));
      const structuredIngredients = Object.keys(product.structuredIngredients.ingredients)
        .filter(key => product.structuredIngredients?.ingredients?.[key]?.isIncluded)
        .map(key => {
          const ingredient = product.structuredIngredients?.ingredients?.[key];
          // Map structured keys back to readable names
          const keyMappings = {
            'caffeine': 'caffeine',
            'beta_alanine': 'beta-alanine', 
            'l_citrulline': 'l-citrulline',
            'l_arginine': 'l-arginine',
            'l_tyrosine': 'l-tyrosine',
            'l_theanine': 'l-theanine',
            'creatine_monohydrate': 'creatine monohydrate',
            'taurine': 'taurine',
            'betaine_anhydrous': 'betaine anhydrous',
            'choline_bitartrate': 'choline bitartrate'
          };
          const readableName = keyMappings[key] || key.replace(/_/g, '-');
          return {
            name: readableName,
            dose: ingredient?.dosage_mg || 0,
            source: 'structured',
            originalKey: key
          };
        });
      
      if (structuredIngredients.length > 0) {
        console.log('🧬 extractProductIngredients: Using structured data:', structuredIngredients.length, 'ingredients');
        return structuredIngredients;
      }
    }
    
    // SECOND: Check for extraction result data (alternative structured format)
    if (product.extractionResult?.structuredData?.ingredients) {
      console.log('🔍 Found extraction result structured data:', Object.keys(product.extractionResult.structuredData.ingredients));
      const extractionIngredients = Object.keys(product.extractionResult.structuredData.ingredients)
        .filter(key => product.extractionResult?.structuredData?.ingredients?.[key]?.isIncluded)
        .map(key => {
          const ingredient = product.extractionResult?.structuredData?.ingredients?.[key];
          return {
            name: key.replace(/_/g, '-'),
            dose: ingredient?.dosage_mg || 0,
            source: 'extraction_result',
            originalKey: key
          };
        });
      
      if (extractionIngredients.length > 0) {
        console.log('🔍 extractProductIngredients: Using extraction result data:', extractionIngredients.length, 'ingredients');
        return extractionIngredients;
      }
    }
    
    // THIRD: Check for data stored directly in extractedData
    if (product.extractedData?.structuredData?.ingredients) {
      console.log('📊 Found extracted data structured ingredients:', Object.keys(product.extractedData.structuredData.ingredients));
      const extractedIngredients = Object.keys(product.extractedData.structuredData.ingredients)
        .filter(key => product.extractedData?.structuredData?.ingredients?.[key]?.isIncluded)
        .map(key => {
          const ingredient = product.extractedData?.structuredData?.ingredients?.[key];
          return {
            name: key.replace(/_/g, '-'),
            dose: ingredient?.dosage_mg || 0,
            source: 'extracted_data',
            originalKey: key
          };
        });
      
      if (extractedIngredients.length > 0) {
        console.log('📊 extractProductIngredients: Using extracted data:', extractedIngredients.length, 'ingredients');
        return extractedIngredients;
      }
    }
    
    // FALLBACK: Check for "+" separated format (old method)
    const activeIngredient = product.supplementInfo?.activeIngredient || product.activeIngredient;
    if (activeIngredient?.includes('+')) {
      const ingredientNames = activeIngredient.split(' + ');
      ingredientNames.forEach(name => {
        ingredients.push({
          name: name.trim(),
          dose: null, // We'll need to extract individual doses
          source: 'combined'
        });
      });
      console.log('🔗 extractProductIngredients: Using "+" format:', ingredients.length, 'ingredients');
    } else {
      // Single ingredient product (or unrecognized format)
      ingredients.push({
        name: activeIngredient || 'Unknown',
        dose: (product.supplementInfo?.dosagePerUnit || product.dosagePerUnit) as number | null,
        source: 'single'
      });
      console.log('📦 extractProductIngredients: Single ingredient or unknown format');
    }

    return ingredients;
  };

  const renderIngredientCard = (ingredientName) => {
    // Handle special case for Complex Formula (pre-workout)
    const effectiveIngredientName = (ingredientName === 'Complex Formula' || ingredientName === 'Pre-Workout Formula') ? 'caffeine' : ingredientName;
    const quality = getIngredientQuality(effectiveIngredientName);
    
    // Always render a card, even if we don't have quality data
    if (!quality && !['Complex Formula', 'Pre-Workout Formula'].includes(ingredientName)) return null;

    const matchingProducts = categoryProducts.filter(p => {
      // For pre-workout, all products in the category match the "Complex Formula" ingredient
      if (selectedCategory === 'pre_workout' && ['Complex Formula', 'Pre-Workout Formula'].includes(ingredientName)) {
        return true;
      }
      // For other categories, match by activeIngredient
      return (p.supplementInfo?.activeIngredient || p.activeIngredient) === ingredientName;
    });

    // For multi-ingredient products like pre-workout, extract all ingredients using the function
    // Pre-workout is always multi-ingredient, other categories depend on '+' or structured data
    const isMultiIngredient = selectedCategory === 'pre_workout' || ingredientName.includes('+');
    let allIngredients = [ingredientName];
    

    
    if (isMultiIngredient && matchingProducts.length > 0) {
      // Debug: Check what data we have
      const product = matchingProducts[0];
      console.log('🔍 Product data structure:', {
        name: product.name,
        hasStructuredIngredients: !!product.structuredIngredients,
        structuredKeys: product.structuredIngredients?.ingredients ? Object.keys(product.structuredIngredients.ingredients) : 'none',
        hasExtractionResult: !!product.extractionResult,
        extractionResultKeys: product.extractionResult?.structuredData?.ingredients ? Object.keys(product.extractionResult.structuredData.ingredients) : 'none',
        hasExtractedData: !!product.extractedData,
        extractedDataKeys: product.extractedData?.structuredData?.ingredients ? Object.keys(product.extractedData.structuredData.ingredients) : 'none',
        extractionMethod: product.extractionMethod,
        activeIngredient: product.supplementInfo?.activeIngredient || product.activeIngredient
      });
      
      // PRIORITY 1: Use extractProductIngredients to get actual ingredients (handles structured data properly)
      const extractedIngredients = extractProductIngredients(product);
      const extractedNames = extractedIngredients.map(ing => ing.name);
      
      // Check if we got meaningful ingredients from structured data specifically
      const hasStructuredIngredients = extractedIngredients.some(ing => ing.source === 'structured');
      
      // For pre-workouts, if we don't have structured data, use fallback regardless of what we extracted
      if (selectedCategory === 'pre_workout' && !hasStructuredIngredients) {
        allIngredients = ['caffeine', 'beta-alanine', 'l-citrulline', 'creatine monohydrate', 'taurine', 'l-tyrosine', 'l-theanine'];
        console.log('🔥 Using pre-workout fallback (no structured data available):', allIngredients);
      } else if (extractedNames.length > 0 && extractedNames[0] !== 'Unknown') {
        allIngredients = extractedNames;
        console.log('🎯 Using actual extracted ingredients:', allIngredients);
      } else {
        // Last resort fallback
        if (selectedCategory === 'pre_workout') {
          allIngredients = ['caffeine', 'beta-alanine', 'l-citrulline', 'creatine monohydrate', 'taurine', 'l-tyrosine', 'l-theanine'];
          console.log('🔥 Using pre-workout fallback (unknown ingredients):', allIngredients);
        } else {
          allIngredients = ingredientName.split(' + ').map(ing => ing.trim());
          console.log('🔗 Using "+" split ingredients:', allIngredients);
        }
      }
    } else if (isMultiIngredient) {
      // Fallback: for pre-workout category without products, provide common ingredients
      if (selectedCategory === 'pre_workout' || ingredientName === 'Complex Formula') {
        allIngredients = ['caffeine', 'beta-alanine', 'l-citrulline', 'creatine monohydrate', 'taurine', 'l-tyrosine', 'l-theanine'];
        console.log('🔥 Using pre-workout fallback (no products available):', allIngredients);
      } else {
        allIngredients = ingredientName.split(' + ').map(ing => ing.trim());
        console.log('🔗 Using "+" split fallback:', allIngredients);
      }
    }

    const cardKey = `${selectedCategory}-${ingredientName}`;
    const currentSelectedIngredient = selectedIngredient[cardKey] || allIngredients[0];
    const isExpanded = expandedIngredients[cardKey] || false;
    const currentQuality = getIngredientQuality(currentSelectedIngredient) || {
      score: null,
      description: 'Individual Choice - dosage and quality depend on specific product formulation',
      benefits: ['May provide energy and performance benefits'],
      drawbacks: ['Effects vary by individual'],
      considerations: 'Multi-ingredient formulas require individual ingredient analysis'
    };

    return (
      <div
        key={ingredientName}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: `1.5px solid ${getQualityColor(currentQuality?.score)}50`,
          padding: '1.5rem',
          marginBottom: '1rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header with quality score and ingredient selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            {/* Interactive ingredient selector for multi-ingredient products */}
            {isMultiIngredient ? (
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  textTransform: 'capitalize',
                  marginBottom: '1rem',
                  fontFamily: "'Manrope', sans-serif",
                }}>
                  {currentSelectedIngredient}
                </h3>

                {/* Ingredient selector - always visible */}
                <div style={{
                  background: 'var(--bg-page)',
                  borderRadius: '10px',
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  border: '1px solid var(--border)',
                }}>
                  {allIngredients.map(ingredient => (
                    <div
                      key={ingredient}
                      onClick={() => {
                        setSelectedIngredient(prev => ({
                          ...prev,
                          [cardKey]: ingredient
                        }));
                      }}
                      style={{
                        padding: '0.5rem 0.625rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: currentSelectedIngredient === ingredient ? 'var(--primary-light)' : 'transparent',
                        color: currentSelectedIngredient === ingredient ? '#00685f' : '#6d7a77',
                        fontSize: '0.875rem',
                        fontWeight: currentSelectedIngredient === ingredient ? 600 : 400,
                        textTransform: 'capitalize',
                        transition: 'all 0.15s ease',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {ingredient}
                    </div>
                  ))}
                </div>
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: "'Inter', sans-serif" }}>
                  Multi-ingredient formula · Select an ingredient to analyze
                </div>
              </div>
            ) : (
              <h3 style={{
                margin: 0, fontSize: '1.125rem', fontWeight: 700,
                color: 'var(--text-primary)', textTransform: 'capitalize', marginBottom: '0.5rem',
                fontFamily: "'Manrope', sans-serif",
              }}>
                {ingredientName}
              </h3>
            )}

            <p style={{
              margin: 0, fontSize: '0.875rem',
              color: getQualityColor(currentQuality?.score),
              fontWeight: 700, marginTop: '0.25rem',
              fontFamily: "'Inter', sans-serif",
            }}>
              {getQualityLabel(currentQuality?.score)} Quality
            </p>
            {matchingProducts.length > 0 && (
              <div style={{ marginTop: '0.375rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: "'Inter', sans-serif" }}>
                  Found in: {matchingProducts.map(p => `Product #${p.id}`).join(', ')}
                </span>
              </div>
            )}
          </div>
          
          {/* Quality Score Badge */}
          <div style={{
            background: `${getQualityColor(currentQuality?.score)}15`,
            border: `2px solid ${getQualityColor(currentQuality?.score)}`,
            borderRadius: '16px',
            padding: '0.75rem 1.25rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
          }}>
            <div style={{
              fontSize: currentQuality?.score === null ? '0.8125rem' : '1.5rem',
              fontWeight: 800,
              color: getQualityColor(currentQuality?.score),
              textAlign: 'center',
              fontFamily: "'Manrope', sans-serif",
            }}>
              {currentQuality?.score === null ? 'Individual\nChoice' : currentQuality?.score}
            </div>
            {currentQuality?.score !== null && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>/100</div>
            )}
          </div>
        </div>

        {/* Enhanced Dosage Analysis for current ingredient */}
        {matchingProducts.length > 0 && (
          (() => {
            const product = matchingProducts[0];
            
            // Use the enhanced dosage analysis function
            const dosageAnalysis = analyzeDosageFromStructured(currentSelectedIngredient, product);

            return (
              <div style={{
                background: `${dosageAnalysis.color}10`,
                border: `1px solid ${dosageAnalysis.color}40`,
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}>
                <h5 style={{
                  color: dosageAnalysis.color,
                  fontSize: '0.875rem', fontWeight: 700,
                  marginBottom: '0.75rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {dosageAnalysis.isAIGenerated ? '🤖' : '🎯'} Dosage Analysis: {currentSelectedIngredient}
                  {dosageAnalysis.isAIGenerated && (
                    <span style={{
                      background: 'var(--card-info-bg)', color: 'var(--card-info-heading)',
                      fontSize: '0.625rem', padding: '0.2rem 0.5rem',
                      borderRadius: '999px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      AI RECOMMENDED
                    </span>
                  )}
                </h5>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr',
                  gap: '1rem',
                  alignItems: 'center'
                }}>
                  <div style={{
                    padding: '0.75rem',
                    background: `${dosageAnalysis.color}20`,
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      color: dosageAnalysis.color, 
                      fontSize: '1rem', 
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {dosageAnalysis.message}
                    </div>
                    {dosageAnalysis.source && (
                      <div style={{ 
                        fontSize: '0.625rem', 
                        color: '#94a3b8',
                        marginTop: '0.25rem'
                      }}>
                        {dosageAnalysis.source}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{
                      color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 700,
                      marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif",
                    }}>
                      {dosageAnalysis.isAIGenerated ? 'Evidence-Based Recommendation:' : 'Recommendation:'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: '1.4', fontFamily: "'Inter', sans-serif" }}>
                      {dosageAnalysis.recommendation}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* Quality Details for current ingredient */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1rem', fontFamily: "'Inter', sans-serif" }}>
            {currentQuality?.description}
          </p>

          {currentQuality?.bioavailability && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { label: 'Bioavailability', value: currentQuality.bioavailability },
                { label: 'Absorption', value: currentQuality.absorption },
                { label: 'Side Effects', value: currentQuality.sideEffects },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.625rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif" }}>{label}</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif" }}>{value}</div>
                </div>
              ))}
            </div>
          )}
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
              },
              'caffeine': {
                generalUsage: 'Central nervous system stimulant that increases alertness, energy, and fat oxidation. Most researched pre-workout ingredient.',
                dosage: '100-200mg for beginners, 200-400mg for experienced users. Take 30-45 minutes before workout.',
                warnings: 'Start low to assess tolerance. Avoid late in day to prevent sleep disruption. Can cause jitters and anxiety in sensitive individuals.',
                inferiorForms: ['Caffeine from guarana (slower absorption)', 'Synthetic caffeine in excess (crash potential)']
              },
              'beta-alanine': {
                generalUsage: 'Amino acid that increases muscle carnosine levels, reducing fatigue and improving endurance in 1-4 minute high-intensity exercise.',
                dosage: '3-5g daily, split into 2-3 doses with meals to reduce tingling. Loading phase: 4-6 weeks for full benefits.',
                warnings: 'Causes harmless tingling sensation (paresthesia). Take with food to minimize tingling. Effects build over weeks, not immediate.',
                inferiorForms: ['Instant-release only (causes more tingling)', 'Under-dosed products (<2g per serving)']
              },
              'l-citrulline': {
                generalUsage: 'Amino acid that converts to arginine, increasing nitric oxide production for better blood flow and muscle pumps.',
                dosage: '6-8g for citrulline, 8-10g for citrulline malate. Take 30-45 minutes before workout on empty stomach.',
                warnings: 'Citrulline malate (2:1 ratio) may be more effective than pure L-citrulline. Higher doses needed compared to arginine.',
                inferiorForms: ['L-arginine (poor absorption)', 'Under-dosed citrulline (<4g)', 'Arginine HCl']
              },
              'creatine monohydrate': {
                generalUsage: 'Most researched supplement for strength, power, and muscle mass. Increases phosphocreatine stores for rapid ATP regeneration.',
                dosage: '5g daily, any time. Loading phase optional (20g/day for 5 days). Mix with warm water for better dissolution.',
                warnings: 'Monohydrate is the gold standard - avoid expensive alternatives. Drink plenty of water. May cause initial weight gain from water retention.',
                inferiorForms: ['Creatine HCl (no proven advantage)', 'Buffered creatine', 'Creatine ethyl ester', 'Liquid creatine (unstable)']
              },
              'taurine': {
                generalUsage: 'Conditionally essential amino acid that supports muscle function, hydration, and may reduce exercise-induced oxidative stress.',
                dosage: '1-3g daily. Often included in energy drinks and pre-workouts. Can be taken with or without food.',
                warnings: 'Generally safe with minimal side effects. May have calming effects that could counteract stimulants.',
                inferiorForms: ['Synthetic taurine in energy drinks (often under-dosed)', 'Low-quality generic taurine']
              },
              'l-tyrosine': {
                generalUsage: 'Amino acid precursor to dopamine and norepinephrine. May improve focus and reduce stress-induced cognitive decline.',
                dosage: '500mg-2g daily, preferably on empty stomach. Best taken away from protein meals for optimal absorption.',
                warnings: 'May interact with thyroid medications. Effects are subtle and individual. Best during high-stress periods or sleep deprivation.',
                inferiorForms: ['N-Acetyl L-Tyrosine (NALT) - lower conversion rate', 'Generic tyrosine (poor quality control)']
              },
              'l-theanine': {
                generalUsage: 'Amino acid from tea that promotes relaxation without sedation. Often paired with caffeine to reduce jitters and crash.',
                dosage: '100-200mg, typically with caffeine in 1:1 or 2:1 ratio (theanine:caffeine). Can be taken any time.',
                warnings: 'Very safe with minimal side effects. May reduce effectiveness of stimulants if over-dosed. Natural from green tea preferred.',
                inferiorForms: ['Synthetic theanine (less studied)', 'Under-dosed combination products']
              },
              'eaa': {
                generalUsage: 'Essential amino acids that cannot be produced by the body. Complete protein building blocks for muscle protein synthesis.',
                dosage: '10-15g during or around workouts. Can replace BCAA supplements with superior amino acid profile.',
                warnings: 'EAAs are superior to BCAAs as they contain all essential amino acids. Look for proper ratios with high leucine content.',
                inferiorForms: ['BCAA-only supplements (incomplete profile)', 'Low leucine EAA blends', 'Generic amino acid blends']
              },
              'bcaa': {
                generalUsage: 'Branched-chain amino acids (leucine, isoleucine, valine) for muscle protein synthesis and recovery.',
                dosage: '5-10g before, during, or after workouts. 2:1:1 leucine ratio preferred.',
                warnings: '⚠️ EAAs are generally superior to BCAAs. BCAAs alone may impair protein synthesis without other essential amino acids.',
                inferiorForms: ['Wrong ratios (not 2:1:1)', 'Under-dosed leucine content', 'Generic BCAA blends without quality testing']
              },
              'l-glutamine': {
                generalUsage: 'Conditionally essential amino acid for gut health, immune function, and recovery. Most abundant amino acid in muscle.',
                dosage: '5-15g daily, post-workout or before bed. Can be mixed with water or protein shakes.',
                warnings: 'Benefits are subtle for healthy individuals. Most beneficial during high training volume or stress. Often over-hyped in marketing.',
                inferiorForms: ['Generic L-glutamine (poor solubility)', 'Glutamine peptides (unnecessary premium)', 'Under-dosed products']
              }
            };
            
            const key = ingredient?.toLowerCase().replace(/\s+/g, ' ').trim();
            return supplementDB[key] || {
              generalUsage: `${ingredient} is a supplement ingredient. Research the specific benefits and mechanisms for this compound.`,
              dosage: 'Consult product label and healthcare provider for proper dosing guidance. Follow manufacturer recommendations.',
              warnings: 'Research this ingredient thoroughly before use. Check for potential interactions with medications or health conditions.',
              inferiorForms: ['Generic or low-quality versions', 'Under-dosed products', 'Poor manufacturing standards']
            };
          };

          const suppInfo = getSupplementInfo(currentSelectedIngredient);

          return (
            <>
              {/* General Usage */}
              <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '12px', padding: '1rem', marginBottom: '0.875rem' }}>
                <h5 style={{ color: '#00685f', fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.5rem', fontFamily: "'Inter', sans-serif" }}>
                  📋 General Supplement Usage
                </h5>
                <p style={{ color: '#3f6560', fontSize: '0.875rem', lineHeight: '1.6', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  {suppInfo.generalUsage}
                </p>
              </div>

              {/* Dosage Recommendations */}
              <div style={{ background: 'var(--card-info-bg)', border: '1px solid var(--card-info-border)', borderRadius: '12px', padding: '1rem', marginBottom: '0.875rem' }}>
                <h5 style={{ color: 'var(--card-info-heading)', fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.5rem', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Target size={14} />
                  Dosage Recommendations
                </h5>
                <p style={{ color: 'var(--card-info-text)', fontSize: '0.875rem', lineHeight: '1.6', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  {suppInfo.dosage}
                </p>
              </div>

              {/* Warnings and Inferior Ingredients */}
              <div style={{ background: 'var(--card-warning-bg)', border: '1px solid var(--card-warning-border)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                <h5 style={{ color: 'var(--card-warning-heading)', fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.5rem', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Warning size={14} />
                  Important Warnings
                </h5>
                <p style={{
                  color: 'var(--card-warning-text)', fontSize: '0.875rem', lineHeight: '1.6',
                  margin: 0, marginBottom: suppInfo.inferiorForms.length > 0 ? '0.75rem' : 0,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {suppInfo.warnings}
                </p>

                {suppInfo.inferiorForms.length > 0 && (
                  <div>
                    <div style={{ color: 'var(--card-danger-heading)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <XCircle size={12} /> AVOID these inferior forms:
                    </div>
                    {suppInfo.inferiorForms.map((form, idx) => (
                      <div key={idx} style={{ color: 'var(--card-danger-text)', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'Inter', sans-serif" }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--card-danger-heading)', flexShrink: 0 }} />
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

        {currentQuality?.score === null && currentQuality?.considerations && (
          <div style={{ background: 'var(--card-purple-bg)', border: '1px solid var(--card-purple-border)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
            <h5 style={{ color: 'var(--card-purple-heading)', fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.5rem', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Info size={14} />
              Individual Considerations
            </h5>
            <p style={{ color: 'var(--card-purple-text)', fontSize: '0.875rem', lineHeight: '1.6', margin: 0, fontFamily: "'Inter', sans-serif" }}>
              {currentQuality.considerations}
            </p>
          </div>
        )}

        {/* Benefits and Drawbacks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'var(--card-success-bg)', border: '1px solid var(--card-success-border)', borderRadius: '12px', padding: '1rem' }}>
            <h5 style={{ color: 'var(--card-success-heading)', fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: "'Inter', sans-serif" }}>
              <CheckCircle size={14} />
              Benefits
            </h5>
            {currentQuality?.benefits?.map((benefit, idx) => (
              <div key={idx} style={{ color: 'var(--card-success-text)', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'Inter', sans-serif" }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--card-success-heading)', flexShrink: 0 }} />
                {benefit}
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--card-danger-bg)', border: '1px solid var(--card-danger-border)', borderRadius: '12px', padding: '1rem' }}>
            <h5 style={{ color: 'var(--card-danger-heading)', fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: "'Inter', sans-serif" }}>
              <XCircle size={14} />
              Drawbacks
            </h5>
            {currentQuality?.drawbacks?.map((drawback, idx) => (
              <div key={idx} style={{ color: 'var(--card-danger-text)', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'Inter', sans-serif" }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--card-danger-heading)', flexShrink: 0 }} />
                {drawback}
              </div>
            ))}
          </div>
        </div>

        {matchingProducts.length > 0 && (
          <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '12px', padding: '1rem' }}>
            <h5 style={{ color: '#00685f', fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: "'Inter', sans-serif" }}>
              <Info size={14} />
              Your Products Using This Ingredient
            </h5>
            {matchingProducts.map((product, idx) => (
              <div key={idx} style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', fontFamily: "'Manrope', sans-serif" }}>
                {product.name}
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
        background: 'var(--bg-surface)',
        border: '1.5px solid var(--border)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{
            color: '#00685f', fontSize: '1.125rem', fontWeight: 800,
            marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: "'Manrope', sans-serif",
          }}>
            <Scales size={20} />
            Quality Comparison: {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Best Option */}
            <div style={{ background: 'var(--card-success-bg)', border: '1.5px solid var(--card-success-border)', borderRadius: '14px', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{
                background: '#16a34a', color: '#ffffff',
                padding: '0.35rem 0.875rem', borderRadius: '999px',
                fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.875rem',
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                fontFamily: "'Inter', sans-serif",
              }}>
                <ArrowUp size={12} />
                BEST QUALITY
              </div>

              <h4 style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 800, margin: '0 0 0.375rem', textTransform: 'capitalize', fontFamily: "'Manrope', sans-serif" }}>
                {best.name}
              </h4>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.375rem', fontFamily: "'Manrope', sans-serif" }}>
                {best.quality.score}/100
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                {best.quality.description}
              </p>
            </div>

            {/* Second Option */}
            <div style={{
              background: isCloseComparison ? 'var(--card-success-bg)' : 'var(--card-danger-bg)',
              border: `1.5px solid ${isCloseComparison ? 'var(--card-success-border)' : 'var(--card-danger-border)'}`,
              borderRadius: '14px', padding: '1.25rem', textAlign: 'center',
            }}>
              <div style={{
                background: isCloseComparison ? '#16a34a' : '#dc2626',
                color: '#ffffff',
                padding: '0.35rem 0.875rem', borderRadius: '999px',
                fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.875rem',
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                fontFamily: "'Inter', sans-serif",
              }}>
                {isCloseComparison ? (
                  <><CheckCircle size={12} />{isSameScore ? 'EQUALLY GOOD' : 'GOOD OPTION'}</>
                ) : (
                  <><ArrowDown size={12} />AVOID IF POSSIBLE</>
                )}
              </div>

              <h4 style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 800, margin: '0 0 0.375rem', textTransform: 'capitalize', fontFamily: "'Manrope', sans-serif" }}>
                {worst.name}
              </h4>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: isCloseComparison ? '#16a34a' : '#dc2626', marginBottom: '0.375rem', fontFamily: "'Manrope', sans-serif" }}>
                {worst.quality.score}/100
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                {worst.quality.description}
              </p>
            </div>
          </div>

          {/* Quality Gap */}
          <div style={{
            textAlign: 'center', marginTop: '1rem', padding: '0.875rem',
            background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '12px',
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#00685f', marginBottom: '0.25rem', fontFamily: "'Manrope', sans-serif" }}>
              Quality Gap: {qualityGap} points
            </div>
            <p style={{ color: '#3f6560', fontSize: '0.8125rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
              {isSameScore
                ? 'Both options have identical quality scores — choose based on preference'
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

  // Check if any product has protein quality data
  const getProteinQualityData = () => {
    for (const products of Object.values(analyzedProducts)) {
      for (const product of products as any[]) {
        if (product.proteinQuality) return { quality: product.proteinQuality, product };
        if (product.qualityAnalysis?.proteinQuality) return { quality: product.qualityAnalysis.proteinQuality, product };
      }
    }
    return null;
  };

  const proteinData = getProteinQualityData();

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#16a34a';
    if (score >= 6) return '#65a30d';
    if (score >= 4) return '#ca8a04';
    if (score >= 3) return '#ea580c';
    return '#dc2626';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Average';
    if (score >= 3) return 'Below Average';
    return 'Poor';
  };

  const renderProteinQualitySection = () => {
    if (!proteinData) return null;
    const { quality, product } = proteinData;
    const scoreColor = getScoreColor(quality.score);

    return (
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '16px',
        border: `1.5px solid ${scoreColor}40`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        marginBottom: '1.5rem',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: `${scoreColor}10`, padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{
            fontSize: '1.25rem', fontWeight: 800, color: scoreColor,
            margin: '0 0 0.25rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: "'Manrope', sans-serif",
          }}>
            <Shield size={20} />
            Protein Quality Analysis
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
            {(product as any).name || 'Protein Product'}
          </p>
        </div>

        <div style={{ padding: '1.5rem' }}>
        {/* Score Display */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            background: `${scoreColor}10`, border: `2px solid ${scoreColor}`,
            borderRadius: '16px', padding: '1.25rem 2.5rem',
            display: 'flex', alignItems: 'center', gap: '1.25rem',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: scoreColor, lineHeight: 1, fontFamily: "'Manrope', sans-serif" }}>
                {quality.score}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>/10</div>
            </div>
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: scoreColor, marginBottom: '0.125rem', fontFamily: "'Manrope', sans-serif" }}>
                {getScoreLabel(quality.score)}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>Quality Score</div>
            </div>
          </div>
        </div>

        {/* Protein Sources */}
        {quality.proteinSources && quality.proteinSources.length > 0 && (
          <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <h4 style={{ color: '#00685f', fontSize: '1rem', fontWeight: 700, margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'Manrope', sans-serif" }}>
              <Flask size={18} />
              Protein Sources
            </h4>
            {quality.proteinSources.map((source: any, idx: number) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.625rem',
                padding: '0.625rem 0.75rem',
                background: 'var(--bg-surface)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: source.quality === 'excellent' ? '#16a34a' :
                              source.quality === 'good' ? '#65a30d' :
                              source.quality === 'decent' ? '#ca8a04' : '#dc2626',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.875rem', fontFamily: "'Manrope', sans-serif" }}>
                    {source.name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: "'Inter', sans-serif" }}>
                    {source.reason}
                  </div>
                </div>
                <div style={{
                  marginLeft: 'auto', padding: '0.2rem 0.625rem',
                  borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                  textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
                  background: source.quality === 'excellent' ? 'var(--card-success-bg)' :
                              source.quality === 'good' ? 'var(--card-success-bg)' :
                              source.quality === 'decent' ? 'var(--card-warning-bg)' : 'var(--card-danger-bg)',
                  color: source.quality === 'excellent' ? '#16a34a' :
                         source.quality === 'good' ? '#65a30d' :
                         source.quality === 'decent' ? '#ca8a04' : '#dc2626',
                }}>
                  {source.quality}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Concerns and Positives Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: quality.concerns?.length > 0 && quality.positives?.length > 0 ? '1fr 1fr' : '1fr',
          gap: '1rem', marginBottom: '1.25rem',
        }}>
          {quality.concerns && quality.concerns.length > 0 && (
            <div style={{ background: 'var(--card-danger-bg)', border: '1px solid var(--card-danger-border)', borderRadius: '14px', padding: '1.25rem' }}>
              <h4 style={{ color: '#dc2626', fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'Manrope', sans-serif" }}>
                <WarningCircle size={18} />
                Sketchy Ingredients ({quality.concerns.length})
              </h4>
              {quality.concerns.map((concern: any, idx: number) => (
                <div key={idx} style={{
                  marginBottom: '0.625rem', padding: '0.625rem 0.75rem',
                  background: 'var(--bg-surface)', borderRadius: '10px',
                  borderLeft: `3px solid ${concern.severity === 'high' ? '#dc2626' : concern.severity === 'medium' ? '#ea580c' : '#ca8a04'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.875rem', fontFamily: "'Manrope', sans-serif" }}>{concern.name}</span>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: '999px',
                      fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase',
                      fontFamily: "'Inter', sans-serif",
                      background: concern.severity === 'high' ? 'var(--card-danger-bg)' : concern.severity === 'medium' ? 'var(--card-warning-bg)' : 'var(--card-warning-bg)',
                      color: concern.severity === 'high' ? '#dc2626' : concern.severity === 'medium' ? '#ea580c' : '#ca8a04',
                    }}>
                      {concern.severity}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: '1.4', fontFamily: "'Inter', sans-serif" }}>{concern.reason}</div>
                </div>
              ))}
            </div>
          )}

          {quality.positives && quality.positives.length > 0 && (
            <div style={{ background: 'var(--card-success-bg)', border: '1px solid var(--card-success-border)', borderRadius: '14px', padding: '1.25rem' }}>
              <h4 style={{ color: '#16a34a', fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'Manrope', sans-serif" }}>
                <CheckCircle size={18} />
                Good Ingredients ({quality.positives.length})
              </h4>
              {quality.positives.map((positive: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '0.625rem', padding: '0.625rem 0.75rem', background: 'var(--bg-surface)', borderRadius: '10px', borderLeft: '3px solid #16a34a' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.2rem', fontFamily: "'Manrope', sans-serif" }}>{positive.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: '1.4', fontFamily: "'Inter', sans-serif" }}>{positive.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {quality.ingredientBreakdown && quality.ingredientBreakdown.length > 0 && (
          <div style={{ background: 'var(--bg-page)', borderRadius: '14px', padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'Manrope', sans-serif" }}>
              <Info size={18} color="#00685f" />
              Ingredient Breakdown
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {quality.ingredientBreakdown.map((item: any, idx: number) => (
                <span key={idx} style={{
                  padding: '0.35rem 0.75rem', borderRadius: '999px',
                  fontSize: '0.75rem', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                  background: item.category === 'good' ? 'var(--card-success-bg)' : item.category === 'sketchy' ? 'var(--card-danger-bg)' : 'var(--bg-page)',
                  color: item.category === 'good' ? 'var(--card-success-heading)' : item.category === 'sketchy' ? 'var(--card-danger-heading)' : 'var(--text-secondary)',
                  border: `1px solid ${item.category === 'good' ? 'var(--card-success-border)' : item.category === 'sketchy' ? 'var(--card-danger-border)' : 'var(--border)'}`,
                }}>
                  {item.category === 'good' ? '+ ' : item.category === 'sketchy' ? '− ' : ''}{item.name}
                </span>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Protein Quality Section - Render first if protein product detected */}
      {renderProteinQualitySection()}

      {/* Main card */}
      <div style={{
        background: 'var(--bg-surface)', borderRadius: '16px',
        border: '1.5px solid var(--border)', padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1.5rem',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)',
            margin: '0 0 0.25rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: "'Manrope', sans-serif",
          }}>
            <Flask size={20} color="#00685f" />
            Ingredient Quality Analysis
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Compare supplement forms to make informed purchasing decisions
          </p>
        </div>

        {/* Category Selection */}
        {availableCategories.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block', fontSize: '0.875rem', fontWeight: 600,
              color: 'var(--text-muted)', marginBottom: '0.75rem', fontFamily: "'Inter', sans-serif",
            }}>
              🔬 Supplement categories available for analysis:
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {allCategories
                .filter(cat => availableCategories.includes(cat.key))
                .map(category => (
                  <div
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    style={{
                      background: selectedCategory === category.key ? 'var(--primary-light)' : 'var(--bg-page)',
                      border: selectedCategory === category.key ? '1.5px solid #00685f' : '1.5px solid var(--border)',
                      borderRadius: '12px', padding: '1rem',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                  >
                    <h3 style={{
                      margin: '0 0 0.25rem', fontSize: '0.9375rem', fontWeight: 700,
                      color: selectedCategory === category.key ? '#00685f' : '#171d1c',
                      fontFamily: "'Manrope', sans-serif",
                    }}>
                      {category.label}
                    </h3>
                    <p style={{ margin: '0 0 0.375rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
                      {category.description}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#00685f', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                      {(analyzedProducts[category.key] || []).length} products found
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* No products warning */}
        {availableCategories.length === 0 && (
          <div style={{ background: 'var(--card-orange-bg)', border: '1px solid var(--card-orange-border)', borderRadius: '14px', padding: '1.75rem', textAlign: 'center' }}>
            <Warning size={36} color="#ea580c" style={{ marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
            <h3 style={{ color: 'var(--card-orange-heading)', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.375rem', fontFamily: "'Manrope', sans-serif" }}>
              No Supplement Data Available
            </h3>
            <p style={{ color: 'var(--card-orange-text)', fontSize: '0.875rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
              Add supplement products with URLs to see ingredient quality analysis
            </p>
          </div>
        )}

        {/* Category Comparison */}
        {selectedCategory && renderCategoryComparison()}

        {/* Individual Ingredient Cards */}
        {selectedCategory && categoryProducts.length > 0 && (
          <div>
            <h3 style={{
              color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 800,
              marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontFamily: "'Manrope', sans-serif",
            }}>
              <Info size={18} color="#00685f" />
              Detailed Analysis
            </h3>

            {categoryIngredients.length > 0 ? (
              categoryIngredients.map(ingredient => renderIngredientCard(ingredient))
            ) : (
              <div style={{ background: 'var(--card-orange-bg)', border: '1px solid var(--card-orange-border)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                <h4 style={{ color: 'var(--card-orange-heading)', marginBottom: '0.375rem', fontFamily: "'Manrope', sans-serif" }}>No ingredients found</h4>
                <p style={{ color: 'var(--card-orange-text)', fontSize: '0.875rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  Products in this category don't have extractable ingredient data.
                  Check console logs for debugging information.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}