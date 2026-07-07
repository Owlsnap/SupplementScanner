import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../src/config/api';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

type Plan = 'monthly' | 'yearly';

const FREE_FEATURES = [
  'Supplement Index (70+ supps)',
  'Basic supplement info',
  'Personal stack tracking',
  'Health profile',
  '3 deep dives / month',
];

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Unlimited AI deep dives',
  'Stack evaluation & scoring',
  'Interaction & safety check',
  'Gap analysis & suggestions',
  'Cross-device sync',
  'Priority support',
];

const FEATURE_TABLE = [
  { label: 'Supplement Index', free: true, premium: true },
  { label: 'Personal Stack', free: true, premium: true },
  { label: 'Health Profile', free: true, premium: true },
  { label: 'AI Deep Dives', free: '3 / month', premium: 'Unlimited' },
  { label: 'Stack Evaluation', free: false, premium: true },
  { label: 'Interaction Check', free: false, premium: true },
  { label: 'Gap Analysis', free: false, premium: true },
  { label: 'Cross-device Sync', free: false, premium: true },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { session, isPremium, refreshPremiumStatus } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  const isAndroid = Platform.OS === 'android';

  const handleSubscribe = async (plan: Plan) => {
    if (!isAndroid) {
      Alert.alert(
        'Coming soon on iOS',
        'Subscriptions on iOS are on the way. For now, subscribe from an Android device.'
      );
      return;
    }

    if (!session) {
      router.push('/sign-in' as any);
      return;
    }

    if (isPremium) return;

    setLoadingPlan(plan);
    try {
      const redirectTo = Linking.createURL('premium-callback');
      const res = await fetch(`${API_BASE_URL}/api/payment/create-subscription-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan,
          successUrl: `${redirectTo}?subscribed=1`,
          cancelUrl: redirectTo,
        }),
      });
      const data = await res.json();
      if (!data.url) {
        Alert.alert('Something went wrong', data.error || 'Please try again.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return;

      const { queryParams } = Linking.parse(result.url);
      if (queryParams?.subscribed === '1') {
        // Stripe's webhook writes the subscription row asynchronously — give it a moment.
        await new Promise(r => setTimeout(r, 1500));
        await refreshPremiumStatus();
        Alert.alert('Welcome to Premium', 'Your subscription is now active.');
        router.back();
      }
    } catch {
      Alert.alert('Network error', 'Please check your connection and try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <LinearGradient
          colors={['#00685f', '#004d46']}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroBadge}>
            <MaterialIcons name="star" size={14} color="#f59e0b" />
            <Text style={styles.heroBadgeText}>PREMIUM</Text>
          </View>
          <Text style={styles.heroTitle}>Unlock your full{'\n'}supplement potential</Text>
          <Text style={styles.heroSubtitle}>
            AI-powered analysis, stack evaluation, and personalised recommendations — all in one place.
          </Text>

          <View style={styles.heroFeatures}>
            {['Unlimited deep dives', 'Stack evaluation', 'Gap analysis'].map(f => (
              <View key={f} style={styles.heroFeatureRow}>
                <View style={styles.heroCheckCircle}>
                  <MaterialIcons name="check" size={12} color="#00685f" />
                </View>
                <Text style={styles.heroFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Pricing cards */}
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Choose your plan</Text>
          {!isAndroid && (
            <Text style={[styles.disclaimer, { color: colors.outline, marginBottom: 14 }]}>
              iOS subscriptions are coming soon — available on Android now.
            </Text>
          )}
          <View style={styles.pricingRow}>
            {/* Monthly */}
            <View style={[styles.pricingCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}>
              <Text style={[styles.planLabel, { color: colors.onSurfaceVariant }]}>Monthly</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceCurrency, { color: colors.onSurface }]}>kr</Text>
                <Text style={[styles.priceAmount, { color: colors.onSurface }]}>79</Text>
              </View>
              <Text style={[styles.pricePer, { color: colors.outline }]}>per month</Text>
              <TouchableOpacity
                style={[styles.planBtn, styles.planBtnOutline, { borderColor: colors.primary }]}
                activeOpacity={0.85}
                disabled={loadingPlan !== null}
                onPress={() => handleSubscribe('monthly')}
              >
                {loadingPlan === 'monthly' ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={[styles.planBtnText, { color: colors.primary }]}>Get Monthly</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Yearly */}
            <View style={[styles.pricingCard, styles.pricingCardBest, { backgroundColor: colors.primary }]}>
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <Text style={[styles.planLabel, { color: 'rgba(255,255,255,0.75)' }]}>Yearly</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceCurrency, { color: '#ffffff' }]}>kr</Text>
                <Text style={[styles.priceAmount, { color: '#ffffff' }]}>599</Text>
              </View>
              <Text style={[styles.pricePer, { color: 'rgba(255,255,255,0.7)' }]}>per year · save 37%</Text>
              <TouchableOpacity
                style={[styles.planBtn, styles.planBtnSolid]}
                activeOpacity={0.85}
                disabled={loadingPlan !== null}
                onPress={() => handleSubscribe('yearly')}
              >
                {loadingPlan === 'yearly' ? (
                  <ActivityIndicator color="#00685f" />
                ) : (
                  <Text style={[styles.planBtnText, { color: '#00685f' }]}>Get Yearly</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Feature comparison */}
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>What's included</Text>
          <View style={[styles.comparisonCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderCard }]}>
            {/* Header */}
            <View style={[styles.compRow, styles.compHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.compFeatureLabel, { color: colors.onSurfaceVariant }]}>Feature</Text>
              <View style={styles.compCols}>
                <Text style={[styles.compColLabel, { color: colors.onSurfaceVariant }]}>Free</Text>
                <Text style={[styles.compColLabel, { color: colors.primary }]}>Premium</Text>
              </View>
            </View>
            {FEATURE_TABLE.map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.compRow,
                  i < FEATURE_TABLE.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderCard },
                ]}
              >
                <Text style={[styles.compFeatureLabel, { color: colors.onSurface }]}>{row.label}</Text>
                <View style={styles.compCols}>
                  <View style={styles.compCell}>
                    {row.free === true ? (
                      <MaterialIcons name="check" size={16} color={colors.outline} />
                    ) : row.free === false ? (
                      <MaterialIcons name="remove" size={16} color={colors.surfaceContainerHigh} />
                    ) : (
                      <Text style={[styles.compCellText, { color: colors.onSurfaceVariant }]}>{row.free}</Text>
                    )}
                  </View>
                  <View style={styles.compCell}>
                    {row.premium === true ? (
                      <MaterialIcons name="check" size={16} color={colors.primary} />
                    ) : (
                      <Text style={[styles.compCellText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{row.premium}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Disclaimer */}
          <Text style={[styles.disclaimer, { color: colors.outline }]}>
            Subscriptions renew automatically. Cancel any time in your App Store or Google Play account settings. Prices in SEK and may vary by region.
          </Text>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingBottom: 0 },

  hero: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  heroBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    color: '#f59e0b',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 30,
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
    marginBottom: 24,
  },
  heroFeatures: { gap: 10 },
  heroFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFeatureText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#ffffff',
  },

  body: { padding: 20 },

  sectionTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.3,
    marginBottom: 14,
    marginTop: 4,
  },

  pricingRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  pricingCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pricingCardBest: {
    borderWidth: 0,
  },
  bestValueBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bestValueText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 0.6,
  },
  planLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginBottom: 2,
  },
  priceCurrency: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 16,
    paddingBottom: 4,
  },
  priceAmount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 38,
    letterSpacing: -1,
    lineHeight: 44,
  },
  pricePer: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
    marginBottom: 16,
  },
  planBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  planBtnOutline: {
    borderWidth: 1.5,
  },
  planBtnSolid: {
    backgroundColor: '#ffffff',
  },
  planBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
  },

  comparisonCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 20,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  compHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compFeatureLabel: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
  },
  compCols: {
    flexDirection: 'row',
    gap: 0,
  },
  compColLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
    width: 72,
    textAlign: 'center',
  },
  compCell: {
    width: 72,
    alignItems: 'center',
  },
  compCellText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
    textAlign: 'center',
  },

  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
