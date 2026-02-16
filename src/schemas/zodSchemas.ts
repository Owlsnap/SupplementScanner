import { z } from 'zod';

// Core extraction validation schemas
export const ExtractedIngredientSchema = z.object({
  isIncluded: z.boolean(),
  dosage_mg: z.number().min(0),
  sources: z.array(z.string()).optional(),
  rawName: z.string().optional(),
  calculated: z.boolean().optional(),
  caffeine_content_mg: z.number().min(0).optional(),
});

export const UnrecognizedIngredientSchema = z.object({
  name: z.string().min(1),
  dosage_mg: z.number().min(0),
  description: z.string(),
});

export const ExtractionMetadataSchema = z.object({
  tableFound: z.boolean(),
  ingredientListFound: z.boolean(),
  servingSizeFound: z.boolean(),
  priceFound: z.boolean().optional(),
  quantityFound: z.boolean().optional(),
  confidence: z.number().min(0).max(1),
  siteDomain: z.string().optional(),
  extractorUsed: z.string().optional(),
  extractedAt: z.string().optional(),
  method: z.string().optional(),
  version: z.string().optional(),
});

export const StructuredSupplementDataSchema = z.object({
  name: z.string().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  quantity: z.union([z.number(), z.string()]).optional(),
  unit: z.string().optional(),
  productName: z.string(),
  servingSize: z.string(),
  servingsPerContainer: z.string(),
  ingredients: z.record(z.string(), ExtractedIngredientSchema),
  unrecognizedIngredients: z.array(UnrecognizedIngredientSchema),
  totalCaffeineContent_mg: z.number().min(0).nullable(),
  extractionMetadata: ExtractionMetadataSchema,
  activeIngredient: z.string().optional(),
  dosagePerUnit: z.number().nullable().optional(),
  nutritionalFacts: NutritionalFactsSchema.optional(),
  ingredientListText: z.string().optional(),
});

// Product validation schema
export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.union([z.string(), z.number()]),
  quantity: z.union([z.string(), z.number()]),
  unit: z.string(),
  activeIngredient: z.string(),
  dosagePerUnit: z.union([z.string(), z.number()]).nullable(),
  pricePerUnit: z.number().nullable().optional(),
  servingSize: z.union([z.string(), z.number()]).optional(),
  servingsPerContainer: z.union([z.string(), z.number()]).optional(),
  structuredIngredients: StructuredSupplementDataSchema.optional(),
  extractionMethod: z.string().optional(),
  url: z.string().optional(),
  completeness: z.number().optional(),
  confidence: z.number().optional(),
});

// Nutritional facts schemas (for macro nutrition tables like protein powders)
export const NutritionalFactsPerServingSchema = z.object({
  servingSize: z.string().optional(),
  energy_kj: z.number().min(0).optional(),
  energy_kcal: z.number().min(0).optional(),
  protein_g: z.number().min(0).optional(),
  fat_g: z.number().min(0).optional(),
  saturatedFat_g: z.number().min(0).optional(),
  carbohydrates_g: z.number().min(0).optional(),
  sugars_g: z.number().min(0).optional(),
  fiber_g: z.number().min(0).optional(),
  salt_g: z.number().min(0).optional(),
});

export const NutritionalFactsSchema = z.object({
  per100g: NutritionalFactsPerServingSchema.optional(),
  perServing: NutritionalFactsPerServingSchema.optional(),
});

// Raw extraction data schemas
export const RawTableDataSchema = z.object({
  ingredient: z.string(),
  dosage: z.number().min(0),
  unit: z.string(),
});

export const NutritionExtractionResultSchema = z.object({
  ingredients: z.record(z.string(), ExtractedIngredientSchema),
  servingSize: z.string().nullable(),
  productName: z.string().nullable(),
  rawTableData: z.array(RawTableDataSchema),
  price: z.number().min(0).nullable().optional(),
  quantity: z.number().min(0).nullable().optional(),
  unit: z.string().nullable().optional(),
  nutritionalFacts: NutritionalFactsSchema.optional(),
  ingredientListText: z.string().optional(),
});

// Quality analysis schemas
export const QualityScoreSchema = z.object({
  score: z.number().min(0).max(100),
  factors: z.object({
    dosage: z.number().min(0).max(100),
    bioavailability: z.number().min(0).max(100),
    purity: z.number().min(0).max(100),
    synergy: z.number().min(0).max(100),
  }),
  recommendations: z.array(z.string()),
});

export const IngredientAnalysisSchema = z.object({
  name: z.string(),
  current_dosage: z.number().min(0),
  optimal_dosage: z.number().min(0),
  quality_score: QualityScoreSchema,
  is_sufficient: z.boolean(),
  bioavailability_notes: z.array(z.string()),
  form_quality: z.enum(['excellent', 'good', 'acceptable', 'poor']),
});

// Swedish ingredient mapping validation
export const SwedishIngredientMappingSchema = z.record(
  z.string().min(1),
  z.string().min(1)
).refine(
  (mapping) => Object.keys(mapping).length > 0,
  { message: "Swedish ingredient mapping must have at least one entry" }
);

// Dosage threshold validation
export const DosageThresholdSchema = z.object({
  low: z.number().min(0),
  optimal_min: z.number().min(0),
  optimal_max: z.number().min(0),
  high: z.number().min(0),
  excessive: z.number().min(0),
  unit: z.string(),
}).refine(
  (data) => data.optimal_min <= data.optimal_max,
  { message: "Optimal min must be less than or equal to optimal max" }
).refine(
  (data) => data.low <= data.optimal_min,
  { message: "Low threshold must be less than or equal to optimal min" }
);

// API response validation schemas
export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  structuredData: StructuredSupplementDataSchema.optional(),
  error: z.string().optional(),
  metadata: z.object({
    structured_extraction: z.boolean().optional(),
    siteDomain: z.string().optional(),
    parallel_extraction: z.boolean().optional(),
    confidence: z.number().min(0).max(1).optional(),
  }).optional(),
});

// URL validation for Swedish supplement sites
export const SwedishSupplementURLSchema = z.string().url().refine(
  (url) => {
    const domain = new URL(url).hostname.toLowerCase();
    return domain.includes('tillskottsbolaget') || 
           domain.includes('gymgrossisten') || 
           domain.includes('svensktkosttillskott');
  },
  { message: "URL must be from a supported Swedish supplement site" }
);

// Export inferred types from Zod schemas
export type ExtractedIngredient = z.infer<typeof ExtractedIngredientSchema>;
export type UnrecognizedIngredient = z.infer<typeof UnrecognizedIngredientSchema>;
export type ExtractionMetadata = z.infer<typeof ExtractionMetadataSchema>;
export type StructuredSupplementData = z.infer<typeof StructuredSupplementDataSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type RawTableData = z.infer<typeof RawTableDataSchema>;
export type NutritionExtractionResult = z.infer<typeof NutritionExtractionResultSchema>;
export type QualityScore = z.infer<typeof QualityScoreSchema>;
export type IngredientAnalysis = z.infer<typeof IngredientAnalysisSchema>;
export type NutritionalFactsPerServing = z.infer<typeof NutritionalFactsPerServingSchema>;
export type NutritionalFacts = z.infer<typeof NutritionalFactsSchema>;

// Validation helper functions
export function validateProduct(data: unknown): Product {
  return ProductSchema.parse(data);
}

export function validateStructuredData(data: unknown): StructuredSupplementData {
  return StructuredSupplementDataSchema.parse(data);
}

export function validateAPIResponse(data: unknown): z.infer<typeof APIResponseSchema> {
  return APIResponseSchema.parse(data);
}

export function validateSwedishURL(url: string): string {
  return SwedishSupplementURLSchema.parse(url);
}

// Safe validation functions that return results instead of throwing
export function safeValidateProduct(data: unknown): { success: true; data: Product } | { success: false; error: string } {
  const result = ProductSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}

export function safeValidateStructuredData(data: unknown): { success: true; data: StructuredSupplementData } | { success: false; error: string } {
  const result = StructuredSupplementDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}

// Swedish ingredient mapping with validation
export const swedishIngredientMapping: Record<string, string> = {
  'koffein': 'caffeine',
  'beta-alanin': 'beta_alanine',
  'betaalanin': 'beta_alanine',
  'citrullinmalat': 'l_citrulline',
  'l-citrullin': 'l_citrulline',
  'lcitrullin': 'l_citrulline',
  'l-arginin': 'l_arginine',
  'larginin': 'l_arginine',
  'l-teanin': 'l_theanine',
  'lteanin': 'l_theanine',
  'varav l-teanin': 'l_theanine',
  'varavlteanin': 'l_theanine',
  'l-tyrosin': 'l_tyrosine',
  'ltyrosin': 'l_tyrosine',
  'n-acetyl l-tyrosin': 'l_tyrosine',
  'nacetylltyrosin': 'l_tyrosine',
  'nalt': 'l_tyrosine',
  'kreatin': 'creatine_monohydrate',
  'kreatin monohydrat': 'creatine_monohydrate',
  'kreatinmonohydrat': 'creatine_monohydrate',
  'taurin': 'taurine',
  'betain': 'betaine_anhydrous',
  'kolin bitartrat': 'choline_bitartrate',
  'kolinbitartrat': 'choline_bitartrate',
  'grönt-te extrakt': 'green_tea_extract',
  'gröntte': 'green_tea_extract',
};

// Dosage analysis thresholds for ingredient validation
export const dosageThresholds: Record<string, {
  low: number;
  optimal_min: number;
  optimal_max: number;
  high: number;
  excessive: number;
  unit: string;
}> = {
  caffeine: {
    low: 100,
    optimal_min: 150,
    optimal_max: 300,
    high: 400,
    excessive: 600,
    unit: 'mg'
  },
  beta_alanine: {
    low: 1500,
    optimal_min: 3000,
    optimal_max: 5000,
    high: 6000,
    excessive: 8000,
    unit: 'mg'
  },
  l_citrulline: {
    low: 4000,
    optimal_min: 6000,
    optimal_max: 8000,
    high: 10000,
    excessive: 12000,
    unit: 'mg'
  },
  l_tyrosine: {
    low: 500,
    optimal_min: 500,
    optimal_max: 2000,
    high: 3000,
    excessive: 4000,
    unit: 'mg'
  },
  creatine_monohydrate: {
    low: 3000,
    optimal_min: 5000,
    optimal_max: 5000,
    high: 10000,
    excessive: 15000,
    unit: 'mg'
  },
  taurine: {
    low: 500,
    optimal_min: 1000,
    optimal_max: 3000,
    high: 4000,
    excessive: 6000,
    unit: 'mg'
  },
  l_theanine: {
    low: 50,
    optimal_min: 100,
    optimal_max: 200,
    high: 300,
    excessive: 400,
    unit: 'mg'
  }
};

// Validate the Swedish mapping on module load
SwedishIngredientMappingSchema.parse(swedishIngredientMapping);