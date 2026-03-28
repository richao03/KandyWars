import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import colors from '../../src/constants/colors';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import { MusicController } from '../../src/utils/musicController';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import { SoundEffects } from '../../src/utils/soundEffects';
import AvailableJokersModal from '../components/AvailableJokersModal';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';
import PixelBorder from '../components/PixelBorder';
import PressableButton from '../components/PressableButton';
import TextWithEmojis from '../components/TextWithEmojis';

interface MemoryCard {
  id: string;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface ComputerGameProps {
  onComplete: () => void;
}

// Custom flip card component with instant state sync
interface AnimatedFlipCardProps {
  isFlipped: boolean;
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  style?: any;
}

function AnimatedFlipCard({ isFlipped, frontContent, backContent, style }: AnimatedFlipCardProps) {
  // Initialize with the correct value based on initial isFlipped state
  const flipAnim = useRef(new Animated.Value(isFlipped ? 180 : 0)).current;
  const prevFlipped = useRef(isFlipped);

  useEffect(() => {
    // Only animate if the flipped state actually changed
    if (prevFlipped.current !== isFlipped) {
      prevFlipped.current = isFlipped;
      Animated.timing(flipAnim, {
        toValue: isFlipped ? 180 : 0,
        duration: 150, // Fast flip animation
        useNativeDriver: true,
      }).start();
    }
  }, [isFlipped, flipAnim]);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  return (
    <View style={style}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ rotateY: frontInterpolate }], opacity: frontOpacity, backfaceVisibility: 'hidden' },
        ]}
      >
        {frontContent}
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ rotateY: backInterpolate }], opacity: backOpacity, backfaceVisibility: 'hidden' },
        ]}
      >
        {backContent}
      </Animated.View>
    </View>
  );
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
  const { trackMinigamePlayed: trackMinigameProgress } = useMinigameTracking();

  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [turns, setTurns] = useState(0);
  const [maxTurns, setMaxTurns] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [showingAllCards, setShowingAllCards] = useState(false);
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed
  const [showAvailableJokers, setShowAvailableJokers] = useState(false);
  const [isChecking, setIsChecking] = useState(false); // Prevent clicks during match checking

  // Ref to track flipped cards synchronously (prevents race conditions from rapid clicks)
  const flippedCardsRef = React.useRef<string[]>([]);
  // Ref to track isChecking synchronously (prevents race conditions)
  const isCheckingRef = React.useRef<boolean>(false);
  // Ref to store the loss modal timeout (to prevent stale modals after restarting)
  const lossModalTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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
    flippedCardsRef.current = []; // Clear ref
    setFlippedCards([]);
    setTurns(0);
    setMaxTurns(config.maxTurns);
    setShowingAllCards(true);
    setIsGameActive(false); // Don't allow clicks yet

    // Peek time increases with level: 3s, 4s, 5s
    const peekTime = 2000 + levelNum * 1000; // Level 1: 3s, Level 2: 4s, Level 3: 5s
    setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
      setShowingAllCards(false);
      setIsGameActive(true);
    }, peekTime);
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

  // Start minigame music when game starts playing
  useEffect(() => {
    if (gameState === 'playing') {
      MusicController.setTrack('minigame');
    }
  }, [gameState]);

  const handleCardPress = (cardId: string) => {
    console.log('🎮 CARD CLICKED:', cardId.slice(0, 10), {
      isGameActive,
      showingAllCards,
      isCheckingRef: isCheckingRef.current,
      flippedCardsRef: flippedCardsRef.current.length,
      flippedCardsRefIds: flippedCardsRef.current.map(id => id.slice(0, 10)),
    });

    // Check isChecking ref synchronously FIRST to block all input during transitions
    if (!isGameActive || showingAllCards || isCheckingRef.current) {
      console.log('❌ BLOCKED: Game state check failed');
      return;
    }

    const card = cards.find((c) => c.id === cardId);

    console.log('🔍 Card state:', {
      cardExists: !!card,
      cardIsFlipped: card?.isFlipped,
      cardIsMatched: card?.isMatched,
      alreadyInRef: flippedCardsRef.current.includes(cardId),
      refLength: flippedCardsRef.current.length,
    });

    // Use ref for synchronous check to prevent race conditions from rapid clicks
    // Check if card is already being flipped (in the ref) to prevent double-flipping
    if (!card || card.isFlipped || card.isMatched ||
        flippedCardsRef.current.includes(cardId) ||
        flippedCardsRef.current.length >= 2) {
      console.log('❌ BLOCKED: Card state check failed');
      return;
    }

    // Update ref synchronously FIRST (before sounds) to block subsequent rapid clicks
    const newFlippedCards = [...flippedCardsRef.current, cardId];
    flippedCardsRef.current = newFlippedCards;

    console.log('✅ FLIP ACCEPTED! Ref updated to:', newFlippedCards.length, 'cards:', newFlippedCards.map(id => id.slice(0, 10)));

    // Update state immediately (before sounds/haptics)
    setFlippedCards(newFlippedCards);
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );

    // Then play sounds and haptics
    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newFlippedCards.length === 2) {
      console.log('🔒 LOCKING INPUT - 2 cards flipped');
      // Block all input immediately when 2 cards are flipped (update ref AND state)
      isCheckingRef.current = true;
      setIsChecking(true);

      const [firstCardId, secondCardId] = newFlippedCards;
      const firstCard = cards.find((c) => c.id === firstCardId);
      const secondCard = cards.find((c) => c.id === secondCardId);

      if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
        // Match found! Don't increment turns for correct guesses
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        SoundEffects.playCongratsSound();

        // Clear ref and state immediately
        console.log('✅ MATCH FOUND! Clearing flipped cards ref');
        flippedCardsRef.current = [];
        setFlippedCards([]);

        // Mark cards as matched
        setCards((prev) =>
          prev.map((c) =>
            c.id === firstCardId || c.id === secondCardId
              ? { ...c, isMatched: true, isFlipped: true }
              : c
          )
        );

        // Re-enable input after delay (update both ref and state)
        setTimeout(() => {
          console.log('🔓 UNLOCKING INPUT after match');
          isCheckingRef.current = false;
          setIsChecking(false);
        }, 200);
        // Win condition check is now handled by useEffect
      } else {
        // No match - increment turns only for wrong guesses
        console.log('❌ NO MATCH! Clearing flipped cards ref');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        SoundEffects.playWrongAnswerSound();
        // isChecking is already true from above
        flippedCardsRef.current = []; // Clear ref
        setFlippedCards([]);

        const newTurns = turns + 1;
        setTurns(newTurns);

        // Short delay to let player see the cards before flipping back
        setTimeout(() => {
          console.log('🔓 UNLOCKING INPUT after wrong guess');
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstCardId || c.id === secondCardId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          // Re-enable input (update both ref and state)
          isCheckingRef.current = false;
          setIsChecking(false);
        }, 400);

        // Check if out of turns (only for wrong guesses)
        if (newTurns >= maxTurns) {
          // Store timeout ref so we can clear it if player restarts before it fires
          lossModalTimeoutRef.current = setTimeout(() => {
            setIsGameActive(false);

            if (completedLevel > 0) {
              // Player completed at least one level, show success modal before joker selection
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              const jokerCount = completedLevel;
              const jokerText =
                jokerCount > 1 ? `${jokerCount} jokers` : '1 joker';
              showModal(
                'Breach Partial Success!',
                `You ran out of errors but completed Level ${completedLevel}!\n\nYou'll receive ${jokerText}!`,
                '🎯',
                () => {
                  setGameState('jokerSelection');
                }
              );
            } else {
              // Player didn't complete any level, show restart option
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning
              );
              showModal(
                'System Breach Failed!',
                'You ran out of turns! Try again?',
                '💥',
                () => {
                  setGameState('instructions');
                }
              );
            }
            // Clear the ref after showing modal
            lossModalTimeoutRef.current = null;
          }, 2000);
        }
      }
    }
  };

  // Start game
  const startGame = () => {
    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Clear any pending loss modal timeout from previous game
    if (lossModalTimeoutRef.current) {
      clearTimeout(lossModalTimeoutRef.current);
      lossModalTimeoutRef.current = null;
    }

    // Hide any existing modals
    hideModal();

    // Reset game state
    setCompletedLevel(0);

    // Track minigame play for analytics
    trackMinigamePlayed('computer');
    trackMinigameProgress('computer');

    setGameState('playing');
    setLevel(1);
    initializeLevel(1);
  };

  const handleLevelComplete = () => {
    setIsGameActive(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Mark this level as completed
    setCompletedLevel(level);

    if (level < 3) {
      SoundEffects.playCongratsSound();
      showModal(
        `Level ${level} Complete!`,
        `Great memory work! Ready for Level ${level + 1}?`,
        '🎉',
        () => {
          setLevel(level + 1);
        }
      );
    } else {
      SoundEffects.playCongratsSound();
      showModal(
        'System Infiltrated!',
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
      `Selected computer joker: ${STANDARDIZED_JOKERS.find((j) => j.id === jokerId)?.name}`
    );
    onComplete();
  };

  const handleForfeit = () => {
    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showModal(
      'Abort Hack Session?',
      "If you leave now, you'll lose your hacking progress!",
      '🚪',
      () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.back();
      },
      false,
      true
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
        jokers={STANDARDIZED_JOKERS}
        theme="computer"
        subject="All"
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

          <PixelBorder
            borderColor="#00d4ff"
            borderWidth={3}
            backgroundColor="#16213e"
            innerPadding={20}
            style={{ marginBottom: 20, width: '100%' }}
          >
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
          </PixelBorder>

          <PressableButton
            onPress={startGame}
            shadowOpacity={0}
            elevation={0}
            style={{ marginBottom: 16, width: '100%' }}
          >
            <PixelBorder
              borderColor="#00ff41"
              borderWidth={3}
              backgroundColor="#16213e"
              innerPadding={0}
            >
              <View style={styles.pixelButtonInner}>
                <Text style={styles.startGameButtonText}>Start Challenge!</Text>
              </View>
            </PixelBorder>
          </PressableButton>

          <PressableButton
            onPress={() => {
              SoundEffects.playRandomPop();
              setShowAvailableJokers(true);
            }}
            shadowColor="#00d4ff"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.5}
            shadowRadius={5}
            elevation={8}
            style={styles.backButton}
          >
            <PixelBorder
              borderColor="#00d4ff"
              borderWidth={3}
              backgroundColor="#16213e"
              innerPadding={0}
            >
              <View style={styles.backButtonInner}>
                <Text style={styles.backButtonText}>Available Jokers</Text>
              </View>
            </PixelBorder>
          </PressableButton>
          <PressableButton
            onPress={() => {
              SoundEffects.playRandomPop();
              router.back();
            }}
            shadowOpacity={0}
            elevation={0}
            style={{ marginTop: 8, width: '100%' }}
          >
            <PixelBorder
              borderColor="#999"
              borderWidth={3}
              backgroundColor="#666"
              innerPadding={0}
            >
              <View style={styles.backButtonInner}>
                <Text style={styles.backButtonText}>Back</Text>
              </View>
            </PixelBorder>
          </PressableButton>

          <AvailableJokersModal
            visible={showAvailableJokers}
            onClose={() => setShowAvailableJokers(false)}
            jokers={STANDARDIZED_JOKERS}
            subject="All"
            themeColors={{
              borderColor: '#00d4ff',
              backgroundColor: '#0a0e1a',
              headerColor: '#16213e',
              textColor: '#00ff41',
            }}
          />
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
          title="Hack the System"
          subtitle="Match the tech pairs to infiltrate the network!"
          leftInfo={`Level ${level}/3`}
          centerInfo={`❌: ${turns}/${maxTurns}`}
          rightInfo={'hax0rs'}
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
                      <AnimatedFlipCard
                        style={styles.flipCard}
                        isFlipped={card.isFlipped || card.isMatched}
                        frontContent={
                          <View style={styles.cardBack}>
                            <Text style={styles.cardBackText}></Text>
                          </View>
                        }
                        backContent={
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
                        }
                      />
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
                      <AnimatedFlipCard
                        style={styles.flipCard}
                        isFlipped={card.isFlipped || card.isMatched}
                        frontContent={
                          <View style={styles.cardBack}>
                            <Text style={styles.cardBackText}></Text>
                          </View>
                        }
                        backContent={
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
                        }
                      />
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
                  <AnimatedFlipCard
                    style={styles.flipCard}
                    isFlipped={card.isFlipped || card.isMatched}
                    frontContent={
                      <View style={styles.cardBack}>
                        <Text style={styles.cardBackText}></Text>
                      </View>
                    }
                    backContent={
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
                    }
                  />
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
          <PixelBorder
            borderColor="#00d4ff"
            borderWidth={3}
            backgroundColor="#16213e"
            innerPadding={0}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              style={styles.instructionsButtonInner}
              onPress={handleForfeit}
            >
              <TextWithEmojis
                style={styles.instructionsButtonText}
                imageSize={28}
              >
                🚪 Leave
              </TextWithEmojis>
            </TouchableOpacity>
          </PixelBorder>
        </View>
      </View>

      <GameModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        emoji={modal.emoji}
        onClose={hideModal}
        onConfirm={modal.onConfirm}
        showCancelButton={modal.showCancelButton}
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
    borderColor: colors.green.neon,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.green.neon,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.blue.cyan,
    fontFamily: 'PixeloidMono',
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
    color: colors.green.neon,
    fontFamily: 'PixeloidMono',
  },
  turns: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff073a',
    fontFamily: 'PixeloidMono',
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
    borderColor: colors.blue.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.blue.cyan,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  cardBackText: {
    fontSize: 24,
    color: colors.blue.cyan,
  },
  cardFront: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.blue.darkBg,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.green.neon,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.green.neon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  cardMatched: {
    backgroundColor: '#0d1b2a',
    borderColor: colors.green.neon,
    shadowColor: colors.green.neon,
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
    fontFamily: 'PixeloidMono',
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
    color: colors.green.neon,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: colors.green.neon,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  jokerSubtitle: {
    fontSize: 16,
    color: colors.blue.cyan,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 24,
  },
  generateButton: {
    backgroundColor: colors.blue.darkBg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.blue.cyan,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.blue.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.blue.cyan,
    fontFamily: 'PixeloidMono',
  },
  jokerCard: {
    backgroundColor: colors.blue.darkBg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.blue.cyan,
    marginBottom: 12,
    shadowColor: colors.blue.cyan,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  jokerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.green.neon,
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
  },
  jokerDescription: {
    fontSize: 14,
    color: '#a0a0ff',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    color: colors.green.neon,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: colors.green.neon,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  instructionsCard: {
    backgroundColor: colors.blue.darkBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: colors.blue.cyan,
    marginBottom: 20,
    shadowColor: colors.blue.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.green.neon,
    fontFamily: 'PixeloidMono',
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
    color: colors.green.neon,
    fontFamily: 'PixeloidMono',
    marginRight: 10,
    minWidth: 20,
    lineHeight: 22,
  },
  stepText: {
    fontSize: 16,
    color: '#a0a0ff',
    fontFamily: 'PixeloidMono',
    flex: 1,
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: colors.blue.darkBg,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.green.neon,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.green.neon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.green.neon,
    fontFamily: 'PixeloidMono',
  },
  pixelButtonInner: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backButton: {
    marginTop: 16,
    width: '100%',
  },
  backButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
  },
  instructionsButton: {
    flex: 1,
    backgroundColor: colors.blue.darkBg,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.blue.cyan,
    alignItems: 'center',
  },
  instructionsButtonInner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.blue.cyan,
    fontFamily: 'PixeloidMono',
  },
  jokerIconButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  jokerIconText: {
    fontSize: 18,
    fontFamily: 'PixeloidMono',
  },
});
