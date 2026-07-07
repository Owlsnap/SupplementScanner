import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { encyclopediaSupplements, type EncyclopediaCategory, type EvidenceTier } from '../../src/data/encyclopediaData';
import { t, ta } from '../../src/i18n';
import { useStack } from '../../src/contexts/StackContext';
import { useAuth, supabase } from '../../src/contexts/AuthContext';
import { API_BASE_URL } from '../../src/config/api';
import { downloadDeepDivePdf } from '../../src/utils/deepDiveExport';

const COLORS = {
  primary: '#00685f',
  surface: '#f5faf8',
  surfaceContainerLow: '#f0f5f2',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#e4e9e7',
  onSurface: '#171d1c',
  onSurfaceVariant: '#3d4947',
  outline: '#6d7a77',
};

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

const evidenceTierColors: Record<EvidenceTier, { bg: string; text: string }> = {
  Strong:    { bg: '#00685f', text: '#ffffff' },
  Moderate:  { bg: '#dbeafe', text: '#1e40af' },
  Emerging:  { bg: '#fef3c7', text: '#92400e' },
  Anecdotal: { bg: '#e4e9e7', text: '#3d4947' },
};

const bioColors: Record<string, string> = {
  Excellent: '#00685f',
  Good: '#3f6560',
  Fair: '#d97706',
  Poor: '#ba1a1a',
};

interface DosingInfo { low: string; standard: string; high: string; timing: string }
interface FormInfo { name: string; bioavailability: 'Excellent' | 'Good' | 'Fair' | 'Poor'; notes: string }
interface SynergyInfo { supplement: string; reason: string }
interface DeepDiveContent {
  whatItIs: string;
  howItWorks: string;
  dosing: DosingInfo;
  forms: FormInfo[];
  synergies: SynergyInfo[];
  cautions: string[];
}

function InfoRow({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <MaterialIcons name={icon} size={16} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function SupplementDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { inStack, toggleStack } = useStack();
  const { user } = useAuth();
  const isSignedIn = !!user;

  const supp = encyclopediaSupplements.find(s => s.slug === slug);

  const [deepDive, setDeepDive] = useState<DeepDiveContent | null>(null);
  const [ddLoading, setDdLoading] = useState(false);
  const [ddError, setDdError] = useState<string | null>(null);
  const [ddStarted, setDdStarted] = useState(false);
  const [ddSaved, setDdSaved] = useState(false);
  const [ddSaving, setDdSaving] = useState(false);
  const [ddExporting, setDdExporting] = useState(false);

  const loadDeepDive = useCallback(() => {
    if (!slug) return;
    setDdStarted(true);
    setDdLoading(true);
    setDdError(null);
    fetch(`${API_BASE_URL}/api/encyclopedia/deep-dive/${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setDeepDive(json.data);
        else setDdError(json.error || 'Failed to load');
      })
      .catch(() => setDdError('Network error — check connection'))
      .finally(() => setDdLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!user || !slug) { setDdSaved(false); return; }
    supabase
      .from('saved_deep_dives')
      .select('slug')
      .eq('user_id', user.id)
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => setDdSaved(!!data));
  }, [user?.id, slug]);

  const toggleSaveDeepDive = useCallback(async () => {
    if (!user || !slug || !deepDive || ddSaving) return;
    setDdSaving(true);
    if (ddSaved) {
      await supabase.from('saved_deep_dives').delete().eq('user_id', user.id).eq('slug', slug);
      setDdSaved(false);
    } else {
      await supabase
        .from('saved_deep_dives')
        .upsert({ user_id: user.id, slug, content: deepDive }, { onConflict: 'user_id,slug' });
      setDdSaved(true);
    }
    setDdSaving(false);
  }, [user, slug, deepDive, ddSaved, ddSaving]);

  const handleDownload = useCallback(async () => {
    if (!deepDive || !supp || ddExporting) return;
    setDdExporting(true);
    try {
      await downloadDeepDivePdf(supp.name, deepDive);
    } catch {
      setDdError('Could not generate PDF — please try again');
    } finally {
      setDdExporting(false);
    }
  }, [deepDive, supp, ddExporting]);

  if (!supp) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontFamily: 'Inter_400Regular', color: COLORS.onSurfaceVariant }}>Supplement not found</Text>
      </View>
    );
  }

  const catColor = categoryColors[supp.category];
  const catIcon = categoryIcons[supp.category];
  const badge = evidenceTierColors[supp.evidenceTier];
  const stacked = inStack(supp.slug);

  return (
    <View style={styles.root}>
      {/* Header bar */}
      <SafeAreaView edges={['top']} style={[styles.headerSafe, { backgroundColor: catColor }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (isSignedIn ? toggleStack(supp.slug) : router.push('/sign-in' as any))}
            style={[styles.stackHeaderBtn, stacked ? styles.stackHeaderBtnActive : styles.stackHeaderBtnInactive]}
            activeOpacity={0.8}
          >
            <MaterialIcons name={stacked ? 'check' : 'add'} size={16} color={stacked ? catColor : '#ffffff'} />
            <Text style={[styles.stackHeaderBtnText, { color: stacked ? catColor : '#ffffff' }]}>
              {stacked ? 'In Stack' : 'Add to Stack'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: catColor }]}>
          <View style={styles.heroMeta}>
            <View style={styles.heroIconWrap}>
              <MaterialIcons name={catIcon} size={16} color="#ffffff" />
            </View>
            <Text style={styles.heroCategoryText}>{supp.category}</Text>
            <View style={[styles.heroBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.heroBadgeText, { color: badge.text }]}>{supp.evidenceTier}</Text>
            </View>
          </View>
          <Text style={styles.heroName}>{supp.name}</Text>
          <Text style={styles.heroTagline}>{t(supp.tagline)}</Text>
        </View>

        <View style={styles.content}>
          {/* Overview */}
          <SectionCard title="Overview">
            <Text style={styles.bodyText}>{t(supp.overview)}</Text>
          </SectionCard>

          {/* Key stats */}
          <SectionCard title="At a Glance">
            <InfoRow icon="colorize" label="Typical dose" value={t(supp.typicalDose)} />
            <InfoRow icon="flag" label="Primary use" value={t(supp.primaryUse)} />
          </SectionCard>

          {/* Best for */}
          <SectionCard title="Best For">
            {supp.bestFor.map((key, i) => (
              <BulletItem key={i} text={t(key)} color={catColor} icon="check-circle" />
            ))}
          </SectionCard>

          {/* Key facts */}
          <SectionCard title="Key Facts">
            {supp.keyFacts.map((key, i) => (
              <BulletItem key={i} text={t(key)} color={catColor} icon="info" />
            ))}
          </SectionCard>

          {/* Common mistakes */}
          <SectionCard title="Common Mistakes">
            {supp.commonMistakes.map((key, i) => (
              <BulletItem key={i} text={t(key)} color="#ea580c" icon="warning" />
            ))}
          </SectionCard>

          {/* Deep Dive */}
          <View style={styles.deepDiveSection}>
            {/* Deep dive header — always visible */}
            <View style={styles.deepDiveHeader}>
              <View style={styles.deepDiveTitleRow}>
                <MaterialIcons name="auto-awesome" size={18} color={catColor} />
                <Text style={styles.deepDiveTitle}>Research Deep Dive</Text>
                {deepDive && !ddLoading && (
                  <View style={styles.deepDiveActions}>
                    <TouchableOpacity
                      onPress={toggleSaveDeepDive}
                      disabled={ddSaving}
                      style={styles.deepDiveActionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={ddSaved ? 'bookmark' : 'bookmark-border'}
                        size={20}
                        color={ddSaved ? catColor : COLORS.outline}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDownload}
                      disabled={ddExporting}
                      style={styles.deepDiveActionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      {ddExporting
                        ? <ActivityIndicator size="small" color={COLORS.outline} />
                        : <MaterialIcons name="file-download" size={20} color={COLORS.outline} />}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={styles.deepDiveSubtitle}>
                Mechanism, dosing protocols, forms, synergies & interactions
              </Text>
            </View>

            {/* Not signed in — lock gate */}
            {!isSignedIn && !ddStarted && (
              <View style={styles.ddLockContainer}>
                <View style={[styles.ddLockIconWrap, { backgroundColor: catColor + '15' }]}>
                  <MaterialIcons name="lock" size={28} color={catColor} />
                </View>
                <Text style={styles.ddLockTitle}>Sign in to unlock Deep Dives</Text>
                <Text style={styles.ddLockBody}>
                  Create a free account to access AI-generated research deep dives for every supplement.
                </Text>
                <TouchableOpacity
                  style={[styles.ddSignInBtn, { backgroundColor: catColor }]}
                  onPress={() => router.push('/sign-in' as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ddSignInBtnText}>Sign in</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Signed in, not yet started — CTA button */}
            {isSignedIn && !ddStarted && !deepDive && (
              <TouchableOpacity
                style={[styles.ddGenerateBtn, { backgroundColor: catColor }]}
                onPress={loadDeepDive}
                activeOpacity={0.85}
              >
                <MaterialIcons name="auto-awesome" size={18} color="#ffffff" />
                <View>
                  <Text style={styles.ddGenerateBtnTitle}>Generate Deep Dive</Text>
                  <Text style={styles.ddGenerateBtnSub}>~5–10 sec · Cached 30 days</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Loading */}
            {ddLoading && (
              <View style={styles.ddLoadingContainer}>
                <ActivityIndicator size="large" color={catColor} />
                <Text style={styles.ddLoadingText}>Generating deep dive…</Text>
                <Text style={styles.ddLoadingSubtext}>~5–10 seconds. Cached for 30 days after first load.</Text>
              </View>
            )}

            {/* Error */}
            {ddError && !ddLoading && (
              <View style={styles.ddErrorContainer}>
                <MaterialIcons name="error-outline" size={32} color="#ba1a1a" />
                <Text style={styles.ddErrorText}>{ddError}</Text>
                <TouchableOpacity style={[styles.retryBtn, { borderColor: catColor }]} onPress={loadDeepDive} activeOpacity={0.8}>
                  <Text style={[styles.retryBtnText, { color: catColor }]}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Content */}
            {deepDive && !ddLoading && (
              <View style={styles.ddContent}>
                <SectionCard title="What It Is">
                  <Text style={styles.bodyText}>{deepDive.whatItIs}</Text>
                </SectionCard>

                <SectionCard title="How It Works">
                  <Text style={styles.bodyText}>{deepDive.howItWorks}</Text>
                </SectionCard>

                <SectionCard title="Dosing Protocol">
                  {deepDive.dosing && (
                    <>
                      {[
                        { label: 'Conservative', value: deepDive.dosing.low },
                        { label: 'Standard', value: deepDive.dosing.standard },
                        { label: 'High / Loading', value: deepDive.dosing.high },
                      ].map(row => (
                        <View key={row.label} style={styles.dosingRow}>
                          <Text style={styles.dosingLabel}>{row.label}</Text>
                          <Text style={styles.dosingValue}>{row.value}</Text>
                        </View>
                      ))}
                      {deepDive.dosing.timing && (
                        <View style={[styles.timingBox, { borderColor: catColor + '40', backgroundColor: catColor + '0D' }]}>
                          <MaterialIcons name="schedule" size={14} color={catColor} />
                          <Text style={[styles.timingText, { color: catColor }]}>{deepDive.dosing.timing}</Text>
                        </View>
                      )}
                    </>
                  )}
                </SectionCard>

                {deepDive.forms && deepDive.forms.length > 0 && (
                  <SectionCard title="Forms & Bioavailability">
                    {deepDive.forms.map((form, i) => (
                      <View key={i} style={styles.formRow}>
                        <View style={styles.formRowTop}>
                          <Text style={styles.formName}>{form.name}</Text>
                          <View style={[styles.bioBadge, { backgroundColor: bioColors[form.bioavailability] + '20' }]}>
                            <Text style={[styles.bioBadgeText, { color: bioColors[form.bioavailability] }]}>
                              {form.bioavailability}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.formNotes}>{form.notes}</Text>
                      </View>
                    ))}
                  </SectionCard>
                )}

                {deepDive.synergies && deepDive.synergies.length > 0 && (
                  <SectionCard title="Synergies">
                    {deepDive.synergies.map((syn, i) => (
                      <View key={i} style={styles.synergyRow}>
                        <View style={styles.synergyBadge}>
                          <Text style={styles.synergyBadgeText}>+ {syn.supplement}</Text>
                        </View>
                        <Text style={styles.synergyReason}>{syn.reason}</Text>
                      </View>
                    ))}
                  </SectionCard>
                )}

                {deepDive.cautions && deepDive.cautions.length > 0 && (
                  <SectionCard title="Cautions & Interactions">
                    {deepDive.cautions.map((caution, i) => (
                      <BulletItem key={i} text={caution} color="#ea580c" icon="warning" />
                    ))}
                  </SectionCard>
                )}
              </View>
            )}
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

function BulletItem({ text, color, icon }: { text: string; color: string; icon: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <View style={styles.bulletItem}>
      <MaterialIcons name={icon} size={14} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },

  headerSafe: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  stackHeaderBtnActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  stackHeaderBtnInactive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  stackHeaderBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },

  scroll: { flex: 1 },

  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heroIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCategoryText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  heroBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
  },
  heroName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 34,
  },
  heroTagline: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },

  content: { padding: 16 },

  sectionCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(109,122,119,0.15)',
  },
  sectionCardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 14,
    color: COLORS.onSurface,
    letterSpacing: -0.2,
    marginBottom: 12,
  },

  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    lineHeight: 22,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.onSurface,
    lineHeight: 20,
  },

  bulletItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    lineHeight: 21,
  },

  // Deep dive
  deepDiveSection: { marginTop: 4 },
  deepDiveHeader: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(109,122,119,0.15)',
  },
  deepDiveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  deepDiveActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  deepDiveActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deepDiveTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 17,
    color: COLORS.onSurface,
    letterSpacing: -0.3,
  },
  deepDiveSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },

  // Lock gate
  ddLockContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(109,122,119,0.15)',
    gap: 10,
  },
  ddLockIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ddLockTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 16,
    color: COLORS.onSurface,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  ddLockBody: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  ddSignInBtn: {
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 28,
    marginTop: 4,
  },
  ddSignInBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 15,
    color: '#ffffff',
  },

  // Generate button
  ddGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  ddGenerateBtnTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  ddGenerateBtnSub: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  ddLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(109,122,119,0.15)',
  },
  ddLoadingText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 15,
    color: COLORS.onSurface,
  },
  ddLoadingSubtext: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  ddErrorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(109,122,119,0.15)',
  },
  ddErrorText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    color: '#ba1a1a',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    marginTop: 4,
  },
  retryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
  },

  ddContent: {},

  dosingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(109,122,119,0.12)',
  },
  dosingLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
  dosingValue: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
    color: COLORS.onSurface,
  },
  timingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  timingText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    flex: 1,
  },

  formRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(109,122,119,0.12)',
  },
  formRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  formName: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: COLORS.onSurface,
    flex: 1,
  },
  bioBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bioBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
  },
  formNotes: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20,
  },

  synergyRow: {
    marginBottom: 12,
  },
  synergyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e6f4f1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#b3ddd8',
  },
  synergyBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: '#00685f',
  },
  synergyReason: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
});
