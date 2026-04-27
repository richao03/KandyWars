import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated as RNAnimated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { triggerTieredHaptic } from '../../src/utils/hapticTier';
import { SparkController } from '../../src/utils/sparkController';
import { JOKER_IDS, hasJokerById } from '../../src/constants/jokerIds';
import { Joker as JokerType, useJokers } from '../../src/hooks/useJokers';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { addBalance, selectBalance } from '../../src/store/slices/walletSlice';
import { selectReduceMotion } from '../../src/store/slices/juiceSettingsSlice';
import {
  STANDARDIZED_JOKERS,
  StandardizedJoker,
  getJokerEffectsAtLevel,
} from '../../src/utils/jokerEffectEngine';
import { MusicController } from '../../src/utils/musicController';
import { SoundEffects, playCoinCascade } from '../../src/utils/soundEffects';
import { formatNumber } from '../../src/utils/priceUtils';
import JokerCard from './JokerCard';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
// PressableScale for press-down spring feedback (I3 game-feel) —
// applied via JokerCard's onPress CardWrapper (PressableScale internally)

const UPGRADE_COSTS: Record<number, number> = {
  1: 5000, // L1 → L2
  2: 30000, // L2 → L3
};

const LEVEL_COLORS = { 1: '#22c55e', 2: '#3b82f6', 3: '#a855f7' } as const;

interface JokerSelectionProps {
  jokers: StandardizedJoker[];
  /** @deprecated — themes were unified. Prop kept temporarily for caller compatibility; ignored. */
  theme?: string;
  onComplete: () => void;
  rewardTier?: 1 | 2 | 3;
  completionLevel?: 1 | 2 | 3;
  headerText?: string;
  /** Hide the Level Up / Sell Joker buttons. Use for lighter-weight reward flows
   * (e.g. Hallway Hustle) where the user should just pick or continue. Defaults to true. */
  showSellAndUpgrade?: boolean;
}

export default function JokerSelection({
  jokers,
  theme: _theme,
  onComplete,
  rewardTier = 3,
  completionLevel = 3,
  headerText,
  showSellAndUpgrade = true,
}: JokerSelectionProps) {
  const [availableJokers, setAvailableJokers] = useState<StandardizedJoker[]>(
    []
  );
  const [chosenJokerId, setChosenJokerId] = useState<string | number | null>(
    null
  );
  const [dismissedOthers, setDismissedOthers] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const unchoseAnims = useRef<Record<string, RNAnimated.Value>>({}).current;
  // Per-card animated values for the shatter-sell effect
  const sellScaleAnims = useRef<Record<string, RNAnimated.Value>>({});
  const sellOpacityAnims = useRef<Record<string, RNAnimated.Value>>({});
  // Per-card view refs for measureInWindow (sell modal)
  const sellCardRefs = useRef<Record<string, View | null>>({});
  // Cache of measured card positions keyed by joker id
  const sellCardPositions = useRef<Record<string, { x: number; y: number }>>({});
  const dispatch = useAppDispatch();
  const balance = useAppSelector(selectBalance);
  const {
    addJoker,
    removeJoker,
    jokers: activeJokers,
    jokersOwned,
    lockedJokerIds,
    persistentJokerCount,
    maxPersistentSlots,
    canAddPersistentJoker,
    isJokerPersistent: isJokerPersistentCheck,
    upgradeJoker: upgradeJokerAction,
    getOwnedJokerLevel,
  } = useJokers();
  const hallPassModifiers = useAppSelector((state) => state.hallPassModifiers);
  const reduceMotion = useAppSelector(selectReduceMotion);

  // Play victory music when component mounts
  useEffect(() => {
    MusicController.setTrack('victory');
  }, []);

  // Generate available jokers on mount (but don't grant them yet)
  useEffect(() => {
    if (hasGenerated) return;
    setHasGenerated(true);

    // Filter to jokers the player doesn't already own
    const ownedIds = new Set(jokersOwned.map((j) => j.id.toString()));
    const available = jokers.filter((j) => !ownedIds.has(j.id.toString()));

    if (available.length === 0) {
      setAvailableJokers([]);
      return;
    }

    // Extra Credit joker gives +1 to selection count
    const extraCreditBonus = hasJokerById(jokersOwned, JOKER_IDS.EXTRA_CREDIT)
      ? 1
      : 0;
    // Valedictorian Vendor hall pass gives +1 joker selection
    const hallPassJokerBonus = hallPassModifiers?.jokerBonusCount ?? 0;
    const jokerCount = Math.min(
      completionLevel + extraCreditBonus + hallPassJokerBonus,
      available.length
    );
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, jokerCount);

    setAvailableJokers(selected);
  }, []);

  // Initialize animation values for each joker
  const getAnim = useCallback(
    (id: string | number) => {
      const key = id.toString();
      if (!unchoseAnims[key]) {
        unchoseAnims[key] = new RNAnimated.Value(1);
      }
      return unchoseAnims[key];
    },
    [unchoseAnims]
  );

  // Claim a joker when tapped — only one allowed
  const handleClaimJoker = (joker: StandardizedJoker) => {
    if (chosenJokerId !== null) return;

    const isOneTime = joker.type === 'one-time';
    const jokerToAdd: JokerType = {
      id: joker.id,
      name: joker.name,
      description: joker.description,
      type: isOneTime ? 'one-time' : 'persistent',
      effect: '',
      effects: joker.effects,
      level: 1,
    };

    // Block persistent (aura) jokers if slots are full
    if (!isOneTime && !canAddPersistentJoker()) {
      return;
    }

    addJoker(jokerToAdd, 'minigame');
    setChosenJokerId(joker.id);
    SoundEffects.playAchievementSound();

    // Wobble the chosen joker
    const chosenAnim = getAnim(joker.id);
    const chosenWobble = RNAnimated.sequence([
      RNAnimated.timing(chosenAnim, { toValue: 1.1, duration: 80, useNativeDriver: true }),
      RNAnimated.timing(chosenAnim, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      RNAnimated.timing(chosenAnim, { toValue: 1.05, duration: 60, useNativeDriver: true }),
      RNAnimated.timing(chosenAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]);

    // Fade out the unchosen jokers
    const others = availableJokers.filter((j) => j.id !== joker.id);
    if (others.length === 0) {
      chosenWobble.start(() => setDismissedOthers(true));
      return;
    }

    const dismissAnims = others.map((j) => {
      const anim = getAnim(j.id);
      return RNAnimated.timing(anim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      });
    });

    // Wobble chosen + dismiss others in parallel
    RNAnimated.parallel([
      chosenWobble,
      RNAnimated.stagger(80, dismissAnims),
    ]).start(() => {
      setDismissedOthers(true);
    });
  };

  // Get upgradeable owned jokers (level < maxLevel)
  const upgradeableJokers = useMemo(() => {
    return jokersOwned
      .map((owned) => {
        const standardized = STANDARDIZED_JOKERS.find(
          (sj) => sj.id.toString() === owned.id.toString()
        );
        if (!standardized) return null;
        const currentLevel = (owned as any).level ?? 1;
        const maxLevel = standardized.maxLevel ?? 1;
        if (currentLevel >= maxLevel) return null;
        const cost = UPGRADE_COSTS[currentLevel];
        if (!cost) return null;
        return {
          id: owned.id,
          name: owned.name || standardized.name,
          description: standardized.description,
          currentLevel,
          maxLevel,
          cost,
          type: standardized.type,
        };
      })
      .filter(Boolean)
      .filter((j) => j!.cost <= balance) as Array<{
      id: string | number;
      name: string;
      description: string;
      currentLevel: number;
      maxLevel: number;
      cost: number;
      type: string;
    }>;
  }, [jokersOwned, balance]);

  const [upgradeConfirmJoker, setUpgradeConfirmJoker] = useState<
    (typeof upgradeableJokers)[number] | null
  >(null);

  const handleUpgrade = (jokerId: string | number) => {
    const joker = upgradeableJokers.find(
      (j) => j.id.toString() === jokerId.toString()
    );
    if (!joker) return;
    if (balance < joker.cost) return;

    dispatch(addBalance(-joker.cost));
    upgradeJokerAction(jokerId.toString());
    SoundEffects.playAchievementSound();
    setUpgradeConfirmJoker(null);
  };

  // Build a readable summary of effect values at a given level
  const describeEffectsAtLevel = (jokerId: number, level: number): string => {
    const effects = getJokerEffectsAtLevel(jokerId, level);
    if (effects.length === 0) return 'No effects';

    return effects
      .map((e) => {
        const op =
          e.operation === 'multiply' ? 'x' : e.operation === 'add' ? '+' : '';
        const amt =
          e.operation === 'multiply' ? `${e.amount}x` : `${op}${e.amount}`;
        const target = (e.target || '').replace(/_/g, ' ');
        const cond = e.conditions
          ? Object.values(e.conditions)
              .filter((v) => v !== undefined && v !== -1)
              .join(' ')
          : '';
        return `${amt} ${target}${cond ? ` (${cond})` : ''}`;
      })
      .join(', ');
  };

  // Sell price scales by joker level
  const getJokerSellPrice = (level: number) => {
    if (level >= 3) return 15000;
    if (level >= 2) return 5000;
    return 500;
  };

  // Sellable jokers: currently active jokers (not locked)
  const sellableJokers = useMemo(() => {
    return activeJokers
      .filter((j) => !lockedJokerIds?.includes(j.id.toString()))
      .map((j) => {
        const standardized = STANDARDIZED_JOKERS.find(
          (sj) => sj.id.toString() === j.id.toString()
        );
        return {
          id: j.id,
          name: j.name || standardized?.name || 'Unknown',
          description: standardized?.description || (j as any).description || '',
          type: j.type,
          level: (j as any).level ?? 1,
        };
      });
  }, [activeJokers, lockedJokerIds]);

  // Lazily create per-card sell animation values
  const getSellAnim = (id: string | number) => {
    const key = id.toString();
    if (!sellScaleAnims.current[key]) {
      sellScaleAnims.current[key] = new RNAnimated.Value(1);
    }
    if (!sellOpacityAnims.current[key]) {
      sellOpacityAnims.current[key] = new RNAnimated.Value(1);
    }
    return {
      scale: sellScaleAnims.current[key],
      opacity: sellOpacityAnims.current[key],
    };
  };

  const handleSellJoker = (jokerId: string | number, level: number = 1) => {
    const key = jokerId.toString();
    const { scale, opacity } = getSellAnim(jokerId);

    // Determine burst origin: use measured position or fall back to screen center
    const screenCenter = {
      x: Dimensions.get('window').width / 2,
      y: Dimensions.get('window').height / 2,
    };
    const cachedPos = sellCardPositions.current[key];
    const burstOrigin = cachedPos ?? screenCenter;

    // Fire sound + haptic immediately (visual feedback before state change).
    // Spark burst is skipped under reduce-motion.
    playCoinCascade();
    triggerTieredHaptic(0.5, 'success');
    if (!reduceMotion) {
      SparkController.burst({ origin: burstOrigin, tier: 'silver', count: 6 });
    }

    if (reduceMotion) {
      // Reduce-motion path: skip shatter, snap-apply state immediately
      removeJoker(jokerId);
      dispatch(addBalance(getJokerSellPrice(level)));
      delete sellCardPositions.current[key];
      return;
    }

    // Card scale+fade shatter: 1 → 1.1 → 0 over 250ms
    const shatterAnim = RNAnimated.parallel([
      RNAnimated.sequence([
        RNAnimated.timing(scale, {
          toValue: 1.1,
          duration: 80,
          useNativeDriver: true,
        }),
        RNAnimated.timing(scale, {
          toValue: 0,
          duration: 170,
          useNativeDriver: true,
        }),
      ]),
      RNAnimated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]);

    // Start shatter animation, then dispatch state updates
    shatterAnim.start(() => {
      removeJoker(jokerId);
      dispatch(addBalance(getJokerSellPrice(level)));
      // Reset animation values for potential re-use
      scale.setValue(1);
      opacity.setValue(1);
      delete sellCardPositions.current[key];
    });
  };

  // Build a JokerCard-compatible object from an id + level
  const toCardJoker = (id: string | number, level?: number) => {
    const std = STANDARDIZED_JOKERS.find(
      (sj) => sj.id.toString() === id.toString()
    );
    const owned = jokersOwned.find((j) => j.id.toString() === id.toString());
    return {
      id: Number(id),
      name: owned?.name || std?.name || 'Unknown',
      type: (std?.type === 'one-time' ? 'one-time' : 'persistent') as
        | 'one-time'
        | 'persistent',
      flavorText: std?.flavorText || '',
      description: std?.description || '',
      level: level ?? (owned as any)?.level ?? 1,
    };
  };

  // Unified neutral theme — replaces the 10 per-subject themes that previously skinned this screen.
  const themeStyles = {
    container: styles.unifiedContainer,
    title: styles.unifiedTitle,
    subtitle: styles.unifiedSubtitle,
    jokerCard: styles.unifiedJokerCard,
    jokerName: styles.unifiedJokerName,
    jokerDescription: styles.unifiedJokerDescription,
    skipButton: styles.unifiedSkipButton,
    skipButtonText: styles.unifiedSkipButtonText,
    generateButton: styles.unifiedGenerateButton,
    generateButtonText: styles.unifiedGenerateButtonText,
  };

  // Upgrade modal
  if (showUpgradeModal) {
    return (
      <View style={[styles.container, themeStyles.container]}>
        {/* Fixed header */}
        <View style={styles.modalHeader}>
          <Text style={[styles.jokerTitle, themeStyles.title]}>
            Level Up Jokers
          </Text>
          <Text
            style={[
              styles.jokerSubtitle,
              themeStyles.subtitle,
              { marginBottom: 0 },
            ]}
          >
            Balance: ${formatNumber(balance)}
          </Text>
        </View>

        {/* Scrollable joker list */}
        <ScrollView
          contentContainerStyle={styles.modalScrollContent}
          style={styles.modalScrollView}
          showsVerticalScrollIndicator={true}
        >
          {upgradeableJokers.length === 0 ? (
            <Text style={[styles.jokerSubtitle, themeStyles.subtitle]}>
              No jokers available to upgrade.
            </Text>
          ) : (
            <View style={styles.cardGrid}>
              {upgradeableJokers.map((joker) => {
                const canAfford = balance >= joker.cost;
                const cardJoker = toCardJoker(joker.id, joker.currentLevel);

                return (
                  <PressableButton
                    key={joker.id.toString()}
                    onPress={() => canAfford && setUpgradeConfirmJoker(joker)}
                    disabled={!canAfford}
                    shadowOpacity={0}
                    elevation={0}
                    style={{
                      backgroundColor: 'transparent',
                      opacity: canAfford ? 1 : 0.5,
                    }}
                  >
                    <View style={styles.cardContainer}>
                      <JokerCard
                        joker={cardJoker}
                        isAfterSchool={false}
                        isCompact={true}
                        showOwned={false}
                        disableActivation={true}
                      />
                    </View>
                    <View style={styles.cardOverlayRow}>
                      <View style={styles.upgradeBadge}>
                        <Text style={styles.upgradeBadgeText}>
                          LV{joker.currentLevel} → LV{joker.currentLevel + 1}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.upgradeCost,
                          canAfford ? styles.canAfford : styles.cantAfford,
                        ]}
                      >
                        ${formatNumber(joker.cost)}
                      </Text>
                    </View>
                  </PressableButton>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Fixed back button */}
        <View style={styles.modalFooter}>
          <PressableButton
            onPress={() => setShowUpgradeModal(false)}
            shadowOpacity={0}
            elevation={0}
            style={{
              alignItems: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <PixelBorder
              borderColor={themeStyles.skipButton?.borderColor || '#daa520'}
              borderWidth={3}
              backgroundColor={
                themeStyles.skipButton?.backgroundColor || '#8b4513'
              }
              innerPadding={0}
            >
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text
                  style={[styles.skipButtonText, themeStyles.skipButtonText]}
                >
                  Back
                </Text>
              </View>
            </PixelBorder>
          </PressableButton>
        </View>

        {/* Upgrade confirmation modal */}
        {upgradeConfirmJoker && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmBackdrop} />
            <View style={styles.confirmContent}>
              <PixelBorder
                borderColor="#10b981"
                borderWidth={3}
                backgroundColor={
                  themeStyles.jokerCard?.backgroundColor || '#1a2f23'
                }
                innerPadding={20}
              >
                <Text
                  style={[
                    styles.jokerTitle,
                    themeStyles.title,
                    { fontSize: 22 },
                  ]}
                >
                  {upgradeConfirmJoker.name}
                </Text>
                <View style={styles.upgradeBadge}>
                  <Text style={styles.upgradeBadgeText}>
                    LV{upgradeConfirmJoker.currentLevel} → LV
                    {upgradeConfirmJoker.currentLevel + 1}
                  </Text>
                </View>

                <Text style={[styles.confirmLabel, themeStyles.subtitle]}>
                  Current (LV{upgradeConfirmJoker.currentLevel}):
                </Text>
                <Text
                  style={[
                    styles.confirmEffectText,
                    themeStyles.jokerDescription,
                    { color: LEVEL_COLORS[upgradeConfirmJoker.currentLevel as 1 | 2 | 3] || '#22c55e' },
                  ]}
                >
                  {describeEffectsAtLevel(
                    Number(upgradeConfirmJoker.id),
                    upgradeConfirmJoker.currentLevel
                  )}
                </Text>

                <Text
                  style={[
                    styles.confirmLabel,
                    themeStyles.subtitle,
                    { marginTop: 12 },
                  ]}
                >
                  Next (LV{upgradeConfirmJoker.currentLevel + 1}):
                </Text>
                <Text
                  style={[
                    styles.confirmEffectText,
                    { color: LEVEL_COLORS[(upgradeConfirmJoker.currentLevel + 1) as 1 | 2 | 3] || '#a855f7', fontWeight: '700' },
                  ]}
                >
                  {describeEffectsAtLevel(
                    Number(upgradeConfirmJoker.id),
                    upgradeConfirmJoker.currentLevel + 1
                  )}
                </Text>

                <Text
                  style={[
                    styles.upgradeCost,
                    styles.canAfford,
                    { textAlign: 'center', marginTop: 16 },
                  ]}
                >
                  Cost: ${formatNumber(upgradeConfirmJoker.cost)}
                </Text>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <PressableButton
                    onPress={() => setUpgradeConfirmJoker(null)}
                    shadowOpacity={0}
                    elevation={0}
                    style={{ flex: 1 }}
                  >
                    <PixelBorder
                      borderColor={
                        themeStyles.skipButton?.borderColor || '#daa520'
                      }
                      borderWidth={3}
                      backgroundColor={
                        themeStyles.skipButton?.backgroundColor || '#8b4513'
                      }
                      innerPadding={0}
                    >
                      <View style={{ padding: 12, alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.skipButtonText,
                            themeStyles.skipButtonText,
                          ]}
                        >
                          Back
                        </Text>
                      </View>
                    </PixelBorder>
                  </PressableButton>

                  <PressableButton
                    onPress={() => handleUpgrade(upgradeConfirmJoker.id)}
                    shadowOpacity={0}
                    elevation={0}
                    style={{ flex: 1 }}
                  >
                    <PixelBorder
                      borderColor="#10b981"
                      borderWidth={3}
                      backgroundColor="#065f46"
                      innerPadding={0}
                    >
                      <View style={{ padding: 12, alignItems: 'center' }}>
                        <Text
                          style={[styles.skipButtonText, { color: '#10b981' }]}
                        >
                          Upgrade
                        </Text>
                      </View>
                    </PixelBorder>
                  </PressableButton>
                </View>
              </PixelBorder>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Sell modal
  if (showSellModal) {
    return (
      <View style={[styles.container, themeStyles.container]}>
        {/* Fixed header */}
        <View style={styles.modalHeader}>
          <Text style={[styles.jokerTitle, themeStyles.title]}>
            Sell Jokers
          </Text>
          <Text
            style={[
              styles.jokerSubtitle,
              themeStyles.subtitle,
              { marginBottom: 0 },
            ]}
          >
            Tap a joker to sell it. Price depends on level.
          </Text>
        </View>

        {/* Scrollable joker list */}
        <ScrollView
          contentContainerStyle={styles.modalScrollContent}
          style={styles.modalScrollView}
          showsVerticalScrollIndicator={true}
        >
          {sellableJokers.length === 0 ? (
            <Text style={[styles.jokerSubtitle, themeStyles.subtitle]}>
              No jokers to sell.
            </Text>
          ) : (
            <View style={styles.cardGrid}>
              {sellableJokers.map((joker) => {
                const cardJoker = toCardJoker(joker.id, joker.level);
                const { scale: sScale, opacity: sOpacity } = getSellAnim(joker.id);
                const jokerKey = joker.id.toString();

                return (
                  <RNAnimated.View
                    key={jokerKey}
                    style={{ transform: [{ scale: sScale }], opacity: sOpacity }}
                    ref={(ref) => {
                      if (ref) {
                        sellCardRefs.current[jokerKey] = ref as unknown as View;
                      }
                    }}
                  >
                    <PressableButton
                      onPress={() => {
                        // Measure card position before animating
                        const viewRef = sellCardRefs.current[jokerKey];
                        if (viewRef && typeof (viewRef as any).measureInWindow === 'function') {
                          (viewRef as any).measureInWindow(
                            (x: number, y: number, w: number, h: number) => {
                              sellCardPositions.current[jokerKey] = {
                                x: x + w / 2,
                                y: y + h / 2,
                              };
                              handleSellJoker(joker.id, joker.level);
                            }
                          );
                        } else {
                          handleSellJoker(joker.id, joker.level);
                        }
                      }}
                      shadowOpacity={0}
                      elevation={0}
                      style={{ backgroundColor: 'transparent' }}
                    >
                      <View style={styles.cardContainer}>
                        <JokerCard
                          joker={cardJoker}
                          isAfterSchool={false}
                          isCompact={true}
                          showOwned={false}
                          disableActivation={true}
                        />
                      </View>
                    </PressableButton>
                  </RNAnimated.View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Fixed back button */}
        <View style={styles.modalFooter}>
          <PressableButton
            onPress={() => setShowSellModal(false)}
            shadowOpacity={0}
            elevation={0}
            style={{
              alignItems: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <PixelBorder
              borderColor={themeStyles.skipButton?.borderColor || '#daa520'}
              borderWidth={3}
              backgroundColor={
                themeStyles.skipButton?.backgroundColor || '#8b4513'
              }
              innerPadding={0}
            >
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text
                  style={[styles.skipButtonText, themeStyles.skipButtonText]}
                >
                  Back
                </Text>
              </View>
            </PixelBorder>
          </PressableButton>
        </View>
      </View>
    );
  }

  // Main reward screen
  return (
    <View style={[styles.container, themeStyles.container]}>
      {/* Fixed header */}
      <View style={styles.modalHeader}>
        <Text style={[styles.jokerTitle, themeStyles.title]}>Rewards!</Text>
        <Text
          style={[
            styles.jokerSubtitle,
            themeStyles.subtitle,
            { marginBottom: 4 },
          ]}
        >
          {headerText
            ? headerText
            : completionLevel === 1
              ? 'You completed Level 1!'
              : completionLevel === 2
                ? 'You completed Level 2!'
                : 'You mastered all 3 levels!'}
        </Text>
        <Text style={[styles.slotCounter, themeStyles.subtitle]}>
          Aura Jokers: {persistentJokerCount}
        </Text>
      </View>

      {/* Scrollable middle */}
      <ScrollView
        contentContainerStyle={styles.modalScrollContent}
        style={styles.modalScrollView}
        showsVerticalScrollIndicator={true}
      >
        {availableJokers.length === 0 ? (
          <Text style={[styles.jokerSubtitle, themeStyles.subtitle]}>
            You already own all available jokers!
          </Text>
        ) : (
          <>
            <Text style={[styles.grantedLabel, themeStyles.subtitle]}>
              {chosenJokerId === null
                ? 'Choose 1 joker to keep:'
                : 'Joker obtained!'}
            </Text>
            {availableJokers.map((joker) => {
              const isOneTime = joker.type === 'one-time';
              const isChosen = chosenJokerId === joker.id;
              const isUnchosen = chosenJokerId !== null && !isChosen;
              const isAuraFull = !isOneTime && !canAddPersistentJoker();

              // Hide unchosen jokers after dismiss animation completes
              if (isUnchosen && dismissedOthers) return null;

              const cardJoker = toCardJoker(joker.id, 1);
              const anim = isChosen || isUnchosen ? getAnim(joker.id) : null;
              const animStyle = isUnchosen
                ? { opacity: anim, transform: [{ scale: anim! }] }
                : isChosen
                  ? { transform: [{ scale: anim! }] }
                  : undefined;

              return (
                <RNAnimated.View
                  key={joker.id}
                  style={[
                    { marginBottom: 12, width: '100%' },
                    animStyle as any,
                  ]}
                >
                  <JokerCard
                    joker={cardJoker}
                    isAfterSchool={false}
                    isCompact={true}
                    showOwned={false}
                    disableActivation={true}
                    onPress={
                      chosenJokerId === null && !isAuraFull
                        ? () => handleClaimJoker(joker)
                        : undefined
                    }
                    isSelected={isChosen}
                    selectionDisabled={isAuraFull}
                  />
                  {isAuraFull && (
                    <Text style={styles.auraFullText}>Aura slots full</Text>
                  )}
                </RNAnimated.View>
              );
            })}
          </>
        )}

        {/* Level Up Joker button — wallet green */}
        {showSellAndUpgrade && upgradeableJokers.length > 0 && (
          <PressableButton
            onPress={() => {
              SoundEffects.playRandomPop();
              setShowUpgradeModal(true);
            }}
            shadowOpacity={0}
            elevation={0}
            style={{
              backgroundColor: 'transparent',
              marginTop: 8,
              marginBottom: 12,
              width: '100%',
            }}
          >
            <PixelBorder
              borderColor="#4a7c4a"
              borderWidth={3}
              backgroundColor="#d4f6d4"
              innerPadding={0}
            >
              <View style={{ padding: 14, alignItems: 'center' }}>
                <Text style={[styles.showButtonText, { color: '#2d5a2d' }]}>
                  Level Up Joker
                </Text>
              </View>
            </PixelBorder>
          </PressableButton>
        )}

        {/* Sell Joker button — piggy bank red/pink */}
        {showSellAndUpgrade && sellableJokers.length > 0 && (
          <PressableButton
            onPress={() => {
              SoundEffects.playRandomPop();
              setShowSellModal(true);
            }}
            shadowOpacity={0}
            elevation={0}
            style={{
              backgroundColor: 'transparent',
              marginBottom: 12,
              width: '100%',
            }}
          >
            <PixelBorder
              borderColor="#b85c8a"
              borderWidth={3}
              backgroundColor="#ffd6e8"
              innerPadding={0}
            >
              <View style={{ padding: 14, alignItems: 'center' }}>
                <Text style={[styles.showButtonText, { color: '#8a4a6b' }]}>
                  Sell Joker
                </Text>
              </View>
            </PixelBorder>
          </PressableButton>
        )}
      </ScrollView>

      {/* Fixed footer — Continue button */}
      <View style={styles.modalFooter}>
        <PressableButton
          onPress={onComplete}
          shadowOpacity={0}
          elevation={0}
          style={{
            alignItems: 'center',
            backgroundColor: 'transparent',
          }}
        >
          <PixelBorder
            borderColor={themeStyles.skipButton?.borderColor || '#daa520'}
            borderWidth={3}
            backgroundColor={
              themeStyles.skipButton?.backgroundColor || '#8b4513'
            }
            innerPadding={0}
          >
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={[styles.skipButtonText, themeStyles.skipButtonText]}>
                Continue
              </Text>
            </View>
          </PixelBorder>
        </PressableButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  jokerContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  confirmContent: {
    width: '85%',
    maxWidth: 360,
    zIndex: 101,
  },
  confirmLabel: {
    fontSize: 13,
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  confirmEffectText: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    lineHeight: 20,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  cardContainer: {
    width: 160,
    height: 180,
  },
  auraFullText: {
    fontSize: 11,
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 4,
  },
  cardOverlayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  jokerTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  jokerSubtitle: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 24,
  },
  slotCounter: {
    fontSize: 12,
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.7,
  },
  grantedLabel: {
    fontSize: 18,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  showButtonText: {
    fontSize: 18,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    fontWeight: '700',
  },
  upgradeCount: {
    fontSize: 11,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
  },
  jokerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jokerName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  jokerDescription: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    lineHeight: 18,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  instantIndicator: {
    borderColor: '#ffc107',
  },
  auraIndicator: {
    borderColor: '#0066cc',
  },
  typeEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  instantText: {
    color: '#b8860b',
  },
  auraText: {
    color: '#0066cc',
  },
  upgradeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  upgradeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    color: '#fff',
    letterSpacing: 0.5,
  },
  upgradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  upgradeCost: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  canAfford: {
    color: '#10b981',
  },
  cantAfford: {
    color: '#ef4444',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },

  // Unified theme — matches the Jokers tab visual identity (dark bg, gold accents).
  unifiedContainer: {
    backgroundColor: '#1a1a1a',
  },
  unifiedTitle: {
    color: '#d4af37',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  unifiedSubtitle: {
    color: '#f5e9c4',
  },
  unifiedJokerCard: {
    backgroundColor: '#2a2a2a',
    borderColor: '#d4af37',
    shadowColor: '#000',
  },
  unifiedJokerName: {
    color: '#d4af37',
  },
  unifiedJokerDescription: {
    color: '#f5e9c4',
  },
  unifiedSkipButton: {
    backgroundColor: '#3a2a1a',
    borderColor: '#d4af37',
  },
  unifiedSkipButtonText: {
    color: '#d4af37',
  },
  unifiedGenerateButton: {
    backgroundColor: '#3a2a1a',
    borderColor: '#d4af37',
  },
  unifiedGenerateButtonText: {
    color: '#d4af37',
  },
});
