import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../src/constants/colors';
import { MusicController } from '../../src/utils/musicController';
import { SoundEffects } from '../../src/utils/soundEffects';
import { Joker as JokerType, useJokers } from '../../src/hooks/useJokers';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { STANDARDIZED_JOKERS, StandardizedJoker } from '../../src/utils/jokerEffectEngine';
import { JOKER_IDS, hasJokerById } from '../../src/constants/jokerIds';
import { addBalance } from '../../src/store/slices/walletSlice';
import { selectBalance } from '../../src/store/slices/walletSlice';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import TextWithEmojis from './TextWithEmojis';

const UPGRADE_COSTS: Record<number, number> = {
  1: 5000,   // L1 → L2
  2: 30000,  // L2 → L3
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
  subject: string;
  onComplete: () => void;
  rewardTier?: 1 | 2 | 3;
  completionLevel?: 1 | 2 | 3;
}

export default function JokerSelection({
  jokers,
  theme,
  subject,
  onComplete,
  rewardTier = 3,
  completionLevel = 3,
}: JokerSelectionProps) {
  const [grantedJokers, setGrantedJokers] = useState<StandardizedJoker[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hasGranted, setHasGranted] = useState(false);
  const dispatch = useAppDispatch();
  const balance = useAppSelector(selectBalance);
  const {
    addJoker,
    sellJoker,
    jokers: ownedJokers,
    jokersOwned,
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

  // Auto-grant random jokers on mount
  useEffect(() => {
    if (hasGranted) return;
    setHasGranted(true);

    // Filter to jokers the player doesn't already own
    const ownedIds = new Set(jokersOwned.map((j) => j.id.toString()));
    const available = jokers.filter((j) => !ownedIds.has(j.id.toString()));

    if (available.length === 0) {
      setGrantedJokers([]);
      return;
    }

    // Extra Credit joker gives +1 to selection count
    const extraCreditBonus = hasJokerById(jokersOwned, JOKER_IDS.EXTRA_CREDIT) ? 1 : 0;
    const jokerCount = Math.min(completionLevel + extraCreditBonus, available.length);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, jokerCount);

    // Grant each joker immediately
    for (const joker of selected) {
      const isOneTime = joker.type === 'one-time';
      const jokerToAdd: JokerType = {
        id: joker.id,
        name: joker.name,
        description: joker.description,
        subject: joker.subject,
        theme: theme,
        type: isOneTime ? 'one-time' : 'persistent',
        effect: '',
        effects: joker.effects,
        level: 1,
      };

      // If persistent and slots full, skip (don't block the flow)
      if (!isOneTime && !canAddPersistentJoker()) {
        continue;
      }

      addJoker(jokerToAdd, 'minigame', subject);
    }

    setGrantedJokers(selected);
    SoundEffects.playAchievementSound();
  }, []);

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
      .filter(Boolean) as Array<{
        id: string | number;
        name: string;
        description: string;
        currentLevel: number;
        maxLevel: number;
        cost: number;
        type: string;
      }>;
  }, [jokersOwned]);

  const handleUpgrade = (jokerId: string | number) => {
    const joker = upgradeableJokers.find(
      (j) => j.id.toString() === jokerId.toString()
    );
    if (!joker) return;
    if (balance < joker.cost) return;

    dispatch(addBalance(-joker.cost));
    upgradeJokerAction(jokerId.toString());
    SoundEffects.playAchievementSound();
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
        <ScrollView contentContainerStyle={styles.jokerContainer}>
          <Text style={[styles.jokerTitle, themeStyles.title]}>
            Level Up Jokers
          </Text>
          <Text style={[styles.jokerSubtitle, themeStyles.subtitle]}>
            Balance: ${balance.toLocaleString()}
          </Text>

          {upgradeableJokers.length === 0 ? (
            <Text style={[styles.jokerSubtitle, themeStyles.subtitle]}>
              No jokers available to upgrade.
            </Text>
          ) : (
            upgradeableJokers.map((joker) => {
              const canAfford = balance >= joker.cost;
              const isOneTime = joker.type === 'one-time';
              const typeEmoji = isOneTime ? '⚡' : '🔮';
              const jokerType = isOneTime ? 'instant' : 'aura';

              return (
                <PressableButton
                  key={joker.id.toString()}
                  onPress={() => canAfford && handleUpgrade(joker.id)}
                  disabled={!canAfford}
                  shadowOpacity={0}
                  elevation={0}
                  style={{
                    backgroundColor: 'transparent',
                    marginBottom: 12,
                    width: '100%',
                    opacity: canAfford ? 1 : 0.5,
                  }}
                >
                  <PixelBorder
                    borderColor={canAfford ? '#10b981' : '#666'}
                    borderWidth={3}
                    backgroundColor={
                      themeStyles.jokerCard?.backgroundColor || '#1a2f23'
                    }
                    innerPadding={16}
                  >
                    <View style={styles.jokerHeader}>
                      <Text style={[styles.jokerName, themeStyles.jokerName, { flex: 1 }]}>
                        {joker.name}
                      </Text>
                      <View style={styles.upgradeBadge}>
                        <Text style={styles.upgradeBadgeText}>
                          LV{joker.currentLevel} → LV{joker.currentLevel + 1}
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
                    <View style={styles.upgradeRow}>
                      <View
                        style={[
                          styles.typeIndicator,
                          isOneTime ? styles.instantIndicator : styles.auraIndicator,
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
                      <Text
                        style={[
                          styles.upgradeCost,
                          canAfford ? styles.canAfford : styles.cantAfford,
                        ]}
                      >
                        ${joker.cost.toLocaleString()}
                      </Text>
                    </View>
                  </PixelBorder>
                </PressableButton>
              );
            })
          )}

          <PressableButton
            onPress={() => setShowUpgradeModal(false)}
            shadowOpacity={0}
            elevation={0}
            style={{
              alignItems: 'center',
              backgroundColor: 'transparent',
              marginTop: 12,
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
        </ScrollView>
      </View>
    );
  }

  // Main reward screen
  return (
    <View style={[styles.container, themeStyles.container]}>
      <ScrollView contentContainerStyle={styles.jokerContainer}>
        <Text style={[styles.jokerTitle, themeStyles.title]}>
          Rewards!
        </Text>
        <Text style={[styles.jokerSubtitle, themeStyles.subtitle]}>
          {completionLevel === 1
            ? 'You completed Level 1!'
            : completionLevel === 2
              ? 'You completed Level 2!'
              : 'You mastered all 3 levels!'}
        </Text>
        <Text style={[styles.slotCounter, themeStyles.subtitle]}>
          Aura Slots: {persistentJokerCount}/{maxPersistentSlots}
        </Text>

        {grantedJokers.length === 0 ? (
          <Text style={[styles.jokerSubtitle, themeStyles.subtitle]}>
            You already own all available jokers!
          </Text>
        ) : (
          <>
            <Text style={[styles.grantedLabel, themeStyles.subtitle]}>
              +{grantedJokers.length} Joker{grantedJokers.length > 1 ? 's' : ''} Obtained:
            </Text>
            {grantedJokers.map((joker) => {
              const isOneTime = joker.type === 'one-time';
              const typeEmoji = isOneTime ? '⚡' : '🔮';
              const jokerType = isOneTime ? 'instant' : 'aura';

              return (
                <View
                  key={joker.id}
                  style={{ marginBottom: 12, width: '100%' }}
                >
                  <PixelBorder
                    borderColor={themeStyles.jokerCard?.borderColor || '#8fbc8f'}
                    borderWidth={3}
                    backgroundColor={
                      themeStyles.jokerCard?.backgroundColor || '#1a2f23'
                    }
                    innerPadding={16}
                  >
                    <View style={styles.jokerHeader}>
                      <Text style={[styles.jokerName, themeStyles.jokerName, { flex: 1 }]}>
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
                </View>
              );
            })}
          </>
        )}

        {/* Level Up Joker button */}
        <PressableButton
          onPress={() => {
            SoundEffects.playRandomPop();
            setShowUpgradeModal(true);
          }}
          shadowOpacity={0}
          elevation={0}
          style={{
            alignItems: 'center',
            backgroundColor: 'transparent',
            marginTop: 8,
            marginBottom: 12,
          }}
        >
          <PixelBorder
            borderColor="#10b981"
            borderWidth={3}
            backgroundColor={
              themeStyles.generateButton?.backgroundColor || '#1a2f23'
            }
            innerPadding={0}
          >
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text
                style={[
                  styles.showButtonText,
                  themeStyles.generateButtonText,
                ]}
              >
                Level Up Joker
              </Text>
              {upgradeableJokers.length > 0 && (
                <Text style={[styles.upgradeCount, themeStyles.subtitle]}>
                  {upgradeableJokers.length} upgradeable
                </Text>
              )}
            </View>
          </PixelBorder>
        </PressableButton>

        {/* Continue button */}
        <PressableButton
          onPress={onComplete}
          shadowOpacity={0}
          elevation={0}
          style={{
            alignItems: 'center',
            backgroundColor: 'transparent',
            marginTop: 0,
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
                Continue
              </Text>
            </View>
          </PixelBorder>
        </PressableButton>
      </ScrollView>
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
