// services/product.service.ts
import { Product, ProductSchema } from "../schemas/product";
import { supplementAPI } from "../src/services/api.js";

/**
 * Primary function the app uses.
 * Now uses the new intelligent database API that automatically handles:
 * - OpenFoodFacts lookup
 * - AI fallback
 * - Normalization 
 * - JSON storage
 */
export async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    console.log('Fetching product for barcode:', barcode);
    const result = await supplementAPI.getSupplement(barcode);
    console.log('API response:', JSON.stringify(result, null, 2));
    
    // Check if we have data in the response
    if (result && result.data) {
      console.log('Found data in result.data:', JSON.stringify(result.data, null, 2));
      console.log('Meta information:', result.data.meta);
      console.log('Quality information:', result.data.quality);
      console.log('Ingredients:', result.data.ingredients);
      
      // Try to parse the data according to our Product schema
      const parsed = ProductSchema.safeParse(result.data);
      if (parsed.success) {
        console.log('Schema validation successful');
        return parsed.data;
      } else {
        console.log('Schema validation failed:', parsed.error);
      }
      
      // If the API returns data in a different format, try to map it
      // This is a fallback for when your API returns data in a different structure
      if (result.data.productName || result.data.name || result.data.product_name || result.data.title) {
        // Extract brand from productName if available (e.g., "Solid Nutrition, Chocolate Brownie" -> "Solid Nutrition")
        let extractedBrand = result.data.brand;
        if (result.data.productName && result.data.productName.includes(',')) {
          extractedBrand = result.data.productName.split(',')[0].trim();
        }
        
        const mappedData = {
          barcode,
          name: result.data.productName || result.data.name || result.data.product_name || result.data.title || "Unknown Product",
          brand: extractedBrand || result.data.brands || result.data.manufacturer || null,
          servingSize: result.data.servingSize ? String(result.data.servingSize) : result.data.serving_size ? String(result.data.serving_size) : null,
          servingsPerContainer: result.data.servingsPerContainer || result.data.servings_per_container || null,
          ingredients: result.data.ingredients || [],
          category: result.data.category || null,
          subCategory: result.data.subCategory || null,
          form: result.data.form || null,
          quality: result.data.quality || null,
          meta: result.data.meta || null,
          source: result.data.source || "api",
          raw: result.data
        };
        
        console.log('Mapped data:', mappedData);
        const mappedParsed = ProductSchema.safeParse(mappedData);
        if (mappedParsed.success) {
          console.log('Mapped data validation successful');
          return mappedParsed.data;
        } else {
          console.log('Mapped data validation failed:', mappedParsed.error);
        }
      }
    }
    
    // Check if data is at the root level (not nested in result.data)
    if (result && (result.productName || result.name || result.product_name || result.title)) {
      console.log('Found data at root level:', result);
      const mappedData = {
        barcode,
        name: result.productName || result.name || result.product_name || result.title || "Unknown Product",
        brand: result.brand || result.brands || result.manufacturer || null,
        servingSize: result.servingSize ? String(result.servingSize) : result.serving_size ? String(result.serving_size) : null,
        servingsPerContainer: result.servingsPerContainer || result.servings_per_container || null,
        ingredients: result.ingredients || [],
        source: result.source || "api",
        raw: result
      };
      
      console.log('Root level mapped data:', mappedData);
      const rootParsed = ProductSchema.safeParse(mappedData);
      if (rootParsed.success) {
        console.log('Root level validation successful');
        return rootParsed.data;
      } else {
        console.log('Root level validation failed:', rootParsed.error);
      }
    }
    
    console.log('No valid product data found');
    return null;
  } catch (error) {
    console.error('Error fetching product:', error);
    // For now, return null to show "not found" instead of crashing
    // This allows the app to continue working even if the API is not available
    return null;
  }
}
