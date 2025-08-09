import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FlipCard from 'react-native-flip-card';
import JokerSelection from '../components/JokerSelection';

interface MemoryCard {
  id: string;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface ComputerGameProps {
  onComplete: () => void;
}

// Computer/tech-themed emojis for memory game
const TECH_EMOJIS = ['💻', '🖥️', '⌨️', '🖱️', '💾', '💿', '📱', '⚡', '🔌', '🔋', '📡', '🛰️', '🎮', '🕹️', '📺', '🎧'];

// Computer jokers (hacker-themed)
const COMPUTER_JOKERS = [
  { id: 1, name: "Memory Buffer", description: "Remember market data from 3 periods ago" },
  { id: 2, name: "Storage Overflow", description: "Store extra inventory without limits" },
  { id: 3, name: "Overclock Mode", description: "Make trades twice as fast for 1 period" },
  { id: 4, name: "Profit Calculator", description: "See exact profit margins on all trades" },
  { id: 5, name: "Market Database", description: "Predict next period's trending items" },
  { id: 6, name: "System Backup", description: "Duplicate any successful trade strategy" },
  { id: 7, name: "Auto-Sort Algorithm", description: "Auto-organize inventory by profitability" },
  { id: 8, name: "Data Compiler", description: "Combine 3 small items into 1 premium item" },
];

export default function ComputerGame({ onComplete }: ComputerGameProps) {
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [turns, setTurns] = useState(0);
  const [maxTurns, setMaxTurns] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);

  // Level configuration: [pairs, maxTurns]
  const levelConfig = {
    1: { pairs: 6, maxTurns: 12 },   // 6 pairs, 12 turns (2x2 grid)
    2: { pairs: 8, maxTurns: 16 },   // 8 pairs, 16 turns (4x4 grid)
    3: { pairs: 12, maxTurns: 20 },  // 12 pairs, 20 turns (4x6 grid)
  };

  const initializeLevel = (levelNum: number) => {
    const config = levelConfig[levelNum as keyof typeof levelConfig];
    const selectedEmojis = TECH_EMOJIS.slice(0, config.pairs);
    
    // Create pairs
    const cardPairs: MemoryCard[] = [];
    selectedEmojis.forEach((emoji, index) => {
      // Add two cards for each emoji
      cardPairs.push({
        id: `${emoji}-1`,
        emoji,
        isFlipped: false,
        isMatched: false,
      });
      cardPairs.push({
        id: `${emoji}-2`,
        emoji,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle cards
    const shuffledCards = [...cardPairs].sort(() => Math.random() - 0.5);
    
    setCards(shuffledCards);
    setFlippedCards([]);
    setTurns(0);
    setMaxTurns(config.maxTurns);
    setIsGameActive(true);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      initializeLevel(level);
    }
  }, [level, gameState]);

  const handleCardPress = (cardId: string) => {
    if (!isGameActive) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched || flippedCards.length >= 2) return;

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    // Update card state to show it's flipped
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));

    if (newFlippedCards.length === 2) {
      const [firstCardId, secondCardId] = newFlippedCards;
      const firstCard = cards.find(c => c.id === firstCardId);
      const secondCard = cards.find(c => c.id === secondCardId);

      if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
        // Match found!
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            (c.id === firstCardId || c.id === secondCardId) 
              ? { ...c, isMatched: true }
              : c
          ));
          setFlippedCards([]);
          
          // Check if all cards are matched
          const updatedCards = cards.map(c => 
            (c.id === firstCardId || c.id === secondCardId) 
              ? { ...c, isMatched: true }
              : c
          );
          
          if (updatedCards.every(c => c.isMatched)) {
            handleLevelComplete();
          }
        }, 1000);
      } else {
        // No match, flip back after delay
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            (c.id === firstCardId || c.id === secondCardId) 
              ? { ...c, isFlipped: false }
              : c
          ));
          setFlippedCards([]);
        }, 1500);
      }
      
      setTurns(prev => prev + 1);
      
      // Check if out of turns
      if (turns + 1 >= maxTurns) {
        setTimeout(() => {
          setIsGameActive(false);
          Alert.alert(
            '💥 System Breach Failed!'
            `You ran out of turns! Try again?`,
            [
              { text: 'Try Again', onPress: () => initializeLevel(level) },
              { text: 'Give Up', onPress: () => router.back(), style: 'destructive' }
            ]
          );
        }, 2000);
      }
    }
  };

  const handleLevelComplete = () => {
    setIsGameActive(false);
    
    if (level < 3) {
      Alert.alert(
        `🎉 Level ${level} Complete!`,
        `Great memory work! Ready for Level ${level + 1}?`,
        [
          { text: `Level ${level + 1}`, onPress: () => setLevel(level + 1) }
        ]
      );
    } else {
      Alert.alert(
        '🏆 System Infiltrated!',
        'Incredible! You\'ve hacked all network nodes!'
        [
          { text: 'Choose Reward', onPress: () => {
            setTimeout(() => setGameState('jokerSelection'), 500);
          }}
        ]
      );
    }
  };

  const selectRandomJokers = () => {
    const shuffled = [...COMPUTER_JOKERS].sort(() => Math.random() - 0.5);
    setSelectedJokers(shuffled.slice(0, 3));
  };

  const handleJokerChoice = (jokerId: number) => {
    console.log(`Selected computer joker: ${COMPUTER_JOKERS.find(j => j.id === jokerId)?.name}`);
    onComplete();
  };

  const handleForfeit = () => {
    Alert.alert(
      '🚪 Abort Hack Session?',
      'If you leave now, you\'ll forfeit your chance to study tonight and won\'t get a joker reward.'
      [
        { text: 'Stay', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: () => router.back()
        }
      ]
    );
  };

  const getGridStyle = () => {
    const config = levelConfig[level as keyof typeof levelConfig];
    if (config.pairs <= 6) return styles.grid3x4; // 3x4 for level 1
    if (config.pairs <= 8) return styles.grid4x4; // 4x4 for level 2
    return styles.grid4x6; // 4x6 for level 3
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection 
        jokers={COMPUTER_JOKERS}
        theme="computer"
        subject="Computer"
        onComplete={onComplete}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>💻 Computer Study Session! ⚡</Text>
          
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>📝 How to Solve:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>Infiltrate the system by matching tech component pairs</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>Click cards to flip them and reveal hidden tech icons</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>Find matching pairs before your hack attempts run out</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>Complete 3 levels with increasing difficulty</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>5.</Text>
              <Text style={styles.stepText}>Level 1: 6 pairs, Level 2: 8 pairs, Level 3: 12 pairs</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.startGameButton} 
            onPress={() => {
              setGameState('playing');
              setLevel(1);
              initializeLevel(1);
            }}
          >
            <Text style={styles.startGameButtonText}>💻 Start Computer Challenge!</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.startGameButton} onPress={() => router.back()}>
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>💻 Hack the System</Text>
        <Text style={styles.subtitle}>Match the tech pairs to infiltrate the network!</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.level}>Level {level}/3</Text>
          <Text style={styles.turns}>Turns: {turns}/{maxTurns}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <View style={[styles.cardGrid, getGridStyle()]}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.cardContainer}
              onPress={() => handleCardPress(card.id)}
              disabled={!isGameActive || card.isMatched}
            >
              <FlipCard
                style={styles.flipCard}
                friction={6}
                perspective={1000}
                flipHorizontal={true}
                flipVertical={false}
                flip={card.isFlipped || card.isMatched}
                clickable={false}
              >
                {/* Front (back of card) */}
                <View style={styles.cardBack}>
                  <Text style={styles.cardBackText}></Text>
                </View>
                {/* Back (front of card with emoji) */}
                <View style={[styles.cardFront, card.isMatched && styles.cardMatched]}>
                  <Text style={styles.cardEmoji}>{card.emoji}</Text>
                </View>
              </FlipCard>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.instructionsButton} onPress={() => setGameState('instructions')}>
          <Text style={styles.instructionsButtonText}>📋 Mission Brief</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.instructionsButton} onPress={handleForfeit}>
          <Text style={styles.instructionsButtonText}>🚪 Leave</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.restartButton} onPress={() => initializeLevel(level)}>
          <Text style={styles.restartButtonText}>🔄 Reset Hack</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00ff41',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: '#00ff41',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#00d4ff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 16,
  },
  gameInfo: {
    flexDirection: 'row',
    gap: 20,
  },
  level: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00ff41',
    fontFamily: 'CrayonPastel',
  },
  turns: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff073a',
    fontFamily: 'CrayonPastel',
  },
  gameContainer: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  cardGrid: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid3x4: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  grid4x4: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  grid4x6: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cardContainer: {
    width: 70,
    height: 70,
    margin: 2,
  },
  flipCard: {
    width: '100%',
    height: '100%',
  },
  cardBack: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00d4ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  cardBackText: {
    fontSize: 24,
    color: '#00d4ff',
  },
  cardFront: {
    width: '100%',
    height: '100%',
    backgroundColor: '#16213e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00ff41',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ff41',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  cardMatched: {
    backgroundColor: '#0d1b2a',
    borderColor: '#00ff41',
    shadowColor: '#00ff41',
    shadowOpacity: 1.0,
  },
  cardEmoji: {
    fontSize: 30,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
  },
  restartButton: {
    flex: 1,
    backgroundColor: '#16213e',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00d4ff',
    alignItems: 'center',
  },
  restartButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00d4ff',
    fontFamily: 'CrayonPastel',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff073a',
    fontFamily: 'CrayonPastel',
  },
  // Joker Selection Styles
  jokerContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#0a0e1a',
  },
  jokerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00ff41',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: '#00ff41',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  jokerSubtitle: {
    fontSize: 16,
    color: '#00d4ff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 24,
  },
  generateButton: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#00d4ff',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00d4ff',
    fontFamily: 'CrayonPastel',
  },
  jokerCard: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#00d4ff',
    marginBottom: 12,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  jokerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00ff41',
    fontFamily: 'CrayonPastel',
    marginBottom: 4,
  },
  jokerDescription: {
    fontSize: 14,
    color: '#a0a0ff',
    fontFamily: 'CrayonPastel',
    lineHeight: 18,
  },
  skipButton: {
    backgroundColor: '#2d1b3d',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    alignItems: 'center',
    marginTop: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a78bfa',
    fontFamily: 'CrayonPastel',
  },
  // Instructions Styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#0a0e1a',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00ff41',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#00ff41',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  instructionsCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#00d4ff',
    marginBottom: 20,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00ff41',
    fontFamily: 'CrayonPastel',
    marginBottom: 15,
    textAlign: 'center',
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00ff41',
    fontFamily: 'CrayonPastel',
    marginRight: 10,
    minWidth: 20,
  },
  stepText: {
    fontSize: 16,
    color: '#a0a0ff',
    fontFamily: 'CrayonPastel',
    flex: 1,
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: '#16213e',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#00ff41',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#00ff41',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00ff41',
    fontFamily: 'CrayonPastel',
  },
  instructionsButton: {
    flex: 1,
    backgroundColor: '#16213e',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00d4ff',
    alignItems: 'center',
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00d4ff',
    fontFamily: 'CrayonPastel',
  },
});