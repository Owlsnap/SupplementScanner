/**
 * Main scraper orchestrator that coordinates site-specific extraction
 */

import { PriceExtractor } from './extractors/priceExtractor.js';
import { IngredientExtractor } from './extractors/ingredientExtractor.js';
import { DosageExtractor } from './extractors/dosageExtractor.js';

// Import site configurations
import tillskottsbologetConfig from './sites/tillskottsbolaget.json' with { type: "json" };
import proteinbologetConfig from './sites/proteinbolaget.json' with { type: "json" };
import gymgrossistenConfig from './sites/gymgrossisten.json' with { type: "json" };
import tyngreConfig from './sites/tyngre.json' with { type: "json" };
import bodylabConfig from './sites/bodylab.json' with { type: "json" };

export class SwedishSupplementScraper {
  constructor() {
    this.siteConfigs = {
      'tillskottsbolaget.se': tillskottsbologetConfig,
      'proteinbolaget.se': proteinbologetConfig,
      'gymgrossisten.com': gymgrossistenConfig,
      'tyngre.se': tyngreConfig,
      'bodylab.se': bodylabConfig
    };
  }

  /**
   * Get site configuration based on URL
   * @param {string} url - Product URL
   * @returns {Object} - Site-specific configuration
   */
  getSiteConfig(url) {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // Find matching site config
    for (const [domain, config] of Object.entries(this.siteConfigs)) {
      if (hostname.includes(domain.replace('.se', '').replace('.com', ''))) {
        return config;
      }
    }

    // Return default config for unknown sites
    return {
      siteName: 'Generic',
      domain: hostname,
      selectors: {
        price: ['.price', '[class*="price"]'],
        quantity: ['h1', '.product-title', '[class*="size"]'],
        info: ['.product-info', '.description'],
        name: ['h1', '.product-title']
      },
      instructions: {
        price: 'Find the main product price that customers pay.',
        quantity: 'Keep original units - extract number and unit separately.'
      },
      swedishTerms: {
        dosageIndicators: ['per kapsel', 'per tablett', 'per portion'],
        units: ['mg', 'g', 'kapslar', 'tabletter'],
        sections: ['BESKRIVNING', 'INFORMATION']
      },
      waitTime: 2000,
      targetSections: ['text=/beskrivning/i', 'text=/information/i']
    };
  }

  /**
   * Generate comprehensive AI prompt for a specific site
   * @param {string} url - Product URL  
   * @returns {Object} - Complete extraction configuration
   */
  generateExtractionPrompt(url) {
    const siteConfig = this.getSiteConfig(url);
    
    const priceExtractor = new PriceExtractor(siteConfig);
    const ingredientExtractor = new IngredientExtractor(siteConfig);
    const dosageExtractor = new DosageExtractor(siteConfig);

    const prompt = `
Analyze this Swedish supplement product page and extract the following information in JSON format:

{
  "name": "product name",
  "price": "price as number (remove kr/SEK)",
  "quantity": "quantity as number", 
  "unit": "unit (kapslar, tabletter, g, ml, etc.)",
  "activeIngredient": "main active ingredient with form",
  "dosagePerUnit": "dosage per unit as NUMBER ONLY (e.g., 200, not 200mg)",
  "servingSize": "units per serving",
  "servingsPerContainer": "total servings"
}

=== SITE-SPECIFIC INSTRUCTIONS for ${siteConfig.siteName} ===

${priceExtractor.generatePricePrompt()}

${ingredientExtractor.generateIngredientPrompt()}

${dosageExtractor.generateDosagePrompt()}

=== CRITICAL EXTRACTION RULES ===

1. 🎯 PRIORITY SECTIONS TO SCAN:
${siteConfig.targetSections ? siteConfig.targetSections.map(s => `   - ${s}`).join('\n') : '   - Focus on product description and supplement facts'}

2. 📊 EXPECTED FORMAT:
   - Price: Extract only numeric value (e.g., "299" from "299 kr")
   - Quantity: Separate number and unit (e.g., "500" and "g" from "500g")  
   - Ingredients: Include specific forms (e.g., "magnesium bisglycinate")
   - Dosage: NUMBERS ONLY (e.g., "400" from "400mg per kapsel", NOT "400mg")

3. ⚠️ VALIDATION RULES:
   - PRICE VERIFICATION REQUIRED: Quote the exact text you found, then extract the number
   - Ignore URL numbers and product codes
   - Focus on customer-facing information
   - Return empty strings if data not found
   - Prioritize accuracy over completeness

4. 🔍 DOSAGE EXTRACTION EXAMPLE:
   Input text: "Per kapsel: Magnesium citrate 200mg"
   Extraction: "Found dosage info: '200mg per kapsel' → Extracted dosage: '200'"
   JSON output: "dosagePerUnit": "200"

5. 🇸🇪 SWEDISH CONTEXT:
   - Site: ${siteConfig.siteName} (${siteConfig.domain})
   - Wait time: ${siteConfig.waitTime}ms for page loading
   - Focus areas: ${siteConfig.swedishTerms.sections.join(', ')}

Return only valid JSON without additional text.
`;

    return {
      prompt,
      siteConfig,
      extractors: {
        price: priceExtractor,
        ingredient: ingredientExtractor, 
        dosage: dosageExtractor
      }
    };
  }

  /**
   * Get site-specific browser automation instructions
   * @param {string} url - Product URL
   * @returns {Object} - Puppeteer automation config
   */
  getBrowserConfig(url) {
    const siteConfig = this.getSiteConfig(url);
    
    return {
      waitTime: siteConfig.waitTime || 2000,
      targetSections: siteConfig.targetSections || [],
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHeaders: {
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      viewport: { width: 1200, height: 800 }
    };
  }

  /**
   * Validate extracted data against site-specific rules
   * @param {Object} extractedData - Raw extraction results
   * @param {string} url - Original URL
   * @param {string} pageText - Original page text for verification
   * @returns {Object} - Validated and cleaned data
   */
  validateExtraction(extractedData, url, pageText = '') {
    const { extractors } = this.generateExtractionPrompt(url);
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      priceVerification: null,
      cleanedData: { ...extractedData }
    };

    // Validate and verify price
    if (extractedData.price) {
      // Basic price validation
      if (!extractors.price.validatePrice(extractedData.price)) {
        validation.errors.push(`Invalid price format: ${extractedData.price}`);
        validation.cleanedData.price = null;
      } else if (pageText) {
        // Verify price can be found in source text
        const priceVerification = extractors.price.verifyPriceSource(extractedData.price, pageText);
        validation.priceVerification = priceVerification;
        
        if (!priceVerification.isValid) {
          validation.warnings.push(priceVerification.recommendation);
        } else if (priceVerification.confidence === 'low') {
          validation.warnings.push(`Low confidence in price extraction: ${priceVerification.recommendation}`);
        }
        
        console.log(`💰 Price verification for ${extractedData.price}:`, priceVerification.recommendation);
      }
    }

    // Validate quantity info  
    const quantityInfo = {
      quantity: extractedData.quantity,
      unit: extractedData.unit
    };
    if (!extractors.dosage.validateQuantityInfo(quantityInfo)) {
      validation.errors.push('Invalid quantity information');
    }

    // Validate ingredient info
    const ingredientInfo = {
      activeIngredient: extractedData.activeIngredient,
      dosagePerUnit: extractedData.dosagePerUnit
    };
    if (!extractors.ingredient.validateIngredientInfo(ingredientInfo)) {
      validation.errors.push('No valid ingredient information found');
    }

    validation.isValid = validation.errors.length === 0;
    
    return validation;
  }

  /**
   * Get all supported site domains
   * @returns {Array} - List of supported domains
   */
  getSupportedSites() {
    return Object.keys(this.siteConfigs);
  }
}

export default SwedishSupplementScraper;