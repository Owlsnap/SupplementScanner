// app/product/[barcode].tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Product } from '../../schemas/product';
import { fetchProductByBarcode } from '../../services/product.service';

// ─── Grade helpers ────────────────────────────────────────────────────────────

function computeGrade(quality: {
  underDosed?: boolean | null;
  overDosed?: boolean | null;
  fillerRisk?: string | null;
  bioavailability?: string | null;
}): string {
  let score = 100;
  if (quality?.underDosed) score -= 30;
  if (quality?.overDosed) score -= 20;
  if (quality?.fillerRisk === 'high') score -= 30;
  else if (quality?.fillerRisk === 'moderate') score -= 15;
  if (quality?.bioavailability === 'low') score -= 20;
  else if (quality?.bioavailability === 'moderate') score -= 10;
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

function gradeColor(grade: string): string {
  const map: Record<string, string> = {
    A: '#6bd8cb',
    B: '#c2ebe3',
    C: '#ffdbce',
    D: '#ffb59a',
    F: '#ffdad6',
  };
  return map[grade] || '#dee4e1';
}

function gradeTextColor(grade: string): string {
  const map: Record<string, string> = {
    A: '#005049',
    B: '#274d48',
    C: '#773215',
    D: '#773215',
    F: '#93000a',
  };
  return map[grade] || '#3d4947';
}

// ─── History helper ───────────────────────────────────────────────────────────

async function saveToHistory(product: any, grade: string) {
  try {
    const existing = await AsyncStorage.getItem('scanHistory');
    const history = existing ? JSON.parse(existing) : [];
    const entry = {
      barcode: product.barcode,
      productName: product.productName,
      brand: product.brand,
      grade,
      date: new Date().toISOString(),
      highlight:
        product.quality?.fillerRisk === 'high'
          ? 'High Fillers'
          : product.quality?.bioavailability === 'superior'
          ? 'High Bioavailability'
          : product.quality?.underDosed
          ? 'Under-dosed'
          : 'Analyzed',
    };
    const updated = [
      entry,
      ...history.filter((h: any) => h.barcode !== product.barcode),
    ].slice(0, 20);
    await AsyncStorage.setItem('scanHistory', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save history', e);
  }
}

// ─── Ingredient rating ────────────────────────────────────────────────────────

type IngRating = 'safe' | 'caution' | 'avoid';

function ingredientRating(name: string): IngRating {
  const lower = name.toLowerCase();
  const avoid = ['titanium dioxide', 'red 40', 'yellow 5', 'blue 1', 'carrageenan'];
  const caution = ['silicon dioxide', 'magnesium stearate', 'stearate', 'talc', 'maltodextrin'];
  if (avoid.some((k) => lower.includes(k))) return 'avoid';
  if (caution.some((k) => lower.includes(k))) return 'caution';
  return 'safe';
}

function ratingBorderColor(r: IngRating): string {
  if (r === 'avoid') return '#ba1a1a';
  if (r === 'caution') return '#924628';
  return '#00685f';
}

function ratingBadgeColor(r: IngRating): string {
  if (r === 'avoid') return '#ffdad6';
  if (r === 'caution') return '#ffdbce';
  return '#89f5e7';
}

function ratingBadgeText(r: IngRating): string {
  if (r === 'avoid') return 'AVOID';
  if (r === 'caution') return 'CAUTION';
  return 'SAFE';
}

function ratingBadgeTextColor(r: IngRating): string {
  if (r === 'avoid') return '#93000a';
  if (r === 'caution') return '#773215';
  return '#005049';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductPage() {
  const { barcode, localData } = useLocalSearchParams<{ barcode: string; localData?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!barcode) return;
    let mounted = true;

    if (localData) {
      try {
        const parsedLocalData = JSON.parse(decodeURIComponent(localData));
        console.log('Using local data:', parsedLocalData);
        setProduct(parsedLocalData);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Failed to parse local data:', e);
      }
    }

    const fetchWithRetry = async () => {
      setLoading(true);
      const res = await fetchProductByBarcode(barcode);
      if (!mounted) return;

      if (res) {
        setProduct(res);

        const needsAIProcessing =
          res.meta?.sourceMap?.aiExtraction &&
          !res.quality?.bioavailability &&
          !res.ingredients?.length &&
          res.subCategory === 'other';

        if (needsAIProcessing) {
          console.log('Product found but AI processing incomplete, will retry in 3 seconds...');
          setTimeout(async () => {
            if (!mounted) return;
            console.log('Retrying to get fully processed data...');
            const updatedRes = await fetchProductByBarcode(barcode);
            if (updatedRes && mounted) {
              console.log('Updated product data:', updatedRes);
              setProduct(updatedRes);
            }
          }, 3000);
        }
      } else {
        setError('Product not found. You can add it manually.');
      }
      setLoading(false);
    };

    fetchWithRetry();
    return () => {
      mounted = false;
    };
  }, [barcode]);

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#00685f" />
        <Text style={styles.loadingText}>Fetching product info…</Text>
      </View>
    );
  }

  // ── Error / not found state ──────────────────────────────────────────────────

  if (!product) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <MaterialIcons name="search-off" size={56} color="#6d7a77" />
        <Text style={styles.notFoundTitle}>Product not found</Text>
        <Text style={styles.notFoundSub}>{error}</Text>
        <TouchableOpacity
          style={styles.addManuallyBtn}
          onPress={() => router.push(`/manual-add?barcode=${barcode}` as any)}
        >
          <Text style={styles.addManuallyText}>Add manually</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.backLinkBtn}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Product data ─────────────────────────────────────────────────────────────

  const productName = product.productName || product.name || 'Unknown Product';
  const brand = product.brand;
  const quality = product.quality;
  const grade = quality ? computeGrade(quality) : null;

  // Tag chips derived from quality
  const tags: string[] = [];
  if (quality?.bioavailability === 'superior' || quality?.bioavailability === 'high')
    tags.push('HIGH BIOAVAILABILITY');
  if (quality?.fillerRisk === 'low') tags.push('CLEAN FORMULA');
  if (quality?.underDosed === false && quality?.overDosed === false) tags.push('PROPERLY DOSED');
  if (product.form === 'capsule' || product.form === 'softgel') tags.push('VEGAN');

  // Metrics
  const dosageLabel =
    quality?.underDosed === true
      ? 'Under-dosed'
      : quality?.overDosed === true
      ? 'Over-dosed'
      : quality?.underDosed === false && quality?.overDosed === false
      ? 'Optimal'
      : 'Unknown';

  const dosageDesc =
    quality?.underDosed === true
      ? 'Dose is below effective range'
      : quality?.overDosed === true
      ? 'Dose exceeds recommended range'
      : 'Dosage falls within effective range';

  const bioLabel = quality?.bioavailability
    ? quality.bioavailability.charAt(0).toUpperCase() + quality.bioavailability.slice(1)
    : 'Unknown';

  const bioDesc =
    quality?.bioavailability === 'superior'
      ? 'Highly absorbable form used'
      : quality?.bioavailability === 'high'
      ? 'Good absorption expected'
      : quality?.bioavailability === 'moderate'
      ? 'Average absorption'
      : quality?.bioavailability === 'low'
      ? 'Poor absorption form'
      : 'Bioavailability not assessed';

  const fillerLabel = quality?.fillerRisk
    ? quality.fillerRisk.charAt(0).toUpperCase() + quality.fillerRisk.slice(1) + ' Risk'
    : 'Unknown';

  const fillerDesc =
    quality?.fillerRisk === 'low'
      ? 'Minimal unnecessary additives'
      : quality?.fillerRisk === 'moderate'
      ? 'Some fillers present'
      : quality?.fillerRisk === 'high'
      ? 'Significant fillers detected'
      : 'Filler presence not assessed';

  const servingSizeStr = product.servingSize
    ? `${product.servingSize.amount ?? ''} ${product.servingSize.unit ?? ''}`.trim()
    : null;

  const aiProcessing =
    product.meta?.sourceMap?.aiExtraction &&
    !quality?.bioavailability &&
    !product.ingredients?.length &&
    product.subCategory === 'other';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.iconBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#171d1c" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>SupplementScanner</Text>
        <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
          <MaterialIcons name="settings" size={24} color="#171d1c" />
        </TouchableOpacity>
      </View>

      {/* ── Status banners ── */}
      {product.meta?.manuallyUpdated && (
        <View style={styles.infoBanner}>
          <MaterialIcons name="edit-note" size={18} color="#0066cc" style={{ marginRight: 6 }} />
          <Text style={styles.infoBannerText}>Showing your manual updates (not yet saved to server)</Text>
        </View>
      )}
      {aiProcessing && (
        <View style={[styles.infoBanner, { backgroundColor: '#fff8e7', borderColor: '#ffd166' }]}>
          <MaterialIcons name="auto-awesome" size={18} color="#856404" style={{ marginRight: 6 }} />
          <View>
            <Text style={[styles.infoBannerText, { color: '#856404', fontFamily: 'Inter_600SemiBold' }]}>
              AI is analysing this product…
            </Text>
            <Text style={[styles.infoBannerText, { color: '#856404' }]}>
              Detailed information will appear shortly
            </Text>
          </View>
        </View>
      )}

      {/* ── Hero section ── */}
      <View style={styles.heroSection}>
        {/* Image placeholder + grade badge */}
        <View style={styles.imageWrapper}>
          <View style={styles.imagePlaceholder}>
            <MaterialIcons name="medication" size={52} color="#6bd8cb" />
          </View>
          {grade && (
            <View
              style={[
                styles.gradeBadge,
                { backgroundColor: gradeColor(grade) },
              ]}
            >
              <Text style={[styles.gradeBadgeText, { color: gradeTextColor(grade) }]}>
                {grade}
              </Text>
            </View>
          )}
        </View>

        {/* Product name + brand + tags */}
        <View style={styles.heroInfo}>
          <Text style={styles.productName} numberOfLines={3}>
            {productName}
          </Text>
          {brand && <Text style={styles.brandName}>{brand.toUpperCase()}</Text>}
          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ── Metrics bento ── */}
      {quality && (
        <View style={styles.bentoRow}>
          {/* Dosage card */}
          <View style={styles.bentoCard}>
            <MaterialIcons name="straighten" size={22} color="#00685f" />
            <Text style={styles.bentoCardTitle}>Dosage</Text>
            <Text style={styles.bentoCardRating}>{dosageLabel}</Text>
            <Text style={styles.bentoCardDesc}>{dosageDesc}</Text>
          </View>

          {/* Bioavailability card */}
          <View style={styles.bentoCard}>
            <MaterialIcons name="science" size={22} color="#00685f" />
            <Text style={styles.bentoCardTitle}>Bioavailability</Text>
            <Text style={styles.bentoCardRating}>{bioLabel}</Text>
            <Text style={styles.bentoCardDesc}>{bioDesc}</Text>
          </View>

          {/* Fillers card */}
          <View style={styles.bentoCard}>
            <MaterialIcons name="filter-list" size={22} color="#00685f" />
            <Text style={styles.bentoCardTitle}>Fillers</Text>
            <Text style={styles.bentoCardRating}>{fillerLabel}</Text>
            <Text style={styles.bentoCardDesc}>{fillerDesc}</Text>
          </View>
        </View>
      )}

      {/* ── Product details (serving size, category, etc.) ── */}
      {(product.category || product.subCategory || product.form || servingSizeStr || product.servingsPerContainer) && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Product Details</Text>
          <View style={styles.detailCard}>
            {product.category && (
              <DetailRow label="Category" value={product.category} />
            )}
            {product.subCategory && (
              <DetailRow label="Type" value={product.subCategory} />
            )}
            {product.form && (
              <DetailRow label="Form" value={product.form} />
            )}
            {servingSizeStr && (
              <DetailRow label="Serving Size" value={servingSizeStr} />
            )}
            {product.servingsPerContainer != null && (
              <DetailRow
                label="Servings"
                value={String(product.servingsPerContainer)}
                isLast
              />
            )}
          </View>
        </View>
      )}

      {/* ── Ingredient analysis ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Ingredient Analysis</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {product.ingredients.length} Ingredient{product.ingredients.length !== 1 ? 's' : ''} Found
            </Text>
          </View>
        </View>

        {product.ingredients.length === 0 ? (
          <Text style={styles.emptyText}>No ingredient data available.</Text>
        ) : (
          product.ingredients.map((ing, i) => {
            const rating = ingredientRating(ing.name);
            const doseVal = ing.dosage ?? ing.dosage_mg;
            const doseUnit = ing.unit ?? 'mg';
            const doseStr = doseVal != null ? `${doseVal} ${doseUnit}` : null;
            return (
              <View
                key={i}
                style={[
                  styles.ingredientCard,
                  { borderLeftColor: ratingBorderColor(rating) },
                ]}
              >
                <View style={styles.ingredientCardTop}>
                  <Text style={styles.ingName} numberOfLines={2}>
                    {ing.name}
                  </Text>
                  <View
                    style={[
                      styles.ratingBadge,
                      { backgroundColor: ratingBadgeColor(rating) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ratingBadgeText,
                        { color: ratingBadgeTextColor(rating) },
                      ]}
                    >
                      {ratingBadgeText(rating)}
                    </Text>
                  </View>
                </View>
                {doseStr && <Text style={styles.ingDose}>{doseStr}</Text>}
                {ing.isStandardized && ing.standardizedTo && (
                  <Text style={styles.ingStandardized}>
                    Standardized to {ing.standardizedTo}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnSaved]}
          onPress={async () => {
            if (saved || !product) return;
            await saveToHistory(product, grade ?? 'N/A');
            setSaved(true);
          }}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name={saved ? 'check-circle' : 'bookmark-add'}
            size={20}
            color="#ffffff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.saveBtnText}>{saved ? 'SAVED ✓' : 'SAVE TO HISTORY'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85}>
          <MaterialIcons name="share" size={20} color="#3d4947" style={{ marginRight: 8 }} />
          <Text style={styles.shareBtnText}>SHARE REPORT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Detail row helper ─────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.detailRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5faf8',
  },

  // Center states
  center: {
    flex: 1,
    backgroundColor: '#f5faf8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#3d4947',
    fontFamily: 'Inter_400Regular',
  },
  notFoundTitle: {
    marginTop: 16,
    fontSize: 22,
    color: '#171d1c',
    fontFamily: 'Manrope_800ExtraBold',
    textAlign: 'center',
  },
  notFoundSub: {
    marginTop: 8,
    fontSize: 14,
    color: '#6d7a77',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  addManuallyBtn: {
    marginTop: 24,
    backgroundColor: '#00685f',
    borderRadius: 100,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  addManuallyText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  backLinkBtn: {
    marginTop: 16,
    padding: 8,
  },
  backLinkText: {
    color: '#00685f',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#f5faf8',
  },
  topBarTitle: {
    fontSize: 17,
    color: '#171d1c',
    fontFamily: 'Manrope_700Bold',
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e9e7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Banners
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f0fe',
    borderColor: '#80bfff',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#0066cc',
    fontFamily: 'Inter_400Regular',
    flexShrink: 1,
  },

  // Hero
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 14,
  },
  imageWrapper: {
    position: 'relative',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#e4e9e7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  gradeBadgeText: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
  },
  heroInfo: {
    flex: 1,
    paddingTop: 2,
  },
  productName: {
    fontSize: 20,
    color: '#171d1c',
    fontFamily: 'Manrope_800ExtraBold',
    lineHeight: 26,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 11,
    color: '#00685f',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: '#c2ebe3',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipText: {
    fontSize: 10,
    color: '#005049',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },

  // Bento metrics
  bentoRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  bentoCardTitle: {
    fontSize: 11,
    color: '#6d7a77',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 6,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  bentoCardRating: {
    fontSize: 13,
    color: '#171d1c',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  bentoCardDesc: {
    fontSize: 10,
    color: '#6d7a77',
    fontFamily: 'Inter_400Regular',
    lineHeight: 14,
  },

  // Section wrapper
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 17,
    color: '#171d1c',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: '#e4e9e7',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    fontSize: 12,
    color: '#3d4947',
    fontFamily: 'Inter_600SemiBold',
  },
  emptyText: {
    fontSize: 14,
    color: '#6d7a77',
    fontFamily: 'Inter_400Regular',
  },

  // Detail card
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f5f2',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6d7a77',
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#171d1c',
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    textAlign: 'right',
    textTransform: 'capitalize',
  },

  // Ingredient cards
  ingredientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00685f',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  ingredientCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  ingName: {
    flex: 1,
    fontSize: 14,
    color: '#171d1c',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  ratingBadge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  ratingBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  ingDose: {
    marginTop: 4,
    fontSize: 13,
    color: '#3d4947',
    fontFamily: 'Inter_400Regular',
  },
  ingStandardized: {
    marginTop: 2,
    fontSize: 12,
    color: '#6d7a77',
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },

  // Action buttons
  actionSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00685f',
    borderRadius: 100,
    paddingVertical: 16,
    shadowColor: '#00685f',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnSaved: {
    backgroundColor: '#274d48',
  },
  saveBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    letterSpacing: 0.8,
  },
  shareBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e4e9e7',
    borderRadius: 100,
    paddingVertical: 16,
  },
  shareBtnText: {
    color: '#3d4947',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    letterSpacing: 0.8,
  },
});
