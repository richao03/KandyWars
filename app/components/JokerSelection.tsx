import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import colors from '../../src/constants/colors';
import { JOKER_IDS, hasJokerById } from '../../src/constants/jokerIds';
import { Joker as JokerType, useJokers } from '../../src/hooks/useJokers';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { addBalance, selectBalance } from '../../src/store/slices/walletSlice';
import {
  STANDARDIZED_JOKERS,
  StandardizedJoker,
  getJokerEffectsAtLevel,
} from '../../src/utils/jokerEffectEngine';
import { MusicController } from '../../src/utils/musicController';
import { SoundEffects } from '../../src/utils/soundEffects';
import { formatNumber } from '../../src/utils/priceUtils';
import JokerCard from './JokerCard';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import TextWithEmojis from './TextWithEmojis';

const UPGRADE_COSTS: Record<number, number> = {
  1: 5000, // L1 → L2
  2: 30000, // L2 → L3
};

interface JokerSelectionProps {
  jokers: StandardizedJoker[];
  theme:
    | 'math'
    | 'computer'
    | 'homeec'
    | 'economy'
    | 'candy'
    | 'gym'
    | 'art'
    | 'logic'
    | 'recess'
    | 'geography';
  onComplete: () => void;
  rewardTier?: 1 | 2 | 3;
  completionLevel?: 1 | 2 | 3;
  headerText?: string;
}

export default function JokerSelection({
  jokers,
  theme,
  onComplete,
  rewardTier = 3,
  completionLevel = 3,
  headerText,
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
          description: standardized?.description || j.description || '',
          type: j.type,
          level: (j as any).level ?? 1,
        };
      });
  }, [activeJokers, lockedJokerIds]);

  const handleSellJoker = (jokerId: string | number, level: number = 1) => {
    removeJoker(jokerId);
    dispatch(addBalance(getJokerSellPrice(level)));
    SoundEffects.playRandomPop();
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

  const getThemeStyles = () => {
    switch (theme) {
      case 'math':
        return {
          container: styles.mathContainer,
          title: styles.mathTitle,
          subtitle: styles.mathSubtitle,
          jokerCard: styles.mathJokerCard,
          jokerName: styles.mathJokerName,
          jokerDescription: styles.mathJokerDescription,
          skipButton: styles.mathSkipButton,
          skipButtonText: styles.mathSkipButtonText,
          generateButton: styles.mathGenerateButton,
          generateButtonText: styles.mathGenerateButtonText,
        };
      case 'computer':
        return {
          container: styles.computerContainer,
          title: styles.computerTitle,
          subtitle: styles.computerSubtitle,
          jokerCard: styles.computerJokerCard,
          jokerName: styles.computerJokerName,
          jokerDescription: styles.computerJokerDescription,
          skipButton: styles.computerSkipButton,
          skipButtonText: styles.computerSkipButtonText,
          generateButton: styles.computerGenerateButton,
          generateButtonText: styles.computerGenerateButtonText,
        };
      case 'homeec':
        return {
          container: styles.homeecContainer,
          title: styles.homeecTitle,
          subtitle: styles.homeecSubtitle,
          jokerCard: styles.homeecJokerCard,
          jokerName: styles.homeecJokerName,
          jokerDescription: styles.homeecJokerDescription,
          skipButton: styles.homeecSkipButton,
          skipButtonText: styles.homeecSkipButtonText,
          generateButton: styles.homeecGenerateButton,
          generateButtonText: styles.homeecGenerateButtonText,
        };
      case 'economy':
        return {
          container: styles.socialContainer,
          title: styles.socialTitle,
          subtitle: styles.socialSubtitle,
          jokerCard: styles.socialJokerCard,
          jokerName: styles.socialJokerName,
          jokerDescription: styles.socialJokerDescription,
          skipButton: styles.socialSkipButton,
          skipButtonText: styles.socialSkipButtonText,
          generateButton: styles.socialGenerateButton,
          generateButtonText: styles.socialGenerateButtonText,
        };
      case 'gym':
        return {
          container: styles.gymContainer,
          title: styles.gymTitle,
          subtitle: styles.gymSubtitle,
          jokerCard: styles.gymJokerCard,
          jokerName: styles.gymJokerName,
          jokerDescription: styles.gymJokerDescription,
          skipButton: styles.gymSkipButton,
          skipButtonText: styles.gymSkipButtonText,
          generateButton: styles.gymGenerateButton,
          generateButtonText: styles.gymGenerateButtonText,
        };
      case 'art':
        return {
          container: styles.artContainer,
          title: styles.artTitle,
          subtitle: styles.artSubtitle,
          jokerCard: styles.artJokerCard,
          jokerName: styles.artJokerName,
          jokerDescription: styles.artJokerDescription,
          skipButton: styles.artSkipButton,
          skipButtonText: styles.artSkipButtonText,
          generateButton: styles.artGenerateButton,
          generateButtonText: styles.artGenerateButtonText,
        };
      case 'logic':
        return {
          container: styles.logicContainer,
          title: styles.logicTitle,
          subtitle: styles.logicSubtitle,
          jokerCard: styles.logicJokerCard,
          jokerName: styles.logicJokerName,
          jokerDescription: styles.logicJokerDescription,
          skipButton: styles.logicSkipButton,
          skipButtonText: styles.logicSkipButtonText,
          generateButton: styles.logicGenerateButton,
          generateButtonText: styles.logicGenerateButtonText,
        };
      case 'recess':
        return {
          container: styles.recessContainer,
          title: styles.recessTitle,
          subtitle: styles.recessSubtitle,
          jokerCard: styles.recessJokerCard,
          jokerName: styles.recessJokerName,
          jokerDescription: styles.recessJokerDescription,
          skipButton: styles.recessSkipButton,
          skipButtonText: styles.recessSkipButtonText,
          generateButton: styles.recessGenerateButton,
          generateButtonText: styles.recessGenerateButtonText,
        };
      case 'geography':
        return {
          container: styles.geographyContainer,
          title: styles.geographyTitle,
          subtitle: styles.geographySubtitle,
          jokerCard: styles.geographyJokerCard,
          jokerName: styles.geographyJokerName,
          jokerDescription: styles.geographyJokerDescription,
          skipButton: styles.geographySkipButton,
          skipButtonText: styles.geographySkipButtonText,
          generateButton: styles.geographyGenerateButton,
          generateButtonText: styles.geographyGenerateButtonText,
        };
      default:
        return {
          container: styles.candyContainer,
          title: styles.candyTitle,
          subtitle: styles.candySubtitle,
          jokerCard: styles.candyJokerCard,
          jokerName: styles.candyJokerName,
          jokerDescription: styles.candyJokerDescription,
          skipButton: styles.candySkipButton,
          skipButtonText: styles.candySkipButtonText,
          generateButton: styles.candyGenerateButton,
          generateButtonText: styles.candyGenerateButtonText,
        };
    }
  };

  const themeStyles = getThemeStyles();

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
                    { color: '#10b981', fontWeight: '700' },
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

                return (
                  <PressableButton
                    key={joker.id.toString()}
                    onPress={() => handleSellJoker(joker.id, joker.level)}
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
          Aura Slots: {persistentJokerCount}/{maxPersistentSlots}
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
              const typeEmoji = isOneTime ? '⚡' : '🔮';
              const jokerType = isOneTime ? 'instant' : 'aura';
              const isChosen = chosenJokerId === joker.id;
              const isUnchosen = chosenJokerId !== null && !isChosen;

              // Hide unchosen jokers after dismiss animation completes
              if (isUnchosen && dismissedOthers) return null;

              const cardContent = (
                <PixelBorder
                  borderColor={
                    isChosen
                      ? '#10b981'
                      : themeStyles.jokerCard?.borderColor || '#8fbc8f'
                  }
                  borderWidth={3}
                  backgroundColor={
                    themeStyles.jokerCard?.backgroundColor || '#1a2f23'
                  }
                  innerPadding={16}
                >
                  <View style={styles.jokerHeader}>
                    <Text
                      style={[
                        styles.jokerName,
                        themeStyles.jokerName,
                        { flex: 1 },
                      ]}
                    >
                      {isChosen ? '✓ ' : ''}
                      {joker.name}
                    </Text>
                    <View
                      style={[
                        styles.typeIndicator,
                        isOneTime
                          ? styles.instantIndicator
                          : styles.auraIndicator,
                      ]}
                    >
                      <TextWithEmojis style={styles.typeEmoji}>
                        {typeEmoji}
                      </TextWithEmojis>
                      <Text
                        style={[
                          styles.typeText,
                          isOneTime ? styles.instantText : styles.auraText,
                        ]}
                      >
                        {jokerType.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.jokerDescription,
                      themeStyles.jokerDescription,
                    ]}
                  >
                    {joker.description}
                  </Text>
                </PixelBorder>
              );

              // Unchosen jokers animate out
              if (isUnchosen) {
                const anim = getAnim(joker.id);
                return (
                  <RNAnimated.View
                    key={joker.id}
                    style={{
                      marginBottom: 12,
                      width: '100%',
                      opacity: anim,
                      transform: [{ scale: anim }],
                    }}
                  >
                    {cardContent}
                  </RNAnimated.View>
                );
              }

              // Chosen joker — wobble animation
              if (isChosen) {
                const anim = getAnim(joker.id);
                return (
                  <RNAnimated.View
                    key={joker.id}
                    style={{
                      marginBottom: 12,
                      width: '100%',
                      transform: [{ scale: anim }],
                    }}
                  >
                    {cardContent}
                  </RNAnimated.View>
                );
              }

              // Not yet chosen — tappable (disabled if aura and slots full)
              const isAuraFull = !isOneTime && !canAddPersistentJoker();
              return (
                <PressableButton
                  key={joker.id}
                  onPress={() => handleClaimJoker(joker)}
                  disabled={chosenJokerId !== null || isAuraFull}
                  shadowOpacity={0}
                  elevation={0}
                  style={{ marginBottom: 12, width: '100%', opacity: isAuraFull ? 0.4 : 1 }}
                >
                  {cardContent}
                  {isAuraFull && (
                    <Text style={styles.auraFullText}>Aura slots full</Text>
                  )}
                </PressableButton>
              );
            })}
          </>
        )}

        {/* Level Up Joker button — wallet green */}
        {upgradeableJokers.length > 0 && (
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
        {sellableJokers.length > 0 && (
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

  // Math Theme (Chalkboard)
  mathContainer: {
    backgroundColor: colors.green.darkBg,
  },
  mathTitle: {
    color: colors.gold.beige,
    textShadowColor: '#8fbc8f',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  mathSubtitle: {
    color: '#8fbc8f',
  },
  mathGenerateButton: {
    backgroundColor: '#1a2f23',
    borderColor: '#ffff99',
  },
  mathGenerateButtonText: {
    color: colors.gold.beige,
  },
  mathJokerCard: {
    backgroundColor: '#1a2f23',
    borderColor: '#8fbc8f',
    shadowColor: '#ffff99',
  },
  mathJokerName: {
    color: '#ffff99',
  },
  mathJokerDescription: {
    color: colors.gold.beige,
  },
  mathSkipButton: {
    backgroundColor: colors.brown.secondary,
    borderColor: '#daa520',
  },
  mathSkipButtonText: {
    color: colors.gold.beige,
  },

  // Computer Theme (Hacker)
  computerContainer: {
    backgroundColor: '#0a0e1a',
  },
  computerTitle: {
    color: colors.green.neon,
    textShadowColor: colors.green.neon,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  computerSubtitle: {
    color: colors.blue.cyan,
  },
  computerGenerateButton: {
    backgroundColor: colors.blue.darkBg,
    borderColor: colors.blue.cyan,
  },
  computerGenerateButtonText: {
    color: colors.blue.cyan,
  },
  computerJokerCard: {
    backgroundColor: colors.blue.darkBg,
    borderColor: colors.blue.cyan,
    shadowColor: colors.blue.cyan,
  },
  computerJokerName: {
    color: colors.green.neon,
  },
  computerJokerDescription: {
    color: '#a0a0ff',
  },
  computerSkipButton: {
    backgroundColor: '#2d1b3d',
    borderColor: '#8b5cf6',
  },
  computerSkipButtonText: {
    color: '#a78bfa',
  },

  // Home Economics Theme (Kitchen)
  homeecContainer: {
    backgroundColor: '#FDF5E6',
  },
  homeecTitle: {
    color: '#D2691E',
    textShadowColor: '#F4A460',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  homeecSubtitle: {
    color: colors.brown.secondary,
  },
  homeecGenerateButton: {
    backgroundColor: '#F4A460',
    borderColor: '#D2691E',
  },
  homeecGenerateButtonText: {
    color: colors.white,
    textShadowColor: colors.brown.secondary,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  homeecJokerCard: {
    backgroundColor: colors.white,
    borderColor: '#F4A460',
    shadowColor: '#D2691E',
  },
  homeecJokerName: {
    color: '#D2691E',
  },
  homeecJokerDescription: {
    color: colors.brown.secondary,
  },
  homeecSkipButton: {
    backgroundColor: '#E9ECEF',
    borderColor: colors.gray.border,
  },
  homeecSkipButtonText: {
    color: colors.gray.medium,
  },

  // Social Studies Theme (Trading Post)
  socialContainer: {
    backgroundColor: colors.gold.beige,
  },
  socialTitle: {
    color: colors.brown.secondary,
    textShadowColor: '#DEB887',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  socialSubtitle: {
    color: '#A0522D',
  },
  socialGenerateButton: {
    backgroundColor: '#DEB887',
    borderColor: '#CD853F',
  },
  socialGenerateButtonText: {
    color: colors.brown.secondary,
  },
  socialJokerCard: {
    backgroundColor: colors.white,
    borderColor: '#DEB887',
    shadowColor: colors.brown.secondary,
  },
  socialJokerName: {
    color: colors.brown.secondary,
  },
  socialJokerDescription: {
    color: '#A0522D',
  },
  socialSkipButton: {
    backgroundColor: '#FFE4B5',
    borderColor: '#DEB887',
  },
  socialSkipButtonText: {
    color: colors.brown.secondary,
  },

  // Candy Theme (Default)
  candyContainer: {
    backgroundColor: '#fdf2f8',
  },
  candyTitle: {
    color: '#be185d',
    textShadowColor: '#f9a8d4',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  candySubtitle: {
    color: colors.purple.hotPink,
  },
  candyGenerateButton: {
    backgroundColor: '#f9a8d4',
    borderColor: colors.purple.hotPink,
  },
  candyGenerateButtonText: {
    color: '#be185d',
  },
  candyJokerCard: {
    backgroundColor: colors.white,
    borderColor: '#f9a8d4',
    shadowColor: colors.purple.hotPink,
  },
  candyJokerName: {
    color: '#be185d',
  },
  candyJokerDescription: {
    color: colors.purple.hotPink,
  },
  candySkipButton: {
    backgroundColor: '#f3e8ff',
    borderColor: '#c084fc',
  },
  candySkipButtonText: {
    color: '#a855f7',
  },

  // Gym Theme (Athletic)
  gymContainer: {
    backgroundColor: '#1a2332',
  },
  gymTitle: {
    color: colors.white,
    textShadowColor: colors.orange.primary,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gymSubtitle: {
    color: colors.white,
  },
  gymGenerateButton: {
    backgroundColor: colors.green.darkBg,
    borderColor: colors.orange.primary,
  },
  gymGenerateButtonText: {
    color: colors.white,
  },
  gymJokerCard: {
    backgroundColor: '#0f1419',
    borderColor: colors.orange.primary,
    shadowColor: colors.orange.primary,
  },
  gymJokerName: {
    color: colors.orange.primary,
  },
  gymJokerDescription: {
    color: colors.white,
  },
  gymSkipButton: {
    backgroundColor: colors.brown.secondary,
    borderColor: '#daa520',
  },
  gymSkipButtonText: {
    color: colors.white,
  },

  // Art Theme (Creative/Colorful)
  artContainer: {
    backgroundColor: '#fff8e1',
  },
  artTitle: {
    color: '#ff6f00',
    textShadowColor: '#ffb74d',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  artSubtitle: {
    color: '#f57c00',
  },
  artGenerateButton: {
    backgroundColor: '#ffcc80',
    borderColor: '#ff9800',
  },
  artGenerateButtonText: {
    color: '#e65100',
  },
  artJokerCard: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffb74d',
    shadowColor: '#ff9800',
  },
  artJokerName: {
    color: '#f57c00',
  },
  artJokerDescription: {
    color: '#ff6f00',
  },
  artSkipButton: {
    backgroundColor: '#ffe0b2',
    borderColor: '#ffb74d',
  },
  artSkipButtonText: {
    color: '#e65100',
  },

  // Logic Theme (Puzzle/Brain)
  logicContainer: {
    backgroundColor: '#f3e5f5',
  },
  logicTitle: {
    color: '#6a1b9a',
    textShadowColor: '#ab47bc',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logicSubtitle: {
    color: '#8e24aa',
  },
  logicGenerateButton: {
    backgroundColor: '#ce93d8',
    borderColor: '#ab47bc',
  },
  logicGenerateButtonText: {
    color: '#4a148c',
  },
  logicJokerCard: {
    backgroundColor: '#fce4ec',
    borderColor: '#ba68c8',
    shadowColor: '#9c27b0',
  },
  logicJokerName: {
    color: '#7b1fa2',
  },
  logicJokerDescription: {
    color: '#8e24aa',
  },
  logicSkipButton: {
    backgroundColor: '#e1bee7',
    borderColor: '#ba68c8',
  },
  logicSkipButtonText: {
    color: '#6a1b9a',
  },

  // Recess Theme (Playful/Fun)
  recessContainer: {
    backgroundColor: '#fff0f5',
  },
  recessTitle: {
    color: '#c2185b',
    textShadowColor: '#f06292',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  recessSubtitle: {
    color: '#d81b60',
  },
  recessGenerateButton: {
    backgroundColor: '#f8bbd0',
    borderColor: '#ec407a',
  },
  recessGenerateButtonText: {
    color: '#880e4f',
  },
  recessJokerCard: {
    backgroundColor: '#fce4ec',
    borderColor: '#f06292',
    shadowColor: '#ec407a',
  },
  recessJokerName: {
    color: '#c2185b',
  },
  recessJokerDescription: {
    color: '#d81b60',
  },
  recessSkipButton: {
    backgroundColor: '#f8bbd0',
    borderColor: '#f06292',
  },
  recessSkipButtonText: {
    color: '#ad1457',
  },

  // Geography Theme (Earth/Nature)
  geographyContainer: {
    backgroundColor: '#e0f2f1',
  },
  geographyTitle: {
    color: '#00695c',
    textShadowColor: '#4db6ac',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  geographySubtitle: {
    color: '#00897b',
  },
  geographyGenerateButton: {
    backgroundColor: '#80cbc4',
    borderColor: '#26a69a',
  },
  geographyGenerateButtonText: {
    color: '#004d40',
  },
  geographyJokerCard: {
    backgroundColor: '#e0f2f1',
    borderColor: '#4db6ac',
    shadowColor: '#26a69a',
  },
  geographyJokerName: {
    color: '#00796b',
  },
  geographyJokerDescription: {
    color: '#00897b',
  },
  geographySkipButton: {
    backgroundColor: '#b2dfdb',
    borderColor: '#4db6ac',
  },
  geographySkipButtonText: {
    color: '#00695c',
  },
});
