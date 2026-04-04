import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../../src/config/api';

// ─── Color Palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#00685f',
  primaryContainer: '#008378',
  primaryFixed: '#89f5e7',
  primaryFixedDim: '#6bd8cb',
  onPrimary: '#ffffff',
  onPrimaryFixedVariant: '#005049',
  surface: '#f5faf8',
  surfaceContainerLow: '#f0f5f2',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#e4e9e7',
  surfaceContainerHighest: '#dee4e1',
  onSurface: '#171d1c',
  onSurfaceVariant: '#3d4947',
  outline: '#6d7a77',
  secondary: '#3f6560',
};

// ─── Grade helpers ─────────────────────────────────────────────────────────────
const gradeColors: Record<string, { bg: string; text: string; accent: string }> = {
  A: { bg: '#6bd8cb', text: '#005049', accent: '#6bd8cb' },
  B: { bg: '#c2ebe3', text: '#274d48', accent: '#c2ebe3' },
  C: { bg: '#ffdbce', text: '#773215', accent: '#ffdbce' },
  D: { bg: '#ffb59a', text: '#773215', accent: '#ffb59a' },
  F: { bg: '#ffdad6', text: '#93000a', accent: '#ffdad6' },
};

function computeGrade(product: any): string {
  const q = product.quality || {};
  let score = 100;
  if (q.underDosed) score -= 30;
  if (q.overDosed) score -= 20;
  if (q.fillerRisk === 'high') score -= 30;
  else if (q.fillerRisk === 'moderate') score -= 15;
  if (q.bioavailability === 'low') score -= 20;
  else if (q.bioavailability === 'moderate') score -= 10;
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

// ─── Category chips ────────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Vitamins', 'Protein', 'Nootropics', 'Probiotics'];

// ─── Sub-components ───────────────────────────────────────────────────────────
function ImagePlaceholder({ name }: { name: string }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <View style={styles.imagePlaceholder}>
      <Text style={styles.imagePlaceholderText}>{initial}</Text>
    </View>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colors = gradeColors[grade] || gradeColors['F'];
  return (
    <View style={[styles.gradeBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.gradeBadgeText, { color: colors.text }]}>{grade}</Text>
    </View>
  );
}

function TagChip({ label }: { label: string }) {
  return (
    <View style={styles.tagChip}>
      <Text style={styles.tagChipText}>{label}</Text>
    </View>
  );
}

function ProductCard({ product, onPress }: { product: any; onPress: () => void }) {
  const grade = computeGrade(product);
  const accentColor = (gradeColors[grade] || gradeColors['F']).accent;
  const brandName = (product.brand || product.brandName || '').toUpperCase();
  const productName = product.name || product.productName || 'Unknown Product';
  const description = product.description || product.shortDescription || '';
  const tags: string[] = product.tags || [];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.82}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.cardContent}>
        <View style={styles.cardRow}>
          <ImagePlaceholder name={productName} />

          <View style={styles.cardTextBlock}>
            {brandName.length > 0 && (
              <Text style={styles.cardBrand} numberOfLines={1}>
                {brandName}
              </Text>
            )}
            <Text style={styles.cardName} numberOfLines={2}>
              {productName}
            </Text>
            {description.length > 0 && (
              <Text style={styles.cardDesc} numberOfLines={2}>
                {description}
              </Text>
            )}
          </View>

          <GradeBadge grade={grade} />
        </View>

        {tags.length > 0 && (
          <View style={styles.tagRow}>
            {tags.slice(0, 4).map((tag: string) => (
              <TagChip key={tag} label={tag} />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();

  const [query, setQuery] = useState(params.q || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 20,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60) router.navigate('/(tabs)/history');
        else if (gs.dx < -60) router.navigate('/(tabs)/rewards');
      },
    })
  ).current;

  async function searchProducts(q: string) {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setResults(data.results || data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchProducts(query);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // If a `?q=` param was passed in (e.g. from home screen), trigger search once
  useEffect(() => {
    if (params.q) {
      setQuery(params.q);
    }
  }, []);

  function handleProductPress(product: any) {
    const id = product.barcode || product.id;
    if (id) {
      router.push(`/product/${encodeURIComponent(id)}` as any);
    }
  }

  // ── List header: search bar + category chips ───────────────────────────────
  const ListHeader = (
    <View>
      {/* Page heading */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Find Clarity</Text>
        <Text style={styles.pageSubtitle}>
          Verify ingredients against clinical standards.
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBarContainer}>
        <MaterialIcons
          name="search"
          size={20}
          color={COLORS.outline}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search brands, ingredients, or symptoms..."
          placeholderTextColor={COLORS.outline}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          selectionColor={COLORS.primary}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={18} color={COLORS.outline} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
        style={styles.categoryScrollOuter}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip,
                active ? styles.categoryChipActive : styles.categoryChipInactive,
              ]}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: active ? '#ffffff' : '#3d4947' },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section label */}
      {query.trim().length > 0 && !loading && (
        <Text style={styles.sectionLabel}>
          {results.length > 0
            ? `${results.length} result${results.length !== 1 ? 's' : ''}`
            : ''}
        </Text>
      )}
      {query.trim().length === 0 && (
        <Text style={styles.sectionLabel}>Popular &amp; Featured</Text>
      )}
    </View>
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  const LoadingFooter = loading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Searching...</Text>
    </View>
  ) : null;

  // ── Empty state ───────────────────────────────────────────────────────────
  const EmptyComponent =
    !loading && query.trim().length > 0 && results.length === 0 ? (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="search-off" size={56} color={COLORS.surfaceContainerHigh} />
        <Text style={styles.emptyTitle}>No results found</Text>
        <Text style={styles.emptySubtitle}>
          Try a different name, brand, or ingredient.
        </Text>
      </View>
    ) : !loading && query.trim().length === 0 ? (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="science" size={56} color={COLORS.surfaceContainerHigh} />
        <Text style={styles.emptyTitle}>Start searching</Text>
        <Text style={styles.emptySubtitle}>
          Type a supplement name, brand, or ingredient above.
        </Text>
      </View>
    ) : null;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]} {...panResponder.panHandlers}>
      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBarSafe}>
        <View style={styles.topBar}>
          <View style={styles.topBarLogo}>
            {/* Avatar placeholder */}
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={18} color={COLORS.onSurfaceVariant} />
            </View>
            <Text style={styles.topBarTitle}>SupplementScanner</Text>
          </View>
          <TouchableOpacity style={styles.topBarAction} activeOpacity={0.7}>
            <MaterialIcons name="settings" size={24} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Results list */}
      <FlatList
        data={results}
        keyExtractor={(item, index) =>
          String(item.barcode || item.id || item._id || index)
        }
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => handleProductPress(item)} />
        )}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={
          <>
            {LoadingFooter}
            {EmptyComponent}
            <View style={{ height: 100 }} />
          </>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Top bar
  topBarSafe: {
    backgroundColor: COLORS.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(109,122,119,0.18)',
  },
  topBarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 18,
    color: COLORS.onSurface,
    letterSpacing: -0.3,
  },
  topBarAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List padding
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Page header
  pageHeader: {
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 32,
    color: COLORS.onSurface,
    letterSpacing: -0.6,
    marginBottom: 6,
    lineHeight: 38,
  },
  pageSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    lineHeight: 21,
  },

  // Search bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(109,122,119,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.onSurface,
    paddingVertical: 12,
  },

  // Category chips
  categoryScrollOuter: {
    marginBottom: 8,
  },
  categoryScroll: {
    gap: 8,
    paddingRight: 4,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: '#00685f',
  },
  categoryChipInactive: {
    backgroundColor: '#e4e9e7',
  },
  categoryChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },

  // Section label
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 10,
  },

  // Product card
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(109,122,119,0.12)',
  },
  accentBar: {
    width: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  cardContent: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  // Image placeholder
  imagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  imagePlaceholderText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 22,
    color: COLORS.onSurfaceVariant,
  },

  // Card text
  cardTextBlock: {
    flex: 1,
  },
  cardBrand: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  cardName: {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 15,
    color: COLORS.onSurface,
    lineHeight: 20,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    lineHeight: 17,
  },

  // Grade badge
  gradeBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gradeBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 15,
  },

  // Tag row
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 20,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 21,
  },
});
