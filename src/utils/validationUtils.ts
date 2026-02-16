import { z } from 'zod';
import { 
  ProductSchema, 
  safeValidateProduct,
  safeValidateStructuredData,
} from '../schemas/zodSchemas.js';
import type { Product, StructuredSupplementData } from '../types/index.js';

/**
 * Validation utilities for supplement analysis
 */

// Enhanced product validation with business logic
export const EnhancedProductSchema = ProductSchema.extend({
  // Add custom validations
}).refine(
  (data) => {
    // Price should be reasonable for supplements (10-5000 kr)
    const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
    return price >= 10 && price <= 5000;
  },
  { message: "Price should be between 10-5000 kr for supplements" }
).refine(
  (data) => {
    // Quantity should be reasonable (10g - 5kg)
    const quantity = typeof data.quantity === 'string' ? parseFloat(data.quantity) : data.quantity;
    return quantity >= 10 && quantity <= 5000;
  },
  { message: "Quantity should be between 10g - 5kg for supplements" }
).refine(
  (data) => {
    // Unit should be valid weight unit
    const validUnits = ['g', 'kg', 'ml', 'l', 'caps', 'tablets', 'servings'];
    return validUnits.includes(data.unit.toLowerCase());
  },
  { message: "Unit must be a valid supplement unit (g, kg, ml, l, caps, tablets, servings)" }
);

/**
 * Normalize product data to ensure consistent types
 */
export function normalizeProductData(product: any): any {
  const normalized = { ...product };
  
  // Convert string numbers to actual numbers where appropriate
  if (typeof normalized.dosagePerUnit === 'string' && normalized.dosagePerUnit) {
    const dosageNum = parseFloat(normalized.dosagePerUnit.replace(/[^\d.]/g, ''));
    if (!isNaN(dosageNum)) {
      normalized.dosagePerUnit = dosageNum;
    }
  }
  
  if (typeof normalized.servingSize === 'string' && normalized.servingSize) {
    const servingNum = parseFloat(normalized.servingSize.replace(/[^\d.]/g, ''));
    if (!isNaN(servingNum)) {
      normalized.servingSize = servingNum;
    }
  }
  
  if (typeof normalized.servingsPerContainer === 'string' && normalized.servingsPerContainer) {
    const servingsNum = parseFloat(normalized.servingsPerContainer.replace(/[^\d.]/g, ''));
    if (!isNaN(servingsNum)) {
      normalized.servingsPerContainer = servingsNum;
    }
  }
  
  return normalized;
}

/**
 * Validate and sanitize product data for supplement analysis
 */
export function validateSupplementProduct(product: unknown): { success: true; data: Product } | { success: false; error: string } {
  // First normalize the data
  const normalizedProduct = normalizeProductData(product);
  
  // First try enhanced validation
  const enhancedResult = EnhancedProductSchema.safeParse(normalizedProduct);
  if (enhancedResult.success) {
    return { success: true, data: enhancedResult.data };
  }

  // Fallback to basic validation
  const basicResult = safeValidateProduct(normalizedProduct);
  if (basicResult.success) {
    console.warn('⚠️ Product passed basic validation but failed enhanced validation:', enhancedResult.error.message);
    return { success: true, data: basicResult.data };
  }

  return { success: false, error: basicResult.error };
}

/**
 * Validate array of products and filter out invalid ones
 */
export function validateProductArray(products: unknown[]): { validProducts: Product[]; errors: string[] } {
  const validProducts: Product[] = [];
  const errors: string[] = [];

  products.forEach((product, index) => {
    const result = validateSupplementProduct(product);
    if (result.success) {
      validProducts.push(result.data);
    } else {
      errors.push(`Product ${index + 1}: ${result.error}`);
    }
  });

  return { validProducts, errors };
}

/**
 * Validate structured supplement data with enhanced checks
 */
export function validateStructuredSupplementData(data: unknown): { success: true; data: StructuredSupplementData } | { success: false; error: string } {
  const result = safeValidateStructuredData(data);
  if (!result.success) {
    return result;
  }

  // Additional business logic validation
  const supplementData = result.data;
  
  // Check if ingredients make sense
  const ingredientCount = Object.keys(supplementData.ingredients).length;
  if (ingredientCount === 0) {
    return { success: false, error: "Structured data must contain at least one ingredient" };
  }

  // Check confidence level
  if (supplementData.extractionMetadata.confidence < 0.1) {
    return { success: false, error: "Extraction confidence too low (< 0.1)" };
  }

  // Validate caffeine content consistency
  const caffeineIngredient = supplementData.ingredients.caffeine;
  if (caffeineIngredient?.isIncluded && caffeineIngredient.dosage_mg > 0) {
    if (supplementData.totalCaffeineContent_mg === null) {
      console.warn('⚠️ Caffeine ingredient found but totalCaffeineContent_mg is null');
    } else if (Math.abs(supplementData.totalCaffeineContent_mg - caffeineIngredient.dosage_mg) > 50) {
      console.warn('⚠️ Large discrepancy between caffeine ingredient dosage and total caffeine content');
    }
  }

  return { success: true, data: supplementData };
}

/**
 * Type guard to check if a URL is a Swedish supplement site
 */
export function isSwedishSupplementSite(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    return domain.includes('tillskottsbolaget') || 
           domain.includes('gymgrossisten') || 
           domain.includes('svensktkosttillskott') ||
           domain.includes('nutramino') ||
           domain.includes('life.se');
  } catch {
    return false;
  }
}

/**
 * Validate and extract URL domain information
 */
export function analyzeSupplementURL(url: string): { domain: string; isSwedish: boolean; category: string | null } {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    const isSwedish = isSwedishSupplementSite(url);
    
    // Determine product category from URL
    let category: string | null = null;
    const path = urlObj.pathname.toLowerCase();
    
    if (path.includes('pre-workout') || path.includes('pwo')) category = 'pre_workout';
    else if (path.includes('protein')) category = 'protein';
    else if (path.includes('kreatin') || path.includes('creatine')) category = 'creatine';
    else if (path.includes('vitamin')) category = 'vitamin';
    else if (path.includes('mineral')) category = 'mineral';
    
    return { domain, isSwedish, category };
  } catch {
    return { domain: 'unknown', isSwedish: false, category: null };
  }
}

/**
 * Create validation report for debugging
 */
export function createValidationReport(data: unknown): {
  type: 'product' | 'structured_data' | 'unknown';
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Try to determine data type and validate accordingly
  if (typeof data === 'object' && data !== null) {
    const obj = data as any;
    
    if ('id' in obj && 'name' in obj && 'price' in obj) {
      // Looks like a Product
      const result = validateSupplementProduct(data);
      return {
        type: 'product',
        isValid: result.success,
        errors: result.success ? [] : [result.error],
        warnings: []
      };
    } else if ('productName' in obj && 'ingredients' in obj) {
      // Looks like StructuredSupplementData
      const result = validateStructuredSupplementData(data);
      return {
        type: 'structured_data',
        isValid: result.success,
        errors: result.success ? [] : [result.error],
        warnings: []
      };
    }
  }

  return {
    type: 'unknown',
    isValid: false,
    errors: ['Unknown data format'],
    warnings: []
  };
}