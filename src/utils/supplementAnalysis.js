import { ingredientQuality, supplementCategories, getIngredientQuality } from '../data/supplementData.js';

// Utility functions for supplement analysis and cost calculations

/**
 * Parse active ingredient information from product name/description
 * @param {string} productName - Product name or description
 * @param {string} unit - Product unit (capsules, tablets, g, ml, etc.)
 * @param {number} quantity - Total quantity in the package
 * @returns {object} - Parsed supplement information
 */
export const parseSupplementInfo = (productName, unit, quantity) => {
  const name = productName.toLowerCase();
  
  // Common patterns for extracting supplement information
  const patterns = {
    // Magnesium patterns (Swedish + English)
    magnesium: {
      regex: /magnesium\s*(bisglycinate|glycinate|malate|citrate|oxide|chelate|kelat|bisglycinat)?\s*(\d+)\s*(mg|milligram)/i,
      category: 'magnesium',
      extractDosage: (match) => parseInt(match[2]),
      extractForm: (match) => {
        const form = match[1]?.toLowerCase();
        if (form === 'kelat' || form === 'chelate') return 'magnesium bisglycinate';
        if (form === 'bisglycinat') return 'magnesium bisglycinate';
        return match[1] ? `magnesium ${form}` : 'magnesium';
      },
    },
    // Vitamin D patterns (Swedish + English)
    vitaminD: {
      regex: /(?:vitamin\s*d3?|d-vitamin|d3)\s*(\d+)\s*(iu|ie|mcg|µg|mikrogram)/i,
      category: 'vitamin_d',
      extractDosage: (match) => {
        const dose = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        // Convert mcg/µg to IU (1 mcg = 40 IU)
        return unit.includes('iu') || unit.includes('ie') ? dose : dose * 40;
      },
      extractForm: () => 'cholecalciferol',
    },
    // Protein patterns (Swedish + English)
    protein: {
      regex: /(?:protein|vassleprotein).*?(\d+)\s*g|(\d+)g.*?(?:protein|vassle)/i,
      category: 'protein',
      extractDosage: (match) => parseInt(match[1] || match[2]),
      extractForm: (match) => {
        if (name.includes('isolat') || name.includes('isolate')) return 'whey protein isolate';
        if (name.includes('koncentrat') || name.includes('concentrate')) return 'whey protein concentrate';
        if (name.includes('kasein') || name.includes('casein')) return 'casein protein';
        if (name.includes('vassle') || name.includes('whey')) return 'whey protein concentrate';
        return 'protein';
      },
    },
    // Omega-3 patterns (Swedish + English)
    omega3: {
      regex: /(?:omega.?3|fiskolja).*?(\d+)\s*mg|(?:epa|dha).*?(\d+)\s*mg/i,
      category: 'omega_3',
      extractDosage: (match) => parseInt(match[1] || match[2]),
      extractForm: () => {
        if (name.includes('triglycerid') || name.includes('triglyceride')) return 'triglyceride form';
        if (name.includes('etylester') || name.includes('ethyl ester')) return 'ethyl ester';
        if (name.includes('fiskolja')) return 'fish oil';
        return 'fish oil';
      },
    },
    // Creatine patterns (Swedish + English)
    creatine: {
      regex: /(?:creatine|kreatin).*?(\d+)\s*g|(\d+)g.*?(?:creatine|kreatin)/i,
      category: 'creatine',
      extractDosage: (match) => parseInt(match[1] || match[2]) * 1000, // Convert g to mg
      extractForm: () => {
        if (name.includes('monohydrat') || name.includes('monohydrate')) return 'creatine monohydrate';
        if (name.includes('etylester') || name.includes('ethyl ester')) return 'creatine ethyl ester';
        return 'creatine monohydrate';
      },
    },
    // Amino Acids patterns (Swedish + English)
    aminoAcids: {
      regex: /(?:amino|bcaa|eaa|essential amino acids|branched chain amino acids).*?(\d+)\s*g|(\d+)g.*?(?:amino|bcaa|eaa)/i,
      category: 'amino_acids',
      extractDosage: (match) => parseInt(match[1] || match[2]) * 1000, // Convert g to mg
      extractForm: () => {
        if (name.includes('essential amino acids') || name.includes('eaa') || name.includes('aminosyror')) return 'essential amino acids';
        if (name.includes('branched chain amino acids') || name.includes('bcaa') || name.includes('grenade kedja')) return 'branched chain amino acids';
        return 'branched chain amino acids'; // Default to BCAA if unclear
      },
    },
    // Pre-workout patterns (Swedish + English)
    preWorkout: {
      regex: /(?:pre-workout|pwo|preworkout|caffeine|koffein).*?(\d+)\s*mg|(\d+)mg.*?(?:caffeine|koffein)|(?:pre-workout|pwo|preworkout|supreme pwo)/i,
      category: 'pre_workout',
      extractDosage: (match) => {
        // If we have a caffeine dosage, use it; otherwise default to 200mg for generic pre-workout
        if (match[1] || match[2]) {
          return parseInt(match[1] || match[2]); // Already in mg
        }
        return 200; // Default caffeine amount for pre-workout
      },
      extractForm: () => {
        if (name.includes('caffeine') || name.includes('koffein')) return 'caffeine';
        if (name.includes('beta-alanine') || name.includes('beta alanin')) return 'beta-alanine';
        if (name.includes('citrulline') || name.includes('citrullin')) return 'l-citrulline';
        if (name.includes('pwo') || name.includes('pre-workout') || name.includes('preworkout')) return 'caffeine'; // Default to caffeine for PWO
        return 'caffeine'; // Default to caffeine for pre-workout
      },
    }
  };

  // Try to match each pattern
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = name.match(pattern.regex);
    if (match) {
      const dosagePerUnit = pattern.extractDosage(match);
      const form = pattern.extractForm(match);
      const quality = getIngredientQuality(form);
      
      return {
        category: pattern.category,
        activeIngredient: form,
        dosagePerUnit, // mg or IU per capsule/tablet/serving
        totalDosage: dosagePerUnit * quantity,
        quality: quality || { score: 50, description: 'Unknown quality' },
        unit: unit === 'g' ? 'servings' : unit // Assume powder products are measured in servings
      };
    }
  }

  return null; // No supplement pattern found
};

/**
 * Calculate cost per active ingredient
 * @param {number} price - Total price
 * @param {object} supplementInfo - Parsed supplement information
 * @returns {object} - Cost analysis
 */
export const calculateNutrientCost = (price, supplementInfo) => {
  console.log('🧮 calculateNutrientCost input:', { price, supplementInfo });
  
  if (!supplementInfo || !supplementInfo.dosagePerUnit || !supplementInfo.totalDosage) {
    console.log('❌ Missing required supplement info for cost calculation');
    return null;
  }

  const costPerMg = price / supplementInfo.totalDosage; // Cost per mg/IU
  const costPer100mg = costPerMg * 100; // Standardized cost per 100mg
  const costPerUnit = costPerMg * supplementInfo.dosagePerUnit; // Cost per capsule/tablet
  const valueScore = calculateValueScore(costPerMg, supplementInfo.quality?.score || 50);
  
  const result = {
    costPerMg,
    costPer100mg,
    costPerUnit,
    totalActiveIngredient: supplementInfo.totalDosage,
    valueScore
  };
  
  console.log('🧮 Calculated nutrient cost:', result);
  return result;
};

/**
 * Calculate overall value score (considers both price and quality)
 * @param {number} costPerMg - Cost per mg of active ingredient
 * @param {number} qualityScore - Quality score (0-100)
 * @returns {number} - Value score (higher is better)
 */
const calculateValueScore = (costPerMg, qualityScore) => {
  // Normalize cost (lower cost = higher value)
  const costScore = Math.max(0, 100 - (costPerMg * 1000)); // Scale cost appropriately
  
  // Combine quality and cost (60% quality, 40% cost)
  return (qualityScore * 0.6) + (costScore * 0.4);
};

/**
 * Compare supplements by their nutrient value
 * @param {array} products - Array of product objects with price, name, quantity, unit
 * @returns {object} - Products grouped by category with analysis
 */
export const compareSupplementValue = (products) => {
  console.log('🔍 compareSupplementValue input products:', products);
  
  const analyzed = products
    .map(product => {
      // Try AI-extracted data first, then fall back to regex parsing
      let supplementInfo = null;
      let nutrientCost = null;
      
      console.log(`🔍 Analyzing product: ${product.name}`);
      console.log('🔍 Product URL:', product.url || 'No URL available');
      console.log('AI extracted data:', {
        activeIngredient: product.activeIngredient,
        dosagePerUnit: product.dosagePerUnit,
        servingSize: product.servingSize,
        servingsPerContainer: product.servingsPerContainer
      });
      
      if (product.activeIngredient && product.dosagePerUnit && 
          product.dosagePerUnit !== 'N/A' && product.dosagePerUnit !== '' && 
          product.dosagePerUnit !== 'null' && product.dosagePerUnit !== null) {
        // Use AI-extracted supplement data
        const dosage = parseFloat(product.dosagePerUnit);
        const ingredient = product.activeIngredient.toLowerCase();
        const quantity = parseFloat(product.quantity) || 1;
        const servingSize = parseFloat(product.servingSize) || 1;
        const servingsPerContainer = parseFloat(product.servingsPerContainer) || quantity;
        
        console.log('🔍 RAW VALUES FROM AI:', {
          rawDosagePerUnit: product.dosagePerUnit,
          rawServingSize: product.servingSize,
          rawServingsPerContainer: product.servingsPerContainer,
          rawQuantity: product.quantity
        });
        
        console.log('Parsed values:', { dosage, ingredient, quantity, servingSize, servingsPerContainer });
        
        // Check if dosage is valid after parsing
        if (isNaN(dosage) || dosage <= 0) {
          console.log('❌ Invalid dosage after parsing, falling back to regex extraction');
          supplementInfo = parseSupplementInfo(product.name, product.unit, product.quantity);
          nutrientCost = supplementInfo ? calculateNutrientCost(parseFloat(product.price), supplementInfo) : null;
          console.log('Regex fallback supplementInfo:', supplementInfo);
          console.log('Regex fallback nutrientCost:', nutrientCost);
        } else {
          const calculatedTotalDosage = dosage * servingsPerContainer;
          console.log('🧮 DOSAGE CALCULATION:', {
            dosagePerUnit: dosage,
            servingsPerContainer: servingsPerContainer,
            totalDosage: calculatedTotalDosage,
            calculation: `${dosage} × ${servingsPerContainer} = ${calculatedTotalDosage}`
          });

          let category = 'other';
          const productNameLower = product.name.toLowerCase();
          
          // PRIORITY: Check for pre-workout first (PWO products often contain multiple ingredients)
          if (productNameLower.includes('pwo') || productNameLower.includes('pre-workout') || productNameLower.includes('preworkout') ||
              ingredient.includes('caffeine') || ingredient.includes('beta-alanine') || ingredient.includes('citrulline') || 
              ingredient.includes('pre-workout') || ingredient.includes('pwo') || productNameLower.includes('koffein')) {
            category = 'pre_workout';
          }
          // Then check other categories
          else if (ingredient.includes('magnesium') || productNameLower.includes('magnesium')) category = 'magnesium';
          else if (ingredient.includes('protein') || ingredient.includes('whey') || ingredient.includes('casein') || productNameLower.includes('protein') || productNameLower.includes('whey')) category = 'protein';
          else if (ingredient.includes('vitamin d') || ingredient.includes('d-vitamin') || ingredient.includes('cholecalciferol') || productNameLower.includes('vitamin d') || productNameLower.includes('d-vitamin')) category = 'vitamin_d';
          else if (ingredient.includes('omega') || ingredient.includes('fiskolja') || ingredient.includes('epa') || ingredient.includes('dha') || productNameLower.includes('omega') || productNameLower.includes('fiskolja')) category = 'omega_3';
          else if (ingredient.includes('kreatin') || ingredient.includes('creatine') || productNameLower.includes('kreatin') || productNameLower.includes('creatine')) category = 'creatine';
          else if (ingredient.includes('essential amino acids') || ingredient.includes('eaa') || ingredient.includes('aminosyror') || productNameLower.includes('eaa') || productNameLower.includes('essential amino')) category = 'amino_acids';
          else if (ingredient.includes('branched chain amino acids') || ingredient.includes('bcaa') || ingredient.includes('grenade kedjeaminosyror') || productNameLower.includes('bcaa')) category = 'amino_acids';
          
          const quality = getIngredientQuality(ingredient) || { 
            score: 70, 
            description: 'Standard quality supplement',
            bioavailability: 'Good',
            absorption: '~70%',
            sideEffects: 'Low',
            benefits: ['Standard benefits'],
            drawbacks: ['Standard drawbacks'],
            category: category
          };

          supplementInfo = {
            category,
            activeIngredient: product.activeIngredient,
            dosagePerUnit: dosage,
            servingSize: servingSize,
            totalDosage: calculatedTotalDosage,
            totalServings: servingsPerContainer,
            unit: product.unit,
            quality
          };
          
          console.log('✅ FINAL supplementInfo:', supplementInfo);
          
          nutrientCost = calculateNutrientCost(parseFloat(product.price), supplementInfo);
          console.log('Calculated nutrientCost:', nutrientCost);
        }
      } else {
        // Fall back to regex parsing for products without AI data
        console.log('No AI data, falling back to regex parsing');
        supplementInfo = parseSupplementInfo(product.name, product.unit, product.quantity);
        nutrientCost = supplementInfo ? calculateNutrientCost(parseFloat(product.price), supplementInfo) : null;
        console.log('Regex parsed supplementInfo:', supplementInfo);
        console.log('Regex calculated nutrientCost:', nutrientCost);
      }
      
      const result = {
        ...product,
        supplementInfo,
        nutrientCost,
        pricePerUnit: parseFloat(product.price) / parseFloat(product.quantity)
      };
      
      console.log('Final analyzed product:', result);
      return result;
    })
    .filter(product => {
      const hasData = product.supplementInfo && product.nutrientCost;
      console.log(`Product ${product.name} has analysis data: ${hasData}`);
      return hasData;
    });
    
  console.log('📊 Analyzed products:', analyzed);

  // Group by supplement category
  const byCategory = analyzed.reduce((acc, product) => {
    const category = product.supplementInfo.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {});

  // Sort each category by value score
  Object.keys(byCategory).forEach(category => {
    byCategory[category].sort((a, b) => b.nutrientCost.valueScore - a.nutrientCost.valueScore);
  });

  return byCategory;
};

/**
 * Get quality warnings and recommendations
 * @param {object} supplementInfo - Parsed supplement information
 * @returns {object} - Warnings and recommendations
 */
export const getQualityInsights = (supplementInfo) => {
  if (!supplementInfo || !supplementInfo.quality) return null;

  const quality = supplementInfo.quality;
  const category = supplementInfo.category;
  const categoryData = supplementCategories[category];

  const insights = {
    qualityWarnings: [],
    recommendations: [],
    qualityScore: quality.score
  };

  // Quality-based warnings
  if (quality.score < 50) {
    insights.qualityWarnings.push({
      type: 'poor_quality',
      message: `Poor quality ingredient: ${supplementInfo.activeIngredient}`,
      severity: 'high',
      explanation: quality.description
    });
  }

  if (quality.score < 70) {
    insights.qualityWarnings.push({
      type: 'suboptimal_form',
      message: 'Suboptimal ingredient form detected',
      severity: 'medium',
      explanation: `Consider upgrading to: ${quality.category === 'magnesium' ? 'magnesium bisglycinate' : 'higher quality form'}`
    });
  }

  // Dosage-based recommendations
  if (categoryData) {
    const optimalDose = parseInt(categoryData.optimalDailyDose.match(/\d+/)[0]);
    if (supplementInfo.dosagePerUnit < optimalDose * 0.5) {
      insights.recommendations.push({
        type: 'low_dosage',
        message: 'Dosage may be too low for therapeutic effect',
        suggestion: `Consider ${optimalDose}mg daily for optimal benefits`
      });
    }

    // Convert both dosage and max safe dose to mg for accurate comparison
    const convertToMg = (doseString) => {
      const match = doseString.match(/(\d+(?:\.\d+)?)\s*(mg|g|mcg|μg)/i);
      if (!match) return null;
      
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      
      switch(unit) {
        case 'g': return value * 1000;
        case 'mg': return value;
        case 'mcg':
        case 'μg': return value / 1000;
        default: return value;
      }
    };

    const maxSafeDoseMg = convertToMg(categoryData.maxSafeDose);
    const currentDosageMg = supplementInfo.dosagePerUnit; // Already in mg

    if (maxSafeDoseMg && currentDosageMg > maxSafeDoseMg) {
      insights.qualityWarnings.push({
        type: 'high_dosage',
        message: 'Dosage exceeds recommended safe limit',
        severity: 'high',
        explanation: `Maximum safe dose is ${categoryData.maxSafeDose} (${maxSafeDoseMg}mg), current dose is ${currentDosageMg}mg`
      });
    }
  }

  return insights;
};

/**
 * Generate supplement recommendations based on analyzed products
 * @param {object} analyzedProducts - Products grouped by category
 * @returns {array} - Actionable recommendations
 */
export const generateRecommendations = (analyzedProducts) => {
  const recommendations = [];

  Object.entries(analyzedProducts).forEach(([category, products]) => {
    if (products.length === 0) return;

    const bestValue = products[0]; // Already sorted by value score
    const worstValue = products[products.length - 1];
    const categoryData = supplementCategories[category];

    // Best value recommendation
    recommendations.push({
      type: 'best_value',
      category,
      product: bestValue,
      message: `Best ${category} value: ${bestValue.name}`,
      details: {
        costPerMg: bestValue.nutrientCost.costPerMg.toFixed(6),
        qualityScore: bestValue.supplementInfo.quality.score,
        valueScore: bestValue.nutrientCost.valueScore.toFixed(1)
      }
    });

    // Quality upgrade recommendation
    if (bestValue.supplementInfo.quality.score < 80 && products.length > 1) {
      const betterQuality = products.find(p => p.supplementInfo.quality.score > bestValue.supplementInfo.quality.score);
      if (betterQuality) {
        recommendations.push({
          type: 'quality_upgrade',
          category,
          product: betterQuality,
          message: `Consider upgrading to ${betterQuality.supplementInfo.activeIngredient} for better absorption`,
          details: {
            qualityImprovement: betterQuality.supplementInfo.quality.score - bestValue.supplementInfo.quality.score,
            costIncrease: ((betterQuality.nutrientCost.costPerMg / bestValue.nutrientCost.costPerMg - 1) * 100).toFixed(1)
          }
        });
      }
    }
  });

  return recommendations;
};