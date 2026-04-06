import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import colors from '../../src/constants/colors';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import { MusicController } from '../../src/utils/musicController';
import { SoundEffects } from '../../src/utils/soundEffects';
import AvailableJokersModal from '../components/AvailableJokersModal';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';
import PixelBorder from '../components/PixelBorder';
import PressableButton from '../components/PressableButton';
import TextWithEmojis from '../components/TextWithEmojis';

interface MathGameProps {
  onComplete: () => void;
  onBack?: () => void;
}

export default function MathGame({ onComplete, onBack }: MathGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { width: screenWidth } = Dimensions.get('window');
  const { trackMinigamePlayed } = useScoreboard();
  const { trackMinigamePlayed: trackMinigameProgress } = useMinigameTracking();

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
  const [showAvailableJokers, setShowAvailableJokers] = useState(false); // Show available jokers modal

  // Number sequences
  const [numbersSequence, setNumbersSequence] = useState<number[]>([]);
  const [matchedIndices, setMatchedIndices] = useState<number[]>([]);

  // Animation values
  const translateX = useSharedValue(0);
  const flashValue = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  const animationSpeed = useSharedValue(0);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameActiveRef = useRef(false);
  const containerRef = useRef<View>(null);
  const containerWidth = useRef(0);
  const numbersSequenceRef = useRef<number[]>([]);
  const matchedIndicesRef = useRef<number[]>([]);
  const matchesCompletedRef = useRef(0);
  const completedLevelRef = useRef(0);
  const jokerRewardTierRef = useRef(0);

  // Auto-sync state → refs for callback access (single source of truth)
  numbersSequenceRef.current = numbersSequence;
  matchedIndicesRef.current = matchedIndices;
  matchesCompletedRef.current = matchesCompleted;
  completedLevelRef.current = completedLevel;
  jokerRewardTierRef.current = jokerRewardTier;
  gameActiveRef.current = gameActive;

  // Constants
  const NUMBER_WIDTH = 60;
  const NUMBER_SPACING = 10;
  const TOTAL_NUMBER_WIDTH = NUMBER_WIDTH + NUMBER_SPACING;
  const SCROLL_SPEED = 1; // pixels per interval (16ms)

  // Level configurations (speeds reduced by 25% for better playability)
  const getLevelConfig = (levelNum: number) => {
    switch (levelNum) {
      case 1:
        return { speed: 1.0, requiredMatches: 10 };
      case 2:
        return { speed: 1.35, requiredMatches: 15 };
      case 3:
        return { speed: 1.875, requiredMatches: 15 };
      default:
        return { speed: 0.75, requiredMatches: 10 };
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
  const initializeNumbers = (currentLevel?: number) => {
    const levelToUse = currentLevel !== undefined ? currentLevel : level;
    const config = getLevelConfig(levelToUse);
    const sequence = generateRandomNumbers(config.requiredMatches);
    setNumbersSequence(sequence);
    setMatchedIndices([]);

    // Calculate starting position: move all numbers off-screen to the left
    // Each number takes TOTAL_NUMBER_WIDTH pixels, so total width is count * TOTAL_NUMBER_WIDTH
    // Start with all numbers off-screen (negative value)
    const totalWidth = config.requiredMatches * TOTAL_NUMBER_WIDTH;
    translateX.value = -totalWidth; // Extra padding to ensure they're fully off-screen
  };

  // Start scrolling animation on UI thread
  const startScrollAnimation = (currentLevel?: number) => {
    const levelToUse = currentLevel !== undefined ? currentLevel : level;
    const config = getLevelConfig(levelToUse);
    const speed = SCROLL_SPEED * config.speed;
    console.log(
      `🎮 MathGame: Starting scroll animation for level ${levelToUse} with speed ${speed}`
    );

    animationSpeed.value = speed;
    isAnimating.value = true;
  };

  // Stop scrolling animation on UI thread
  const stopScrollAnimation = () => {
    isAnimating.value = false;
    animationSpeed.value = 0;
    gameActiveRef.current = false;
  };

  // Check game over condition (JS thread function)
  const checkGameOver = useCallback((currentX: number) => {
    if (!gameActiveRef.current) return;

    // Find rightmost unmatched number
    let rightmostIndex = -1;
    for (let i = numbersSequenceRef.current.length - 1; i >= 0; i--) {
      if (!matchedIndicesRef.current.includes(i)) {
        rightmostIndex = i;
        break;
      }
    }

    if (rightmostIndex >= 0 && containerWidth.current > 0) {
      // Count how many unmatched numbers exist before the rightmost
      let visiblePosition = 0;
      for (let i = 0; i <= rightmostIndex; i++) {
        if (!matchedIndicesRef.current.includes(i)) {
          visiblePosition++;
        }
      }
      visiblePosition--; // Convert to 0-based index

      // Calculate position based on actual visible position in flex layout
      const numberLeftEdge = visiblePosition * TOTAL_NUMBER_WIDTH;
      const numberRightEdge = numberLeftEdge + NUMBER_WIDTH;
      const absoluteRightEdge = currentX + numberRightEdge;

      // Container width is the visible area
      if (absoluteRightEdge >= containerWidth.current) {
        console.log('🚨 GAME OVER TRIGGERED!');
        isAnimating.value = false;
        handleGameOver();
      }
    }
  }, []);

  // UI thread animation loop - runs at 60fps independently of JS thread
  useFrameCallback(() => {
    'worklet';
    if (!isAnimating.value || animationSpeed.value === 0) return;

    // Update position on UI thread (won't be blocked by JS operations)
    translateX.value = translateX.value + animationSpeed.value;

    // Check game over every frame (call JS function)
    runOnJS(checkGameOver)(translateX.value);
  });

  // Handle game over
  const handleGameOver = () => {
    setGameActive(false);
    stopScrollAnimation();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Warning haptic for game over
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

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

      showModal(
        'Game Over!',
        `A number reached the edge!\n Since you completed Level ${levelsCompleted}, you'll receive ${jokerCount} joker${jokerCount > 1 ? 's' : ''}${rerollText}!`,
        '⚠️',
        () => {
          setGameState('jokerSelection');
        }
      );
    } else {
      // Player didn't complete any level, show restart option
      showModal(
        'Game Over!',
        `Too slow!\n\n You completed ${matchesCompletedRef.current} matches.
      \n Have another go at level 1`,
        '⚠️',
        () => {
          // Restart level
          setMatchesCompleted(0);
          initializeNumbers();
          setGameActive(true);
          startTimer();
          if (startScrollTimeoutRef.current) {
            clearTimeout(startScrollTimeoutRef.current);
          }
          startScrollTimeoutRef.current = setTimeout(() => {
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
      // Correct match! Only play sound on correct answers to prevent JS blocking
      SoundEffects.playRandomPop();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newMatchedIndices = [...matchedIndices, rightmost.index];
      setMatchedIndices(newMatchedIndices);

      const newMatchesCompleted = matchesCompleted + 1;
      setMatchesCompleted(newMatchesCompleted);

      // Check if all numbers matched
      const config = getLevelConfig(level);
      if (newMatchedIndices.length >= config.requiredMatches) {
        // Set completed after completing the required matches
        stopScrollAnimation();
        setGameActive(false);

        // Show completion modal for the set
        // Mark this level as completed
        console.log(`🎯 MathGame: Setting completedLevel to ${level}`);
        setCompletedLevel(level);
        setJokerRewardTier(level);

        SoundEffects.playCongratsSound();
        showModal(
          'Level Complete!',
          `Great job! You completed all ${config.requiredMatches} matches. Ready for the next level?`,
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
      // Wrong answer - play wrong answer sound and apply penalty
      SoundEffects.playWrongAnswerSound();
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
      SoundEffects.playCongratsSound();
      showModal(
        `Level ${level} Complete!`,
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

      showModal('Math Master!', 'You completed all levels!', '🏆', () => {
        setGameState('jokerSelection');
      });
    }
  };

  // Next level
  const nextLevel = () => {
    const newLevel = level + 1;
    setLevel(newLevel);
    setMatchesCompleted(0);
    setTimeLeft(60);
    initializeNumbers(newLevel);
    setGameActive(true);
    startTimer();
    if (startScrollTimeoutRef.current) {
      clearTimeout(startScrollTimeoutRef.current);
    }
    startScrollTimeoutRef.current = setTimeout(() => {
      startScrollAnimation(newLevel);
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

      showModal(
        "Time's Up!",
        `Since you completed Level ${levelsCompleted}, you'll receive ${jokerCount} joker${jokerCount > 1 ? 's' : ''}${rerollText}!`,
        '🎁',
        () => {
          setGameState('jokerSelection');
        }
      );
    } else {
      // Player didn't complete any level, show restart option
      showModal("Time's Up!", 'Try again from Level 1?', '⏰', () => {
        setGameState('instructions');
      });
    }
  };

  // Start game
  const startGame = () => {
    SoundEffects.playRandomPop();
    // Track minigame play for analytics
    trackMinigamePlayed('math');
    trackMinigameProgress('math');

    setGameState('playing');
    setScore(0);
    setLevel(1);
    setMatchesCompleted(0);
    setTimeLeft(60);
    initializeNumbers();
    setGameActive(true);
    startTimer();

    // Start scrolling after a delay
    if (startScrollTimeoutRef.current) {
      clearTimeout(startScrollTimeoutRef.current);
    }
    startScrollTimeoutRef.current = setTimeout(() => {
      startScrollAnimation();
    }, 500);
  };

  // Cleanup - ensure all timers/intervals are cleared on unmount
  useEffect(() => {
    return () => {
      // Stop scroll animation on UI thread
      stopScrollAnimation();
      // Stop game timer interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Clear start scroll timeout
      if (startScrollTimeoutRef.current) {
        clearTimeout(startScrollTimeoutRef.current);
        startScrollTimeoutRef.current = null;
      }
      // Reset active flag
      gameActiveRef.current = false;
    };
  }, []);

  // Safety net: stop animation when game becomes inactive
  useEffect(() => {
    if (!gameActive) {
      stopScrollAnimation();
    }
  }, [gameActive]);

  // Start minigame music when game starts playing
  useEffect(() => {
    if (gameState === 'playing') {
      MusicController.setTrack('minigame');
    }
  }, [gameState]);

  // Animated styles
  const scrollAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: flashValue.value ? 'rgba(0, 255, 0, 0.3)' : '#1a3d1a',
  }));

  // Render joker selection
  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection
        jokers={STANDARDIZED_JOKERS}
        theme="candy"
        onComplete={onComplete}
        rewardTier={jokerRewardTier as 1 | 2 | 3}
        completionLevel={completedLevel as 1 | 2 | 3}
      />
    );
  }

  // Render instructions
  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Math Challenge!</Text>

          <PixelBorder
            borderColor="#f5f5dc"
            borderWidth={3}
            backgroundColor="#0d2818"
            innerPadding={20}
            style={{ marginBottom: 20, width: '90%' }}
          >
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
          </PixelBorder>
          <PressableButton
            onPress={startGame}
            shadowColor="#2d4a3e"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.5}
            shadowRadius={5}
            elevation={8}
            style={{ marginBottom: 16, width: '100%' }}
          >
            <PixelBorder
              borderColor="#f5f5dc"
              borderWidth={3}
              backgroundColor="#2d4a3e"
              innerPadding={0}
            >
              <View style={styles.pixelButtonInner}>
                <Text style={styles.startButtonText}>Start Game!</Text>
              </View>
            </PixelBorder>
          </PressableButton>
          <PressableButton
            onPress={() => {
              SoundEffects.playRandomPop();
              setShowAvailableJokers(true);
            }}
            shadowColor="#0d2818"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.5}
            shadowRadius={5}
            elevation={8}
            style={styles.backButton}
          >
            <PixelBorder
              borderColor="#2d5a3e"
              borderWidth={3}
              backgroundColor="#0d2818"
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
        </View>

        {/* Available Jokers Modal */}
        <AvailableJokersModal
          visible={showAvailableJokers}
          onClose={() => setShowAvailableJokers(false)}
          jokers={STANDARDIZED_JOKERS}
          themeColors={{
            borderColor: '#f5f5dc',
            backgroundColor: '#0d2818',
            headerColor: '#2d4a3e',
            textColor: '#f5f5dc',
          }}
        />
      </View>
    );
  }

  // Render game
  return (
    <View style={styles.container}>
      <MinigameHUD
        title="Math Challenge"
        subtitle={`Make ${getRightmostNumber().number} + ? = 10`}
        leftInfo={`Level ${level}/3`}
        centerInfo={`🎯: ${matchedIndices.length}/${getLevelConfig(level).requiredMatches}`}
        rightInfo={'Mathing!'}
        theme="math"
      />

      {/* Scrolling numbers */}
      <PixelBorder
        borderColor="#f5f5dc"
        borderWidth={3}
        backgroundColor="#0d2818"
        innerPadding={16}
        style={{ marginTop: 20 }}
      >
        <Text style={styles.rowLabel}>Scrolling Numbers:</Text>
        <View
          ref={containerRef}
          style={styles.numbersContainer}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            containerWidth.current = width;
            console.log(
              `📏 Container measured - width: ${width}px, screenWidth: ${screenWidth}px`
            );
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
      </PixelBorder>

      {/* Bottom numbers */}
      <View style={styles.bottomContainer}>
        <View style={styles.bottomRow}>
          {[1, 2, 3, 4, 5].map((num) => (
            <PixelBorder
              key={num}
              borderColor="#f5f5dc"
              borderWidth={2}
              backgroundColor="#000"
              innerPadding={0}
              style={{ flex: 1 }}
            >
              <TouchableOpacity
                style={styles.pixelNumberBox}
                onPress={() => handleBottomNumberClick(num)}
                disabled={!gameActive}
              >
                <Text style={styles.numberText}>{num}</Text>
              </TouchableOpacity>
            </PixelBorder>
          ))}
        </View>
        <View style={styles.bottomRow}>
          {[6, 7, 8, 9, 0].map((num) => (
            <PixelBorder
              key={num}
              borderColor="#f5f5dc"
              borderWidth={2}
              backgroundColor="#000"
              innerPadding={0}
              style={{ flex: 1, alignContent: 'center' }}
            >
              <TouchableOpacity
                style={styles.pixelNumberBox}
                onPress={() => handleBottomNumberClick(num)}
                disabled={!gameActive}
              >
                <Text style={styles.numberText}>{num}</Text>
              </TouchableOpacity>
            </PixelBorder>
          ))}
        </View>
      </View>

      {/* Leave button */}
      <PixelBorder
        borderColor="#f5f5dc"
        borderWidth={3}
        backgroundColor="#0d2818"
        innerPadding={0}
        style={{ marginTop: 20 }}
      >
        <TouchableOpacity
          style={styles.pixelButtonInner}
          onPress={() => {
            SoundEffects.playRandomPop();
            showModal(
              'Leave Math Study?',
              "You'll lose your progress!",
              '🚪',
              onBack || (() => router.back()),
              false,
              true
            );
          }}
        >
          <TextWithEmojis style={styles.leaveButtonText} imageSize={28}>
            🚪 Leave
          </TextWithEmojis>
        </TouchableOpacity>
      </PixelBorder>

      <GameModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        emoji={modal.emoji}
        onClose={hideModal}
        onConfirm={modal.onConfirm}
        showCancelButton={modal.showCancelButton}
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
    color: colors.gold.beige,
    marginBottom: 20,
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
  instructionsCard: {
    backgroundColor: '#0d2818',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: colors.gold.beige,
    marginBottom: 20,
    width: '90%',
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gold.beige,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gold.medium,
    marginRight: 10,
    fontFamily: 'PixeloidMono',
  },
  stepText: {
    fontSize: 16,
    color: colors.gold.beige,
    flex: 1,
    fontFamily: 'PixeloidMono',
  },
  startButton: {
    backgroundColor: colors.green.darkBg,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.gold.beige,
    marginBottom: 10,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gold.beige,
    fontFamily: 'PixeloidMono',
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
  scrollContainer: {
    marginTop: 20,
    backgroundColor: '#0d2818',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.gold.beige,
    padding: 16,
  },
  rowLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gold.beige,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
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
    backgroundColor: colors.black,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gold.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightmostBox: {
    borderColor: colors.gold.medium,
    borderWidth: 3,
    backgroundColor: '#1a1000',
  },
  numberText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gold.beige,
    fontFamily: 'PixeloidMono',
  },
  rightmostText: {
    color: colors.orange.primary,
  },
  bottomContainer: {
    marginTop: 0,
    paddingVertical: 32,
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
    backgroundColor: colors.black,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gold.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButton: {
    marginTop: 20,
    backgroundColor: '#0d2818',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gold.beige,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gold.beige,
    fontFamily: 'PixeloidMono',
  },
  pixelButtonInner: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pixelNumberBox: {
    aspectRatio: 1, // Makes it a perfect square
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
