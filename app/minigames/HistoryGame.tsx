import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { HISTORY_JOKERS } from '../../src/utils/jokerEffectEngine';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';

interface CaesarPuzzle {
  id: number;
  encrypted: string;
  decrypted: string;
  shift: number;
  hint: string;
}

interface HistoryGameProps {
  onComplete: () => void;
}

// Historical Caesar cipher puzzles
const CAESAR_PUZZLES: CaesarPuzzle[] = [
  {
    id: 1,
    encrypted: 'TLOA FP LRQ LC ZXKAV',
    decrypted: 'WORD IS OUT OF CANDY',
    shift: -3,
    hint: 'Rumors spreading about candy shortage',
  },
  {
    id: 2,
    encrypted: 'PBIIFKD DRJ XQ OBZBPP',
    decrypted: 'SELLING GUM AT RECESS',
    shift: -3,
    hint: 'A common way to make cash',
  },
  {
    id: 3,
    encrypted: 'PKBXH QL QEB ABIF',
    decrypted: 'SNEAK TO THE DELI',
    shift: -3,
    hint: 'A risky after-school run',
  },
  {
    id: 4,
    encrypted: 'MOFZBP XOB EFDE QLAXV',
    decrypted: 'PRICES ARE HIGH TODAY',
    shift: -3,
    hint: 'When candy costs skyrocket',
  },
  {
    id: 5,
    encrypted: 'JXOHBQ FP COBPEIV OBPQLZHBA',
    decrypted: 'MARKET IS FRESHLY RESTOCKED',
    shift: -3,
    hint: 'When new candy arrives',
  },
  {
    id: 6,
    encrypted: 'ELJBTLOH ZXK TXFQ',
    decrypted: 'HOMEWORK CAN WAIT',
    shift: -3,
    hint: 'When business comes first',
  },
  {
    id: 7,
    encrypted: 'QOXAB JB PLRO MXQZE',
    decrypted: 'TRADE ME SOUR PATCH',
    shift: -3,
    hint: 'Negotiating with classmates',
  },
  {
    id: 8,
    encrypted: 'MLZHBQ FP CRII LC ZXPE',
    decrypted: 'POCKET IS FULL OF CASH',
    shift: -3,
    hint: 'When sales have been good',
  },
  {
    id: 9,
    encrypted: 'HBBM QEB QBXZEBO YRPV',
    decrypted: 'KEEP THE TEACHER BUSY',
    shift: -3,
    hint: 'Classic distraction tactic',
  },
  {
    id: 10,
    encrypted: 'OBJBJYBO QL PQXPE QEB MOLCFQP',
    decrypted: 'REMEMBER TO STASH THE PROFITS',
    shift: -3,
    hint: 'Protecting your earnings',
  },
];

// Placeholder jokers for history

export default function HistoryGame({ onComplete }: HistoryGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { trackMinigamePlayed } = useScoreboard();
  const { trackMinigamePlayed: trackMinigameProgress } = useMinigameTracking();

  // Screen dimensions - responsive sizing
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 750; // iPhone 15 Pro and smaller

  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [currentPuzzle, setCurrentPuzzle] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [completedPuzzles, setCompletedPuzzles] = useState(0);
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed
  const [gameComplete, setGameComplete] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Get current puzzle
  const puzzle = CAESAR_PUZZLES[currentPuzzle];

  // Caesar cipher decode function
  const caesarDecode = (text: string, shift: number): string => {
    return text
      .split('')
      .map((char) => {
        if (char.match(/[A-Z]/)) {
          const charCode = char.charCodeAt(0);
          const shifted = ((charCode - 65 - shift + 26) % 26) + 65;
          return String.fromCharCode(shifted);
        }
        return char; // Keep spaces and punctuation
      })
      .join('');
  };

  // Start game
  const startGame = () => {
    // Track minigame play for analytics
    trackMinigamePlayed('history');
    trackMinigameProgress('history');

    setGameState('playing');
  };

  // Generate next puzzle
  const generatePuzzle = () => {
    setCurrentPuzzle((prev) => prev + 1);
    setUserAnswer('');
    // Focus input after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Initialize game
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentPuzzle]);

  const handleSubmit = () => {
    const normalizedAnswer = userAnswer.trim().toUpperCase();
    const normalizedCorrect = puzzle.decrypted.toUpperCase();

    if (normalizedAnswer === normalizedCorrect) {
      // Correct answer!
      const newCompleted = completedPuzzles + 1;
      setCompletedPuzzles(newCompleted);

      if (newCompleted >= 3) {
        // Game complete after 3 puzzles
        setGameComplete(true);
        setCompletedLevel(3); // All puzzles completed = level 3
        showModal(
          '🏛️ History Master!',
          'Excellent work decoding ancient messages!',
          '🏛️',
          () => {
            setGameState('jokerSelection');
          }
        );
      } else {
        // Move to next puzzle and update completed level
        setCompletedLevel(newCompleted); // Update completed level for partial completion
        showModal(
          '✅ Correct!',
          `Well done! Ready for cipher ${newCompleted + 1}?`,
          '✅',
          () => {
            generatePuzzle();
          }
        );
      }
    } else {
      // Wrong answer - no immediate game over, but track if any progress was made
      if (completedPuzzles === 0) {
        // No progress yet, show retry
        showModal(
          '❌ Not quite right',
          'Try decoding the message again. Remember to shift each letter!'
        );
      } else {
        // Some progress made, but this answer was wrong
        // Check if player wants to continue or get jokers for partial completion
        showModal(
          '❌ Not quite right',
          `You've solved ${completedPuzzles} puzzles so far. Try again or collect rewards?`,
          '❌',
          () => {
            // Continue trying
          },
          true, // dismissible
          'Try Again',
          () => {
            // Award jokers for partial completion
            setGameState('jokerSelection');
          },
          'Collect Rewards'
        );
      }
    }
  };

  const handleShowHint = () => {
    const decoded = caesarDecode(puzzle.encrypted, puzzle.shift);
    showModal(
      '💡 Cipher Helper',
      `Hint: ${puzzle.hint}\n\nFirst word decoded: "${decoded.split(' ')[0]}"`
    );
  };

  const handleJokerChoice = (jokerId: number) => {
    console.log(
      `Selected history joker: ${HISTORY_JOKERS.find((j) => j.id === jokerId)?.name}`
    );
    onComplete();
  };

  const handleForfeit = () => {
    if (gameState === 'playing') {
      showModal(
        '🚪 Leave History Study?',
        "If you leave now, you'll miss your chance to study history!",
        '🚪',
        () => {
          router.back();
        }
      );
    } else {
      router.back();
    }
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection
        jokers={HISTORY_JOKERS}
        theme="economy"
        subject="History"
        onComplete={onComplete}
        rewardTier={completedLevel as 1 | 2 | 3}
        completionLevel={completedLevel as 1 | 2 | 3}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>
            🏛️ History Study Session! 📜
          </Text>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>📝 How to Decode:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>🔤</Text>
              <Text style={styles.stepText}>
                Caesar cipher: shift letters back
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>🔑</Text>
              <Text style={styles.stepText}>
                Use the shift key to decode
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startGameButton}
            onPress={startGame}
          >
            <Text style={styles.startGameButtonText}>📜 Start Decoding!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.startGameButton}
            onPress={handleForfeit}
          >
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View
        style={[
          styles.header,
          {
            marginBottom: isSmallScreen ? 12 : 24,
            padding: isSmallScreen ? 12 : 16,
          },
        ]}
      >
        <Text style={styles.title}>🏛️ Caesar Ciphers</Text>
        <Text style={styles.subtitle}>Decode ancient secrets</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.progress}>Cipher {completedPuzzles + 1}/3</Text>
        </View>
      </View>

      <View style={styles.puzzleContainer}>
        <View style={styles.shiftInfo}>
          <Text style={styles.shiftLabel}>🔑 Shift Key: {puzzle.shift}</Text>
          <Text style={styles.shiftHint}>
            Move each letter {puzzle.shift} places back in the alphabet
          </Text>
        </View>

        <View style={styles.encryptedContainer}>
          <Text style={styles.encryptedLabel}>📜 Encrypted Message:</Text>
          <Text style={styles.encryptedText}>{puzzle.encrypted}</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>✏️ Your Decoded Message:</Text>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={userAnswer}
            onChangeText={setUserAnswer}
            placeholder="Type the decoded message here..."
            placeholderTextColor="#999"
            autoCapitalize="characters"
            autoCorrect={false}
            multiline={true}
            numberOfLines={3}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.hintButton} onPress={handleShowHint}>
            <Text style={styles.hintButtonText}>💡 Get Hint</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              !userAnswer.trim() && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!userAnswer.trim()}
          >
            <Text style={styles.submitButtonText}>🔍 Decode!</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.backButton} onPress={handleForfeit}>
          <Text style={styles.backButtonText}>🚪 Leave</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefaf5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#f5f5dc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DEB887',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#DEB887',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#F4A460',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 16,
  },
  gameInfo: {
    flexDirection: 'row',
    gap: 20,
  },
  progress: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
  },
  puzzleContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#D2B48C',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  shiftInfo: {
    backgroundColor: '#F5DEB3',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DEB887',
    marginBottom: 12,
  },
  shiftLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
    marginBottom: 4,
  },
  shiftHint: {
    fontSize: 14,
    color: '#A0522D',
    fontFamily: 'CrayonPastel',
  },
  encryptedContainer: {
    marginBottom: 20,
  },
  encryptedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
    marginBottom: 8,
  },
  encryptedText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#654321',
    fontFamily: 'CrayonPastel',
    backgroundColor: '#F5F5DC',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#DDD',
    textAlign: 'center',
    letterSpacing: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#DEB887',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontFamily: 'CrayonPastel',
    color: '#654321',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  hintButton: {
    flex: 1,
    backgroundColor: '#FFE4B5',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F0E68C',
    alignItems: 'center',
  },
  hintButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B8860B',
    fontFamily: 'CrayonPastel',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#DEB887',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CD853F',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E5E5',
    borderColor: '#CCC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
  },
  helpContainer: {
    backgroundColor: '#FFF8DC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F0E68C',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#A0522D',
    fontFamily: 'CrayonPastel',
    lineHeight: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  instructionsButton: {
    flex: 1,
    backgroundColor: '#DEB887',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CD853F',
    alignItems: 'center',
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#D2691E',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#A0522D',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  // Instructions Styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fefaf5',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#D2B48C',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  scrollableCard: {
    flex: 1,
    marginBottom: 20,
  },
  instructionsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#D2B48C',
    marginBottom: 20,
    shadowColor: '#DEB887',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DEB887',
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
    color: '#DEB887',
    fontFamily: 'CrayonPastel',
    marginRight: 10,
    minWidth: 20,
  },
  stepText: {
    fontSize: 16,
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
    flex: 1,
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: '#DEB887',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#CD853F',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#DEB887',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
  },
  instructionsButton: {
    flex: 1,
    backgroundColor: '#F5DEB3',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#DEB887',
    alignItems: 'center',
    marginRight: 8,
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
  },
});
