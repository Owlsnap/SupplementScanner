import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStack } from '../../src/contexts/StackContext';
import { encyclopediaSupplements } from '../../src/data/encyclopediaData';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth, supabase } from '../../src/contexts/AuthContext';

const APP_VERSION = '1.0.0';

const GOALS = [
  { key: 'muscle', label: 'Build Muscle', icon: 'fitness-center' as const },
  { key: 'fat', label: 'Lose Fat', icon: 'local-fire-department' as const },
  { key: 'energy', label: 'Energy & Focus', icon: 'bolt' as const },
  { key: 'sleep', label: 'Better Sleep', icon: 'bedtime' as const },
  { key: 'immune', label: 'Immune Support', icon: 'shield' as const },
  { key: 'performance', label: 'Athletic Performance', icon: 'directions-run' as const },
  { key: 'cognition', label: 'Cognitive Focus', icon: 'psychology' as const },
  { key: 'health', label: 'General Health', icon: 'eco' as const },
];

const DIET_OPTIONS = [
  'Standard', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-free', 'Dairy-free',
];

const AGE_RANGES = [
  { key: 'under_25', label: 'Under 25' },
  { key: '25_34', label: '25–34' },
  { key: '35_44', label: '35–44' },
  { key: '45_54', label: '45–54' },
  { key: '55_plus', label: '55+' },
];

const TRAINING_LEVELS = [
  { key: 'sedentary', label: 'Sedentary' },
  { key: 'lightly_active', label: 'Lightly active' },
  { key: 'moderately_active', label: 'Moderately active' },
  { key: 'very_active', label: 'Very active' },
  { key: 'athlete', label: 'Athlete' },
];

interface Profile {
  goal: string;
  diet: string[];
  age_range: string;
  training_level: string;
}

const DEFAULT_PROFILE: Profile = {
  goal: '',
  diet: [],
  age_range: '',
  training_level: '',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { stack } = useStack();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 2 && Math.abs(gs.dx) > 40,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60) router.navigate('/(tabs)/saved-deep-dives' as any);
      },
    })
  ).current;

  useEffect(() => {
    if (!user) { setProfile(DEFAULT_PROFILE); setProfileLoading(false); return; }
    setProfileLoading(true);
    supabase
      .from('user_health_profiles')
      .select('goal, diet, age_range, training_level')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data
          ? {
              goal: data.goal ?? '',
              diet: data.diet ?? [],
              age_range: data.age_range ?? '',
              training_level: data.training_level ?? '',
            }
          : DEFAULT_PROFILE);
        setProfileLoading(false);
      });
  }, [user?.id]);

  const update = (patch: Partial<Profile>) => {
    setProfile(p => ({ ...p, ...patch }));
    setSaved(false);
  };

  const toggleDiet = (d: string) => {
    update({ diet: profile.diet.includes(d) ? profile.diet.filter(x => x !== d) : [...profile.diet, d] });
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('user_health_profiles').upsert(
      {
        user_id: user.id,
        goal: profile.goal,
        diet: profile.diet,
        age_range: profile.age_range,
        training_level: profile.training_level,
      },
      { onConflict: 'user_id' }
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const stackSupplements = encyclopediaSupplements.filter(s => stack.includes(s.slug));

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} {...panResponder.panHandlers}>
      <SafeAreaView edges={['top']} style={[styles.topBarSafe, { backgroundColor: colors.surface }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.topBarTitle, { color: colors.onSurface }]}>My Profile</Text>
          <TouchableOpacity
            onPress={() => setSettingsVisible(true)}
            style={[styles.settingsBtn, { backgroundColor: colors.surfaceContainerLow }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="settings" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {authLoading || (user && profileLoading) ? (
          <View style={styles.gateContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !user ? (
          <View style={styles.gateContainer}>
            <View style={[styles.gateIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
              <MaterialIcons name="person-outline" size={40} color={colors.outline} />
            </View>
            <Text style={[styles.gateTitle, { color: colors.onSurface }]}>Sign in to build your profile</Text>
            <Text style={[styles.gateSubtitle, { color: colors.onSurfaceVariant }]}>
              Your stack and health profile sync across devices once you sign in.
            </Text>
            <TouchableOpacity
              style={[styles.gateBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/sign-in' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.gateBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <>
        {/* My Stack summary */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>My Stack</Text>
          {stackSupplements.length === 0 ? (
            <View style={styles.emptyStackRow}>
              <Text style={[styles.emptyStackText, { color: colors.onSurfaceVariant }]}>No supplements added yet.</Text>
              <TouchableOpacity onPress={() => router.navigate('/(tabs)' as any)} activeOpacity={0.8}>
                <Text style={[styles.emptyStackLink, { color: colors.primary }]}>Browse Index →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.stackPills}>
                {stackSupplements.map(s => (
                  <View key={s.slug} style={[
                    styles.stackPill,
                    { backgroundColor: isDark ? colors.surfaceContainerLow : '#e6f4f1', borderColor: isDark ? colors.border : '#b3ddd8' },
                  ]}>
                    <Text style={[styles.stackPillText, { color: colors.primary }]}>{s.name}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.evaluateBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.navigate('/(tabs)/stack' as any)}
                activeOpacity={0.85}
              >
                <MaterialIcons name="auto-awesome" size={16} color="#ffffff" />
                <Text style={styles.evaluateBtnText}>View & Evaluate Stack</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Goal */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Primary Goal</Text>
          <View style={styles.chipWrap}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.key}
                onPress={() => update({ goal: profile.goal === g.key ? '' : g.key })}
                style={[
                  styles.goalChip,
                  profile.goal === g.key
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.border },
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={g.icon}
                  size={15}
                  color={profile.goal === g.key ? '#ffffff' : colors.onSurfaceVariant}
                />
                <Text style={[styles.goalChipText, { color: profile.goal === g.key ? '#ffffff' : colors.onSurfaceVariant }]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Diet */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Dietary Preference</Text>
          <View style={styles.chipWrap}>
            {DIET_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => toggleDiet(d)}
                style={[
                  styles.chip,
                  profile.diet.includes(d)
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.border },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: profile.diet.includes(d) ? '#ffffff' : colors.onSurfaceVariant }]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Age Range</Text>
          <View style={styles.chipWrap}>
            {AGE_RANGES.map(a => (
              <TouchableOpacity
                key={a.key}
                onPress={() => update({ age_range: profile.age_range === a.key ? '' : a.key })}
                style={[
                  styles.chip,
                  profile.age_range === a.key
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.border },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: profile.age_range === a.key ? '#ffffff' : colors.onSurfaceVariant }]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activity */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Activity Level</Text>
          <View style={styles.chipWrap}>
            {TRAINING_LEVELS.map(lv => (
              <TouchableOpacity
                key={lv.key}
                onPress={() => update({ training_level: profile.training_level === lv.key ? '' : lv.key })}
                style={[
                  styles.chip,
                  profile.training_level === lv.key
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.border },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: profile.training_level === lv.key ? '#ffffff' : colors.onSurfaceVariant }]}>
                  {lv.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            saved
              ? { backgroundColor: isDark ? colors.surfaceContainerLow : '#e6f4f1', borderWidth: 1.5, borderColor: isDark ? colors.border : '#b3ddd8' }
              : { backgroundColor: colors.primary },
          ]}
          onPress={save}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#ffffff" />
            : saved
              ? <><MaterialIcons name="check-circle" size={18} color={colors.primary} /><Text style={[styles.saveBtnText, { color: colors.primary }]}>Profile saved</Text></>
              : <Text style={[styles.saveBtnText, { color: '#ffffff' }]}>Save Profile</Text>
          }
        </TouchableOpacity>
        </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Settings</Text>
            <TouchableOpacity onPress={() => setSettingsVisible(false)} activeOpacity={0.7}>
              <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={[styles.modalSectionLabel, { color: colors.outline }]}>APPEARANCE</Text>
            <View style={[styles.modalCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingRowLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.surfaceContainerLow }]}>
                    <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Dark Mode</Text>
                    <Text style={[styles.settingSubLabel, { color: colors.onSurfaceVariant }]}>{isDark ? 'On' : 'Off'}</Text>
                  </View>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            <Text style={[styles.modalSectionLabel, { color: colors.outline }]}>ACCOUNT</Text>
            <View style={[styles.modalCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}>
              {user ? (
                <TouchableOpacity
                  style={styles.settingRow}
                  activeOpacity={0.7}
                  onPress={() => { setSettingsVisible(false); signOut(); }}
                >
                  <View style={styles.settingRowLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.surfaceContainerLow }]}>
                      <MaterialIcons name="person" size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Sign Out</Text>
                      <Text style={[styles.settingSubLabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>{user.email}</Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.settingRow}
                  activeOpacity={0.7}
                  onPress={() => { setSettingsVisible(false); router.push('/sign-in' as any); }}
                >
                  <View style={styles.settingRowLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.surfaceContainerLow }]}>
                      <MaterialIcons name="person" size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Sign In</Text>
                      <Text style={[styles.settingSubLabel, { color: colors.onSurfaceVariant }]}>Sync across devices</Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                </TouchableOpacity>
              )}
              <View style={[styles.settingDivider, { backgroundColor: colors.borderCard }]} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => { setSettingsVisible(false); router.push('/premium' as any); }}
                activeOpacity={0.7}
              >
                <View style={styles.settingRowLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.surfaceContainerLow }]}>
                    <MaterialIcons name="star" size={18} color="#f59e0b" />
                  </View>
                  <View>
                    <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Upgrade to Premium</Text>
                    <Text style={[styles.settingSubLabel, { color: colors.onSurfaceVariant }]}>Deep dives, evaluations & more</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
              </TouchableOpacity>
              {user && (
                <>
                  <View style={[styles.settingDivider, { backgroundColor: colors.borderCard }]} />
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => { setSettingsVisible(false); router.push('/(tabs)/saved-deep-dives' as any); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingRowLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: colors.surfaceContainerLow }]}>
                        <MaterialIcons name="bookmark" size={18} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Saved Deep Dives</Text>
                        <Text style={[styles.settingSubLabel, { color: colors.onSurfaceVariant }]}>Bookmarked research, download as PDF</Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text style={[styles.modalSectionLabel, { color: colors.outline }]}>ABOUT</Text>
            <View style={[styles.modalCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingRowLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.surfaceContainerLow }]}>
                    <MaterialIcons name="info" size={18} color={colors.onSurfaceVariant} />
                  </View>
                  <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Version</Text>
                </View>
                <Text style={[styles.settingValue, { color: colors.onSurfaceVariant }]}>{APP_VERSION}</Text>
              </View>
              <View style={[styles.settingDivider, { backgroundColor: colors.borderCard }]} />
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
                <View style={styles.settingRowLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.surfaceContainerLow }]}>
                    <MaterialIcons name="privacy-tip" size={18} color={colors.onSurfaceVariant} />
                  </View>
                  <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Privacy Policy</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
              </TouchableOpacity>
              <View style={[styles.settingDivider, { backgroundColor: colors.borderCard }]} />
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
                <View style={styles.settingRowLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.surfaceContainerLow }]}>
                    <MaterialIcons name="mail" size={18} color={colors.onSurfaceVariant} />
                  </View>
                  <View>
                    <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Contact Support</Text>
                    <Text style={[styles.settingSubLabel, { color: colors.onSurfaceVariant }]}>supplementscanner.io@gmail.com</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  content: { padding: 16 },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: -0.2,
    marginBottom: 12,
  },

  emptyStackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyStackText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
  },
  emptyStackLink: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
  },
  stackPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  stackPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  stackPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
  },
  evaluateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  evaluateBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#ffffff',
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  goalChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 28,
    paddingVertical: 15,
    marginTop: 4,
    marginBottom: 16,
  },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 16,
  },

  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  gateContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  gateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gateTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  gateSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  gateBtn: {
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  gateBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 15,
    color: '#ffffff',
  },

  // Settings Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  modalScroll: { flex: 1 },
  modalContent: { padding: 16, paddingBottom: 48 },
  modalSectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 15,
  },
  settingSubLabel: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
    marginTop: 1,
  },
  settingValue: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
  },
  settingDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
});
