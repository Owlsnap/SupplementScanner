/**
 * Price extraction utilities for Swedish supplement sites
 */

export class PriceExtractor {
  constructor(siteConfig) {
    this.siteConfig = siteConfig;
  }

  /**
   * Extract price from page content using site-specific rules
   * @param {string} pageText - Full page text content
   * @param {Object} selectors - CSS selectors for price elements
   * @returns {Object} - Extracted price information
   */
  extractPrice(pageText, selectors) {
    const priceInfo = {
      price: null,
      currency: 'kr',
      isOnSale: false,
      originalPrice: null
    };

    // Try pattern matching first
    if (this.siteConfig.pricePattern) {
      const regex = new RegExp(this.siteConfig.pricePattern, 'i');
      const match = pageText.match(regex);
      if (match) {
        priceInfo.price = parseInt(match[1]);
        priceInfo.currency = match[2] || 'kr';
      }
    }

    return priceInfo;
  }

  /**
   * Generate site-specific AI prompt for price extraction with verification
   * @returns {string} - AI prompt focused on price extraction
   */
  generatePricePrompt() {
    const instructions = this.siteConfig.instructions.price;
    const selectors = this.siteConfig.selectors.price.join(', ');
    
    return `
PRICE EXTRACTION INSTRUCTIONS for ${this.siteConfig.siteName}:

${instructions}

CSS Selectors to focus on: ${selectors}
Price pattern: ${this.siteConfig.pricePattern}

🔍 VERIFICATION PROCESS - MANDATORY:
1. First, locate the price in the specified selectors: ${selectors}
2. Quote the exact text you found (e.g., "Found in ${selectors.split(',')[0]}: '225 kr'")
3. DEBUGGING: List ALL price-like numbers you see on the entire page
4. DEBUGGING: Explain WHY you chose this specific price over others
5. Extract only the numeric value from that exact text
6. Double-check: Does your extracted number match the text you quoted?

Look for these specific price indicators:
- Current selling price (primary target)
- Sale prices vs original prices
- Currency symbols: kr, SEK, :-

CRITICAL VALIDATION RULES:
- You MUST quote the exact text from the specified selectors before extracting
- Verify the price is NOT preceded by "Ord.pris", "Lägsta pris", or "Tidigare"
- Verify the price is IN the main product section, not comparison/recommendation areas
- Return only the actual selling price that customers pay
- Ignore URL numbers, product codes, or placeholder prices
- If multiple prices found, choose the one in the primary purchase area
- If you cannot find price in the specified selectors, return null

EXPECTED FORMAT:
"Found price text: '[exact text from ${selectors.split(',')[0]}]' → Extracted price: '[number only]'"
`;
  }

  /**
   * Validate extracted price
   * @param {number} price - Extracted price
   * @returns {boolean} - Whether price is valid
   */
  validatePrice(price) {
    return (
      price && 
      typeof price === 'number' && 
      price > 0 && 
      price < 10000 && // Reasonable upper limit
      price > 10 // Reasonable lower limit for supplements
    );
  }

  /**
   * Verify that extracted price can be found in the page text
   * @param {string} extractedPrice - The price extracted by AI
   * @param {string} pageText - Original page text
   * @returns {Object} - Verification result with details
   */
  verifyPriceSource(extractedPrice, pageText) {
    const verification = {
      isValid: false,
      confidence: 'low',
      foundInText: false,
      possibleSources: [],
      recommendation: ''
    };

    if (!extractedPrice || !pageText) {
      verification.recommendation = 'Missing price or page text for verification';
      return verification;
    }

    // Look for the extracted price in various formats in the text
    const priceNumber = extractedPrice.toString().replace(/[^\d]/g, '');
    const pricePatterns = [
      new RegExp(`${priceNumber}\\s*(kr|sek|:-|€)`, 'i'),
      new RegExp(`${priceNumber}[,.]\\d{2}\\s*(kr|sek|:-|€)`, 'i'),
      new RegExp(`(kr|sek|€)\\s*${priceNumber}`, 'i')
    ];

    // Find all price matches in the text
    pricePatterns.forEach(pattern => {
      const matches = pageText.match(new RegExp(pattern, 'gi'));
      if (matches) {
        verification.possibleSources.push(...matches);
      }
    });

    verification.foundInText = verification.possibleSources.length > 0;

    // Determine confidence level
    if (verification.foundInText) {
      verification.isValid = true;
      if (verification.possibleSources.length === 1) {
        verification.confidence = 'high';
        verification.recommendation = `Price ${extractedPrice} verified in text: "${verification.possibleSources[0]}"`;
      } else {
        verification.confidence = 'medium';
        verification.recommendation = `Price ${extractedPrice} found ${verification.possibleSources.length} times in text`;
      }
    } else {
      verification.recommendation = `WARNING: Price ${extractedPrice} not found in page text. Possible extraction error.`;
    }

    return verification;
  }
}

export default PriceExtractor;