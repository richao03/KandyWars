import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { LOGIC_JOKERS } from '../../src/utils/jokerEffectEngine';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';
import PixelBorder from '../components/PixelBorder';
import PressableButton from '../components/PressableButton';
import TextWithEmojis from '../components/TextWithEmojis';
import AvailableJokersModal from '../components/AvailableJokersModal';
import colors from '../../src/constants/colors';


interface Attempt {
  candies: string[];
  feedback: ('correct' | 'present' | 'absent')[];
}

interface LogicGameProps {
  onComplete: () => void;
}

// Available candy types for Candy Wordle - organized by difficulty level
const CANDY_TYPES_LEVEL_1 = ['🍭', '🍬', '🧁', '🍫', '🍩', '🍪', '🍰', '🎂']; // 8 emojis
const CANDY_TYPES_LEVEL_2 = [
  '🍭',
  '🍬',
  '🧁',
  '🍫',
  '🍩',
  '🍪',
  '🍰',
  '🎂',
  '🍮',
  '🍯',
  '🍊',
  '🍓',
]; // 12 emojis
const CANDY_TYPES_LEVEL_3 = [
  '🍭',
  '🍬',
  '🧁',
  '🍫',
  '🍩',
  '🍪',
  '🍰',
  '🎂',
  '🍮',
  '🍯',
  '🍊',
  '🍓',
  '🍇',
  '🍉',
  '🍒',
  '🥧',
]; // 16 emojis

export default function LogicGame({ onComplete }: LogicGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { trackMinigamePlayed } = useScoreboard();
  const { trackMinigamePlayed: trackMinigameProgress } = useMinigameTracking();
  const scrollViewRef = useRef<ScrollView>(null);

  // Screen dimensions - responsive sizing
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 750; // iPhone 15 Pro and smaller

  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [level, setLevel] = useState(1); // 1, 2, 3
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed
  const [secretCode, setSecretCode] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>(['', '', '', '']);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [allLevelsComplete, setAllLevelsComplete] = useState(false);
  const [maxAttempts] = useState(6);
  const [showAvailableJokers, setShowAvailableJokers] = useState(false);

  // Start game
  const startGame = () => {
    // Track minigame play for analytics
    trackMinigamePlayed('logic');
    trackMinigameProgress('logic');

    setGameState('playing');
    generateSecretCode();
  };

  // Get candy types for current level
  const getCurrentCandyTypes = () => {
    switch (level) {
      case 1:
        return CANDY_TYPES_LEVEL_1;
      case 2:
        return CANDY_TYPES_LEVEL_2;
      case 3:
        return CANDY_TYPES_LEVEL_3;
      default:
        return CANDY_TYPES_LEVEL_1;
    }
  };

  // Generate random 4-candy secret code (no duplicates like Wordle)
  const generateSecretCode = () => {
    const candyTypes = getCurrentCandyTypes();
    const shuffled = [...candyTypes].sort(() => Math.random() - 0.5);
    const code = shuffled.slice(0, 4);
    setSecretCode(code);
    console.log(`Level ${level} secret code (for testing):`, code.join(''));
  };

  // Initialize level - reset state and generate new code
  const initializeLevel = (levelNum: number) => {
    setCurrentGuess(['', '', '', '']);
    setAttempts([]);
    setGameComplete(false);
    generateSecretCode();
  };

  useEffect(() => {
    generateSecretCode();
  }, [level]);

  // Auto-scroll to bottom when new attempts are added
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [attempts]);

  // Calculate Wordle-style feedback
  const calculateFeedback = (
    guess: string[]
  ): ('correct' | 'present' | 'absent')[] => {
    const feedback: ('correct' | 'present' | 'absent')[] = new Array(4).fill(
      'absent'
    );
    const secretCopy = [...secretCode];
    const guessCopy = [...guess];

    // First pass: mark exact matches as correct
    for (let i = 0; i < 4; i++) {
      if (guessCopy[i] === secretCopy[i]) {
        feedback[i] = 'correct';
        secretCopy[i] = 'USED'; // Mark as used
        guessCopy[i] = 'MATCHED'; // Mark as processed
      }
    }

    // Second pass: check for present but wrong position
    for (let i = 0; i < 4; i++) {
      if (guessCopy[i] !== 'MATCHED') {
        const foundIndex = secretCopy.findIndex(
          (candy) => candy === guessCopy[i]
        );
        if (foundIndex !== -1) {
          feedback[i] = 'present';
          secretCopy[foundIndex] = 'USED'; // Mark as used
        }
      }
    }

    return feedback;
  };

  // Handle guess submission
  const handleSubmitGuess = () => {
    // Validate input
    if (currentGuess.some((candy) => candy === '')) {
      showModal('⚠️ Incomplete Pattern', 'Please select all 4 candies');
      return;
    }

    // Generate feedback
    const feedback = calculateFeedback(currentGuess);

    const newAttempt: Attempt = {
      candies: [...currentGuess],
      feedback: feedback,
    };

    const newAttempts = [...attempts, newAttempt];
    setAttempts(newAttempts);

    // Check if solved (all correct)
    if (feedback.every((f) => f === 'correct')) {
      // Success haptic feedback - level completed!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setGameComplete(true);
      setCompletedLevel(level); // Mark this level as completed

      if (level < 3) {
        // Level complete, move to next level
        showModal(
          `Level ${level} Complete!`,
          `Excellent! You solved Level ${level} in ${newAttempts.length} attempts!\n Ready for Level ${level + 1}?`,
          '🎉',
          () => {
            setLevel(level + 1);
            initializeLevel(level + 1);
          }
        );
      } else {
        // All levels complete!
        setAllLevelsComplete(true);
        showModal(
          'Master Candy Detective!',
          `Incredible! You've solved all 3 difficulty levels! You are a true Logic Master!`,
          '🏆',
          () => {
            setGameState('jokerSelection');
          }
        );
      }
    } else if (newAttempts.length >= maxAttempts) {
      // Game over - too many attempts
      if (completedLevel > 0) {
        // Player completed at least one level, award jokers based on completion
        const jokerCount = completedLevel;
        const jokerText = jokerCount > 1 ? `${jokerCount} jokers` : '1 joker';

        showModal(
          'Good Try!',
          `You ran out of attempts but completed Level ${completedLevel}!\n\nYou'll receive ${jokerText}!`,
          '🧠',
          () => {
            setGameState('jokerSelection');
          }
        );
      } else {
        // Player didn't complete any level - game over, no reward
        showModal(
          'Game Over!',
          `You've used all ${maxAttempts} attempts on Level 1. \n\n Better luck next time!`,
          '🚨',
          () => {
            router.back(); // Return to study page without reward
          }
        );
      }
    } else {
      // Incorrect guess - medium haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Continue guessing
      setCurrentGuess(['', '', '', '']);
    }
  };

  // Handle candy selection - fill next empty slot
  const handleCandySelect = (candy: string) => {
    const nextEmptyIndex = currentGuess.findIndex((slot) => slot === '');
    if (nextEmptyIndex !== -1) {
      // Light haptic feedback for candy selection
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newGuess = [...currentGuess];
      newGuess[nextEmptyIndex] = candy;
      setCurrentGuess(newGuess);
    }
  };

  // Handle position selection - allow clearing a specific slot
  const handlePositionSelect = (position: number) => {
    if (currentGuess[position] !== '') {
      const newGuess = [...currentGuess];
      newGuess[position] = '';
      setCurrentGuess(newGuess);
    }
  };

  const handleJokerChoice = (jokerId: number) => {
    console.log(
      `Selected candy joker: ${LOGIC_JOKERS.find((j) => j.id === jokerId)?.name}`
    );
    onComplete();
  };

  const handleForfeit = () => {
    if (gameState === 'playing') {
      showModal(
        'Leave Candy Riddle?',
        "If you leave now, you'll miss your chance to solve logic puzzles!",
        '🚪',
        () => {
          router.back();
        },
        false,
        true
      );
    } else {
      router.back();
    }
  };

  const getFeedbackStyle = (feedback: 'correct' | 'present' | 'absent') => {
    switch (feedback) {
      case 'correct':
        return styles.correctCandy;
      case 'present':
        return styles.presentCandy;
      case 'absent':
        return styles.absentCandy;
      default:
        return styles.absentCandy;
    }
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection
        jokers={LOGIC_JOKERS}
        theme="candy"
        subject="Logic"
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
          <Text style={styles.instructionsTitle}>Logic Study Session!</Text>

          <TouchableOpacity
            style={styles.jokerIconButton}
            onPress={() => setShowAvailableJokers(true)}
          >
            <PixelBorder
              borderColor="#ff6ec7"
              borderWidth={2}
              backgroundColor="#2d1b69"
              innerPadding={8}
            >
              <TextWithEmojis style={styles.jokerIconText} imageSize={20}>
                🃏
              </TextWithEmojis>
            </PixelBorder>
          </TouchableOpacity>

          <PixelBorder
            borderColor="#666"
            borderWidth={3}
            backgroundColor="#404040"
            innerPadding={20}
            style={{ marginBottom: 20, width: '100%' }}
          >
            <Text style={styles.instructionsHeader}>How to Solve:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1. </Text>
              <Text style={styles.stepText}>
                Crack the secret 4-candy code using logic
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2. </Text>
              <Text style={styles.stepText}>
                Colors show correct position, wrong position, or not in code
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3. </Text>
              <Text style={styles.stepText}>
                Only 6 attempts per level - think carefully!
              </Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendSquare, styles.correctCandy]} />
              <Text style={styles.legendText}>
                Green = Correct candy, correct position
              </Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendSquare, styles.presentCandy]} />
              <Text style={styles.legendText}>
                Yellow = Candy is in sequence, wrong position
              </Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendSquare, styles.absentCandy]} />
              <Text style={styles.legendText}>
                Gray = Candy not in sequence
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
              borderColor="#666"
              borderWidth={3}
              backgroundColor="#ff6ec7"
              innerPadding={0}
            >
              <View style={styles.pixelButtonInner}>
                <Text style={styles.startGameButtonText}>Start Challenge!</Text>
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
        </View>

        <AvailableJokersModal
          visible={showAvailableJokers}
          onClose={() => setShowAvailableJokers(false)}
          jokers={LOGIC_JOKERS}
          subject="Logic"
          themeColors={{
            borderColor: '#ff6ec7',
            backgroundColor: '#2d1b69',
            headerColor: '#404040',
            textColor: '#ff9a8b',
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View
        style={[
          styles.headerContainer,
          {
            padding: ResponsiveSpacing.containerPadding(),
          },
        ]}
      >
        <MinigameHUD
          title="Candy Riddle"
          subtitle="Crack the secret candy code!"
          leftInfo={`Level ${level}/3`}
          centerInfo={' '}
          rightInfo={`Tries: ${attempts.length}/${maxAttempts}`}
          theme="logic"
        />
      </View>

      {/* Scrollable Content Area - Limited height to fit screen */}
      <View
        style={[
          styles.gameContent,
          {
            paddingHorizontal: ResponsiveSpacing.containerPadding(),
          },
        ]}
      >
        <ScrollView
          style={styles.contentScrollView}
          contentContainerStyle={styles.contentScrollContainer}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.inputContainer}>
            <TextWithEmojis style={styles.inputLabel} imageSize={25}>
              Make Your Guess:
            </TextWithEmojis>

            {/* Scrollable area for attempts with max height for 4 rows */}
            <View style={styles.attemptsScrollContainer}>
              <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.attemptsScrollContent}
              >
                {/* Previous attempts displayed inline */}
                {attempts.map((attempt, attemptIndex) => (
                  <View key={attemptIndex} style={styles.guessDisplay}>
                    {attempt.candies.map((candy, candyIndex) => (
                      <View
                        key={candyIndex}
                        style={[
                          styles.guessSlot,
                          styles.filledSlot,
                          getFeedbackStyle(attempt.feedback[candyIndex]),
                        ]}
                      >
                        <TextWithEmojis
                          imageSize={25}
                          style={styles.guessSlotText}
                        >
                          {candy}
                        </TextWithEmojis>
                      </View>
                    ))}
                  </View>
                ))}

                {/* Current guess display */}
                <View style={styles.guessDisplay}>
                  {[0, 1, 2, 3].map((index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.guessSlot,
                        currentGuess[index] !== '' && styles.filledSlot,
                      ]}
                      onPress={() => handlePositionSelect(index)}
                    >
                      <TextWithEmojis
                        imageSize={25}
                        style={styles.guessSlotText}
                      >
                        {currentGuess[index] || '?'}
                      </TextWithEmojis>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Candy selection palette */}
            <View style={styles.candyPalette}>
              <View style={styles.candyOptions}>
                {/* First row */}
                <View
                  style={[
                    styles.candyRow,
                    getCurrentCandyTypes().length > 12 &&
                      styles.candyRowCompact,
                  ]}
                >
                  {getCurrentCandyTypes()
                    .slice(0, Math.ceil(getCurrentCandyTypes().length / 2))
                    .map((candy, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.candyOption,
                          getCurrentCandyTypes().length > 12 &&
                            styles.candyOptionCompact,
                          !currentGuess.includes('') &&
                            styles.candyOptionDisabled,
                        ]}
                        onPress={() => handleCandySelect(candy)}
                        disabled={!currentGuess.includes('')}
                      >
                        <TextWithEmojis
                          imageSize={30}
                          style={[
                            styles.candyOptionText,
                            getCurrentCandyTypes().length > 12 &&
                              styles.candyOptionTextCompact,
                          ]}
                        >
                          {candy}
                        </TextWithEmojis>
                      </TouchableOpacity>
                    ))}
                </View>
                {/* Second row */}
                <View
                  style={[
                    styles.candyRow,
                    getCurrentCandyTypes().length > 12 &&
                      styles.candyRowCompact,
                  ]}
                >
                  {getCurrentCandyTypes()
                    .slice(Math.ceil(getCurrentCandyTypes().length / 2))
                    .map((candy, index) => (
                      <TouchableOpacity
                        key={
                          index + Math.ceil(getCurrentCandyTypes().length / 2)
                        }
                        style={[
                          styles.candyOption,
                          getCurrentCandyTypes().length > 12 &&
                            styles.candyOptionCompact,
                          !currentGuess.includes('') &&
                            styles.candyOptionDisabled,
                        ]}
                        onPress={() => handleCandySelect(candy)}
                        disabled={!currentGuess.includes('')}
                      >
                        <TextWithEmojis
                          imageSize={30}
                          style={[
                            styles.candyOptionText,
                            getCurrentCandyTypes().length > 12 &&
                              styles.candyOptionTextCompact,
                          ]}
                        >
                          {candy}
                        </TextWithEmojis>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                currentGuess.includes('') && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitGuess}
              disabled={currentGuess.includes('')}
            >
              <TextWithEmojis imageSize={30} style={styles.submitButtonText}>
                🍭 Try Pattern
              </TextWithEmojis>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Fixed Bottom Buttons */}
      <View
        style={[
          styles.bottomButtons,
          {
            gap: ResponsiveSpacing.buttonGap(),
            paddingVertical: ResponsiveSpacing.buttonPadding(),
            paddingHorizontal: ResponsiveSpacing.containerPadding(),
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
            style={styles.instructionsButtonInner}
            onPress={handleForfeit}
          >
            <TextWithEmojis style={styles.instructionsButtonText} imageSize={28}>
              🚪 Leave
            </TextWithEmojis>
          </TouchableOpacity>
        </PixelBorder>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkGray2,
  },
  headerContainer: {
    backgroundColor: colors.darkGray2,
    paddingBottom: 0,
  },
  gameContent: {
    flex: 1,
    backgroundColor: colors.darkGray2,
  },
  contentScrollView: {
    flex: 1,
  },
  contentScrollContainer: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#2d1b69',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ff6ec7',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ff6ec7',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ff9a8b',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 16,
  },
  gameInfo: {
    flexDirection: 'row',
    gap: 20,
  },
  levelText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9c88ff',
    fontFamily: 'PixeloidMono',
  },
  attempts: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff9a8b',
    fontFamily: 'PixeloidMono',
  },
  inputContainer: {
    backgroundColor: '#404040',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.gray.medium,
    padding: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    marginBottom: 12,
    textAlign: 'center',
  },
  attemptsScrollContainer: {
    maxHeight: 248, // 4 rows * 50px height + 3 gaps * 12px + padding
    marginBottom: 12,
  },
  attemptsScrollContent: {
    paddingBottom: 0,
  },
  guessDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  guessSlot: {
    width: 50,
    height: 50,
    backgroundColor: colors.darkGray1,
    borderWidth: 2,
    borderColor: colors.gray.medium,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledSlot: {
    borderColor: '#52c41a',
    backgroundColor: '#162312',
    shadowColor: '#52c41a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  guessSlotText: {
    fontSize: 25,
    color: colors.white,
  },
  candyPalette: {
    marginBottom: 12,
  },
  paletteLabel: {
    fontSize: 14,
    color: colors.gray.border,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 12,
  },
  candyOptions: {
    flexDirection: 'column',
    gap: 8,
  },
  candyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  candyRowCompact: {
    gap: 4, // Reduce gap for level 3 (16 candies)
  },
  candyOption: {
    width: 45,
    height: 45,
    backgroundColor: '#404040',
    borderWidth: 2,
    borderColor: colors.gray.medium,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candyOptionCompact: {
    width: 38, // Smaller size for level 3 (16 candies)
    height: 38,
  },
  candyOptionDisabled: {
    opacity: 0.3,
  },
  candyOptionText: {
    fontSize: 25,
  },
  candyOptionTextCompact: {
    fontSize: 20, // Smaller text for level 3 (16 candies)
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
  submitButton: {
    backgroundColor: '#1890ff',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0050b3',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#555',
    borderColor: colors.gray.dark,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
  },
  attemptsContainer: {
    backgroundColor: '#404040',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.gray.medium,
    padding: 12,
    marginBottom: 20,
    height: 200, // Prevent growing too tall
  },
  attemptsScrollView: {
    marginTop: 10,
  },
  attemptsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
  },
  noAttempts: {
    fontSize: 14,
    color: colors.gray.border,
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  attemptNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray.border,
    fontFamily: 'PixeloidMono',
    width: 20,
  },
  attemptGuess: {
    flexDirection: 'row',
    gap: 4,
  },
  attemptCandy: {
    width: 35,
    height: 35,
    backgroundColor: '#555',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attemptCandyText: {
    fontSize: 20,
  },
  // Wordle-style feedback colors
  correctCandy: {
    backgroundColor: '#6aaa64', // Wordle green
    borderColor: '#6aaa64',
  },
  presentCandy: {
    backgroundColor: '#c9b458', // Wordle yellow
    borderColor: '#c9b458',
  },
  absentCandy: {
    backgroundColor: '#787c7e', // Wordle gray
    borderColor: '#787c7e',
  },
  legendContainer: {
    backgroundColor: '#404040',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.gray.medium,
    padding: 20,
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  legendSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 14,
    color: colors.gray.border,
    fontFamily: 'PixeloidMono',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.darkGray2,
  },
  gameBackButton: {
    flex: 1,
    backgroundColor: '#f5222d',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#a8071a',
    alignItems: 'center',
  },
  gameBackButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
  },
  // Instructions Styles (Matching Math game exactly)
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: colors.darkGray2,
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#ff6ec7',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionsCard: {
    backgroundColor: '#404040',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: colors.gray.medium,
    marginBottom: 20,
    shadowColor: '#ff6ec7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff6ec7',
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
    color: '#ff6ec7',
    fontFamily: 'PixeloidMono',
    marginRight: 10,
    minWidth: 20,
    lineHeight: 22,
  },
  stepText: {
    fontSize: 16,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    flex: 1,
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: '#ff6ec7',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#ff1493',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#ff6ec7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
  },
  pixelButtonInner: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  instructionsButton: {
    flex: 1,
    backgroundColor: '#404040',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gray.medium,
    alignItems: 'center',
  },
  instructionsButtonInner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
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
