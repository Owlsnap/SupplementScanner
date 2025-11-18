/**
 * Layer 1: DOM Block Extraction
 * Extracts semantic blocks from HTML and ranks them by relevance
 */

// Keywords that indicate supplement-relevant content
const RELEVANCE_KEYWORDS = {
  price: ['kr', 'sek', 'pris', 'kostnad', 'price', ':-', 'kostar'],
  ingredients: ['mg', 'g', 'mcg', 'μg', 'iu', 'caps', 'kapslar', 'tabletter', 'tabletter', 'ingrediens', 'innehåll', 'ingredients', 'active', 'aktiv'],
  dosage: ['dosering', 'portion', 'serving', 'daglig', 'daily', 'rekommenderad', 'recommended', 'dos', 'dose'],
  quantity: ['antal', 'count', 'stycken', 'pieces', 'portioner', 'servings', 'kapslar', 'caps'],
  nutritional: ['näringsdeklaration', 'nutrition', 'facts', 'innehåll', 'per', 'varje', 'each']
};

/**
 * Extract all semantic blocks from HTML
 */
export function extractSemanticBlocks(html) {
  // Create a DOM parser for the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const blocks = {
    tables: [],
    lists: [],
    paragraphs: [],
    spans: [],
    divs: [],
    headers: []
  };

  // Extract tables with their structure
  const tables = doc.querySelectorAll('table');
  tables.forEach((table, index) => {
    const rows = Array.from(table.querySelectorAll('tr')).map(row => {
      return Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim());
    });
    
    blocks.tables.push({
      index,
      element: 'table',
      text: table.textContent.trim(),
      structure: rows,
      html: table.outerHTML
    });
  });

  // Extract lists (ul, ol)
  const lists = doc.querySelectorAll('ul, ol');
  lists.forEach((list, index) => {
    const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());
    
    blocks.lists.push({
      index,
      element: list.tagName.toLowerCase(),
      text: list.textContent.trim(),
      items,
      html: list.outerHTML
    });
  });

  // Extract paragraphs
  const paragraphs = doc.querySelectorAll('p');
  paragraphs.forEach((p, index) => {
    if (p.textContent.trim().length > 10) { // Filter out empty paragraphs
      blocks.paragraphs.push({
        index,
        element: 'p',
        text: p.textContent.trim(),
        html: p.outerHTML
      });
    }
  });

  // Extract important spans (those with classes or containing numbers)
  const spans = doc.querySelectorAll('span');
  spans.forEach((span, index) => {
    const text = span.textContent.trim();
    if (text.length > 3 && (
      span.className || 
      /\d/.test(text) || 
      containsRelevantKeywords(text)
    )) {
      blocks.spans.push({
        index,
        element: 'span',
        text,
        className: span.className,
        html: span.outerHTML
      });
    }
  });

  // Extract divs with relevant content
  const divs = doc.querySelectorAll('div');
  divs.forEach((div, index) => {
    const text = div.textContent.trim();
    if (text.length > 10 && text.length < 500 && ( // Reasonable size
      div.className || 
      div.id ||
      containsRelevantKeywords(text)
    )) {
      // Avoid nested divs by checking if this div's text is mostly contained in a child
      const childText = Array.from(div.children).map(child => child.textContent).join(' ').trim();
      if (text.length > childText.length * 1.3) { // Has substantial unique content
        blocks.divs.push({
          index,
          element: 'div',
          text,
          className: div.className,
          id: div.id,
          html: div.outerHTML.substring(0, 1000) // Limit HTML size
        });
      }
    }
  });

  // Extract headers (h1-h6) for context
  const headers = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headers.forEach((header, index) => {
    blocks.headers.push({
      index,
      element: header.tagName.toLowerCase(),
      text: header.textContent.trim(),
      html: header.outerHTML
    });
  });

  return blocks;
}

/**
 * Check if text contains supplement-relevant keywords
 */
function containsRelevantKeywords(text) {
  const lowerText = text.toLowerCase();
  return Object.values(RELEVANCE_KEYWORDS).some(keywords =>
    keywords.some(keyword => lowerText.includes(keyword))
  );
}

/**
 * Rank blocks by relevance to supplement information
 */
export function rankBlocksByRelevance(blocks) {
  const rankedBlocks = {
    price_blocks: [],
    ingredient_blocks: [],
    dosage_blocks: [],
    quantity_blocks: [],
    nutritional_blocks: [],
    other_blocks: []
  };

  // Process all block types
  Object.values(blocks).flat().forEach(block => {
    const score = calculateRelevanceScore(block);
    const category = categorizeBlock(block);
    
    const enrichedBlock = {
      ...block,
      relevance_score: score.total,
      relevance_details: score.details,
      category
    };

    // Add to appropriate category
    switch (category) {
      case 'price':
        rankedBlocks.price_blocks.push(enrichedBlock);
        break;
      case 'ingredients':
        rankedBlocks.ingredient_blocks.push(enrichedBlock);
        break;
      case 'dosage':
        rankedBlocks.dosage_blocks.push(enrichedBlock);
        break;
      case 'quantity':
        rankedBlocks.quantity_blocks.push(enrichedBlock);
        break;
      case 'nutritional':
        rankedBlocks.nutritional_blocks.push(enrichedBlock);
        break;
      default:
        rankedBlocks.other_blocks.push(enrichedBlock);
    }
  });

  // Sort each category by relevance score
  Object.keys(rankedBlocks).forEach(category => {
    rankedBlocks[category].sort((a, b) => b.relevance_score - a.relevance_score);
    // Keep only top 5 most relevant blocks per category
    rankedBlocks[category] = rankedBlocks[category].slice(0, 5);
  });

  return rankedBlocks;
}

/**
 * Calculate relevance score for a block
 */
function calculateRelevanceScore(block) {
  const text = block.text.toLowerCase();
  const details = {};
  let total = 0;

  // Base score by element type
  const elementScores = {
    table: 15, // Tables often contain structured supplement info
    ul: 10, ol: 10, // Lists often contain ingredients
    div: 8, // Divs with classes/IDs might be important
    span: 5, // Spans might contain specific values
    p: 3, // Paragraphs might contain descriptions
    h1: 5, h2: 5, h3: 5, h4: 5, h5: 5, h6: 5 // Headers provide context
  };
  
  total += elementScores[block.element] || 0;
  details.element_score = elementScores[block.element] || 0;

  // Keyword scoring
  let keywordScore = 0;
  Object.entries(RELEVANCE_KEYWORDS).forEach(([category, keywords]) => {
    const matches = keywords.filter(keyword => text.includes(keyword));
    if (matches.length > 0) {
      keywordScore += matches.length * 3;
      details[`${category}_keywords`] = matches;
    }
  });
  total += keywordScore;
  details.keyword_score = keywordScore;

  // Number density (supplements have lots of numbers)
  const numberMatches = text.match(/\d+/g) || [];
  const numberScore = Math.min(numberMatches.length * 2, 15);
  total += numberScore;
  details.number_score = numberScore;

  // Unit indicators (mg, g, etc.)
  const unitMatches = text.match(/\d+\s*(mg|g|mcg|μg|iu|%)/gi) || [];
  const unitScore = unitMatches.length * 5;
  total += unitScore;
  details.unit_score = unitScore;

  // Class/ID relevance (for divs and spans)
  if (block.className || block.id) {
    const classText = `${block.className || ''} ${block.id || ''}`.toLowerCase();
    const classKeywords = ['price', 'pris', 'ingredient', 'innehåll', 'nutrition', 'dosage', 'serving'];
    const classMatches = classKeywords.filter(keyword => classText.includes(keyword));
    const classScore = classMatches.length * 8;
    total += classScore;
    details.class_score = classScore;
  }

  return { total, details };
}

/**
 * Categorize a block based on its content
 */
function categorizeBlock(block) {
  const text = block.text.toLowerCase();

  // Price indicators
  if (RELEVANCE_KEYWORDS.price.some(keyword => text.includes(keyword))) {
    return 'price';
  }

  // Ingredient indicators
  if (RELEVANCE_KEYWORDS.ingredients.some(keyword => text.includes(keyword))) {
    return 'ingredients';
  }

  // Dosage indicators
  if (RELEVANCE_KEYWORDS.dosage.some(keyword => text.includes(keyword))) {
    return 'dosage';
  }

  // Quantity indicators
  if (RELEVANCE_KEYWORDS.quantity.some(keyword => text.includes(keyword))) {
    return 'quantity';
  }

  // Nutritional indicators
  if (RELEVANCE_KEYWORDS.nutritional.some(keyword => text.includes(keyword))) {
    return 'nutritional';
  }

  return 'other';
}

/**
 * Extract and rank all blocks from HTML
 */
export function extractAndRankBlocks(html) {
  console.log('🔍 Layer 1: Extracting semantic blocks...');
  const blocks = extractSemanticBlocks(html);
  console.log('📦 Extracted blocks:', {
    tables: blocks.tables.length,
    lists: blocks.lists.length,
    paragraphs: blocks.paragraphs.length,
    spans: blocks.spans.length,
    divs: blocks.divs.length,
    headers: blocks.headers.length
  });

  console.log('🎯 Layer 1: Ranking blocks by relevance...');
  const rankedBlocks = rankBlocksByRelevance(blocks);
  console.log('📊 Ranked blocks:', {
    price_blocks: rankedBlocks.price_blocks.length,
    ingredient_blocks: rankedBlocks.ingredient_blocks.length,
    dosage_blocks: rankedBlocks.dosage_blocks.length,
    quantity_blocks: rankedBlocks.quantity_blocks.length,
    nutritional_blocks: rankedBlocks.nutritional_blocks.length,
    other_blocks: rankedBlocks.other_blocks.length
  });

  return rankedBlocks;
}