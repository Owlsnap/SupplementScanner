/**
 * Layer 2: Pattern-Based Extraction
 * Extract structured data using regex patterns before AI processing
 */

// Regex patterns for different data types
const PATTERNS = {
  price: {
    // Swedish price patterns
    swedish_kr: /(\d{1,4}(?:[.,]\d{2})?)\s*kr\b/gi,
    swedish_sek: /(\d{1,4}(?:[.,]\d{2})?)\s*sek\b/gi,
    swedish_colon: /(\d{1,4})\s*:-/g,
    generic_price: /(?:pris|price|kostnad|kostar)[\s:]*(\d{1,4}(?:[.,]\d{2})?)/gi
  },
  
  dosage: {
    // Dosage with units
    mg_dosage: /(\d+(?:[.,]\d+)?)\s*mg\b/gi,
    g_dosage: /(\d+(?:[.,]\d+)?)\s*g\b/gi,
    mcg_dosage: /(\d+(?:[.,]\d+)?)\s*(?:mcg|μg)\b/gi,
    iu_dosage: /(\d+(?:[.,]\d+)?)\s*iu\b/gi,
    percent_dosage: /(\d+(?:[.,]\d+)?)\s*%/g
  },
  
  quantity: {
    // Quantity indicators
    capsules: /(\d+)\s*(?:kaps|caps|kapslar|capsules)/gi,
    tablets: /(\d+)\s*(?:tabl|tabs|tabletter|tablets)/gi,
    servings: /(\d+)\s*(?:port|serv|portioner|servings)/gi,
    pieces: /(\d+)\s*(?:st|stk|stycken|pieces)/gi,
    count_generic: /(?:antal|count|stycken)[\s:]*(\d+)/gi
  },
  
  serving_size: {
    // Serving size patterns
    per_serving: /(?:per\s+(?:portion|serving|dos))[\s:]*(\d+(?:[.,]\d+)?)\s*(mg|g|ml|kaps|tabs)/gi,
    daily_dose: /(?:daglig\s+(?:dos|dosering)|daily\s+dose)[\s:]*(\d+(?:[.,]\d+)?)\s*(mg|g|ml|kaps|tabs)/gi,
    recommended: /(?:rekommenderad|recommended)[\s\w]*[\s:]*(\d+(?:[.,]\d+)?)\s*(mg|g|ml|kaps|tabs)/gi
  },
  
  ingredients: {
    // Active ingredient patterns
    ingredient_amount: /([A-Za-zåäöÅÄÖ\s\-]+)[\s:]*(\d+(?:[.,]\d+)?)\s*(mg|g|mcg|μg|iu|%)/gi,
    ingredient_list: /(?:ingrediens|ingredients|innehåll|active)[\s\w]*:\s*([^.]+)/gi,
    per_unit: /per\s+(?:kaps|caps|tabl|tabs|portion|serving)[\s:]*([^.]+)/gi
  },
  
  product_name: {
    // Product name patterns
    title_tags: /<(?:title|h1|h2)[^>]*>([^<]+)</gi,
    product_class: /class="[^"]*(?:product|title|name)[^"]*"[^>]*>([^<]+)</gi
  }
};

/**
 * Extract data using regex patterns from text blocks
 */
export function extractWithPatterns(rankedBlocks) {
  console.log('🔍 Layer 2: Starting pattern-based extraction...');
  
  const extraction = {
    price: null,
    dosages: [],
    quantities: [],
    serving_sizes: [],
    ingredients: [],
    product_name: null,
    confidence_scores: {}
  };

  // Extract from each block category
  extractPrices(rankedBlocks.price_blocks, extraction);
  extractDosages(rankedBlocks.ingredient_blocks.concat(rankedBlocks.nutritional_blocks), extraction);
  extractQuantities(rankedBlocks.quantity_blocks, extraction);
  extractServingSizes(rankedBlocks.dosage_blocks.concat(rankedBlocks.nutritional_blocks), extraction);
  extractIngredients(rankedBlocks.ingredient_blocks.concat(rankedBlocks.nutritional_blocks), extraction);
  extractProductName(rankedBlocks, extraction);

  // Calculate confidence scores
  calculateConfidenceScores(extraction);

  console.log('📊 Layer 2: Pattern extraction results:', {
    price: extraction.price,
    dosages_found: extraction.dosages.length,
    quantities_found: extraction.quantities.length,
    ingredients_found: extraction.ingredients.length,
    confidence: extraction.confidence_scores
  });

  return extraction;
}

/**
 * Extract price information
 */
function extractPrices(priceBlocks, extraction) {
  const prices = [];
  
  priceBlocks.forEach(block => {
    Object.entries(PATTERNS.price).forEach(([pattern_name, regex]) => {
      const matches = [...block.text.matchAll(regex)];
      matches.forEach(match => {
        const price = parseFloat(match[1].replace(',', '.'));
        if (price > 0 && price < 10000) { // Reasonable price range
          prices.push({
            value: price,
            source: pattern_name,
            context: match[0],
            block_score: block.relevance_score
          });
        }
      });
    });
  });

  // Select most likely price (highest scoring block with reasonable value)
  if (prices.length > 0) {
    prices.sort((a, b) => b.block_score - a.block_score);
    extraction.price = prices[0].value;
    extraction.confidence_scores.price = Math.min(95, 60 + (prices[0].block_score * 2));
  }
}

/**
 * Extract dosage information
 */
function extractDosages(blocks, extraction) {
  blocks.forEach(block => {
    Object.entries(PATTERNS.dosage).forEach(([pattern_name, regex]) => {
      const matches = [...block.text.matchAll(regex)];
      matches.forEach(match => {
        const value = parseFloat(match[1].replace(',', '.'));
        const unit = pattern_name.replace('_dosage', '');
        
        if (value > 0) {
          extraction.dosages.push({
            value,
            unit,
            context: match[0],
            block_score: block.relevance_score
          });
        }
      });
    });
  });

  // Sort by relevance
  extraction.dosages.sort((a, b) => b.block_score - a.block_score);
}

/**
 * Extract quantity information
 */
function extractQuantities(blocks, extraction) {
  blocks.forEach(block => {
    Object.entries(PATTERNS.quantity).forEach(([pattern_name, regex]) => {
      const matches = [...block.text.matchAll(regex)];
      matches.forEach(match => {
        const value = parseInt(match[1]);
        const type = pattern_name;
        
        if (value > 0 && value < 1000) { // Reasonable quantity range
          extraction.quantities.push({
            value,
            type,
            context: match[0],
            block_score: block.relevance_score
          });
        }
      });
    });
  });

  // Sort by relevance
  extraction.quantities.sort((a, b) => b.block_score - a.block_score);
}

/**
 * Extract serving size information
 */
function extractServingSizes(blocks, extraction) {
  blocks.forEach(block => {
    Object.entries(PATTERNS.serving_size).forEach(([pattern_name, regex]) => {
      const matches = [...block.text.matchAll(regex)];
      matches.forEach(match => {
        const value = parseFloat(match[1].replace(',', '.'));
        const unit = match[2];
        
        if (value > 0) {
          extraction.serving_sizes.push({
            value,
            unit,
            type: pattern_name,
            context: match[0],
            block_score: block.relevance_score
          });
        }
      });
    });
  });

  // Sort by relevance
  extraction.serving_sizes.sort((a, b) => b.block_score - a.block_score);
}

/**
 * Extract ingredient information
 */
function extractIngredients(blocks, extraction) {
  blocks.forEach(block => {
    // Extract ingredient amounts
    const ingredientMatches = [...block.text.matchAll(PATTERNS.ingredients.ingredient_amount)];
    ingredientMatches.forEach(match => {
      const name = match[1].trim();
      const amount = parseFloat(match[2].replace(',', '.'));
      const unit = match[3];
      
      if (name.length > 2 && amount > 0) {
        extraction.ingredients.push({
          name: cleanIngredientName(name),
          amount,
          unit,
          context: match[0],
          block_score: block.relevance_score
        });
      }
    });

    // Extract ingredient lists
    const listMatches = [...block.text.matchAll(PATTERNS.ingredients.ingredient_list)];
    listMatches.forEach(match => {
      const ingredientList = match[1].trim();
      const ingredients = parseIngredientList(ingredientList);
      
      ingredients.forEach(ingredient => {
        extraction.ingredients.push({
          name: ingredient.name,
          amount: ingredient.amount || null,
          unit: ingredient.unit || null,
          context: match[0],
          block_score: block.relevance_score
        });
      });
    });
  });

  // Remove duplicates and sort by relevance
  extraction.ingredients = removeDuplicateIngredients(extraction.ingredients);
  extraction.ingredients.sort((a, b) => b.block_score - a.block_score);
}

/**
 * Extract product name
 */
function extractProductName(rankedBlocks, extraction) {
  const names = [];
  
  // Check headers first
  rankedBlocks.other_blocks.concat(Object.values(rankedBlocks).flat()).forEach(block => {
    if (block.element.startsWith('h') && block.text.length > 5 && block.text.length < 100) {
      names.push({
        name: block.text.trim(),
        score: block.relevance_score + 10, // Bonus for headers
        source: 'header'
      });
    }
  });

  // Use regex patterns on HTML if available
  Object.values(rankedBlocks).flat().forEach(block => {
    if (block.html) {
      Object.entries(PATTERNS.product_name).forEach(([pattern_name, regex]) => {
        const matches = [...block.html.matchAll(regex)];
        matches.forEach(match => {
          const name = match[1].trim();
          if (name.length > 5 && name.length < 100) {
            names.push({
              name,
              score: block.relevance_score + 5,
              source: pattern_name
            });
          }
        });
      });
    }
  });

  // Select best name
  if (names.length > 0) {
    names.sort((a, b) => b.score - a.score);
    extraction.product_name = names[0].name;
  }
}

/**
 * Calculate confidence scores for extraction
 */
function calculateConfidenceScores(extraction) {
  // Price confidence (already calculated above)
  
  // Ingredients confidence
  if (extraction.ingredients.length > 0) {
    const hasAmounts = extraction.ingredients.filter(i => i.amount).length;
    extraction.confidence_scores.ingredients = Math.min(95, 30 + (hasAmounts * 15));
  } else {
    extraction.confidence_scores.ingredients = 0;
  }

  // Quantity confidence
  if (extraction.quantities.length > 0) {
    extraction.confidence_scores.quantity = Math.min(90, 50 + (extraction.quantities[0].block_score * 2));
  } else {
    extraction.confidence_scores.quantity = 0;
  }

  // Serving size confidence
  if (extraction.serving_sizes.length > 0) {
    extraction.confidence_scores.serving_size = Math.min(90, 40 + (extraction.serving_sizes[0].block_score * 2));
  } else {
    extraction.confidence_scores.serving_size = 0;
  }

  // Overall confidence
  const scores = Object.values(extraction.confidence_scores);
  extraction.confidence_scores.overall = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
}

/**
 * Clean ingredient names
 */
function cleanIngredientName(name) {
  return name
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/\s+/g, ' ') // Normalize whitespace
    .toLowerCase()
    .trim();
}

/**
 * Parse ingredient list text
 */
function parseIngredientList(text) {
  const ingredients = [];
  
  // Split by common separators
  const parts = text.split(/[,;]/).map(part => part.trim());
  
  parts.forEach(part => {
    // Try to extract amount and unit
    const amountMatch = part.match(/(\d+(?:[.,]\d+)?)\s*(mg|g|mcg|μg|iu|%)/i);
    if (amountMatch) {
      const name = part.replace(amountMatch[0], '').trim();
      if (name.length > 1) {
        ingredients.push({
          name: cleanIngredientName(name),
          amount: parseFloat(amountMatch[1].replace(',', '.')),
          unit: amountMatch[2].toLowerCase()
        });
      }
    } else if (part.length > 1) {
      // Just ingredient name
      ingredients.push({
        name: cleanIngredientName(part)
      });
    }
  });
  
  return ingredients;
}

/**
 * Remove duplicate ingredients
 */
function removeDuplicateIngredients(ingredients) {
  const seen = new Set();
  return ingredients.filter(ingredient => {
    const key = ingredient.name.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}