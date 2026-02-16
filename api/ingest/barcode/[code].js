import { DatabaseService } from '../../../src/services/dbService.js';
import { OpenFoodFactsService } from '../../../src/services/openFoodFacts.js';
import { multiLayerExtractor } from '../../../src/extraction/multiLayerExtractor.js';

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

  const { code } = req.query;
  const { url, forceRefresh = false } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Barcode is required'
    });
  }

  try {
    // Check if already exists (unless forcing refresh)
    if (!forceRefresh) {
      const existing = await DatabaseService.getByBarcode(code);
      if (existing.success && existing.data) {
        return res.status(200).json({
          success: true,
          data: existing.data,
          source: 'database',
          cached: true
        });
      }
    }

    // Step 1: Try OpenFoodFacts
    console.log(`Attempting OpenFoodFacts lookup for barcode: ${code}`);
    const offResult = await OpenFoodFactsService.extractSupplementData(code);
    
    let finalSupplementData = null;
    let processingSteps = ['openfoodfacts'];

    if (offResult.success && !offResult.needsAIExtraction) {
      // OpenFoodFacts data is sufficient
      finalSupplementData = offResult.supplement;
      console.log('OpenFoodFacts data is complete, no AI extraction needed');
    } else {
      // Step 2: Use AI extraction as fallback/supplement
      let aiData = null;
      
      if (url) {
        console.log('Running AI extraction with provided URL:', url);
        try {
          const aiResult = await multiLayerExtractor(url);
          if (aiResult.success) {
            // Transform AI result to our schema format
            aiData = {
              productName: aiResult.extractedData?.name || 'Unknown Product',
              brand: 'Unknown Brand',
              ingredients: Object.entries(aiResult.extractedData?.ingredients || {}).map(([name, data]) => ({
                name,
                dosage: data.dosage || null,
                unit: 'mg',
                isStandardized: false,
                standardizedTo: null
              })),
              servingsPerContainer: parseInt(aiResult.extractedData?.servingsPerContainer) || null,
              servingSize: {
                amount: parseFloat(aiResult.extractedData?.servingSize) || null,
                unit: 'g'
              },
              price: {
                value: aiResult.extractedData?.price || null,
                currency: 'SEK',
                pricePerServing: null
              },
              meta: {
                source: 'ai',
                verified: false,
                lastUpdated: new Date().toISOString(),
                sourceMap: {
                  ingredients: 'ai',
                  price: 'ai',
                  servingSize: 'ai'
                }
              }
            };
          }
        } catch (error) {
          console.warn('AI extraction failed:', error.message);
        }
        processingSteps.push('ai-extraction');
      }

      // Merge data sources
      if (offResult.success && offResult.supplement && aiData) {
        finalSupplementData = OpenFoodFactsService.mergeWithAIData(offResult.supplement, aiData);
        processingSteps.push('data-merge');
      } else if (offResult.success && offResult.supplement) {
        finalSupplementData = offResult.supplement;
      } else if (aiData) {
        finalSupplementData = aiData;
      }
    }

    if (!finalSupplementData) {
      return res.status(404).json({
        success: false,
        error: 'Could not extract supplement data from any source',
        barcode: code,
        sources_tried: processingSteps
      });
    }

    // Save to database
    const saveResult = await DatabaseService.getOrCreateSupplement(code, finalSupplementData);
    if (!saveResult.success) {
      console.error('Failed to save supplement:', saveResult.error);
      // Return data anyway, but indicate save failure
      return res.status(200).json({
        success: true,
        data: finalSupplementData,
        source: processingSteps.join(' + '),
        cached: false,
        warning: 'Data extracted but not saved to database'
      });
    }

    return res.status(200).json({
      success: true,
      data: saveResult.data,
      source: processingSteps.join(' + '),
      cached: false,
      backup_created: saveResult.backupCreated
    });

  } catch (error) {
    console.error('Barcode ingestion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during barcode ingestion',
      details: error.message
    });
  }
}