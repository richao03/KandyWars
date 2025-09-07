import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { GYM_JOKERS } from '../../src/utils/jokerEffectEngine';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';

interface Position {
  x: number;
  y: number;
}

interface GymGameProps {
  onComplete: () => void;
}

const GRID_SIZE = 15;
const TEACHER_POS = { x: 7, y: 7 }; // Center of 15x15 grid (0-indexed)
const START_POS = { x: 0, y: 0 };
const GOAL_POS = { x: 14, y: 14 };

// Calculate cell size to match container width
const { width: screenWidth } = Dimensions.get('window');
const containerPadding = 40; // 20px margin on each side
const gridBorder = 4; // 2px border on each side
const availableWidth = screenWidth - containerPadding - gridBorder;
const CELL_SIZE = Math.floor(availableWidth / GRID_SIZE);

// Generate pattern that includes all 4 directions
const generatePattern = (length: number): string[] => {
  const directions = ['⬆️', '⬇️', '⬅️', '➡️'];
  const pattern: string[] = [...directions]; // Start with one of each

  // Add random directions to reach desired length
  while (pattern.length < length) {
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    pattern.push(randomDir);
  }

  // Shuffle the pattern
  for (let i = pattern.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pattern[i], pattern[j]] = [pattern[j], pattern[i]];
  }

  return pattern;
};

const DIRECTIONS = {
  '⬆️': { x: 0, y: -1 },
  '⬇️': { x: 0, y: 1 },
  '⬅️': { x: -1, y: 0 },
  '➡️': { x: 1, y: 0 },
};

export default function GymGame({ onComplete }: GymGameProps) {
  const { modal, showModal, hideModal } = useGameModal();

  const [gameState, setGameState] = useState<
    'instructions' | 'playing' | 'jokerSelection'
  >('instructions');
  const [level, setLevel] = useState(1);
  const [playerPos, setPlayerPos] = useState<Position>(START_POS);
  const [teacherDirection, setTeacherDirection] = useState('⬆️');
  const [patternIndex, setPatternIndex] = useState(0);
  const [currentPattern, setCurrentPattern] = useState<string[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [moves, setMoves] = useState(0);
  const [showingPattern, setShowingPattern] = useState(false);
  const [patternDisplayIndex, setPatternDisplayIndex] = useState(0);
  const [lostPosition, setLostPosition] = useState(-1);
  const [traveledCells, setTraveledCells] = useState<Set<string>>(new Set());

  // Initialize level
  const initializeLevel = (levelNum: number) => {
    // Generate pattern based on level: Level 1 = 5, Level 2 = 7, Level 3 = 8
    let patternLength = 5;
    if (levelNum === 2) patternLength = 7;
    if (levelNum === 3) patternLength = 8;

    const pattern = generatePattern(patternLength);

    setCurrentPattern(pattern);
    setPatternIndex(0);
    setTeacherDirection(pattern[0]);
    setPlayerPos(START_POS);
    setMoves(0);
    setGameActive(false);
    setShowingPattern(true);
    setPatternDisplayIndex(0);
    setLostPosition(-1);
    setTraveledCells(new Set([`${START_POS.x}-${START_POS.y}`]));
  };

  // Show pattern animation
  useEffect(() => {
    if (!showingPattern || gameState !== 'playing') return;

    const interval = setInterval(() => {
      setPatternDisplayIndex((prev) => {
        const nextIndex = prev + 1;

        if (nextIndex >= currentPattern.length) {
          // Pattern display complete
          setTimeout(() => {
            setShowingPattern(false);
            setGameActive(true);
            setTeacherDirection(currentPattern[0]);
          }, 1000);
          clearInterval(interval);
          return prev;
        }

        return nextIndex;
      });
    }, 800); // Show each direction for 800ms

    return () => clearInterval(interval);
  }, [showingPattern, currentPattern, gameState]);

  const handleMove = (direction: string) => {
    if (!gameActive || showingPattern) return;

    // Check if teacher is watching this direction
    if (direction === teacherDirection) {
      // Caught! Game over
      setGameActive(false);
      setLostPosition(patternIndex);
      showModal(
        '👁️ Caught by Teacher!',
        `The teacher was looking ${teacherDirection} at position ${patternIndex + 1} and saw you move!`,
        '👁️',
        () => {
          initializeLevel(level);
        }
      );
      return;
    }

    // Valid move - teacher changes direction
    const nextPatternIndex = (patternIndex + 1) % currentPattern.length;
    setPatternIndex(nextPatternIndex);
    setTeacherDirection(currentPattern[nextPatternIndex]);

    // Move player
    const delta = DIRECTIONS[direction as keyof typeof DIRECTIONS];
    const newPos = {
      x: Math.max(0, Math.min(GRID_SIZE - 1, playerPos.x + delta.x)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, playerPos.y + delta.y)),
    };

    // Don't allow moving into teacher square
    if (newPos.x === TEACHER_POS.x && newPos.y === TEACHER_POS.y) {
      return;
    }

    setPlayerPos(newPos);
    setMoves((prev) => prev + 1);
    setTraveledCells((prev) => new Set([...prev, `${newPos.x}-${newPos.y}`]));

    // Check if reached goal
    if (newPos.x === GOAL_POS.x && newPos.y === GOAL_POS.y) {
      setGameActive(false);

      if (level < 3) {
        showModal(
          '🎯 Level Complete!',
          `Great stealth! You made it in ${moves + 1} moves. Ready for Level ${level + 1}?`,
          '🎯',
          () => {
            setLevel(level + 1);
            initializeLevel(level + 1);
          }
        );
      } else {
        showModal(
          '🏆 Gym Master!',
          `Incredible! You completed all levels with excellent stealth skills!`,
          '🏆',
          () => {
            setGameState('jokerSelection');
          }
        );
      }
    }
  };

  // Handle swipe gestures with reanimated
  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      // Reset values
    },
    onActive: () => {
      // Track gesture
    },
    onEnd: (event) => {
      const { translationX, translationY } = event;
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      // Determine swipe direction with lower threshold
      if (absX > 20 || absY > 20) {
        let direction = '';
        if (absX > absY) {
          direction = translationX > 0 ? '➡️' : '⬅️';
        } else {
          direction = translationY > 0 ? '⬇️' : '⬆️';
        }

        if (direction) {
          runOnJS(handleMove)(direction);
        }
      }
    },
  });

  const startGame = () => {
    setGameState('playing');
    setLevel(1);
    initializeLevel(1);
  };

  const handleForfeit = () => {
    showModal(
      '🚪 Leave Gym Class?',
      "If you leave now, you'll miss your chance to practice stealth!",
      '🚪',
      () => {
        router.back();
      }
    );
  };

  // Render grid cell
  const renderCell = (x: number, y: number) => {
    const isPlayer = playerPos.x === x && playerPos.y === y;
    const isTeacher = x === TEACHER_POS.x && y === TEACHER_POS.y;
    const isStart = x === START_POS.x && y === START_POS.y;
    const isGoal = x === GOAL_POS.x && y === GOAL_POS.y;
    const isTraveled = traveledCells.has(`${x}-${y}`);

    let cellContent = '';
    let cellStyle = styles.gridCell;

    if (isTeacher) {
      // Show pattern or teacher
      if (showingPattern) {
        cellContent =
          patternDisplayIndex < currentPattern.length
            ? currentPattern[patternDisplayIndex]
            : '👨‍🏫';
        cellStyle = [styles.gridCell, styles.teacherCell];
      } else {
        cellContent = '👨‍🏫';
        cellStyle = [styles.gridCell, styles.teacherCell];
      }
    } else if (isPlayer) {
      cellContent = '🏃‍♂️';
      cellStyle = [styles.gridCell, styles.playerCell];
    } else if (isStart && !isPlayer) {
      cellContent = '🚪';
      cellStyle = [styles.gridCell, styles.startCell];
    } else if (isGoal) {
      cellContent = '🎯';
      cellStyle = [styles.gridCell, styles.goalCell];
    } else if (isTraveled) {
      cellStyle = [styles.gridCell, styles.traveledCell];
    }

    return (
      <View key={`${x}-${y}`} style={cellStyle}>
        <Text style={styles.cellEmoji}>{cellContent}</Text>
      </View>
    );
  };

  // Get level pattern size for display
  const getLevelPatternSize = () => {
    if (level === 1) return 5;
    if (level === 2) return 7;
    return 8;
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection
        jokers={GYM_JOKERS}
        theme="gym"
        subject="Gym"
        onComplete={onComplete}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>🏃‍♂️ Gym Class Stealth! 👨‍🏫</Text>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>📝 How to Play:</Text>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>👁️</Text>
              <Text style={styles.stepText}>
                Memorize the pattern shown at the start - the teacher follows
                this pattern!
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>🎯</Text>
              <Text style={styles.stepText}>
                Get from start (🚪) to goal (🎯) without being caught
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>⚠️</Text>
              <Text style={styles.stepText}>
                You won't see where teacher looks! Remember the pattern and
                count your moves!
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>📊</Text>
              <Text style={styles.stepText}>
                Level 1: 5 directions | Level 2: 7 directions | Level 3: 8
                directions
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start Sneaking!</Text>
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

  // Render game
  return (
    <GestureHandlerRootView style={styles.container}>
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
          title="🏃‍♂️ Gym Class Stealth"
          subtitle={
            showingPattern
              ? `Memorize the pattern! (${patternDisplayIndex + 1}/${currentPattern.length})`
              : `Teacher is watching... somewhere!`
          }
          leftInfo={`Level ${level}/3`}
          rightInfo={`Moves: ${moves}`}
          theme="gym"
        />

        <View style={styles.contentContainer}>
          <View style={styles.patternInfo}>
            <Text style={styles.patternInfoText}>📝 Pattern:</Text>
            <View style={styles.patternRow}>
              {currentPattern.map((direction, index) => (
                <View
                  key={index}
                  style={[
                    styles.patternItem,
                    index === patternIndex &&
                      !showingPattern &&
                      lostPosition === -1 &&
                      styles.patternItemActive,
                    index === lostPosition &&
                      lostPosition !== -1 &&
                      styles.patternItemLost,
                  ]}
                >
                  <Text style={styles.patternItemText}>
                    {showingPattern || lostPosition === index ? direction : '❓'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.gameContainer}>
            <PanGestureHandler onGestureEvent={gestureHandler}>
              <Animated.View style={styles.swipeArea}>
                <View style={styles.gridContainer}>
                  {Array.from({ length: GRID_SIZE }, (_, y) => (
                    <View key={y} style={styles.gridRow}>
                      {Array.from({ length: GRID_SIZE }, (_, x) =>
                        renderCell(x, y)
                      )}
                    </View>
                  ))}
                </View>
              </Animated.View>
            </PanGestureHandler>
          </View>

          <TouchableOpacity style={styles.leaveButton} onPress={handleForfeit}>
            <Text style={styles.leaveButtonText}>🚪 Leave</Text>
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
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c3e50', // Dark gym blue-gray
  },
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e74c3c', // Gym red
    marginBottom: 20,
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  instructionsCard: {
    backgroundColor: '#34495e', // Dark gym gray
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#e74c3c', // Gym red border
    marginBottom: 20,
    width: '90%',
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f39c12', // Gym orange/gold
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
    color: '#e74c3c', // Gym red
    marginRight: 10,
    fontFamily: 'CrayonPastel',
  },
  stepText: {
    fontSize: 16,
    color: '#ecf0f1', // Light gray for readability on dark background
    flex: 1,
    fontFamily: 'CrayonPastel',
  },
  startButton: {
    backgroundColor: '#e74c3c', // Gym red
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#f39c12', // Gold border
    marginBottom: 10,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  backButtonText: {
    fontSize: 18,
    color: '#e74c3c', // Gym red
    fontFamily: 'CrayonPastel',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  gameContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeArea: {
    alignItems: 'center',
  },
  gridContainer: {
    borderWidth: 2,
    borderColor: '#e74c3c', // Gym red border
    borderRadius: 8,
    backgroundColor: '#34495e', // Dark gym floor
    alignSelf: 'stretch',
    marginHorizontal: 20,
    marginTop: 16,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    width: 23.8,
    height: 23.8,
    borderWidth: 0.5,
    borderColor: '#7f8c8d', // Darker grid lines
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34495e', // Dark gym floor
  },
  playerCell: {
    backgroundColor: '#27ae60', // Athletic green
  },
  teacherCell: {
    backgroundColor: '#e74c3c', // Gym red for authority
  },
  patternCell: {
    backgroundColor: '#ffd700',
    width: 26,
    height: 26,
  },
  startCell: {
    backgroundColor: '#3498db', // Strong blue for start
  },
  goalCell: {
    backgroundColor: '#f39c12', // Gym gold for achievement
  },
  traveledCell: {
    backgroundColor: '#2ecc71', // Green for traveled path
  },
  cellEmoji: {
    fontSize: 12,
  },
  patternEmoji: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  swipeInfo: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4169e1',
    padding: 10,
  },
  swipeInfoText: {
    fontSize: 14,
    color: '#4169e1',
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
  },
  patternInfo: {
    backgroundColor: '#34495e', // Dark gym background
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e74c3c', // Gym red border
    padding: 10,
    marginHorizontal: 20,
  },
  patternInfoText: {
    fontSize: 16,
    color: '#f39c12', // Gym gold
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  patternItem: {
    width: 40,
    height: 40,
    backgroundColor: '#2c3e50', // Dark gym background
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#95a5a6', // Neutral gray border
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternItemActive: {
    borderColor: '#f39c12', // Gym gold for active
    borderWidth: 3,
    backgroundColor: '#e67e22', // Darker gold background
    transform: [{ scale: 1.1 }],
  },
  patternItemLost: {
    borderColor: '#e74c3c', // Gym red for loss
    borderWidth: 4,
    backgroundColor: '#c0392b', // Darker red background
    transform: [{ scale: 1.2 }],
  },
  patternItemText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ecf0f1', // Light text for visibility
  },
  leaveButton: {
    backgroundColor: '#95a5a6', // Neutral gray for exit
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#7f8c8d', // Darker gray border
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
  },
});
