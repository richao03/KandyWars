import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import colors from '../../src/constants/colors';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { HOME_EC_JOKERS } from '../../src/utils/jokerEffectEngine';
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

// Candy emoji to image mapping
const getCandyImage = (emoji: string) => {
  switch (emoji) {
    case '🍭':
      return require('../../assets/images/emojis/lollipop.png');
    case '🍬':
      return require('../../assets/images/emojis/candy.png');
    case '🧁':
      return require('../../assets/images/emojis/cupcake.png');
    case '🍫':
      return require('../../assets/images/emojis/chocolate.png');
    default:
      return require('../../assets/images/emojis/candy.png');
  }
};

// Component that displays a candy image
const CandyImage = React.memo(({ candy }: { candy: string }) => {
  if (!candy) return null;

  return (
    <Image source={getCandyImage(candy)} style={{ width: 50, height: 50 }} />
  );
});

interface HomeEcGameProps {
  onComplete: () => void;
}

// Available candy types
const CANDY_TYPES = ['🍭', '🍬', '🧁', '🍫'];
const TARGET_POSITIONS = {
  '🍭': 'up',
  '🍬': 'right',
  '🧁': 'down',
  '🍫': 'left',
} as const;

export default function HomeEcGame({ onComplete }: HomeEcGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { trackMinigamePlayed } = useScoreboard();
  const { trackMinigamePlayed: trackMinigameProgress } = useMinigameTracking();

  // Game state
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed
  const [feedback, setFeedback] = useState('');
  const [feedbackPosition, setFeedbackPosition] = useState<{
    x: string;
    y: string;
  } | null>(null);

  // Store candy values in state but control visibility with animation
  const [candyA, setCandyA] = useState('');
  const [candyB, setCandyB] = useState('');
  const [nextCandy, setNextCandy] = useState('');
  const [showAvailableJokers, setShowAvailableJokers] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSwipingRef = useRef(false);
  const levelCompleteRef = useRef(false);
  const completedLevelRef = useRef(0); // Track with ref to avoid stale closures

  // Animation values - A is static center, B is flying
  const candyAOpacity = useSharedValue(1);
  const candyBOpacity = useSharedValue(0);
  const candyBTranslateX = useSharedValue(0);
  const candyBTranslateY = useSharedValue(0);

  // Level configurations
  const getLevelConfig = (levelNum: number) => {
    switch (levelNum) {
      case 1:
        return { matches: 10, time: 15 };
      case 2:
        return { matches: 15, time: 15 };
      case 3:
        return { matches: 20, time: 15 };
      default:
        return { matches: 10, time: 15 };
    }
  };

  // Generate random candy
  const generateCandy = () =>
    CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];

  // Initialize candies
  const startNewCandy = useCallback(() => {
    const newCandy = nextCandy || generateCandy();
    setCandyA(newCandy);
    candyAOpacity.value = 1;
    candyBOpacity.value = 0;
    candyBTranslateX.value = 0;
    candyBTranslateY.value = 0;

    // Generate next candy for preview
    const nextGen = generateCandy();
    setNextCandy(nextGen);

    isSwipingRef.current = false;
  }, [
    nextCandy,
    candyAOpacity,
    candyBOpacity,
    candyBTranslateX,
    candyBTranslateY,
  ]);

  // Handle swipe
  const handleSwipe = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (
        isSwipingRef.current ||
        !candyA ||
        gameState !== 'playing' ||
        levelCompleteRef.current
      )
        return;

      isSwipingRef.current = true;
      SoundEffects.playRandomPop();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const currentCandy = candyA;
      const correctDirection =
        TARGET_POSITIONS[currentCandy as keyof typeof TARGET_POSITIONS];
      const isCorrect = direction === correctDirection;

      // Step 1: Hide candyA first
      candyAOpacity.value = 0;

      // Step 2: Move candyA to candyB and make it visible
      setCandyB(currentCandy);
      candyBTranslateX.value = 0;
      candyBTranslateY.value = 0;
      candyBOpacity.value = 1;

      // Step 3: Load next candy into candyA and show it
      console.log(
        '🍬 Swipe - current:',
        currentCandy,
        'next preview:',
        nextCandy
      );
      setCandyA(nextCandy);
      const nextGen = generateCandy();
      console.log('🍬 New next candy generated:', nextGen);
      setNextCandy(nextGen);
      candyAOpacity.value = withTiming(1, { duration: 100 });

      // Determine animation target and feedback position
      let targetX = 0;
      let targetY = 0;

      switch (direction) {
        case 'up':
          targetY = -300;
          setFeedbackPosition({ x: '50%', y: '10%' });
          break;
        case 'down':
          targetY = 300;
          setFeedbackPosition({ x: '50%', y: '85%' });
          break;
        case 'left':
          targetX = -200;
          setFeedbackPosition({ x: '15%', y: '50%' });
          break;
        case 'right':
          targetX = 200;
          setFeedbackPosition({ x: '85%', y: '50%' });
          break;
      }

      // Step 3: Animate candyB flying away
      candyBTranslateX.value = withTiming(targetX, { duration: 250 });
      candyBTranslateY.value = withTiming(targetY, { duration: 250 });
      candyBOpacity.value = withTiming(0, { duration: 250 });

      // Show feedback and update score
      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScore((prev) => {
          const newScore = prev + 1;
          const levelConfig = getLevelConfig(level);

          if (newScore >= levelConfig.matches) {
            // Level complete - stop game immediately
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            // Mark this level as completed and stop accepting swipes
            setCompletedLevel(level);
            completedLevelRef.current = level; // Also update ref to avoid stale closures
            levelCompleteRef.current = true; // Stop accepting swipes but keep UI visible

            if (level < 3) {
              if (modalTimeoutRef.current) {
                clearTimeout(modalTimeoutRef.current);
              }
              modalTimeoutRef.current = setTimeout(() => {
                console.log(`Level ${level} complete! Showing modal...`);
                SoundEffects.playCongratsSound();
                showModal(
                  `Level ${level} Complete!`,
                  `Ready for Level ${level + 1}?`,
                  '🎉',
                  () => {
                    console.log(`Starting level ${level + 1}...`);
                    levelCompleteRef.current = false; // Re-enable swipes for next level
                    setLevel(level + 1);
                    initializeLevel(level + 1);
                  }
                );
              }, 600);
            } else {
              if (modalTimeoutRef.current) {
                clearTimeout(modalTimeoutRef.current);
              }
              modalTimeoutRef.current = setTimeout(() => {
                console.log('All levels complete! Showing final modal...');
                SoundEffects.playCongratsSound();
                showModal(
                  'All Levels Complete!',
                  'Amazing work, Master Chef!',
                  '🏆',
                  () => {
                    console.log('Going to joker selection...');
                    setGameState('jokerSelection');
                  }
                );
              }, 600);
            }
          }

          return newScore;
        });
        setFeedback('✅ +1');
      } else {
        // Wrong match - play wrong answer sound and apply penalty
        SoundEffects.playWrongAnswerSound();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setScore((prev) => Math.max(0, prev - 1)); // Subtract 1 but don't go below 0
        setFeedback('❌ -1');
      }

      // Clear feedback and allow next swipe after animation
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback('');
        setFeedbackPosition(null);
        isSwipingRef.current = false;
      }, 400);
    },
    [
      candyA,
      nextCandy,
      gameState,
      level,
      candyAOpacity,
      candyBOpacity,
      candyBTranslateX,
      candyBTranslateY,
      showModal,
    ]
  );

  // Gesture handler
  const panGesture = Gesture.Pan().onEnd((event) => {
    'worklet';
    const { translationX, translationY } = event;
    const absX = Math.abs(translationX);
    const absY = Math.abs(translationY);

    if (absX > 50 || absY > 50) {
      let direction: 'up' | 'down' | 'left' | 'right';

      if (absX > absY) {
        direction = translationX > 0 ? 'right' : 'left';
      } else {
        direction = translationY > 0 ? 'down' : 'up';
      }

      runOnJS(handleSwipe)(direction);
    }
  });

  // Start game
  const startGame = useCallback(() => {
    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Track minigame play for analytics
    trackMinigamePlayed('home-ec');
    trackMinigameProgress('home-ec');

    setGameState('playing');
    setLevel(1);
    setScore(0);
    setTimeLeft(15);
    setFeedback('');
    setCompletedLevel(0); // Reset completed level
    completedLevelRef.current = 0; // Reset ref
    levelCompleteRef.current = false; // Reset flag
    startNewCandy();

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startNewCandy]);

  // Initialize level
  const initializeLevel = useCallback(
    (levelNum: number) => {
      setScore(0);
      setTimeLeft(15);
      setFeedback('');
      setFeedbackPosition(null);
      startNewCandy();

      // Clear any existing timer
      if (timerRef.current) clearInterval(timerRef.current);

      // Start timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleGameEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [startNewCandy, showModal]
  );

  // Start next level
  const startNextLevel = useCallback(() => {
    setLevel((prev) => prev + 1);
    setScore(0);
    setTimeLeft(15);
    startNewCandy();

    // Restart timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startNewCandy]);

  // Handle game end (time up or failure)
  const handleGameEnd = useCallback(() => {
    const currentCompletedLevel = completedLevelRef.current; // Use ref to get current value
    if (currentCompletedLevel > 0) {
      // Player completed at least one level, award jokers based on completion
      console.log(`Game ended after completing level ${currentCompletedLevel}`);
      const jokerCount = currentCompletedLevel;
      const jokerText = jokerCount === 1 ? '1 joker' : `${jokerCount} jokers`;

      showModal(
        'Great Effort!',
        `You ran out of time but completed Level ${currentCompletedLevel}!\n\nYou'll receive ${jokerText}!`,
        '⏱️',
        () => {
          setGameState('jokerSelection');
        }
      );
    } else {
      // Player didn't complete any level, show restart option
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showModal('Times Up!', 'Try again from Level 1?', '⏰', () => {
        setGameState('instructions');
      });
    }
  }, [showModal]);

  // Restart game
  const restartGame = useCallback(() => {
    setGameState('instructions');
    setLevel(1);
    setScore(0);
    setTimeLeft(15);
    setFeedback('');
    setFeedbackPosition(null);
    setCompletedLevel(0);
    completedLevelRef.current = 0; // Reset ref
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // Initialize first candies
  useEffect(() => {
    if (gameState === 'playing' && !candyA) {
      startNewCandy();
    }
  }, [gameState, candyA, startNewCandy]);

  // Cleanup - ensure all timers are properly cleared on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = null;
      }
    };
  }, []);

  // Start minigame music when game starts playing
  useEffect(() => {
    if (gameState === 'playing') {
      MusicController.setTrack('minigame');
    }
  }, [gameState]);

  // Animated styles
  const candyAStyle = useAnimatedStyle(() => ({
    opacity: candyAOpacity.value,
  }));

  const candyBStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: candyBTranslateX.value },
      { translateY: candyBTranslateY.value },
    ],
    opacity: candyBOpacity.value,
  }));

  // Handle forfeit
  const handleForfeit = () => {
    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (gameState === 'playing') {
      showModal(
        'Leave Kitchen?',
        'Are you sure you want to leave?',
        '🚪',
        () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.back();
        },
        false,
        true
      );
    } else {
      router.back();
    }
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection
        jokers={HOME_EC_JOKERS}
        theme="homeec"
        subject="Home Economics"
        onComplete={onComplete}
        rewardTier={completedLevel as 1 | 2 | 3}
        completionLevel={completedLevel as 1 | 2 | 3}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Candy Kitchen Study!</Text>

        <TouchableOpacity
          style={styles.jokerIconButton}
          onPress={() => {
            SoundEffects.playRandomPop();
            setShowAvailableJokers(true);
          }}
        >
          <PixelBorder
            borderColor="#6c757d"
            borderWidth={2}
            backgroundColor="#1c1f26"
            innerPadding={8}
          >
            <TextWithEmojis style={styles.jokerIconText} imageSize={20}>
              🃏
            </TextWithEmojis>
          </PixelBorder>
        </TouchableOpacity>

        <PixelBorder
          borderColor="#6c757d"
          borderWidth={3}
          backgroundColor="#2c3139"
          innerPadding={20}
          style={{ marginBottom: 20, width: '100%' }}
        >
          <Text style={styles.instructionsHeader}>How to Cook:</Text>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>1.</Text>
            <Text style={styles.stepText}>
              Swipe ingredients to matching kitchen stations
            </Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>2.</Text>
            <View>
              <View style={styles.instructionRow}>
                <Image
                  source={getCandyImage('🍭')}
                  style={styles.instructionEmoji}
                />
                <Text style={styles.stepText}>UP</Text>
              </View>
              <View style={styles.instructionRow}>
                <Image
                  source={getCandyImage('🍬')}
                  style={styles.instructionEmoji}
                />
                <Text style={styles.stepText}>RIGHT</Text>
              </View>
              <View style={styles.instructionRow}>
                <Image
                  source={getCandyImage('🧁')}
                  style={styles.instructionEmoji}
                />
                <Text style={styles.stepText}>DOWN</Text>
              </View>
              <View style={styles.instructionRow}>
                <Image
                  source={getCandyImage('🍫')}
                  style={styles.instructionEmoji}
                />
                <Text style={styles.stepText}>LEFT</Text>
              </View>
            </View>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>3.</Text>
            <Text style={styles.stepText}>Wrong swipes lose points</Text>
          </View>
        </PixelBorder>

        <PressableButton
          onPress={startGame}
          shadowOpacity={0}
          elevation={0}
          style={{ marginBottom: 16, width: '100%' }}
        >
          <PixelBorder
            borderColor="#6c757d"
            borderWidth={3}
            backgroundColor="#495057"
            innerPadding={0}
          >
            <View style={styles.pixelButtonInner}>
              <Text style={styles.startGameButtonText}>Start Cooking!</Text>
            </View>
          </PixelBorder>
        </PressableButton>

        <PressableButton
          onPress={handleForfeit}
          shadowColor="rgba(185,28,28,1)"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.5}
          shadowRadius={5}
          elevation={8}
          style={styles.backButton}
        >
          <PixelBorder
            borderColor="rgba(185,28,28,1)"
            borderWidth={3}
            backgroundColor="rgba(239,68,68,1)"
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
          jokers={HOME_EC_JOKERS}
          subject="Home Economics"
          themeColors={{
            borderColor: '#6c757d',
            backgroundColor: '#1c1f26',
            headerColor: '#2c3139',
            textColor: '#adb5bd',
          }}
        />
      </View>
    );
  }

  const levelConfig = getLevelConfig(level);

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
        <GestureHandlerRootView style={styles.gameContainer}>
          {/* Header */}
          <MinigameHUD
            title="Kitchen Practice"
            subtitle="Sort ingredients to their designated stations"
            leftInfo={`Level ${level}/3`}
            centerInfo={`🎯: ${score}/${levelConfig.matches}`}
            rightInfo={`Time: ${timeLeft}s`}
            theme="homeec"
          />

          {/* Game Area - Center Panel */}
          <GestureDetector gesture={panGesture}>
            <View style={styles.gameArea}>
              {/* Edge candies - Kitchen Stations */}
              <View style={[styles.edgeCandy, styles.topCandy]}>
                <Image
                  source={getCandyImage('🍭')}
                  style={styles.edgeCandyImage}
                />
                <Text style={styles.stationLabel}>PREP</Text>
              </View>
              <View style={[styles.edgeCandy, styles.rightCandy]}>
                <Image
                  source={getCandyImage('🍬')}
                  style={styles.edgeCandyImage}
                />
                <Text style={styles.stationLabel}>GRILL</Text>
              </View>
              <View style={[styles.edgeCandy, styles.bottomCandy]}>
                <Image
                  source={getCandyImage('🧁')}
                  style={styles.edgeCandyImage}
                />
                <Text style={styles.stationLabel}>OVEN</Text>
              </View>
              <View style={[styles.edgeCandy, styles.leftCandy]}>
                <Image
                  source={getCandyImage('🍫')}
                  style={styles.edgeCandyImage}
                />
                <Text style={styles.stationLabel}>COOL</Text>
              </View>

              {/* Preview panel */}
              {nextCandy && (
                <View style={styles.previewPanel}>
                  <Text style={styles.previewLabel}>NEXT:</Text>
                  <Image
                    source={getCandyImage(nextCandy)}
                    style={styles.previewCandyImage}
                  />
                </View>
              )}

              {/* Candy A - Static center candy */}
              <Animated.View style={[styles.centerCandy, candyAStyle]}>
                <CandyImage candy={candyA} />
              </Animated.View>

              {/* Candy B - Flying candy */}
              <Animated.View style={[styles.centerCandy, candyBStyle]}>
                <CandyImage candy={candyB} />
              </Animated.View>

              {/* Feedback */}
              {feedback && feedbackPosition && (
                <View
                  style={[
                    styles.feedbackContainer,
                    {
                      left: feedbackPosition.x,
                      top: feedbackPosition.y,
                      transform: [{ translateX: -30 }, { translateY: -15 }],
                    },
                  ]}
                >
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
              )}
            </View>
          </GestureDetector>

          {/* Footer - Bottom Buttons */}
          <View
            style={[
              styles.footer,
              {
                gap: ResponsiveSpacing.buttonGap(),
                paddingVertical: ResponsiveSpacing.buttonPadding(),
              },
            ]}
          >
            <PixelBorder
              borderColor="#adb5bd"
              borderWidth={3}
              backgroundColor="#6c757d"
              innerPadding={0}
              style={{ flex: 1 }}
            >
              <TouchableOpacity
                style={styles.leaveBtnInner}
                onPress={handleForfeit}
              >
                <Text style={styles.footerBtnText}>🚪 Leave</Text>
              </TouchableOpacity>
            </PixelBorder>
          </View>
        </GestureHandlerRootView>
      </View>

      <GameModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        emoji={modal.emoji}
        onClose={hideModal}
        onConfirm={modal.onConfirm}
        showCancelButton={modal.showCancelButton}
        theme="school"
        dismissible={modal.dismissible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1f26', // Dark metallic background
  },
  gameContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#2c3139', // Dark steel
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#495057', // Steel border
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.offWhite, // Light text
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: '#495057',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#adb5bd', // Medium gray
    fontFamily: 'PixeloidMono',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.green.success, // Success green
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#343a40', // Steel gray
    margin: 10,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#495057', // Steel border
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    minHeight: 400,
  },
  edgeCandy: {
    position: 'absolute',
    width: 70,
    height: 70,
    backgroundColor: '#6c757d', // Stainless steel
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#adb5bd', // Light steel border
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  stationLabel: {
    position: 'absolute',
    bottom: -18,
    fontSize: 8,
    fontWeight: '700',
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    backgroundColor: 'rgba(52, 58, 64, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  topCandy: {
    top: 20,
    left: '50%',
    marginLeft: -35,
  },
  rightCandy: {
    right: 20,
    top: '50%',
    marginTop: -35,
  },
  bottomCandy: {
    bottom: 20,
    left: '50%',
    marginLeft: -35,
  },
  leftCandy: {
    left: 20,
    top: '50%',
    marginTop: -35,
  },
  previewPanel: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#495057', // Steel background
    borderRadius: 8,
    padding: 8,
    borderWidth: 2,
    borderColor: '#6c757d',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    marginBottom: 2,
  },
  centerCandy: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
    width: 80,
    height: 80,
    backgroundColor: colors.offWhite, // Light metallic
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  feedbackContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(73, 80, 87, 0.95)', // Dark steel overlay
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: '#adb5bd',
    shadowColor: colors.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#2c3139',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#495057',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#adb5bd',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
  },
  footerBtn: {
    flex: 1,
    backgroundColor: '#495057', // Steel gray
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6c757d',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  leaveBtn: {
    backgroundColor: '#6c757d',
    borderColor: '#adb5bd',
  },
  leaveBtnInner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
  },
  // Instructions styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#1c1f26',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#495057',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionsCard: {
    backgroundColor: '#2c3139',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#495057',
    marginBottom: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#adb5bd',
    fontFamily: 'PixeloidMono',
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: '#495057',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6c757d',
    fontFamily: 'PixeloidMono',
    marginRight: 10,
    minWidth: 20,
    lineHeight: 22,
  },
  stepText: {
    fontSize: 16,
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: '#495057',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#6c757d',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    textShadowColor: '#343a40',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  instructionEmoji: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  edgeCandyImage: {
    width: 40,
    height: 40,
  },
  previewCandyImage: {
    width: 32,
    height: 32,
  },
  centerCandyImage: {
    width: 50,
    height: 50,
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
