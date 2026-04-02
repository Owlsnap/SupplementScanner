// schemas/product.ts
// This schema aligns with backend SupplementSchemaV1
import { z } from "zod";

export const IngredientSchema = z.object({
  name: z.string(),
  dosage: z.number().nullable().optional(), // Renamed from dosage_mg to match backend
  unit: z.string().nullable().optional(), // Added to match backend
  isStandardized: z.boolean().optional(), // Added to match backend
  standardizedTo: z.string().nullable().optional(), // Added to match backend
  // Legacy fields for backward compatibility
  dosage_mg: z.number().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  sourceText: z.string().optional().nullable(),
  raw: z.any().optional()
});

export const QualitySchema = z.object({
  underDosed: z.boolean().nullable().optional(), // Matches backend order
  overDosed: z.boolean().nullable().optional(),
  fillerRisk: z.string().nullable().optional(),
  bioavailability: z.string().nullable().optional()
});

export const MetaSchema = z.object({
  source: z.string().optional(), // Matches backend: 'openfoodfacts', 'ai', 'user', 'combined'
  verified: z.boolean().optional(),
  lastUpdated: z.string().optional(),
  sourceMap: z.any().optional()
});

// Serving size schema to match backend
export const ServingSizeSchema = z.object({
  amount: z.number().nullable().optional(),
  unit: z.string().nullable().optional()
});

export const ProductSchema = z.object({
  _schemaVersion: z.number().optional(), // Backend includes schema version
  barcode: z.string().nullable().optional(), // Barcode can be null for manual entries
  productName: z.string(), // Backend uses 'productName' not 'name'
  brand: z.string().nullable().optional(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  form: z.string().optional(),
  servingsPerContainer: z.number().nullable().optional(),
  servingSize: ServingSizeSchema.optional(), // Changed from string to object
  ingredients: z.array(IngredientSchema).default([]),
  quality: QualitySchema.optional(),
  meta: MetaSchema.optional(),
  // Legacy fields for backward compatibility
  name: z.string().optional(), // Alias for productName
  source: z.string().optional(),
  raw: z.any().optional()
});

export type Product = z.infer<typeof ProductSchema>;
