import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { encyclopediaSupplements, type EncyclopediaCategory } from '../src/data/encyclopediaData';
import { useAuth, supabase } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { downloadDeepDivePdf, type DeepDiveContent } from '../src/utils/deepDiveExport';

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
  const { colors } = useTheme();
  const { user } = useAuth();
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingSlug, setExportingSlug] = useState<string | null>(null);

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
    setRows(prev => prev.filter(r => r.slug !== slug));
    await supabase.from('saved_deep_dives').delete().eq('user_id', user.id).eq('slug', slug);
  };

  const download = async (slug: string, content: DeepDiveContent) => {
    const supp = encyclopediaSupplements.find(s => s.slug === slug);
    if (!supp || exportingSlug) return;
    setExportingSlug(slug);
    try {
      await downloadDeepDivePdf(supp.name, content);
    } finally {
      setExportingSlug(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <SafeAreaView edges={['top']} style={[styles.topBarSafe, { backgroundColor: colors.surface }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
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
                      onPress={() => download(item.slug, item.content)}
                      disabled={exportingSlug === item.slug}
                      style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      {exportingSlug === item.slug
                        ? <ActivityIndicator size="small" color={colors.outline} />
                        : <MaterialIcons name="file-download" size={16} color={colors.outline} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => unsave(item.slug)}
                      style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="bookmark-remove" size={16} color={colors.outline} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.cardSnippet, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                    {item.content?.whatItIs}
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
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
});
