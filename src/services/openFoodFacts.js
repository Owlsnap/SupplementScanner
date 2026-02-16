export class OpenFoodFactsService {
  static async getProduct(barcode) {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      
      if (!response.ok) {
        return { success: false, error: `HTTP error! status: ${response.status}` };
      }

      const data = await response.json();
      
      if (data.status === 0) {
        return { success: false, error: 'Product not found in OpenFoodFacts database' };
      }

      return {
        success: true,
        data: data.product
      };
    } catch (error) {
      return { success: false, error: `OpenFoodFacts API error: ${error.message}` };
    }
  }
}