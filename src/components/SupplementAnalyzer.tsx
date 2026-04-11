import React, { useState, useEffect } from "react";
import { Robot, Plus, LinkSimple, Trash, List, Target, BookOpen, Books } from "@phosphor-icons/react";
import CookieBanner from './CookieBanner';
import IngredientQualityComparison from './IngredientQualityComparison';
import RecommendationsPage from '../pages/RecommendationsPage';
import GuidePage from '../pages/GuidePage';
import EncyclopediaPage from '../pages/EncyclopediaPage';
import SupplementInfoPage from '../pages/SupplementInfoPage';
import DeepDivePage from '../pages/DeepDivePage';
import { encyclopediaSupplements } from '../data/encyclopediaData';
import logoSvg from '../assets/supplement-scanner-logo.svg';
import type { EncyclopedialSupplement } from '../data/encyclopediaData';
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
  const [currentPage, setCurrentPage] = useState<string>('encyclopedia');
  const [showMenu, setShowMenu] = useState<boolean>(false);

  useEffect(() => { window.scrollTo(0, 0); }, [currentPage]);
  const [deepDiveSlug, setDeepDiveSlug] = useState<string | null>(null);
  const [deepDiveSupp, setDeepDiveSupp] = useState<EncyclopedialSupplement | null>(null);
  const [infoSupp, setInfoSupp] = useState<EncyclopedialSupplement | null>(null);

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

    try {
      // Call backend API (local dev or production)
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

      const response = await fetch(
        `${apiUrl}/api/ingest/url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );

      const responseData = await response.json();

      console.log('🔍 /api/ingest/url response:', {
        success: responseData.success,
        hasData: !!responseData.data,
        hasQualityAnalysis: !!responseData.qualityAnalysis,
        dataKeys: responseData.data ? Object.keys(responseData.data) : null
      });

      if (responseData.success && responseData.data) {
        const data = responseData.data;

        // Map ingest/url response to product state structure
        const updatedProducts = products.map((product) => {
          if (product.id === productId) {
            const updatedProduct = {
              ...product,
              name: data.productName || "",
              quantity: data.servingsPerContainer || "",
              unit: data.form || "servings",
              activeIngredient: (data.ingredients || []).map(i => i.name).join(', ') || data.subCategory || "",
              dosagePerUnit: data.ingredients?.[0]?.dosage || "",
              servingSize: data.servingSize?.amount || "",
              servingsPerContainer: data.servingsPerContainer || "",
              // Pass through quality analysis data (including protein quality)
              qualityAnalysis: responseData.qualityAnalysis || null,
              proteinQuality: responseData.qualityAnalysis?.proteinQuality || data.quality?.proteinQuality || null,
              // Category info
              category: data.category || null,
              subCategory: data.subCategory || null,
              // Ingredient list text for protein products
              ingredientListText: data.ingredientListText || null,
              // Extraction metadata
              extractionMethod: responseData.extraction?.method || 'enhanced_claude',
              confidence: responseData.extraction?.completeness || null,
            };

            console.log('💾 Updated product from /api/ingest/url:', {
              name: updatedProduct.name,
              category: updatedProduct.category,
              subCategory: updatedProduct.subCategory,
              hasProteinQuality: !!updatedProduct.proteinQuality,
              proteinScore: updatedProduct.proteinQuality?.score,
              ingredientCount: data.ingredients?.length
            });

            return updatedProduct;
          }
          return product;
        });

        setProducts(updatedProducts);

        // Update supplement analysis
        const validProducts = updatedProducts.filter(p => p.name && p.name.trim());
        if (validProducts.length > 0) {
          const grouped: Record<string, Product[]> = {};
          validProducts.forEach(p => {
            // Use subCategory for grouping if available, otherwise fall back to activeIngredient/name
            const key = p.subCategory || p.activeIngredient || p.name || 'other';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
          });
          setAnalyzedSupplements(grouped);
        } else {
          setAnalyzedSupplements({});
        }

        showToast(`Product info extracted successfully! Found ${data.productName}`, 'success');
      } else {
        console.error('Extraction failed:', responseData.error);
        showToast(`Could not extract product info: ${responseData.error}`, 'error');
      }
    } catch (error) {
      console.error('Network/API Error:', error);
      showToast('Error: Make sure the backend server is running! Run: node server.js', 'error');
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

    // Update supplement analysis when products change
    const validProducts = updatedProducts.filter(p => p.name && p.quantity);
    if (validProducts.length > 0) {
      const grouped: Record<string, Product[]> = {};
      validProducts.forEach(p => {
        const key = p.activeIngredient || p.name || 'other';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
      });
      setAnalyzedSupplements(grouped);
    } else {
      setAnalyzedSupplements({});
    }
  };

  const encyclopediaActive = currentPage === 'encyclopedia' || currentPage === 'suppinfo' || currentPage === 'deepdive';

  return (
    <>
      {/* Backdrop Overlay */}
      {showMenu && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', zIndex: 999 }}
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Navbar — always visible */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: '#ffffff', borderBottom: '1px solid #bcc9c6',
        padding: '0.625rem 1.5rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Logo */}
          <button
            onClick={() => setCurrentPage('encyclopedia')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}
          >
            <img src={logoSvg} alt="SupplementScanner" style={{ height: '80px', width: 'auto' }} />
          </button>

          {/* Tab buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'nowrap' }}>
            <button
              onClick={() => { setCurrentPage('encyclopedia'); setShowMenu(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 0.875rem', borderRadius: '28px',
                border: encyclopediaActive ? 'none' : '1.5px solid #bcc9c6',
                background: encyclopediaActive ? '#00685f' : 'transparent',
                color: encyclopediaActive ? '#ffffff' : '#6d7a77',
                fontFamily: "'Inter', sans-serif", fontWeight: 600,
                fontSize: '0.875rem', cursor: 'pointer',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              <Books size={15} />
              <span>Encyclopedia</span>
            </button>

            <button
              onClick={() => { setCurrentPage('scanner'); setShowMenu(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 0.875rem', borderRadius: '28px',
                border: currentPage === 'scanner' ? 'none' : '1.5px solid #bcc9c6',
                background: currentPage === 'scanner' ? '#00685f' : 'transparent',
                color: currentPage === 'scanner' ? '#ffffff' : '#6d7a77',
                fontFamily: "'Inter', sans-serif", fontWeight: 600,
                fontSize: '0.875rem', cursor: 'pointer',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              <LinkSimple size={15} />
              <span>URL Scanner</span>
            </button>

            <button
              onClick={() => { setCurrentPage('recommendations'); setShowMenu(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 0.875rem', borderRadius: '28px',
                border: currentPage === 'recommendations' ? 'none' : '1.5px solid #bcc9c6',
                background: currentPage === 'recommendations' ? '#00685f' : 'transparent',
                color: currentPage === 'recommendations' ? '#ffffff' : '#6d7a77',
                fontFamily: "'Inter', sans-serif", fontWeight: 600,
                fontSize: '0.875rem', cursor: 'pointer',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              <Target size={15} />
              <span>Goals</span>
            </button>

            {/* Guide — menu icon */}
            <div style={{ position: 'relative', marginLeft: '0.25rem' }} data-menu>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', borderRadius: '999px',
                  border: '1.5px solid #bcc9c6', background: 'transparent',
                  color: '#6d7a77', cursor: 'pointer', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00685f'; (e.currentTarget as HTMLButtonElement).style.color = '#00685f'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#bcc9c6'; (e.currentTarget as HTMLButtonElement).style.color = '#6d7a77'; }}
              >
                <List size={16} />
              </button>
              {showMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                  background: '#ffffff', border: '1px solid #e4e9e7',
                  borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden', minWidth: '220px', zIndex: 1001,
                }}>
                  <button
                    onClick={() => { setCurrentPage('guide'); setShowMenu(false); }}
                    style={{
                      width: '100%', padding: '1rem 1.25rem',
                      background: 'transparent', border: 'none', color: '#171d1c',
                      fontSize: '0.9375rem', fontFamily: "'Inter', sans-serif",
                      fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      textAlign: 'left', transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f0f5f2'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <Robot size={18} color="#6d7a77" />
                    <div>
                      <div>Guide</div>
                      <div style={{ fontSize: '0.75rem', color: '#6d7a77', fontWeight: 400, marginTop: '0.125rem' }}>
                        How to use AI extraction
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Page content — conditionally rendered below fixed navbar */}
      {currentPage === 'encyclopedia' && (
        <EncyclopediaPage
          onOpenInfo={(slug: string) => {
            const supp = encyclopediaSupplements.find(s => s.slug === slug) ?? null;
            setInfoSupp(supp);
            setCurrentPage('suppinfo');
          }}
        />
      )}

      {currentPage === 'suppinfo' && infoSupp && (
        <SupplementInfoPage
          slug={infoSupp.slug}
          name={infoSupp.name}
          category={infoSupp.category}
          evidenceTier={infoSupp.evidenceTier}
          tagline={infoSupp.tagline}
          primaryUse={infoSupp.primaryUse}
          typicalDose={infoSupp.typicalDose}
          bestFor={infoSupp.bestFor}
          keyFacts={infoSupp.keyFacts}
          onBack={() => { setCurrentPage('encyclopedia'); setInfoSupp(null); }}
          onDeepDive={() => { setDeepDiveSlug(infoSupp.slug); setDeepDiveSupp(infoSupp); setCurrentPage('deepdive'); }}
        />
      )}

      {currentPage === 'deepdive' && deepDiveSlug && deepDiveSupp && (
        <DeepDivePage
          slug={deepDiveSlug}
          supplementName={deepDiveSupp.name}
          supplementCategory={deepDiveSupp.category}
          evidenceTier={deepDiveSupp.evidenceTier}
          tagline={deepDiveSupp.tagline}
          onBack={() => { setCurrentPage('suppinfo'); setDeepDiveSlug(null); }}
          onGoToRecommendations={() => { setDeepDiveSlug(null); setDeepDiveSupp(null); setCurrentPage('recommendations'); }}
        />
      )}

      {currentPage === 'recommendations' && (
        <RecommendationsPage onBack={() => setCurrentPage('scanner')} products={products} />
      )}

      {currentPage === 'guide' && (
        <GuidePage onBack={() => setCurrentPage('scanner')} />
      )}

      {/* Scanner page */}
      {currentPage === 'scanner' && (
      <div style={{ background: '#f5faf8', minHeight: '100vh' }}>
        {/* Page hero — top padding accounts for fixed navbar */}
        <div style={{
          background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
          padding: 'calc(100px + 2rem) 1.5rem 2.25rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: '-2rem', top: '-2rem', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(1.375rem, 3vw, 1.875rem)',
              color: '#ffffff',
              margin: '0 0 0.375rem',
              letterSpacing: '-0.4px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
            }}>
              <LinkSimple size={24} />
              URL Scanner
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>
              Paste a product URL to extract supplement info and analyze ingredient quality
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.75rem 1.5rem 4rem', boxSizing: 'border-box' }}>
          {/* Product Input Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  border: '1.5px solid #e4e9e7',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                {/* Product label */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: '#e6f4f1', borderRadius: '999px',
                  padding: '0.3125rem 0.875rem', marginBottom: '1.25rem',
                  border: '1px solid #6bd8cb',
                }}>
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontWeight: 700,
                    fontSize: '0.8125rem', color: '#00685f',
                  }}>
                    Product #{product.id}
                  </span>
                </div>

                {/* URL Input */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    fontSize: '0.875rem', fontWeight: 600,
                    color: '#3d4947', marginBottom: '0.625rem',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    <Bot size={16} color="#00685f" />
                    Product URL
                  </label>
                  <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                    <input
                      type="url"
                      placeholder="https://www.tillskottsbolaget.se/..."
                      value={product.url}
                      onChange={(e) => updateProduct(product.id, "url", e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.8125rem 1rem',
                        background: '#f5faf8',
                        border: '1.5px solid #bcc9c6',
                        borderRadius: '12px',
                        color: '#171d1c',
                        fontSize: '0.875rem',
                        outline: 'none',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'border-color 0.15s ease',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#00685f'; }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#bcc9c6'; }}
                    />
                    <button
                      onClick={() => extractProductInfo(product.id, product.url)}
                      disabled={!product.url.trim() || extractingProducts.has(product.id)}
                      style={{
                        padding: '0.8125rem 1.25rem',
                        background: extractingProducts.has(product.id) ? '#bcc9c6' : '#00685f',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#ffffff',
                        cursor: extractingProducts.has(product.id) ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        whiteSpace: 'nowrap',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'background 0.15s ease',
                        flexShrink: 0,
                      }}
                    >
                      {extractingProducts.has(product.id) ? (
                        <>Extracting…</>
                      ) : (
                        <>
                          <Robot size={16} />
                          Extract
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Product result */}
                {product.name && (
                  <div style={{
                    background: '#f5faf8',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid #e4e9e7',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.75rem' }}>
                      <h3 style={{
                        fontFamily: "'Manrope', sans-serif",
                        color: '#171d1c', fontSize: '1rem',
                        fontWeight: 800, margin: 0, flex: 1,
                        letterSpacing: '-0.2px',
                      }}>
                        {product.name}
                      </h3>
                      {product.url && (
                        <button
                          onClick={() => window.open(product.url, '_blank')}
                          style={{
                            padding: '0.375rem 0.875rem',
                            background: '#e6f4f1', color: '#00685f',
                            border: '1px solid #6bd8cb',
                            borderRadius: '999px', fontSize: '0.75rem',
                            fontWeight: 600, cursor: 'pointer',
                            fontFamily: "'Inter', sans-serif",
                            flexShrink: 0,
                          }}
                        >
                          View ↗
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8125rem' }}>
                      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '0.625rem 0.75rem', border: '1px solid #e4e9e7' }}>
                        <div style={{ color: '#6d7a77', marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif" }}>Quantity</div>
                        <div style={{ color: '#171d1c', fontWeight: 700, fontFamily: "'Manrope', sans-serif" }}>{product.quantity} {product.unit}</div>
                      </div>
                      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '0.625rem 0.75rem', border: '1px solid #e4e9e7' }}>
                        <div style={{ color: '#6d7a77', marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif" }}>Serving</div>
                        <div style={{ color: '#171d1c', fontWeight: 700, fontFamily: "'Manrope', sans-serif" }}>{product.servingSize || '—'}</div>
                      </div>
                      <div style={{ background: '#e6f4f1', borderRadius: '8px', padding: '0.625rem 0.75rem', border: '1px solid #6bd8cb' }}>
                        <div style={{ color: '#3f6560', marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif" }}>Key ingredient</div>
                        <div style={{ color: '#00685f', fontWeight: 700, textTransform: 'capitalize', fontFamily: "'Manrope', sans-serif" }}>
                          {product.activeIngredient || 'Detecting…'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Remove */}
                {products.length > 1 && (
                  <button
                    onClick={() => removeProduct(product.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'transparent',
                      color: '#ba1a1a',
                      border: '1.5px solid #f9b4b4',
                      borderRadius: '999px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <Trash size={14} />
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Product Button */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <button
              onClick={addProduct}
              style={{
                padding: '0.8125rem 1.75rem',
                background: '#ffffff',
                color: '#00685f',
                border: '1.5px solid #00685f',
                borderRadius: '28px',
                fontSize: '0.9375rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#00685f'; (e.currentTarget as HTMLButtonElement).style.color = '#ffffff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; (e.currentTarget as HTMLButtonElement).style.color = '#00685f'; }}
            >
              <Plus size={18} />
              Add Another Product
            </button>
          </div>

          {/* Quality Analysis */}
          <IngredientQualityComparison analyzedProducts={analyzedSupplements} />
        </div>
      </div>
      )}

      {/* Toast Notifications */}
      <div style={{
        position: 'fixed', top: '80px', right: '20px',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            style={{
              background: toast.type === 'success' ? '#00685f' : '#ba1a1a',
              color: '#ffffff',
              padding: '0.75rem 1.125rem',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              maxWidth: '340px',
              fontSize: '0.875rem',
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              animation: 'slideIn 0.25s ease-out',
              cursor: 'pointer',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Cookie Consent Banner */}
      <CookieBanner />
    </>
  );
}
