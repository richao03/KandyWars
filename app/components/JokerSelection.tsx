import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useHallPass } from '../../src/hooks/useHallPass';
import { Joker as JokerType, useJokers } from '../../src/hooks/useJokers';
import { getJokersBySubject } from '../../src/utils/jokerEffectEngine';
import { scoreboardService } from '../../src/services/firebase';
import PixelBorder from './PixelBorder';
import TextWithEmojis from './TextWithEmojis';

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
  theme: 'math' | 'computer' | 'homeec' | 'economy' | 'candy' | 'gym';
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

    // Reroll gives fewer jokers based on tier
    let baseRerollJokerCount;
    if (rewardTier === 2)
      baseRerollJokerCount = 1; // Level 2: reroll for 1 joker
    else if (rewardTier === 3)
      baseRerollJokerCount = 2; // Level 3: reroll for 2 jokers
    else baseRerollJokerCount = 0; // Level 1: no reroll

    const jokerBonus = getJokerBonus(); // +1 from valedictorian_vendor Hall Pass
    const rerollJokerCount = baseRerollJokerCount + jokerBonus;

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

      addJoker(jokerToAdd);

      // Track joker obtained from minigame in Firebase
      scoreboardService.trackJokerFromMinigame(
        selectedJoker.name,
        selectedJoker.id,
        subject
      ).catch(error => {
        console.error('Failed to track joker from minigame:', error);
      });
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
    if (rewardTier === 2) return `${remaining} reroll left, 1 card`;
    if (rewardTier === 3)
      return `${remaining} reroll${remaining > 1 ? 's' : ''} left, 2 cards`;
    return '';
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
              <TextWithEmojis
                style={[
                  styles.rerollButtonText,
                  themeStyles.generateButtonText,
                ]}
              >
                🎲 Reroll ({getRerollDescription()})
              </TextWithEmojis>
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
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },

  // Math Theme (Chalkboard)
  mathContainer: {
    backgroundColor: '#2d4a3e',
  },
  mathTitle: {
    color: '#f5f5dc',
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
    color: '#f5f5dc',
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
    color: '#f5f5dc',
  },
  mathSkipButton: {
    backgroundColor: '#8b4513',
    borderColor: '#daa520',
  },
  mathSkipButtonText: {
    color: '#f5f5dc',
  },

  // Computer Theme (Hacker)
  computerContainer: {
    backgroundColor: '#0a0e1a',
  },
  computerTitle: {
    color: '#00ff41',
    textShadowColor: '#00ff41',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  computerSubtitle: {
    color: '#00d4ff',
  },
  computerGenerateButton: {
    backgroundColor: '#16213e',
    borderColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  computerGenerateButtonText: {
    color: '#00d4ff',
  },
  computerJokerCard: {
    backgroundColor: '#16213e',
    borderColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOpacity: 0.8,
  },
  computerJokerName: {
    color: '#00ff41',
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
    color: '#8B4513',
  },
  homeecGenerateButton: {
    backgroundColor: '#F4A460',
    borderColor: '#D2691E',
  },
  homeecGenerateButtonText: {
    color: '#FFFFFF',
    textShadowColor: '#8B4513',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  homeecJokerCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F4A460',
    shadowColor: '#D2691E',
  },
  homeecJokerName: {
    color: '#D2691E',
  },
  homeecJokerDescription: {
    color: '#8B4513',
  },
  homeecSkipButton: {
    backgroundColor: '#E9ECEF',
    borderColor: '#CCC',
  },
  homeecSkipButtonText: {
    color: '#666',
  },

  // Social Studies Theme (Trading Post)
  socialContainer: {
    backgroundColor: '#F5F5DC',
  },
  socialTitle: {
    color: '#8B4513',
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
    color: '#8B4513',
  },
  socialJokerCard: {
    backgroundColor: '#FFF',
    borderColor: '#DEB887',
    shadowColor: '#8B4513',
  },
  socialJokerName: {
    color: '#8B4513',
  },
  socialJokerDescription: {
    color: '#A0522D',
  },
  socialSkipButton: {
    backgroundColor: '#FFE4B5',
    borderColor: '#DEB887',
  },
  socialSkipButtonText: {
    color: '#8B4513',
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
    color: '#ec4899',
  },
  candyGenerateButton: {
    backgroundColor: '#f9a8d4',
    borderColor: '#ec4899',
  },
  candyGenerateButtonText: {
    color: '#be185d',
  },
  candyJokerCard: {
    backgroundColor: '#ffffff',
    borderColor: '#f9a8d4',
    shadowColor: '#ec4899',
  },
  candyJokerName: {
    color: '#be185d',
  },
  candyJokerDescription: {
    color: '#ec4899',
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
    color: '#fff',
    textShadowColor: '#ff6b35',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gymSubtitle: {
    color: '#fff',
  },
  gymGenerateButton: {
    backgroundColor: '#2d4a3e',
    borderColor: '#ff6b35',
  },
  gymGenerateButtonText: {
    color: '#fff',
  },
  gymJokerCard: {
    backgroundColor: '#0f1419',
    borderColor: '#ff6b35',
    shadowColor: '#ff6b35',
  },
  gymJokerName: {
    color: '#ff6b35',
  },
  gymJokerDescription: {
    color: '#fff',
  },
  gymSkipButton: {
    backgroundColor: '#8b4513',
    borderColor: '#daa520',
  },
  gymSkipButtonText: {
    color: '#fff',
  },
});
