import type {
  ExtractedIngredient,
  UnrecognizedIngredient,
  ExtractionMetadata,
  StructuredSupplementData,
  Product,
  RawTableData,
  NutritionExtractionResult,
  QualityScore,
  IngredientAnalysis,
} from '../schemas/zodSchemas.js';

// Re-export all types from Zod schemas for consistency
export type {
  ExtractedIngredient,
  UnrecognizedIngredient,
  ExtractionMetadata,
  StructuredSupplementData,
  Product,
  RawTableData,
  NutritionExtractionResult,
  QualityScore,
  IngredientAnalysis,
} from '../schemas/zodSchemas.js';

// Re-export validation functions
export {
  validateProduct,
  validateStructuredData,
  validateAPIResponse,
  validateSwedishURL,
  safeValidateProduct,
  safeValidateStructuredData,
  swedishIngredientMapping,
  dosageThresholds,
} from '../schemas/zodSchemas.js';

// Extended Product type with analysis properties
export interface AnalyzedProduct extends Product {
  supplementInfo?: {
    activeIngredient?: string;
    dosagePerUnit?: string | number | null;
    quality?: {
      score: number;
    };
  };
  extractionResult?: {
    structuredData?: {
      ingredients?: Record<string, any>;
    };
  };
  extractedData?: {
    structuredData?: {
      ingredients?: Record<string, any>;
    };
  };
  nutrientCost?: {
    costPerMg: number;
    valueScore: number;
  };
}

// Additional interfaces not covered by Zod schemas
export interface PatternData {
  html?: string;
  price?: number;
  product_name?: string;
  dosage_blocks?: number;
  quantities_found?: number;
}

export interface DOMBlock {
  text: string;
  html?: string;
  relevance_score?: number;
  relevance_details?: any;
  category?: string;
}

export interface RankedBlocks {
  price_blocks: DOMBlock[];
  ingredient_blocks: DOMBlock[];
  dosage_blocks: DOMBlock[];
  quantity_blocks: DOMBlock[];
  nutritional_blocks: DOMBlock[];
  other_blocks: DOMBlock[];
}

export interface ExtractedData {
  html?: string;
  rankedBlocks?: RankedBlocks;
  patternData?: PatternData;
}

// Site extractor interface
export interface SiteExtractor {
  siteDomain: string;
  canHandle(url: string): boolean;
  extractNutritionTable(html: string): NutritionExtractionResult;
  toStructuredFormat(extractedData: NutritionExtractionResult): StructuredSupplementData;
}