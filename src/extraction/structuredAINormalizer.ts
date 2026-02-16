import { swedishIngredientMapping } from '../schemas/zodSchemas.js';
import TillskottsbolagetExtractor from './siteExtractors/tillskottsbolagetExtractor';
import type { 
  StructuredSupplementData, 
  ExtractedData, 
  SiteExtractor,
  NutritionExtractionResult 
} from '../types/index.js';

export default class StructuredAINormalizer {
  private schema: StructuredSupplementData;
  private siteExtractors: SiteExtractor[];

  constructor() {
    // Create default structured supplement data template
    this.schema = {
      productName: "",
      servingSize: "",
      servingsPerContainer: "",
      ingredients: {},
      unrecognizedIngredients: [],
      totalCaffeineContent_mg: null,
      extractionMetadata: {
        tableFound: false,
        ingredientListFound: false,
        servingSizeFound: false,
        confidence: 0.0
      }
    };
    this.siteExtractors = [
      new TillskottsbolagetExtractor()
    ];
  }

  async normalizeData(extractedData: ExtractedData, url: string = ''): Promise<StructuredSupplementData> {
    console.log('🧠 Starting structured AI normalization for:', url);
    console.log('📋 ExtractedData structure:', {
      hasHtml: !!extractedData.html,
      hasRankedBlocks: !!extractedData.rankedBlocks,
      hasPatternData: !!extractedData.patternData,
      keys: Object.keys(extractedData)
    });
    
    // Try site-specific extractors first
    const siteSpecificResult = this.trySiteSpecificExtraction(extractedData, url);
    if (siteSpecificResult && siteSpecificResult.extractionMetadata.confidence > 0.5) {
      console.log('✅ Site-specific extraction successful, skipping AI normalization completely');
      return siteSpecificResult;
    } else {
      console.log('❌ Site-specific extraction failed or low confidence, using fallback structure');
      // For now, skip AI normalization since endpoints don't exist and use fallback
      return this.createFallbackStructure(extractedData);
    }
  }

  trySiteSpecificExtraction(extractedData, url) {
    console.log(`🔍 Checking site-specific extractors for URL: ${url}`);
    console.log(`📊 Available extractedData keys:`, Object.keys(extractedData));
    console.log(`🔧 Available extractors: ${this.siteExtractors.length}`);
    
    for (const extractor of this.siteExtractors) {
      console.log(`🔍 Testing extractor ${extractor.constructor.name} canHandle(${url}):`, extractor.canHandle(url));
      
      if (extractor.canHandle(url)) {
        console.log(`🏢 Using ${extractor.constructor.name} for ${url}`);
        
        try {
          // Get full HTML content for site-specific extraction
          let html = '';
          
          // Try multiple sources for HTML content
          if (extractedData.html) {
            html = extractedData.html;
            console.log(`📄 Using direct HTML content: ${html.length} characters`);
          } else if (extractedData.rankedBlocks) {
            // Concatenate all relevant blocks
            const allBlocks: string[] = [];
            Object.values(extractedData.rankedBlocks).forEach(blocks => {
              if (Array.isArray(blocks)) {
                blocks.forEach(block => {
                  if (block.html) allBlocks.push(block.html);
                  else if (block.text) allBlocks.push(block.text);
                });
              }
            });
            html = allBlocks.join('\n');
            console.log(`📄 Using rankedBlocks HTML content: ${html.length} characters`);
          } else if (extractedData.patternData?.html) {
            html = extractedData.patternData.html;
            console.log(`📄 Using patternData HTML content: ${html.length} characters`);
          }

          if (!html) {
            console.warn('⚠️ No HTML content available for site-specific extraction');
            console.log('Available data structure:', {
              hasHtml: !!extractedData.html,
              hasRankedBlocks: !!extractedData.rankedBlocks,
              hasPatternData: !!extractedData.patternData,
              patternDataKeys: extractedData.patternData ? Object.keys(extractedData.patternData) : []
            });
            continue;
          }

          console.log(`📄 Processing ${html.length} characters of HTML content for ${extractor.constructor.name}`);
          
          const extractionResult = extractor.extractNutritionTable(html);
          const structuredResult = extractor.toStructuredFormat(extractionResult);
          
          if (structuredResult.extractionMetadata.confidence > 0.5) {
            console.log(`✅ ${extractor.constructor.name} extraction successful`);
            
            // Enhance structured result with basic product info from pattern extraction
            if (extractedData.patternData) {
              const patternData = extractedData.patternData;
              
              // Add basic product information to top-level for compatibility
              if (patternData.price && !structuredResult.price) {
                structuredResult.price = patternData.price;
              }
              
              // Try to extract product name from URL first, then pattern data
              if (!structuredResult.name || structuredResult.name === 'Unknown Product') {
                structuredResult.name = this.extractProductNameFromUrl(url) || 
                  patternData.product_name || 
                  structuredResult.name ||
                  'Unknown Product';
                structuredResult.productName = structuredResult.name || 'Unknown Product'; // Sync both fields
              }
            }
            
            // Ensure required fields are present at top level for frontend compatibility
            if (!structuredResult.name && structuredResult.productName) {
              structuredResult.name = structuredResult.productName;
            }
            if (!structuredResult.productName && structuredResult.name) {
              structuredResult.productName = structuredResult.name;
            }
            
            // Log final extracted data for debugging
            console.log(`📝 Final extraction result:`, {
              name: structuredResult.name,
              price: structuredResult.price,
              quantity: structuredResult.quantity,
              unit: structuredResult.unit,
              ingredientCount: Object.keys(structuredResult.ingredients || {}).length
            });
            
            return structuredResult;
          } else {
            console.log(`⚠️ ${extractor.constructor.name} extraction confidence too low: ${structuredResult.extractionMetadata.confidence}`);
          }
        } catch (error) {
          console.error(`❌ ${extractor.constructor.name} failed:`, error);
          continue;
        }
      }
    }
    
    console.log('⚠️ No suitable site-specific extractor found');
    return null;
  }

  // Helper method to extract product name from URL
  extractProductNameFromUrl(url) {
    if (!url) return null;
    
    try {
      // Extract from Tillskottsbolaget URL pattern
      const urlPath = new URL(url).pathname;
      const segments = urlPath.split('/');
      const productSlug = segments[segments.length - 1];
      
      if (productSlug) {
        // Convert slug to readable name and clean up common patterns
        let name = productSlug
          .replace(/-/g, ' ')
          .replace(/^\d+\s*g?$/i, '') // Remove standalone numbers/weights
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
          .trim();
        
        // Clean up specific patterns for this URL structure
        name = name.replace(/^Sv\s+/, ''); // Remove 'sv' prefix
        name = name.replace(/\b(\d+)\s*G\s*g\b/g, '$1 g'); // Fix "400 G g" → "400 g"
        name = name.replace(/\b(\d+)\s*G\b/g, '$1 g'); // Fix "400 G" → "400 g"
        
        return name;
      }
    } catch (e) {
      console.warn('Failed to extract product name from URL:', e);
    }
    
    return null;
  }

  // Helper method to extract quantity from URL
  extractQuantityFromUrl(url) {
    if (!url) return null;
    
    try {
      // Look for common patterns like "400-g", "400g", etc.
      const matches = url.match(/[\-_](\d+)[\-_]?g(?:[\-_]|$)/i);
      if (matches) {
        return parseInt(matches[1]);
      }
    } catch (e) {
      console.warn('Failed to extract quantity from URL:', e);
    }
    
    return null;
  }

  buildStructuredPrompt(extractedData, url) {
    return `You are an expert supplement analyst. Parse the following supplement product data and fill the structured schema with accurate information.

EXTRACTION DATA:
${JSON.stringify(extractedData, null, 2)}

WEBSITE: ${url}

INSTRUCTIONS:
1. Parse ingredient names and dosages carefully
2. Handle Swedish ingredient names (use mapping: ${JSON.stringify(swedishIngredientMapping)})
3. Calculate total caffeine from all sources (caffeine + green tea + CaffShock, etc.)
4. Set confidence based on data quality (1.0 = perfect table found, 0.5 = partial info, 0.1 = minimal data)
5. Add unrecognized ingredients to the unrecognizedIngredients array
6. For compound ingredients like "Citrullinmalat", map to "l_citrulline" and note form as "citrulline malate"

COMMON PATTERNS TO WATCH FOR:
- "Per skopa (20 g)" = serving size 20g
- Multiple caffeine sources should be summed for totalCaffeineContent_mg
- Swedish names: Koffein=caffeine, Beta-alanin=beta_alanine, etc.
- Proprietary blends (®, ™) should go in unrecognizedIngredients

RETURN ONLY THE FILLED SCHEMA AS JSON:
${JSON.stringify(this.schema, null, 2)}`;
  }

  validateAndEnhance(normalizedData) {
    // Validate structure
    if (!normalizedData.ingredients) {
      console.warn('⚠️ Invalid structure returned, using fallback');
      return this.createFallbackStructure({});
    }

    // Calculate total caffeine content
    let totalCaffeine = 0;
    
    if (normalizedData.ingredients.caffeine?.isIncluded) {
      totalCaffeine += normalizedData.ingredients.caffeine.dosage_mg || 0;
    }
    
    if (normalizedData.ingredients.green_tea_extract?.isIncluded && 
        normalizedData.ingredients.green_tea_extract.caffeine_content_mg) {
      totalCaffeine += normalizedData.ingredients.green_tea_extract.caffeine_content_mg;
    }

    normalizedData.totalCaffeineContent_mg = totalCaffeine > 0 ? totalCaffeine : null;

    // Enhance extraction metadata
    normalizedData.extractionMetadata = {
      ...normalizedData.extractionMetadata,
      extractedAt: new Date().toISOString(),
      method: 'structured_ai_normalization',
      version: '2.0'
    };

    return normalizedData;
  }

  createFallbackStructure(extractedData) {
    console.log('🔄 Creating fallback structure from extracted data');
    
    const fallback = JSON.parse(JSON.stringify(this.schema));
    
    // Try to extract basic info
    fallback.productName = extractedData.title || extractedData.name || 'Unknown Product';
    
    // Look for basic ingredient patterns
    const text = JSON.stringify(extractedData).toLowerCase();
    
    if (text.includes('koffein') || text.includes('caffeine')) {
      fallback.ingredients.caffeine.isIncluded = true;
      // Try to extract dosage from text patterns
      const caffeineMatch = text.match(/(?:koffein|caffeine).*?(\d+)\s*mg/i);
      if (caffeineMatch) {
        fallback.ingredients.caffeine.dosage_mg = parseInt(caffeineMatch[1]);
      }
    }

    fallback.extractionMetadata = {
      tableFound: false,
      ingredientListFound: text.includes('ingredien'),
      servingSizeFound: text.includes('skopa') || text.includes('serving'),
      confidence: 0.2,
      extractedAt: new Date().toISOString(),
      method: 'fallback_pattern_matching',
      version: '2.0'
    };

    return fallback;
  }

  // Convert structured data back to legacy format for compatibility
  toLegacyFormat(structuredData: StructuredSupplementData) {
    const activeIngredients: string[] = [];
    let totalDosage = 0;

    Object.entries(structuredData.ingredients).forEach(([key, ingredient]) => {
      if (typeof ingredient === 'object' && ingredient !== null && 
          'isIncluded' in ingredient && 'dosage_mg' in ingredient &&
          ingredient.isIncluded && ingredient.dosage_mg) {
        activeIngredients.push(key.replace(/_/g, '-'));
        totalDosage += (ingredient as any).dosage_mg;
      }
    });

    return {
      activeIngredient: activeIngredients.join(' + ') || 'Unknown',
      dosagePerUnit: totalDosage || null,
      structuredData: structuredData // Include full structured data
    };
  }
}