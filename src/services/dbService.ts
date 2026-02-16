import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SupplementV1, SupplementSchema } from '../schemas/supplementSchema.js';
import { SchemaMigrator } from '../schemas/migrations.js';

export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  backupCreated?: boolean;
}

export interface SearchOptions {
  category?: string;
  brand?: string;
  verified?: boolean;
  limit?: number;
  offset?: number;
}

export class DatabaseService {
  private static readonly SUPPLEMENTS_FILE = path.join(process.cwd(), 'src/data/supplements.json');
  private static readonly BACKUP_DIR = path.join(process.cwd(), 'src/data/backups');
  private static readonly MAX_BACKUPS = 10;

  private static supplements: SupplementV1[] | null = null;

  /**
   * Initialize database and run migrations if needed
   */
  static async initialize(): Promise<DatabaseResult<void>> {
    try {
      // Ensure directories exist
      const dataDir = path.dirname(this.SUPPLEMENTS_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.BACKUP_DIR)) {
        fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
      }

      // Create empty file if it doesn't exist
      if (!fs.existsSync(this.SUPPLEMENTS_FILE)) {
        fs.writeFileSync(this.SUPPLEMENTS_FILE, JSON.stringify([], null, 2));
      }

      // Run migrations
      const migrationResult = await SchemaMigrator.migrate();
      if (!migrationResult.success) {
        console.warn('Migration had issues:', migrationResult.errors);
      }

      // Load data
      await this.loadData();

      // Clean up old backups
      await SchemaMigrator.cleanupBackups();

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Load supplements data from file
   */
  private static async loadData(): Promise<void> {
    try {
      const fileContent = fs.readFileSync(this.SUPPLEMENTS_FILE, 'utf-8');
      const rawData = JSON.parse(fileContent);
      
      // Validate each supplement
      this.supplements = rawData.filter((item: any) => {
        try {
          SupplementSchema.parse(item);
          return true;
        } catch (error) {
          console.warn('Invalid supplement data found:', error instanceof Error ? error.message : String(error), item);
          return false;
        }
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      this.supplements = [];
    }
  }

  /**
   * Save supplements data to file with backup
   */
  private static async saveData(): Promise<boolean> {
    try {
      // Create backup before saving
      await this.createBackup();
      
      // Save new data
      const jsonData = JSON.stringify(this.supplements, null, 2);
      fs.writeFileSync(this.SUPPLEMENTS_FILE, jsonData);
      
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  }

  /**
   * Create backup of current data
   */
  private static async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.BACKUP_DIR, `supplements-backup-${timestamp}.json`);
    
    if (fs.existsSync(this.SUPPLEMENTS_FILE)) {
      fs.copyFileSync(this.SUPPLEMENTS_FILE, backupPath);
    }
    
    return backupPath;
  }

  /**
   * Generate normalized hash for deduplication
   */
  private static generateNormalizedHash(supplement: Partial<SupplementV1>): string {
    const brand = (supplement.brand || '').toLowerCase().trim();
    const name = (supplement.productName || '').toLowerCase().trim();
    const primaryIngredient = supplement.ingredients?.[0]?.name?.toLowerCase().trim() || '';
    const form = supplement.form || '';
    
    const hashInput = `${brand}-${name}-${primaryIngredient}-${form}`;
    return crypto.createHash('md5').update(hashInput).digest('hex').substring(0, 16);
  }

  /**
   * Find existing supplement by barcode or hash
   */
  private static findExisting(supplement: Partial<SupplementV1>): SupplementV1 | null {
    if (!this.supplements) return null;

    // First try barcode (primary key)
    if (supplement.barcode) {
      const barcodeMatch = this.supplements.find(s => s.barcode === supplement.barcode);
      if (barcodeMatch) return barcodeMatch;
    }

    // Fallback to normalized hash
    const hash = this.generateNormalizedHash(supplement);
    return this.supplements.find(s => {
      const existingHash = this.generateNormalizedHash(s);
      return existingHash === hash;
    }) || null;
  }

  /**
   * Core function: Get or create supplement
   */
  static async getOrCreateSupplement(
    barcode: string | null,
    supplementData?: Partial<SupplementV1>
  ): Promise<DatabaseResult<SupplementV1>> {
    try {
      // Ensure database is loaded
      if (!this.supplements) {
        await this.loadData();
      }

      // Try to find existing by barcode first
      if (barcode) {
        const existing = this.supplements?.find(s => s.barcode === barcode);
        if (existing) {
          return { success: true, data: existing };
        }
      }

      // If no supplement data provided, return not found
      if (!supplementData) {
        return { 
          success: false, 
          error: `Supplement with barcode ${barcode} not found` 
        };
      }

      // Try to find existing by normalized hash
      const existingByHash = this.findExisting(supplementData);
      if (existingByHash) {
        // Update barcode if it was missing
        if (barcode && !existingByHash.barcode) {
          existingByHash.barcode = barcode;
          existingByHash.meta.lastUpdated = new Date().toISOString();
          await this.saveData();
        }
        return { success: true, data: existingByHash };
      }

      // Create new supplement
      const newSupplement: SupplementV1 = {
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

      // Validate new supplement
      const validated = SupplementSchema.parse(newSupplement);

      // Add to database
      this.supplements = this.supplements || [];
      this.supplements.push(validated);

      // Save to file
      const saved = await this.saveData();
      if (!saved) {
        return { success: false, error: 'Failed to save supplement to database' };
      }

      return { success: true, data: validated, backupCreated: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to get/create supplement: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Get supplement by barcode
   */
  static async getByBarcode(barcode: string): Promise<DatabaseResult<SupplementV1>> {
    return this.getOrCreateSupplement(barcode);
  }

  /**
   * Update existing supplement
   */
  static async updateSupplement(
    barcode: string, 
    updates: Partial<SupplementV1>
  ): Promise<DatabaseResult<SupplementV1>> {
    try {
      // Ensure database is loaded
      if (!this.supplements) {
        await this.loadData();
      }

      // Find existing supplement
      const existingIndex = this.supplements?.findIndex(s => s.barcode === barcode) ?? -1;
      if (existingIndex === -1) {
        return { success: false, error: `Supplement with barcode ${barcode} not found` };
      }

      // Create backup
      await this.createBackup();

      // Merge updates
      const existing = this.supplements![existingIndex];
      const updated: SupplementV1 = {
        ...existing,
        ...updates,
        _schemaVersion: 1, // Ensure version stays correct
        barcode: existing.barcode, // Don't allow barcode changes
        meta: {
          ...existing.meta,
          ...updates.meta,
          lastUpdated: new Date().toISOString(),
          verified: updates.meta?.verified ?? existing.meta.verified
        }
      };

      // Validate updated supplement
      const validated = SupplementSchema.parse(updated);

      // Update in array
      this.supplements![existingIndex] = validated;

      // Save to file
      const saved = await this.saveData();
      if (!saved) {
        return { success: false, error: 'Failed to save updated supplement' };
      }

      return { success: true, data: validated, backupCreated: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to update supplement: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Search supplements
   */
  static async search(query: string, options: SearchOptions = {}): Promise<DatabaseResult<SupplementV1[]>> {
    try {
      // Ensure database is loaded
      if (!this.supplements) {
        await this.loadData();
      }

      let results = this.supplements || [];

      // Apply filters
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
          s.brand.toLowerCase().includes(options.brand!.toLowerCase())
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
      return { 
        success: false, 
        error: `Search failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Get database statistics
   */
  static async getStats(): Promise<DatabaseResult<any>> {
    try {
      if (!this.supplements) {
        await this.loadData();
      }

      const supplements = this.supplements || [];
      const stats = {
        total: supplements.length,
        byCategory: {} as Record<string, number>,
        bySource: {} as Record<string, number>,
        verified: supplements.filter(s => s.meta.verified).length,
        withBarcode: supplements.filter(s => s.barcode).length,
        lastUpdated: supplements.length > 0 ? 
          Math.max(...supplements.map(s => new Date(s.meta.lastUpdated).getTime())) : null
      };

      // Count by category
      for (const supplement of supplements) {
        stats.byCategory[supplement.category] = (stats.byCategory[supplement.category] || 0) + 1;
        stats.bySource[supplement.meta.source] = (stats.bySource[supplement.meta.source] || 0) + 1;
      }

      return { success: true, data: stats };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to get stats: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Delete supplement by barcode
   */
  static async deleteSupplement(barcode: string): Promise<DatabaseResult<boolean>> {
    try {
      if (!this.supplements) {
        await this.loadData();
      }

      const initialLength = this.supplements?.length || 0;
      this.supplements = this.supplements?.filter(s => s.barcode !== barcode) || [];

      if (this.supplements.length === initialLength) {
        return { success: false, error: `Supplement with barcode ${barcode} not found` };
      }

      // Create backup and save
      await this.createBackup();
      const saved = await this.saveData();
      
      if (!saved) {
        return { success: false, error: 'Failed to save after deletion' };
      }

      return { success: true, data: true, backupCreated: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to delete supplement: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Export all data
   */
  static async exportData(): Promise<DatabaseResult<SupplementV1[]>> {
    try {
      if (!this.supplements) {
        await this.loadData();
      }

      return { success: true, data: [...(this.supplements || [])] };
    } catch (error) {
      return { 
        success: false, 
        error: `Export failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Force reload data from file
   */
  static async reload(): Promise<DatabaseResult<void>> {
    try {
      await this.loadData();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Reload failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}