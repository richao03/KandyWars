import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import { MusicController } from '../../src/utils/musicController';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import { SoundEffects } from '../../src/utils/soundEffects';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';
import PixelBorder from '../components/PixelBorder';
import PressableButton from '../components/PressableButton';
import SkipGameButton from '../components/SkipGameButton';
import TextWithEmojis from '../components/TextWithEmojis';

// Candy images for visual variety per pile
const CANDY_IMAGES = [require('../../assets/images/emojis/student.png')];

interface NimGameProps {
  onComplete: () => void;
  onBack?: () => void;
}

// --- Pure game logic functions ---

function computeNimSum(heaps: number[]): number {
  return heaps.reduce((xor, h) => xor ^ h, 0);
}

function generateHeaps(level: number): number[] {
  if (level === 1) return [1, 3, 5];

  const minSize = level === 2 ? 1 : 2;
  const maxSize = 5; // Max 5 items per row
  const numPiles = 4;

  // Loop until we get a position where nim-sum != 0
  // (so first player has a winning strategy)
  for (let attempt = 0; attempt < 1000; attempt++) {
    const heaps: number[] = [];
    for (let i = 0; i < numPiles; i++) {
      heaps.push(Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize);
    }
    if (computeNimSum(heaps) !== 0) return heaps;
  }
  // Fallback guaranteed nim-sum != 0
  return level === 2 ? [1, 2, 3, 4] : [2, 3, 4, 5];
}

function getOptimalMove(
  heaps: number[]
): { heap: number; take: number } | null {
  const nonEmpty = heaps.filter((h) => h > 0);
  if (nonEmpty.length === 0) return null;

  const nimSum = computeNimSum(heaps);

  // Endgame: all heaps are 0 or 1
  const allSmall = heaps.every((h) => h <= 1);
  if (allSmall) {
    // Misère: we want to leave an ODD number of 1-heaps for the opponent
    // so they are forced to take the very last one and lose
    const onesCount = heaps.filter((h) => h === 1).length;
    if (onesCount % 2 === 1) {
      // Odd 1-heaps: AI takes one → leaves even for opponent → opponent takes last = opponent loses
      const idx = heaps.findIndex((h) => h === 1);
      if (idx !== -1) return { heap: idx, take: 1 };
    }
    // Even 1-heaps: AI is in a losing position, just take from any 1-heap
    const idx = heaps.findIndex((h) => h === 1);
    if (idx !== -1) return { heap: idx, take: 1 };
    return null;
  }

  if (nimSum === 0) {
    // No winning move — make a random legal move
    return getRandomMove(heaps);
  }

  // Find a heap where heap XOR nimSum < heap
  for (let i = 0; i < heaps.length; i++) {
    const target = heaps[i] ^ nimSum;
    if (target < heaps[i]) {
      const take = heaps[i] - target;

      // Misère check: would this move make all remaining heaps ≤ 1?
      const newHeaps = [...heaps];
      newHeaps[i] = target;
      const allSmallAfter = newHeaps.every((h) => h <= 1);

      if (allSmallAfter) {
        // Adjust for misère: leave odd number of 1-heaps
        const onesAfter = newHeaps.filter((h) => h === 1).length;
        if (onesAfter % 2 === 0) {
          // We want odd 1-heaps — take one more (reduce target by 1) if possible
          if (target >= 1) {
            return { heap: i, take: heaps[i] - (target - 1) };
          }
        }
        // Already odd 1-heaps — good
      }

      return { heap: i, take };
    }
  }

  // Fallback
  return getRandomMove(heaps);
}

function getRandomMove(heaps: number[]): { heap: number; take: number } | null {
  const nonEmptyIndices = heaps
    .map((h, i) => (h > 0 ? i : -1))
    .filter((i) => i !== -1);
  if (nonEmptyIndices.length === 0) return null;

  const heap =
    nonEmptyIndices[Math.floor(Math.random() * nonEmptyIndices.length)];
  const take = Math.floor(Math.random() * heaps[heap]) + 1;
  return { heap, take };
}

function getAIMove(
  heaps: number[],
  level: number
): { heap: number; take: number } | null {
  if (level === 1) return getRandomMove(heaps);

  const optimalChance = level === 2 ? 0.5 : 0.75;
  if (Math.random() < optimalChance) {
    return getOptimalMove(heaps);
  }
  return getRandomMove(heaps);
}

function totalCandies(heaps: number[]): number {
  return heaps.reduce((sum, h) => sum + h, 0);
}

// --- Component ---

export default function NimGame({ onComplete }: NimGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { trackMinigamePlayed } = useScoreboard();
  const { trackMinigamePlayed: trackMinigameProgress } = useMinigameTracking();

  const [gameState, setGameState] = useState<
    'instructions' | 'playing' | 'jokerSelection'
  >('instructions');
  const [level, setLevel] = useState(1);
  const [completedLevel, setCompletedLevel] = useState(0);
  const [heaps, setHeaps] = useState<number[]>([1, 3, 5]);
  const [selectedHeap, setSelectedHeap] = useState<number | null>(null);
  const [selectedCount, setSelectedCount] = useState(1);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'ai'>('player');
  const [aiThinking, setAiThinking] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [lastAIMove, setLastAIMove] = useState<string | null>(null);
  const [aiActedPile, setAiActedPile] = useState<number | null>(null);

  // Refs for values needed inside AI timeout
  const heapsRef = useRef(heaps);
  const levelRef = useRef(level);
  heapsRef.current = heaps;
  levelRef.current = level;

  const initializeLevel = useCallback((levelNum: number) => {
    const newHeaps = generateHeaps(levelNum);
    setHeaps(newHeaps);
    setSelectedHeap(null);
    setSelectedCount(1);
    setCurrentTurn('player');
    setAiThinking(false);
    setGameActive(true);
    setLastAIMove(null);
    setAiActedPile(null);
  }, []);

  // AI turn logic — only trigger on turn/active changes
  useEffect(() => {
    if (currentTurn !== 'ai' || !gameActive) return;

    setAiThinking(true);

    const timer = setTimeout(() => {
      const currentHeaps = heapsRef.current;
      const currentLevel = levelRef.current;
      const move = getAIMove(currentHeaps, currentLevel);
      if (!move) {
        setAiThinking(false);
        return;
      }

      const newHeaps = [...currentHeaps];
      newHeaps[move.heap] -= move.take;

      setLastAIMove(`Opp took ${move.take} from row ${move.heap + 1}`);
      setAiActedPile(move.heap);
      setHeaps(newHeaps);
      setAiThinking(false);

      // Clear gold flash after a moment
      setTimeout(() => setAiActedPile(null), 500);

      // Check if AI took the last candy (AI loses in misère!)
      if (totalCandies(newHeaps) === 0) {
        setGameActive(false);
        setCompletedLevel((prev) => Math.max(prev, currentLevel));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (currentLevel < 3) {
          SoundEffects.playCongratsSound();
          showModal(
            'Level Complete!',
            `You did not take the last player, you won! Ready for Level ${currentLevel + 1}?`,
            '🎯',
            () => {
              const nextLevel = currentLevel + 1;
              setLevel(nextLevel);
              initializeLevel(nextLevel);
            }
          );
        } else {
          SoundEffects.playCongratsSound();
          showModal(
            'Winner Winner',
            "You didn't take the last pick!",
            '🏆',
            () => {
              setGameState('jokerSelection');
            }
          );
        }
        return;
      }

      setCurrentTurn('player');
      setSelectedHeap(null);
      setSelectedCount(1);
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn, gameActive]);

  // Start minigame music
  useEffect(() => {
    if (gameState === 'playing') {
      MusicController.setTrack('minigame');
    }
  }, [gameState]);

  const startGame = () => {
    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackMinigamePlayed('gym');
    trackMinigameProgress('gym');
    setGameState('playing');
    setLevel(1);
    setCompletedLevel(0);
    initializeLevel(1);
  };

  const handleSelectHeap = (index: number) => {
    if (!gameActive || currentTurn !== 'player' || heaps[index] === 0) return;
    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedHeap === index) {
      // Already selected — increment count (tap to add more)
      setSelectedCount((c) => Math.min(heaps[index], c + 1));
    } else {
      // New row selected
      setSelectedHeap(index);
      setSelectedCount(1);
    }
  };

  const handleTake = () => {
    if (
      selectedHeap === null ||
      !gameActive ||
      currentTurn !== 'player' ||
      selectedCount < 1
    )
      return;

    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newHeaps = [...heaps];
    newHeaps[selectedHeap] -= selectedCount;

    setHeaps(newHeaps);

    // Check if player took the last candy (player loses in misère!)
    if (totalCandies(newHeaps) === 0) {
      setGameActive(false);
      SoundEffects.playWrongAnswerSound();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      setTimeout(() => {
        if (completedLevel > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const jokerCount = completedLevel;
          const jokerText = jokerCount > 1 ? `${jokerCount} jokers` : '1 joker';
          showModal(
            'You Took the Last Student!',
            `You lost, but you completed Level ${completedLevel}!\n\nYou'll receive ${jokerText}!`,
            '🎯',
            () => {
              setGameState('jokerSelection');
            }
          );
        } else {
          showModal(
            'You Took the Last Student!',
            'The player who takes the last Student loses! Try again?',
            '💀',
            () => {
              setLevel(1);
              initializeLevel(1);
            }
          );
        }
      }, 300);
      return;
    }

    setSelectedHeap(null);
    setSelectedCount(1);
    setCurrentTurn('ai');
  };

  const handleForfeit = () => {
    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showModal(
      'Leave Gym Class Captain?',
      "If you leave now, you'll forfeit the game!",
      '🚪',
      () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.back();
      },
      false,
      true
    );
  };

  // --- Render helpers ---

  const renderPile = (pileIndex: number) => {
    const count = heaps[pileIndex];
    const isSelected = selectedHeap === pileIndex;
    const isAiActed = aiActedPile === pileIndex;
    const studentImage = CANDY_IMAGES[0];
    const markedCount = isSelected ? selectedCount : 0;
    const canInteract = count > 0 && currentTurn === 'player' && gameActive;

    return (
      <View key={pileIndex} style={styles.pileRowOuter}>
        {/* Minus button — only on selected row */}
        {isSelected ? (
          <TouchableOpacity
            style={[
              styles.inlinePmButton,
              selectedCount <= 1 && styles.inlinePmButtonDisabled,
            ]}
            onPress={() => {
              SoundEffects.playRandomPop();
              setSelectedCount((c) => Math.max(1, c - 1));
            }}
            disabled={selectedCount <= 1}
          >
            <Text
              style={[
                styles.pmButtonText,
                selectedCount <= 1 && styles.pmButtonDisabled,
              ]}
            >
              −
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.inlinePmSpacer} />
        )}

        {/* Pile items */}
        <TouchableOpacity
          style={[
            styles.pileRow,
            isSelected && styles.pileRowSelected,
            isAiActed && styles.pileRowAiActed,
          ]}
          onPress={() => handleSelectHeap(pileIndex)}
          activeOpacity={0.7}
          disabled={!canInteract}
        >
          <View style={styles.candyRow}>
            {count === 0 ? (
              <Text style={styles.emptyPileText}>—</Text>
            ) : (
              Array.from({ length: count }, (_, i) => {
                const isMarked = isSelected && i >= count - markedCount;
                return (
                  <View
                    key={i}
                    style={[
                      styles.candyItem,
                      isMarked && styles.candyItemMarked,
                    ]}
                  >
                    <Image source={studentImage} style={styles.studentImage} />
                  </View>
                );
              })
            )}
          </View>
        </TouchableOpacity>

        {/* Plus button — only on selected row */}
        {isSelected ? (
          <TouchableOpacity
            style={[
              styles.inlinePmButton,
              selectedCount >= count && styles.inlinePmButtonDisabled,
            ]}
            onPress={() => {
              SoundEffects.playRandomPop();
              setSelectedCount((c) => Math.min(count, c + 1));
            }}
            disabled={selectedCount >= count}
          >
            <Text
              style={[
                styles.pmButtonText,
                selectedCount >= count && styles.pmButtonDisabled,
              ]}
            >
              +
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.inlinePmSpacer} />
        )}
      </View>
    );
  };

  // --- Screens ---

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection
        jokers={STANDARDIZED_JOKERS}
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
          <Text style={styles.instructionsTitle}>Gym Class Captain</Text>

          <PixelBorder
            borderColor="#8B7355"
            borderWidth={3}
            backgroundColor="#d4c5a9"
            innerPadding={20}
            style={{ marginBottom: 20, width: '90%' }}
          >
            <Text style={styles.instructionsHeader}>How to Win:</Text>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>
                Take turns picking students for your team
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Tap a row to select it, tap again to pick more. Use +/− to
                adjust
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>
                The team ending with the last pick loses
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <View>
                <Text style={styles.stepText}>lvl 1: 3 rows, dumb Opp</Text>
                <Text style={styles.stepText}>lvl 2: 4 rows, smarter Opp</Text>
                <Text style={styles.stepText}>lvl 3: 4 rows, tough Opp</Text>
              </View>
            </View>
          </PixelBorder>

          <PressableButton
            onPress={startGame}
            shadowOpacity={0}
            elevation={0}
            style={{ marginBottom: 16, width: '100%' }}
          >
            <PixelBorder
              borderColor="#6B5B45"
              borderWidth={3}
              backgroundColor="#8B7355"
              innerPadding={0}
            >
              <View style={styles.pixelButtonInner}>
                <Text style={styles.startButtonText}>Start Game!</Text>
              </View>
            </PixelBorder>
          </PressableButton>

          <SkipGameButton onSkipSuccess={onComplete} />
        </View>

        <PressableButton
          onPress={() => {
            SoundEffects.playRandomPop();
            router.back();
          }}
          shadowOpacity={0}
          elevation={0}
          style={{ marginBottom: 16, width: '100%' }}
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
    );
  }

  // --- Playing state ---
  const remaining = totalCandies(heaps);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.innerContainer,
          {
            padding: ResponsiveSpacing.containerPadding(),
            paddingBottom: ResponsiveSpacing.containerPaddingBottom(),
          },
        ]}
      >
        <MinigameHUD
          theme="nim"
          title="Gym Class Captain"
          subtitle={
            aiThinking
              ? 'Opp is thinking...'
              : currentTurn === 'player'
                ? 'Your Turn'
                : 'Opp Turn'
          }
          leftInfo={`Level ${level}/3`}
          centerInfo={`${remaining} left`}
          rightInfo={currentTurn === 'player' ? '👆 Pick' : '🤖 Opp'}
        />

        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={styles.contentInner}
        >
          {/* Heap rows */}
          <View style={styles.heapsContainer}>
            {heaps.map((_, i) => renderPile(i))}
          </View>

          {/* Last AI move */}
          {lastAIMove && <Text style={styles.lastMoveText}>{lastAIMove}</Text>}
        </ScrollView>

        {/* Confirm button */}
        {selectedHeap !== null && heaps[selectedHeap] > 0 && (
          <PressableButton
            onPress={handleTake}
            shadowOpacity={0}
            elevation={0}
            style={{ marginTop: 12, alignItems: 'center' }}
          >
            <View style={styles.takeButton}>
              <Text style={styles.takeButtonText}>
                Pick {selectedCount} from row {selectedHeap + 1}!
              </Text>
            </View>
          </PressableButton>
        )}
        <Text style={styles.hintText}>
          Don&apos;t get stuck with the last pick or you lose!
        </Text>
        {/* Leave button pinned to bottom */}
        <PixelBorder
          borderColor="#8B7355"
          borderWidth={3}
          backgroundColor="#c4b596"
          innerPadding={0}
          style={{ marginTop: 8 }}
        >
          <TouchableOpacity style={styles.leaveButton} onPress={handleForfeit}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8dcc8',
  },
  innerContainer: {
    flex: 1,
  },
  // Instructions
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5c4a32',
    marginBottom: 20,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B5B45',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
    width: '90%',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B7355',
    marginRight: 10,
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
  },
  stepText: {
    fontSize: 16,
    color: '#3e3428',
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff8ee',
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
    color: '#fff8ee',
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
  },
  // Playing
  contentContainer: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 20,
  },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    color: '#8B7355',
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 28,
  },
  heapsContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  pileRowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    justifyContent: 'center',
  },
  inlinePmButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#c4b596',
    borderWidth: 2,
    borderColor: '#8B7355',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlinePmButtonDisabled: {
    opacity: 0.4,
  },
  inlinePmSpacer: {
    width: 36,
  },
  pileRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 6,
    minHeight: 40,
    marginHorizontal: 8,
  },
  pileRowSelected: {
    borderColor: '#8B7355',
    backgroundColor: 'rgba(139, 115, 85, 0.15)',
  },
  pileRowAiActed: {
    borderColor: '#b8a080',
    backgroundColor: 'rgba(184, 160, 128, 0.2)',
  },
  candyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  emptyPileText: {
    fontSize: 16,
    color: '#b8a080',
    fontFamily: 'PixeloidMono',
  },
  candyItem: {
    width: 50,
    height: 50,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candyItemMarked: {
    borderWidth: 2,
    borderColor: '#c0392b',
    borderRadius: 6,
    backgroundColor: 'rgba(192, 57, 43, 0.2)',
    transform: [{ scale: 1.1 }],
  },
  studentImage: {
    width: 44,
    height: 44,
  },
  // Action bar
  actionLabel: {
    fontSize: 14,
    color: '#3e3428',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  pmButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#c4b596',
    borderWidth: 2,
    borderColor: '#8B7355',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pmButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5c4a32',
    fontFamily: 'PixeloidMono',
  },
  pmButtonDisabled: {
    color: '#b8a080',
  },
  countText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3e3428',
    fontFamily: 'PixeloidMono',
    minWidth: 40,
    textAlign: 'center',
  },
  takeButton: {
    backgroundColor: '#8B7355',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  takeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff8ee',
    fontFamily: 'PixeloidMono',
  },
  lastMoveText: {
    fontSize: 14,
    color: '#6B5B45',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 16,
  },
  leaveButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5c4a32',
    fontFamily: 'PixeloidMono',
  },
});
