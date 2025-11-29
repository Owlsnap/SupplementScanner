/**
 * Multi-Layer Extraction System Orchestrator
 * Coordinates all 4 layers: DOM extraction, pattern matching, AI normalization, and validation
 */

import { extractAndRankBlocks } from './domBlockExtractor.js';
import { extractWithPatterns } from './patternExtractor.js';
import { validateWithFallbacks } from './validationFallback.js';
import StructuredAINormalizer from './structuredAINormalizer.js';

/**
 * Parallel extraction that runs both structured ingredient extraction and legacy AI analysis simultaneously
 */
export async function extractSupplementDataParallel(html, url = null) {
  console.log('🔥 PARALLEL EXTRACTION INITIATED!');
  console.log('⚡ Running structured ingredient extraction + legacy AI analysis in parallel');
  console.log(`🔗 Processing URL: ${url}`);
  
  const startTime = performance.now();
  
  try {
    // For known sites with working extractors, prioritize structured extraction
    if (url && url.includes('tillskottsbolaget.se')) {
      console.log('🏢 Known site detected, running structured extraction first...');
      
      const structuredResult = await extractSupplementDataStructured(html, url);
      
      if (structuredResult.success && structuredResult.structuredData?.extractionMetadata?.confidence > 0.8) {
        console.log('🎯 High confidence structured extraction successful, skipping legacy extraction');
        
        return {
          success: true,
          data: {
            structuredIngredients: structuredResult.structuredData,
            parallel_extraction: true,
            structured_confidence: structuredResult.metadata?.confidence,
            optimized_extraction: true
          },
          structuredData: structuredResult.structuredData,
          metadata: {
            ...structuredResult.metadata,
            parallel_extraction: true,
            extraction_method: 'optimized_structured',
            total_time: performance.now() - startTime
          }
        };
      }
    }
    
    // Run both extractions in parallel for unknown sites or low confidence
    const [structuredResult, legacyResult] = await Promise.all([
      extractSupplementDataStructured(html, url),
      extractSupplementData(html, url)
    ]);
    
    console.log('🎯 Both extractions completed, combining results...');
    
    // Combine the best of both worlds
    const combinedResult = {
      success: structuredResult.success || legacyResult.success,
      data: {
        // Use legacy for basic product info (name, price, quality analysis)
        ...legacyResult.data,
        // Enhance with structured ingredient data
        structuredIngredients: structuredResult.structuredData,
        // Keep both extraction methods metadata
        parallel_extraction: true,
        structured_confidence: structuredResult.metadata?.confidence,
        legacy_confidence: legacyResult.metadata?.confidence
      },
      structuredData: structuredResult.structuredData,
      metadata: {
        ...legacyResult.metadata,
        parallel_extraction: true,
        structured_layers_completed: structuredResult.metadata?.layers_completed,
        legacy_layers_completed: legacyResult.metadata?.layers_completed,
        extraction_method: 'parallel',
        total_time: performance.now() - startTime
      }
    };
    
    const totalTime = performance.now() - startTime;
    console.log(`🚀 Parallel extraction completed in ${totalTime.toFixed(1)}ms`);
    console.log(`📊 Combined result quality:`, {
      hasBasicInfo: !!(combinedResult.data.name && combinedResult.data.price),
      hasStructuredIngredients: !!combinedResult.structuredData?.ingredients,
      structuredSuccess: structuredResult.success,
      legacySuccess: legacyResult.success
    });
    
    return combinedResult;
    
  } catch (error) {
    console.error('❌ Parallel extraction failed:', error);
    
    // Fallback to whichever method works
    console.log('🔄 Falling back to individual extraction methods...');
    try {
      const structuredFallback = await extractSupplementDataStructured(html, url);
      if (structuredFallback.success) return structuredFallback;
      
      const legacyFallback = await extractSupplementData(html, url);
      return legacyFallback;
    } catch (fallbackError) {
      console.error('❌ All extraction methods failed:', fallbackError);
      return {
        success: false,
        error: 'All extraction methods failed',
        details: error.message
      };
    }
  }
}

/**
 * Enhanced extraction that supports structured ingredient parsing
 */
export async function extractSupplementDataStructured(html, url = null) {
  console.log('🧬 STRUCTURED EXTRACTION FUNCTION CALLED!!!');
  console.log('🧬 Starting Structured Multi-Layer Extraction System...');
  console.log(`🔗 Processing URL: ${url}`);
  console.log(`📄 HTML length: ${html?.length || 0} characters`);
  
  const extractionResult = {
    success: false,
    data: null,
    structuredData: null,
    layers: {
      layer1_blocks: null,
      layer2_patterns: null,
      layer3_ai_structured: null,
      layer4_validation: null
    },
    metadata: {
      url,
      extraction_time: Date.now(),
      layers_completed: 0,
      fallbacks_used: [],
      confidence_breakdown: {},
      structured_extraction: true
    }
  };

  try {
    // LAYER 1: DOM Block Extraction (same as before)
    console.log('📦 Layer 1: Extracting semantic blocks...');
    const startTime = performance.now();
    
    const rankedBlocks = extractAndRankBlocks(html);
    extractionResult.layers.layer1_blocks = rankedBlocks;
    extractionResult.metadata.layers_completed = 1;
    
    const layer1Time = performance.now() - startTime;
    console.log(`✅ Layer 1 completed in ${layer1Time.toFixed(1)}ms`);

    // LAYER 2: Pattern Extraction (same as before)
    console.log('🔍 Layer 2: Pattern-based extraction...');
    const layer2Start = performance.now();
    
    const patternData = extractWithPatterns(rankedBlocks, url);
    extractionResult.layers.layer2_patterns = patternData;
    extractionResult.metadata.layers_completed = 2;
    
    const layer2Time = performance.now() - layer2Start;
    console.log(`✅ Layer 2 completed in ${layer2Time.toFixed(1)}ms`);

    // LAYER 3: Structured AI Normalization
    console.log('🧠 Layer 3: Structured AI normalization...');
    const layer3Start = performance.now();
    
    const structuredNormalizer = new StructuredAINormalizer();
    const combinedData = { 
      rankedBlocks, 
      patternData,
      html // Pass original HTML for site-specific extractors
    };
    const structuredData = await structuredNormalizer.normalizeData(combinedData, url);
    
    extractionResult.layers.layer3_ai_structured = structuredData;
    extractionResult.structuredData = structuredData;
    extractionResult.metadata.layers_completed = 3;
    
    const layer3Time = performance.now() - layer3Start;
    console.log(`✅ Layer 3 completed in ${layer3Time.toFixed(1)}ms`);

    // Convert structured data to legacy format for compatibility
    const legacyData = structuredNormalizer.toLegacyFormat(structuredData);
    
    // LAYER 4: Validation & Fallbacks (enhanced for structured data)
    console.log('🔍 Layer 4: Validation with structured data...');
    const layer4Start = performance.now();
    
    const validatedData = validateWithFallbacks(legacyData, extractionResult.layers);
    // Add structured data to validated result
    validatedData.structuredIngredients = structuredData;
    
    extractionResult.layers.layer4_validation = validatedData;
    extractionResult.data = validatedData;
    extractionResult.metadata.layers_completed = 4;
    
    const layer4Time = performance.now() - layer4Start;
    console.log(`✅ Layer 4 completed in ${layer4Time.toFixed(1)}ms`);

    const totalTime = performance.now() - startTime;
    extractionResult.metadata.total_extraction_time_ms = totalTime;
    
    extractionResult.success = true;
    console.log(`🎉 Structured extraction completed successfully in ${totalTime.toFixed(1)}ms`);
    
    return extractionResult;

  } catch (error) {
    console.error('❌ Structured extraction failed:', error);
    extractionResult.metadata.error = error.message;
    
    // Fallback to legacy extraction
    console.log('🔄 Falling back to legacy extraction...');
    try {
      const fallbackResult = await extractSupplementData(html, url);
      return { ...fallbackResult, metadata: { ...fallbackResult.metadata, structured_fallback: true } };
    } catch (fallbackError) {
      console.error('❌ Fallback extraction also failed:', fallbackError);
      return extractionResult;
    }
  }
}

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