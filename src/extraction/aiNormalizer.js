/**
 * Layer 3: AI Normalization + Missing Info Filling
 * Process preprocessed data through AI for normalization and completion
 */

/**
 * Generate AI prompt for data normalization
 */
function generateNormalizationPrompt(rankedBlocks, patternExtraction) {
  return `You are a data normalizer for supplement products.
You always respond with VALID JSON only, no explanation text.

Here are the extracted text blocks ranked by relevance:

PRICE BLOCKS:
${formatBlocksForPrompt(rankedBlocks.price_blocks)}

INGREDIENT BLOCKS:
${formatBlocksForPrompt(rankedBlocks.ingredient_blocks)}

DOSAGE BLOCKS:
${formatBlocksForPrompt(rankedBlocks.dosage_blocks)}

QUANTITY BLOCKS:
${formatBlocksForPrompt(rankedBlocks.quantity_blocks)}

NUTRITIONAL BLOCKS:
${formatBlocksForPrompt(rankedBlocks.nutritional_blocks)}

Here is the partial extraction from regex patterns:
- price: ${patternExtraction.price || 'null'}
- dosages: ${JSON.stringify(patternExtraction.dosages.slice(0, 5))}
- quantities: ${JSON.stringify(patternExtraction.quantities.slice(0, 3))}
- serving_sizes: ${JSON.stringify(patternExtraction.serving_sizes.slice(0, 3))}
- ingredients: ${JSON.stringify(patternExtraction.ingredients.slice(0, 8))}
- product_name: ${patternExtraction.product_name || 'null'}

Your task:
1) Use the blocks and regex results to fill ALL required fields
2) Correct unit conversions (convert everything to mg for active ingredients)
3) Identify the PRIMARY active ingredient(s) from context
4) Calculate total servings from quantity and serving size
5) Ignore marketing text and focus on factual data
6) If serving size is unclear, infer from table structure or product type
7) Ensure price is in SEK (Swedish Krona)

REQUIRED JSON schema (respond with JSON only):
{
  "name": "string - product name",
  "price_sek": number - price in Swedish Krona,
  "total_servings": number - how many servings/doses in the package,
  "serving_size": "string - size of one serving (e.g. '2 capsules', '5g powder')",
  "active_ingredients": [
    { 
      "name": "string - clean ingredient name", 
      "dose_mg": number - dose in milligrams per serving,
      "is_primary": boolean - true if this is the main active ingredient
    }
  ],
  "product_type": "string - capsules/powder/tablets/liquid",
  "confidence": number - overall confidence 0-100
}

IMPORTANT RULES:
- Convert all doses to mg (1g = 1000mg, 1mcg = 0.001mg)
- If multiple serving sizes mentioned, use the recommended daily dose
- Mark the most prominent ingredient as is_primary: true
- If unclear between similar values, choose the more conservative/realistic one
- For protein powders, serving size is usually per scoop (around 30g)
- For capsules/tablets, serving size is usually 1-3 units
- Price should be a clean number without currency symbols`;
}

/**
 * Format blocks for AI prompt
 */
function formatBlocksForPrompt(blocks) {
  if (!blocks || blocks.length === 0) {
    return 'No relevant blocks found';
  }

  return blocks.slice(0, 3).map((block, index) => {
    return `Block ${index + 1} (score: ${block.relevance_score}):
Text: "${block.text}"
Element: ${block.element}
Category: ${block.category}
${block.structure ? `Structure: ${JSON.stringify(block.structure)}` : ''}
---`;
  }).join('\n');
}

/**
 * Normalize extracted data through AI
 */
export async function normalizeWithAI(rankedBlocks, patternExtraction) {
  console.log('🤖 Layer 3: Starting AI normalization...');
  
  try {
    const prompt = generateNormalizationPrompt(rankedBlocks, patternExtraction);
    
    console.log('📝 AI Prompt length:', prompt.length);
    console.log('🔍 Pattern extraction confidence:', patternExtraction.confidence_scores);

    const response = await fetch('/api/normalize-supplement-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        pattern_extraction: patternExtraction,
        blocks_summary: {
          price_blocks: rankedBlocks.price_blocks.length,
          ingredient_blocks: rankedBlocks.ingredient_blocks.length,
          dosage_blocks: rankedBlocks.dosage_blocks.length,
          quantity_blocks: rankedBlocks.quantity_blocks.length
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AI normalization failed: ${response.status}`);
    }

    const normalizedData = await response.json();
    
    // Validate the normalized data
    const validation = validateNormalizedData(normalizedData);
    
    if (validation.isValid) {
      console.log('✅ Layer 3: AI normalization successful');
      console.log('📊 Normalized data:', {
        name: normalizedData.name?.substring(0, 30) + '...',
        price: normalizedData.price_sek,
        servings: normalizedData.total_servings,
        ingredients: normalizedData.active_ingredients?.length || 0,
        confidence: normalizedData.confidence
      });
      
      return {
        success: true,
        data: normalizedData,
        validation: validation,
        source: 'ai_normalized'
      };
    } else {
      console.log('❌ Layer 3: AI normalization validation failed:', validation.errors);
      return {
        success: false,
        data: null,
        validation: validation,
        errors: validation.errors,
        fallback_needed: true
      };
    }

  } catch (error) {
    console.error('💥 Layer 3: AI normalization error:', error);
    return {
      success: false,
      data: null,
      error: error.message,
      fallback_needed: true
    };
  }
}

/**
 * Validate normalized data structure
 */
function validateNormalizedData(data) {
  const errors = [];
  const warnings = [];

  // Required fields check
  if (!data.name || typeof data.name !== 'string' || data.name.length < 3) {
    errors.push('Product name is missing or invalid');
  }

  if (!data.price_sek || typeof data.price_sek !== 'number' || data.price_sek <= 0) {
    errors.push('Price is missing or invalid');
  }

  if (!data.total_servings || typeof data.total_servings !== 'number' || data.total_servings <= 0) {
    errors.push('Total servings is missing or invalid');
  }

  if (!data.serving_size || typeof data.serving_size !== 'string') {
    errors.push('Serving size is missing or invalid');
  }

  if (!data.active_ingredients || !Array.isArray(data.active_ingredients) || data.active_ingredients.length === 0) {
    errors.push('Active ingredients are missing or invalid');
  } else {
    // Validate each ingredient
    data.active_ingredients.forEach((ingredient, index) => {
      if (!ingredient.name || typeof ingredient.name !== 'string') {
        errors.push(`Ingredient ${index + 1}: name is missing or invalid`);
      }
      if (typeof ingredient.dose_mg !== 'number' || ingredient.dose_mg < 0) {
        errors.push(`Ingredient ${index + 1}: dose_mg is missing or invalid`);
      }
      if (typeof ingredient.is_primary !== 'boolean') {
        warnings.push(`Ingredient ${index + 1}: is_primary should be boolean`);
      }
    });

    // Check for primary ingredient
    const primaryIngredients = data.active_ingredients.filter(i => i.is_primary);
    if (primaryIngredients.length === 0) {
      warnings.push('No primary ingredient marked');
    } else if (primaryIngredients.length > 2) {
      warnings.push('Too many primary ingredients marked');
    }
  }

  // Optional but recommended fields
  if (!data.product_type) {
    warnings.push('Product type not specified');
  }

  if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 100) {
    warnings.push('Confidence score missing or invalid');
  }

  // Value range checks
  if (data.price_sek && (data.price_sek < 10 || data.price_sek > 5000)) {
    warnings.push(`Price seems unusual: ${data.price_sek} SEK`);
  }

  if (data.total_servings && (data.total_servings < 1 || data.total_servings > 1000)) {
    warnings.push(`Serving count seems unusual: ${data.total_servings}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 100 - (errors.length * 25) - (warnings.length * 5))
  };
}

/**
 * Create fallback data from pattern extraction when AI fails
 */
export function createFallbackData(patternExtraction, rankedBlocks) {
  console.log('🔄 Layer 3: Creating fallback data from pattern extraction...');

  const fallbackData = {
    name: patternExtraction.product_name || 'Unknown Product',
    price_sek: patternExtraction.price || null,
    total_servings: null,
    serving_size: null,
    active_ingredients: [],
    product_type: null,
    confidence: 30 // Low confidence for fallback
  };

  // Try to determine serving count
  if (patternExtraction.quantities.length > 0) {
    const quantity = patternExtraction.quantities[0];
    fallbackData.total_servings = quantity.value;
    
    if (quantity.type.includes('capsules')) {
      fallbackData.product_type = 'capsules';
      fallbackData.serving_size = '1-2 capsules'; // Common serving
    } else if (quantity.type.includes('tablets')) {
      fallbackData.product_type = 'tablets';
      fallbackData.serving_size = '1-2 tablets';
    } else {
      fallbackData.serving_size = `${quantity.value} ${quantity.type}`;
    }
  }

  // Extract active ingredients
  if (patternExtraction.ingredients.length > 0) {
    patternExtraction.ingredients.slice(0, 5).forEach((ingredient, index) => {
      if (ingredient.name && ingredient.amount) {
        // Convert to mg
        let doseInMg = ingredient.amount;
        if (ingredient.unit === 'g') {
          doseInMg = ingredient.amount * 1000;
        } else if (ingredient.unit === 'mcg' || ingredient.unit === 'μg') {
          doseInMg = ingredient.amount * 0.001;
        }

        fallbackData.active_ingredients.push({
          name: ingredient.name,
          dose_mg: doseInMg,
          is_primary: index === 0 // Mark first ingredient as primary
        });
      }
    });
  }

  // Try to infer serving size from dosage data
  if (!fallbackData.serving_size && patternExtraction.serving_sizes.length > 0) {
    const serving = patternExtraction.serving_sizes[0];
    fallbackData.serving_size = `${serving.value}${serving.unit}`;
    
    if (serving.unit.includes('caps') || serving.unit.includes('kaps')) {
      fallbackData.product_type = 'capsules';
    } else if (serving.unit.includes('tabs') || serving.unit.includes('tabl')) {
      fallbackData.product_type = 'tablets';
    } else if (serving.unit.includes('g') && serving.value > 5) {
      fallbackData.product_type = 'powder';
    }
  }

  // Increase confidence if we have good data
  if (fallbackData.price_sek && fallbackData.active_ingredients.length > 0) {
    fallbackData.confidence = 50;
  }
  if (fallbackData.total_servings && fallbackData.serving_size) {
    fallbackData.confidence += 15;
  }

  console.log('📋 Fallback data created:', {
    hasPrice: !!fallbackData.price_sek,
    ingredients: fallbackData.active_ingredients.length,
    hasServings: !!fallbackData.total_servings,
    confidence: fallbackData.confidence
  });

  return {
    success: true,
    data: fallbackData,
    source: 'pattern_fallback',
    validation: validateNormalizedData(fallbackData)
  };
}