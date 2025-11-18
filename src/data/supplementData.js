// Comprehensive supplement data for analysis and recommendations

// Ingredient quality ratings (higher is better)
export const ingredientQuality = {
  // Magnesium forms
  'magnesium bisglycinate': {
    score: 95,
    bioavailability: 'Excellent',
    absorption: '~90%',
    sideEffects: 'Very low',
    description: 'Premium chelated form with superior absorption and minimal digestive issues',
    benefits: ['High bioavailability', 'No laxative effect', 'Gentle on stomach'],
    drawbacks: ['More expensive'],
    category: 'magnesium'
  },
  'magnesium glycinate': {
    score: 95,
    bioavailability: 'Excellent',
    absorption: '~90%',
    sideEffects: 'Very low',
    description: 'High-quality chelated form, very well tolerated',
    benefits: ['Excellent absorption', 'Calming effect', 'No digestive upset'],
    drawbacks: ['Higher cost'],
    category: 'magnesium'
  },
  'magnesium malate': {
    score: 85,
    bioavailability: 'Very good',
    absorption: '~80%',
    sideEffects: 'Low',
    description: 'Good for energy production, well absorbed',
    benefits: ['Good absorption', 'May boost energy', 'Well tolerated'],
    drawbacks: ['Slightly energizing (avoid before bed)'],
    category: 'magnesium'
  },
  'magnesium citrate': {
    score: 70,
    bioavailability: 'Good',
    absorption: '~65%',
    sideEffects: 'Moderate',
    description: 'Decent absorption but can cause digestive issues',
    benefits: ['Good value', 'Widely available'],
    drawbacks: ['Laxative effect', 'May cause diarrhea'],
    category: 'magnesium'
  },
  'magnesium oxide': {
    score: 25,
    bioavailability: 'Poor',
    absorption: '~10%',
    sideEffects: 'High',
    description: 'Cheap but very poorly absorbed with significant side effects',
    benefits: ['Very cheap', 'High elemental magnesium per pill'],
    drawbacks: ['Terrible absorption', 'Strong laxative effect', 'Digestive upset'],
    category: 'magnesium'
  },

  // Vitamin D forms
  'cholecalciferol': {
    score: 95,
    bioavailability: 'Excellent',
    absorption: '~95%',
    sideEffects: 'Very low',
    description: 'Natural vitamin D3 form, superior to D2',
    benefits: ['Natural form', 'Excellent absorption', 'Raises blood levels effectively'],
    drawbacks: ['Slightly more expensive than D2'],
    category: 'vitamin_d'
  },
  'ergocalciferol': {
    score: 60,
    bioavailability: 'Fair',
    absorption: '~60%',
    sideEffects: 'Low',
    description: 'Vitamin D2, less effective than D3',
    benefits: ['Vegan-friendly', 'Cheaper'],
    drawbacks: ['Lower potency', 'Shorter half-life', 'Less effective'],
    category: 'vitamin_d'
  },

  // Protein forms
  'whey protein isolate': {
    score: 95,
    bioavailability: 'Excellent',
    absorption: '~95%',
    sideEffects: 'Very low',
    description: 'Highly processed whey with lactose removed, fast absorption',
    benefits: ['High protein content (>90%)', 'Fast absorption', 'Complete amino acids', 'Low lactose'],
    drawbacks: ['More expensive', 'Highly processed'],
    category: 'protein'
  },
  'whey protein concentrate': {
    score: 85,
    bioavailability: 'Very good',
    absorption: '~85%',
    sideEffects: 'Low',
    description: 'Less processed whey, good balance of quality and price',
    benefits: ['Good value', 'Natural processing', 'Contains beneficial compounds'],
    drawbacks: ['Contains lactose', 'Lower protein percentage'],
    category: 'protein'
  },
  'casein protein': {
    score: 80,
    bioavailability: 'Good',
    absorption: '~75%',
    sideEffects: 'Low',
    description: 'Slow-digesting milk protein, good for nighttime',
    benefits: ['Slow release', 'Keeps you full longer', 'Good for night time'],
    drawbacks: ['Slower absorption', 'Can be thick', 'Contains lactose'],
    category: 'protein'
  },

  // Omega-3 forms
  'triglyceride form': {
    score: 95,
    bioavailability: 'Excellent',
    absorption: '~90%',
    sideEffects: 'Very low',
    description: 'Natural triglyceride form of omega-3, best absorption',
    benefits: ['Natural form', 'Superior absorption', 'Better stability'],
    drawbacks: ['More expensive', 'May be harder to find'],
    category: 'omega_3'
  },
  'ethyl ester': {
    score: 70,
    bioavailability: 'Good',
    absorption: '~70%',
    sideEffects: 'Low',
    description: 'Concentrated but less natural form',
    benefits: ['Higher concentration', 'More stable', 'Widely available'],
    drawbacks: ['Lower absorption', 'Synthetic form', 'May cause reflux'],
    category: 'omega_3'
  },

  // Amino Acid forms
  'essential amino acids': {
    score: 95,
    bioavailability: 'Excellent',
    absorption: '~95%',
    sideEffects: 'Very low',
    description: 'Complete profile of all 9 essential amino acids including BCAAs',
    benefits: ['Complete amino profile', 'Superior muscle protein synthesis', 'Better recovery', 'Includes all limiting amino acids'],
    drawbacks: ['More expensive', 'Larger serving size needed'],
    category: 'amino_acids'
  },
  'branched chain amino acids': {
    score: 60,
    bioavailability: 'Good',
    absorption: '~80%',
    sideEffects: 'Low',
    description: 'Only 3 amino acids (leucine, isoleucine, valine), incomplete for optimal protein synthesis',
    benefits: ['Fast absorption', 'May reduce fatigue during training', 'Widely available'],
    drawbacks: ['Incomplete amino profile', 'May compete with other amino acids', 'Less effective than EAAs', 'Can actually impair protein synthesis without other EAAs'],
    category: 'amino_acids'
  },

  // Pre-workout ingredients (for analysis, not rating good/bad)
  'caffeine': {
    score: null, // No score - depends on individual needs
    bioavailability: 'Excellent',
    absorption: '~99%',
    sideEffects: 'Variable',
    description: 'Stimulant for energy and focus - good or bad depends on individual tolerance and goals',
    benefits: ['Increased energy', 'Enhanced focus', 'Improved performance', 'Fat oxidation'],
    drawbacks: ['Can cause jitters', 'May disrupt sleep', 'Tolerance buildup', 'Dependency risk'],
    category: 'pre_workout',
    considerations: 'Choose based on: timing of workout, caffeine tolerance, sleep schedule, and personal preference'
  },
  'beta-alanine': {
    score: null,
    bioavailability: 'Good',
    absorption: '~75%',
    sideEffects: 'Low-Moderate',
    description: 'Endurance enhancer that may cause harmless tingling sensation',
    benefits: ['Improved muscular endurance', 'Reduced fatigue in 1-4 min exercises', 'Well-researched'],
    drawbacks: ['Tingling sensation', 'No benefit for strength training', 'Must be taken consistently'],
    category: 'pre_workout',
    considerations: 'Best for: endurance training, HIIT, longer sets. Skip if: doing pure strength training or dislike tingling'
  },
  'l-citrulline': {
    score: null,
    bioavailability: 'Very good',
    absorption: '~85%',
    sideEffects: 'Very low',
    description: 'Nitric oxide booster for improved blood flow and pumps',
    benefits: ['Enhanced muscle pumps', 'Improved blood flow', 'May reduce soreness', 'No side effects'],
    drawbacks: ['Subtle effects', 'Mainly aesthetic benefits', 'No direct strength gains'],
    category: 'pre_workout',
    considerations: 'Good for: pump/aesthetic training, blood flow. Optional for: pure strength/power training'
  }
};

// Health goals and supplement recommendations
export const healthGoalRecommendations = {
  'better sleep': {
    name: 'Better Sleep',
    description: 'Natural supplements to improve sleep quality and duration',
    supplements: [
      {
        name: 'Magnesium Glycinate',
        dosage: '400-800mg',
        timing: '30-60 minutes before bed',
        priority: 1,
        reason: 'Promotes muscle relaxation and activates the parasympathetic nervous system',
        budgetOption: 'magnesium citrate',
        qualityIngredients: ['magnesium bisglycinate', 'magnesium glycinate'],
        poorIngredients: ['magnesium oxide']
      },
      {
        name: 'Melatonin',
        dosage: '0.5-3mg',
        timing: '30-60 minutes before bed',
        priority: 2,
        reason: 'Regulates circadian rhythm and promotes natural sleepiness',
        budgetOption: 'immediate release melatonin',
        qualityIngredients: ['sustained release melatonin', 'sublingual melatonin'],
        poorIngredients: ['high dose melatonin (>5mg)']
      },
      {
        name: 'L-Theanine',
        dosage: '200-400mg',
        timing: '1-2 hours before bed',
        priority: 3,
        reason: 'Promotes relaxation without sedation, reduces anxiety',
        budgetOption: 'green tea extract',
        qualityIngredients: ['pure l-theanine', 'suntheanine'],
        poorIngredients: ['low quality green tea extracts']
      }
    ]
  },
  'build muscle': {
    name: 'Build Muscle',
    description: 'Supplements to support muscle growth and recovery',
    supplements: [
      {
        name: 'Whey Protein',
        dosage: '20-40g',
        timing: 'Post-workout or between meals',
        priority: 1,
        reason: 'High quality complete protein for muscle protein synthesis',
        budgetOption: 'whey protein concentrate',
        qualityIngredients: ['whey protein isolate', 'whey protein concentrate'],
        poorIngredients: ['soy protein isolate', 'wheat protein']
      },
      {
        name: 'Creatine Monohydrate',
        dosage: '5g',
        timing: 'Any time daily (consistency matters)',
        priority: 2,
        reason: 'Increases power output and muscle mass, well-researched',
        budgetOption: 'creatine monohydrate',
        qualityIngredients: ['creatine monohydrate', 'creapure'],
        poorIngredients: ['creatine ethyl ester', 'liquid creatine']
      },
      {
        name: 'Vitamin D3',
        dosage: '2000-5000 IU',
        timing: 'With fat-containing meal',
        priority: 3,
        reason: 'Supports testosterone production and muscle function',
        budgetOption: 'vitamin d3 softgels',
        qualityIngredients: ['cholecalciferol', 'vitamin d3 with k2'],
        poorIngredients: ['ergocalciferol (d2)']
      }
    ]
  },
  'general health': {
    name: 'General Health',
    description: 'Essential supplements for overall wellness',
    supplements: [
      {
        name: 'Vitamin D3',
        dosage: '2000-4000 IU',
        timing: 'With fat-containing meal',
        priority: 1,
        reason: 'Most people are deficient, crucial for immune system and bone health',
        budgetOption: 'basic vitamin d3',
        qualityIngredients: ['cholecalciferol', 'vitamin d3 with k2'],
        poorIngredients: ['ergocalciferol (d2)']
      },
      {
        name: 'Omega-3 EPA/DHA',
        dosage: '1000-2000mg combined EPA+DHA',
        timing: 'With meals',
        priority: 2,
        reason: 'Anti-inflammatory, supports heart and brain health',
        budgetOption: 'fish oil concentrate',
        qualityIngredients: ['triglyceride form', 'algae oil'],
        poorIngredients: ['ethyl ester', 'low concentration oils']
      },
      {
        name: 'Magnesium',
        dosage: '400-800mg',
        timing: 'Evening with food',
        priority: 3,
        reason: 'Most people are deficient, supports 300+ enzymatic reactions',
        budgetOption: 'magnesium citrate',
        qualityIngredients: ['magnesium bisglycinate', 'magnesium glycinate'],
        poorIngredients: ['magnesium oxide']
      }
    ]
  },
  'energy boost': {
    name: 'Energy & Focus',
    description: 'Natural supplements for sustained energy and mental clarity',
    supplements: [
      {
        name: 'B-Complex',
        dosage: 'As directed on label',
        timing: 'Morning with breakfast',
        priority: 1,
        reason: 'Essential for energy metabolism and nervous system function',
        budgetOption: 'basic b-complex',
        qualityIngredients: ['methylated b vitamins', 'active forms'],
        poorIngredients: ['synthetic cyanocobalamin', 'folic acid']
      },
      {
        name: 'Iron (if deficient)',
        dosage: '18-65mg',
        timing: 'On empty stomach with vitamin C',
        priority: 2,
        reason: 'Iron deficiency is the most common cause of fatigue',
        budgetOption: 'ferrous sulfate',
        qualityIngredients: ['ferrous bisglycinate', 'heme iron'],
        poorIngredients: ['ferrous sulfate (hard on stomach)']
      },
      {
        name: 'Rhodiola Rosea',
        dosage: '200-400mg',
        timing: 'Morning on empty stomach',
        priority: 3,
        reason: 'Adaptogen that helps manage stress and fatigue',
        budgetOption: 'standardized rhodiola extract',
        qualityIngredients: ['3% rosavins, 1% salidroside', 'standardized extract'],
        poorIngredients: ['non-standardized powder', 'low concentration']
      }
    ]
  }
};

// Common supplement categories and their typical active ingredients
export const supplementCategories = {
  magnesium: {
    activeIngredient: 'elemental magnesium',
    commonDosages: ['200mg', '400mg', '500mg', '800mg'],
    optimalDailyDose: '400-800mg',
    maxSafeDose: '800mg',
    deficiencySymptoms: ['muscle cramps', 'fatigue', 'poor sleep', 'anxiety'],
    benefits: ['muscle function', 'sleep quality', 'stress reduction', 'bone health']
  },
  vitamin_d: {
    activeIngredient: 'vitamin d3 (cholecalciferol)',
    commonDosages: ['1000 IU', '2000 IU', '4000 IU', '5000 IU'],
    optimalDailyDose: '2000-4000 IU',
    maxSafeDose: '10000 IU',
    deficiencySymptoms: ['fatigue', 'bone pain', 'muscle weakness', 'mood changes'],
    benefits: ['immune function', 'bone health', 'mood regulation', 'muscle function']
  },
  protein: {
    activeIngredient: 'protein',
    commonDosages: ['20g', '25g', '30g', '50g'],
    optimalDailyDose: '0.8-2.2g per kg body weight',
    maxSafeDose: '3g per kg body weight',
    benefits: ['muscle building', 'satiety', 'weight management', 'recovery']
  },
  omega_3: {
    activeIngredient: 'EPA + DHA',
    commonDosages: ['500mg', '1000mg', '1500mg', '2000mg'],
    optimalDailyDose: '1000-2000mg EPA+DHA',
    maxSafeDose: '3000mg',
    benefits: ['heart health', 'brain function', 'inflammation reduction', 'joint health']
  },
  creatine: {
    activeIngredient: 'creatine monohydrate',
    commonDosages: ['3g', '5g', '10g'],
    optimalDailyDose: '5g',
    maxSafeDose: '10g',
    benefits: ['strength increase', 'power output', 'muscle mass', 'brain function']
  },
  amino_acids: {
    activeIngredient: 'branched chain/essential amino acids',
    commonDosages: ['5g', '10g', '15g'],
    optimalDailyDose: '10-20g',
    maxSafeDose: '30g',
    benefits: ['muscle recovery', 'protein synthesis', 'immune support']
  },
  pre_workout: {
    activeIngredient: 'caffeine + beta-alanine + citrulline',
    commonDosages: ['200mg caffeine', '3g beta-alanine', '6g citrulline'],
    optimalDailyDose: '200-400mg caffeine, 3-6g beta-alanine, 6-8g citrulline',
    maxSafeDose: '400mg caffeine, 6g beta-alanine, 8g citrulline',
    benefits: ['energy boost', 'endurance', 'focus']
  }
};

// Function to get quality score for an ingredient
export const getIngredientQuality = (ingredientName) => {
  const ingredient = Object.keys(ingredientQuality).find(key => 
    ingredientName.toLowerCase().includes(key.toLowerCase())
  );
  return ingredient ? ingredientQuality[ingredient] : null;
};

// Function to get supplement recommendations for a health goal
export const getRecommendationsForGoal = (goalKey) => {
  return healthGoalRecommendations[goalKey] || null;
};

// Function to compare ingredient quality
export const compareIngredients = (ingredient1, ingredient2) => {
  const quality1 = getIngredientQuality(ingredient1);
  const quality2 = getIngredientQuality(ingredient2);
  
  if (!quality1 || !quality2) return null;
  
  return {
    winner: quality1.score > quality2.score ? ingredient1 : ingredient2,
    scoreDifference: Math.abs(quality1.score - quality2.score),
    comparison: {
      [ingredient1]: quality1,
      [ingredient2]: quality2
    }
  };
};