import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { MATH_JOKERS } from '../../src/utils/jokerEffectEngine';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';

interface MathGameProps {
  onComplete: () => void;
}

export default function MathGame({ onComplete }: MathGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { width: screenWidth } = Dimensions.get('window');
  const { trackMinigamePlayed } = useScoreboard();

  // Game states
  const [gameState, setGameState] = useState<
    'instructions' | 'playing' | 'jokerSelection'
  >('instructions');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [matchesCompleted, setMatchesCompleted] = useState(0);
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed
  const [jokerRewardTier, setJokerRewardTier] = useState(0); // Track joker reward tier for selection

  // Number sequences
  const [numbersSequence, setNumbersSequence] = useState<number[]>([]);
  const [matchedIndices, setMatchedIndices] = useState<number[]>([]);

  // Animation values
  const translateX = useSharedValue(0);
  const flashValue = useSharedValue(0);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const gameActiveRef = useRef(false);
  const containerRef = useRef<View>(null);
  const containerWidth = useRef(0);
  const numbersSequenceRef = useRef<number[]>([]);
  const matchedIndicesRef = useRef<number[]>([]);
  const matchesCompletedRef = useRef(0);
  const completedLevelRef = useRef(0); // Track completed level with ref for immediate access
  const jokerRewardTierRef = useRef(0); // Track joker reward tier with ref

  // Constants
  const NUMBER_WIDTH = 60;
  const NUMBER_SPACING = 10;
  const TOTAL_NUMBER_WIDTH = NUMBER_WIDTH + NUMBER_SPACING;
  const SCROLL_SPEED = 1; // pixels per interval (16ms)

  // Level configurations
  const getLevelConfig = (levelNum: number) => {
    switch (levelNum) {
      case 1:
        return { speed: 1 };
      case 2:
        return { speed: 1.5 };
      case 3:
        return { speed: 2 };
      default:
        return { speed: 1 };
    }
  };

  // Generate random numbers
  const generateRandomNumbers = (count: number): number[] => {
    return Array.from(
      { length: count },
      () => Math.floor(Math.random() * 10) + 1
    );
  };

  // Get rightmost unmatched number
  const getRightmostNumber = (): { number: number; index: number } => {
    if (numbersSequence.length === 0) return { number: 1, index: -1 };

    for (let i = numbersSequence.length - 1; i >= 0; i--) {
      if (!matchedIndices.includes(i)) {
        return { number: numbersSequence[i], index: i };
      }
    }

    return { number: 1, index: -1 };
  };

  // Initialize numbers
  const initializeNumbers = () => {
    const sequence = generateRandomNumbers(10);
    setNumbersSequence(sequence);
    setMatchedIndices([]);
    numbersSequenceRef.current = sequence;
    matchedIndicesRef.current = [];
    translateX.value = -600; // Start off screen to the left
  };

  // Start scrolling animation using setInterval
  const startScrollAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    const config = getLevelConfig(level);
    const speed = SCROLL_SPEED * config.speed;

    animationRef.current = setInterval(() => {
      if (!gameActiveRef.current) {
        stopScrollAnimation();
        return;
      }

      // Directly update the shared value
      translateX.value = translateX.value + speed;

      // Check if rightmost unmatched number reached the edge
      // Find rightmost unmatched number using refs for better performance
      let rightmostIndex = -1;
      for (let i = numbersSequenceRef.current.length - 1; i >= 0; i--) {
        if (!matchedIndicesRef.current.includes(i)) {
          rightmostIndex = i;
          break;
        }
      }

      if (rightmostIndex >= 0 && containerWidth.current > 0) {
        const currentX = translateX.value;
        // Calculate position relative to the scrollingRow
        // The scrollingRow starts with translateX of -600 and moves right
        const numberLeftEdge = rightmostIndex * TOTAL_NUMBER_WIDTH;
        const numberRightEdge = numberLeftEdge + NUMBER_WIDTH;

        // The visible area starts at x=0 in container coordinates
        // When translateX + numberRightEdge >= containerWidth, the number hits the edge
        const absoluteRightEdge = currentX + numberRightEdge;

        // Container width is the visible area
        if (absoluteRightEdge >= containerWidth.current) {
          // Game over!
          runOnJS(() => {
            stopScrollAnimation();
            handleGameOver();
          })();
        }
      }
    }, 16); // ~60fps
  };

  // Stop scrolling animation
  const stopScrollAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  };

  // Handle game over
  const handleGameOver = () => {
    setGameActive(false);
    stopScrollAnimation();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    console.log(
      `💥 MathGame handleGameOver: completedLevel = ${completedLevel}, completedLevelRef = ${completedLevelRef.current}, level = ${level}`
    );

    // Use ref for immediate access, then fall back to state and level calculation
    let levelsCompleted = Math.max(
      completedLevelRef.current,
      completedLevel,
      level - 1
    );

    console.log(
      `💥 MathGame calculated levelsCompleted = ${levelsCompleted} (matches: ${matchedIndices.length})`
    );

    if (levelsCompleted > 0) {
      // Player completed at least one level, award jokers based on completion
      const jokerCount = levelsCompleted;
      const rerollText =
        levelsCompleted > 1
          ? ` and ${levelsCompleted - 1} reroll${levelsCompleted > 2 ? 's' : ''}`
          : '';

      // Store the reward tier for joker selection
      setJokerRewardTier(levelsCompleted);
      jokerRewardTierRef.current = levelsCompleted;

      showModal(
        '💥 Game Over!',
        `A number reached the edge! Since you completed Level ${levelsCompleted}, you'll receive ${jokerCount} joker${jokerCount > 1 ? 's' : ''}${rerollText}!`,
        '🎁',
        () => {
          setGameState('jokerSelection');
        }
      );
    } else {
      // Player didn't complete any level, show restart option
      showModal(
        '💥 Game Over!',
        `A number reached the edge! You completed ${matchesCompletedRef.current} matches.`,
        '💥',
        () => {
          // Restart level
          setMatchesCompleted(0);
          matchesCompletedRef.current = 0;
          initializeNumbers();
          setGameActive(true);
          startTimer();
          setTimeout(() => {
            startScrollAnimation();
          }, 500);
        }
      );
    }
  };

  // Handle bottom number click
  const handleBottomNumberClick = (clickedNumber: number) => {
    if (!gameActive) return;

    const rightmost = getRightmostNumber();
    if (rightmost.index === -1) return;

    const sum = rightmost.number + clickedNumber;

    if (sum === 10) {
      // Correct match!
      const newMatchedIndices = [...matchedIndices, rightmost.index];
      setMatchedIndices(newMatchedIndices);
      matchedIndicesRef.current = newMatchedIndices; // Update ref

      const newMatchesCompleted = matchesCompleted + 1;
      setMatchesCompleted(newMatchesCompleted);
      matchesCompletedRef.current = newMatchesCompleted;

      // Check if all numbers matched (completed set of 10)
      if (newMatchedIndices.length >= 10) {
        // Set completed after completing a full set of 10 numbers
        stopScrollAnimation();
        setGameActive(false);

        // Show completion modal for the set
        // Mark this level as completed
        console.log(`🎯 MathGame: Setting completedLevel to ${level}`);
        setCompletedLevel(level);
        completedLevelRef.current = level; // Set ref immediately for timing-sensitive checks
        setJokerRewardTier(level); // Also set reward tier immediately
        jokerRewardTierRef.current = level; // Set ref for immediate access

        showModal(
          '🎯 Set Complete!',
          `Great job! You completed all 10 numbers. Ready for the next level?`,
          '🎯',
          () => {
            if (level < 3) {
              nextLevel();
            } else {
              // All levels complete
              setGameState('jokerSelection');
            }
          }
        );
        return;
      }

      // Add score
      setScore((prev) => prev + 10);
    } else {
      // Wrong answer
      setScore((prev) => Math.max(0, prev - 5));
    }
  };

  // Complete level
  const completeLevel = () => {
    setGameActive(false);
    stopScrollAnimation();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (level < 3) {
      showModal(
        `🎉 Level ${level} Complete!`,
        `Great job! Ready for Level ${level + 1}?`,
        '🎉',
        () => {
          nextLevel();
        }
      );
    } else {
      // Mark this level as completed
      setCompletedLevel(level);
      setJokerRewardTier(level);
      jokerRewardTierRef.current = level;

      showModal('🏆 Math Master!', 'You completed all levels!', '🏆', () => {
        setGameState('jokerSelection');
      });
    }
  };

  // Next level
  const nextLevel = () => {
    setLevel((prev) => prev + 1);
    setMatchesCompleted(0);
    matchesCompletedRef.current = 0;
    setTimeLeft(60);
    initializeNumbers();
    setGameActive(true);
    startTimer();
    setTimeout(() => {
      startScrollAnimation();
    }, 500);
  };

  // Timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    setGameActive(false);
    stopScrollAnimation();
    if (timerRef.current) clearInterval(timerRef.current);

    console.log(
      `⏰ MathGame handleTimeUp: completedLevel = ${completedLevel}, level = ${level}`
    );

    // Use the maximum of completedLevel state or level-1 to handle timing issues
    const levelsCompleted = Math.max(completedLevel, level - 1);

    if (levelsCompleted > 0) {
      // Player completed at least one level, award jokers based on completion
      const jokerCount = levelsCompleted;
      const rerollText =
        levelsCompleted > 1
          ? ` and ${levelsCompleted - 1} reroll${levelsCompleted > 2 ? 's' : ''}`
          : '';

      // Store the reward tier for joker selection
      setJokerRewardTier(levelsCompleted);
      jokerRewardTierRef.current = levelsCompleted;

      showModal(
        "⏰ Time's Up!",
        `Since you completed Level ${levelsCompleted}, you'll receive ${jokerCount} joker${jokerCount > 1 ? 's' : ''}${rerollText}!`,
        '🎁',
        () => {
          setGameState('jokerSelection');
        }
      );
    } else {
      // Player didn't complete any level, show restart option
      showModal("⏰ Time's Up!", 'Try again from Level 1?', '⏰', () => {
        setGameState('instructions');
      });
    }
  };

  // Start game
  const startGame = () => {
    // Track minigame play for analytics
    trackMinigamePlayed('math');

    setGameState('playing');
    setScore(0);
    setLevel(1);
    setMatchesCompleted(0);
    matchesCompletedRef.current = 0;
    setTimeLeft(60);
    initializeNumbers();
    setGameActive(true);
    startTimer();

    // Start scrolling after a delay
    setTimeout(() => {
      startScrollAnimation();
    }, 500);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopScrollAnimation();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Keep gameActiveRef in sync
  useEffect(() => {
    gameActiveRef.current = gameActive;
    if (!gameActive) {
      stopScrollAnimation();
    }
  }, [gameActive]);

  // Animated styles
  const scrollAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: flashValue.value ? 'rgba(0, 255, 0, 0.3)' : '#1a3d1a',
  }));

  // Render instructions
  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Math Challenge!</Text>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>How to Play:</Text>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>

              <Text style={styles.stepText}>
                Add to 10 with rightmost number
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Don't let numbers reach the edge!
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start Game!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render joker selection
  if (gameState === 'jokerSelection') {
    // Use ref value to avoid state timing issues
    const finalRewardTier = jokerRewardTierRef.current || jokerRewardTier || 1;
    console.log(
      `🎁 MathGame JokerSelection: jokerRewardTier = ${jokerRewardTier}, jokerRewardTierRef = ${jokerRewardTierRef.current}, using = ${finalRewardTier}`
    );
    return (
      <JokerSelection
        jokers={MATH_JOKERS}
        theme="math"
        subject="Math"
        onComplete={onComplete}
        rewardTier={finalRewardTier as 1 | 2 | 3}
        completionLevel={finalRewardTier as 1 | 2 | 3}
      />
    );
  }

  // Render game
  return (
    <View style={styles.container}>
      <MinigameHUD
        title="📐 Math Challenge"
        subtitle={`Make ${getRightmostNumber().number} + ? = 10`}
        leftInfo={`Level ${level}/3`}
        centerInfo={`Matches: ${matchedIndices.length}/10`}
        theme="math"
      />

      {/* Scrolling numbers */}
      <View style={styles.scrollContainer}>
        <Text style={styles.rowLabel}>Scrolling Numbers:</Text>
        <View
          ref={containerRef}
          style={styles.numbersContainer}
          onLayout={(e) => {
            containerWidth.current = e.nativeEvent.layout.width;
          }}
        >
          <Animated.View style={[styles.scrollingRow, scrollAnimatedStyle]}>
            {numbersSequence.map((number, index) => {
              if (matchedIndices.includes(index)) {
                return null;
              }

              const isRightmost = index === getRightmostNumber().index;

              return (
                <View
                  key={index}
                  style={[
                    styles.numberBox,
                    isRightmost && styles.rightmostBox,
                    { marginRight: NUMBER_SPACING },
                  ]}
                >
                  <Text
                    style={[
                      styles.numberText,
                      isRightmost && styles.rightmostText,
                    ]}
                  >
                    {number}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        </View>
      </View>

      {/* Bottom numbers */}
      <View style={styles.bottomContainer}>
        <View style={styles.bottomRow}>
          {[0, 1, 2, 3, 4].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.bottomNumberBox}
              onPress={() => handleBottomNumberClick(num)}
              disabled={!gameActive}
            >
              <Text style={styles.numberText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.bottomRow}>
          {[5, 6, 7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.bottomNumberBox}
              onPress={() => handleBottomNumberClick(num)}
              disabled={!gameActive}
            >
              <Text style={styles.numberText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Leave button */}
      <TouchableOpacity
        style={styles.leaveButton}
        onPress={() => {
          showModal(
            '📚 Leave Math Study?',
            "You'll lose your progress!",
            '📚',
            () => router.back()
          );
        }}
      >
        <Text style={styles.leaveButtonText}>🚪 Leave</Text>
      </TouchableOpacity>

      <GameModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        emoji={modal.emoji}
        onClose={hideModal}
        onConfirm={modal.onConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a3d1a',
    padding: 20,
  },
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f5f5dc',
    marginBottom: 20,
    fontFamily: 'CrayonPastel',
  },
  instructionsCard: {
    backgroundColor: '#0d2818',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#f5f5dc',
    marginBottom: 20,
    width: '90%',
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f5f5dc',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
    marginRight: 10,
    fontFamily: 'CrayonPastel',
  },
  stepText: {
    fontSize: 16,
    color: '#f5f5dc',
    flex: 1,
    fontFamily: 'CrayonPastel',
  },
  startButton: {
    backgroundColor: '#2d4a3e',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#f5f5dc',
    marginBottom: 10,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  backButtonText: {
    fontSize: 18,
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
  scrollContainer: {
    marginTop: 20,
    backgroundColor: '#0d2818',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#f5f5dc',
    padding: 16,
  },
  rowLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f5f5dc',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
  },
  numbersContainer: {
    height: 80,
    overflow: 'hidden',
    borderRadius: 8,
  },
  scrollingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
  },
  numberBox: {
    width: 60,
    height: 60,
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#f5f5dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightmostBox: {
    borderColor: '#ffd700',
    borderWidth: 3,
    backgroundColor: '#1a1000',
  },
  numberText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
  rightmostText: {
    color: '#ff6b35',
  },
  bottomContainer: {
    marginTop: 30,
    padding: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  bottomNumberBox: {
    width: 60,
    height: 60,
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#f5f5dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButton: {
    marginTop: 20,
    backgroundColor: '#0d2818',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#f5f5dc',
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
});
