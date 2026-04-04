import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryItem {
  barcode: string;
  productName: string;
  brand: string;
  grade: string; // A, B, C, D, F
  date: string;  // ISO string
  highlight: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#00685f',
  primaryContainer: '#008378',
  primaryFixed: '#89f5e7',
  primaryFixedDim: '#6bd8cb',
  onPrimary: '#ffffff',
  onPrimaryFixedVariant: '#005049',
  surface: '#f5faf8',
  surfaceContainerLow: '#f0f5f2',
  surfaceContainerHigh: '#e4e9e7',
  surfaceContainerLowest: '#ffffff',
  onSurface: '#171d1c',
  onSurfaceVariant: '#3d4947',
  outline: '#6d7a77',
  outlineVariant: '#bcc9c6',
  secondaryContainer: '#c2ebe3',
  onSecondaryContainer: '#456b66',
  tertiary: '#924628',
};

const gradeColors: Record<string, { bg: string; text: string }> = {
  A: { bg: '#6bd8cb', text: '#005049' },
  B: { bg: '#c2ebe3', text: '#274d48' },
  C: { bg: '#ffdbce', text: '#773215' },
  D: { bg: '#ffb59a', text: '#773215' },
  F: { bg: '#ffdad6', text: '#93000a' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function computeAverageGrade(history: HistoryItem[]): string {
  if (history.length === 0) return '—';
  const gradeMap: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 1 };
  const total = history.reduce((sum, item) => {
    return sum + (gradeMap[item.grade?.toUpperCase()] ?? 3);
  }, 0);
  const avg = total / history.length;
  if (avg >= 4.5) return 'A';
  if (avg >= 3.5) return 'B';
  if (avg >= 2.5) return 'C';
  if (avg >= 1.5) return 'D';
  return 'F';
}

function getHighlightColor(highlight: string): string {
  if (
    highlight.includes('Filler') ||
    highlight.includes('Under') ||
    highlight.includes('Artificial')
  ) {
    return COLORS.tertiary; // '#924628'
  }
  return COLORS.primary; // '#00685f'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TopBar() {
  return (
    <View style={styles.topBar}>
      {/* Avatar + Title */}
      <View style={styles.topBarLeft}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>U</Text>
        </View>
        <Text style={styles.topBarTitle}>SupplementScanner</Text>
      </View>
      {/* Settings icon */}
      <TouchableOpacity style={styles.topBarAction} activeOpacity={0.7}>
        <MaterialIcons name="settings" size={24} color={COLORS.onSurfaceVariant} />
      </TouchableOpacity>
    </View>
  );
}

function PageHeader() {
  return (
    <View style={styles.pageHeader}>
      <Text style={styles.pageTitle}>Scan History</Text>
      <Text style={styles.pageSubtitle}>
        Your curated archive of nutritional precision.
      </Text>
    </View>
  );
}

function StatsBento({ totalScans, healthAverage }: { totalScans: number; healthAverage: string }) {
  const avgGradeStyle = gradeColors[healthAverage] ?? { bg: COLORS.primaryFixedDim, text: COLORS.onPrimaryFixedVariant };

  return (
    <View style={styles.bentoRow}>
      {/* Total Scans */}
      <View style={[styles.bentoCard, styles.bentoCardNeutral]}>
        <View style={styles.bentoIconWrap}>
          <MaterialIcons name="qr-code-scanner" size={22} color={COLORS.onPrimaryFixedVariant} />
        </View>
        <Text style={styles.bentoStatNumber}>{totalScans}</Text>
        <Text style={styles.bentoStatLabel}>Total Scans</Text>
      </View>

      {/* Health Average */}
      <View style={[styles.bentoCard, { backgroundColor: COLORS.primaryFixedDim }]}>
        <View style={styles.bentoIconWrap}>
          <MaterialIcons name="favorite" size={22} color={COLORS.onPrimaryFixedVariant} />
        </View>
        <View style={[styles.avgGradeBadge, { backgroundColor: avgGradeStyle.bg }]}>
          <Text style={[styles.avgGradeText, { color: avgGradeStyle.text }]}>
            {healthAverage}
          </Text>
        </View>
        <Text style={[styles.bentoStatLabel, { color: COLORS.onPrimaryFixedVariant }]}>
          Health Average
        </Text>
      </View>
    </View>
  );
}

function SectionHeader({ count }: { count: number }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>Recent Insights</Text>
      <TouchableOpacity style={styles.sortButton} activeOpacity={0.75}>
        <MaterialIcons name="sort" size={16} color={COLORS.primary} />
        <Text style={styles.sortButtonText}>Sort by Date</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProductInitialThumb({ name }: { name: string }) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?';
  return (
    <View style={styles.productThumb}>
      <Text style={styles.productThumbInitial}>{initial}</Text>
    </View>
  );
}

function HistoryCard({ item, onPress }: { item: HistoryItem; onPress: () => void }) {
  const grade = item.grade?.toUpperCase() ?? '?';
  const gradeStyle = gradeColors[grade] ?? { bg: COLORS.surfaceContainerHigh, text: COLORS.onSurfaceVariant };
  const highlightColor = getHighlightColor(item.highlight ?? '');

  return (
    <TouchableOpacity style={styles.historyCard} onPress={onPress} activeOpacity={0.82}>
      {/* Left: thumbnail */}
      <ProductInitialThumb name={item.productName} />

      {/* Middle: info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardProductName} numberOfLines={1}>
          {item.productName}
        </Text>
        <Text style={styles.cardBrand} numberOfLines={1}>
          {item.brand}
        </Text>
        <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
        {item.highlight ? (
          <View style={[styles.highlightTag, { borderColor: highlightColor + '40' }]}>
            <Text style={[styles.highlightTagText, { color: highlightColor }]}>
              {item.highlight}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Right: grade badge + chevron */}
      <View style={styles.cardRight}>
        <View style={[styles.gradeBadge, { backgroundColor: gradeStyle.bg }]}>
          <Text style={[styles.gradeBadgeText, { color: gradeStyle.text }]}>{grade}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={COLORS.outlineVariant} style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="history" size={48} color={COLORS.primaryFixedDim} />
      </View>
      <Text style={styles.emptyTitle}>No scans yet</Text>
      <Text style={styles.emptySubtitle}>Start by scanning a supplement</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const router = useRouter();

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 20,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60) router.navigate('/(tabs)');
        else if (gs.dx < -60) router.navigate('/(tabs)/search');
      },
    })
  ).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem('scanHistory').then((raw) => {
        if (!active) return;
        if (raw) {
          try {
            const parsed: HistoryItem[] = JSON.parse(raw);
            // Newest first
            const sorted = [...parsed].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            setHistory(sorted);
          } catch {
            setHistory([]);
          }
        } else {
          setHistory([]);
        }
      });
      return () => { active = false; };
    }, [])
  );

  const healthAverage = computeAverageGrade(history);

  return (
    <SafeAreaView edges={['top']} style={styles.root} {...panResponder.panHandlers}>
      <TopBar />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader />
        <StatsBento totalScans={history.length} healthAverage={healthAverage} />
        <SectionHeader count={history.length} />

        {history.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.cardList}>
            {history.map((item) => (
              <HistoryCard
                key={`${item.barcode}-${item.date}`}
                item={item}
                onPress={() => router.push(`/product/${encodeURIComponent(item.barcode)}` as any)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // ── Top bar ──
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
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryFixedDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 16,
    color: COLORS.onPrimaryFixedVariant,
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

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // ── Page header ──
  pageHeader: {
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 28,
    color: COLORS.onSurface,
    letterSpacing: -0.5,
    marginBottom: 6,
    lineHeight: 34,
  },
  pageSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    lineHeight: 21,
  },

  // ── Stats bento ──
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  bentoCardNeutral: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  bentoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,80,73,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bentoStatNumber: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 32,
    color: COLORS.onSurface,
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 4,
  },
  bentoStatLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avgGradeBadge: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avgGradeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: -0.5,
  },

  // ── Section header ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 18,
    color: COLORS.onSurface,
    letterSpacing: -0.2,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sortButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: COLORS.primary,
  },

  // ── Card list ──
  cardList: {
    gap: 12,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },

  // ── Product thumbnail ──
  productThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productThumbInitial: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 24,
    color: COLORS.onSurfaceVariant,
  },

  // ── Card info ──
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardProductName: {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 14,
    color: COLORS.onSurface,
    letterSpacing: -0.1,
  },
  cardBrand: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  cardDate: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 2,
  },
  highlightTag: {
    alignSelf: 'flex-start',
    marginTop: 5,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  highlightTagText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.1,
  },

  // ── Card right ──
  cardRight: {
    alignItems: 'center',
    flexShrink: 0,
  },
  gradeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: -0.3,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 20,
    color: COLORS.onSurface,
    letterSpacing: -0.3,
    marginBottom: 8,
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
