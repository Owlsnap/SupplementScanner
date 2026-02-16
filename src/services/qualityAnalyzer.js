/**
 * Quality Analyzer Service
 * Analyzes supplement quality based on dosage ranges and bioavailability
 */

// Evidence-based dosage ranges for common supplements (mg per serving)
const DOSAGE_RANGES = {
  // Vitamins
  'vitamin d': { min: 1000, optimal: 2000, max: 4000, unit: 'IU' },
  'vitamin d3': { min: 1000, optimal: 2000, max: 4000, unit: 'IU' },
  'vitamin c': { min: 500, optimal: 1000, max: 2000, unit: 'mg' },
  'vitamin b12': { min: 500, optimal: 1000, max: 5000, unit: 'mcg' },
  'vitamin b6': { min: 10, optimal: 25, max: 100, unit: 'mg' },
  'folate': { min: 400, optimal: 800, max: 1000, unit: 'mcg' },
  'vitamin e': { min: 100, optimal: 200, max: 400, unit: 'IU' },
  'vitamin k2': { min: 90, optimal: 180, max: 360, unit: 'mcg' },

  // Minerals
  'magnesium': { min: 200, optimal: 400, max: 600, unit: 'mg' },
  'zinc': { min: 15, optimal: 30, max: 50, unit: 'mg' },
  'iron': { min: 18, optimal: 27, max: 45, unit: 'mg' },
  'calcium': { min: 500, optimal: 1000, max: 2000, unit: 'mg' },
  'selenium': { min: 55, optimal: 200, max: 400, unit: 'mcg' },

  // Pre-workout ingredients
  'caffeine': { min: 100, optimal: 200, max: 400, unit: 'mg' },
  'beta-alanine': { min: 2000, optimal: 3200, max: 6400, unit: 'mg' },
  'beta alanine': { min: 2000, optimal: 3200, max: 6400, unit: 'mg' },
  'l-citrulline': { min: 4000, optimal: 6000, max: 8000, unit: 'mg' },
  'citrulline': { min: 4000, optimal: 6000, max: 8000, unit: 'mg' },
  'l-arginine': { min: 3000, optimal: 6000, max: 10000, unit: 'mg' },
  'arginine': { min: 3000, optimal: 6000, max: 10000, unit: 'mg' },
  'l-tyrosine': { min: 500, optimal: 1000, max: 2000, unit: 'mg' },
  'tyrosine': { min: 500, optimal: 1000, max: 2000, unit: 'mg' },
  'l-theanine': { min: 100, optimal: 200, max: 400, unit: 'mg' },
  'theanine': { min: 100, optimal: 200, max: 400, unit: 'mg' },
  'taurine': { min: 1000, optimal: 2000, max: 4000, unit: 'mg' },
  'creatine': { min: 3000, optimal: 5000, max: 10000, unit: 'mg' },
  'creatine monohydrate': { min: 3000, optimal: 5000, max: 10000, unit: 'mg' },

  // Nootropics
  'lions mane': { min: 500, optimal: 1000, max: 3000, unit: 'mg' },
  'bacopa': { min: 300, optimal: 450, max: 600, unit: 'mg' },
  'rhodiola': { min: 200, optimal: 400, max: 600, unit: 'mg' },
  'ashwagandha': { min: 300, optimal: 600, max: 1200, unit: 'mg' },

  // Omega-3
  'omega-3': { min: 500, optimal: 1000, max: 3000, unit: 'mg' },
  'epa': { min: 250, optimal: 500, max: 2000, unit: 'mg' },
  'dha': { min: 250, optimal: 500, max: 2000, unit: 'mg' },

  // Other
  'coq10': { min: 100, optimal: 200, max: 400, unit: 'mg' },
  'curcumin': { min: 500, optimal: 1000, max: 2000, unit: 'mg' },
  'glucosamine': { min: 1500, optimal: 1500, max: 2000, unit: 'mg' },
  'chondroitin': { min: 800, optimal: 1200, max: 1600, unit: 'mg' },
};

// Bioavailability scores based on supplement form
const BIOAVAILABILITY_FORMS = {
  // High bioavailability forms
  'methylcobalamin': 'high', // B12
  'methyl folate': 'high',
  'methylfolate': 'high',
  'l-methylfolate': 'high',
  'magnesium glycinate': 'high',
  'magnesium threonate': 'high',
  'zinc picolinate': 'high',
  'chelated': 'high',
  'liposomal': 'high',
  'micronized': 'high',
  'sublingual': 'high',

  // Medium bioavailability forms
  'citrate': 'medium',
  'malate': 'medium',
  'gluconate': 'medium',
  'ascorbate': 'medium',
  'monohydrate': 'medium', // creatine

  // Low bioavailability forms
  'oxide': 'low',
  'carbonate': 'low',
  'cyanocobalamin': 'low', // B12
  'folic acid': 'low', // vs methylfolate
};

/**
 * Normalize ingredient name for dosage lookup
 */
function normalizeIngredientName(name) {
  if (!name) return '';
  return name.toLowerCase().trim();
}

/**
 * Convert dosage to standard unit (mg)
 */
function convertToMg(dosage, unit) {
  if (!dosage || !unit) return null;

  const normalizedUnit = unit.toLowerCase();

  switch (normalizedUnit) {
    case 'g':
      return dosage * 1000;
    case 'mcg':
    case 'μg':
      return dosage / 1000;
    case 'iu':
      // IU conversion varies by vitamin, return as-is for now
      return dosage;
    case 'mg':
    default:
      return dosage;
  }
}

/**
 * Analyze if an ingredient is underdosed or overdosed
 */
function analyzeDosage(ingredient) {
  if (!ingredient || !ingredient.name) {
    return { underDosed: null, overDosed: null };
  }

  const normalizedName = normalizeIngredientName(ingredient.name);
  const dosageRange = DOSAGE_RANGES[normalizedName];

  if (!dosageRange || !ingredient.dosage) {
    return { underDosed: null, overDosed: null };
  }

  // Convert dosage to standard unit
  const dosageInMg = convertToMg(ingredient.dosage, ingredient.unit);

  if (!dosageInMg) {
    return { underDosed: null, overDosed: null };
  }

  // Compare with ranges (handle IU separately)
  const compareValue = dosageInMg;
  const { min, max } = dosageRange;

  return {
    underDosed: compareValue < min,
    overDosed: compareValue > max,
    dosageInfo: {
      current: dosageInMg,
      min,
      optimal: dosageRange.optimal,
      max,
      unit: dosageRange.unit
    }
  };
}

/**
 * Analyze bioavailability based on ingredient form
 */
function analyzeBioavailability(ingredient) {
  if (!ingredient || !ingredient.name) {
    return null;
  }

  const normalizedName = normalizeIngredientName(ingredient.name);

  // Check if ingredient name contains bioavailability indicators
  for (const [form, score] of Object.entries(BIOAVAILABILITY_FORMS)) {
    if (normalizedName.includes(form)) {
      return score;
    }
  }

  // Default to medium if no specific form identified
  return 'medium';
}

/**
 * Analyze filler risk based on ingredient list
 */
function analyzeFillerRisk(ingredients) {
  if (!ingredients || ingredients.length === 0) {
    return null;
  }

  const fillerIngredients = [
    'magnesium stearate',
    'silicon dioxide',
    'titanium dioxide',
    'talc',
    'microcrystalline cellulose',
    'maltodextrin',
    'artificial colors',
    'artificial flavors'
  ];

  const foundFillers = ingredients.filter(ing => {
    const normalizedName = normalizeIngredientName(ing.name);
    return fillerIngredients.some(filler => normalizedName.includes(filler));
  });

  // High risk if more than 3 fillers
  if (foundFillers.length > 3) return 'high';
  // Medium risk if 1-3 fillers
  if (foundFillers.length > 0) return 'medium';
  // Low risk if no common fillers
  return 'low';
}

/**
 * Analyze overall supplement quality
 */
export function analyzeQuality(supplementData) {
  const { ingredients, form } = supplementData;

  if (!ingredients || ingredients.length === 0) {
    return {
      underDosed: null,
      overDosed: null,
      fillerRisk: null,
      bioavailability: null,
      details: []
    };
  }

  // Analyze each ingredient
  const ingredientAnalysis = ingredients.map(ingredient => {
    const dosageAnalysis = analyzeDosage(ingredient);
    const bioavailability = analyzeBioavailability(ingredient);

    return {
      name: ingredient.name,
      dosage: ingredient.dosage,
      unit: ingredient.unit,
      ...dosageAnalysis,
      bioavailability
    };
  });

  // Overall assessment
  const hasUnderdosed = ingredientAnalysis.some(a => a.underDosed === true);
  const hasOverdosed = ingredientAnalysis.some(a => a.overDosed === true);
  const fillerRisk = analyzeFillerRisk(ingredients);

  // Overall bioavailability (worst case among ingredients)
  const bioavailabilityScores = ingredientAnalysis
    .map(a => a.bioavailability)
    .filter(b => b !== null);

  let overallBioavailability = null;
  if (bioavailabilityScores.length > 0) {
    if (bioavailabilityScores.includes('low')) {
      overallBioavailability = 'low';
    } else if (bioavailabilityScores.includes('medium')) {
      overallBioavailability = 'medium';
    } else {
      overallBioavailability = 'high';
    }
  }

  return {
    underDosed: hasUnderdosed,
    overDosed: hasOverdosed,
    fillerRisk,
    bioavailability: overallBioavailability,
    details: ingredientAnalysis
  };
}

/**
 * Get human-readable quality summary
 */
export function getQualitySummary(qualityData) {
  const issues = [];
  const positives = [];

  if (qualityData.underDosed) {
    issues.push('Some ingredients are underdosed');
  }

  if (qualityData.overDosed) {
    issues.push('Some ingredients exceed safe limits');
  }

  if (qualityData.fillerRisk === 'high') {
    issues.push('High filler content detected');
  } else if (qualityData.fillerRisk === 'low') {
    positives.push('Low filler content');
  }

  if (qualityData.bioavailability === 'high') {
    positives.push('High bioavailability forms');
  } else if (qualityData.bioavailability === 'low') {
    issues.push('Low bioavailability forms');
  }

  return {
    issues,
    positives,
    hasIssues: issues.length > 0,
    hasPositives: positives.length > 0
  };
}

export const QualityAnalyzer = {
  analyzeQuality,
  analyzeDosage,
  analyzeBioavailability,
  analyzeFillerRisk,
  getQualitySummary,
  DOSAGE_RANGES
};
