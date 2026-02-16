import React, { useState, useEffect } from "react";
import { Bot, Plus, Link, Trash2, Menu, Target } from "lucide-react";
import CookieBanner from './CookieBanner';
import IngredientQualityComparison from './IngredientQualityComparison';
import NutrientCostAnalysis from './NutrientCostAnalysis';
import RecommendationsPage from '../pages/RecommendationsPage';
import GuidePage from '../pages/GuidePage';
import { compareSupplementValue } from '../utils/supplementAnalysis.js';
import { 
  validateSupplementProduct, 
  analyzeSupplementURL, 
  createValidationReport 
} from '../utils/validationUtils.js';
import { 
  validateProduct, 
  safeValidateProduct, 
  validateAPIResponse, 
  validateSwedishURL 
} from '../types/index.js';
import type { Product, StructuredSupplementData } from '../types/index.js';

interface MultiLayerResponse {
  data: any;
  structuredData?: StructuredSupplementData;
  success: boolean;
  metadata?: {
    structured_extraction?: boolean;
    siteDomain?: string;
    parallel_extraction?: boolean;
  };
}

interface ActiveIngredient {
  name: string;
  dose_mg: number;
  is_primary: boolean;
}

/**
 * Transform multi-layer extraction data to legacy format for compatibility
 * Also handles structured extraction data
 */
function transformMultiLayerData(multiLayerResponse: MultiLayerResponse) {
  const { data, structuredData, success, metadata } = multiLayerResponse;
  
  if (!success || !data) {
    return { success: false, error: 'Multi-layer extraction failed' };
  }

  // Handle structured extraction format
  if (structuredData && (metadata?.structured_extraction || metadata?.siteDomain || metadata?.parallel_extraction)) {
    const extractionType = metadata?.parallel_extraction ? 'parallel' : 'structured';
    console.log(`🧬 Processing ${extractionType} extraction data:`, {
      productName: structuredData.productName,
      ingredientCount: Object.keys(structuredData.ingredients || {}).length,
      confidence: structuredData.extractionMetadata?.confidence,
      hasLegacyQuality: metadata?.parallel_extraction && !!data.name
    });
    
    // Find active ingredients from structured data
    const activeIngredients: ActiveIngredient[] = [];
    Object.entries(structuredData.ingredients || {}).forEach(([key, ingredient]) => {
      if (ingredient.isIncluded && ingredient.dosage_mg) {
        activeIngredients.push({
          name: key.replace(/_/g, '-'),
          dose_mg: ingredient.dosage_mg,
          is_primary: key === 'caffeine' // Caffeine is often primary in pre-workouts
        });
      }
    });

    const primaryIngredient = activeIngredients.find(ing => ing.is_primary) || activeIngredients[0];
    
    const result = {
      success: true,
      name: structuredData.productName || data.name,
      price: data.price_sek,
      quantity: data.total_servings,
      unit: data.product_type === 'capsules' ? 'capsules' : 
            data.product_type === 'tablets' ? 'tablets' :
            data.product_type === 'powder' ? 'g' : '_',
      activeIngredient: activeIngredients.map(ing => ing.name).join(' + '),
      dosagePerUnit: primaryIngredient?.dose_mg || 0,
      servingSize: structuredData.servingSize ? parseFloat(structuredData.servingSize.replace(/[^\d.]/g, '')) : (data.serving_size || 20),
      servingsPerContainer: data.total_servings || Math.floor(400 / 20), // Calculate from container size / serving size
      // Include structured data for enhanced analysis
      structuredIngredients: structuredData,
      confidence: structuredData.extractionMetadata?.confidence || data.confidence,
      extractionMethod: metadata?.parallel_extraction ? 'parallel' : 'structured',
      allIngredients: activeIngredients
    };
    
    console.log('🧬 Structured transform result:', {
      name: result.name,
      servingSize: result.servingSize,
      servingsPerContainer: result.servingsPerContainer,
      activeIngredient: result.activeIngredient,
      structuredData: !!result.structuredIngredients
    });
    return result;
  }

  // Handle legacy multi-layer format
  const primaryIngredient = data.active_ingredients?.find(ing => ing.is_primary) || data.active_ingredients?.[0];
  
  return {
    success: true,
    name: data.name,
    price: data.price_sek,
    quantity: data.total_servings,
    unit: data.product_type === 'capsules' ? 'capsules' : 
          data.product_type === 'tablets' ? 'tablets' :
          data.product_type === 'powder' ? 'g' : '_',
    activeIngredient: primaryIngredient?.name || 'Unknown',
    dosagePerUnit: primaryIngredient?.dose_mg || 0,
    servingSize: data.serving_size,
    servingsPerContainer: data.total_servings,
    confidence: data.confidence,
    extractionMethod: 'multi-layer',
    allIngredients: data.active_ingredients || []
  };
}

export default function SupplementAnalyzer(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      name: "",
      price: "",
      quantity: "",
      unit: "",
      activeIngredient: "",
      dosagePerUnit: null,
      url: "",
    },
  ]);
  const [nextId, setNextId] = useState<number>(2);
  const [toasts, setToasts] = useState<Array<{id: number, message: string, type: string}>>([]);
  const [extractingProducts, setExtractingProducts] = useState<Set<number>>(new Set());
  const [analyzedSupplements, setAnalyzedSupplements] = useState<Record<string, Product[]>>({});
  const [bestValueProduct, setBestValueProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('scanner');
  const [showMenu, setShowMenu] = useState<boolean>(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('[data-menu]')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Toast functions
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: nextId,
        name: "",
        price: "",
        quantity: "",
        unit: "",
        url: "",
      },
    ]);
    setNextId(nextId + 1);
  };

  const extractProductInfo = async (productId: number, url: string) => {
    if (!url.trim()) return;

    // Validate Swedish supplement URL using Zod and analyze URL
    try {
      validateSwedishURL(url);
      console.log('✅ URL validated as Swedish supplement site');
    } catch (error) {
      console.warn('⚠️ URL validation warning:', error);
      // Continue with extraction but log the warning
    }

    const urlAnalysis = analyzeSupplementURL(url);
    console.log('📊 URL Analysis:', urlAnalysis);

    setExtractingProducts(prev => new Set([...prev, productId]));
    
    // Choose extraction method based on URL
    let extractionMethod = "hybrid"; // Default
    if (url.includes('tillskottsbolaget.se')) {
      extractionMethod = "parallel"; // Use parallel for Tillskottsbolaget (structured ingredients + legacy AI quality analysis)
    }
    
    try {
      // Call backend API (local dev or production)
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

      console.log('🚀 Using Enhanced Scraper (Claude) with database saving...');

      const response = await fetch(
        `${apiUrl}/api/ingest/url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );

      const responseData = await response.json();

      // Log enhanced extraction results
      if (responseData.success) {
        console.log('✨ Enhanced extraction successful:', {
          method: responseData.extraction?.method,
          completeness: responseData.extraction?.completeness + '%',
          savedToDatabase: true,
          barcode: responseData.barcode
        });
      }

      // Validate API response with Zod
      try {
        const validatedResponse = validateAPIResponse(responseData);
        console.log('✅ API response validated successfully with Zod');
      } catch (error) {
        console.warn('⚠️ API response validation failed:', error);
        console.warn('📋 Proceeding with unvalidated response');
      }

      // Handle enhanced ingestion response (SupplementSchemaV1 format)
      let extractedData;
      if (responseData.barcode && responseData.data) {
        // New enhanced ingestion format - transform to legacy UI format
        const supplement = responseData.data;
        const primaryIngredient = supplement.ingredients?.[0];

        extractedData = {
          success: true,
          name: supplement.productName,
          price: supplement.price?.value || "",
          quantity: supplement.servingsPerContainer || "",
          unit: supplement.form === 'capsule' ? 'capsules' :
                supplement.form === 'tablet' ? 'tablets' :
                supplement.form === 'powder' ? 'g' : supplement.form,
          activeIngredient: supplement.ingredients?.map(i => i.name).join(' + ') || "",
          dosagePerUnit: primaryIngredient?.dosage || "",
          servingSize: supplement.servingSize?.amount || "",
          servingsPerContainer: supplement.servingsPerContainer || "",
          // Enhanced metadata
          extractionMethod: 'enhanced_claude',
          confidence: responseData.extraction?.completeness || 100,
          completeness: responseData.extraction?.completeness || 100,
          barcode: responseData.barcode,
          savedToDatabase: true,
          // Store full supplement data
          fullSupplementData: supplement
        };

        console.log('✨ Enhanced data transformed:', {
          name: extractedData.name,
          price: extractedData.price,
          completeness: extractedData.completeness,
          savedToDatabase: true
        });
      } else if (responseData.extraction_method?.includes('multi-layer') ||
          responseData.extraction_method === 'structured' ||
          responseData.extraction_method === 'parallel') {
        // Legacy multi-layer format
        extractedData = transformMultiLayerData(responseData);
      } else {
        // Legacy simple format
        extractedData = responseData;
      }



      console.log('🔍 EXTRACTION DEBUGGING - Full response data:', {
        responseData: {
          success: responseData.success,
          hasData: !!responseData.data,
          hasStructuredData: !!responseData.structuredData,
          extractionMethod: responseData.extraction_method,
          metadata: responseData.metadata,
          structuredDataIngredients: responseData.structuredData?.ingredients ? Object.keys(responseData.structuredData.ingredients) : null,
          // Log the full response structure
          fullResponseKeys: Object.keys(responseData),
          dataStructure: responseData.data ? {
            hasStructuredIngredients: 'structuredIngredients' in responseData.data,
            hasStructuredData: 'structuredData' in responseData.data,
            dataKeys: Object.keys(responseData.data)
          } : null
        },
        extractedData: {
          success: extractedData.success,
          hasStructuredIngredients: !!extractedData.structuredIngredients,
          structuredIngredientsKeys: extractedData.structuredIngredients?.ingredients ? Object.keys(extractedData.structuredIngredients.ingredients) : null,
          name: extractedData.name,
          price: extractedData.price,
          // Log what extractedData contains
          extractedDataKeys: Object.keys(extractedData)
        }
      });

      if (extractedData.success) {
        // Update all fields at once to avoid React state batching issues
        const updatedProducts = products.map((product) => {
          if (product.id === productId) {
            const updatedProduct = {
              ...product,
              name: extractedData.name || "",
              price: extractedData.price || "",
              quantity: extractedData.quantity || "",
              unit: extractedData.unit || "_",
              // Enhanced data from extraction
              activeIngredient: extractedData.activeIngredient || "",
              dosagePerUnit: extractedData.dosagePerUnit || "",
              servingSize: extractedData.servingSize || "",
              servingsPerContainer: extractedData.servingsPerContainer || "",
              // Include structured ingredients data if available
              structuredIngredients: extractedData.structuredIngredients || responseData.structuredData,
              // New multi-layer metadata
              extractionMethod: responseData.extraction_method,
              confidence: responseData.metadata?.final_confidence,
              completeness: responseData.metadata?.completeness
            };

            console.log('💾 Updated product with structured data:', {
              name: updatedProduct.name,
              hasStructuredIngredients: !!updatedProduct.structuredIngredients,
              structuredKeys: updatedProduct.structuredIngredients?.ingredients ? Object.keys(updatedProduct.structuredIngredients.ingredients) : 'none',
              extractionMethod: updatedProduct.extractionMethod,
              extractedDataStructured: !!extractedData.structuredIngredients,
              responseDataStructured: !!responseData.structuredData
            });

            // Recalculate price per unit
            const price = parseFloat(updatedProduct.price) || 0;
            const quantity = parseFloat(updatedProduct.quantity) || 0;

            if (price > 0 && quantity > 0) {
              updatedProduct.pricePerUnit = price / quantity;
            } else {
              updatedProduct.pricePerUnit = null;
            }

            return updatedProduct;
          }
          return product;
        });
        
        // Validate products with enhanced Zod validation before setting state
        const validatedProducts = updatedProducts.map(product => {
          const validationResult = validateSupplementProduct(product);
          if (validationResult.success) {
            console.log(`✅ Product "${product.name}" validated successfully with enhanced rules`);
            return validationResult.data;
          } else {
            console.warn(`⚠️ Product "${product.name}" validation failed:`, validationResult.error);
            
            // Create validation report for debugging
            const report = createValidationReport(product);
            console.warn(`📋 Validation report:`, report);
            
            return product; // Use original if validation fails
          }
        });
        
        setProducts(validatedProducts);
        
        // Update supplement analysis
        console.log('🔍 Updated products for analysis check:', validatedProducts);
        console.log('🔍 Total products:', validatedProducts.length);
        const validProducts = validatedProducts.filter(p => {
          const isValid = p.name && p.name.trim() && p.price && p.price.toString().trim() && p.quantity && p.quantity.toString().trim();
          console.log(`Product "${p.name}": name=${!!p.name}, price=${!!p.price}, quantity=${!!p.quantity}, activeIngredient=${!!p.activeIngredient}, dosagePerUnit=${!!p.dosagePerUnit}, isValid=${isValid}`);
          console.log(`  → Full product data:`, {
            id: p.id,
            name: p.name,
            price: p.price,
            quantity: p.quantity,
            activeIngredient: p.activeIngredient,
            structuredIngredients: !!p.structuredIngredients,
            extractionMethod: p.extractionMethod
          });
          return isValid;
        });
        console.log('🔍 Valid products for analysis:', validProducts.length, 'out of', updatedProducts.length);
        if (validProducts.length > 0) {
          console.log('🧪 Starting supplement analysis...');
          // Debug: Check what's in each product before analysis
          validProducts.forEach((product, index) => {
            console.log(`🔍 Product ${index + 1} data:`, {
              name: product.name,
              hasStructuredIngredients: !!product.structuredIngredients,
              structuredKeys: product.structuredIngredients?.ingredients ? Object.keys(product.structuredIngredients.ingredients) : 'none',
              extractionMethod: product.extractionMethod,
              activeIngredient: product.activeIngredient
            });
          });
          
          const analysis = compareSupplementValue(validProducts);
          console.log('📊 Supplement analysis result:', analysis);
          console.log('📊 Analysis keys:', Object.keys(analysis));
          console.log('📊 Total categories found:', Object.keys(analysis).length);
          setAnalyzedSupplements(analysis);
        } else {
          console.log('❌ No valid products found for analysis');
          setAnalyzedSupplements({});
        }
        
        // Show enhanced success message with database save confirmation
        if (extractedData.savedToDatabase && extractedData.barcode) {
          showToast(`✅ ${extractedData.name} extracted & saved to database! (Barcode: ${extractedData.barcode.substring(0, 12)}...)`, 'success');
        } else {
          showToast(`✅ Product info extracted successfully! Found ${extractedData.name}`, 'success');
        }
      } else {
        // Handle partial extraction from multi-layer system
        if (responseData.extraction_method?.includes('multi-layer') && responseData.partial_data) {
          console.log('⚠️ Partial extraction - some fields missing');
          const partialData = transformMultiLayerData({
            data: responseData.partial_data,
            success: false,
            metadata: responseData.metadata
          });
          
          // Update with partial data
          const updatedProducts = products.map((product) => {
            if (product.id === productId) {
              return {
                ...product,
                name: partialData.name || product.name || "",
                price: partialData.price || product.price || "",
                quantity: partialData.quantity || product.quantity || "",
                unit: partialData.unit || product.unit || "_",
                activeIngredient: partialData.activeIngredient || product.activeIngredient || "",
                dosagePerUnit: partialData.dosagePerUnit || product.dosagePerUnit || "",
                // Mark as partial
                isPartial: true,
                missingFields: responseData.missing_fields || [],
                confidence: partialData.confidence || 30
              };
            }
            return product;
          });
          
          setProducts(updatedProducts);
          showToast(`⚠️ Partial extraction completed. Missing: ${(responseData.missing_fields || []).join(', ')}`, "warning");
        } else {
          console.log('❌ Extraction failed completely');
          console.error('❌ Extraction failed:', extractedData.error);
          showToast(`❌ Could not extract product info: ${extractedData.error}`, 'error');
        }
      }
    } catch (error) {
      console.error('🚨 Network/API Error:', error);
      showToast('❌ Error: Make sure the backend server is running! Run: node server.js', 'error');
    } finally {
      setExtractingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const removeProduct = (id) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const updateProduct = (id, field, value) => {
    const updatedProducts = products.map((product) => {
      if (product.id === id) {
        return { ...product, [field]: value };
      }
      return product;
    });
    
    setProducts(updatedProducts);
    
    // Calculate best value product (lowest price per unit)
    const productsWithPricePerUnit = updatedProducts.filter(p => p.price && p.quantity && p.unit)
      .map(p => ({
        ...p,
        pricePerUnit: parseFloat(p.price) / parseFloat(p.quantity)
      }));
    
    if (productsWithPricePerUnit.length > 0) {
      const bestValue = productsWithPricePerUnit.reduce((best, current) => 
        current.pricePerUnit < best.pricePerUnit ? current : best
      );
      setBestValueProduct(bestValue);
    } else {
      setBestValueProduct(null);
    }
    
    // Update supplement analysis when products change
    const validProducts = updatedProducts.filter(p => p.name && p.price && p.quantity);
    if (validProducts.length > 0) {
      const analysis = compareSupplementValue(validProducts);
      setAnalyzedSupplements(analysis);
    } else {
      setAnalyzedSupplements({});
    }
  };

  // Handle page navigation
  if (currentPage === 'recommendations') {
    return (
      <RecommendationsPage 
        onBack={() => setCurrentPage('scanner')} 
        products={products}
      />
    );
  }

  if (currentPage === 'guide') {
    return (
      <GuidePage 
        onBack={() => setCurrentPage('scanner')} 
      />
    );
  }

  return (
    <>
      {/* Backdrop Overlay */}
      {showMenu && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.2)',
            zIndex: 999,
            transition: 'all 0.3s ease'
          }}
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Modern Navbar */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(13, 17, 28, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(56, 243, 171, 0.1)',
          padding: '1rem 2rem'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div 
              style={{
                background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 50%, #0891b2 100%)',
                borderRadius: '12px',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px'
              }}
            >
              <Bot size={24} color="#0f172a" />
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                SupplementScanner
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
                Quality & Dosage Analyzer
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Menu Dropdown */}
            <div style={{ position: 'relative' }} data-menu>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.3)';
                }}
              >
                <Menu size={16} />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                  overflow: 'hidden',
                  minWidth: '280px',
                  zIndex: 1001
                }}>
                  <button
                    onClick={() => {
                      setCurrentPage('recommendations');
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '1.5rem 2rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#f1f5f9',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.3s ease',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      const button = e.currentTarget;
                      button.style.background = 'rgba(56, 243, 171, 0.1)';
                      // Apply hover color to all text elements
                      const textElements = button.querySelectorAll('div');
                      textElements.forEach(el => el.style.color = '#38f3ab');
                    }}
                    onMouseLeave={(e) => {
                      const button = e.currentTarget;
                      button.style.background = 'transparent';
                      // Reset colors for text elements
                      const textElements = button.querySelectorAll('div');
                      textElements.forEach(el => {
                        if (el.style.fontSize === '0.75rem') {
                          el.style.color = '#94a3b8'; // Secondary text color
                        } else {
                          el.style.color = '#f1f5f9'; // Primary text color
                        }
                      });
                    }}
                  >
                    <Target size={20} />
                    <div>
                      <div style={{ marginBottom: '0.25rem' }}>Supplement Recommendations</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '400' }}>
                        Find supplements for your health goals
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentPage('guide');
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '1.5rem 2rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#f1f5f9',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.3s ease',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      const button = e.currentTarget;
                      button.style.background = 'rgba(56, 243, 171, 0.1)';
                      // Apply hover color to all text elements
                      const textElements = button.querySelectorAll('div');
                      textElements.forEach(el => el.style.color = '#38f3ab');
                    }}
                    onMouseLeave={(e) => {
                      const button = e.currentTarget;
                      button.style.background = 'transparent';
                      // Reset colors for text elements
                      const textElements = button.querySelectorAll('div');
                      textElements.forEach(el => {
                        if (el.style.fontSize === '0.75rem') {
                          el.style.color = '#94a3b8'; // Secondary text color
                        } else {
                          el.style.color = '#f1f5f9'; // Primary text color
                        }
                      });
                    }}
                  >
                    <Bot size={20} />
                    <div>
                      <div style={{ marginBottom: '0.25rem' }}>Guide</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '400' }}>
                        How to use the AI extraction feature
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          minHeight: 'calc(100vh + 100px)', // Account for mobile browser bars
          padding: '1rem',
          paddingTop: '120px',
          paddingBottom: '120px', // Much more bottom padding for mobile
          position: 'relative',
          filter: showMenu ? 'blur(3px)' : 'none',
          transition: 'filter 0.3s ease'
        }}
      >
        {/* Animated Background Elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(56, 243, 171, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(8, 145, 178, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ 
          position: 'relative', 
          zIndex: 1, 
          maxWidth: '1200px', 
          margin: '0 auto',
          width: '100%',
          padding: window.innerWidth < 768 ? '0 1rem' : '0 2rem',
          boxSizing: 'border-box'
        }}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            borderRadius: window.innerWidth < 768 ? '1rem' : '1.5rem',
            padding: window.innerWidth < 768 ? '1rem' : '2rem',
            border: '1px solid rgba(56, 243, 171, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            marginBottom: '2rem'
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <Link size={32} />
              Add Supplement Products
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
              Paste product URLs to extract information and analyze ingredient quality
            </p>
            
            {/* Best Value Quick Access */}
            {bestValueProduct && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
                border: '2px solid rgba(251, 191, 36, 0.4)',
                borderRadius: '16px',
                padding: '1rem',
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ color: '#fbbf24', fontWeight: '700', fontSize: '0.875rem' }}>
                    🏆 BEST VALUE FOUND
                  </div>
                  <div style={{ color: '#f1f5f9', fontSize: '0.875rem' }}>
                    Product #{bestValueProduct.id}: {bestValueProduct.name || 'Unnamed Product'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    {bestValueProduct.pricePerUnit?.toFixed(2)} kr per {bestValueProduct.unit}
                  </div>
                </div>
                {bestValueProduct.url && (
                  <button
                    onClick={() => window.open(bestValueProduct.url, '_blank')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      color: '#0f172a',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🛒 Buy Best Value
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Product Input Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "1.5rem",
              marginBottom: '2rem'
            }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Product Header */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '1.5rem',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div
                    style={{
                      padding: "0.75rem 1.5rem",
                      borderRadius: "50px",
                      background: bestValueProduct?.id === product.id 
                        ? 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)'
                        : 'rgba(102, 126, 234, 0.2)',
                      backdropFilter: 'blur(16px)',
                      border: bestValueProduct?.id === product.id 
                        ? '2px solid #38f3ab'
                        : '1px solid rgba(118, 75, 162, 0.3)',
                      color: bestValueProduct?.id === product.id ? '#0f172a' : '#e0e7ff',
                      fontWeight: '700',
                      fontSize: '1rem'
                    }}
                  >
                    Product #{product.id}
                  </div>
                  {bestValueProduct?.id === product.id && (
                    <div style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "25px",
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      color: '#0f172a',
                      fontWeight: '700',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      🏆 BEST VALUE
                    </div>
                  )}
                </div>

                {/* URL Input */}
                <div style={{ 
                  marginBottom: '1.5rem',
                  background: 'linear-gradient(135deg, rgba(56, 243, 171, 0.1) 0%, rgba(29, 209, 161, 0.1) 100%)',
                  border: '2px solid rgba(56, 243, 171, 0.3)',
                  borderRadius: '16px',
                  padding: '1.5rem'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#38f3ab',
                    marginBottom: '0.75rem'
                  }}>
                    <Bot size={20} style={{ marginRight: '0.5rem' }} />
                    🚀 Paste Product URL
                  </label>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
                    <input
                      type="url"
                      placeholder="https://www.tillskottsbolaget.se/product-name..."
                      value={product.url}
                      onChange={(e) => updateProduct(product.id, "url", e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.875rem',
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: '2px solid rgba(56, 243, 171, 0.3)',
                        borderRadius: '12px',
                        color: '#f1f5f9',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={() => extractProductInfo(product.id, product.url)}
                      disabled={!product.url.trim() || extractingProducts.has(product.id)}
                      style={{
                        padding: "1rem 1.5rem",
                        background: extractingProducts.has(product.id)
                          ? "rgba(156, 163, 175, 0.8)"
                          : "linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)",
                        borderRadius: "12px",
                        border: "none",
                        color: extractingProducts.has(product.id) ? "#6b7280" : "#0f172a",
                        cursor: extractingProducts.has(product.id) ? "not-allowed" : "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {extractingProducts.has(product.id) ? (
                        <>⏳ Extracting...</>
                      ) : (
                        <>
                          <Bot size={18} />
                          Extract
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Product Display */}
                {product.name && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: bestValueProduct?.id === product.id ? '2px solid rgba(56, 243, 171, 0.3)' : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h3 style={{ 
                        color: '#f1f5f9', 
                        fontSize: '1.125rem', 
                        fontWeight: '600',
                        margin: 0,
                        flex: 1
                      }}>
                        {product.name}
                      </h3>
                      {product.url && (
                        <button
                          onClick={() => window.open(product.url, '_blank')}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          🛒 Buy
                        </button>
                      )}
                    </div>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
                      gap: '0.75rem', 
                      fontSize: '0.875rem' 
                    }}>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Product #:</span>
                        <div style={{ color: '#a855f7', fontWeight: '700' }}>#{product.id}</div>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Price:</span>
                        <div style={{ color: '#f1f5f9', fontWeight: '600' }}>{product.price} kr</div>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Quantity:</span>
                        <div style={{ color: '#f1f5f9', fontWeight: '600' }}>{product.quantity} {product.unit}</div>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Active Ingredient:</span>
                        <div style={{ color: '#38f3ab', fontWeight: '600', textTransform: 'capitalize' }}>
                          {product.activeIngredient || 'Detecting...'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Remove Button */}
                {products.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={() => removeProduct(product.id)}
                      style={{
                        padding: "0.75rem 1.5rem",
                        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                      }}
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Product Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={addProduct}
              style={{
                padding: "1rem 2rem",
                background: "linear-gradient(135deg, #38f3ab 0%, #1dd1a1 100%)",
                color: "#0f172a",
                border: "none",
                borderRadius: "16px",
                fontSize: "1rem",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                margin: "0 auto"
              }}
            >
              <Plus size={20} />
              Add Another Product
            </button>
          </div>
        </div>

        {/* Comprehensive Analysis Components */}
        {/* Cost Analysis - Shows price efficiency per nutrient */}
        <NutrientCostAnalysis products={products} />
        
        {/* Quality Analysis - Shows ingredient forms and bioavailability */}
        <IngredientQualityComparison analyzedProducts={analyzedSupplements} />
        </div>
      </div>

      {/* Toast Notifications */}
      <div
        style={{
          position: 'fixed',
          top: window.innerWidth < 768 ? '80px' : '100px',
          right: window.innerWidth < 768 ? '10px' : '20px',
          left: window.innerWidth < 768 ? '10px' : 'auto',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              background: toast.type === 'success' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxWidth: '350px',
              fontSize: '0.875rem',
              fontWeight: '500',
              animation: 'slideIn 0.3s ease-out',
              cursor: 'pointer'
            }}
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Toast Animation Styles */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Cookie Consent Banner */}
      <CookieBanner />
    </>
  );
}
