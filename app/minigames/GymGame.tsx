import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { useScoreboard } from '../../src/context/ScoreboardContext';
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

// Function to get random opposite corner positions
const getRandomCornerPositions = (): { start: Position; goal: Position } => {
  const corners = [
    { x: 0, y: 0 }, // top-left
    { x: GRID_SIZE - 1, y: 0 }, // top-right
    { x: 0, y: GRID_SIZE - 1 }, // bottom-left
    { x: GRID_SIZE - 1, y: GRID_SIZE - 1 }, // bottom-right
  ];

  // Pick random corner for start
  const startIndex = Math.floor(Math.random() * corners.length);
  const start = corners[startIndex];

  // Get opposite corner for goal
  let goal: Position;
  if (startIndex === 0)
    goal = corners[3]; // top-left -> bottom-right
  else if (startIndex === 1)
    goal = corners[2]; // top-right -> bottom-left
  else if (startIndex === 2)
    goal = corners[1]; // bottom-left -> top-right
  else goal = corners[0]; // bottom-right -> top-left

  return { start, goal };
};

// Calculate cell size to match container width
const { width: screenWidth } = Dimensions.get('window');
const containerPadding = 40; // 20px margin on each side
const gridBorder = 4; // 2px border on each side
const availableWidth = screenWidth - containerPadding - gridBorder;
const CELL_SIZE = Math.floor(availableWidth / GRID_SIZE);

// Teacher looks in repeating pattern: right, down, left, up
const TEACHER_PATTERN = ['➡️', '⬇️', '⬅️', '⬆️'];

// Get initial position for hall monitor next to teacher
const getInitialHallMonitorPos = (
  startPos: Position,
  goalPos: Position
): Position => {
  const adjacentPositions = [
    { x: TEACHER_POS.x, y: TEACHER_POS.y - 1 }, // up
    { x: TEACHER_POS.x, y: TEACHER_POS.y + 1 }, // down
    { x: TEACHER_POS.x - 1, y: TEACHER_POS.y }, // left
    { x: TEACHER_POS.x + 1, y: TEACHER_POS.y }, // right
  ];

  // Filter for valid positions within bounds
  const validPositions = adjacentPositions.filter(
    (pos) =>
      pos.x >= 0 &&
      pos.x < GRID_SIZE &&
      pos.y >= 0 &&
      pos.y < GRID_SIZE &&
      !(pos.x === startPos.x && pos.y === startPos.y) &&
      !(pos.x === goalPos.x && pos.y === goalPos.y)
  );

  // Return random valid adjacent position, or fallback to a safe position
  if (validPositions.length > 0) {
    return validPositions[Math.floor(Math.random() * validPositions.length)];
  }

  // Fallback if no valid adjacent positions (shouldn't happen with our grid)
  return { x: TEACHER_POS.x + 1, y: TEACHER_POS.y };
};

// Initialize multiple hall monitors based on level
const initializeHallMonitors = (
  levelNum: number,
  startPos: Position,
  goalPos: Position
): Position[] => {
  const numMonitors = levelNum; // Level 1 = 1 monitor, Level 2 = 2 monitors, Level 3 = 3 monitors
  const monitors: Position[] = [];
  const usedPositions = new Set<string>();

  // Add teacher position and start/goal to avoid list
  usedPositions.add(`${TEACHER_POS.x}-${TEACHER_POS.y}`);
  usedPositions.add(`${startPos.x}-${startPos.y}`);
  usedPositions.add(`${goalPos.x}-${goalPos.y}`);

  // Get all adjacent positions to teacher
  const adjacentPositions = [
    { x: TEACHER_POS.x, y: TEACHER_POS.y - 1 }, // up
    { x: TEACHER_POS.x, y: TEACHER_POS.y + 1 }, // down
    { x: TEACHER_POS.x - 1, y: TEACHER_POS.y }, // left
    { x: TEACHER_POS.x + 1, y: TEACHER_POS.y }, // right
  ];

  // Filter for valid positions within bounds and not on start/goal
  const validAdjacentPositions = adjacentPositions.filter(
    (pos) =>
      pos.x >= 0 &&
      pos.x < GRID_SIZE &&
      pos.y >= 0 &&
      pos.y < GRID_SIZE &&
      !(pos.x === startPos.x && pos.y === startPos.y) &&
      !(pos.x === goalPos.x && pos.y === goalPos.y)
  );

  // Place monitors in adjacent positions to teacher
  for (let i = 0; i < numMonitors; i++) {
    let monitorPos: Position;

    if (
      i < validAdjacentPositions.length &&
      !usedPositions.has(
        `${validAdjacentPositions[i].x}-${validAdjacentPositions[i].y}`
      )
    ) {
      // Use available adjacent position
      monitorPos = validAdjacentPositions[i];
    } else {
      // If no more adjacent positions available, use any available adjacent position not yet used
      const availablePositions = validAdjacentPositions.filter(
        (pos) => !usedPositions.has(`${pos.x}-${pos.y}`)
      );

      if (availablePositions.length > 0) {
        monitorPos =
          availablePositions[
            Math.floor(Math.random() * availablePositions.length)
          ];
      } else {
        // Fallback: place near teacher but not necessarily adjacent
        monitorPos = { x: TEACHER_POS.x + 1, y: TEACHER_POS.y + 1 };
      }
    }

    monitors.push(monitorPos);
    usedPositions.add(`${monitorPos.x}-${monitorPos.y}`);
  }

  return monitors;
};

// Move hall monitor to adjacent cell (up, down, left, right)
const moveHallMonitorAdjacent = (currentPos: Position): Position => {
  const directions = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 }, // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }, // right
  ];

  const validMoves: Position[] = [];

  // Find all valid adjacent positions
  directions.forEach((dir) => {
    const newPos = {
      x: currentPos.x + dir.x,
      y: currentPos.y + dir.y,
    };

    // Check if position is within bounds and not on teacher
    if (
      newPos.x >= 0 &&
      newPos.x < GRID_SIZE &&
      newPos.y >= 0 &&
      newPos.y < GRID_SIZE &&
      !(newPos.x === TEACHER_POS.x && newPos.y === TEACHER_POS.y)
    ) {
      validMoves.push(newPos);
    }
  });

  // If no valid moves, stay in place
  if (validMoves.length === 0) {
    return currentPos;
  }

  // Pick random valid move
  return validMoves[Math.floor(Math.random() * validMoves.length)];
};

const DIRECTIONS = {
  '⬆️': { x: 0, y: -1 },
  '⬇️': { x: 0, y: 1 },
  '⬅️': { x: -1, y: 0 },
  '➡️': { x: 1, y: 0 },
};

export default function GymGame({ onComplete }: GymGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { trackMinigamePlayed } = useScoreboard();

  const [gameState, setGameState] = useState<
    'instructions' | 'playing' | 'jokerSelection'
  >('instructions');
  const [level, setLevel] = useState(1);
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed
  const [cornerPositions, setCornerPositions] = useState(() =>
    getRandomCornerPositions()
  );
  const [playerPos, setPlayerPos] = useState<Position>(cornerPositions.start);
  const [teacherDirection, setTeacherDirection] = useState('➡️');
  const [teacherPatternIndex, setTeacherPatternIndex] = useState(0);
  const [hallMonitors, setHallMonitors] = useState<Position[]>(
    initializeHallMonitors(1, cornerPositions.start, cornerPositions.goal)
  );
  const [gameActive, setGameActive] = useState(false);
  const [moves, setMoves] = useState(0);
  const [traveledCells, setTraveledCells] = useState<Set<string>>(new Set());

  // Initialize level
  const initializeLevel = (levelNum: number) => {
    // Generate new random corner positions for each level
    const newCorners = getRandomCornerPositions();
    setCornerPositions(newCorners);
    setPlayerPos(newCorners.start);
    setTeacherDirection(TEACHER_PATTERN[0]);
    setTeacherPatternIndex(0);
    setHallMonitors(
      initializeHallMonitors(levelNum, newCorners.start, newCorners.goal)
    );
    setMoves(0);
    setTraveledCells(new Set([`${newCorners.start.x}-${newCorners.start.y}`]));
    setGameActive(true);
  };

  // Update teacher direction every move based on pattern
  const updateTeacherDirection = () => {
    const nextIndex = (teacherPatternIndex + 1) % TEACHER_PATTERN.length;
    setTeacherPatternIndex(nextIndex);
    setTeacherDirection(TEACHER_PATTERN[nextIndex]);
  };

  const handleMove = (direction: string) => {
    if (!gameActive) return;

    // Check if moving in the same direction teacher is looking - CAUGHT!
    if (direction === teacherDirection) {
      setGameActive(false);
      if (completedLevel > 0) {
        // Player completed at least one level, award jokers based on completion
        setGameState('jokerSelection');
      } else {
        // Player didn't complete any level, show restart option
        showModal(
          '👁️ Caught by Teacher!',
          `The teacher was looking ${teacherDirection} and saw you move in that direction! Try again from Level 1?`,
          '👁️',
          () => {
            setLevel(1);
            initializeLevel(1);
          }
        );
      }
      return;
    }

    // Calculate new player position
    const delta = DIRECTIONS[direction as keyof typeof DIRECTIONS];
    const newPos = {
      x: Math.max(0, Math.min(GRID_SIZE - 1, playerPos.x + delta.x)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, playerPos.y + delta.y)),
    };

    // Don't allow moving into teacher square
    if (newPos.x === TEACHER_POS.x && newPos.y === TEACHER_POS.y) {
      return;
    }

    // Move all hall monitors to adjacent cells
    const newHallMonitors = hallMonitors.map((monitor) =>
      moveHallMonitorAdjacent(monitor)
    );

    // Check if any hall monitor lands on same square as player - CAUGHT!
    const caughtByMonitor = newHallMonitors.some(
      (monitor) => newPos.x === monitor.x && newPos.y === monitor.y
    );

    if (caughtByMonitor) {
      setGameActive(false);
      if (completedLevel > 0) {
        // Player completed at least one level, award jokers based on completion
        setGameState('jokerSelection');
      } else {
        // Player didn't complete any level, show restart option
        showModal(
          '🚨 Caught by Hall Monitor!',
          `A hall monitor moved to your position and caught you! Try again from Level 1?`,
          '🚨',
          () => {
            setLevel(1);
            initializeLevel(1);
          }
        );
      }
      return;
    }

    // Valid move - update positions
    setPlayerPos(newPos);
    setHallMonitors(newHallMonitors);
    setMoves((prev) => prev + 1);
    setTraveledCells((prev) => new Set([...prev, `${newPos.x}-${newPos.y}`]));

    // Update teacher direction (cycles through pattern)
    updateTeacherDirection();

    // Check if reached goal
    if (
      newPos.x === cornerPositions.goal.x &&
      newPos.y === cornerPositions.goal.y
    ) {
      setGameActive(false);
      setCompletedLevel(level); // Mark this level as completed

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

  // Handle swipe gestures with new Gesture API
  const panGesture = Gesture.Pan().onEnd((event) => {
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
  });

  const startGame = () => {
    // Track minigame play for analytics
    trackMinigamePlayed('gym');

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
    const isHallMonitor = hallMonitors.some(
      (monitor) => monitor.x === x && monitor.y === y
    );
    const isStart =
      x === cornerPositions.start.x && y === cornerPositions.start.y;
    const isGoal = x === cornerPositions.goal.x && y === cornerPositions.goal.y;
    const isTraveled = traveledCells.has(`${x}-${y}`);

    let cellContent = '';
    let cellStyle = styles.gridCell;

    if (isTeacher) {
      // Show teacher with current direction
      cellContent = `${teacherDirection}`;
      cellStyle = [styles.gridCell, styles.teacherCell];
    } else if (isPlayer) {
      cellContent = '🏃‍♂️';
      cellStyle = [styles.gridCell, styles.playerCell];
    } else if (isHallMonitor) {
      cellContent = '🚨';
      cellStyle = [styles.gridCell, styles.hallMonitorCell];
    } else if (isStart && !isPlayer) {
      cellContent = '🚪';
      cellStyle = [styles.gridCell, styles.startCell];
    } else if (isGoal) {
      cellContent = '🎯';
      cellStyle = [styles.gridCell, styles.goalCell];
    } else if (isTraveled) {
      cellContent = '';
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
        rewardTier={completedLevel as 1 | 2 | 3}
        completionLevel={completedLevel as 1 | 2 | 3}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Gym Class Stealth!</Text>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>How to Play:</Text>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1. </Text>
              <Text style={styles.stepText}>
                Teacher looks in repeating pattern: Right ➡️, Down ⬇️, Left ⬅️,
                Up ⬆️
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Hall monitors move each turn - Level 1: 1 monitor, Level 2: 2
                monitors, Level 3: 3 monitors!
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>
                Don't move in the same direction the teacher is looking!
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>
                Get from start (🚪) to goal (🎯) without being caught
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
          subtitle={`Teacher looking: ${teacherDirection} | ${hallMonitors.length} Hall Monitor${hallMonitors.length > 1 ? 's' : ''}: 🚨 | Avoid all!`}
          leftInfo={`Level ${level}/3`}
          rightInfo={`Moves: ${moves}`}
          theme="gym"
        />

        <View style={styles.contentContainer}>
          <View style={styles.gameContainer}>
            <GestureDetector gesture={panGesture}>
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
            </GestureDetector>
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
    lineHeight: 22,
  },
  stepText: {
    fontSize: 16,
    color: '#ecf0f1', // Light gray for readability on dark background
    flex: 1,
    fontFamily: 'CrayonPastel',
    lineHeight: 22,
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
  hallMonitorCell: {
    backgroundColor: '#f39c12', // Warning orange for hall monitor
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
