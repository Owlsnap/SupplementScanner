/**
 * Multi-Layer Extraction System Orchestrator
 * Coordinates all 4 layers: DOM extraction, pattern matching, AI normalization, and validation
 */

import { extractAndRankBlocks } from './domBlockExtractor.js';
import { extractWithPatterns } from './patternExtractor.js';
import { validateWithFallbacks } from './validationFallback.js';

/**
 * Main orchestrator function for the multi-layer extraction
 */
export async function extractSupplementData(html, url = null) {
  console.log('🚀 Starting Multi-Layer Extraction System...');
  
  const extractionResult = {
    success: false,
    data: null,
    layers: {
      layer1_blocks: null,
      layer2_patterns: null,
      layer3_ai: null,
      layer4_validation: null
    },
    metadata: {
      url,
      extraction_time: Date.now(),
      layers_completed: 0,
      fallbacks_used: [],
      confidence_breakdown: {}
    }
  };

  try {
    // LAYER 1: DOM Block Extraction
    console.log('📦 Layer 1: Extracting semantic blocks...');
    const startTime = performance.now();
    
    const rankedBlocks = extractAndRankBlocks(html);
    extractionResult.layers.layer1_blocks = rankedBlocks;
    extractionResult.metadata.layers_completed = 1;
    
    const layer1Time = performance.now() - startTime;
    console.log(`✅ Layer 1 completed in ${layer1Time.toFixed(1)}ms`);

    // Validate Layer 1 results
    const totalBlocks = Object.values(rankedBlocks).reduce((sum, blocks) => sum + blocks.length, 0);
    if (totalBlocks === 0) {
      throw new Error('No semantic blocks extracted from HTML');
    }

    // LAYER 2: Pattern-Based Extraction
    console.log('🔍 Layer 2: Applying regex patterns...');
    const layer2Start = performance.now();
    
    const patternExtraction = extractWithPatterns(rankedBlocks);
    extractionResult.layers.layer2_patterns = patternExtraction;
    extractionResult.metadata.layers_completed = 2;
    extractionResult.metadata.confidence_breakdown.pattern_confidence = patternExtraction.confidence_scores;
    
    const layer2Time = performance.now() - layer2Start;
    console.log(`✅ Layer 2 completed in ${layer2Time.toFixed(1)}ms`);

    // LAYER 3 & 4: AI Normalization + Validation with Fallbacks
    console.log('🤖 Layer 3-4: AI normalization and validation...');
    const layer34Start = performance.now();
    
    const validationResult = await validateWithFallbacks(rankedBlocks, patternExtraction);
    extractionResult.layers.layer3_ai = validationResult.source?.includes('ai') ? validationResult : null;
    extractionResult.layers.layer4_validation = validationResult;
    extractionResult.metadata.layers_completed = 4;
    extractionResult.metadata.fallbacks_used = validationResult.fallbacks_used || [];
    
    const layer34Time = performance.now() - layer34Start;
    console.log(`✅ Layers 3-4 completed in ${layer34Time.toFixed(1)}ms`);

    // Final results
    if (validationResult.success && validationResult.data) {
      extractionResult.success = true;
      extractionResult.data = validationResult.data;
      extractionResult.metadata.final_confidence = validationResult.data.confidence || 0;
      extractionResult.metadata.completeness = validationResult.validation?.completeness || 0;
      
      console.log('🎉 Multi-layer extraction successful!');
      console.log(`📊 Final confidence: ${extractionResult.metadata.final_confidence}%`);
      console.log(`📋 Completeness: ${extractionResult.metadata.completeness}%`);
      console.log(`⏱️ Total time: ${(performance.now() - startTime).toFixed(1)}ms`);
      
    } else {
      extractionResult.success = false;
      extractionResult.data = validationResult.data; // Partial data
      extractionResult.metadata.missing_fields = validationResult.missing_fields || [];
      extractionResult.metadata.user_input_needed = validationResult.user_input_needed || [];
      
      console.log('⚠️ Multi-layer extraction partially successful');
      console.log('❌ Missing fields:', extractionResult.metadata.missing_fields);
      console.log('👤 User input needed:', extractionResult.metadata.user_input_needed.length > 0);
    }

    extractionResult.metadata.extraction_time = Date.now() - extractionResult.metadata.extraction_time;
    return extractionResult;

  } catch (error) {
    console.error('💥 Multi-layer extraction failed:', error);
    
    extractionResult.success = false;
    extractionResult.error = error.message;
    extractionResult.metadata.extraction_time = Date.now() - extractionResult.metadata.extraction_time;
    
    return extractionResult;
  }
}

/**
 * Process user input to complete partial extraction
 */
export function completeWithUserInput(partialResult, userInput) {
  console.log('👤 Processing user input to complete extraction...');
  
  if (!partialResult.data) {
    throw new Error('No partial data to complete');
  }

  const completedData = { ...partialResult.data };
  
  // Apply user input to missing fields
  Object.entries(userInput).forEach(([field, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (field === 'active_ingredients' && typeof value === 'string') {
        // Parse ingredient string input
        completedData[field] = parseIngredientInput(value);
      } else {
        completedData[field] = value;
      }
    }
  });

  // Recalculate confidence
  completedData.confidence = Math.min(90, (completedData.confidence || 30) + 40);
  
  // Update metadata
  const updatedResult = {
    ...partialResult,
    success: true,
    data: completedData,
    metadata: {
      ...partialResult.metadata,
      completed_by_user: true,
      user_input_fields: Object.keys(userInput),
      final_confidence: completedData.confidence
    }
  };

  console.log('✅ Extraction completed with user input');
  console.log(`📊 Final confidence: ${completedData.confidence}%`);
  
  return updatedResult;
}

/**
 * Parse user ingredient input
 */
function parseIngredientInput(ingredientString) {
  const ingredients = [];
  
  // Split by common separators
  const parts = ingredientString.split(/[,;]/).map(part => part.trim());
  
  parts.forEach((part, index) => {
    // Try to extract name and dose
    const match = part.match(/^([^:]+):\s*(\d+(?:\.\d+)?)\s*(mg|g|mcg)?/i);
    
    if (match) {
      const name = match[1].trim();
      const dose = parseFloat(match[2]);
      const unit = (match[3] || 'mg').toLowerCase();
      
      // Convert to mg
      let doseInMg = dose;
      if (unit === 'g') doseInMg = dose * 1000;
      else if (unit === 'mcg') doseInMg = dose * 0.001;
      
      ingredients.push({
        name: name,
        dose_mg: doseInMg,
        is_primary: index === 0
      });
    } else if (part.length > 1) {
      // Just ingredient name without dose
      ingredients.push({
        name: part,
        dose_mg: 0,
        is_primary: index === 0
      });
    }
  });
  
  return ingredients;
}

/**
 * Get extraction summary for debugging
 */
export function getExtractionSummary(extractionResult) {
  const summary = {
    success: extractionResult.success,
    layers_completed: extractionResult.metadata.layers_completed,
    total_time: extractionResult.metadata.extraction_time,
    confidence: extractionResult.metadata.final_confidence || 0,
    completeness: extractionResult.metadata.completeness || 0,
    fallbacks_used: extractionResult.metadata.fallbacks_used.length,
    user_input_needed: !!extractionResult.metadata.user_input_needed?.length,
    blocks_found: {},
    patterns_found: {},
    final_data: {}
  };

  // Layer 1 summary
  if (extractionResult.layers.layer1_blocks) {
    const blocks = extractionResult.layers.layer1_blocks;
    summary.blocks_found = {
      price_blocks: blocks.price_blocks?.length || 0,
      ingredient_blocks: blocks.ingredient_blocks?.length || 0,
      dosage_blocks: blocks.dosage_blocks?.length || 0,
      quantity_blocks: blocks.quantity_blocks?.length || 0,
      nutritional_blocks: blocks.nutritional_blocks?.length || 0,
      total: Object.values(blocks).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    };
  }

  // Layer 2 summary
  if (extractionResult.layers.layer2_patterns) {
    const patterns = extractionResult.layers.layer2_patterns;
    summary.patterns_found = {
      price: !!patterns.price,
      dosages: patterns.dosages?.length || 0,
      quantities: patterns.quantities?.length || 0,
      ingredients: patterns.ingredients?.length || 0,
      confidence: patterns.confidence_scores?.overall || 0
    };
  }

  // Final data summary
  if (extractionResult.data) {
    summary.final_data = {
      has_name: !!extractionResult.data.name,
      has_price: !!extractionResult.data.price_sek,
      has_servings: !!extractionResult.data.total_servings,
      has_serving_size: !!extractionResult.data.serving_size,
      ingredient_count: extractionResult.data.active_ingredients?.length || 0,
      has_primary_ingredient: extractionResult.data.active_ingredients?.some(i => i.is_primary) || false
    };
  }

  return summary;
}