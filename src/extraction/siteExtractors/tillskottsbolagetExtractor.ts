/**
 * Site-specific extractor for Tillskottsbolaget.se
 * Targets the nutrition table in <div class="JS-CleaningFunc__nutrition">
 */

import { JSDOM } from 'jsdom';
import { 
  NutritionExtractionResultSchema,
  StructuredSupplementDataSchema,
  safeValidateStructuredData,
} from '../../schemas/zodSchemas.js';
import type { 
  SiteExtractor, 
  NutritionExtractionResult, 
  StructuredSupplementData, 
  ExtractedIngredient,
  RawTableData 
} from '../../types/index.js';

export default class TillskottsbolagetExtractor implements SiteExtractor {
  public readonly siteDomain = 'tillskottsbolaget.se';

  canHandle(url: string): boolean {
    return url && url.includes(this.siteDomain);
  }

  extractNutritionTable(html: string): NutritionExtractionResult {
    console.log('🍃 Starting DOM extraction for Tillskottsbolaget nutrition table...');
    
    const result = {
      ingredients: {},
      servingSize: null,
      productName: null,
      rawTableData: [],
      price: null,
      quantity: null,
      unit: null
    };

    try {
      // Parse HTML using jsdom for Node.js environment
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      
      console.log('🍃 Starting DOM extraction for Tillskottsbolaget nutrition table...');
      console.log('📄 Parsed HTML document with jsdom, searching for nutrition div...');
      
      // Find the nutrition section
      const nutritionDiv = doc.querySelector('div.JS-CleaningFunc__nutrition');
      if (!nutritionDiv) {
        console.warn('⚠️ Nutrition div not found - checking if it exists with different selector');
        // Try alternative selectors
        const altDiv = doc.querySelector('[class*="nutrition"]') || doc.querySelector('[class*="CleaningFunc"]');
        if (altDiv) {
          console.log('🔍 Found potential nutrition div with class:', altDiv.className);
        } else {
          console.log('❌ No nutrition-related divs found in HTML');
        }
        return result;
      }

      console.log('✅ Found nutrition div:', nutritionDiv.className);

      // Extract product name from title or heading
      const productTitle = doc.querySelector('h1') || doc.querySelector('.product-title') || doc.querySelector('[class*="title"]');
      if (productTitle) {
        result.productName = productTitle.textContent.trim();
        console.log('🏷️ Found product name:', result.productName);
      }

      // Extract price
      this.extractPrice(doc, result);
      
      // Extract quantity/weight
      this.extractQuantity(doc, result);

      // Find the table inside the nutrition div
      const table = nutritionDiv.querySelector('table');
      if (!table) {
        console.warn('⚠️ Table not found in nutrition div');
        console.log('🔍 Nutrition div content:', nutritionDiv.innerHTML.slice(0, 200) + '...');
        return result;
      }

      console.log('✅ Found nutrition table with', table.querySelectorAll('tr').length, 'rows');

      // Extract table rows
      const rows = table.querySelectorAll('tr');
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td, th');
        
        if (cells.length >= 2) {
          const ingredientName = cells[0].textContent.trim();
          const dosageText = cells[1].textContent.trim();
          
          console.log(`🔍 Row ${i}: "${ingredientName}" | "${dosageText}"`);
          
          // Skip header row if it contains "Näringsvärde" or similar
          if (ingredientName.toLowerCase().includes('näringsvärde') || 
              ingredientName.toLowerCase().includes('per skopa')) {
            // Extract serving size from header if available
            const servingMatch = dosageText.match(/per\s+skopa\s*\((\d+)\s*g\)|(\d+)\s*g/i);
            if (servingMatch) {
              result.servingSize = `${servingMatch[1] || servingMatch[2]} g`;
              console.log(`📏 Found serving size: ${result.servingSize}`);
            }
            continue;
          }

          // Extract dosage amount
          const dosageMatch = dosageText.match(/(\d+(?:\.\d+)?)\s*mg/);
          if (dosageMatch) {
            const dosageMg = parseFloat(dosageMatch[1]);
            
            console.log(`💊 Extracted ingredient: ${ingredientName} = ${dosageMg}mg`);
            
            // Store raw data
            result.rawTableData.push({
              ingredient: ingredientName,
              dosage: dosageMg,
              unit: 'mg'
            });

            // Map Swedish ingredient names to standard keys
            const mappedIngredient = this.mapIngredientName(ingredientName);
            console.log(`🗺️ Mapped "${ingredientName}" to "${mappedIngredient}"`);
            
            if (mappedIngredient) {
              if (!result.ingredients[mappedIngredient]) {
                result.ingredients[mappedIngredient] = {
                  isIncluded: true,
                  dosage_mg: dosageMg,
                  sources: [ingredientName],
                  rawName: ingredientName
                };
              } else {
                // If ingredient already exists, add to dosage (for multiple sources)
                result.ingredients[mappedIngredient].dosage_mg += dosageMg;
                result.ingredients[mappedIngredient].sources.push(ingredientName);
              }
            }
          } else {
            console.log(`❌ No dosage match for: "${ingredientName}" | "${dosageText}"`);
          }
        }
      }

      // Handle special cases for caffeine (sum all caffeine sources)
      const caffeineTotal = this.calculateTotalCaffeine(result.rawTableData);
      if (caffeineTotal > 0) {
        result.ingredients.caffeine = {
          isIncluded: true,
          dosage_mg: caffeineTotal,
          sources: this.getCaffeineSources(result.rawTableData),
          calculated: true
        };
      }

      if (Object.keys(result.ingredients).length > 0) {
        console.log(`✅ Extracted ${Object.keys(result.ingredients).length} ingredients from table`);
        
        // Validate the extraction result with Zod
        try {
          const validatedResult = NutritionExtractionResultSchema.parse(result);
          console.log('✅ Extraction result validated successfully with Zod');
          return validatedResult;
        } catch (error) {
          console.warn('⚠️ Extraction result validation failed:', error);
          console.warn('📋 Proceeding with unvalidated result');
        }
      }
      return result;

    } catch (error) {
      console.error('❌ Error extracting nutrition table:', error);
      return result;
    }
  }

  mapIngredientName(swedishName: string): string | null {
    const normalized = swedishName.toLowerCase()
      .replace(/[-\s]/g, '')
      .replace(/®|™/g, '');

    // Direct mappings
    const mappings: Record<string, string> = {
      'koffein': 'caffeine',
      'betaalanin': 'beta_alanine',
      'citrullinmalat': 'l_citrulline',
      'lcitrullin': 'l_citrulline',
      'larginin': 'l_arginine',
      'lteanin': 'l_theanine',
      'varavlteanin': 'l_theanine', // "– varav l-teanin"
      'ltyrosin': 'l_tyrosine',
      'nacetylltyrosin': 'l_tyrosine', // "N-acetyl l-tyrosin (NALT)"
      'nalt': 'l_tyrosine',
      'kreatin': 'creatine_monohydrate',
      'kreatinmonohydrat': 'creatine_monohydrate',
      'taurin': 'taurine',
      'betain': 'betaine_anhydrous',
      'kolinbitartrat': 'choline_bitartrate',
      'gröntte': 'green_tea_extract',
      'gröntteextrakt': 'green_tea_extract', // "Grönt-te extrakt (40%)"
      'grönttextrakt40': 'green_tea_extract',
      'svartpepparextrakt': 'black_pepper_extract',
      'pipernigrum': 'black_pepper_extract'
    };

    return mappings[normalized] || null;
  }

  calculateTotalCaffeine(rawData: RawTableData[]): number {
    let total = 0;
    
    for (const item of rawData) {
      const name = item.ingredient.toLowerCase();
      
      // Direct caffeine
      if (name.includes('koffein') || name.includes('caffeine')) {
        total += item.dosage;
      }
      
      // CaffShock (usually contains caffeine)
      if (name.includes('caffshock')) {
        total += item.dosage;
      }
      
      // Green tea extract (assume 40% caffeine if not specified)
      if (name.includes('grönt-te') || name.includes('green tea')) {
        const caffeineFromTea = item.dosage * 0.4; // Assume 40% caffeine
        total += caffeineFromTea;
      }
    }
    
    return Math.round(total);
  }

  getCaffeineSources(rawData: RawTableData[]): string[] {
    const sources: string[] = [];
    
    for (const item of rawData) {
      const name = item.ingredient.toLowerCase();
      if (name.includes('koffein') || name.includes('caffeine') || 
          name.includes('caffshock') || name.includes('grönt-te')) {
        sources.push(item.ingredient);
      }
    }
    
    return sources;
  }

  extractPrice(doc: Document, result: NutritionExtractionResult): void {
    console.log('💰 Starting Tillskottsbolaget-specific price extraction...');
    
    // Look specifically inside the PrisFalt element
    const prisFalt = doc.querySelector('#PrisFalt');
    if (!prisFalt) {
      console.log('⚠️ #PrisFalt element not found');
      return;
    }
    
    console.log('✅ Found #PrisFalt element');
    console.log('🔍 PrisFalt innerHTML preview:', prisFalt.innerHTML.slice(0, 300));
    
    // Check for current price in span.prisREA or span.prisBOLD (ignore crossed-out prices)
    const priceSelectors = ['span.prisREA', 'span.prisBOLD'];
    
    for (const selector of priceSelectors) {
      const priceElement = prisFalt.querySelector(selector);
      if (priceElement) {
        console.log(`✅ Found ${selector} element`);
        
        // Skip if this element or its parent has strikethrough styling (crossed-out price)
        const style = priceElement.style;
        const computedStyle = doc.defaultView?.getComputedStyle ? doc.defaultView.getComputedStyle(priceElement) : null;
        
        const isStrikethrough = 
          style.textDecoration?.includes('line-through') ||
          computedStyle?.textDecoration?.includes('line-through') ||
          priceElement.classList.contains('strikethrough') ||
          priceElement.classList.contains('crossed-out') ||
          priceElement.classList.contains('old-price');
          
        if (isStrikethrough) {
          console.log(`⚠️ Skipping crossed-out price in ${selector}`);
          continue;
        }
        
        // Get text content and also check text nodes
        const priceText = priceElement.textContent.trim();
        console.log(`🎯 ${selector} text content: "${priceText}"`);
        
        // Also check for direct text nodes within the element
        const textNodes = [];
        const walker = doc.createTreeWalker(
          priceElement,
          doc.defaultView?.NodeFilter?.TEXT_NODE || 4, // NodeFilter.SHOW_TEXT
          null,
          false
        );
        
        let node;
        while (node = walker.nextNode()) {
          if (node.nodeValue.trim()) {
            textNodes.push(node.nodeValue.trim());
          }
        }
        
        if (textNodes.length > 0) {
          console.log(`📄 Text nodes in ${selector}:`, textNodes);
        }
        
        // Try to extract price from all available text
        const allTexts = [priceText, ...textNodes];
        
        for (const text of allTexts) {
          if (text) {
            // More precise extraction patterns for Tillskottsbolaget
            const pricePatterns = [
              /(\d+)\s*kr/i,           // "249 kr"
              /(\d+)\s*:-/i,           // "249 :-"
              /kr\s*(\d+)/i,           // "kr 249"
              /(\d+(?:[.,]\d+)?)/      // Just the number
            ];
            
            for (const pattern of pricePatterns) {
              const priceMatch = text.match(pattern);
              if (priceMatch) {
                const price = parseFloat(priceMatch[1].replace(',', '.'));
                
                // Validate reasonable price range for supplements
                if (price >= 50 && price <= 2000) {
                  result.price = price;
                  console.log('✅ Extracted exact Tillskotts price:', result.price, 'kr from', selector, 'pattern:', pattern.source, 'text:', text);
                  return;
                } else {
                  console.log(`⚠️ Price ${price} outside reasonable range (50-2000 kr)`);
                }
              }
            }
          }
        }
      } else {
        console.log(`❌ ${selector} not found in #PrisFalt`);
      }
    }
    
    // Fallback: look for any price-like text in PrisFalt
    if (!result.price) {
      console.log('🔍 Fallback: searching all text in #PrisFalt...');
      const allPrisFaltText = prisFalt.textContent.trim();
      console.log('📄 Full PrisFalt text:', allPrisFaltText);
      
      const fallbackPatterns = [
        /(\d+)\s*kr/gi,
        /(\d+)\s*:-/gi,
        /kr\s*(\d+)/gi
      ];
      
      for (const pattern of fallbackPatterns) {
        const matches = [...allPrisFaltText.matchAll(pattern)];
        console.log(`Pattern ${pattern.source} found ${matches.length} matches in PrisFalt`);
        
        for (const match of matches) {
          const price = parseFloat(match[1]);
          if (price >= 50 && price <= 2000) {
            result.price = price;
            console.log('✅ Found fallback price in PrisFalt:', result.price, 'kr');
            return;
          }
        }
      }
    }
    
    console.log('⚠️ No valid Tillskotts price found in #PrisFalt');
  }

  extractQuantity(doc: Document, result: NutritionExtractionResult): void {
    console.log('⚖️ Starting quantity extraction...');
    
    // Look for weight/quantity in product title or description
    const quantitySelectors = [
      'h1', '.product-title', '.product-name', '[class*="title"]',
      '.product-description', '.description', '[class*="desc"]',
      '.product-info', '[class*="info"]', '.content'
    ];

    console.log('🔍 Searching with', quantitySelectors.length, 'quantity selectors...');
    
    for (const selector of quantitySelectors) {
      const elements = doc.querySelectorAll(selector);
      console.log(`⚙️ Selector "${selector}" found ${elements.length} elements`);
      
      elements.forEach((element, index) => {
        const text = element.textContent.trim();
        console.log(`  Element ${index}: "${text}"`);
        
        if (text) {
          // Enhanced weight patterns - look for patterns like "400 g", "400g", "1kg", "500 gram", "400 G"
          const weightPatterns = [
            /(\d+(?:[.,]\d+)?)\s*(?:g|gram|grams)\b/gi,
            /(\d+(?:[.,]\d+)?)\s*(?:kg|kilogram|kilograms)\b/gi,
            /(\d+(?:[.,]\d+)?)\s*(?:G|GRAM|GRAMS)\b/gi // Uppercase variants
          ];
          
          for (const pattern of weightPatterns) {
            const matches = [...text.matchAll(pattern)];
            console.log(`    Pattern ${pattern.source} found ${matches.length} matches`);
            
            for (const match of matches) {
              let quantity = parseFloat(match[1].replace(',', '.'));
              let unit = match[0].toLowerCase().includes('kg') ? 'kg' : 'g';
              
              console.log(`    Match: ${match[0]} -> ${quantity} ${unit}`);
              
              // Filter reasonable quantities (100g - 2kg for supplements)
              if (quantity >= 100 && quantity <= (unit === 'kg' ? 2 : 2000)) {
                // Convert kg to g for consistency
                if (unit === 'kg') {
                  quantity = quantity * 1000;
                  unit = 'g';
                }
                
                result.quantity = quantity;
                result.unit = unit;
                console.log('✅ Found quantity:', result.quantity, result.unit, 'from selector:', selector);
                return; // Exit early on first valid match
              }
            }
          }
        }
      });
      
      if (result.quantity) break; // Exit if quantity found
    }

    // Fallback 1: search URL for quantity patterns
    if (!result.quantity) {
      console.log('🔍 Fallback 1: Searching URL for quantity...');
      
      // Look for patterns in meta tags
      const metaSelectors = [
        'meta[property="product:weight"]',
        'meta[property="product:size"]',
        'meta[name="weight"]',
        '[itemtype*="Product"] [itemprop="weight"]'
      ];
      
      for (const selector of metaSelectors) {
        const metaElement = doc.querySelector(selector);
        if (metaElement) {
          const weightText = metaElement.getAttribute('content') || metaElement.textContent;
          if (weightText) {
            const weightMatch = weightText.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gram|kg)/i);
            if (weightMatch) {
              let quantity = parseFloat(weightMatch[1].replace(',', '.'));
              let unit = weightMatch[0].toLowerCase().includes('kg') ? 'kg' : 'g';
              
              if (unit === 'kg') {
                quantity = quantity * 1000;
                unit = 'g';
              }
              
              result.quantity = quantity;
              result.unit = unit;
              console.log('✅ Found quantity in meta:', result.quantity, result.unit, 'from:', selector);
              break;
            }
          }
        }
      }
    }

    // Fallback 2: common Swedish supplement sizes based on product type
    if (!result.quantity) {
      console.log('🔍 Fallback 2: Using default quantity based on product type...');
      
      // Analyze product name to determine default size
      const productInfo = (result.productName || '').toLowerCase();
      
      if (productInfo.includes('pre') || productInfo.includes('workout') || productInfo.includes('pwo')) {
        result.quantity = 400; // Default pre-workout size
        result.unit = 'g';
        console.log('⚖️ Pre-workout detected, using default 400g');
      } else if (productInfo.includes('protein') || productInfo.includes('whey')) {
        result.quantity = 1000; // Default protein size
        result.unit = 'g';
        console.log('⚖️ Protein detected, using default 1000g');
      } else if (productInfo.includes('creatine') || productInfo.includes('kreatin')) {
        result.quantity = 300; // Default creatine size
        result.unit = 'g';
        console.log('⚖️ Creatine detected, using default 300g');
      } else {
        result.quantity = 400; // General default
        result.unit = 'g';
        console.log('⚖️ Using general default 400g');
      }
    }
    
    console.log('✅ Final quantity result:', result.quantity, result.unit);
  }

  // Convert to structured schema format
  toStructuredFormat(extractedData: NutritionExtractionResult): StructuredSupplementData {
    // Calculate proper serving information
    const servingSizeNum = extractedData.servingSize ? parseFloat(extractedData.servingSize.replace(/[^\d.]/g, '')) : 20; // Default 20g
    const containerSize = extractedData.quantity || 400; // Use extracted quantity or default 400g
    const servingsPerContainer = Math.floor(containerSize / servingSizeNum);
    
    const structured = {
      name: extractedData.productName || 'Unknown Product',
      price: extractedData.price || '',
      quantity: extractedData.quantity || '',
      unit: extractedData.unit || 'g',
      productName: extractedData.productName || 'Unknown Product',
      servingSize: `${servingSizeNum} g`,
      servingsPerContainer: servingsPerContainer.toString(),
      ingredients: {},
      unrecognizedIngredients: [],
      totalCaffeineContent_mg: null,
      extractionMetadata: {
        tableFound: Object.keys(extractedData.ingredients).length > 0,
        ingredientListFound: true,
        servingSizeFound: !!extractedData.servingSize,
        priceFound: !!extractedData.price,
        quantityFound: !!extractedData.quantity,
        confidence: 0.9,
        siteDomain: this.siteDomain,
        extractorUsed: 'tillskottsbolaget_specific'
      }
    };

    // Map extracted ingredients to schema
    for (const [key, data] of Object.entries(extractedData.ingredients)) {
      structured.ingredients[key] = {
        isIncluded: data.isIncluded,
        dosage_mg: data.dosage_mg,
        sources: data.sources || []
      };
    }

    // Add unrecognized ingredients
    for (const rawItem of extractedData.rawTableData) {
      const mapped = this.mapIngredientName(rawItem.ingredient);
      if (!mapped) {
        structured.unrecognizedIngredients.push({
          name: rawItem.ingredient,
          dosage_mg: rawItem.dosage,
          description: 'Ingredient not in standard database'
        });
      }
    }

    // Set total caffeine
    if (structured.ingredients.caffeine?.isIncluded) {
      structured.totalCaffeineContent_mg = structured.ingredients.caffeine.dosage_mg;
    }

    // Validate the structured result with Zod
    const validationResult = safeValidateStructuredData(structured);
    if (validationResult.success) {
      console.log('✅ Structured supplement data validated successfully with Zod');
      return validationResult.data;
    } else {
      console.warn('⚠️ Structured data validation failed:', validationResult.error);
      console.warn('📋 Proceeding with unvalidated structured data');
      return structured as StructuredSupplementData;
    }
  }
}