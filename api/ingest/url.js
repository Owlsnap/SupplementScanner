import { DatabaseService } from '../../src/services/dbService.js';
import { multiLayerExtractor } from '../../src/extraction/multiLayerExtractor.js';
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

  const { url, barcode } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required'
    });
  }

  try {
    console.log(`🔍 URL ingestion for: ${url}`);

    // Step 1: Run AI extraction on the URL
    const aiResult = await multiLayerExtractor(url);

    if (!aiResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to extract product data from URL',
        details: aiResult.error
      });
    }

    // Step 2: Transform AI result to supplement schema format
    const extractedData = aiResult.extractedData || {};

    // Parse ingredients from AI result
    const ingredients = [];
    if (extractedData.ingredients && typeof extractedData.ingredients === 'object') {
      for (const [name, data] of Object.entries(extractedData.ingredients)) {
        if (data.isIncluded) {
          ingredients.push({
            name,
            dosage: data.dosage_mg || data.dosage || null,
            unit: 'mg',
            isStandardized: false,
            standardizedTo: null
          });
        }
      }
    }

    // Detect category
    const productName = extractedData.productName || extractedData.name || 'Unknown Product';
    const category = CategoryDetector.detectCategory(productName, ingredients);

    // Build supplement data
    const supplementData = {
      _schemaVersion: 1,
      barcode: barcode || null,
      productName,
      brand: extractedData.brand || 'Unknown Brand',
      category: category.category,
      subCategory: category.subCategory,
      form: extractedData.form || 'other',
      servingsPerContainer: parseInt(extractedData.servingsPerContainer) || null,
      servingSize: {
        amount: parseFloat(extractedData.servingSize) || null,
        unit: extractedData.servingSizeUnit || 'g'
      },
      ingredients,
      price: {
        value: extractedData.price || null,
        currency: extractedData.currency || 'SEK',
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
        lastUpdated: new Date().toISOString(),
        sourceMap: {
          url: url
        }
      }
    };

    // Step 3: Run quality analysis
    const qualityAnalysis = QualityAnalyzer.analyzeQuality(supplementData);
    supplementData.quality = {
      underDosed: qualityAnalysis.underDosed,
      overDosed: qualityAnalysis.overDosed,
      fillerRisk: qualityAnalysis.fillerRisk,
      bioavailability: qualityAnalysis.bioavailability
    };

    // Step 4: Calculate price per serving if possible
    if (supplementData.price.value && supplementData.servingsPerContainer) {
      supplementData.price.pricePerServing =
        Math.round((supplementData.price.value / supplementData.servingsPerContainer) * 100) / 100;
    }

    // Step 5: Save to database
    let saveResult;
    if (barcode) {
      // If barcode provided, use it as key
      saveResult = await DatabaseService.getOrCreateSupplement(barcode, supplementData);
    } else {
      // Generate a unique ID based on product name and brand
      const generatedId = `url_${Date.now()}_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)}`;
      saveResult = await DatabaseService.getOrCreateSupplement(generatedId, supplementData);
    }

    if (!saveResult.success) {
      console.error('Failed to save supplement:', saveResult.error);
      return res.status(200).json({
        success: true,
        data: supplementData,
        source: 'ai',
        warning: 'Data extracted but not saved to database',
        qualityAnalysis: qualityAnalysis.details
      });
    }

    return res.status(200).json({
      success: true,
      data: saveResult.data,
      source: 'ai',
      backup_created: saveResult.backupCreated,
      qualityAnalysis: qualityAnalysis.details
    });

  } catch (error) {
    console.error('URL ingestion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during URL ingestion',
      details: error.message
    });
  }
}
