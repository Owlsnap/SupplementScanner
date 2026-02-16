import { z } from 'zod';
import type { StructuredSupplementData, ExtractedIngredient } from '../types/index.js';

// Base types
export const CategorySchema = z.enum(['supplement', 'vitamin', 'herb']);
export const SubCategorySchema = z.enum([
  'protein', 'preworkout', 'intra-workout', 'post-workout',
  'nootropic', 'adaptogen', 'multivitamin', 'single-vitamin',
  'mineral', 'sleep', 'stress', 'joint', 'immunity', 'gut',
  'hormonal', 'other'
]);

export const FormSchema = z.enum(['capsule', 'tablet', 'powder', 'liquid', 'gummy', 'other']);
export const UnitSchema = z.enum(['g', 'mg', 'mcg', 'IU', 'ml', 'capsule', 'tablet', 'scoop', '%']);
export const SourceSchema = z.enum(['openfoodfacts', 'ai', 'user', 'combined']);
export const BioavailabilitySchema = z.enum(['low', 'medium', 'high']);

// Serving size schema
export const ServingSizeSchema = z.object({
  amount: z.number().nullable(),
  unit: UnitSchema.nullable()
});

// Ingredient schema
export const IngredientSchema = z.object({
  name: z.string(),
  dosage: z.number().nullable(),
  unit: UnitSchema.nullable(),
  isStandardized: z.boolean().optional(),
  standardizedTo: z.string().nullable().optional()
});

// Price schema
export const PriceSchema = z.object({
  value: z.number().nullable(),
  currency: z.string().nullable(),
  pricePerServing: z.number().nullable()
});

// Quality analysis schema
export const QualitySchema = z.object({
  underDosed: z.boolean().nullable(),
  overDosed: z.boolean().nullable(),
  fillerRisk: z.boolean().nullable(),
  bioavailability: BioavailabilitySchema.nullable()
});

// Metadata schema
export const MetaSchema = z.object({
  source: SourceSchema,
  verified: z.boolean(),
  lastUpdated: z.string(),
  sourceMap: z.record(z.string(), SourceSchema).optional()
});

// Category-specific schemas
export const PreWorkoutSchema = z.object({
  caffeine: z.object({ mg: z.number().nullable(), present: z.boolean() }),
  betaAlanine: z.object({ mg: z.number().nullable(), present: z.boolean() }),
  lCitrulline: z.object({ mg: z.number().nullable(), present: z.boolean() }),
  lArginine: z.object({ mg: z.number().nullable(), present: z.boolean() }),
  lTyrosine: z.object({ mg: z.number().nullable(), present: z.boolean() }),
  taurine: z.object({ mg: z.number().nullable(), present: z.boolean() }),
  theanine: z.object({ mg: z.number().nullable(), present: z.boolean() }),
  creatine: z.object({ mg: z.number().nullable(), present: z.boolean() })
});

export const HerbSchema = z.object({
  plantName: z.string(),
  plantPart: z.enum(['root', 'leaf', 'seed', 'bark', 'whole', 'unknown']),
  extractType: z.enum(['powder', 'extract', 'tincture', 'oil', 'unknown']),
  extractRatio: z.string().nullable(),
  standardization: z.string().nullable()
});

export const ProteinSchema = z.object({
  proteinType: z.enum(['whey', 'casein', 'plant', 'egg', 'collagen', 'other']),
  aminoAcidProfile: z.record(z.string(), z.number()).optional(),
  isComplete: z.boolean().nullable(),
  digestibility: z.enum(['fast', 'medium', 'slow']).nullable()
});

// Main supplement schema V1
export const SupplementSchemaV1 = z.object({
  _schemaVersion: z.literal(1),
  barcode: z.string().nullable(),
  productName: z.string(),
  brand: z.string(),
  category: CategorySchema,
  subCategory: SubCategorySchema,
  form: FormSchema,
  servingsPerContainer: z.number().nullable(),
  servingSize: ServingSizeSchema,
  ingredients: z.array(IngredientSchema),
  price: PriceSchema,
  quality: QualitySchema,
  meta: MetaSchema,
  
  // Category-specific data (optional)
  preWorkoutData: PreWorkoutSchema.optional(),
  herbData: HerbSchema.optional(),
  proteinData: ProteinSchema.optional()
});

export type SupplementV1 = z.infer<typeof SupplementSchemaV1>;
export type Category = z.infer<typeof CategorySchema>;
export type SubCategory = z.infer<typeof SubCategorySchema>;
export type Form = z.infer<typeof FormSchema>;
export type Ingredient = z.infer<typeof IngredientSchema>;
export type PreWorkout = z.infer<typeof PreWorkoutSchema>;
export type Herb = z.infer<typeof HerbSchema>;
export type Protein = z.infer<typeof ProteinSchema>;

// Current schema (alias for latest version)
export const SupplementSchema = SupplementSchemaV1;
export type Supplement = SupplementV1;

// Legacy schema for compatibility (keep existing schema)
export const supplementExtractionSchema: StructuredSupplementData = {
  "productName": "",
  "servingSize": "", // e.g., "20 g", "1 scoop"
  "servingsPerContainer": "", // e.g., "20", "30"
  "ingredients": {
    "caffeine": {
      "isIncluded": false,
      "dosage_mg": 0,
      "sources": [] // e.g., ["caffeine anhydrous", "caffshock"]
    },
    "beta_alanine": {
      "isIncluded": false,
      "dosage_mg": 0,
      "sources": []
    },
    "l_citrulline": {
      "isIncluded": false,
      "dosage_mg": 0,
      "sources": []
    },
    "l_arginine": {
      "isIncluded": false,
      "dosage_mg": 0,
      "sources": []
    },
    "l_theanine": {
      "isIncluded": false,
      "dosage_mg": 0,
      "sources": []
    },
    "l_tyrosine": {
      "isIncluded": false,
      "dosage_mg": 0,
      "sources": []
    },
    "creatine_monohydrate": {
      "isIncluded": false,
      "dosage_mg": 0,
      "sources": []
    },
    "taurine": {
      "isIncluded": false,
      "dosage_mg": 0,
      "sources": []
    },
    "betaine_anhydrous": {
      "isIncluded": false,
      "dosage_mg": 0,
      "sources": []
    },
    "choline_bitartrate": {
      "isIncluded": false,
      "dosage_mg": 0,
      "sources": []
    }
  },
  "unrecognizedIngredients": [],
  "totalCaffeineContent_mg": null, // Calculated from all caffeine sources
  "extractionMetadata": {
    "tableFound": false,
    "ingredientListFound": false,
    "servingSizeFound": false,
    "confidence": 0.0 // 0.0 - 1.0
  }
};

// Swedish to English ingredient mapping
export const swedishIngredientMapping: Record<string, string> = {
  "koffein": "caffeine",
  "beta-alanin": "beta_alanine",
  "citrullinmalat": "l_citrulline",
  "l-citrullin": "l_citrulline",
  "l-arginin": "l_arginine",
  "l-teanin": "l_theanine",
  "l-tyrosin": "l_tyrosine",
  "n-acetyl l-tyrosin": "l_tyrosine",
  "kreatin monohydrat": "creatine_monohydrate",
  "taurin": "taurine",
  "betain anhydrous": "betaine_anhydrous",
  "kolinbitartrat": "choline_bitartrate",
  "grönt-te extrakt": "green_tea_extract",
  "svartpepparextrakt": "black_pepper_extract",
  "piper nigrum": "black_pepper_extract"
};

// Dosage analysis thresholds for structured data
export const dosageThresholds: Record<string, {
  low: number;
  optimal_min: number;
  optimal_max: number;
  high: number;
  excessive: number;
  unit: string;
}> = {
  "caffeine": {
    "low": 100,
    "optimal_min": 150,
    "optimal_max": 300,
    "high": 400,
    "excessive": 600,
    "unit": "mg"
  },
  "beta_alanine": {
    "low": 1500,
    "optimal_min": 3000,
    "optimal_max": 5000,
    "high": 6000,
    "excessive": 8000,
    "unit": "mg"
  },
  "l_citrulline": {
    "low": 4000,
    "optimal_min": 6000,
    "optimal_max": 8000,
    "high": 10000,
    "excessive": 12000,
    "unit": "mg"
  },
  "l_tyrosine": {
    "low": 500,
    "optimal_min": 500,
    "optimal_max": 2000,
    "high": 3000,
    "excessive": 4000,
    "unit": "mg"
  },
  "creatine_monohydrate": {
    "low": 3000,
    "optimal_min": 5000,
    "optimal_max": 5000,
    "high": 10000,
    "excessive": 15000,
    "unit": "mg"
  },
  "taurine": {
    "low": 500,
    "optimal_min": 1000,
    "optimal_max": 3000,
    "high": 4000,
    "excessive": 6000,
    "unit": "mg"
  },
  "l_theanine": {
    "low": 50,
    "optimal_min": 100,
    "optimal_max": 200,
    "high": 300,
    "excessive": 400,
    "unit": "mg"
  }
};