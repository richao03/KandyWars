import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import JokerSelection from '../components/JokerSelection';

interface Attempt {
  candies: string[];
  feedback: ('correct' | 'present' | 'absent')[];
}

interface LogicGameProps {
  onComplete: () => void;
}

// Available candy types for Candy Wordle
const CANDY_TYPES = ['🍭', '🍬', '🧁', '🍫', '🍩', '🍪', '🍰', '🎂'];

// Placeholder jokers for logic
const LOGIC_JOKERS = [
  { id: 1, name: "Master Key", description: "Open any locked market instantly" },
  { id: 2, name: "Safe Cracker", description: "Reveal one random candy location" },
  { id: 3, name: "Lock Pick", description: "Bypass one negative event" },
  { id: 4, name: "Security Bypass", description: "Access premium candy early" },
  { id: 5, name: "Code Breaker", description: "See competitor's inventory (future)" },
  { id: 6, name: "Digital Lock", description: "Double profits for one period" },
  { id: 7, name: "Combination Finder", description: "Get hints about market changes" },
  { id: 8, name: "Safe Deposit", description: "Protect money from theft events" },
];

export default function LogicGame({ onComplete }: LogicGameProps) {
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [secretCode, setSecretCode] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>(['', '', '', '']);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [maxAttempts] = useState(6);

  // Generate random 4-candy secret code (no duplicates like Wordle)
  const generateSecretCode = () => {
    const shuffled = [...CANDY_TYPES].sort(() => Math.random() - 0.5);
    const code = shuffled.slice(0, 4);
    setSecretCode(code);
    console.log('Secret code (for testing):', code.join(''));
  };

  useEffect(() => {
    generateSecretCode();
  }, []);

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
      Alert.alert('⚠️ Incomplete Pattern', 'Please select all 4 candies');
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
      Alert.alert(
        '🍭 Candy Wordle Solved!', 
        `Amazing! You solved Candy Wordle in ${newAttempts.length} attempts!`,
        [
          { text: 'Choose Reward', onPress: () => {
            setTimeout(() => setGameState('jokerSelection'), 500);
          }}
        ]
      );
    } else if (newAttempts.length >= maxAttempts) {
      // Game over - too many attempts
      Alert.alert(
        '🚨 Game Over!', 
        `You've used all ${maxAttempts} attempts. The answer was: ${secretCode.join('')}`,
        [
          { text: 'Try Again', onPress: () => {
            setAttempts([]);
            setCurrentGuess(['', '', '', '']);
            generateSecretCode();
          }},
          { text: 'Give Up', onPress: () => router.back(), style: 'destructive' }
        ]
      );
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
      Alert.alert(
        '🚪 Leave Candy Wordle?',
        'If you leave now, you\'ll forfeit your chance to study tonight and won\'t get a joker reward.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Back to Instructions', onPress: () => setGameState('instructions') },
          { 
            text: 'Leave', 
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
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
              <Text style={styles.stepText}>Green = Right candy in right position, Yellow = Right candy in wrong position</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>5.</Text>
              <Text style={styles.stepText}>Use logic to deduce the correct sequence within 6 attempts!</Text>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>🍭 Candy Wordle</Text>
        <Text style={styles.subtitle}>Guess the 4-candy sequence! No duplicates.</Text>
        <Text style={styles.attempts}>Attempts: {attempts.length}/{maxAttempts}</Text>
      </View>


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
            {CANDY_TYPES.map((candy, index) => (
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

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>🎯 How to Play:</Text>
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

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.instructionsButton} onPress={() => setGameState('instructions')}>
          <Text style={styles.instructionsButtonText}>📖 Instructions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={handleForfeit}>
          <Text style={styles.backButtonText}>🚪 Forfeit</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
  },
  scrollContent: {
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
    color: '#fff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
  },
  attempts: {
    fontSize: 14,
    color: '#ffa940',
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
    padding: 20,
    marginBottom: 20,
  },
  attemptsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    marginBottom: 12,
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
    alignItems: 'center',
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#f5222d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#a8071a',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    marginRight: 8,
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
});