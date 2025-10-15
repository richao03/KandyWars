import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
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
import colors from '../../src/constants/colors';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { GYM_JOKERS } from '../../src/utils/jokerEffectEngine';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';
import PixelBorder from '../components/PixelBorder';
import PressableButton from '../components/PressableButton';
import TextWithEmojis from '../components/TextWithEmojis';

interface Position {
  x: number;
  y: number;
}

interface GymGameProps {
  onComplete: () => void;
}

const GRID_SIZE = 15;

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

// Initialize multiple hall monitors based on level
const initializeHallMonitors = (
  levelNum: number,
  startPos: Position,
  goalPos: Position
): Position[] => {
  const numMonitors = levelNum * 4; // Level 1 = 3 monitors, Level 2 = 6 monitors, Level 3 = 9 monitors
  const monitors: Position[] = [];
  const usedPositions = new Set<string>();

  // Add start/goal to avoid list
  usedPositions.add(`${startPos.x}-${startPos.y}`);
  usedPositions.add(`${goalPos.x}-${goalPos.y}`);

  // Place monitors randomly on the grid
  for (let i = 0; i < numMonitors; i++) {
    let monitorPos: Position;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop

    do {
      monitorPos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      attempts++;
    } while (
      usedPositions.has(`${monitorPos.x}-${monitorPos.y}`) &&
      attempts < maxAttempts
    );

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

    // Check if position is within bounds
    if (
      newPos.x >= 0 &&
      newPos.x < GRID_SIZE &&
      newPos.y >= 0 &&
      newPos.y < GRID_SIZE
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
  const { trackMinigamePlayed: trackMinigameProgress } = useMinigameTracking();

  const [gameState, setGameState] = useState<
    'instructions' | 'playing' | 'jokerSelection'
  >('instructions');
  const [level, setLevel] = useState(1);
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed
  const [cornerPositions, setCornerPositions] = useState(() =>
    getRandomCornerPositions()
  );
  const [playerPos, setPlayerPos] = useState<Position>(cornerPositions.start);
  const [hallMonitors, setHallMonitors] = useState<Position[]>(
    initializeHallMonitors(1, cornerPositions.start, cornerPositions.goal)
  );
  const [gameActive, setGameActive] = useState(false);
  const [moves, setMoves] = useState(0);
  const [traveledCells, setTraveledCells] = useState<Set<string>>(new Set());
  const [caughtPosition, setCaughtPosition] = useState<Position | null>(null);

  // Initialize level
  const initializeLevel = (levelNum: number) => {
    // Generate new random corner positions for each level
    const newCorners = getRandomCornerPositions();
    setCornerPositions(newCorners);
    setPlayerPos(newCorners.start);
    setHallMonitors(
      initializeHallMonitors(levelNum, newCorners.start, newCorners.goal)
    );
    setMoves(0);
    setTraveledCells(new Set([`${newCorners.start.x}-${newCorners.start.y}`]));
    setGameActive(true);
  };

  const handleMove = (direction: string) => {
    if (!gameActive) return;

    // Calculate new player position
    const delta = DIRECTIONS[direction as keyof typeof DIRECTIONS];
    const newPos = {
      x: Math.max(0, Math.min(GRID_SIZE - 1, playerPos.x + delta.x)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, playerPos.y + delta.y)),
    };

    // Check if player actually moved (not hitting a wall)
    if (newPos.x === playerPos.x && newPos.y === playerPos.y) {
      // Player didn't move (hit wall), don't count as a move and don't move monitors
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Move all hall monitors to adjacent cells
    const newHallMonitors = hallMonitors.map((monitor) =>
      moveHallMonitorAdjacent(monitor)
    );

    // Check if any hall monitor lands on same square as player - CAUGHT!
    const caughtByMonitor = newHallMonitors.some(
      (monitor) => newPos.x === monitor.x && newPos.y === monitor.y
    );

    // Check if player and any monitor swapped positions (crossed paths) - CAUGHT!
    const crossedPaths = hallMonitors.some((oldMonitor, index) => {
      const newMonitor = newHallMonitors[index];
      return (
        oldMonitor.x === newPos.x &&
        oldMonitor.y === newPos.y &&
        newMonitor.x === playerPos.x &&
        newMonitor.y === playerPos.y
      );
    });

    if (caughtByMonitor || crossedPaths) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setGameActive(false);

      // Update positions first to show where caught happened
      setPlayerPos(newPos);
      setHallMonitors(newHallMonitors);
      setCaughtPosition(newPos);

      // Wait 0.3 seconds to show the caught position before showing modal
      setTimeout(() => {
        setCaughtPosition(null);

        if (completedLevel > 0) {
          // Player completed at least one level, show success modal before joker selection
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const jokerCount = completedLevel;
          const jokerText = jokerCount > 1 ? `${jokerCount} jokers` : '1 joker';
          showModal(
            'Caught - But Not Out!',
            `You were caught but completed Level ${completedLevel}!\n\nYou'll receive ${jokerText}!`,
            '🎯',
            () => {
              setGameState('jokerSelection');
            }
          );
        } else {
          // Player didn't complete any level, show restart option
          showModal(
            'Caught by Hall Monitor!',
            `A hall monitor moved to your position and caught you! Try again from Level 1?`,
            '🚨',
            () => {
              setLevel(1);
              initializeLevel(1);
            }
          );
        }
      }, 500);
      return;
    }

    // Valid move - update positions
    setPlayerPos(newPos);
    setHallMonitors(newHallMonitors);
    setMoves((prev) => prev + 1);
    setTraveledCells((prev) => new Set([...prev, `${newPos.x}-${newPos.y}`]));

    // Check if reached goal
    if (
      newPos.x === cornerPositions.goal.x &&
      newPos.y === cornerPositions.goal.y
    ) {
      setGameActive(false);
      setCompletedLevel(level); // Mark this level as completed
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (level < 3) {
        showModal(
          'Level Complete!',
          `Great stealth! You made it in ${moves + 1} moves. Ready for Level ${level + 1}?`,
          '🎯',
          () => {
            setLevel(level + 1);
            initializeLevel(level + 1);
          }
        );
      } else {
        showModal(
          'Gym Master!',
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Track minigame play for analytics
    trackMinigamePlayed('gym');
    trackMinigameProgress('gym');

    setGameState('playing');
    setLevel(1);
    initializeLevel(1);
  };

  const handleForfeit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showModal(
      'Leave Gym Class?',
      "If you leave now, you'll miss your chance to practice stealth!",
      '🚪',
      () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.back();
      },
      false,
      true
    );
  };

  // Render grid cell
  const renderCell = (x: number, y: number) => {
    const isPlayer = playerPos.x === x && playerPos.y === y;
    const isHallMonitor = hallMonitors.some(
      (monitor) => monitor.x === x && monitor.y === y
    );
    const isStart =
      x === cornerPositions.start.x && y === cornerPositions.start.y;
    const isGoal = x === cornerPositions.goal.x && y === cornerPositions.goal.y;
    const isTraveled = traveledCells.has(`${x}-${y}`);
    const isCaughtCell =
      caughtPosition && caughtPosition.x === x && caughtPosition.y === y;

    let cellContent = '';
    let cellStyle = styles.gridCell;

    if (isCaughtCell) {
      // Show red cell with ❌ when caught
      cellContent = (
        <Image
          source={require('../../assets/images/emojis/x.png')}
          style={styles.caughtIcon}
        />
      );
      cellStyle = [styles.gridCell, styles.caughtCell];
    } else if (isPlayer) {
      cellContent = (
        <Image
          source={require('../../assets/images/emojis/student.png')}
          style={styles.studentIcon}
        />
      );
      cellStyle = [styles.gridCell, styles.playerCell];
    } else if (isHallMonitor) {
      cellContent = '🚨';
      cellStyle = [styles.gridCell, styles.hallMonitorCell];
    } else if (isStart && !isPlayer) {
      cellContent = (
        <Image
          source={require('../../assets/images/emojis/door.png')}
          style={styles.doorIcon}
        />
      );
      cellStyle = [styles.gridCell, styles.startCell];
    } else if (isGoal) {
      cellContent = (
        <Image
          source={require('../../assets/images/emojis/bullseye.png')}
          style={styles.bullseyeIcon}
        />
      );
      cellStyle = [styles.gridCell, styles.goalCell];
    } else if (isTraveled) {
      cellContent = '';
      cellStyle = [styles.gridCell, styles.traveledCell];
    }

    return (
      <View key={`${x}-${y}`} style={cellStyle}>
        {typeof cellContent === 'string' ? (
          <Text style={styles.cellEmoji}>{cellContent}</Text>
        ) : (
          cellContent
        )}
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

          <PixelBorder
            borderColor="#e74c3c"
            borderWidth={3}
            backgroundColor="#2c3e50"
            innerPadding={20}
            style={{ marginBottom: 20, width: '90%' }}
          >
            <Text style={styles.instructionsHeader}>How to Play:</Text>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <View>
                <TextWithEmojis style={styles.stepText} imageSize={28}>
                  Get from start 🚪
                </TextWithEmojis>
                <TextWithEmojis style={styles.stepText} imageSize={28}>
                  to goal 🎯
                </TextWithEmojis>
                <TextWithEmojis style={styles.stepText} imageSize={28}>
                  without being caught by any monitor
                </TextWithEmojis>
              </View>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>Swipe to move</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Level 1: 3 monitors! Level 2: 6 monitors! Level 3: 9 monitors!
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
              borderColor="#e74c3c"
              borderWidth={3}
              backgroundColor="#1a2332"
              innerPadding={0}
            >
              <View style={styles.pixelButtonInner}>
                <Text style={styles.startButtonText}>Start Sneaking!</Text>
              </View>
            </PixelBorder>
          </PressableButton>

          <PressableButton
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
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
          title="Gym Class Stealth"
          subtitle={`${hallMonitors.length} Hall Monitor${hallMonitors.length > 1 ? 's' : ''}: 🚨`}
          leftInfo={`Level ${level}/3`}
          centerInfo=" "
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
          <PixelBorder
            borderColor="#e74c3c"
            borderWidth={3}
            backgroundColor="#1a2332"
            innerPadding={0}
            style={{ marginTop: 20 }}
          >
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleForfeit}
            >
              <TextWithEmojis style={styles.leaveButtonText} imageSize={28}>
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
    color: colors.red.error, // Gym red
    marginBottom: 20,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  instructionsCard: {
    backgroundColor: '#34495e', // Dark gym gray
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: colors.red.error, // Gym red border
    marginBottom: 20,
    width: '90%',
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f39c12', // Gym orange/gold
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
    color: colors.red.error, // Gym red
    marginRight: 10,
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
  },
  stepText: {
    fontSize: 16,
    color: '#ecf0f1', // Light gray for readability on dark background
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: colors.red.error, // Gym red
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
    color: colors.white,
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
    borderColor: colors.red.error, // Gym red border
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
  hallMonitorCell: {
    backgroundColor: '#f39c12', // Warning orange for hall monitor
  },
  caughtCell: {
    backgroundColor: '#ff0000', // Red for caught
    borderColor: '#ff0000',
    borderWidth: 3,
  },
  patternCell: {
    backgroundColor: colors.gold.medium,
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
  bullseyeIcon: {
    width: 24,
    height: 24,
  },
  doorIcon: {
    width: 24,
    height: 24,
  },
  studentIcon: {
    width: 24,
    height: 24,
  },
  caughtIcon: {
    width: 20,
    height: 24,
  },
  patternEmoji: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  swipeInfo: {
    marginTop: 20,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4169e1',
    padding: 10,
  },
  swipeInfoText: {
    fontSize: 14,
    color: '#4169e1',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  patternInfo: {
    backgroundColor: '#34495e', // Dark gym background
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.red.error, // Gym red border
    padding: 10,
    marginHorizontal: 20,
  },
  patternInfoText: {
    fontSize: 16,
    color: '#f39c12', // Gym gold
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
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
    borderColor: colors.red.error, // Gym red for loss
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
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    fontFamily: 'PixeloidMono',
  },
  pixelButtonInner: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
