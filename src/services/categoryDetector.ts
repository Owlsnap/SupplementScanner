import { ingredientQuality, supplementCategories } from '../data/supplementData.js';
import { Category, SubCategory } from '../schemas/supplementSchema.js';

export interface CategoryResult {
  category: Category;
  subCategory: SubCategory;
  confidence: number;
  source: 'knowledge-base' | 'keyword' | 'ai-fallback';
  reasoning: string;
}

export class CategoryDetector {
  private static readonly CATEGORY_KEYWORDS: Record<Category, string[]> = {
    vitamin: [
      'vitamin', 'd3', 'b12', 'b6', 'b1', 'b2', 'b3', 'b5', 'b7', 'b9', 
      'cholecalciferol', 'ergocalciferol', 'folic acid', 'biotin', 'pantothenic'
    ],
    herb: [
      'ashwagandha', 'ginkgo', 'ginseng', 'rhodiola', 'turmeric', 'extract',
      'standardized', 'milk thistle', 'echinacea', 'valerian', 'passionflower',
      'bacopa', 'brahmi', 'adaptogen'
    ],
    supplement: [
      'protein', 'creatine', 'bcaa', 'amino', 'pre-workout', 'caffeine',
      'beta-alanine', 'citrulline', 'arginine', 'glutamine', 'carnitine'
    ]
  };

  private static readonly SUBCATEGORY_KEYWORDS: Record<SubCategory, string[]> = {
    protein: ['whey', 'casein', 'protein', 'isolate', 'concentrate'],
    preworkout: ['pre-workout', 'caffeine', 'energy', 'pump', 'focus'],
    'intra-workout': ['intra', 'during', 'bcaa', 'eaa', 'hydration'],
    'post-workout': ['post', 'recovery', 'glutamine', 'repair'],
    nootropic: ['brain', 'cognitive', 'focus', 'memory', 'alpha-gpc'],
    adaptogen: ['ashwagandha', 'rhodiola', 'ginseng', 'stress', 'cortisol'],
    multivitamin: ['multivitamin', 'multi', 'complete', 'daily'],
    'single-vitamin': ['vitamin d', 'vitamin b', 'vitamin c', 'single'],
    mineral: ['magnesium', 'zinc', 'iron', 'calcium', 'mineral'],
    sleep: ['melatonin', 'sleep', 'night', 'calm', 'relaxation'],
    stress: ['cortisol', 'stress', 'anxiety', 'calm', 'gaba'],
    joint: ['glucosamine', 'chondroitin', 'joint', 'collagen', 'msm'],
    immunity: ['immune', 'immunity', 'vitamin c', 'zinc', 'elderberry'],
    gut: ['probiotic', 'digestive', 'enzyme', 'gut', 'prebiotic'],
    hormonal: ['testosterone', 'hormone', 'daa', 'tribulus', 'maca'],
    other: []
  };

  /**
   * Normalize ingredient string for matching
   */
  private static normalizeIngredient(ingredient: string): string {
    return ingredient
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b(mg|g|mcg|iu|ml)\b/g, '')
      .trim();
  }

  /**
   * Check if ingredients match supplementData.js knowledge base
   */
  private static checkKnowledgeBase(
    productName: string, 
    ingredients: Array<{name: string, dosage?: number}>
  ): CategoryResult | null {
    const combinedText = `${productName} ${ingredients.map(i => i.name).join(' ')}`;
    const normalizedText = this.normalizeIngredient(combinedText);

    // Check each ingredient against ingredientQuality database
    for (const ingredient of ingredients) {
      const normalizedIngredient = this.normalizeIngredient(ingredient.name);
      
      // Find exact or partial matches in ingredientQuality
      const qualityMatch = Object.keys(ingredientQuality).find(key => {
        const normalizedKey = this.normalizeIngredient(key);
        return normalizedIngredient.includes(normalizedKey) || 
               normalizedKey.includes(normalizedIngredient);
      });

      if (qualityMatch) {
        const qualityData = ingredientQuality[qualityMatch];
        const category = this.mapKnowledgeBaseCategory(qualityData.category);
        
        if (category) {
          return {
            category: category.category,
            subCategory: category.subCategory,
            confidence: 0.9,
            source: 'knowledge-base',
            reasoning: `Matched ingredient "${qualityMatch}" from knowledge base (category: ${qualityData.category})`
          };
        }
      }
    }

    // Check supplementCategories for dosage context
    for (const ingredient of ingredients) {
      const normalizedIngredient = this.normalizeIngredient(ingredient.name);
      
      const categoryMatch = Object.keys(supplementCategories).find(cat => {
        const activeIng = this.normalizeIngredient(supplementCategories[cat].activeIngredient);
        return normalizedIngredient.includes(activeIng) || 
               activeIng.includes(normalizedIngredient);
      });

      if (categoryMatch) {
        const category = this.mapSupplementCategory(categoryMatch);
        if (category) {
          return {
            category: category.category,
            subCategory: category.subCategory,
            confidence: 0.85,
            source: 'knowledge-base',
            reasoning: `Matched supplement category "${categoryMatch}" from dosage database`
          };
        }
      }
    }

    return null;
  }

  /**
   * Map knowledge base categories to our schema
   */
  private static mapKnowledgeBaseCategory(knowledgeCategory: string): {category: Category, subCategory: SubCategory} | null {
    const mapping: Record<string, {category: Category, subCategory: SubCategory}> = {
      'magnesium': { category: 'vitamin', subCategory: 'mineral' },
      'vitamin_d': { category: 'vitamin', subCategory: 'single-vitamin' },
      'protein': { category: 'supplement', subCategory: 'protein' },
      'omega_3': { category: 'supplement', subCategory: 'other' },
      'amino_acids': { category: 'supplement', subCategory: 'protein' },
      'pre_workout': { category: 'supplement', subCategory: 'preworkout' }
    };

    return mapping[knowledgeCategory] || null;
  }

  /**
   * Map supplementCategories to our schema
   */
  private static mapSupplementCategory(suppCategory: string): {category: Category, subCategory: SubCategory} | null {
    const mapping: Record<string, {category: Category, subCategory: SubCategory}> = {
      'magnesium': { category: 'vitamin', subCategory: 'mineral' },
      'vitamin_d': { category: 'vitamin', subCategory: 'single-vitamin' },
      'protein': { category: 'supplement', subCategory: 'protein' },
      'omega_3': { category: 'supplement', subCategory: 'other' },
      'creatine': { category: 'supplement', subCategory: 'other' },
      'amino_acids': { category: 'supplement', subCategory: 'protein' },
      'pre_workout': { category: 'supplement', subCategory: 'preworkout' }
    };

    return mapping[suppCategory] || null;
  }

  /**
   * Keyword-based detection (secondary method)
   */
  private static checkKeywords(
    productName: string, 
    ingredients: Array<{name: string}>
  ): CategoryResult | null {
    const combinedText = `${productName} ${ingredients.map(i => i.name).join(' ')}`;
    const normalizedText = this.normalizeIngredient(combinedText);

    // Check main categories
    let bestCategoryMatch: {category: Category, score: number} | null = null;
    
    for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
      const matches = keywords.filter(keyword => 
        normalizedText.includes(this.normalizeIngredient(keyword))
      );
      
      if (matches.length > 0) {
        const score = matches.length / keywords.length;
        if (!bestCategoryMatch || score > bestCategoryMatch.score) {
          bestCategoryMatch = { category: category as Category, score };
        }
      }
    }

    if (!bestCategoryMatch) return null;

    // Check subcategories
    let bestSubCategoryMatch: {subCategory: SubCategory, score: number} | null = null;
    
    for (const [subCategory, keywords] of Object.entries(this.SUBCATEGORY_KEYWORDS)) {
      const matches = keywords.filter(keyword => 
        normalizedText.includes(this.normalizeIngredient(keyword))
      );
      
      if (matches.length > 0) {
        const score = matches.length / Math.max(keywords.length, 1);
        if (!bestSubCategoryMatch || score > bestSubCategoryMatch.score) {
          bestSubCategoryMatch = { subCategory: subCategory as SubCategory, score };
        }
      }
    }

    return {
      category: bestCategoryMatch.category,
      subCategory: bestSubCategoryMatch?.subCategory || 'other',
      confidence: Math.min(bestCategoryMatch.score + (bestSubCategoryMatch?.score || 0), 1.0),
      source: 'keyword',
      reasoning: `Keyword matching found ${bestCategoryMatch.category}${bestSubCategoryMatch ? ` / ${bestSubCategoryMatch.subCategory}` : ''}`
    };
  }

  /**
   * AI-based fallback detection (tertiary method)
   */
  private static async aiCategoryDetection(
    productName: string, 
    ingredients: Array<{name: string}>
  ): Promise<CategoryResult> {
    // Simple rule-based fallback for now
    // In a full implementation, this would call OpenAI API
    
    const combinedText = `${productName} ${ingredients.map(i => i.name).join(' ')}`.toLowerCase();
    
    // Simple heuristics
    if (combinedText.includes('protein') || combinedText.includes('whey')) {
      return {
        category: 'supplement',
        subCategory: 'protein',
        confidence: 0.6,
        source: 'ai-fallback',
        reasoning: 'AI fallback detected protein-related keywords'
      };
    }
    
    if (combinedText.includes('vitamin') || combinedText.includes('d3')) {
      return {
        category: 'vitamin',
        subCategory: 'single-vitamin',
        confidence: 0.6,
        source: 'ai-fallback',
        reasoning: 'AI fallback detected vitamin-related keywords'
      };
    }

    if (combinedText.includes('extract') || combinedText.includes('standardized')) {
      return {
        category: 'herb',
        subCategory: 'other',
        confidence: 0.6,
        source: 'ai-fallback',
        reasoning: 'AI fallback detected herb-related keywords'
      };
    }

    // Default fallback
    return {
      category: 'supplement',
      subCategory: 'other',
      confidence: 0.3,
      source: 'ai-fallback',
      reasoning: 'AI fallback - no specific category detected'
    };
  }

  /**
   * Main category detection method
   */
  static async detectCategory(
    productName: string,
    ingredients: Array<{name: string, dosage?: number}>
  ): Promise<CategoryResult> {
    // 1. Try knowledge base first (PRIMARY)
    const knowledgeResult = this.checkKnowledgeBase(productName, ingredients);
    if (knowledgeResult && knowledgeResult.confidence >= 0.8) {
      return knowledgeResult;
    }

    // 2. Try keyword matching (SECONDARY)
    const keywordResult = this.checkKeywords(productName, ingredients);
    if (keywordResult && keywordResult.confidence >= 0.5) {
      return keywordResult;
    }

    // 3. Fall back to AI (TERTIARY)
    const aiResult = await this.aiCategoryDetection(productName, ingredients);
    
    // Return the best result
    const results = [knowledgeResult, keywordResult, aiResult].filter(Boolean);
    return results.sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0))[0] || aiResult;
  }

  /**
   * Get ingredient quality scores from knowledge base
   */
  static getIngredientQuality(ingredientName: string): any {
    const normalized = this.normalizeIngredient(ingredientName);
    
    const match = Object.keys(ingredientQuality).find(key => {
      const normalizedKey = this.normalizeIngredient(key);
      return normalized.includes(normalizedKey) || normalizedKey.includes(normalized);
    });

    return match ? ingredientQuality[match] : null;
  }

  /**
   * Get dosage recommendations from knowledge base
   */
  static getDosageInfo(category: string): any {
    return supplementCategories[category] || null;
  }
}