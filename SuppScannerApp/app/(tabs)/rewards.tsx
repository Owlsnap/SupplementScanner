import { useState, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const COLORS = {
  primary: '#00685f',
  primaryContainer: '#008378',
  primaryFixed: '#89f5e7',
  primaryFixedDim: '#6bd8cb',
  onPrimary: '#ffffff',
  onPrimaryFixed: '#00201d',
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
  secondaryContainer: '#c2ebe3',
  onSecondaryContainer: '#456b66',
  tertiary: '#924628',
  tertiaryFixed: '#ffdbce',
  onTertiaryFixed: '#370e00',
  onTertiaryFixedVariant: '#773215',
};

const MOCK_DATA = {
  productsAdded: 14,
  peopleHelped: 1240,
  nextMilestone: 50,
  milestones: [
    {
      count: 10,
      label: '10% Off Coupon',
      status: 'claimed',
      description: 'Unlocked at 10 additions. Valid for any verified supplement brand.',
      code: 'SUPP10',
    },
    {
      count: 50,
      label: 'Premium + 20% Off',
      status: 'next',
      description: 'Unlocked at 50 additions. Get 3 months of Premium Clinical Insights.',
      remaining: 36,
    },
    {
      count: 100,
      label: 'Free Goodie Bag',
      status: 'locked',
      description: 'Unlocked at 100 additions. A physical box of verified premium samples.',
      remaining: 86,
    },
  ],
};

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [codeVisible, setCodeVisible] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 20,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60) router.navigate('/(tabs)/search');
      },
    })
  ).current;

  const progress = MOCK_DATA.productsAdded / MOCK_DATA.nextMilestone; // 0.28

  const handleViewCode = () => {
    Alert.alert('Your Reward Code', 'SUPP10', [
      { text: 'Copy & Close', style: 'default' },
    ]);
  };

  const handleAddProduct = () => {
    Alert.alert('Coming Soon', 'The ability to add missing products is coming soon!', [
      { text: 'OK', style: 'default' },
    ]);
  };

  return (
    <ScrollView {...panResponder.panHandlers}
      style={[styles.root, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <MaterialIcons name="menu" size={26} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Rewards</Text>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <MaterialIcons name="account-circle" size={28} color={COLORS.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Hero Impact Card */}
      <LinearGradient
        colors={['#00685f', '#008378']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroLeft}>
          <View style={styles.communityLabel}>
            <MaterialIcons name="people" size={14} color={COLORS.primaryFixed} />
            <Text style={styles.communityLabelText}>Community Impact</Text>
          </View>
          <Text style={styles.heroHeading}>Your{'\n'}Contributions</Text>
          <Text style={styles.heroBody}>
            You've helped{' '}
            <Text style={styles.heroBodyBold}>
              {MOCK_DATA.peopleHelped.toLocaleString()} people
            </Text>{' '}
            make informed supplement choices.
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countNumber}>{MOCK_DATA.productsAdded}</Text>
          <Text style={styles.countLabel}>Products{'\n'}Added</Text>
        </View>
      </LinearGradient>

      {/* Progress Tracker Card */}
      <View style={styles.card}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.cardTitle}>Level Progress</Text>
            <Text style={styles.progressSubtitle}>
              {MOCK_DATA.milestones[1].remaining} additions until next milestone
            </Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{MOCK_DATA.productsAdded} / {MOCK_DATA.nextMilestone}</Text>
          </View>
        </View>

        {/* Milestone markers */}
        <View style={styles.milestoneRow}>
          {/* Marker: 10 (completed) */}
          <View style={styles.milestoneItem}>
            <View style={[styles.milestoneCircle, styles.milestoneCircleComplete]}>
              <MaterialIcons name="check" size={14} color={COLORS.onPrimary} />
            </View>
            <Text style={[styles.milestoneLabel, styles.milestoneLabelComplete]}>10</Text>
          </View>

          {/* Spacer grows to push 50 to center */}
          <View style={{ flex: 1 }} />

          {/* Marker: 50 (next) */}
          <View style={styles.milestoneItem}>
            <View style={[styles.milestoneCircle, styles.milestoneCircleNext]}>
              <MaterialIcons name="lock" size={14} color={COLORS.outline} />
            </View>
            <Text style={[styles.milestoneLabel, styles.milestoneLabelNext]}>50</Text>
          </View>

          <View style={{ flex: 1 }} />

          {/* Marker: 100 (locked) */}
          <View style={styles.milestoneItem}>
            <View style={[styles.milestoneCircle, styles.milestoneCircleLocked]}>
              <MaterialIcons name="military-tech" size={14} color={COLORS.outline} />
            </View>
            <Text style={[styles.milestoneLabel, styles.milestoneLabelLocked]}>100</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>

        <Text style={styles.progressFootnote}>
          Keep scanning and adding products to unlock your next reward!
        </Text>
      </View>

      {/* Available Rewards Section */}
      <Text style={styles.sectionTitle}>Available Rewards</Text>

      {/* Card 1: Claimed */}
      <View style={[styles.rewardCard, styles.rewardCardClaimed]}>
        <View style={styles.rewardCardTopRow}>
          <View style={[styles.rewardIconCircle, styles.rewardIconCircleClaimed]}>
            <MaterialIcons name="confirmation-number" size={22} color={COLORS.primary} />
          </View>
          <View style={[styles.statusBadge, styles.statusBadgeClaimed]}>
            <MaterialIcons name="check-circle" size={12} color={COLORS.primary} />
            <Text style={[styles.statusBadgeText, styles.statusBadgeTextClaimed]}>CLAIMED</Text>
          </View>
        </View>
        <Text style={styles.rewardTitle}>10% Off Coupon</Text>
        <Text style={styles.rewardDescription}>
          {MOCK_DATA.milestones[0].description}
        </Text>
        <TouchableOpacity style={styles.viewCodeButton} onPress={handleViewCode} activeOpacity={0.8}>
          <MaterialIcons name="card-giftcard" size={16} color={COLORS.primary} />
          <Text style={styles.viewCodeButtonText}>View Code</Text>
        </TouchableOpacity>
      </View>

      {/* Card 2: Next Up */}
      <View style={[styles.rewardCard, styles.rewardCardNext]}>
        <View style={styles.nextUpPill}>
          <MaterialIcons name="star" size={12} color={COLORS.tertiary} />
          <Text style={styles.nextUpPillText}>Next Up</Text>
        </View>
        <View style={styles.rewardCardTopRow}>
          <View style={[styles.rewardIconCircle, styles.rewardIconCircleNext]}>
            <MaterialIcons name="verified" size={22} color={COLORS.primary} />
          </View>
          <View style={[styles.statusBadge, styles.statusBadgeRemaining]}>
            <Text style={[styles.statusBadgeText, styles.statusBadgeTextRemaining]}>
              {MOCK_DATA.milestones[1].remaining} to go
            </Text>
          </View>
        </View>
        <Text style={styles.rewardTitle}>Premium + 20% Off</Text>
        <Text style={styles.rewardDescription}>{MOCK_DATA.milestones[1].description}</Text>
        <View style={styles.nextUpProgressSection}>
          <View style={styles.nextUpProgressLabels}>
            <Text style={styles.nextUpProgressCurrent}>{MOCK_DATA.productsAdded} additions</Text>
            <Text style={styles.nextUpProgressGoal}>Goal: {MOCK_DATA.milestones[1].count}</Text>
          </View>
          <View style={styles.progressTrackThin}>
            <View style={[styles.progressFillThin, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>
      </View>

      {/* Card 3: Locked */}
      <View style={[styles.rewardCard, styles.rewardCardLocked]}>
        <View style={styles.rewardCardTopRow}>
          <View style={[styles.rewardIconCircle, styles.rewardIconCircleLocked]}>
            <MaterialIcons name="card-giftcard" size={22} color={COLORS.outline} />
          </View>
          <View style={[styles.statusBadge, styles.statusBadgeLocked]}>
            <MaterialIcons name="lock" size={12} color={COLORS.outline} />
            <Text style={[styles.statusBadgeText, styles.statusBadgeTextLocked]}>LOCKED</Text>
          </View>
        </View>
        <Text style={[styles.rewardTitle, styles.rewardTitleLocked]}>Free Goodie Bag</Text>
        <Text style={[styles.rewardDescription, styles.rewardDescriptionLocked]}>
          {MOCK_DATA.milestones[2].description}
        </Text>
        <View style={styles.lockedButton}>
          <MaterialIcons name="lock" size={14} color={COLORS.outline} />
          <Text style={styles.lockedButtonText}>
            {MOCK_DATA.milestones[2].remaining} more needed
          </Text>
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaCard}>
        <View style={styles.ctaImagePlaceholder}>
          <MaterialIcons name="add-photo-alternate" size={40} color={COLORS.primaryFixedDim} />
        </View>
        <Text style={styles.ctaHeading}>Spotted a missing product?</Text>
        <Text style={styles.ctaSubtitle}>
          Help the community by adding products that aren't in our database yet — and earn rewards while you're at it.
        </Text>
        <TouchableOpacity onPress={handleAddProduct} activeOpacity={0.85} style={styles.ctaButtonWrapper}>
          <LinearGradient
            colors={['#00685f', '#008378']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <MaterialIcons name="add-circle-outline" size={20} color={COLORS.onPrimary} />
            <Text style={styles.ctaButtonText}>Add a Missing Product</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Bottom padding */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginBottom: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
  },
  topBarTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    color: COLORS.primary,
    letterSpacing: 0.3,
  },

  // Hero Card
  heroCard: {
    borderRadius: 28,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroLeft: {
    flex: 1,
    marginRight: 16,
  },
  communityLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  communityLabelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.primaryFixed,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroHeading: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    color: COLORS.onPrimary,
    lineHeight: 32,
    marginBottom: 10,
  },
  heroBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 19,
  },
  heroBodyBold: {
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.primaryFixed,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  countNumber: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 40,
    color: COLORS.onPrimary,
    lineHeight: 46,
  },
  countLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.primaryFixed,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 2,
  },

  // Generic Card
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Progress Tracker
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: COLORS.onSurface,
    marginBottom: 3,
  },
  progressSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
  progressBadge: {
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  progressBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.onSecondaryContainer,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneItem: {
    alignItems: 'center',
    gap: 4,
  },
  milestoneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneCircleComplete: {
    backgroundColor: COLORS.primary,
  },
  milestoneCircleNext: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
  },
  milestoneCircleLocked: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceContainerHighest,
  },
  milestoneLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  milestoneLabelComplete: {
    color: COLORS.primary,
  },
  milestoneLabelNext: {
    color: COLORS.onSurfaceVariant,
  },
  milestoneLabelLocked: {
    color: COLORS.outline,
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#eaefed',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  progressFootnote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.outline,
    textAlign: 'center',
  },

  // Section Title
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    color: COLORS.onSurface,
    marginBottom: 12,
    marginTop: 4,
  },

  // Reward Cards
  rewardCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rewardCardClaimed: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  rewardCardNext: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: 'rgba(0,104,95,0.2)',
  },
  rewardCardLocked: {
    backgroundColor: COLORS.surfaceContainerLow,
    opacity: 0.85,
  },
  rewardCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  rewardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconCircleClaimed: {
    backgroundColor: COLORS.secondaryContainer,
  },
  rewardIconCircleNext: {
    backgroundColor: 'rgba(0,104,95,0.1)',
  },
  rewardIconCircleLocked: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeClaimed: {
    backgroundColor: 'rgba(0,104,95,0.1)',
  },
  statusBadgeRemaining: {
    backgroundColor: COLORS.tertiaryFixed,
  },
  statusBadgeLocked: {
    backgroundColor: COLORS.surfaceContainerHighest,
  },
  statusBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  statusBadgeTextClaimed: {
    color: COLORS.primary,
  },
  statusBadgeTextRemaining: {
    color: COLORS.onTertiaryFixedVariant,
  },
  statusBadgeTextLocked: {
    color: COLORS.outline,
  },
  rewardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    color: COLORS.onSurface,
    marginBottom: 6,
  },
  rewardTitleLocked: {
    color: COLORS.onSurfaceVariant,
  },
  rewardDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 19,
    marginBottom: 16,
  },
  rewardDescriptionLocked: {
    color: COLORS.outline,
  },

  // View Code Button
  viewCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,104,95,0.05)',
  },
  viewCodeButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.primary,
  },

  // Next Up Pill
  nextUpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.tertiaryFixed,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  nextUpPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.onTertiaryFixedVariant,
    letterSpacing: 0.3,
  },

  // Next Up Progress
  nextUpProgressSection: {
    gap: 6,
  },
  nextUpProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nextUpProgressCurrent: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.primary,
  },
  nextUpProgressGoal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.outline,
  },
  progressTrackThin: {
    height: 8,
    backgroundColor: '#eaefed',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFillThin: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },

  // Locked Button
  lockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceContainerHighest,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  lockedButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.outline,
  },

  // CTA Section
  ctaCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ctaImagePlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0,104,95,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 2,
    borderColor: 'rgba(0,104,95,0.12)',
  },
  ctaHeading: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    color: COLORS.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  ctaButtonWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  ctaButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: COLORS.onPrimary,
    letterSpacing: 0.2,
  },
});
