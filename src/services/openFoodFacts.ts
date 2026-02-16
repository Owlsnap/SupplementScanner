import { SupplementV1, Ingredient, Category, SubCategory } from '../schemas/supplementSchema.js';
import { CategoryDetector } from './categoryDetector.js';

export interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutrition_grades?: string;
  nutriments?: Record<string, any>;
  ingredients_text?: string;
  serving_size?: string;
  categories?: string;
  image_url?: string;
  status: number;
}

export interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  product?: OpenFoodFactsProduct;
}

export interface ExtractionResult {
  success: boolean;
  supplement?: Partial<SupplementV1>;
  needsAIExtraction: boolean;
  confidence: number;
  source: 'openfoodfacts' | 'ai-required' | 'combined';
  error?: string;
}

export class OpenFoodFactsService {
  private static readonly BASE_URL = 'https://world.openfoodfacts.org/api/v0/product';
  private static readonly USER_AGENT = 'SupplementScanner/1.0 (contact: your-email@domain.com)';

  /**
   * Fetch product data from OpenFoodFacts
   */
  static async fetchProduct(barcode: string): Promise<OpenFoodFactsResponse> {
    try {
      const url = `${this.BASE_URL}/${barcode}.json`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpenFoodFactsResponse = await response.json();
      return data;
    } catch (error) {
      console.error('OpenFoodFacts API error:', error);
      return {
        status: 0,
        status_verbose: `API Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Extract supplement data from OpenFoodFacts response
   */
  static async extractSupplementData(barcode: string): Promise<ExtractionResult> {
    try {
      const response = await this.fetchProduct(barcode);
      
      if (response.status !== 1 || !response.product) {
        return {
          success: false,
          needsAIExtraction: true,
          confidence: 0,
          source: 'ai-required',
          error: 'Product not found in OpenFoodFacts database'
        };
      }

      const product = response.product;
      
      // Extract basic information
      const productName = product.product_name || 'Unknown Product';
      const brand = this.extractBrand(product.brands || '');
      const ingredients = this.extractIngredients(product);
      
      // Check if this looks like a supplement
      const isLikelySupplement = this.isLikelySupplement(product);
      if (!isLikelySupplement) {
        return {
          success: false,
          needsAIExtraction: false,
          confidence: 0.1,
          source: 'openfoodfacts',
          error: 'Product does not appear to be a supplement'
        };
      }

      // Detect category using our service
      const categoryResult = await CategoryDetector.detectCategory(
        productName, 
        ingredients.map(ing => ({ 
          name: ing.name, 
          dosage: ing.dosage ?? undefined 
        }))
      );
      
      // Extract serving information
      const servingInfo = this.extractServingInfo(product);
      
      // Create partial supplement data
      const supplementData: Partial<SupplementV1> = {
        _schemaVersion: 1,
        barcode,
        productName,
        brand,
        category: categoryResult.category,
        subCategory: categoryResult.subCategory,
        form: this.guessForm(productName, product.categories || ''),
        servingsPerContainer: servingInfo.servingsPerContainer,
        servingSize: {
          amount: servingInfo.servingSize.amount,
          unit: servingInfo.servingSize.unit as "capsule" | "tablet" | "g" | "mg" | "mcg" | "IU" | "ml" | "scoop" | "%" | null
        },
        ingredients,
        price: {
          value: null, // OpenFoodFacts doesn't have price data
          currency: null,
          pricePerServing: null
        },
        quality: {
          underDosed: null,
          overDosed: null,
          fillerRisk: null,
          bioavailability: null
        },
        meta: {
          source: 'openfoodfacts',
          verified: false,
          lastUpdated: new Date().toISOString(),
          sourceMap: {
            productName: 'openfoodfacts',
            brand: 'openfoodfacts',
            ingredients: 'openfoodfacts',
            servingSize: 'openfoodfacts'
          }
        }
      };

      // Determine if we need AI supplementation
      const completeness = this.assessCompleteness(supplementData);
      const needsAI = completeness < 0.7; // If less than 70% complete

      return {
        success: true,
        supplement: supplementData,
        needsAIExtraction: needsAI,
        confidence: completeness,
        source: needsAI ? 'ai-required' : 'openfoodfacts'
      };
    } catch (error) {
      return {
        success: false,
        needsAIExtraction: true,
        confidence: 0,
        source: 'ai-required',
        error: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Extract and clean brand name
   */
  private static extractBrand(brandsString: string): string {
    if (!brandsString) return 'Unknown Brand';
    
    // OpenFoodFacts brands can be comma-separated
    const brands = brandsString.split(',').map(b => b.trim());
    return brands[0] || 'Unknown Brand';
  }

  /**
   * Extract ingredients from product data
   */
  private static extractIngredients(product: OpenFoodFactsProduct): Ingredient[] {
    const ingredients: Ingredient[] = [];
    
    // Try to parse from ingredients_text
    if (product.ingredients_text) {
      const ingredientsList = this.parseIngredientsText(product.ingredients_text);
      ingredients.push(...ingredientsList);
    }
    
    // Try to parse from nutriments (nutrition data)
    if (product.nutriments) {
      const nutritionIngredients = this.parseNutriments(product.nutriments);
      ingredients.push(...nutritionIngredients);
    }
    
    // Deduplicate by name
    const uniqueIngredients = ingredients.reduce((acc: Ingredient[], current) => {
      const existing = acc.find(ing => 
        ing.name.toLowerCase() === current.name.toLowerCase()
      );
      if (!existing) {
        acc.push(current);
      } else if (current.dosage && !existing.dosage) {
        // Prefer ingredient with dosage info
        existing.dosage = current.dosage;
        existing.unit = current.unit;
      }
      return acc;
    }, []);
    
    return uniqueIngredients;
  }

  /**
   * Parse ingredients from text
   */
  private static parseIngredientsText(text: string): Ingredient[] {
    const ingredients: Ingredient[] = [];
    
    // Split by common delimiters
    const parts = text.split(/[,;]/).map(part => part.trim());
    
    for (const part of parts) {
      if (!part) continue;
      
      // Try to extract dosage information
      const dosageMatch = part.match(/(\d+(?:\.\d+)?)\s*(mg|g|mcg|iu|µg)/i);
      
      let name = part;
      let dosage: number | null = null;
      let unit: string | null = null;
      
      if (dosageMatch) {
        dosage = parseFloat(dosageMatch[1]);
        unit = dosageMatch[2].toLowerCase();
        // Remove dosage from name
        name = part.replace(dosageMatch[0], '').trim();
      }
      
      // Clean up name
      name = name.replace(/^[\d\s\-()]+/, '').trim();
      if (!name) continue;
      
      ingredients.push({
        name,
        dosage,
        unit: unit as any,
        isStandardized: false,
        standardizedTo: null
      });
    }
    
    return ingredients;
  }

  /**
   * Parse nutrition data for vitamin/mineral content
   */
  private static parseNutriments(nutriments: Record<string, any>): Ingredient[] {
    const ingredients: Ingredient[] = [];
    
    const vitaminMinerals = [
      'vitamin-c', 'vitamin-d', 'vitamin-b12', 'vitamin-b6', 'vitamin-b1',
      'vitamin-b2', 'vitamin-b3', 'vitamin-b5', 'vitamin-b9', 'vitamin-e',
      'vitamin-k', 'calcium', 'iron', 'magnesium', 'zinc', 'selenium'
    ];
    
    for (const nutrient of vitaminMinerals) {
      const value = nutriments[nutrient];
      const unit = nutriments[`${nutrient}_unit`];
      
      if (value && value > 0) {
        ingredients.push({
          name: this.formatNutrientName(nutrient),
          dosage: parseFloat(value),
          unit: this.normalizeUnit(unit || 'mg'),
          isStandardized: false,
          standardizedTo: null
        });
      }
    }
    
    return ingredients;
  }

  /**
   * Format nutrient name for display
   */
  private static formatNutrientName(nutrient: string): string {
    return nutrient
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Normalize unit format
   */
  private static normalizeUnit(unit: string): any {
    const normalized = unit.toLowerCase();
    const mapping: Record<string, string> = {
      'µg': 'mcg',
      'ug': 'mcg',
      'gram': 'g',
      'milligram': 'mg',
      'microgram': 'mcg'
    };
    
    return mapping[normalized] || normalized;
  }

  /**
   * Extract serving size information
   */
  private static extractServingInfo(product: OpenFoodFactsProduct) {
    let servingAmount: number | null = null;
    let servingUnit: string | null = null;
    let servingsPerContainer: number | null = null;
    
    if (product.serving_size) {
      const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*(g|mg|ml|capsules?|tablets?|scoops?)/i);
      if (match) {
        servingAmount = parseFloat(match[1]);
        servingUnit = this.normalizeUnit(match[2]);
      }
    }
    
    return {
      servingSize: {
        amount: servingAmount,
        unit: servingUnit
      },
      servingsPerContainer
    };
  }

  /**
   * Guess product form from name and categories
   */
  private static guessForm(productName: string, categories: string): any {
    const combined = `${productName} ${categories}`.toLowerCase();
    
    if (combined.includes('capsule')) return 'capsule';
    if (combined.includes('tablet')) return 'tablet';
    if (combined.includes('powder')) return 'powder';
    if (combined.includes('liquid') || combined.includes('syrup')) return 'liquid';
    if (combined.includes('gummy') || combined.includes('gummies')) return 'gummy';
    
    return 'other';
  }

  /**
   * Check if product is likely a supplement
   */
  private static isLikelySupplement(product: OpenFoodFactsProduct): boolean {
    const categories = (product.categories || '').toLowerCase();
    const productName = (product.product_name || '').toLowerCase();
    
    // Supplement indicators
    const supplementKeywords = [
      'dietary supplement', 'nutritional supplement', 'vitamin', 'mineral',
      'supplement', 'capsule', 'tablet', 'softgel', 'probiotic', 'protein',
      'amino acid', 'creatine', 'multivitamin'
    ];
    
    // Non-supplement indicators
    const foodKeywords = [
      'food', 'beverage', 'drink', 'snack', 'meal', 'breakfast', 'lunch',
      'dinner', 'candy', 'chocolate', 'cookie', 'bread', 'milk'
    ];
    
    const text = `${categories} ${productName}`;
    
    const hasSupplementKeywords = supplementKeywords.some(keyword => 
      text.includes(keyword)
    );
    
    const hasFoodKeywords = foodKeywords.some(keyword => 
      text.includes(keyword)
    );
    
    // If it has supplement keywords and no food keywords, likely a supplement
    return hasSupplementKeywords && !hasFoodKeywords;
  }

  /**
   * Assess data completeness (0.0 to 1.0)
   */
  private static assessCompleteness(supplement: Partial<SupplementV1>): number {
    let score = 0;
    let maxScore = 0;
    
    // Essential fields
    maxScore += 2; // productName
    if (supplement.productName && supplement.productName !== 'Unknown Product') score += 2;
    
    maxScore += 1; // brand
    if (supplement.brand && supplement.brand !== 'Unknown Brand') score += 1;
    
    maxScore += 2; // ingredients
    if (supplement.ingredients && supplement.ingredients.length > 0) {
      score += 1;
      if (supplement.ingredients.some(ing => ing.dosage)) score += 1;
    }
    
    maxScore += 1; // serving size
    if (supplement.servingSize?.amount) score += 1;
    
    maxScore += 1; // form
    if (supplement.form && supplement.form !== 'other') score += 1;
    
    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Merge OpenFoodFacts data with AI extraction results
   */
  static mergeWithAIData(
    openFoodFactsData: Partial<SupplementV1>,
    aiData: Partial<SupplementV1>
  ): Partial<SupplementV1> {
    const merged: Partial<SupplementV1> = { ...openFoodFactsData };
    
    // Merge ingredients (prefer AI data for dosages)
    if (aiData.ingredients && aiData.ingredients.length > 0) {
      const mergedIngredients = [...(openFoodFactsData.ingredients || [])];
      
      for (const aiIngredient of aiData.ingredients) {
        const existing = mergedIngredients.find(ing => 
          ing.name.toLowerCase() === aiIngredient.name.toLowerCase()
        );
        
        if (existing) {
          // Update with AI data if it has better dosage info
          if (aiIngredient.dosage && !existing.dosage) {
            existing.dosage = aiIngredient.dosage;
            existing.unit = aiIngredient.unit;
          }
        } else {
          mergedIngredients.push(aiIngredient);
        }
      }
      
      merged.ingredients = mergedIngredients;
    }
    
    // Prefer AI data for price information
    if (aiData.price?.value) {
      merged.price = aiData.price;
    }
    
    // Prefer AI data for serving container info
    if (aiData.servingsPerContainer) {
      merged.servingsPerContainer = aiData.servingsPerContainer;
    }
    
    // Update source tracking
    merged.meta = {
      ...merged.meta!,
      source: 'combined',
      sourceMap: {
        ...merged.meta?.sourceMap,
        ...aiData.meta?.sourceMap
      }
    };
    
    return merged;
  }
}