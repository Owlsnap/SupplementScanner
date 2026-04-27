import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';

// ── Paid single-dive helpers ──────────────────────────────────────────────────
type PaidDive = { slug: string; sessionId: string };
const PAID_DIVES_KEY = 'ss_paid_dives';

function getPaidDives(): PaidDive[] {
  try { return JSON.parse(localStorage.getItem(PAID_DIVES_KEY) || '[]'); } catch { return []; }
}
function savePaidDive(slug: string, sessionId: string) {
  const existing = getPaidDives().filter(d => d.slug !== slug);
  localStorage.setItem(PAID_DIVES_KEY, JSON.stringify([...existing, { slug, sessionId }]));
}
function getSessionIdForSlug(slug: string): string | null {
  return getPaidDives().find(d => d.slug === slug)?.sessionId ?? null;
}
import { DeviceMobile, Robot, LinkSimple, List, Target, Books, Moon, Sun, Sparkle, X, UserCircle, SignOut, User, MagnifyingGlass } from "@phosphor-icons/react";
import { useDarkMode } from '../contexts/DarkModeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AuthModal from './AuthModal';
import CookieBanner from './CookieBanner';
import IngredientQualityComparison from './IngredientQualityComparison';
import LanguageSwitcher from './LanguageSwitcher';
import RecommendationsPage from '../pages/RecommendationsPage';
import MobileAppPage from '../pages/MobileAppPage';
import EncyclopediaPage from '../pages/EncyclopediaPage';
import SupplementInfoPage from '../pages/SupplementInfoPage';
import DeepDivePage from '../pages/DeepDivePage';
import PremiumDeepDivePage from '../pages/PremiumDeepDivePage';
import PremiumPage from '../pages/PremiumPage';
import HealthProfilePage from '../pages/HealthProfilePage';
import StackEvaluationPage from '../pages/StackEvaluationPage';
import { encyclopediaSupplements } from '../data/encyclopediaData';

// Dev bypass: set VITE_DEV_PREMIUM_BYPASS=true in .env.local to skip the paywall
const DEV_PREMIUM_BYPASS = (import.meta as any).env?.VITE_DEV_PREMIUM_BYPASS === 'true';
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

/** Route wrapper: /encyclopedia/:slug */
function SupplementInfoRoute({ onShowPaywall }: { onShowPaywall: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isPremium } = useAuth();
  const supp = encyclopediaSupplements.find(s => s.slug === slug);
  if (!supp) return <Navigate to="/" replace />;

  const hasPaidDive = !!getSessionIdForSlug(supp.slug);
  const canAccess = DEV_PREMIUM_BYPASS || isPremium || hasPaidDive;

  const handleBuyDive = async () => {
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/payment/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplementSlug: supp.slug }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  return (
    <SupplementInfoPage
      slug={supp.slug}
      name={supp.name}
      category={supp.category}
      evidenceTier={supp.evidenceTier}
      tagline={supp.tagline}
      primaryUse={supp.primaryUse}
      overview={supp.overview}
      typicalDose={supp.typicalDose}
      bestFor={supp.bestFor}
      keyFacts={supp.keyFacts}
      commonMistakes={supp.commonMistakes}
      onBack={() => navigate(-1 as any)}
      hasPaidDive={canAccess}
      onBuyDive={handleBuyDive}
      onDeepDive={() => {
        if (canAccess) navigate(`/encyclopedia/${slug}/premium-deep-dive`);
        else onShowPaywall();
      }}
    />
  );
}

/** Route wrapper: /encyclopedia/:slug/deep-dive */
function DeepDiveRoute() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const supp = encyclopediaSupplements.find(s => s.slug === slug);
  if (!supp) return <Navigate to="/" replace />;
  return (
    <DeepDivePage
      slug={supp.slug}
      supplementName={supp.name}
      supplementCategory={supp.category}
      evidenceTier={supp.evidenceTier}
      tagline={supp.tagline}
      onBack={() => navigate(-1 as any)}
      onGoToRecommendations={() => navigate('/recommendations')}
    />
  );
}

/** Route wrapper: /encyclopedia/:slug/premium-deep-dive */
function PremiumDeepDiveRoute() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { session, isPremium } = useAuth();
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(() => getSessionIdForSlug(slug ?? ''));
  const supp = encyclopediaSupplements.find(s => s.slug === slug);

  // Handle redirect back from Stripe after single-dive purchase
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const divePaid = params.get('dive_paid');
    const sessionId = params.get('session_id');
    if (divePaid === '1' && sessionId && slug) {
      window.history.replaceState({}, '', `/encyclopedia/${slug}/premium-deep-dive`);
      fetch(`/api/payment/verify-session?id=${sessionId}`)
        .then(r => r.json())
        .then(data => {
          if (data.paid) {
            savePaidDive(slug, sessionId);
            setStripeSessionId(sessionId);
          }
        })
        .catch(() => {});
    }
  }, [slug]);

  if (!supp) return <Navigate to="/" replace />;

  const authToken = DEV_PREMIUM_BYPASS ? 'dev-bypass' : (session?.access_token ?? '');
  const canAccess = DEV_PREMIUM_BYPASS || isPremium || !!stripeSessionId;

  if (!canAccess) return <Navigate to={`/encyclopedia/${slug}`} replace />;

  return (
    <PremiumDeepDivePage
      slug={supp.slug}
      supplementName={supp.name}
      evidenceTier={supp.evidenceTier}
      tagline={supp.tagline}
      authToken={authToken}
      stripeSessionId={stripeSessionId ?? undefined}
      onBack={() => navigate(-1 as any)}
    />
  );
}

export default function SupplementAnalyzer(): JSX.Element {
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [urlFocused, setUrlFocused] = useState<boolean>(false);
  const [showPaywallModal, setShowPaywallModal] = useState<boolean>(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('[data-menu]')) {
        setShowMenu(false);
      }
      if (showMobileMenu && !event.target.closest('[data-mobile-menu]')) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu, showMobileMenu]);

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

        showToast(t('notifications.extractSuccess', { productName: data.productName }), 'success');
      } else {
        console.error('Extraction failed:', responseData.error);
        showToast(t('notifications.extractError', { error: responseData.error }), 'error');
      }
    } catch (error) {
      console.error('Network/API Error:', error);
      showToast(t('notifications.networkError'), 'error');
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

  const encyclopediaActive = location.pathname === '/' || location.pathname.startsWith('/encyclopedia');

  return (
    <>
      {/* Backdrop Overlay */}
      {(showMenu || showMobileMenu) && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', zIndex: 999 }}
          onClick={() => {
            setShowMenu(false);
            setShowMobileMenu(false);
          }}
        />
      )}

      {/* Navbar — always visible */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-strong)',
        padding: '0.625rem 1.5rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}
          >
            <img src={logoSvg} alt="SupplementScanner" style={{ height: 'clamp(60px, 8vw, 80px)', width: 'auto' }} />
          </button>

          {/* Desktop Tab buttons */}
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'nowrap' }}>
            <button
              onClick={() => { navigate('/'); setShowMenu(false); }}
              onMouseEnter={() => setHoveredNav('encyclopedia')}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 0.875rem', borderRadius: '28px',
                border: encyclopediaActive ? 'none' : '1.5px solid var(--border-strong)',
                background: encyclopediaActive ? '#00685f' : hoveredNav === 'encyclopedia' ? 'var(--bg-hover)' : 'transparent',
                color: encyclopediaActive ? '#ffffff' : hoveredNav === 'encyclopedia' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: "'Inter', sans-serif", fontWeight: 600,
                fontSize: '0.875rem', cursor: 'pointer',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              <Books size={15} />
              <span>{t('nav.index')}</span>
            </button>

            <button
              onClick={() => { navigate('/scanner'); setShowMenu(false); }}
              onMouseEnter={() => setHoveredNav('scanner')}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 0.875rem', borderRadius: '28px',
                border: location.pathname === '/scanner' ? 'none' : '1.5px solid var(--border-strong)',
                background: location.pathname === '/scanner' ? '#00685f' : hoveredNav === 'scanner' ? 'var(--bg-hover)' : 'transparent',
                color: location.pathname === '/scanner' ? '#ffffff' : hoveredNav === 'scanner' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: "'Inter', sans-serif", fontWeight: 600,
                fontSize: '0.875rem', cursor: 'pointer',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              <LinkSimple size={15} />
              <span>{t('nav.urlScanner')}</span>
              <span style={{
                background: location.pathname === '/scanner' ? 'rgba(255,255,255,0.2)' : 'rgba(245,158,11,0.15)',
                color: location.pathname === '/scanner' ? '#ffffff' : '#b45309',
                border: `1px solid ${location.pathname === '/scanner' ? 'rgba(255,255,255,0.3)' : 'rgba(180,83,9,0.25)'}`,
                fontSize: '0.5625rem', fontWeight: 800,
                padding: '0.125rem 0.375rem', borderRadius: '999px',
                letterSpacing: '0.5px', lineHeight: 1,
                fontFamily: "'Inter', sans-serif",
              }}>
                {t('common.beta')}
              </span>
            </button>

            <button
              onClick={() => { navigate('/recommendations'); setShowMenu(false); }}
              onMouseEnter={() => setHoveredNav('recommendations')}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 0.875rem', borderRadius: '28px',
                border: location.pathname === '/recommendations' ? 'none' : '1.5px solid var(--border-strong)',
                background: location.pathname === '/recommendations' ? '#00685f' : hoveredNav === 'recommendations' ? 'var(--bg-hover)' : 'transparent',
                color: location.pathname === '/recommendations' ? '#ffffff' : hoveredNav === 'recommendations' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: "'Inter', sans-serif", fontWeight: 600,
                fontSize: '0.875rem', cursor: 'pointer',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              <Target size={15} />
              <span>{t('nav.goals')}</span>
            </button>

            <button
              onClick={() => { navigate('/premium'); setShowMenu(false); }}
              onMouseEnter={() => setHoveredNav('premium')}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 0.875rem', borderRadius: '28px',
                border: location.pathname === '/premium' ? 'none' : '1.5px solid #00685f',
                background: location.pathname === '/premium' ? '#00685f' : hoveredNav === 'premium' ? 'rgba(0,104,95,0.1)' : 'transparent',
                color: location.pathname === '/premium' ? '#ffffff' : '#00685f',
                fontFamily: "'Inter', sans-serif", fontWeight: 600,
                fontSize: '0.875rem', cursor: 'pointer',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              <Sparkle size={14} weight="fill" />
              <span>{t('nav.premium')}</span>
            </button>

            {/* Auth button */}
            {user ? (
              <div style={{ position: 'relative', marginLeft: '0.25rem' }}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  title={user.email ?? 'Account'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.375rem 0.75rem 0.375rem 0.5rem',
                    borderRadius: '999px',
                    border: '1.5px solid var(--border-strong)', background: 'transparent',
                    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00685f'; (e.currentTarget as HTMLButtonElement).style.color = '#00685f'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                >
                  <UserCircle size={18} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.8125rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email?.split('@')[0]}
                  </span>
                </button>
                {showUserMenu && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowUserMenu(false)} />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      borderRadius: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      minWidth: '180px', zIndex: 999, overflow: 'hidden',
                    }}>
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{t('common.signedInAs')}</div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                      </div>
                      <button
                        onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                        style={{
                          width: '100%', padding: '0.75rem 1rem',
                          background: 'transparent', border: 'none',
                          color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif",
                          fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <User size={16} color="var(--text-secondary)" />
                        {t('nav.myProfile')}
                      </button>
                      <button
                        onClick={() => { signOut(); setShowUserMenu(false); }}
                        style={{
                          width: '100%', padding: '0.75rem 1rem',
                          background: 'transparent', border: 'none',
                          color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif",
                          fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          textAlign: 'left', borderTop: '1px solid var(--border)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <SignOut size={16} color="var(--text-secondary)" />
                        {t('nav.signOut')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 0.875rem', borderRadius: '28px',
                  border: '1.5px solid var(--border-strong)', background: 'transparent',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif", fontWeight: 600,
                  fontSize: '0.875rem', transition: 'all 0.15s ease', marginLeft: '0.25rem',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00685f'; (e.currentTarget as HTMLButtonElement).style.color = '#00685f'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
              >
                <UserCircle size={16} />
                {t('nav.signIn')}
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              title={isDark ? t('tooltips.switchToLight') : t('tooltips.switchToDark')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '999px',
                border: '1.5px solid var(--border-strong)', background: 'transparent',
                color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease',
                marginLeft: '0.25rem',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00685f'; (e.currentTarget as HTMLButtonElement).style.color = '#00685f'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Mobile hamburger menu */}
            <div className="mobile-nav" style={{ display: 'none', position: 'relative', marginLeft: '0.25rem' }} data-mobile-menu>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', borderRadius: '999px',
                  border: '1.5px solid var(--border-strong)', background: 'transparent',
                  color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00685f'; (e.currentTarget as HTMLButtonElement).style.color = '#00685f'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
              >
                <List size={16} />
              </button>
              {showMobileMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden', minWidth: '200px', zIndex: 1001,
                }}>
                  <button
                    onClick={() => { navigate('/'); setShowMobileMenu(false); }}
                    style={{
                      width: '100%', padding: '1rem 1.25rem',
                      background: encyclopediaActive ? 'var(--primary-light)' : 'transparent', 
                      border: 'none', color: encyclopediaActive ? '#00685f' : 'var(--text-primary)',
                      fontSize: '0.9375rem', fontFamily: "'Inter', sans-serif",
                      fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      textAlign: 'left', transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!encyclopediaActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!encyclopediaActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <Books size={18} color={encyclopediaActive ? '#00685f' : 'var(--text-secondary)'} />
                    Index
                  </button>
                  <button
                    onClick={() => { navigate('/scanner'); setShowMobileMenu(false); }}
                    style={{
                      width: '100%', padding: '1rem 1.25rem',
                      background: location.pathname === '/scanner' ? 'var(--primary-light)' : 'transparent', 
                      border: 'none', color: location.pathname === '/scanner' ? '#00685f' : 'var(--text-primary)',
                      fontSize: '0.9375rem', fontFamily: "'Inter', sans-serif",
                      fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      textAlign: 'left', transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { if (location.pathname !== '/scanner') (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (location.pathname !== '/scanner') (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <LinkSimple size={18} color={location.pathname === '/scanner' ? '#00685f' : 'var(--text-secondary)'} />
                    <div>
                      <div>URL Scanner</div>
                      <span style={{
                        background: 'rgba(245,158,11,0.15)', color: '#b45309',
                        border: '1px solid rgba(180,83,9,0.25)',
                        fontSize: '0.5rem', fontWeight: 800,
                        padding: '0.125rem 0.375rem', borderRadius: '999px',
                        letterSpacing: '0.5px', lineHeight: 1, marginTop: '0.125rem',
                        fontFamily: "'Inter', sans-serif", display: 'inline-block'
                      }}>BETA</span>
                    </div>
                  </button>
                  <button
                    onClick={() => { navigate('/recommendations'); setShowMobileMenu(false); }}
                    style={{
                      width: '100%', padding: '1rem 1.25rem',
                      background: location.pathname === '/recommendations' ? 'var(--primary-light)' : 'transparent', 
                      border: 'none', color: location.pathname === '/recommendations' ? '#00685f' : 'var(--text-primary)',
                      fontSize: '0.9375rem', fontFamily: "'Inter', sans-serif",
                      fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      textAlign: 'left', transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { if (location.pathname !== '/recommendations') (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (location.pathname !== '/recommendations') (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <Target size={18} color={location.pathname === '/recommendations' ? '#00685f' : 'var(--text-secondary)'} />
                    Goals
                  </button>
                  <button
                    onClick={() => { navigate('/premium'); setShowMobileMenu(false); }}
                    style={{
                      width: '100%', padding: '1rem 1.25rem',
                      background: location.pathname === '/premium' ? 'var(--primary-light)' : 'transparent', 
                      border: 'none', color: location.pathname === '/premium' ? '#00685f' : 'var(--text-primary)',
                      fontSize: '0.9375rem', fontFamily: "'Inter', sans-serif",
                      fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      textAlign: 'left', transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { if (location.pathname !== '/premium') (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (location.pathname !== '/premium') (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <Sparkle size={18} weight="fill" color={location.pathname === '/premium' ? '#00685f' : 'var(--text-secondary)'} />
                    Premium
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />
                  <button
                    onClick={() => { navigate('/app'); setShowMobileMenu(false); }}
                    style={{
                      width: '100%', padding: '1rem 1.25rem',
                      background: 'transparent', border: 'none', color: 'var(--text-primary)',
                      fontSize: '0.9375rem', fontFamily: "'Inter', sans-serif",
                      fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      textAlign: 'left', transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <DeviceMobile size={18} color="var(--text-secondary)" />
                    Mobile App
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Guide — menu icon */}
            <div className="desktop-nav" style={{ position: 'relative', marginLeft: '0.25rem' }} data-menu>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', borderRadius: '999px',
                  border: '1.5px solid var(--border-strong)', background: 'transparent',
                  color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00685f'; (e.currentTarget as HTMLButtonElement).style.color = '#00685f'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
              >
                <List size={16} />
              </button>
              {showMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden', minWidth: '220px', zIndex: 1001,
                }}>
                  <button
                    onClick={() => { navigate('/app'); setShowMenu(false); }}
                    style={{
                      width: '100%', padding: '1rem 1.25rem',
                      background: 'transparent', border: 'none', color: 'var(--text-primary)',
                      fontSize: '0.9375rem', fontFamily: "'Inter', sans-serif",
                      fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      textAlign: 'left', transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <DeviceMobile size={18} color="var(--text-secondary)" />
                    <div>
                      <div>{t('nav.mobileApp')}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400, marginTop: '0.125rem' }}>
                        {t('nav.mobileAppSubtitle')}
                      </div>
                    </div>
                  </button>
                  <LanguageSwitcher onLanguageChange={() => setShowMenu(false)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Page content — routed below fixed navbar */}
      <Routes>
        <Route path="/" element={<EncyclopediaPage onOpenInfo={(slug: string) => navigate(`/encyclopedia/${slug}`)} />} />
        <Route path="/encyclopedia/:slug" element={<SupplementInfoRoute onShowPaywall={() => setShowPaywallModal(true)} />} />
        <Route path="/encyclopedia/:slug/deep-dive" element={<DeepDiveRoute />} />
        <Route path="/encyclopedia/:slug/premium-deep-dive" element={<PremiumDeepDiveRoute />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/app" element={<MobileAppPage onBack={() => navigate(-1 as any)} />} />
        <Route path="/premium" element={<PremiumPage onBack={() => navigate(-1 as any)} onOpenAuthModal={() => setShowAuthModal(true)} />} />
        <Route path="/profile" element={<HealthProfilePage onBack={() => navigate(-1 as any)} onSignIn={() => setShowAuthModal(true)} />} />
        <Route path="/stack-evaluation" element={<StackEvaluationPage />} />
        <Route path="/scanner" element={(() => {
          const product = products[0];
          const isExtracting = extractingProducts.has(product.id);
          return (
          <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>

          {/* Hero with embedded URL input */}
          <div className="hero-section" style={{
            background: 'linear-gradient(135deg, #00685f 0%, #3f6560 100%)',
            padding: 'calc(100px + 2.5rem) 1.5rem 3rem',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: '-3rem', top: '-3rem', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: '-2rem', bottom: '-2rem', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

            <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
              {/* Icon + title */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(255,255,255,0.15)', borderRadius: '999px',
                padding: '0.375rem 1rem', marginBottom: '1.25rem',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <LinkSimple size={14} color="#ffffff" />
                <span style={{ color: '#ffffff', fontSize: '0.8125rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{t('nav.urlScanner')}</span>
                <span style={{
                  background: 'rgba(255,255,255,0.2)', color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.35)',
                  fontSize: '0.5625rem', fontWeight: 800,
                  padding: '0.125rem 0.4rem', borderRadius: '999px',
                  letterSpacing: '0.5px', lineHeight: 1,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {t('common.beta')}
                </span>
              </div>

              <h1 style={{
                fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
                color: '#ffffff', margin: '0 0 0.625rem', letterSpacing: '-0.5px',
                lineHeight: 1.2,
              }}>
                {t('urlScanner.title')}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', margin: '0 0 2rem', fontFamily: "'Inter', sans-serif" }}>
                {t('urlScanner.subtitle')}
              </p>

              {/* URL input bar */}
              <div style={{
                background: 'var(--bg-surface)', borderRadius: '16px',
                padding: '0.5rem 0.5rem 0.5rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: urlFocused
                  ? `0 8px 32px rgba(0,0,0,0.15), 0 0 0 2px ${isDark ? 'rgba(255,255,255,0.15)' : '#00685f'}`
                  : '0 8px 32px rgba(0,0,0,0.15)',
                transition: 'box-shadow 0.15s ease',
              }}>
                <LinkSimple size={18} color="#6d7a77" style={{ flexShrink: 0 }} />
                <input
                  type="url"
                  placeholder={t('urlScanner.placeholder')}
                  value={product.url}
                  onChange={(e) => updateProduct(product.id, "url", e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && product.url.trim() && !isExtracting) extractProductInfo(product.id, product.url); }}
                  onFocus={() => setUrlFocused(true)}
                  onBlur={() => setUrlFocused(false)}
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    fontSize: '0.9375rem', color: 'var(--text-primary)',
                    background: 'transparent', fontFamily: "'Inter', sans-serif",
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={() => extractProductInfo(product.id, product.url)}
                  disabled={!product.url.trim() || isExtracting}
                  style={{
                    padding: '0.75rem 1.375rem',
                    background: isExtracting ? '#bcc9c6' : '#00685f',
                    borderRadius: '12px', border: 'none',
                    color: '#ffffff',
                    cursor: isExtracting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9375rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif",
                    transition: 'background 0.15s ease', flexShrink: 0,
                  }}
                >
                  <Robot size={17} />
                  {isExtracting ? t('common.extracting') : t('common.extract')}
                </button>
              </div>

              {/* Hint row */}
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0.75rem 0 0', fontFamily: "'Inter', sans-serif" }}>
                {t('urlScanner.hint')}
              </p>
            </div>
          </div>

          {/* Body */}
          <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem 4rem', boxSizing: 'border-box' }}>

            {/* Extracting skeleton */}
            {isExtracting && (
              <div style={{
                background: 'var(--bg-surface)', borderRadius: '20px',
                border: '1.5px solid var(--border)', padding: '2rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Robot size={22} color="#00685f" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {t('urlScanner.aiReading')}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: "'Inter', sans-serif" }}>
                    {t('urlScanner.aiReadingSubtitle')}
                  </div>
                </div>
                <style>{`
                  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                  .skeleton { background: linear-gradient(90deg, var(--border) 25%, var(--bg-page) 50%, var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
                  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                `}</style>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="skeleton" style={{ height: '18px', width: '60%' }} />
                  <div className="skeleton" style={{ height: '14px', width: '40%' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <div className="skeleton" style={{ height: '52px' }} />
                    <div className="skeleton" style={{ height: '52px' }} />
                    <div className="skeleton" style={{ height: '52px' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Result card */}
            {product.name && !isExtracting && (
              <div style={{
                background: 'var(--bg-surface)', borderRadius: '20px',
                border: '1.5px solid var(--border)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                overflow: 'hidden', marginBottom: '1.5rem',
              }}>
                {/* Card header */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {(product.category || product.subCategory) && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: 'var(--primary-light)', borderRadius: '999px',
                        padding: '0.25rem 0.75rem', marginBottom: '0.625rem',
                        border: '1px solid var(--primary-border)',
                      }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.75rem', color: '#00685f', textTransform: 'capitalize' }}>
                          {product.subCategory || product.category}
                        </span>
                      </div>
                    )}
                    <h2 style={{
                      fontFamily: "'Manrope', sans-serif", fontWeight: 800,
                      fontSize: 'clamp(1.125rem, 2.5vw, 1.375rem)',
                      color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px',
                      lineHeight: 1.3,
                    }}>
                      {product.name}
                    </h2>
                  </div>
                  <button
                    onClick={() => window.open(product.url, '_blank')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--bg-subtle)', color: '#00685f',
                      border: '1.5px solid var(--border-strong)',
                      borderRadius: '999px', fontSize: '0.8125rem',
                      fontWeight: 700, cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                  >
                    <LinkSimple size={13} />
                    {t('common.viewPage')}
                  </button>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '0' }}>
                  {[
                    { label: t('urlScanner.servings'), value: product.quantity ? `${product.quantity} ${product.unit || ''}`.trim() : '—' },
                    { label: t('urlScanner.servingSize'), value: product.servingSize || '—' },
                    { label: t('urlScanner.keyIngredient'), value: product.activeIngredient || t('urlScanner.detecting'), highlight: true },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      padding: '1rem 1.25rem',
                      borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                      background: stat.highlight ? 'var(--primary-light)' : 'var(--bg-surface)',
                    }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {stat.label}
                      </div>
                      <div style={{
                        color: stat.highlight ? '#00685f' : 'var(--text-primary)',
                        fontWeight: 800, fontSize: '0.9375rem',
                        textTransform: 'capitalize',
                        fontFamily: "'Manrope', sans-serif",
                        lineHeight: 1.3,
                      }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Extraction method footer */}
                {product.extractionMethod && (
                  <div style={{
                    padding: '0.625rem 1.25rem',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--bg-subtle)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <Robot size={13} color="var(--text-secondary)" />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: "'Inter', sans-serif" }}>
                      {t('urlScanner.extractedVia')} {product.extractionMethod}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!product.name && !isExtracting && (
              <div style={{
                textAlign: 'center', padding: '3rem 1.5rem',
                color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif",
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}>
                  <LinkSimple size={24} color="#00685f" />
                </div>
                <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  {t('urlScanner.noProductYet')}
                </div>
                <div style={{ fontSize: '0.875rem' }}>{t('urlScanner.noProductHint')}</div>
              </div>
            )}

            {/* Quality Analysis */}
            <IngredientQualityComparison analyzedProducts={analyzedSupplements} />
          </div>
        </div>
          );
        })()} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Paywall modal */}
      {showPaywallModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
        }}
          onClick={() => setShowPaywallModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-surface)', borderRadius: '24px',
              padding: '2rem', maxWidth: '420px', width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPaywallModal(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'var(--bg-hover)', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={16} />
            </button>

            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: '#e6f4f1', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '1.25rem',
            }}>
              <Sparkle size={24} weight="fill" color="#00685f" />
            </div>

            <h3 style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 800,
              fontSize: '1.25rem', color: 'var(--text-primary)',
              margin: '0 0 0.5rem', letterSpacing: '-0.3px',
            }}>
              {t('premium.deepDivesArePremium')}
            </h3>
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: '0.9rem',
              color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 1.5rem',
            }}>
              {t('premium.premiumDescription')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <button
                onClick={() => {
                  setShowPaywallModal(false);
                  if (user) navigate('/premium');
                  else setShowAuthModal(true);
                }}
                style={{
                  background: '#00685f', color: '#ffffff',
                  border: 'none', borderRadius: '28px',
                  padding: '0.75rem 1.25rem',
                  fontFamily: "'Inter', sans-serif", fontWeight: 600,
                  fontSize: '0.9375rem', cursor: 'pointer', width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                }}
              >
                <Sparkle size={15} weight="fill" />
                {user ? t('supplementInfo.unlockWithPremium') : t('premium.signInToUnlock')}
              </button>
              <button
                onClick={() => setShowPaywallModal(false)}
                style={{
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '1.5px solid var(--border-strong)', borderRadius: '28px',
                  padding: '0.75rem 1.25rem',
                  fontFamily: "'Inter', sans-serif", fontWeight: 600,
                  fontSize: '0.9375rem', cursor: 'pointer', width: '100%',
                }}
              >
                {t('common.mayBeLater')}
              </button>
            </div>
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

      {/* Auth Modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Cookie Consent Banner */}
      <CookieBanner />
    </>
  );
}
