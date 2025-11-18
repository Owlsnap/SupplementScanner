/**
 * Dosage and quantity extraction for Swedish supplement sites
 */

export class DosageExtractor {
  constructor(siteConfig) {
    this.siteConfig = siteConfig;
  }

  /**
   * Generate AI prompt for dosage/quantity extraction
   * @returns {string} - AI prompt focused on dosage extraction
   */
  generateDosagePrompt() {
    const quantityInstructions = this.siteConfig.instructions?.quantity || 'Extract quantity and unit separately';
    const selectors = this.siteConfig.selectors?.quantity?.join(', ') || 'h1, .product-title';
    const units = this.siteConfig.swedishTerms?.units?.join(', ') || 'mg, g, kapslar';

    return `
QUANTITY/DOSAGE EXTRACTION INSTRUCTIONS for ${this.siteConfig.siteName}:

${quantityInstructions}

CSS Selectors to focus on: ${selectors}

🔢 QUANTITY PATTERNS TO RECOGNIZE:
- Weight: "500g", "1kg", "750g", "1000g"
- Capsules/Tablets: "60 kapslar", "120 tabletter", "90 caps"
- Servings: "30 portioner", "60 servings", "45 doser"
- Volume: "500ml", "1L", "250ml"

📊 UNITS TO EXTRACT:
${units}

🎯 EXTRACTION RULES:
1. Keep original units - don't convert
2. Extract both number and unit separately
3. If "1kg" → quantity: "1", unit: "kg"  
4. If "750g" → quantity: "750", unit: "g"
5. If "60 kapslar" → quantity: "60", unit: "kapslar"
6. If "30 servings" → quantity: "30", unit: "servings"

📋 DOSAGE PATTERNS:
- "Per kapsel: 400mg" → servingSize: "1", unit: "kapsel"
- "2 tabletter dagligen" → servingSize: "2", unit: "tabletter" 
- "1 matsked (15g)" → servingSize: "1", unit: "matsked"

RETURN FORMAT:
{
  "quantity": "number only",
  "unit": "unit string",
  "servingSize": "units per serving",
  "totalServings": "calculated total servings"
}

CRITICAL: Focus on package size, not daily dosage recommendations.
`;
  }

  /**
   * Parse quantity information from text
   * @param {string} text - Text content to analyze
   * @returns {Object} - Parsed quantity information
   */
  parseQuantityInfo(text) {
    const quantityInfo = {
      quantity: null,
      unit: null,
      servingSize: null,
      totalServings: null
    };

    // Quantity patterns
    const quantityPatterns = [
      // Weight patterns
      { regex: /(\d+(?:[.,]\d+)?)\s*(kg|kilogram)/i, type: 'weight' },
      { regex: /(\d+)\s*g(?![a-z])/i, type: 'weight' },
      
      // Count patterns  
      { regex: /(\d+)\s*(kapslar|capsules|caps)/i, type: 'count' },
      { regex: /(\d+)\s*(tabletter|tablets|tabs)/i, type: 'count' },
      { regex: /(\d+)\s*(portioner|servings|doser)/i, type: 'count' },
      
      // Volume patterns
      { regex: /(\d+)\s*(ml|liter|l)/i, type: 'volume' }
    ];

    // Try to match quantity patterns
    for (const pattern of quantityPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        quantityInfo.quantity = parseFloat(match[1].replace(',', '.'));
        quantityInfo.unit = match[2].toLowerCase();
        break;
      }
    }

    // Extract serving size patterns
    const servingPatterns = [
      /(\d+)\s*kapsl?ar?\s+dagligen/i,
      /(\d+)\s*tabletter?\s+dagligen/i,
      /per\s+dos[:\s]+(\d+)\s*(kapsl?ar?|tabletter?)/i,
      /rekommenderat\s+intag[:\s]+(\d+)/i
    ];

    for (const pattern of servingPatterns) {
      const match = text.match(pattern);
      if (match) {
        quantityInfo.servingSize = parseInt(match[1]);
        break;
      }
    }

    // Calculate total servings if possible
    if (quantityInfo.quantity && quantityInfo.servingSize && 
        (quantityInfo.unit === 'kapslar' || quantityInfo.unit === 'tabletter')) {
      quantityInfo.totalServings = Math.floor(quantityInfo.quantity / quantityInfo.servingSize);
    }

    return quantityInfo;
  }

  /**
   * Normalize units to standard format
   * @param {string} unit - Original unit
   * @returns {string} - Normalized unit
   */
  normalizeUnit(unit) {
    const unitMap = {
      'kapslar': 'capsules',
      'caps': 'capsules', 
      'tabletter': 'tablets',
      'tabs': 'tablets',
      'portioner': 'servings',
      'doser': 'doses',
      'kg': 'kg',
      'kilogram': 'kg',
      'ml': 'ml',
      'liter': 'l',
      'l': 'l'
    };

    return unitMap[unit.toLowerCase()] || unit;
  }

  /**
   * Validate extracted quantity information
   * @param {Object} quantityInfo - Extracted quantity data
   * @returns {boolean} - Whether the data is valid
   */
  validateQuantityInfo(quantityInfo) {
    return !!(
      quantityInfo.quantity && 
      quantityInfo.quantity > 0 &&
      quantityInfo.unit
    );
  }
}

export default DosageExtractor;