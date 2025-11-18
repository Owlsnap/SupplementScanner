/**
 * Layer 4: Final Validation & Fallback System
 * Validates extracted data and provides fallback options
 */

import { normalizeWithAI, createFallbackData } from './aiNormalizer.js';

/**
 * Main validation function with fallback chain
 */
export async function validateWithFallbacks(rankedBlocks, patternExtraction) {
  console.log('🔍 Layer 4: Starting validation with fallbacks...');
  
  const result = {
    success: false,
    data: null,
    source: null,
    validation: null,
    fallbacks_used: [],
    missing_fields: [],
    user_input_needed: []
  };

  // Step 1: Try AI normalization first
  console.log('🤖 Attempting AI normalization...');
  const aiResult = await normalizeWithAI(rankedBlocks, patternExtraction);
  
  if (aiResult.success && aiResult.validation.isValid) {
    console.log('✅ AI normalization successful and valid');
    return {
      ...result,
      success: true,
      data: aiResult.data,
      source: 'ai_normalized',
      validation: aiResult.validation
    };
  }

  result.fallbacks_used.push('ai_normalization_failed');
  console.log('❌ AI normalization failed, trying pattern-based fallback...');

  // Step 2: Try pattern-based fallback
  const fallbackResult = createFallbackData(patternExtraction, rankedBlocks);
  
  if (fallbackResult.success) {
    const validation = validateRequiredFields(fallbackResult.data);
    
    if (validation.completeness > 70) {
      console.log('✅ Pattern fallback successful with good completeness');
      return {
        ...result,
        success: true,
        data: fallbackResult.data,
        source: 'pattern_fallback',
        validation: validation,
        fallbacks_used: [...result.fallbacks_used, 'pattern_fallback']
      };
    }

    // Check what's missing for user input
    const missingFields = identifyMissingFields(fallbackResult.data);
    const userInputNeeded = identifyUserInputNeeds(missingFields, rankedBlocks);

    console.log('⚠️ Pattern fallback has missing fields, checking vision fallback...');
    
    // Step 3: Try vision fallback for missing ingredient table
    if (missingFields.includes('active_ingredients') || missingFields.includes('serving_size')) {
      console.log('👁️ Attempting vision OCR fallback for ingredient table...');
      const visionResult = await tryVisionFallback(rankedBlocks, missingFields);
      
      if (visionResult.success) {
        // Merge vision results with pattern data
        const mergedData = mergeFallbackData(fallbackResult.data, visionResult.data);
        const mergedValidation = validateRequiredFields(mergedData);
        
        if (mergedValidation.completeness > 60) {
          console.log('✅ Vision fallback successful');
          return {
            ...result,
            success: true,
            data: mergedData,
            source: 'pattern_with_vision_fallback',
            validation: mergedValidation,
            fallbacks_used: [...result.fallbacks_used, 'pattern_fallback', 'vision_ocr']
          };
        }
      }
      
      result.fallbacks_used.push('vision_fallback_attempted');
    }

    // Step 4: Return partial data with user input requirements
    console.log('⚠️ Partial data available, user input needed');
    return {
      ...result,
      success: false, // Not complete success
      data: fallbackResult.data,
      source: 'partial_with_user_input_needed',
      validation: validateRequiredFields(fallbackResult.data),
      fallbacks_used: [...result.fallbacks_used, 'pattern_fallback'],
      missing_fields: missingFields,
      user_input_needed: userInputNeeded
    };
  }

  // Step 5: Complete failure - return minimal data for user completion
  console.log('❌ All automated extraction failed, creating minimal structure...');
  const minimalData = createMinimalStructure(rankedBlocks);
  
  return {
    ...result,
    success: false,
    data: minimalData,
    source: 'minimal_structure',
    validation: validateRequiredFields(minimalData),
    fallbacks_used: [...result.fallbacks_used, 'pattern_fallback', 'minimal_structure'],
    missing_fields: identifyMissingFields(minimalData),
    user_input_needed: createUserInputPrompts(rankedBlocks)
  };
}

/**
 * Validate required fields completeness
 */
function validateRequiredFields(data) {
  const required = {
    name: !!data.name && data.name.length > 2,
    price_sek: !!data.price_sek && data.price_sek > 0,
    total_servings: !!data.total_servings && data.total_servings > 0,
    serving_size: !!data.serving_size && data.serving_size.length > 2,
    active_ingredients: !!data.active_ingredients && data.active_ingredients.length > 0,
    ingredient_doses: data.active_ingredients?.some(i => i.dose_mg > 0) || false
  };

  const present = Object.values(required).filter(Boolean).length;
  const total = Object.keys(required).length;
  const completeness = Math.round((present / total) * 100);

  return {
    isValid: completeness >= 80,
    completeness,
    required_fields: required,
    missing_count: total - present,
    score: completeness
  };
}

/**
 * Identify missing critical fields
 */
function identifyMissingFields(data) {
  const missing = [];
  
  if (!data.name || data.name.length < 3) missing.push('name');
  if (!data.price_sek || data.price_sek <= 0) missing.push('price_sek');
  if (!data.total_servings || data.total_servings <= 0) missing.push('total_servings');
  if (!data.serving_size || data.serving_size.length < 2) missing.push('serving_size');
  if (!data.active_ingredients || data.active_ingredients.length === 0) missing.push('active_ingredients');
  if (!data.active_ingredients?.some(i => i.dose_mg > 0)) missing.push('ingredient_doses');
  
  return missing;
}

/**
 * Create user input prompts for missing data
 */
function identifyUserInputNeeds(missingFields, rankedBlocks) {
  const prompts = [];

  if (missingFields.includes('name')) {
    prompts.push({
      field: 'name',
      prompt: 'What is the product name?',
      type: 'text',
      suggestion: getProductNameSuggestion(rankedBlocks)
    });
  }

  if (missingFields.includes('price_sek')) {
    prompts.push({
      field: 'price_sek',
      prompt: 'What is the price in Swedish Krona (SEK)?',
      type: 'number',
      suggestion: getPriceSuggestion(rankedBlocks)
    });
  }

  if (missingFields.includes('total_servings')) {
    prompts.push({
      field: 'total_servings',
      prompt: 'How many servings/doses are in this package?',
      type: 'number',
      suggestion: getServingSuggestion(rankedBlocks)
    });
  }

  if (missingFields.includes('serving_size')) {
    prompts.push({
      field: 'serving_size',
      prompt: 'What is the serving size (e.g., "2 capsules", "5g powder")?',
      type: 'text',
      suggestion: getServingSizeSuggestion(rankedBlocks)
    });
  }

  if (missingFields.includes('active_ingredients')) {
    prompts.push({
      field: 'active_ingredients',
      prompt: 'What are the active ingredients and their doses?',
      type: 'ingredient_list',
      suggestion: 'Please provide ingredient name and dose (e.g., "Creatine: 5000mg, Caffeine: 100mg")'
    });
  }

  return prompts;
}

/**
 * Try vision OCR fallback for ingredient tables
 */
async function tryVisionFallback(rankedBlocks, missingFields) {
  try {
    // Find the best table or ingredient block for vision analysis
    const bestBlock = findBestBlockForVision(rankedBlocks, missingFields);
    
    if (!bestBlock) {
      console.log('👁️ No suitable block found for vision analysis');
      return { success: false };
    }

    console.log('👁️ Attempting vision analysis on block:', bestBlock.element);

    // Create a focused vision prompt for the specific missing information
    const visionPrompt = createVisionPrompt(missingFields);

    const response = await fetch('/api/vision-fallback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html_block: bestBlock.html,
        prompt: visionPrompt,
        missing_fields: missingFields
      })
    });

    if (response.ok) {
      const visionData = await response.json();
      return { success: true, data: visionData };
    }

    return { success: false };
  } catch (error) {
    console.error('👁️ Vision fallback error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Find the best block for vision analysis
 */
function findBestBlockForVision(rankedBlocks, missingFields) {
  // Prioritize tables for ingredient information
  if (missingFields.includes('active_ingredients') && rankedBlocks.nutritional_blocks.length > 0) {
    return rankedBlocks.nutritional_blocks[0];
  }

  if (missingFields.includes('active_ingredients') && rankedBlocks.ingredient_blocks.length > 0) {
    return rankedBlocks.ingredient_blocks[0];
  }

  // For other missing fields, find highest scoring block
  const allBlocks = Object.values(rankedBlocks).flat().sort((a, b) => b.relevance_score - a.relevance_score);
  return allBlocks.length > 0 ? allBlocks[0] : null;
}

/**
 * Create vision prompt for specific missing fields
 */
function createVisionPrompt(missingFields) {
  let prompt = 'Extract supplement information from this content. ';

  if (missingFields.includes('active_ingredients')) {
    prompt += 'Focus on identifying active ingredients and their doses per serving. ';
  }
  if (missingFields.includes('serving_size')) {
    prompt += 'Identify the recommended serving size. ';
  }
  if (missingFields.includes('total_servings')) {
    prompt += 'Determine how many servings are in the package. ';
  }

  prompt += 'Return only the specific information requested in JSON format.';
  
  return prompt;
}

/**
 * Merge fallback data from different sources
 */
function mergeFallbackData(patternData, visionData) {
  const merged = { ...patternData };

  // Merge active ingredients
  if (visionData.active_ingredients && visionData.active_ingredients.length > 0) {
    merged.active_ingredients = visionData.active_ingredients;
  }

  // Merge other fields if vision provided better data
  if (visionData.serving_size && !merged.serving_size) {
    merged.serving_size = visionData.serving_size;
  }

  if (visionData.total_servings && !merged.total_servings) {
    merged.total_servings = visionData.total_servings;
  }

  return merged;
}

/**
 * Create minimal data structure when all extraction fails
 */
function createMinimalStructure(rankedBlocks) {
  return {
    name: getProductNameSuggestion(rankedBlocks) || 'Unknown Product',
    price_sek: null,
    total_servings: null,
    serving_size: null,
    active_ingredients: [],
    product_type: null,
    confidence: 0
  };
}

/**
 * Helper functions for suggestions
 */
function getProductNameSuggestion(rankedBlocks) {
  const headers = rankedBlocks.other_blocks?.filter(block => block.element.startsWith('h'));
  return headers.length > 0 ? headers[0].text : null;
}

function getPriceSuggestion(rankedBlocks) {
  // Try to find any number that might be a price
  const priceBlocks = rankedBlocks.price_blocks || [];
  const priceMatch = priceBlocks[0]?.text.match(/(\d+)/);
  return priceMatch ? parseInt(priceMatch[1]) : null;
}

function getServingSuggestion(rankedBlocks) {
  const quantityBlocks = rankedBlocks.quantity_blocks || [];
  const quantityMatch = quantityBlocks[0]?.text.match(/(\d+)/);
  return quantityMatch ? parseInt(quantityMatch[1]) : null;
}

function getServingSizeSuggestion(rankedBlocks) {
  const dosageBlocks = rankedBlocks.dosage_blocks || [];
  if (dosageBlocks.length > 0) {
    const text = dosageBlocks[0].text.toLowerCase();
    if (text.includes('caps')) return '2 capsules';
    if (text.includes('tabl')) return '1 tablet';
    if (text.includes('scoop')) return '1 scoop';
  }
  return null;
}

function createUserInputPrompts(rankedBlocks) {
  return [
    {
      field: 'complete_manual',
      prompt: 'We could not automatically extract all supplement information. Please provide the missing details.',
      type: 'manual_form',
      suggestion: 'Use the form below to complete the product information'
    }
  ];
}