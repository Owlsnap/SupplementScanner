import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { SupplementSchemaV1 } from './supplementSchema.js';

// Schema version detection
const SchemaVersionSchema = z.object({
  _schemaVersion: z.number()
});

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  backupPath?: string;
  errors?: string[];
}

export class SchemaMigrator {
  private static readonly BACKUP_DIR = path.join(process.cwd(), 'src/data/backups');
  private static readonly SUPPLEMENTS_FILE = path.join(process.cwd(), 'src/data/supplements.json');

  /**
   * Create backup of supplements.json before migration
   */
  static async createBackup(): Promise<string> {
    // Ensure backup directory exists
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.BACKUP_DIR, `supplements-backup-${timestamp}.json`);

    // Copy current file if it exists
    if (fs.existsSync(this.SUPPLEMENTS_FILE)) {
      fs.copyFileSync(this.SUPPLEMENTS_FILE, backupPath);
    } else {
      // Create empty backup if no file exists
      fs.writeFileSync(backupPath, JSON.stringify([], null, 2));
    }

    return backupPath;
  }

  /**
   * Detect schema version of a supplement object
   */
  static detectVersion(supplement: any): number {
    try {
      const parsed = SchemaVersionSchema.parse(supplement);
      return parsed._schemaVersion;
    } catch {
      return 0; // Legacy data without version
    }
  }

  /**
   * Migrate legacy data (v0) to v1
   */
  static migrateLegacyToV1(legacyData: any): any {
    // Transform legacy structure to v1
    return {
      _schemaVersion: 1,
      barcode: legacyData.barcode || null,
      productName: legacyData.name || legacyData.productName || 'Unknown Product',
      brand: legacyData.brand || 'Unknown Brand',
      category: this.guessCategory(legacyData),
      subCategory: 'other',
      form: this.guessForm(legacyData),
      servingsPerContainer: this.parseNumber(legacyData.servingsPerContainer),
      servingSize: {
        amount: this.parseServingAmount(legacyData.servingSize),
        unit: this.parseServingUnit(legacyData.servingSize)
      },
      ingredients: this.transformIngredients(legacyData.ingredients || {}),
      price: {
        value: this.parseNumber(legacyData.price),
        currency: 'SEK', // Default for Swedish sites
        pricePerServing: null
      },
      quality: {
        underDosed: null,
        overDosed: null,
        fillerRisk: null,
        bioavailability: null
      },
      meta: {
        source: 'ai',
        verified: false,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * Run migration on supplements database
   */
  static async migrate(): Promise<MigrationResult> {
    const errors: string[] = [];
    let migratedCount = 0;

    try {
      // Create backup first
      const backupPath = await this.createBackup();

      // Read current data
      let supplements: any[] = [];
      if (fs.existsSync(this.SUPPLEMENTS_FILE)) {
        const fileContent = fs.readFileSync(this.SUPPLEMENTS_FILE, 'utf-8');
        supplements = JSON.parse(fileContent);
      }

      // Migrate each supplement
      const migratedSupplements = supplements.map((supplement, index) => {
        try {
          const version = this.detectVersion(supplement);
          
          if (version === 0) {
            migratedCount++;
            return this.migrateLegacyToV1(supplement);
          }
          
          if (version === 1) {
            // Already v1, validate
            return SupplementSchemaV1.parse(supplement);
          }
          
          throw new Error(`Unsupported schema version: ${version}`);
        } catch (error) {
          errors.push(`Item ${index}: ${error.message}`);
          return supplement; // Keep original on error
        }
      });

      // Write migrated data
      fs.writeFileSync(this.SUPPLEMENTS_FILE, JSON.stringify(migratedSupplements, null, 2));

      return {
        success: errors.length === 0,
        migratedCount,
        backupPath,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        success: false,
        migratedCount: 0,
        errors: [`Migration failed: ${error.message}`]
      };
    }
  }

  /**
   * Helper methods for legacy data transformation
   */
  private static guessCategory(data: any): 'supplement' | 'vitamin' | 'herb' {
    const name = (data.name || data.productName || '').toLowerCase();
    const ingredients = Object.keys(data.ingredients || {}).join(' ').toLowerCase();
    const combined = `${name} ${ingredients}`;

    if (combined.includes('vitamin') || combined.includes('d3') || combined.includes('b12')) {
      return 'vitamin';
    }
    if (combined.includes('ashwagandha') || combined.includes('ginkgo') || combined.includes('extract')) {
      return 'herb';
    }
    return 'supplement';
  }

  private static guessForm(data: any): 'capsule' | 'tablet' | 'powder' | 'liquid' | 'gummy' | 'other' {
    const combined = `${data.name || ''} ${data.productName || ''} ${data.form || ''}`.toLowerCase();
    
    if (combined.includes('capsule')) return 'capsule';
    if (combined.includes('tablet')) return 'tablet';
    if (combined.includes('powder')) return 'powder';
    if (combined.includes('liquid')) return 'liquid';
    if (combined.includes('gummy')) return 'gummy';
    
    return 'other';
  }

  private static parseNumber(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private static parseServingAmount(servingSize: any): number | null {
    if (!servingSize) return null;
    const str = String(servingSize).toLowerCase();
    const match = str.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  private static parseServingUnit(servingSize: any): string | null {
    if (!servingSize) return null;
    const str = String(servingSize).toLowerCase();
    
    if (str.includes('capsule')) return 'capsule';
    if (str.includes('tablet')) return 'tablet';
    if (str.includes('scoop')) return 'scoop';
    if (str.includes('ml')) return 'ml';
    if (str.includes('mg')) return 'mg';
    if (str.includes('g')) return 'g';
    
    return null;
  }

  private static transformIngredients(legacyIngredients: any): any[] {
    if (Array.isArray(legacyIngredients)) {
      return legacyIngredients.map(ing => ({
        name: ing.name || 'Unknown Ingredient',
        dosage: this.parseNumber(ing.dosage || ing.amount),
        unit: ing.unit || null,
        isStandardized: false,
        standardizedTo: null
      }));
    }
    
    // Convert object format to array
    return Object.entries(legacyIngredients).map(([name, data]: [string, any]) => ({
      name,
      dosage: this.parseNumber(data.dosage || data.amount || data),
      unit: data.unit || null,
      isStandardized: false,
      standardizedTo: null
    }));
  }

  /**
   * Clean up old backups (keep last 10)
   */
  static async cleanupBackups(): Promise<void> {
    try {
      if (!fs.existsSync(this.BACKUP_DIR)) return;

      const backupFiles = fs.readdirSync(this.BACKUP_DIR)
        .filter(file => file.startsWith('supplements-backup-'))
        .map(file => ({
          name: file,
          path: path.join(this.BACKUP_DIR, file),
          stat: fs.statSync(path.join(this.BACKUP_DIR, file))
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      // Keep last 10 backups, delete the rest
      if (backupFiles.length > 10) {
        const filesToDelete = backupFiles.slice(10);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('Error cleaning up backups:', error);
    }
  }
}