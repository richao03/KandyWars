import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useJokers, Joker as JokerType } from '../context/JokerContext';

interface Joker {
  id: number;
  name: string;
  description: string;
  type: 'one-time' | 'persistent';
  effect: string;
}

interface JokerSelectionProps {
  jokers: Joker[];
  theme: 'math' | 'computer' | 'homeec' | 'economy' | 'candy' | 'gym';
  subject: string;
  onComplete: () => void;
}

export default function JokerSelection({ jokers, theme, subject, onComplete }: JokerSelectionProps) {
  const [selectedJokers, setSelectedJokers] = useState<Joker[]>([]);
  const { addJoker } = useJokers();

  const selectRandomJokers = () => {
    const shuffled = [...jokers].sort(() => Math.random() - 0.5);
    setSelectedJokers(shuffled.slice(0, 3));
  };

  const handleJokerChoice = (jokerId: number) => {
    const selectedJoker = jokers.find(j => j.id === jokerId);
    if (selectedJoker) {
      // Add joker to inventory with theme information
      const jokerToAdd: JokerType = {
        ...selectedJoker,
        subject: subject,
        theme: theme,
        type: selectedJoker.type,
        effect: selectedJoker.effect
      };
      addJoker(jokerToAdd);
      console.log(`Added ${subject} joker to inventory: ${selectedJoker.name}`);
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
  const getEmoji = () => {
    switch (theme) {
      case 'math': return '🎓';
      case 'computer': return '🎭';
      case 'homeec': return '👩‍🍳';
      case 'economy': return '🏛️';
      case 'gym': return '🏃‍♂️';
      default: return '🍭';
    }
  };

  const getButtonText = () => {
    switch (theme) {
      case 'math': return '📊 Show 3 Math Concepts';
      case 'computer': return '💻 Show 3 Hack Tools';
      case 'homeec': return '🍳 Show 3 Kitchen Tools';
      case 'economy': return '🏛️ Show 3 Trade Tools';
      case 'gym': return '🏃‍♂️ Show 3 Fitness Tools';
      default: return '🍭 Show 3 Candy Tools';
    }
  };

  return (
    <View style={[styles.container, themeStyles.container]}>
      <View style={styles.jokerContainer}>
        <Text style={[styles.jokerTitle, themeStyles.title]}>
          {getEmoji()} Choose Your {subject} Tool!
        </Text>
        <Text style={[styles.jokerSubtitle, themeStyles.subtitle]}>
          Select one powerful ability to master the game:
        </Text>
        
        {selectedJokers.length === 0 && (
          <TouchableOpacity 
            style={[styles.generateButton, themeStyles.generateButton]} 
            onPress={selectRandomJokers}
          >
            <Text style={[styles.generateButtonText, themeStyles.generateButtonText]}>
              {getButtonText()}
            </Text>
          </TouchableOpacity>
        )}

        {selectedJokers.map((joker) => (
          <TouchableOpacity
            key={joker.id}
            style={[styles.jokerCard, themeStyles.jokerCard]}
            onPress={() => handleJokerChoice(joker.id)}
          >
            <Text style={[styles.jokerName, themeStyles.jokerName]}>{joker.name}</Text>
            <Text style={[styles.jokerDescription, themeStyles.jokerDescription]}>
              {joker.description}
            </Text>
          </TouchableOpacity>
        ))}

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
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
  },
  jokerSubtitle: {
    fontSize: 16,
    fontFamily: 'CrayonPastel',
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
    fontFamily: 'CrayonPastel',
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
  jokerName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
    marginBottom: 4,
  },
  jokerDescription: {
    fontSize: 14,
    fontFamily: 'CrayonPastel',
    lineHeight: 18,
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
    fontFamily: 'CrayonPastel',
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