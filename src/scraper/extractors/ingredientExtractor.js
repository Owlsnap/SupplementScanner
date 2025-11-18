/**
 * Ingredient and supplement info extraction for Swedish supplement sites
 */

export class IngredientExtractor {
  constructor(siteConfig) {
    this.siteConfig = siteConfig;
  }

  /**
   * Generate AI prompt for Swedish supplement ingredient extraction
   * @returns {string} - Detailed AI prompt for ingredient analysis
   */
  generateIngredientPrompt() {
    const sections = this.siteConfig.swedishTerms?.sections?.join(', ') || 'BESKRIVNING, INFORMATION';
    const dosageIndicators = this.siteConfig.swedishTerms?.dosageIndicators?.join(', ') || 'per kapsel, per tablett';
    const units = this.siteConfig.swedishTerms?.units?.join(', ') || 'mg, g, kapslar';

    return `
INGREDIENT EXTRACTION INSTRUCTIONS for ${this.siteConfig.siteName}:

🎯 PRIMARY TARGET SECTIONS (scan these first):
${sections}

🔍 DOSAGE INDICATORS TO LOOK FOR:
${dosageIndicators}

📊 UNITS TO RECOGNIZE:
${units}

🧪 SUPPLEMENT INGREDIENT FORMS TO DETECT:

Magnesium forms:
- "Magnesium bisglycinat", "Magnesium kelat", "Magnesium citrat", "Magnesium oxid", "Magnesium malat"

Protein forms:
- "Vassleprotein isolat", "Vassleproteinkoncentrat", "Kaseinprotein", "Äggprotein"

Vitamin D forms:
- "Vitamin D3", "D-vitamin", "Kolekalciferol", "Vitamin D"

Omega-3 forms:
- "Omega-3", "Fiskolja", "EPA", "DHA", "Triglycerid", "Etylester"

Creatine forms:
- "Kreatin monohydrat", "Kreatin", "Creatine"

Amino Acid forms:
- "BCAA", "Grenade aminosyror", "L-leucin", "L-isoleucin", "L-valin", "EAA", "Essentiella aminosyror"

Pre-Workout forms:
- "Pre-workout", "PWO", "Pre träningsformel", "Koffein", "Beta-alanin", "Citrullin malat"

📋 COMMON DOSAGE PATTERNS:
- "400 mg magnesium per kapsel"
- "25g protein per portion"
- "2000 IE vitamin D3"
- "Per daglig dos (2 kapslar): 800mg magnesium"
- "Innehåll per kapsel: Magnesium bisglycinat 400mg"

EXTRACTION TARGET:
{
  "activeIngredient": "main active ingredient with form",
  "dosagePerUnit": "dosage per unit in mg/IU/g",
  "servingSize": "units per serving",
  "servingsPerContainer": "total servings",
  "ingredientForm": "specific form (e.g., 'bisglycinat', 'isolat')",
  "additionalIngredients": ["list of other active ingredients"]
}

INSTRUCTIONS:
1. Focus on technical supplement facts, not marketing text
2. Look for structured ingredient lists or tables
3. Extract exact dosage amounts with units
4. Identify specific ingredient forms (bisglycinate vs oxide, etc.)
5. If multiple ingredients, prioritize the main/first one listed

Return only accurate data found in the specified sections.
`;
  }

  /**
   * Parse ingredient patterns from text
   * @param {string} text - Text content to analyze
   * @returns {Object} - Parsed ingredient information
   */
  parseIngredientInfo(text) {
    const ingredientInfo = {
      activeIngredient: null,
      dosagePerUnit: null,
      servingSize: null,
      servingsPerContainer: null,
      ingredientForm: null
    };

    // Common ingredient patterns
    const patterns = {
      magnesium: /magnesium\s+(bisglycinat|kelat|citrat|oxid|malat)?\s*(\d+)\s*mg/i,
      protein: /(vassle)?protein\s+(isolat|koncentrat)?\s*(\d+)?\s*g?/i,
      vitaminD: /(vitamin\s+d3?|d-vitamin|kolekalciferol)\s*(\d+)\s*(ie|iu|mcg|µg)/i,
      omega3: /(omega-?3|fiskolja)\s*(\d+)\s*mg/i,
      creatine: /(kreatin|creatine)\s+(monohydrat)?\s*(\d+)\s*(g|mg)/i
    };

    // Try to match patterns
    for (const [category, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        ingredientInfo.activeIngredient = match[0];
        // Extract dosage number from match
        const dosageMatch = match[0].match(/(\d+)/);
        if (dosageMatch) {
          ingredientInfo.dosagePerUnit = parseInt(dosageMatch[1]);
        }
        break;
      }
    }

    return ingredientInfo;
  }

  /**
   * Validate extracted ingredient information
   * @param {Object} ingredientInfo - Extracted ingredient data
   * @returns {boolean} - Whether the data is valid
   */
  validateIngredientInfo(ingredientInfo) {
    return !!(
      ingredientInfo.activeIngredient || 
      ingredientInfo.dosagePerUnit
    );
  }
}

export default IngredientExtractor;