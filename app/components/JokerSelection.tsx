import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useHallPass } from '../../src/hooks/useHallPass';
import { Joker as JokerType, useJokers } from '../../src/hooks/useJokers';
import { getJokersBySubject } from '../../src/utils/jokerEffectEngine';
import PixelBorder from './PixelBorder';
import TextWithEmojis from './TextWithEmojis';
import colors from '../../src/constants/colors';


interface Joker {
  id: number;
  name: string;
  description: string;
  subject?: string;
  type?: 'one-time' | 'persistent';
  effect?: string;
  effects?: Array<{
    target: string;
    operation: string;
    amount: number;
    duration: string;
  }>;
}

interface JokerSelectionProps {
  jokers: Joker[];
  theme: 'math' | 'computer' | 'homeec' | 'economy' | 'candy' | 'gym' | 'art' | 'logic' | 'recess' | 'geography';
  subject: string;
  onComplete: () => void;
  rewardTier?: 1 | 2 | 3; // 1 = 1 joker no reroll, 2 = 2 jokers + 1 reroll, 3 = 3 jokers + 2 rerolls
  completionLevel?: 1 | 2 | 3; // Which level the player completed before failing/winning
}

export default function JokerSelection({
  jokers,
  theme,
  subject,
  onComplete,
  rewardTier = 3,
  completionLevel = 3,
}: JokerSelectionProps) {
  const [selectedJokers, setSelectedJokers] = useState<Joker[]>([]);
  const [rerollsUsed, setRerollsUsed] = useState(0);
  const {
    addJoker,
    getJokersBySubject: getUserJokersBySubject,
    jokers: ownedJokers,
  } = useJokers();
  const { getJokerBonus } = useHallPass();

  // Get user's jokers for this subject (for reference, not used for selection anymore)
  // const userJokers = getUserJokersBySubject(subject); // Removed to fix linting warning
  // Filter out jokers the player already owns to prevent duplicates
  const ownedJokerIds = ownedJokers.map((joker) => joker.id);
  const availableJokers = jokers.filter(
    (joker) => !ownedJokerIds.includes(joker.id)
  );

  const selectRandomJokers = () => {
    if (availableJokers.length === 0) {
      console.log(
        '🃏 JokerSelection: No available jokers (player owns all jokers for this subject)'
      );
      // If no jokers available, skip selection
      onComplete();
      return;
    }

    const shuffled = [...availableJokers].sort(() => Math.random() - 0.5);
    const baseJokerCount = rewardTier; // 1, 2, or 3 jokers based on completion level
    const jokerBonus = getJokerBonus(); // +1 from valedictorian_vendor Hall Pass
    const requestedJokerCount = baseJokerCount + jokerBonus;
    // Limit to available jokers if we don't have enough
    const jokerCount = Math.min(requestedJokerCount, availableJokers.length);
    const selected = shuffled.slice(0, jokerCount);
    setSelectedJokers(selected);
  };

  const rerollJokers = () => {
    // For reroll, get fresh random jokers from the full pool for this subject, excluding owned ones
    const allSubjectJokers = getJokersBySubject(subject);
    const availableSubjectJokers = allSubjectJokers.filter(
      (joker) => !ownedJokerIds.includes(joker.id)
    );
    const shuffled = [...availableSubjectJokers].sort(
      () => Math.random() - 0.5
    );

    // Reroll gives 1 less joker than the original selection
    // So if you have 2 jokers, reroll gives you 1 random joker
    // If you have 3 jokers, reroll gives you 2 random jokers
    const baseJokerCount = rewardTier; // 1, 2, or 3 jokers based on completion level
    const jokerBonus = getJokerBonus(); // +1 from valedictorian_vendor Hall Pass
    const originalCount = baseJokerCount + jokerBonus;
    const rerollJokerCount = Math.max(1, originalCount - 1); // At least 1 joker on reroll

    setSelectedJokers(shuffled.slice(0, rerollJokerCount));
    setRerollsUsed((prev) => prev + 1);
  };

  const handleJokerChoice = (jokerId: number) => {
    // Look for the joker in the current selectedJokers or fall back to available jokers
    let selectedJoker = selectedJokers.find((j) => j.id === jokerId);
    if (!selectedJoker) {
      selectedJoker = availableJokers.find((j) => j.id === jokerId);
    }
    // If still not found (for rerolled jokers), look in the available subject pool (excluding owned)
    if (!selectedJoker) {
      const allSubjectJokers = getJokersBySubject(subject);
      const availableSubjectJokers = allSubjectJokers.filter(
        (joker) => !ownedJokerIds.includes(joker.id)
      );
      selectedJoker = availableSubjectJokers.find((j) => j.id === jokerId);
    }

    if (selectedJoker) {
      // Determine type from the joker's effects duration
      // If all effects are one-time, it's a one-time joker, otherwise persistent
      const isOneTime =
        selectedJoker.effects?.every((e: any) => e.duration === 'one-time') ??
        false;
      const jokerType = isOneTime ? 'one-time' : 'persistent';

      // Add joker to inventory with full structure
      const jokerToAdd: JokerType = {
        id: selectedJoker.id,
        name: selectedJoker.name,
        description: selectedJoker.description,
        subject: subject || selectedJoker.subject,
        theme: theme,
        type: jokerType, // Keep for backwards compatibility with jokers page
        effect:
          selectedJoker.effect || selectedJoker.effects?.[0]?.target || '',
        effects: selectedJoker.effects, // Include the full effects array!
      };

      // Add joker with source and minigame type for analytics
      addJoker(jokerToAdd, 'minigame', subject);
    }
    onComplete();
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'math':
        return {
          container: styles.mathContainer,
          title: styles.mathTitle,
          subtitle: styles.mathSubtitle,
          generateButton: styles.mathGenerateButton,
          generateButtonText: styles.mathGenerateButtonText,
          jokerCard: styles.mathJokerCard,
          jokerName: styles.mathJokerName,
          jokerDescription: styles.mathJokerDescription,
          skipButton: styles.mathSkipButton,
          skipButtonText: styles.mathSkipButtonText,
        };
      case 'computer':
        return {
          container: styles.computerContainer,
          title: styles.computerTitle,
          subtitle: styles.computerSubtitle,
          generateButton: styles.computerGenerateButton,
          generateButtonText: styles.computerGenerateButtonText,
          jokerCard: styles.computerJokerCard,
          jokerName: styles.computerJokerName,
          jokerDescription: styles.computerJokerDescription,
          skipButton: styles.computerSkipButton,
          skipButtonText: styles.computerSkipButtonText,
        };
      case 'homeec':
        return {
          container: styles.homeecContainer,
          title: styles.homeecTitle,
          subtitle: styles.homeecSubtitle,
          generateButton: styles.homeecGenerateButton,
          generateButtonText: styles.homeecGenerateButtonText,
          jokerCard: styles.homeecJokerCard,
          jokerName: styles.homeecJokerName,
          jokerDescription: styles.homeecJokerDescription,
          skipButton: styles.homeecSkipButton,
          skipButtonText: styles.homeecSkipButtonText,
        };
      case 'economy':
        return {
          container: styles.socialContainer,
          title: styles.socialTitle,
          subtitle: styles.socialSubtitle,
          generateButton: styles.socialGenerateButton,
          generateButtonText: styles.socialGenerateButtonText,
          jokerCard: styles.socialJokerCard,
          jokerName: styles.socialJokerName,
          jokerDescription: styles.socialJokerDescription,
          skipButton: styles.socialSkipButton,
          skipButtonText: styles.socialSkipButtonText,
        };
      case 'gym':
        return {
          container: styles.gymContainer,
          title: styles.gymTitle,
          subtitle: styles.gymSubtitle,
          generateButton: styles.gymGenerateButton,
          generateButtonText: styles.gymGenerateButtonText,
          jokerCard: styles.gymJokerCard,
          jokerName: styles.gymJokerName,
          jokerDescription: styles.gymJokerDescription,
          skipButton: styles.gymSkipButton,
          skipButtonText: styles.gymSkipButtonText,
        };
      case 'art':
        return {
          container: styles.artContainer,
          title: styles.artTitle,
          subtitle: styles.artSubtitle,
          generateButton: styles.artGenerateButton,
          generateButtonText: styles.artGenerateButtonText,
          jokerCard: styles.artJokerCard,
          jokerName: styles.artJokerName,
          jokerDescription: styles.artJokerDescription,
          skipButton: styles.artSkipButton,
          skipButtonText: styles.artSkipButtonText,
        };
      case 'logic':
        return {
          container: styles.logicContainer,
          title: styles.logicTitle,
          subtitle: styles.logicSubtitle,
          generateButton: styles.logicGenerateButton,
          generateButtonText: styles.logicGenerateButtonText,
          jokerCard: styles.logicJokerCard,
          jokerName: styles.logicJokerName,
          jokerDescription: styles.logicJokerDescription,
          skipButton: styles.logicSkipButton,
          skipButtonText: styles.logicSkipButtonText,
        };
      case 'recess':
        return {
          container: styles.recessContainer,
          title: styles.recessTitle,
          subtitle: styles.recessSubtitle,
          generateButton: styles.recessGenerateButton,
          generateButtonText: styles.recessGenerateButtonText,
          jokerCard: styles.recessJokerCard,
          jokerName: styles.recessJokerName,
          jokerDescription: styles.recessJokerDescription,
          skipButton: styles.recessSkipButton,
          skipButtonText: styles.recessSkipButtonText,
        };
      case 'geography':
        return {
          container: styles.geographyContainer,
          title: styles.geographyTitle,
          subtitle: styles.geographySubtitle,
          generateButton: styles.geographyGenerateButton,
          generateButtonText: styles.geographyGenerateButtonText,
          jokerCard: styles.geographyJokerCard,
          jokerName: styles.geographyJokerName,
          jokerDescription: styles.geographyJokerDescription,
          skipButton: styles.geographySkipButton,
          skipButtonText: styles.geographySkipButtonText,
        };
      default: // candy
        return {
          container: styles.candyContainer,
          title: styles.candyTitle,
          subtitle: styles.candySubtitle,
          generateButton: styles.candyGenerateButton,
          generateButtonText: styles.candyGenerateButtonText,
          jokerCard: styles.candyJokerCard,
          jokerName: styles.candyJokerName,
          jokerDescription: styles.candyJokerDescription,
          skipButton: styles.candySkipButton,
          skipButtonText: styles.candySkipButtonText,
        };
    }
  };

  const themeStyles = getThemeStyles();

  const getButtonText = () => {
    const count = rewardTier;
    switch (theme) {
      case 'math':
        return (
          <View style={styles.rewardTextRow}>
            <Text style={[styles.showButtonText, themeStyles.subtitle]}>
              Show {count} Math Joker{count > 1 ? 's' : ''}
            </Text>
          </View>
        );
      case 'computer':
        return (
          <Text style={[styles.showButtonText, themeStyles.subtitle]}>
            Show {count} Hack Joker{count > 1 ? 's' : ''}
          </Text>
        );
      case 'homeec':
        return (
          <Text style={[styles.showButtonText, themeStyles.subtitle]}>
            Show {count} Kitchen Joker{count > 1 ? 's' : ''}
          </Text>
        );
      case 'economy':
        return (
          <Text style={[styles.showButtonText, themeStyles.subtitle]}>
            Show {count} Economy Joker{count > 1 ? 's' : ''}
          </Text>
        );
      case 'gym':
        return (
          <TextWithEmojis style={[styles.showButtonText, themeStyles.subtitle]}>
            Show {count} Fitness Joker{count > 1 ? 's' : ''}
          </TextWithEmojis>
        );
      case 'art':
        return (
          <Text style={[styles.showButtonText, themeStyles.subtitle]}>
            Show {count} Art Joker{count > 1 ? 's' : ''}
          </Text>
        );
      case 'logic':
        return (
          <Text style={[styles.showButtonText, themeStyles.subtitle]}>
            Show {count} Logic Joker{count > 1 ? 's' : ''}
          </Text>
        );
      case 'recess':
        return (
          <Text style={[styles.showButtonText, themeStyles.subtitle]}>
            Show {count} Recess Joker{count > 1 ? 's' : ''}
          </Text>
        );
      case 'geography':
        return (
          <Text style={[styles.showButtonText, themeStyles.subtitle]}>
            Show {count} Geography Joker{count > 1 ? 's' : ''}
          </Text>
        );
      default:
        return (
          <Text style={[styles.showButtonText, themeStyles.subtitle]}>
            {' '}
            Show {count} Candy Tool{count > 1 ? 's' : ''}
          </Text>
        );
    }
  };

  // Helper functions for reroll logic
  const getMaxRerolls = () => {
    if (rewardTier === 2) return 1; // Level 2: 1 reroll allowed
    if (rewardTier === 3) return 2; // Level 3: 2 rerolls allowed
    return 0; // Level 1: no rerolls
  };

  const canReroll = () => {
    return rerollsUsed < getMaxRerolls() && rewardTier > 1;
  };

  const getRerollDescription = () => {
    const remaining = getMaxRerolls() - rerollsUsed;
    const jokerBonus = getJokerBonus();
    const originalCount = rewardTier + jokerBonus;
    const rerollCards = Math.max(1, originalCount - 1);
    return `${remaining} reroll${remaining > 1 ? 's' : ''} left, ${rerollCards} card${rerollCards > 1 ? 's' : ''}`;
  };

  const getRewardDescription = () => {
    if (completionLevel === 1) return 'You completed Level 1!';
    if (completionLevel === 2) return 'You completed Level 2!';
    if (completionLevel === 3) return 'You mastered all 3 levels!';
    return 'Great job!';
  };

  return (
    <View style={[styles.container, themeStyles.container]}>
      <View style={styles.jokerContainer}>
        <Text style={[styles.jokerTitle, themeStyles.title]}>
          Choose Your {subject} Joker!
        </Text>
        <Text style={[styles.jokerSubtitle, themeStyles.subtitle]}>
          {getRewardDescription()} {'\n'}
          {availableJokers.length === 0
            ? 'You already have all available jokers for this subject!'
            : 'Select one powerful ability:'}
        </Text>

        {selectedJokers.length === 0 && availableJokers.length > 0 && (
          <PixelBorder
            borderColor={themeStyles.generateButton?.borderColor || '#ffff99'}
            borderWidth={3}
            backgroundColor={
              themeStyles.generateButton?.backgroundColor || '#1a2f23'
            }
            innerPadding={0}
            style={{ marginBottom: 20 }}
          >
            <TouchableOpacity
              style={{
                padding: 16,
                alignItems: 'center',
                backgroundColor: 'transparent',
              }}
              onPress={selectRandomJokers}
            >
              <View
                style={[
                  styles.generateButtonText,
                  themeStyles.generateButtonText,
                ]}
              >
                {getButtonText()}
              </View>
            </TouchableOpacity>
          </PixelBorder>
        )}

        {selectedJokers.map((joker) => {
          // Determine if this joker is instant or aura
          const isOneTime =
            joker.effects?.every((e: any) => e.duration === 'one-time') ??
            false;
          const jokerType = isOneTime ? 'instant' : 'aura';
          const typeEmoji = isOneTime ? '⚡' : '🔮';

          return (
            <PixelBorder
              key={joker.id}
              borderColor={themeStyles.jokerCard?.borderColor || '#8fbc8f'}
              borderWidth={3}
              backgroundColor={
                themeStyles.jokerCard?.backgroundColor || '#1a2f23'
              }
              innerPadding={16}
              style={{ marginBottom: 12 }}
            >
              <TouchableOpacity
                onPress={() => handleJokerChoice(joker.id)}
                style={{ backgroundColor: 'transparent' }}
              >
                <View style={styles.jokerHeader}>
                  <Text style={[styles.jokerName, themeStyles.jokerName]}>
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
              </TouchableOpacity>
            </PixelBorder>
          );
        })}

        {selectedJokers.length > 0 && canReroll() && (
          <PixelBorder
            borderColor={themeStyles.generateButton?.borderColor || '#ffff99'}
            borderWidth={3}
            backgroundColor={
              themeStyles.generateButton?.backgroundColor || '#1a2f23'
            }
            innerPadding={0}
            style={{ marginBottom: 20 }}
          >
            <TouchableOpacity
              style={{
                padding: 16,
                alignItems: 'center',
                backgroundColor: 'transparent',
              }}
              onPress={rerollJokers}
            >
              <View
                style={{
                  marginLeft: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TextWithEmojis
                  style={[styles.rerollButtonIcon]}
                  imageSize={36}
                >
                  🎲
                </TextWithEmojis>
                <TextWithEmojis
                  style={[
                    styles.rerollButtonText,
                    themeStyles.generateButtonText,
                  ]}
                  imageSize={20}
                >
                  {`Reroll ${getRerollDescription()}`}
                </TextWithEmojis>
              </View>
            </TouchableOpacity>
          </PixelBorder>
        )}

        <PixelBorder
          borderColor={themeStyles.skipButton?.borderColor || '#daa520'}
          borderWidth={2}
          backgroundColor={themeStyles.skipButton?.backgroundColor || '#8b4513'}
          innerPadding={0}
          style={{ marginTop: 16 }}
        >
          <TouchableOpacity
            style={{
              paddingVertical: 12,
              alignItems: 'center',
              backgroundColor: 'transparent',
            }}
            onPress={onComplete}
          >
            <Text style={[styles.skipButtonText, themeStyles.skipButtonText]}>
              {availableJokers.length === 0
                ? 'Continue'
                : 'Skip Joker Selection'}
            </Text>
          </TouchableOpacity>
        </PixelBorder>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  jokerContainer: {
    flex: 1,
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
  showButtonText: {
    fontSize: 18,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  generateButton: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    marginBottom: 20,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    marginRight: 6,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  jokerCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    marginBottom: 12,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
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
    flex: 1,
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
  skipButton: {
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    marginTop: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  rerollButton: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    marginBottom: 20,
  },
  rerollButtonText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
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
    shadowColor: colors.blue.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  computerGenerateButtonText: {
    color: colors.blue.cyan,
  },
  computerJokerCard: {
    backgroundColor: colors.blue.darkBg,
    borderColor: colors.blue.cyan,
    shadowColor: colors.blue.cyan,
    shadowOpacity: 0.8,
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
