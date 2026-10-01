import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { encyclopediaSupplements, type EncyclopediaCategory } from '../../src/data/encyclopediaData';
import { useAuth, supabase } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { deepDivePreview, downloadDeepDivePdf, getDownloadedSlugs, type DeepDiveContent } from '../../src/utils/deepDiveExport';

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

interface SavedRow {
  slug: string;
  content: DeepDiveContent;
  saved_at: string;
}

export default function SavedDeepDivesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingSlug, setExportingSlug] = useState<string | null>(null);
  const [menuTarget, setMenuTarget] = useState<SavedRow | null>(null);
  const [downloadedSlugs, setDownloadedSlugs] = useState<string[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToastMessage(null));
    }, 2200);
  }, [toastAnim]);

  useEffect(() => {
    getDownloadedSlugs().then(setDownloadedSlugs);
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 2 && Math.abs(gs.dx) > 40,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60) router.navigate('/(tabs)/stack' as any);
        else if (gs.dx < -60) router.navigate('/(tabs)/profile' as any);
      },
    })
  ).current;

  const load = useCallback(() => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    supabase
      .from('saved_deep_dives')
      .select('slug, content, saved_at')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const unsave = async (slug: string) => {
    if (!user) return;
    setMenuTarget(null);
    setRows(prev => prev.filter(r => r.slug !== slug));
    await supabase.from('saved_deep_dives').delete().eq('user_id', user.id).eq('slug', slug);
  };

  const download = async (slug: string, content: DeepDiveContent) => {
    const supp = encyclopediaSupplements.find(s => s.slug === slug);
    if (!supp || exportingSlug) return;
    setMenuTarget(null);
    setExportingSlug(slug);
    try {
      const result = await downloadDeepDivePdf(slug, supp.name, content);
      if (result === 'downloaded') {
        setDownloadedSlugs(prev => (prev.includes(slug) ? prev : [...prev, slug]));
        showToast('Downloaded to your device');
      } else if (result === 'shared') {
        setDownloadedSlugs(prev => (prev.includes(slug) ? prev : [...prev, slug]));
        showToast('Shared');
      }
    } finally {
      setExportingSlug(null);
    }
  };

  const menuSupp = menuTarget ? encyclopediaSupplements.find(s => s.slug === menuTarget.slug) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} {...panResponder.panHandlers}>
      <SafeAreaView edges={['top']} style={[styles.topBarSafe, { backgroundColor: colors.surface }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.topBarTitle, { color: colors.onSurface }]}>Saved Deep Dives</Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.slug}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const supp = encyclopediaSupplements.find(s => s.slug === item.slug);
            if (!supp) return null;
            const catColor = categoryColors[supp.category];
            const catIcon = categoryIcons[supp.category];
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
                      <Text style={[styles.cardCategory, { color: colors.outline }]}>{supp.category}</Text>
                      <Text style={[styles.cardName, { color: colors.onSurface }]}>{supp.name}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setMenuTarget(item)}
                      disabled={exportingSlug === item.slug}
                      style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      {exportingSlug === item.slug
                        ? <ActivityIndicator size="small" color={colors.outline} />
                        : <MaterialIcons name="more-vert" size={16} color={colors.outline} />}
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.cardSnippet, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                    {deepDivePreview(item.content)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
                <MaterialIcons name="bookmark-border" size={40} color={colors.outline} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No saved deep dives yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
                Open a supplement's Research Deep Dive and tap the bookmark icon to save it here for offline reading.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={!!menuTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuTarget(null)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuTarget(null)}>
          <Pressable
            style={[
              styles.menuSheet,
              { backgroundColor: colors.surfaceContainerLowest, paddingBottom: Math.max(insets.bottom, 16) + 12 },
            ]}
          >
            {menuSupp && (
              <Text style={[styles.menuTitle, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                {menuSupp.name}
              </Text>
            )}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => menuTarget && download(menuTarget.slug, menuTarget.content)}
              activeOpacity={0.7}
            >
              <MaterialIcons name={Platform.OS === 'android' ? 'file-download' : 'share'} size={20} color={colors.onSurface} />
              <Text style={[styles.menuRowText, { color: colors.onSurface, flex: 1 }]}>
                {Platform.OS === 'android' ? 'Download PDF' : 'Share PDF'}
              </Text>
              {menuTarget && downloadedSlugs.includes(menuTarget.slug) && (
                <MaterialIcons name="check-circle" size={16} color={colors.primary} />
              )}
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.borderCard }]} />
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => menuTarget && unsave(menuTarget.slug)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="bookmark-remove" size={20} color="#ba1a1a" />
              <Text style={[styles.menuRowText, { color: '#ba1a1a' }]}>Remove from Saved</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.borderCard }]} />
            <TouchableOpacity style={styles.menuRow} onPress={() => setMenuTarget(null)} activeOpacity={0.7}>
              <Text style={[styles.menuRowText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {toastMessage && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              backgroundColor: colors.onSurface,
              bottom: insets.bottom + 20,
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          <MaterialIcons name="check-circle" size={16} color="#ffffff" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: -0.3,
  },

  listContent: { padding: 16, paddingBottom: 60 },

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
  cardContent: { flex: 1, padding: 14 },
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
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardSnippet: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 19,
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
  },

  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  menuTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  menuRowText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 15,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 4,
  },

  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
    color: '#ffffff',
  },
});
