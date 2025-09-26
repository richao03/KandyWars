import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Joker as JokerType, useJokers } from '../../src/hooks/useJokers';
import { getJokersBySubject } from '../../src/utils/jokerEffectEngine';
import { useHallPass } from '../../src/hooks/useHallPass';

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
  const { addJoker, getJokersBySubject: getUserJokersBySubject } = useJokers();
  const { getJokerBonus } = useHallPass();

  // Get user's jokers for this subject (for reference, not used for selection anymore)
  const userJokers = getUserJokersBySubject(subject);
  // Always use the full joker pool for minigame rewards (provided jokers)
  // Don't limit to user's existing jokers as that prevents proper rewards
  const availableJokers = jokers;

  const selectRandomJokers = () => {
    const shuffled = [...availableJokers].sort(() => Math.random() - 0.5);
    const baseJokerCount = rewardTier; // 1, 2, or 3 jokers based on completion level
    const jokerBonus = getJokerBonus(); // +1 from valedictorian_vendor Hall Pass
    const jokerCount = baseJokerCount + jokerBonus;
    const selected = shuffled.slice(0, jokerCount);
    setSelectedJokers(selected);
  };

  const rerollJokers = () => {
    // For reroll, get fresh random jokers from the full pool for this subject
    const allSubjectJokers = getJokersBySubject(subject);
    const shuffled = [...allSubjectJokers].sort(() => Math.random() - 0.5);

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
    // If still not found (for rerolled jokers), look in the full subject pool
    if (!selectedJoker) {
      const allSubjectJokers = getJokersBySubject(subject);
      selectedJoker = allSubjectJokers.find((j) => j.id === jokerId);
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
        return `📊 Show ${count} Math Concept${count > 1 ? 's' : ''}`;
      case 'computer':
        return `💻 Show ${count} Hack Tool${count > 1 ? 's' : ''}`;
      case 'homeec':
        return `🍳 Show ${count} Kitchen Tool${count > 1 ? 's' : ''}`;
      case 'economy':
        return `🏛️ Show ${count} Trade Tool${count > 1 ? 's' : ''}`;
      case 'gym':
        return `🏃‍♂️ Show ${count} Fitness Tool${count > 1 ? 's' : ''}`;
      default:
        return `🍭 Show ${count} Candy Tool${count > 1 ? 's' : ''}`;
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
          {getRewardDescription()} {'\n'} Select one powerful ability:
        </Text>

        {selectedJokers.length === 0 && (
          <TouchableOpacity
            style={[styles.generateButton, themeStyles.generateButton]}
            onPress={selectRandomJokers}
          >
            <Text
              style={[
                styles.generateButtonText,
                themeStyles.generateButtonText,
              ]}
            >
              {getButtonText()}
            </Text>
          </TouchableOpacity>
        )}

        {selectedJokers.map((joker) => {
          // Determine if this joker is instant or aura
          const isOneTime =
            joker.effects?.every((e: any) => e.duration === 'one-time') ??
            false;
          const jokerType = isOneTime ? 'instant' : 'aura';
          const typeEmoji = isOneTime ? '⚡' : '🔮';

          return (
            <TouchableOpacity
              key={joker.id}
              style={[styles.jokerCard, themeStyles.jokerCard]}
              onPress={() => handleJokerChoice(joker.id)}
            >
              <View style={styles.jokerHeader}>
                <Text style={[styles.jokerName, themeStyles.jokerName]}>
                  {joker.name}
                </Text>
                <View
                  style={[
                    styles.typeIndicator,
                    isOneTime ? styles.instantIndicator : styles.auraIndicator,
                  ]}
                >
                  <Text style={styles.typeEmoji}>{typeEmoji}</Text>
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
                style={[styles.jokerDescription, themeStyles.jokerDescription]}
              >
                {joker.description}
              </Text>
            </TouchableOpacity>
          );
        })}

        {selectedJokers.length > 0 && canReroll() && (
          <TouchableOpacity
            style={[styles.rerollButton, themeStyles.generateButton]}
            onPress={rerollJokers}
          >
            <Text
              style={[styles.rerollButtonText, themeStyles.generateButtonText]}
            >
              🎲 Reroll ({getRerollDescription()})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.skipButton, themeStyles.skipButton]}
          onPress={onComplete}
        >
          <Text style={[styles.skipButtonText, themeStyles.skipButtonText]}>
            Skip Tool Selection
          </Text>
        </TouchableOpacity>
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
