import { DatabaseService } from '../../src/services/dbService.js';
import { SupplementSchemaV1 } from '../../src/schemas/supplementSchema.js';
import { CategoryDetector } from '../../src/services/categoryDetector.js';
import { QualityAnalyzer } from '../../src/services/qualityAnalyzer.js';

let isInitialized = false;

export default async function handler(req, res) {
  // Initialize database on first request
  if (!isInitialized) {
    const initResult = await DatabaseService.initialize();
    if (!initResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Database initialization failed',
        details: initResult.error
      });
    }
    isInitialized = true;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const manualData = req.body;

  if (!manualData) {
    return res.status(400).json({
      success: false,
      error: 'Manual data is required'
    });
  }

  try {
    console.log(`📝 Manual ingestion for: ${manualData.productName || 'Unknown Product'}`);

    // Build supplement data with defaults for missing fields
    const ingredients = manualData.ingredients || [];

    // Auto-detect category if not provided
    let category = manualData.category;
    let subCategory = manualData.subCategory;

    if (!category || !subCategory) {
      const detected = CategoryDetector.detectCategory(
        manualData.productName || '',
        ingredients
      );
      category = category || detected.category;
      subCategory = subCategory || detected.subCategory;
    }

    // Build the supplement object with schema defaults
    const supplementData = {
      _schemaVersion: 1,
      barcode: manualData.barcode || null,
      productName: manualData.productName || 'Unknown Product',
      brand: manualData.brand || 'Unknown Brand',
      category,
      subCategory,
      form: manualData.form || 'other',
      servingsPerContainer: manualData.servingsPerContainer || null,
      servingSize: {
        amount: manualData.servingSize?.amount || null,
        unit: manualData.servingSize?.unit || null
      },
      ingredients: ingredients.map(ing => ({
        name: ing.name,
        dosage: ing.dosage || null,
        unit: ing.unit || 'mg',
        isStandardized: ing.isStandardized || false,
        standardizedTo: ing.standardizedTo || null
      })),
      price: {
        value: manualData.price?.value || null,
        currency: manualData.price?.currency || 'SEK',
        pricePerServing: manualData.price?.pricePerServing || null
      },
      quality: {
        underDosed: null,
        overDosed: null,
        fillerRisk: null,
        bioavailability: null
      },
      meta: {
        source: 'user',
        verified: true, // Manual entries are considered verified
        lastUpdated: new Date().toISOString(),
        sourceMap: {
          manual: 'user_submitted'
        }
      }
    };

    // Run quality analysis
    const qualityAnalysis = QualityAnalyzer.analyzeQuality(supplementData);
    supplementData.quality = {
      underDosed: qualityAnalysis.underDosed,
      overDosed: qualityAnalysis.overDosed,
      fillerRisk: qualityAnalysis.fillerRisk,
      bioavailability: qualityAnalysis.bioavailability
    };

    // Calculate price per serving if possible
    if (supplementData.price.value && supplementData.servingsPerContainer) {
      supplementData.price.pricePerServing =
        Math.round((supplementData.price.value / supplementData.servingsPerContainer) * 100) / 100;
    }

    // Validate with Zod schema
    try {
      const validated = SupplementSchemaV1.parse(supplementData);

      // Save to database
      const key = manualData.barcode || `manual_${Date.now()}_${supplementData.productName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)}`;
      const saveResult = await DatabaseService.getOrCreateSupplement(key, validated);

      if (!saveResult.success) {
        console.error('Failed to save manual supplement:', saveResult.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to save supplement to database',
          details: saveResult.error
        });
      }

      return res.status(201).json({
        success: true,
        data: saveResult.data,
        source: 'manual',
        backup_created: saveResult.backupCreated,
        qualityAnalysis: qualityAnalysis.details,
        message: 'Product manually added successfully'
      });

    } catch (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({
        success: false,
        error: 'Invalid product data',
        details: validationError.errors || validationError.message
      });
    }

  } catch (error) {
    console.error('Manual ingestion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during manual ingestion',
      details: error.message
    });
  }
}
