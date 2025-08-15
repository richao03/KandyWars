import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import GameModal, { useGameModal } from '../components/GameModal';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import JokerSelection from '../components/JokerSelection';
import { LOGIC_JOKERS } from '../../src/utils/jokerEffectEngine';
import { ResponsiveSpacing } from '../../src/utils/responsive';

interface Attempt {
  candies: string[];
  feedback: ('correct' | 'present' | 'absent')[];
}

interface LogicGameProps {
  onComplete: () => void;
}

// Available candy types for Candy Wordle - organized by difficulty level
const CANDY_TYPES_LEVEL_1 = ['🍭', '🍬', '🧁', '🍫', '🍩', '🍪', '🍰', '🎂']; // 8 emojis
const CANDY_TYPES_LEVEL_2 = ['🍭', '🍬', '🧁', '🍫', '🍩', '🍪', '🍰', '🎂', '🍮', '🍯', '🍊', '🍓']; // 12 emojis  
const CANDY_TYPES_LEVEL_3 = ['🍭', '🍬', '🧁', '🍫', '🍩', '🍪', '🍰', '🎂', '🍮', '🍯', '🍊', '🍓', '🍇', '🍉', '🍒', '🥧']; // 16 emojis


export default function LogicGame({ onComplete }: LogicGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  
  // Screen dimensions - responsive sizing
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 750; // iPhone 15 Pro and smaller
  
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [level, setLevel] = useState(1); // 1, 2, 3
  const [secretCode, setSecretCode] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>(['', '', '', '']);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [allLevelsComplete, setAllLevelsComplete] = useState(false);
  const [maxAttempts] = useState(6);
  

  // Get candy types for current level
  const getCurrentCandyTypes = () => {
    switch (level) {
      case 1: return CANDY_TYPES_LEVEL_1;
      case 2: return CANDY_TYPES_LEVEL_2; 
      case 3: return CANDY_TYPES_LEVEL_3;
      default: return CANDY_TYPES_LEVEL_1;
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

  // Remove auto-scroll functionality since we're no longer using ScrollView

  // Calculate Wordle-style feedback
  const calculateFeedback = (guess: string[]): ('correct' | 'present' | 'absent')[] => {
    const feedback: ('correct' | 'present' | 'absent')[] = new Array(4).fill('absent');
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
        const foundIndex = secretCopy.findIndex(candy => candy === guessCopy[i]);
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
    if (currentGuess.some(candy => candy === '')) {
      showModal('⚠️ Incomplete Pattern', 'Please select all 4 candies');
      return;
    }

    // Generate feedback
    const feedback = calculateFeedback(currentGuess);
    
    const newAttempt: Attempt = {
      candies: [...currentGuess],
      feedback: feedback
    };

    const newAttempts = [...attempts, newAttempt];
    setAttempts(newAttempts);

    // Check if solved (all correct)
    if (feedback.every(f => f === 'correct')) {
      setGameComplete(true);
      
      if (level < 3) {
        // Level complete, move to next level
        showModal(`🎉 Level ${level} Complete!`, `Excellent! You solved Level ${level} in ${newAttempts.length} attempts! Ready for Level ${level + 1}?`, '🎉', () => {
          setLevel(level + 1);
          initializeLevel(level + 1);
        });
      } else {
        // All levels complete!
        setAllLevelsComplete(true);
        showModal('🏆 Master Candy Detective!', `Incredible! You've solved all 3 difficulty levels! You are a true Logic Master!`, '🏆', () => {
          setGameState('jokerSelection');
        });
      }
    } else if (newAttempts.length >= maxAttempts) {
      // Game over - too many attempts
      showModal('🚨 Game Over!', `You've used all ${maxAttempts} attempts. The answer was: ${secretCode.join('')}`);
    } else {
      // Continue guessing
      setCurrentGuess(['', '', '', '']);
    }
  };

  // Handle candy selection - fill next empty slot
  const handleCandySelect = (candy: string) => {
    const nextEmptyIndex = currentGuess.findIndex(slot => slot === '');
    if (nextEmptyIndex !== -1) {
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
    console.log(`Selected candy joker: ${LOGIC_JOKERS.find(j => j.id === jokerId)?.name}`);
    onComplete();
  };

  const handleForfeit = () => {
    if (gameState === 'playing') {
      showModal(
        '🚪 Leave Candy Riddle?', 
        'If you leave now, you\'ll miss your chance to solve logic puzzles!',
        '🚪',
        () => {
          router.back();
        }
      );
    } else {
      router.back();
    }
  };

  const getFeedbackStyle = (feedback: 'correct' | 'present' | 'absent') => {
    switch (feedback) {
      case 'correct': return styles.correctCandy;
      case 'present': return styles.presentCandy;
      case 'absent': return styles.absentCandy;
      default: return styles.absentCandy;
    }
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection 
        jokers={LOGIC_JOKERS}
        theme="candy"
        subject="Logic"
        onComplete={onComplete}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>🍭 Logic Study Session! 🧩</Text>
          
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>📝 How to Solve:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>Guess the secret 4-candy sequence (no duplicates)</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>Tap candies to select them for your guess</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>Submit your guess to get color-coded feedback</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>Use logic to deduce the correct sequence within 6 attempts!</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>5.</Text>
              <Text style={styles.stepText}>Complete all 3 levels: 8 candies → 12 candies → 16 candies</Text>
            </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendSquare, styles.correctCandy]} />
                  <Text style={styles.legendText}>Green = Correct candy, correct position</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendSquare, styles.presentCandy]} />
                  <Text style={styles.legendText}>Yellow = Candy is in sequence, wrong position</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendSquare, styles.absentCandy]} />
                  <Text style={styles.legendText}>Gray = Candy not in sequence</Text>
                </View>

          </View>
          
          <TouchableOpacity 
            style={styles.startGameButton} 
            onPress={() => {
              setGameState('playing');
              generateSecretCode();
            }}
          >
            <Text style={styles.startGameButtonText}>🎮 Start Logic Challenge!</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.startGameButton} onPress={handleForfeit}>
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {
      padding: ResponsiveSpacing.containerPadding(),
      paddingBottom: ResponsiveSpacing.containerPaddingBottom(),
    }]}>
      {/* Fixed Header */}
      <View style={[styles.header, {
        marginBottom: ResponsiveSpacing.headerMargin(),
        paddingVertical: ResponsiveSpacing.headerPadding(),
        paddingHorizontal: ResponsiveSpacing.headerPadding(),
      }]}>
        <Text style={styles.title}>🍭 Candy Riddle</Text>
        <Text style={styles.subtitle}>Crack the secret candy code!</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.levelText}>Level {level}/3</Text>
          <Text style={styles.attempts}>Attempts: {attempts.length}/{maxAttempts}</Text>
        </View>
      </View>

      {/* Scrollable Content Area */}
        <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>🍭 Make Your Guess:</Text>
        
        {/* Current guess display */}
        <View style={styles.guessDisplay}>
          {[0, 1, 2, 3].map((index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.guessSlot,
                currentGuess[index] !== '' && styles.filledSlot
              ]}
              onPress={() => handlePositionSelect(index)}
            >
              <Text style={styles.guessSlotText}>
                {currentGuess[index] || '?'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Candy selection palette */}
        <View style={styles.candyPalette}>
          <Text style={styles.paletteLabel}>Select candies in order (tap filled slots to clear):</Text>
          <View style={styles.candyOptions}>
            {getCurrentCandyTypes().map((candy, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.candyOption,
                  !currentGuess.includes('') && styles.candyOptionDisabled
                ]}
                onPress={() => handleCandySelect(candy)}
                disabled={!currentGuess.includes('')}
              >
                <Text style={styles.candyOptionText}>{candy}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.submitButton, currentGuess.includes('') && styles.submitButtonDisabled]} 
          onPress={handleSubmitGuess}
          disabled={currentGuess.includes('')}
        >
          <Text style={styles.submitButtonText}>🍭 Try Pattern</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.attemptsContainer}>
        <Text style={styles.attemptsTitle}>📋 Previous Attempts:</Text>
        <View 
          style={styles.attemptsScrollView}
        >
          {attempts.length === 0 ? (
            <Text style={styles.noAttempts}>No attempts yet. Good luck!</Text>
          ) : (
            attempts.map((attempt, attemptIndex) => (
              <View key={attemptIndex} style={styles.attemptRow}>
                <Text style={styles.attemptNumber}>{attemptIndex + 1}.</Text>
                <View style={styles.attemptGuess}>
                  {attempt.candies.map((candy, candyIndex) => (
                    <View key={candyIndex} style={[
                      styles.attemptCandy,
                      getFeedbackStyle(attempt.feedback[candyIndex])
                    ]}>
                      <Text style={styles.attemptCandyText}>{candy}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Fixed Bottom Buttons */}
      <View style={[styles.bottomButtons, {
        gap: ResponsiveSpacing.buttonGap(),
        paddingVertical: ResponsiveSpacing.buttonPadding(),
      }]}>
        <TouchableOpacity style={styles.instructionsButton} onPress={() => setGameState('instructions')}>
          <Text style={styles.instructionsButtonText}>📖 Instructions</Text>
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
      /></View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
  },
  contentScrollArea: {
    flex: 1,
    paddingHorizontal: 16,
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
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ff9a8b',
    fontFamily: 'CrayonPastel',
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
    fontFamily: 'CrayonPastel',
  },
  attempts: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff9a8b',
    fontFamily: 'CrayonPastel',
  },
  inputContainer: {
    backgroundColor: '#404040',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#666',
    padding: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    marginBottom: 12,
    textAlign: 'center',
  },
  guessDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  guessSlot: {
    width: 60,
    height: 60,
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#666',
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
    fontSize: 30,
    color: '#fff',
  },
  candyPalette: {
    marginBottom: 20,
  },
  paletteLabel: {
    fontSize: 14,
    color: '#ccc',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 12,
  },
  candyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  candyOption: {
    width: 50,
    height: 50,
    backgroundColor: '#404040',
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candyOptionDisabled: {
    opacity: 0.3,
  },
  candyOptionText: {
    fontSize: 30,
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
    borderColor: '#333',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  attemptsContainer: {
    backgroundColor: '#404040',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#666',
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
    color: '#fff',
    fontFamily: 'CrayonPastel',
    marginBottom: 4,
  },
  noAttempts: {
    fontSize: 14,
    color: '#ccc',
    fontFamily: 'CrayonPastel',
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
    color: '#ccc',
    fontFamily: 'CrayonPastel',
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
    borderColor: '#666',
    padding: 20,
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
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
    color: '#ccc',
    fontFamily: 'CrayonPastel',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#2c2c2c',
  },
  backButton: {
    flex:1,
    backgroundColor: '#f5222d',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#a8071a',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  // Instructions Styles (Matching Math game exactly)
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#2c2c2c',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
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
    borderColor: '#666',
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
    color: '#ff6ec7',
    fontFamily: 'CrayonPastel',
    marginRight: 10,
    minWidth: 20,
  },
  stepText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'CrayonPastel',
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
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  instructionsButton: {
    flex: 1,
    backgroundColor: '#404040',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
});