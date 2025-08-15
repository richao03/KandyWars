import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import GameModal, { useGameModal } from '../components/GameModal';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  runOnJS,
  FadeInLeft,
  SlideInLeft,
  useAnimatedReaction,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import JokerSelection from '../components/JokerSelection';
import { MATH_JOKERS } from '../../src/utils/jokerEffectEngine';

interface MathGameProps {
  onComplete: () => void;
}

export default function MathGame({ onComplete }: MathGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  
  // Screen dimensions - responsive sizing
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 750; // iPhone 15 Pro and smaller
  
  // Game state
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds per level
  const [levelMatchesNeeded, setLevelMatchesNeeded] = useState(10); // Matches needed per level
  const [matchesCompleted, setMatchesCompleted] = useState(0); // Track matches in current level
  
  // Scrolling numbers state - pre-generated sequence that parades across screen
  const [numbersSequence, setNumbersSequence] = useState<number[]>([]);
  const [matchedIndices, setMatchedIndices] = useState<number[]>([]); // Track which numbers have been matched
  
  // Animation values - using Reanimated for smooth performance
  const scrollX = useSharedValue(-600); // Start position off-screen
  const flashValue = useSharedValue(0);
  const scrollSpeed = useSharedValue(2); // Pixels per frame
  const isScrolling = useSharedValue(false);
  
  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const numberBoxWidth = 60;
  
  // Generate random numbers 1-9
  const generateRandomNumbers = (count: number): number[] => {
    return Array.from({ length: count }, () => Math.floor(Math.random() * 9) + 1);
  };
  
  // Get level configuration - reduced speeds by 50% total (25% more from previous 25%)
  const getLevelConfig = (levelNum: number) => {
    switch (levelNum) {
      case 1: return { matchesNeeded: 10, scrollSpeed: 1.125 }; // Was 1.5, now 1.125 (25% slower)
      case 2: return { matchesNeeded: 15, scrollSpeed: 1.40625 }; // Was 1.875, now 1.40625 (25% slower)
      case 3: return { matchesNeeded: 20, scrollSpeed: 1.6875 }; // Was 2.25, now 1.6875 (25% slower)
      default: return { matchesNeeded: 10, scrollSpeed: 1.125 };
    }
  };

  // Get the LAST unmatched number in the sequence - this is what we match
  const getRightmostNumber = (): { number: number, index: number } => {
    if (numbersSequence.length === 0) return { number: 1, index: -1 };
    
    // Find the LAST unmatched number in the entire sequence (not just visible)
    let lastUnmatchedIndex = -1;
    
    for (let i = numbersSequence.length - 1; i >= 0; i--) {
      if (!matchedIndices.includes(i)) {
        lastUnmatchedIndex = i;
        break;
      }
    }
    
    if (lastUnmatchedIndex >= 0) {
      return { number: numbersSequence[lastUnmatchedIndex], index: lastUnmatchedIndex };
    }
    
    return { number: 1, index: -1 };
  };
  
  // Initialize scrolling numbers
  const initializeScrollingNumbers = () => {
    // Pre-generate exactly 10 numbers for this sequence
    const sequence = generateRandomNumbers(10);
    console.log('Generated sequence:', sequence);
    setNumbersSequence(sequence);
    setMatchedIndices([]); // Reset matched numbers
    scrollX.value = -600; // Start with numbers off-screen to the left
  };
  
  // Handle game over - regular function called via runOnJS
  const handleGameOver = () => {
    setGameActive(false);
    stopScrolling();
    if (timerRef.current) clearInterval(timerRef.current);
    
    showModal(
      '💥 Game Over!',
      `A number reached the edge! You completed ${matchesCompleted} matches.`,
      '💥',
      () => {
        // Restart level
        setMatchesCompleted(0);
        initializeScrollingNumbers();
        setTimeout(() => {
          startScrolling();
        }, 500);
        startTimer();
        setGameActive(true);
      }
    );
  };

  // Start the scrolling animation using Reanimated
  const startScrolling = () => {
    console.log('Starting parade scrolling with Reanimated...');
    const config = getLevelConfig(level);
    
    // Set scroll speed based on level
    scrollSpeed.value = config.scrollSpeed;
    isScrolling.value = true;
    
    // Animate scroll position continuously
    scrollX.value = withRepeat(
      withTiming(screenWidth + 700, {
        duration: 20000 / config.scrollSpeed, // Adjust duration based on speed
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false
    );
  };
  
  // Stop scrolling
  const stopScrolling = () => {
    cancelAnimation(scrollX);
    isScrolling.value = false;
  };
  
  // Start timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Handle when time runs out
  const handleTimeUp = () => {
    setGameActive(false);
    if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    
    showModal(
      '⏰ Time\'s Up!',
      `Level ${level} complete! Score: ${score}`,
      '⏰',
      () => {
        if (level < 3) {
          nextLevel();
        } else {
          setGameState('jokerSelection');
        }
      }
    );
  };
  
  // Handle bottom number click
  const handleBottomNumberClick = (clickedNumber: number) => {
    if (!gameActive) return;
    
    // Calculate which number is rightmost based on scroll position
    const rightmostData = getRightmostNumber();
    console.log(`Clicked: ${clickedNumber}, Rightmost: ${rightmostData.number}, Sum: ${clickedNumber + rightmostData.number}`);
    const sum = rightmostData.number + clickedNumber;
    
    if (sum === 10) {
      // Correct! Remove only the matched number
      if (rightmostData.index >= 0) {
        const newMatchedIndices = [...matchedIndices, rightmostData.index];
        setMatchedIndices(newMatchedIndices);
        console.log(`Matched number at index ${rightmostData.index}`);
        
        // Increment matches completed
        const newMatchesCompleted = matchesCompleted + 1;
        setMatchesCompleted(newMatchesCompleted);
        
        // Check if all numbers in current sequence have been matched
        if (newMatchedIndices.length >= 10) {
          // Generate new sequence when all are matched
          const newSequence = generateRandomNumbers(10);
          console.log('All matched! New sequence:', newSequence);
          setNumbersSequence(newSequence);
          setMatchedIndices([]);
          
          // Reset scroll position with animation
          cancelAnimation(scrollX);
          scrollX.value = -600;
          setTimeout(() => {
            if (gameActive) {
              startScrolling();
            }
          }, 100);
        }
        
        // Check if level is complete
        const config = getLevelConfig(level);
        if (newMatchesCompleted >= config.matchesNeeded) {
          setGameActive(false);
          stopScrolling();
          if (timerRef.current) clearInterval(timerRef.current);
          
          if (level < 3) {
            showModal(
              `🎉 Level ${level} Complete!`,
              `Excellent! You matched ${config.matchesNeeded} numbers! Ready for Level ${level + 1}?`,
              '🎉',
              () => {
                nextLevel();
              }
            );
          } else {
            showModal(
              '🏆 Math Master!',
              `Incredible! You've completed all 3 levels!`,
              '🏆',
              () => {
                setGameState('jokerSelection');
              }
            );
          }
        }
      }
      
      setScore(prev => prev + 10);
      flashValue.value = withSpring(1, {}, () => {
        flashValue.value = withSpring(0);
      });
    } else {
      // Wrong! Just lose points, no shake animation
      setScore(prev => Math.max(0, prev - 5));
    }
  };
  
  // Next level
  const nextLevel = () => {
    const newLevel = level + 1;
    const config = getLevelConfig(newLevel);
    
    setLevel(newLevel);
    setLevelMatchesNeeded(config.matchesNeeded);
    setMatchesCompleted(0);
    setTimeLeft(60);
    setGameActive(true);
    
    stopScrolling();
    initializeScrollingNumbers();
    setTimeout(() => {
      startScrolling();
    }, 300);
    startTimer();
  };
  
  // Start game
  const startGame = () => {
    console.log('Starting game...');
    const config = getLevelConfig(1);
    
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setLevelMatchesNeeded(config.matchesNeeded);
    setMatchesCompleted(0);
    setTimeLeft(60);
    setGameActive(true);
    initializeScrollingNumbers();
    
    // Start scrolling after initialization
    setTimeout(() => {
      startScrolling();
    }, 500);
    
    startTimer();
  };
  
  // Use refs to avoid hook dependency issues
  const numbersSequenceRef = useRef(numbersSequence);
  const matchedIndicesRef = useRef(matchedIndices);
  
  useEffect(() => {
    numbersSequenceRef.current = numbersSequence;
    matchedIndicesRef.current = matchedIndices;
  }, [numbersSequence, matchedIndices]);

  // Use animated reaction to check for game over
  useAnimatedReaction(
    () => scrollX.value,
    (currentPosition) => {
      'worklet';
      if (!isScrolling.value) return;
      
      // Check if any unmatched number reached the edge
      const sequence = numbersSequenceRef.current;
      const matched = matchedIndicesRef.current;
      
      for (let i = 0; i < sequence.length; i++) {
        if (matched.includes(i)) continue;
        
        const position = currentPosition + (i * 70);
        // Check if number has reached the right edge (including number width)
        if (position >= screenWidth - 60) { // Number width is 60px, so when it reaches screenWidth - 60 it's at the edge
          // Game over!
          isScrolling.value = false;
          cancelAnimation(scrollX);
          runOnJS(handleGameOver)();
          break;
        }
      }
    }
  );

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopScrolling();
    };
  }, []);
  
  // Handle forfeit
  const handleForfeit = () => {
    if (gameState === 'playing') {
      showModal(
        '📚 Leave Math Study?',
        'If you leave now, you\'ll miss your study session and won\'t earn any academic rewards.',
        '📚',
        () => {
          router.back();
        }
      );
    } else {
      router.back();
    }
  };
  
  
  // Animated styles - must be at top level
  const flashAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: flashValue.value ? 'rgba(0, 255, 0, 0.3)' : 'transparent',
  }));

  const scrollAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scrollX.value }]
  }));
  
  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection 
        jokers={MATH_JOKERS}
        theme="math"
        subject="Math"
        onComplete={onComplete}
      />
    );
  }
  
  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>📐 Math Study Session! 📏</Text>
          
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>📝 How to Solve:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>Watch numbers 1-9 scroll from left to right in the top row</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>Click the correct number in the bottom row to make the sum equal 10</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>Match with the rightmost number in the scrolling top row</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>Correct answers = +10 points, wrong answers = -5 points</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>5.</Text>
              <Text style={styles.stepText}>Level 1: Match 10 numbers | Level 2: 15 | Level 3: 20</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>⚠️</Text>
              <Text style={styles.stepText}>If any number reaches the right edge, you lose!</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.startGameButton} onPress={startGame}>
            <Text style={styles.startGameButtonText}>📝 Start Math Challenge!</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.startGameButton} onPress={handleForfeit}>
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <Animated.View style={[styles.container, {
      padding: ResponsiveSpacing.containerPadding(),
      paddingBottom: ResponsiveSpacing.containerPaddingBottom(),
    }, flashAnimatedStyle]}>
      {/* Header */}
      <View style={[styles.header, {
        marginBottom: ResponsiveSpacing.headerMargin(),
        padding: ResponsiveSpacing.headerPadding(),
      }]}>
        <Text style={[styles.title, {
          fontSize: ResponsiveSpacing.titleSize(),
          marginBottom: ResponsiveSpacing.inputMargin(),
        }]}>📐 Math Challenge</Text>
        <Text style={styles.subtitle}>Click the number that adds to {getRightmostNumber().number} = 10</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.level}>Level {level}/3</Text>
          <Text style={styles.score}>Matches: {matchesCompleted}/{levelMatchesNeeded}</Text>
          <Text style={[styles.timer, { color: timeLeft <= 10 ? '#ff4d4f' : '#52c41a' }]}>
            ⏱️ {timeLeft}s
          </Text>
        </View>
      </View>
      
      {/* Scrolling top row */}
      <View style={[styles.topRow, {
        marginBottom: ResponsiveSpacing.sectionMargin(),
        padding: ResponsiveSpacing.sectionPadding(),
      }]}>
        <Text style={styles.rowLabel}>Scrolling Numbers:</Text>
        <View style={styles.scrollContainer}>
          <Animated.View style={[styles.scrollingRow, scrollAnimatedStyle]}>
            {(() => {
              // Find the LAST unmatched number in the sequence
              let lastUnmatchedIndex = -1;
              
              for (let i = numbersSequence.length - 1; i >= 0; i--) {
                if (!matchedIndices.includes(i)) {
                  lastUnmatchedIndex = i;
                  break;
                }
              }
              
              return numbersSequence.map((number, index) => {
                // Skip rendering if this number has been matched
                if (matchedIndices.includes(index)) {
                  return null;
                }
                
                // Position each number with spacing so they follow each other
                const xPosition = index * 70; // 70px spacing between numbers
                
                // ONLY highlight the LAST unmatched number in the sequence
                const isHighlighted = index === lastUnmatchedIndex;
                
                return (
                  <View 
                    key={`number-${index}`}
                    style={[
                      styles.numberBox, 
                      styles.topNumberBox,
                      isHighlighted && styles.rightmostBox,
                      { position: 'absolute', left: xPosition }
                    ]}
                  >
                    <Text style={[
                      styles.numberText,
                      isHighlighted && styles.rightmostText
                    ]}>
                      {number}
                    </Text>
                  </View>
                );
              });
            })()}
          </Animated.View>
        </View>
      </View>
      
      {/* Static bottom row */}
      <View style={[styles.bottomRow, {
        marginBottom: ResponsiveSpacing.sectionMargin(),
        padding: ResponsiveSpacing.sectionPadding(),
      }]}>
        <Text style={styles.rowLabel}>Click the answer:</Text>
        <View style={styles.staticRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
            <TouchableOpacity
              key={number}
              style={[styles.numberBox, styles.bottomNumberBox]}
              onPress={() => handleBottomNumberClick(number)}
              disabled={!gameActive}
            >
              <Text style={styles.numberText}>{number}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Footer buttons */}
      <View style={[styles.buttonContainer, {
        gap: ResponsiveSpacing.buttonGap(),
        paddingVertical: ResponsiveSpacing.buttonPadding(),
      }]}>
        <TouchableOpacity style={styles.instructionsButton} onPress={() => {
          setGameActive(false);
          if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState('instructions');
        }}>
          <Text style={styles.instructionsButtonText}>📝 Instructions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.instructionsButton} onPress={handleForfeit}>
          <Text style={styles.instructionsButtonText}>🚪 Leave</Text>
        </TouchableOpacity>
      </View>
      
      <GameModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        emoji={modal.emoji}
        onClose={hideModal}
        onConfirm={modal.onConfirm}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d4a3e',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#1a2f23',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#90ee90',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#90ee90',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffff99',
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
    color: '#ffff99',
    fontFamily: 'CrayonPastel',
  },
  score: {
    fontSize: 18,
    fontWeight: '600',
    color: '#90ee90',
    fontFamily: 'CrayonPastel',
  },
  timer: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  topRow: {
    marginBottom: 30,
    backgroundColor: '#1a2f23',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8fbc8f',
    padding: 16,
  },
  bottomRow: {
    marginBottom: 30,
    backgroundColor: '#1a2f23',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8fbc8f',
    padding: 16,
  },
  rowLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffff99',
    fontFamily: 'CrayonPastel',
    marginBottom: 12,
    textAlign: 'center',
  },
  scrollContainer: {
    height: 80,
    overflow: 'hidden',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    justifyContent: 'flex-start',
    minHeight: 80,
    minWidth: 800, // Ensure enough width for all 10 numbers (10 * 60 + spacing)
  },
  staticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  numberBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  topNumberBox: {
    backgroundColor: '#0f1b13',
    borderColor: '#f5deb3',
  },
  bottomNumberBox: {
    backgroundColor: '#0f1b13',
    borderColor: '#ffff99',
  },
  rightmostBox: {
    borderColor: '#ff6b35',
    borderWidth: 3,
    backgroundColor: '#2d1b0f',
  },
  numberText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
  rightmostText: {
    color: '#ff6b35',
    textShadowColor: '#ffff99',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
  },
  instructionsButton: {
    flex: 1,
    backgroundColor: '#1a2f23',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8fbc8f',
    alignItems: 'center',
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
  // Instructions Styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#2d4a3e',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#8fbc8f',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionsCard: {
    backgroundColor: '#1a2f23',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#8fbc8f',
    marginBottom: 20,
    shadowColor: '#ffff99',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffff99',
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
    color: '#ffff99',
    fontFamily: 'CrayonPastel',
    marginRight: 10,
    minWidth: 20,
  },
  stepText: {
    fontSize: 16,
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    flex: 1,
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: '#556b2f',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#9acd32',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#ffff99',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
});