import { ingredientQuality, supplementCategories, getIngredientQuality } from '../data/supplementData.js';
import { CategoryDetector } from '../services/categoryDetector.js';

// Enhanced supplement analysis with category-specific insights

/**
 * Enhanced analysis that combines existing 0-100 scoring with category insights
 */
export const analyzeSupplementQuality = (supplement) => {
  // Preserve existing 0-100 scoring system
  const traditionalScore = calculateTraditionalScore(supplement);
  
  // Add new category-specific analysis
  const categoryInsights = analyzeCategorySpecific(supplement);
  
  // Add neutral dosage analysis
  const dosageAnalysis = analyzeDosages(supplement);
  
  return {
    // Keep existing score unchanged
    overallScore: traditionalScore.score,
    overallGrade: traditionalScore.grade,
    
    // Add enhanced category analysis
    categoryInsights,
    dosageAnalysis,
    
    // Preserve existing fields for backward compatibility
    strengths: traditionalScore.strengths,
    warnings: traditionalScore.warnings,
    recommendations: traditionalScore.recommendations
  };
};

/**
 * Preserve existing 0-100 scoring logic
 */
function calculateTraditionalScore(supplement) {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const analysis = {
    strengths: [],
    warnings: [],
    recommendations: []
  };
  
  // Analyze each ingredient using existing logic
  if (supplement.ingredients) {
    supplement.ingredients.forEach(ingredient => {
      const quality = CategoryDetector.getIngredientQuality(ingredient.name);
      if (quality && quality.score !== null) {
        totalScore += quality.score;
        maxPossibleScore += 100;
        
        // Add existing analysis logic
        if (quality.score >= 90) {
          analysis.strengths.push(`${ingredient.name}: Premium form (${quality.bioavailability} bioavailability)`);
        } else if (quality.score <= 40) {
          analysis.warnings.push(`${ingredient.name}: Poor form (${quality.bioavailability} bioavailability)`);
          analysis.recommendations.push(`Consider switching to ${quality.category === 'magnesium' ? 'magnesium bisglycinate' : 'a higher quality form'}`);
        }
      }
    });
  }
  
  const finalScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
  
  return {
    score: finalScore,
    grade: getGrade(finalScore),
    strengths: analysis.strengths,
    warnings: analysis.warnings,
    recommendations: analysis.recommendations
  };
}

/**
 * NEW: Category-specific analysis with neutral insights
 */
function analyzeCategorySpecific(supplement) {
  const insights = {
    category: supplement.category,
    subCategory: supplement.subCategory,
    categoryScore: 0,
    specificInsights: [],
    formAnalysis: null
  };
  
  switch (supplement.category) {
    case 'vitamin':
      insights.specificInsights = analyzeVitaminSupplement(supplement);
      break;
    case 'supplement':
      insights.specificInsights = analyzeGeneralSupplement(supplement);
      break;
    case 'herb':
      insights.specificInsights = analyzeHerbSupplement(supplement);
      break;
  }
  
  // Form-specific analysis
  insights.formAnalysis = analyzeSupplementForm(supplement.form, supplement.ingredients);
  
  return insights;
}

/**
 * NEW: Neutral dosage analysis based on evidence
 */
function analyzeDosages(supplement) {
  const analysis = {
    dosageStatus: 'unknown',
    findings: [],
    recommendations: [],
    evidence: []
  };
  
  if (!supplement.ingredients || supplement.ingredients.length === 0) {
    return analysis;
  }
  
  let underDosedCount = 0;
  let optimalCount = 0;
  let overDosedCount = 0;
  
  supplement.ingredients.forEach(ingredient => {
    if (!ingredient.dosage) return;
    
    const dosageInfo = getDosageReference(ingredient.name);
    if (!dosageInfo) return;
    
    const status = evaluateDosage(ingredient.dosage, dosageInfo, ingredient.unit);
    
    switch (status.level) {
      case 'under':
        underDosedCount++;
        analysis.findings.push(`${ingredient.name}: ${ingredient.dosage}${ingredient.unit} (below typical range of ${dosageInfo.optimalRange})`);
        analysis.recommendations.push(`Consider products with ${dosageInfo.optimalRange} of ${ingredient.name}`);
        break;
      case 'optimal':
        optimalCount++;
        analysis.findings.push(`${ingredient.name}: ${ingredient.dosage}${ingredient.unit} (within typical range)`);
        break;
      case 'high':
        overDosedCount++;
        analysis.findings.push(`${ingredient.name}: ${ingredient.dosage}${ingredient.unit} (above typical range of ${dosageInfo.optimalRange})`);
        analysis.recommendations.push(`High dosage - ensure this aligns with your specific needs`);
        break;
    }
    
    if (dosageInfo.evidenceNote) {
      analysis.evidence.push(`${ingredient.name}: ${dosageInfo.evidenceNote}`);
    }
  });
  
  // Overall dosage status
  if (underDosedCount > optimalCount && underDosedCount > overDosedCount) {
    analysis.dosageStatus = 'generally_under';
  } else if (overDosedCount > optimalCount && overDosedCount > underDosedCount) {
    analysis.dosageStatus = 'generally_over';
  } else if (optimalCount > 0) {
    analysis.dosageStatus = 'generally_optimal';
  }
  
  return analysis;
}

/**
 * Vitamin-specific analysis
 */
function analyzeVitaminSupplement(supplement) {
  const insights = [];
  
  if (supplement.subCategory === 'single-vitamin') {
    insights.push('Single vitamin supplements allow for precise dosing');
    insights.push('Check for synergistic nutrients (e.g., Vitamin D with K2, Magnesium)');
  } else if (supplement.subCategory === 'multivitamin') {
    insights.push('Multivitamins provide broad coverage but may have lower individual doses');
    insights.push('Consider individual supplements for nutrients where you have specific needs');
  }
  
  // Check for fat-soluble vitamins
  const fatSoluble = supplement.ingredients?.filter(ing => 
    ing.name.toLowerCase().includes('vitamin d') ||
    ing.name.toLowerCase().includes('vitamin a') ||
    ing.name.toLowerCase().includes('vitamin e') ||
    ing.name.toLowerCase().includes('vitamin k')
  );
  
  if (fatSoluble && fatSoluble.length > 0) {
    insights.push('Contains fat-soluble vitamins - take with meals containing healthy fats for better absorption');
  }
  
  return insights;
}

/**
 * General supplement analysis
 */
function analyzeGeneralSupplement(supplement) {
  const insights = [];
  
  if (supplement.subCategory === 'protein') {
    insights.push('Protein supplements support muscle protein synthesis');
    insights.push('Timing: Most effective around workouts or to meet daily protein targets');
    
    const proteinTypes = supplement.ingredients?.filter(ing => 
      ing.name.toLowerCase().includes('whey') ||
      ing.name.toLowerCase().includes('casein') ||
      ing.name.toLowerCase().includes('protein')
    );
    
    proteinTypes?.forEach(protein => {
      if (protein.name.toLowerCase().includes('whey isolate')) {
        insights.push('Whey isolate: Fast absorption, low lactose content');
      } else if (protein.name.toLowerCase().includes('whey')) {
        insights.push('Whey protein: Fast absorption, ideal post-workout');
      } else if (protein.name.toLowerCase().includes('casein')) {
        insights.push('Casein protein: Slow absorption, good for sustained release');
      }
    });
  }
  
  if (supplement.subCategory === 'preworkout') {
    insights.push('Pre-workout supplements are designed to enhance exercise performance');
    insights.push('Timing: Take 15-30 minutes before training');
    
    // Check for common pre-workout ingredients
    const caffeine = supplement.ingredients?.find(ing => 
      ing.name.toLowerCase().includes('caffeine')
    );
    if (caffeine && caffeine.dosage) {
      if (caffeine.dosage > 300) {
        insights.push('High caffeine content - assess your tolerance');
      } else if (caffeine.dosage < 100) {
        insights.push('Moderate caffeine content - suitable for most users');
      }
    }
  }
  
  return insights;
}

/**
 * Herb supplement analysis
 */
function analyzeHerbSupplement(supplement) {
  const insights = [];
  
  insights.push('Herbal supplements can vary significantly in potency');
  insights.push('Look for standardized extracts with specified active compounds');
  
  if (supplement.herbData?.standardization) {
    insights.push(`Standardized to: ${supplement.herbData.standardization}`);
  } else {
    insights.push('Consider standardized extracts for consistent potency');
  }
  
  if (supplement.herbData?.extractRatio) {
    insights.push(`Extract ratio: ${supplement.herbData.extractRatio}`);
  }
  
  // Adaptogen-specific insights
  if (supplement.subCategory === 'adaptogen') {
    insights.push('Adaptogens may help the body manage stress');
    insights.push('Effects often develop gradually with consistent use');
  }
  
  return insights;
}

/**
 * Form-specific analysis
 */
function analyzeSupplementForm(form, ingredients) {
  const formInsights = {
    form,
    advantages: [],
    considerations: []
  };
  
  switch (form) {
    case 'capsule':
      formInsights.advantages.push('Precise dosing', 'No taste', 'Good stability');
      formInsights.considerations.push('May take longer to absorb than powders');
      break;
    case 'tablet':
      formInsights.advantages.push('Precise dosing', 'Long shelf life', 'Portable');
      formInsights.considerations.push('May contain more fillers', 'Harder to break down');
      break;
    case 'powder':
      formInsights.advantages.push('Fast absorption', 'Flexible dosing', 'Often pure');
      formInsights.considerations.push('Taste may vary', 'Requires mixing', 'Less convenient');
      break;
    case 'liquid':
      formInsights.advantages.push('Fastest absorption', 'Easy to take', 'Flexible dosing');
      formInsights.considerations.push('Shorter shelf life', 'May need refrigeration', 'Taste considerations');
      break;
    case 'gummy':
      formInsights.advantages.push('Taste', 'Easy to take', 'No water needed');
      formInsights.considerations.push('Added sugars', 'Limited nutrient density', 'Potential for overconsumption');
      break;
  }
  
  return formInsights;
}

/**
 * Get dosage reference information
 */
function getDosageReference(ingredientName) {
  const normalized = ingredientName.toLowerCase();
  
  // Map to supplementCategories data
  for (const [category, info] of Object.entries(supplementCategories)) {
    const activeIng = info.activeIngredient.toLowerCase();
    if (normalized.includes(activeIng) || activeIng.includes(normalized)) {
      return {
        optimalRange: info.optimalDailyDose,
        maxSafe: info.maxSafeDose,
        evidenceNote: `Based on common usage patterns for ${category}`
      };
    }
  }
  
  // Fallback to specific ingredient knowledge
  if (normalized.includes('caffeine')) {
    return {
      optimalRange: '150-300mg',
      maxSafe: '400mg',
      evidenceNote: 'FDA considers up to 400mg daily safe for most adults'
    };
  }
  
  if (normalized.includes('vitamin d')) {
    return {
      optimalRange: '2000-4000 IU',
      maxSafe: '10000 IU',
      evidenceNote: 'Based on current research for maintaining optimal blood levels'
    };
  }
  
  return null;
}

/**
 * Evaluate if dosage is under/optimal/over
 */
function evaluateDosage(dosage, reference, unit) {
  // Simple heuristic - would need more sophisticated parsing in production
  const optimalStr = reference.optimalRange.toString();
  const rangeMatch = optimalStr.match(/(\\d+)-(\\d+)/);
  
  if (!rangeMatch) return { level: 'unknown' };
  
  const minOptimal = parseInt(rangeMatch[1]);
  const maxOptimal = parseInt(rangeMatch[2]);
  
  if (dosage < minOptimal * 0.7) return { level: 'under' };
  if (dosage > maxOptimal * 1.5) return { level: 'high' };
  return { level: 'optimal' };
}

/**
 * Get grade from score (preserve existing logic)
 */
function getGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

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

    const bestQuality = products[0];
    const categoryData = supplementCategories[category];

    // Best quality recommendation
    recommendations.push({
      type: 'best_quality',
      category,
      product: bestQuality,
      message: `Best ${category} quality: ${bestQuality.name}`,
      details: {
        qualityScore: bestQuality.supplementInfo.quality.score
      }
    });

    // Quality upgrade recommendation
    if (bestQuality.supplementInfo.quality.score < 80 && products.length > 1) {
      const betterQuality = products.find(p => p.supplementInfo.quality.score > bestQuality.supplementInfo.quality.score);
      if (betterQuality) {
        recommendations.push({
          type: 'quality_upgrade',
          category,
          product: betterQuality,
          message: `Consider upgrading to ${betterQuality.supplementInfo.activeIngredient} for better absorption`,
          details: {
            qualityImprovement: betterQuality.supplementInfo.quality.score - bestQuality.supplementInfo.quality.score
          }
        });
      }
    }
  });

  return recommendations;
};