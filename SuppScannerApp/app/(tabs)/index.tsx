import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useCallback, useMemo, useRef } from 'react';
import {
  FlatList,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  encyclopediaSupplements,
  encyclopediaCategories,
  type EncyclopediaCategory,
  type EvidenceTier,
  type EncyclopedialSupplement,
} from '../../src/data/encyclopediaData';
import { t } from '../../src/i18n';
import { useStack } from '../../src/contexts/StackContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';

const categoryColors: Record<EncyclopediaCategory, string> = {
  Performance: '#00685f',
  Sleep: '#6366f1',
  Nootropics: '#0891b2',
  Recovery: '#ea580c',
  Health: '#16a34a',
};

const categoryIcons: Record<EncyclopediaCategory, keyof typeof MaterialIcons.glyphMap> = {
  Performance: 'fitness-center',
  Sleep: 'bedtime',
  Nootropics: 'psychology',
  Recovery: 'bolt',
  Health: 'eco',
};

const evidenceBadgeColors: Record<EvidenceTier, { bg: string; text: string }> = {
  Strong:    { bg: '#00685f', text: '#ffffff' },
  Moderate:  { bg: '#dbeafe', text: '#1e40af' },
  Emerging:  { bg: '#fef3c7', text: '#92400e' },
  Anecdotal: { bg: '#e4e9e7', text: '#3d4947' },
};

const CATEGORY_ORDER: EncyclopediaCategory[] = ['Performance', 'Recovery', 'Sleep', 'Nootropics', 'Health'];
type Category = typeof encyclopediaCategories[number];

type Section = { cat: Category; items: EncyclopedialSupplement[] };

function SupplementCard({
  supp, onPress, inStack, onToggle, colors,
}: {
  supp: EncyclopedialSupplement;
  onPress: () => void;
  inStack: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const catColor = categoryColors[supp.category];
  const badge = evidenceBadgeColors[supp.evidenceTier];
  const catIcon = categoryIcons[supp.category];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.cardHeader, { backgroundColor: catColor }]}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.catIconWrap}>
            <MaterialIcons name={catIcon} size={14} color="#ffffff" />
          </View>
          <Text style={styles.cardCategoryLabel}>{supp.category.toUpperCase()}</Text>
        </View>
        <View style={[styles.evidenceBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.evidenceBadgeText, { color: badge.text }]}>{supp.evidenceTier}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.onSurface }]}>{supp.name}</Text>
        <Text style={[styles.cardTagline, { color: colors.onSurfaceVariant }]} numberOfLines={2}>{t(supp.tagline)}</Text>
        <View style={[styles.cardFooter, { borderTopColor: colors.borderCard }]}>
          <Text style={[styles.cardViewDetails, { color: catColor }]}>View details</Text>
          <TouchableOpacity
            onPress={onToggle}
            style={[
              styles.stackBtn,
              inStack
                ? { backgroundColor: catColor, borderWidth: 0 }
                : { backgroundColor: 'transparent', borderColor: catColor, borderWidth: 1.5, borderStyle: 'dashed' },
            ]}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <MaterialIcons name={inStack ? 'check' : 'add'} size={12} color={inStack ? '#ffffff' : catColor} />
            <Text style={[styles.stackBtnText, { color: inStack ? '#ffffff' : catColor }]}>
              {inStack ? 'Added' : 'Stack'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SectionView({
  section, onPress, inStack, onToggle, colors,
}: {
  section: Section;
  onPress: (slug: string) => void;
  inStack: (slug: string) => boolean;
  onToggle: (slug: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const catColor = section.cat !== 'All' ? categoryColors[section.cat as EncyclopediaCategory] : colors.primary;
  const catIcon = section.cat !== 'All' ? categoryIcons[section.cat as EncyclopediaCategory] : 'apps';

  return (
    <View style={styles.section}>
      {section.cat !== 'All' && (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: catColor }]}>
              <MaterialIcons name={catIcon} size={18} color="#ffffff" />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>{section.cat}</Text>
              <Text style={[styles.sectionCount, { color: colors.onSurfaceVariant }]}>{section.items.length} supplements</Text>
            </View>
          </View>
          <View style={[styles.sectionDivider, { backgroundColor: catColor + '40' }]} />
        </>
      )}
      {section.items.map(supp => (
        <SupplementCard
          key={supp.slug}
          supp={supp}
          onPress={() => onPress(supp.slug)}
          inStack={inStack(supp.slug)}
          onToggle={() => onToggle(supp.slug)}
          colors={colors}
        />
      ))}
    </View>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const { inStack, toggleStack } = useStack();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 2 && Math.abs(gs.dx) > 40,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -60) router.navigate('/(tabs)/stack' as any);
      },
    })
  ).current;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return encyclopediaSupplements.filter(s => {
      const matchesCat = activeCategory === 'All' || s.category === activeCategory;
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  const isFiltered = activeCategory !== 'All' || searchQuery.trim() !== '';

  const sections: Section[] = useMemo(() => {
    if (isFiltered) {
      return [{ cat: 'All', items: filtered }];
    }
    return CATEGORY_ORDER
      .map(cat => ({ cat, items: filtered.filter(s => s.category === cat) }))
      .filter(s => s.items.length > 0);
  }, [filtered, isFiltered]);

  const handlePress = useCallback((slug: string) => {
    router.push(`/supplement/${slug}` as any);
  }, [router]);

  const handleToggleStack = useCallback((slug: string) => {
    if (!user) { router.push('/sign-in' as any); return; }
    toggleStack(slug);
  }, [user, toggleStack, router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} {...panResponder.panHandlers}>
      <SafeAreaView edges={['top']} style={[styles.topBarSafe, { backgroundColor: colors.surface }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.topBarTitle, { color: colors.onSurface }]}>Supplement Index</Text>
          <View style={[styles.topBarBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.topBarBadgeText}>{encyclopediaSupplements.length}</Text>
          </View>
        </View>
      </SafeAreaView>

      <FlatList<Section>
        data={sections}
        keyExtractor={item => item.cat}
        renderItem={({ item }) => (
          <SectionView
            section={item}
            onPress={handlePress}
            inStack={inStack}
            onToggle={handleToggleStack}
            colors={colors}
          />
        )}
        ListHeaderComponent={
          <View>
            <View style={[styles.searchBarContainer, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.border }]}>
              <MaterialIcons name="search" size={20} color={colors.outline} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.onSurface }]}
                placeholder="Search supplements…"
                placeholderTextColor={colors.outline}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                selectionColor={colors.primary}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={18} color={colors.outline} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsContent}
              style={styles.pillsScroll}
            >
              {encyclopediaCategories.map(cat => {
                const isActive = activeCategory === cat;
                const color = cat !== 'All' ? categoryColors[cat as EncyclopediaCategory] : colors.primary;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={[
                      styles.pill,
                      isActive
                        ? { backgroundColor: color, borderColor: color }
                        : { backgroundColor: 'transparent', borderColor: colors.border },
                    ]}
                    activeOpacity={0.75}
                  >
                    {cat !== 'All' && (
                      <MaterialIcons
                        name={categoryIcons[cat as EncyclopediaCategory]}
                        size={13}
                        color={isActive ? '#ffffff' : colors.onSurfaceVariant}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text style={[styles.pillText, { color: isActive ? '#ffffff' : colors.onSurfaceVariant }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {isFiltered && (
              <Text style={[styles.resultCount, { color: colors.onSurfaceVariant }]}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
                {searchQuery.trim() ? ` for "${searchQuery.trim()}"` : ''}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={48} color={colors.surfaceContainerHigh} />
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No supplements found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>Try adjusting your search or category filter</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBarSafe: {},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: -0.4,
    flex: 1,
  },
  topBarBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  topBarBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: '#ffffff',
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 120 },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    paddingVertical: 12,
  },

  pillsScroll: { marginBottom: 4 },
  pillsContent: { gap: 8, paddingRight: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  pillText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },

  resultCount: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 4,
  },

  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
  },
  sectionDivider: {
    height: 1,
    marginBottom: 12,
  },

  card: {
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  catIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCategoryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.6,
  },
  evidenceBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  evidenceBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
  },

  cardBody: { padding: 14 },
  cardName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  cardTagline: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  cardViewDetails: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },
  stackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  stackBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 18,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    textAlign: 'center',
  },
});
