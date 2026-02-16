import fs from 'fs';
import path from 'path';

export class DatabaseService {
  static SUPPLEMENTS_FILE = path.join(process.cwd(), 'src/data/supplements.json');
  static supplements = null;

  static async initialize() {
    try {
      const dataDir = path.dirname(this.SUPPLEMENTS_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (!fs.existsSync(this.SUPPLEMENTS_FILE)) {
        fs.writeFileSync(this.SUPPLEMENTS_FILE, JSON.stringify([], null, 2));
      }

      await this.loadData();
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to initialize database: ${error.message}` };
    }
  }

  static async loadData() {
    try {
      const fileContent = fs.readFileSync(this.SUPPLEMENTS_FILE, 'utf-8');
      this.supplements = JSON.parse(fileContent);
    } catch (error) {
      console.error('Failed to load data:', error);
      this.supplements = [];
    }
  }

  static async saveData() {
    try {
      const jsonData = JSON.stringify(this.supplements, null, 2);
      fs.writeFileSync(this.SUPPLEMENTS_FILE, jsonData);
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  }

  static async getByBarcode(barcode) {
    try {
      if (!this.supplements) {
        await this.loadData();
      }

      const supplement = this.supplements?.find(s => s.barcode === barcode);
      
      if (supplement) {
        return { success: true, data: supplement };
      } else {
        return { success: false, error: `Supplement with barcode ${barcode} not found` };
      }
    } catch (error) {
      return { success: false, error: `Failed to get supplement: ${error.message}` };
    }
  }

  static async getOrCreateSupplement(barcode, supplementData) {
    try {
      if (!this.supplements) {
        await this.loadData();
      }

      // Try to find existing by barcode
      const existing = this.supplements?.find(s => s.barcode === barcode);
      if (existing) {
        return { success: true, data: existing };
      }

      if (!supplementData) {
        return { success: false, error: `Supplement with barcode ${barcode} not found` };
      }

      // Create new supplement
      const newSupplement = {
        _schemaVersion: 1,
        barcode,
        productName: supplementData.productName || 'Unknown Product',
        brand: supplementData.brand || 'Unknown Brand',
        category: supplementData.category || 'supplement',
        subCategory: supplementData.subCategory || 'other',
        form: supplementData.form || 'other',
        servingsPerContainer: supplementData.servingsPerContainer || null,
        servingSize: supplementData.servingSize || { amount: null, unit: null },
        ingredients: supplementData.ingredients || [],
        price: supplementData.price || { value: null, currency: null, pricePerServing: null },
        quality: supplementData.quality || { 
          underDosed: null, 
          overDosed: null, 
          fillerRisk: null, 
          bioavailability: null 
        },
        meta: {
          source: supplementData.meta?.source || 'user',
          verified: supplementData.meta?.verified || false,
          lastUpdated: new Date().toISOString(),
          sourceMap: supplementData.meta?.sourceMap
        },
        preWorkoutData: supplementData.preWorkoutData,
        herbData: supplementData.herbData,
        proteinData: supplementData.proteinData
      };

      // Add to database
      this.supplements = this.supplements || [];
      this.supplements.push(newSupplement);

      // Save to file
      const saved = await this.saveData();
      if (!saved) {
        return { success: false, error: 'Failed to save supplement to database' };
      }

      return { success: true, data: newSupplement, backupCreated: true };
    } catch (error) {
      return { success: false, error: `Failed to get/create supplement: ${error.message}` };
    }
  }

  static async search(query, options = {}) {
    try {
      if (!this.supplements) {
        await this.loadData();
      }

      let results = this.supplements || [];

      if (query.trim()) {
        const normalizedQuery = query.toLowerCase();
        results = results.filter(supplement => 
          supplement.productName.toLowerCase().includes(normalizedQuery) ||
          supplement.brand.toLowerCase().includes(normalizedQuery) ||
          supplement.ingredients.some(ing => 
            ing.name.toLowerCase().includes(normalizedQuery)
          )
        );
      }

      if (options.category) {
        results = results.filter(s => s.category === options.category);
      }

      if (options.brand) {
        results = results.filter(s => 
          s.brand.toLowerCase().includes(options.brand.toLowerCase())
        );
      }

      if (options.verified !== undefined) {
        results = results.filter(s => s.meta.verified === options.verified);
      }

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      results = results.slice(offset, offset + limit);

      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: `Search failed: ${error.message}` };
    }
  }

  static async getStats() {
    try {
      if (!this.supplements) {
        await this.loadData();
      }

      const supplements = this.supplements || [];
      const stats = {
        total: supplements.length,
        byCategory: {},
        bySource: {},
        verified: supplements.filter(s => s.meta.verified).length,
        withBarcode: supplements.filter(s => s.barcode).length,
        lastUpdated: supplements.length > 0 ? 
          Math.max(...supplements.map(s => new Date(s.meta.lastUpdated).getTime())) : null
      };

      for (const supplement of supplements) {
        stats.byCategory[supplement.category] = (stats.byCategory[supplement.category] || 0) + 1;
        stats.bySource[supplement.meta.source] = (stats.bySource[supplement.meta.source] || 0) + 1;
      }

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: `Failed to get stats: ${error.message}` };
    }
  }
}