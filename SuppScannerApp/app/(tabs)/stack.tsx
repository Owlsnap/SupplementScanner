import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { encyclopediaSupplements, type EncyclopediaCategory } from '../../src/data/encyclopediaData';
import { t } from '../../src/i18n';
import { useStack } from '../../src/contexts/StackContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';

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

export default function StackScreen() {
  const router = useRouter();
  const { stack, removeFromStack } = useStack();
  const { colors } = useTheme();
  const { user, loading: authLoading } = useAuth();

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 2 && Math.abs(gs.dx) > 40,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60) router.navigate('/(tabs)/index' as any);
        if (gs.dx < -60) router.navigate('/(tabs)/search' as any);
      },
    })
  ).current;

  const stackSupplements = encyclopediaSupplements.filter(s => stack.includes(s.slug));

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} {...panResponder.panHandlers}>
      <SafeAreaView edges={['top']} style={[styles.topBarSafe, { backgroundColor: colors.surface }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.topBarTitle, { color: colors.onSurface }]}>My Stack</Text>
          {stackSupplements.length > 0 && (
            <View style={[styles.topBarBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.topBarBadgeText}>{stackSupplements.length}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {authLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !user ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
            <MaterialIcons name="lock-outline" size={40} color={colors.outline} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Sign in to build your stack</Text>
          <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
            Your stack syncs across devices once you sign in.
          </Text>
          <TouchableOpacity
            style={[styles.browseBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/sign-in' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.browseBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <FlatList
        data={stackSupplements}
        keyExtractor={item => item.slug}
        renderItem={({ item }) => {
          const catColor = categoryColors[item.category];
          const catIcon = categoryIcons[item.category];
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}
              onPress={() => router.push(`/supplement/${item.slug}` as any)}
              activeOpacity={0.82}
            >
              <View style={[styles.cardAccent, { backgroundColor: catColor }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIconWrap, { backgroundColor: colors.surfaceContainerLow }]}>
                    <MaterialIcons name={catIcon} size={18} color={catColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardCategory, { color: colors.outline }]}>{item.category}</Text>
                    <Text style={[styles.cardName, { color: colors.onSurface }]}>{item.name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeFromStack(item.slug)}
                    style={[styles.removeBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={16} color={colors.outline} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cardTagline, { color: colors.onSurfaceVariant }]} numberOfLines={2}>{t(item.tagline)}</Text>
                <View style={[styles.cardFooter, { borderTopColor: colors.borderCard }]}>
                  <Text style={[styles.cardViewLink, { color: catColor }]}>View deep dive →</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
              {stackSupplements.length > 0
                ? `${stackSupplements.length} supplement${stackSupplements.length !== 1 ? 's' : ''} in your stack`
                : 'Build your supplement stack from the Index'}
            </Text>

            {stackSupplements.length > 0 && (
              <TouchableOpacity
                style={[styles.evaluateBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/premium' as any)}
                activeOpacity={0.85}
              >
                <MaterialIcons name="auto-awesome" size={18} color="#ffffff" />
                <View>
                  <Text style={styles.evaluateBtnTitle}>Evaluate Stack</Text>
                  <Text style={styles.evaluateBtnSub}>AI interaction & gap analysis</Text>
                </View>
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
              <MaterialIcons name="science" size={40} color={colors.outline} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Your stack is empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              Browse the Supplement Index and tap "Stack" on any supplement to add it here.
            </Text>
            <TouchableOpacity
              style={[styles.browseBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.navigate('/(tabs)/index' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.browseBtnText}>Browse Index</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      )}
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

  listHeader: { paddingTop: 16, marginBottom: 8 },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    marginBottom: 16,
  },

  evaluateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  evaluateBtnTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  evaluateBtnSub: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  premiumBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  premiumBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  card: {
    flexDirection: 'row',
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
  cardAccent: { width: 4 },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardCategory: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: -0.3,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTagline: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  cardViewLink: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  browseBtn: {
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  browseBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 15,
    color: '#ffffff',
  },
});
