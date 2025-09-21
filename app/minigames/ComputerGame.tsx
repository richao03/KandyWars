import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FlipCard from 'react-native-flip-card';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { COMPUTER_JOKERS } from '../../src/utils/jokerEffectEngine';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';

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
const TECH_EMOJIS = [
  '💻',
  '🖥️',
  '⌨️',
  '🖱️',
  '💾',
  '💿',
  '📱',
  '⚡',
  '🔌',
  '🔋',
  '📡',
  '🛰️',
  '🎮',
  '🕹️',
  '📺',
  '🎧',
];

export default function ComputerGame({ onComplete }: ComputerGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { trackMinigamePlayed } = useScoreboard();

  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [turns, setTurns] = useState(0);
  const [maxTurns, setMaxTurns] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [showingAllCards, setShowingAllCards] = useState(false);
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed

  // Level configuration: [pairs, maxTurns]
  const levelConfig = {
    1: { pairs: 6, maxTurns: 12 }, // 6 pairs, 12 turns (2x2 grid)
    2: { pairs: 8, maxTurns: 16 }, // 8 pairs, 16 turns (4x4 grid)
    3: { pairs: 12, maxTurns: 20 }, // 12 pairs, 20 turns (4x6 grid)
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
        isFlipped: true, // Start with all cards face up
        isMatched: false,
      });
      cardPairs.push({
        id: `${emoji}-2`,
        emoji,
        isFlipped: true, // Start with all cards face up
        isMatched: false,
      });
    });

    // Shuffle cards
    const shuffledCards = [...cardPairs].sort(() => Math.random() - 0.5);

    setCards(shuffledCards);
    setFlippedCards([]);
    setTurns(0);
    setMaxTurns(config.maxTurns);
    setShowingAllCards(true);
    setIsGameActive(false); // Don't allow clicks yet

    // After 2.5 seconds, flip all cards back and activate game
    setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
      setShowingAllCards(false);
      setIsGameActive(true);
    }, 2500);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      initializeLevel(level);
    }
  }, [level, gameState]);

  // Check for win condition whenever cards change
  useEffect(() => {
    if (gameState === 'playing' && isGameActive && cards.length > 0) {
      const allMatched = cards.every((card) => card.isMatched);
      if (allMatched) {
        handleLevelComplete();
      }
    }
  }, [cards, gameState, isGameActive]);

  const handleCardPress = (cardId: string) => {
    if (!isGameActive || showingAllCards) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched || flippedCards.length >= 2)
      return;

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    // Update card state to show it's flipped
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );

    if (newFlippedCards.length === 2) {
      const [firstCardId, secondCardId] = newFlippedCards;
      const firstCard = cards.find((c) => c.id === firstCardId);
      const secondCard = cards.find((c) => c.id === secondCardId);

      if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
        // Match found! Allow new clicks immediately
        setFlippedCards([]);

        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstCardId || c.id === secondCardId
                ? { ...c, isMatched: true }
                : c
            )
          );

          // Win condition check is now handled by useEffect
        }, 1000);
      } else {
        // No match, clear flipped cards immediately but flip back after delay
        setFlippedCards([]); // Allow new clicks immediately
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstCardId || c.id === secondCardId
                ? { ...c, isFlipped: false }
                : c
            )
          );
        }, 400); // Set back to 400ms but allow immediate new clicks
      }

      setTurns((prev) => prev + 1);

      // Check if out of turns
      if (turns + 1 >= maxTurns) {
        setTimeout(() => {
          setIsGameActive(false);

          if (completedLevel > 0) {
            // Player completed at least one level, award jokers based on completion
            setGameState('jokerSelection');
          } else {
            // Player didn't complete any level, show restart option
            showModal(
              '💥 System Breach Failed!',
              'You ran out of turns! Try again?',
              '💥',
              () => {
                setGameState('instructions');
              }
            );
          }
        }, 2000);
      }
    }
  };

  // Start game
  const startGame = () => {
    // Track minigame play for analytics
    trackMinigamePlayed('computer');

    setGameState('playing');
    setLevel(1);
    initializeLevel(1);
  };

  const handleLevelComplete = () => {
    setIsGameActive(false);

    // Mark this level as completed
    setCompletedLevel(level);

    if (level < 3) {
      showModal(
        `🎉 Level ${level} Complete!`,
        `Great memory work! Ready for Level ${level + 1}?`,
        '🎉',
        () => {
          setLevel(level + 1);
        }
      );
    } else {
      showModal(
        '🏆 System Infiltrated!',
        "Incredible! You've hacked through all security layers!",
        '🏆',
        () => {
          setGameState('jokerSelection');
        }
      );
    }
  };

  const handleJokerChoice = (jokerId: number) => {
    console.log(
      `Selected computer joker: ${COMPUTER_JOKERS.find((j) => j.id === jokerId)?.name}`
    );
    onComplete();
  };

  const handleForfeit = () => {
    showModal(
      '🚪 Abort Hack Session?',
      "If you leave now, you'll lose your hacking progress!",
      '🚪',
      () => {
        router.back();
      }
    );
  };

  const getGridStyle = () => {
    const config = levelConfig[level as keyof typeof levelConfig];
    if (config.pairs <= 6) return styles.grid3x4; // 3x4 for level 1
    if (config.pairs <= 8) return styles.grid4x4; // 4x4 for level 2
    return styles.grid4x6; // 4x6 for level 3
  };

  const getCardStyle = () => {
    const config = levelConfig[level as keyof typeof levelConfig];
    if (config.pairs <= 6) return styles.cardContainer; // Normal size for level 1
    if (config.pairs <= 8) return styles.cardContainerMedium; // Medium size for level 2
    return styles.cardContainerSmall; // Small size for level 3
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection
        jokers={COMPUTER_JOKERS}
        theme="computer"
        subject="Computer"
        onComplete={onComplete}
        rewardTier={completedLevel as 1 | 2 | 3}
        completionLevel={completedLevel as 1 | 2 | 3}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Computer Study Session!</Text>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>How to Solve:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>
                Match tech component pairs to hack the system
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Flip cards to reveal hidden icons, find matches
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>
                Limited attempts - memorize positions carefully!
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startGameButton} onPress={startGame}>
            <Text style={styles.startGameButtonText}>Start Challenge!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.startGameButton}
            onPress={() => router.back()}
          >
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <View
        style={[
          styles.container,
          {
            padding: ResponsiveSpacing.containerPadding(),
            paddingBottom: ResponsiveSpacing.containerPaddingBottom(),
          },
        ]}
      >
        <MinigameHUD
          title="💻 Hack the System"
          subtitle="Match the tech pairs to infiltrate the network!"
          leftInfo={`Level ${level}/3`}
          rightInfo={`Turns: ${turns}/${maxTurns}`}
          theme="computer"
        />

        <View style={styles.gameContainer}>
          {level === 3 ? (
            <View style={[styles.cardGrid, getGridStyle()]}>
              {/* Render 6 rows of 4 cards each for level 3 */}
              {Array.from({ length: 6 }, (_, rowIndex) => (
                <View key={rowIndex} style={styles.grid4x6Row}>
                  {cards.slice(rowIndex * 4, rowIndex * 4 + 4).map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      style={getCardStyle()}
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
                        <View
                          style={[
                            styles.cardFront,
                            card.isMatched && styles.cardMatched,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardEmoji,
                              level === 3 && styles.cardEmojiSmall,
                            ]}
                          >
                            {card.emoji}
                          </Text>
                        </View>
                      </FlipCard>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          ) : level === 2 ? (
            <View style={[styles.cardGrid, getGridStyle()]}>
              {/* Render 4 rows of 4 cards each for level 2 */}
              {Array.from({ length: 4 }, (_, rowIndex) => (
                <View key={rowIndex} style={styles.grid4x4Row}>
                  {cards.slice(rowIndex * 4, rowIndex * 4 + 4).map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      style={getCardStyle()}
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
                        <View
                          style={[
                            styles.cardFront,
                            card.isMatched && styles.cardMatched,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardEmoji,
                              level === 3 && styles.cardEmojiSmall,
                            ]}
                          >
                            {card.emoji}
                          </Text>
                        </View>
                      </FlipCard>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.cardGrid, getGridStyle()]}>
              {cards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={getCardStyle()}
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
                    <View
                      style={[
                        styles.cardFront,
                        card.isMatched && styles.cardMatched,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cardEmoji,
                          level === 3 && styles.cardEmojiSmall,
                        ]}
                      >
                        {card.emoji}
                      </Text>
                    </View>
                  </FlipCard>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View
          style={[
            styles.bottomButtons,
            {
              gap: ResponsiveSpacing.buttonGap(),
              paddingVertical: ResponsiveSpacing.buttonPadding(),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.instructionsButton}
            onPress={handleForfeit}
          >
            <Text style={styles.instructionsButtonText}>🚪 Leave</Text>
          </TouchableOpacity>
        </View>
      </View>

      <GameModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        emoji={modal.emoji}
        onClose={hideModal}
        onConfirm={modal.onConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#0a0e1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00ff41',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00ff41',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
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
    flexDirection: 'column',
    alignItems: 'center',
  },
  grid4x4Row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 4 * 65 + 3 * 10, // 4 cards * 65px + 3 gaps * 10px
    marginBottom: 8,
  },
  grid4x6: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  grid4x6Row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 4 * 58 + 3 * 8, // 4 cards * 58px + 3 gaps * 8px
    marginBottom: 6,
  },
  cardContainer: {
    width: 70,
    height: 70,
    margin: 2,
  },
  cardContainerMedium: {
    width: 65,
    height: 65,
  },
  cardContainerSmall: {
    width: 58,
    height: 58,
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
  cardEmojiSmall: {
    fontSize: 22,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
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
    lineHeight: 22,
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
