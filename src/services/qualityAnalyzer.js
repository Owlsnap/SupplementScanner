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

// Protein-specific ingredient classification
const PROTEIN_SKETCHY_INGREDIENTS = [
  { pattern: /acesulfam[- ]?k/i, name: 'Acesulfame-K', reason: 'Artificial sweetener linked to potential gut microbiome disruption', severity: 'medium' },
  { pattern: /sucralose/i, name: 'Sucralose', reason: 'Artificial sweetener that may affect insulin response and gut bacteria', severity: 'medium' },
  { pattern: /aspartam/i, name: 'Aspartame', reason: 'Controversial artificial sweetener', severity: 'medium' },
  { pattern: /dextros/i, name: 'Dextrose', reason: 'Added simple sugar that spikes blood glucose', severity: 'low' },
  { pattern: /maltodextrin/i, name: 'Maltodextrin', reason: 'High glycemic index filler carbohydrate', severity: 'medium' },
  { pattern: /titanium\s*dioxide/i, name: 'Titanium Dioxide', reason: 'Controversial colorant banned in EU food since 2022', severity: 'high' },
  { pattern: /carrageenan/i, name: 'Carrageenan', reason: 'Thickener associated with gut inflammation in some studies', severity: 'medium' },
  { pattern: /artificial\s*(color|colour|dye)/i, name: 'Artificial Colors', reason: 'Unnecessary synthetic colorants', severity: 'medium' },
  { pattern: /artificial\s*flavou?r/i, name: 'Artificial Flavors', reason: 'Synthetic flavoring compounds', severity: 'low' },
  { pattern: /sodium\s*benzoat/i, name: 'Sodium Benzoate', reason: 'Preservative that may form benzene with vitamin C', severity: 'medium' },
  { pattern: /potassium\s*sorbat/i, name: 'Potassium Sorbate', reason: 'Synthetic preservative', severity: 'low' },
  { pattern: /high\s*fructose/i, name: 'High Fructose Corn Syrup', reason: 'Cheap filler sugar linked to metabolic issues', severity: 'high' },
];

const PROTEIN_GOOD_INGREDIENTS = [
  { pattern: /bromelain/i, name: 'Bromelain', reason: 'Digestive enzyme that aids protein absorption' },
  { pattern: /papain/i, name: 'Papain', reason: 'Digestive enzyme from papaya for better protein digestion' },
  { pattern: /digestive\s*enzyme/i, name: 'Digestive Enzymes', reason: 'Helps break down and absorb protein more efficiently' },
  { pattern: /l[- ]?glutamin/i, name: 'L-Glutamine', reason: 'Supports gut health and muscle recovery' },
  { pattern: /l[- ]?leucin/i, name: 'L-Leucine', reason: 'Key amino acid that triggers muscle protein synthesis' },
  { pattern: /bcaa/i, name: 'BCAAs', reason: 'Branched-chain amino acids support muscle recovery' },
  { pattern: /taurin/i, name: 'Taurine', reason: 'Supports muscle function and antioxidant defense' },
  { pattern: /stevia/i, name: 'Stevia', reason: 'Natural zero-calorie sweetener from plant extract' },
  { pattern: /immunoglobulin/i, name: 'Immunoglobulin Fractions', reason: 'Immune-supporting protein fractions' },
  { pattern: /lactoferrin/i, name: 'Lactoferrin', reason: 'Iron-binding protein with immune benefits' },
  { pattern: /colostrum/i, name: 'Colostrum', reason: 'Rich in growth factors and immune compounds' },
  { pattern: /probio/i, name: 'Probiotics', reason: 'Supports gut health and nutrient absorption' },
];

const PROTEIN_NEUTRAL_INGREDIENTS = [
  { pattern: /xanthan/i, name: 'Xanthan Gum' },
  { pattern: /guar\s*gum/i, name: 'Guar Gum' },
  { pattern: /sodium\s*chloride|salt/i, name: 'Salt/Sodium Chloride' },
  { pattern: /lecithin/i, name: 'Lecithin' },
  { pattern: /flavou?ring/i, name: 'Flavoring' },
  { pattern: /cocoa/i, name: 'Cocoa' },
  { pattern: /vanilla/i, name: 'Vanilla' },
];

/**
 * Analyze protein source quality from ingredient text
 */
function analyzeProteinSource(ingredientText) {
  const text = ingredientText.toLowerCase();
  let sourceScore = 0;
  const sources = [];

  const hasIsolate = /whey\s*(protein\s*)?isolat|wpi|isolat\s*(av\s*)?vassle/i.test(ingredientText);
  const hasHydrolyzed = /hydrolyz|hydrolys/i.test(ingredientText);
  const hasConcentrate = /whey\s*(protein\s*)?concentrat|wpc|koncentrat\s*(av\s*)?vassle/i.test(ingredientText);
  const hasCasein = /casein|kasein/i.test(ingredientText);
  const hasSoy = /soy\s*protein|soja\s*protein/i.test(ingredientText);

  if (hasIsolate) {
    sourceScore += 2;
    sources.push({ name: 'Whey Isolate (WPI)', quality: 'excellent', reason: 'Highest quality, >90% protein, low lactose' });
  }
  if (hasHydrolyzed) {
    sourceScore += 2;
    sources.push({ name: 'Hydrolyzed Whey', quality: 'excellent', reason: 'Pre-digested for fast absorption' });
  }
  if (hasCasein) {
    sourceScore += 1;
    sources.push({ name: 'Casein', quality: 'good', reason: 'Slow-release protein, great for overnight recovery' });
  }
  if (hasConcentrate && hasIsolate) {
    sourceScore += 1;
    sources.push({ name: 'Whey Concentrate + Isolate Blend', quality: 'good', reason: 'Good compromise of quality and cost' });
  } else if (hasConcentrate) {
    // Check if it's WPC80 or generic
    const isWPC80 = /wpc\s*80|concentrate\s*80|80\s*%/i.test(ingredientText);
    if (isWPC80) {
      sources.push({ name: 'WPC80 Concentrate', quality: 'decent', reason: 'Standard quality, ~80% protein content' });
    } else {
      sourceScore -= 1;
      sources.push({ name: 'Whey Concentrate (generic)', quality: 'low', reason: 'Lower protein %, more lactose and fat' });
    }
  }
  if (hasSoy) {
    sourceScore -= 1;
    sources.push({ name: 'Soy Protein', quality: 'low', reason: 'Inferior amino acid profile for muscle building' });
  }

  // No recognized protein source
  if (sources.length === 0) {
    // Check for other protein sources
    if (/pea\s*protein|ärt\s*protein/i.test(ingredientText)) {
      sources.push({ name: 'Pea Protein', quality: 'decent', reason: 'Good plant-based option, decent amino profile' });
    } else if (/rice\s*protein|ris\s*protein/i.test(ingredientText)) {
      sourceScore -= 1;
      sources.push({ name: 'Rice Protein', quality: 'low', reason: 'Incomplete amino acid profile, low in lysine' });
    } else if (/egg\s*protein|ägg\s*protein/i.test(ingredientText)) {
      sourceScore += 1;
      sources.push({ name: 'Egg Protein', quality: 'good', reason: 'Excellent amino acid profile, dairy-free' });
    }
  }

  return { sourceScore, sources };
}

/**
 * Analyze protein product quality from ingredient list text
 */
export function analyzeProteinQuality(ingredientListText, ingredients = []) {
  const text = ingredientListText || (ingredients.map(i => i.name).join(', '));

  if (!text || text.trim().length === 0) {
    return null;
  }

  const concerns = [];
  const positives = [];
  const ingredientBreakdown = [];

  // Check for sketchy ingredients
  for (const sketchy of PROTEIN_SKETCHY_INGREDIENTS) {
    if (sketchy.pattern.test(text)) {
      concerns.push({ name: sketchy.name, reason: sketchy.reason, severity: sketchy.severity });
      ingredientBreakdown.push({ name: sketchy.name, category: 'sketchy', severity: sketchy.severity });
    }
  }

  // Check for good ingredients
  for (const good of PROTEIN_GOOD_INGREDIENTS) {
    if (good.pattern.test(text)) {
      positives.push({ name: good.name, reason: good.reason });
      ingredientBreakdown.push({ name: good.name, category: 'good' });
    }
  }

  // Check for neutral ingredients
  for (const neutral of PROTEIN_NEUTRAL_INGREDIENTS) {
    if (neutral.pattern.test(text)) {
      ingredientBreakdown.push({ name: neutral.name, category: 'neutral' });
    }
  }

  // Analyze protein source
  const proteinSource = analyzeProteinSource(text);
  proteinSource.sources.forEach(source => {
    ingredientBreakdown.push({
      name: source.name,
      category: source.quality === 'excellent' || source.quality === 'good' ? 'good' : source.quality === 'decent' ? 'neutral' : 'sketchy'
    });
    if (source.quality === 'excellent' || source.quality === 'good') {
      positives.push({ name: source.name, reason: source.reason });
    } else if (source.quality === 'low') {
      concerns.push({ name: source.name, reason: source.reason, severity: 'medium' });
    }
  });

  // Calculate score (1-10)
  let score = 5; // Start at neutral

  // Protein source is the biggest factor
  score += proteinSource.sourceScore;

  // Good ingredients boost score
  score += Math.min(positives.length * 0.5, 2);

  // Sketchy ingredients reduce score
  const sketchyPenalty = concerns.reduce((acc, c) => {
    if (c.severity === 'high') return acc + 1.0;
    if (c.severity === 'medium') return acc + 0.5;
    return acc + 0.25;
  }, 0);
  score -= Math.min(sketchyPenalty, 3);

  // Clamp to 1-10
  score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

  return {
    score,
    concerns,
    positives,
    proteinSources: proteinSource.sources,
    ingredientBreakdown,
    ingredientListText: text
  };
}

/**
 * Analyze overall supplement quality
 */
export function analyzeQuality(supplementData) {
  const { ingredients, form, category, subCategory, ingredientListText } = supplementData;

  // For protein products, use protein-specific analysis
  if (subCategory === 'protein' || category === 'protein') {
    const proteinAnalysis = analyzeProteinQuality(ingredientListText, ingredients);
    if (proteinAnalysis) {
      return {
        underDosed: null,
        overDosed: null,
        fillerRisk: proteinAnalysis.concerns.length > 3 ? 'high' : proteinAnalysis.concerns.length > 0 ? 'medium' : 'low',
        bioavailability: null,
        details: [],
        proteinQuality: proteinAnalysis
      };
    }
  }

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
  analyzeProteinQuality,
  analyzeDosage,
  analyzeBioavailability,
  analyzeFillerRisk,
  getQualitySummary,
  DOSAGE_RANGES
};
