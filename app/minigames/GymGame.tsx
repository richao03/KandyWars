import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
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

interface Position {
  x: number;
  y: number;
}

interface GymGameProps {
  onComplete: () => void;
}

// Get grid size based on level
const getGridSize = (level: number): number => {
  if (level === 1) return 5; // 5x5 = 25 cells
  if (level === 2) return 6; // 6x6 = 36 cells
  return 7; // 7x7 = 49 cells (level 3)
};

// Fixed cell size for consistent sizing across all levels
const CELL_SIZE = 24;

// Function to get random corner position for start
const getRandomCornerPosition = (gridSize: number): Position => {
  const corners = [
    { x: 0, y: 0 }, // top-left
    { x: gridSize - 1, y: 0 }, // top-right
    { x: 0, y: gridSize - 1 }, // bottom-left
    { x: gridSize - 1, y: gridSize - 1 }, // bottom-right
  ];

  // Pick random corner for start
  const startIndex = Math.floor(Math.random() * corners.length);
  return corners[startIndex];
};

// Initialize multiple hall monitors based on level
const initializeHallMonitors = (
  levelNum: number,
  gridSize: number,
  startPos: Position
): Position[] => {
  // Monitor counts per level
  let numMonitors = 1; // Level 1
  if (levelNum === 2) numMonitors = 2;
  if (levelNum === 3) numMonitors = 3;
  const monitors: Position[] = [];
  const usedPositions = new Set<string>();

  // Add start position to avoid list
  usedPositions.add(`${startPos.x}-${startPos.y}`);

  // Place monitors randomly on the grid
  for (let i = 0; i < numMonitors; i++) {
    let monitorPos: Position;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop

    do {
      monitorPos = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize),
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
const moveHallMonitorAdjacent = (
  currentPos: Position,
  gridSize: number
): Position => {
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
      newPos.x < gridSize &&
      newPos.y >= 0 &&
      newPos.y < gridSize
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
  const [gridSize, setGridSize] = useState(5); // Dynamic grid size based on level
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed
  const [startPosition, setStartPosition] = useState(() =>
    getRandomCornerPosition(5)
  );
  const [playerPos, setPlayerPos] = useState<Position>(startPosition);
  const [hallMonitors, setHallMonitors] = useState<Position[]>(
    initializeHallMonitors(1, 5, startPosition)
  );
  const [gameActive, setGameActive] = useState(false);
  const [moves, setMoves] = useState(0);
  const [traveledCells, setTraveledCells] = useState<Set<string>>(new Set());
  const [caughtPosition, setCaughtPosition] = useState<Position | null>(null);
  const [showAvailableJokers, setShowAvailableJokers] = useState(false);

  // Initialize level
  const initializeLevel = (levelNum: number) => {
    // Get grid size for this level
    const newGridSize = getGridSize(levelNum);
    setGridSize(newGridSize);

    // Generate new random corner position for start
    const newStartPos = getRandomCornerPosition(newGridSize);
    setStartPosition(newStartPos);
    setPlayerPos(newStartPos);

    // Initialize hall monitors
    setHallMonitors(initializeHallMonitors(levelNum, newGridSize, newStartPos));

    setMoves(0);
    setTraveledCells(new Set([`${newStartPos.x}-${newStartPos.y}`]));
    setGameActive(true);
  };

  const handleMove = (direction: string) => {
    if (!gameActive) return;

    // Calculate new player position
    const delta = DIRECTIONS[direction as keyof typeof DIRECTIONS];
    const newPos = {
      x: Math.max(0, Math.min(gridSize - 1, playerPos.x + delta.x)),
      y: Math.max(0, Math.min(gridSize - 1, playerPos.y + delta.y)),
    };

    // Check if player actually moved (not hitting a wall)
    if (newPos.x === playerPos.x && newPos.y === playerPos.y) {
      // Player didn't move (hit wall), don't count as a move and don't move monitors
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Move all hall monitors to adjacent cells
    const newHallMonitors = hallMonitors.map((monitor) =>
      moveHallMonitorAdjacent(monitor, gridSize)
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
      SoundEffects.playWrongAnswerSound();
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

    // Update traveled cells
    const updatedTraveledCells = new Set([
      ...traveledCells,
      `${newPos.x}-${newPos.y}`,
    ]);
    setTraveledCells(updatedTraveledCells);

    // Check if all cells have been visited (WIN CONDITION)
    const totalCells = gridSize * gridSize;
    if (updatedTraveledCells.size === totalCells) {
      setGameActive(false);
      setCompletedLevel(level); // Mark this level as completed
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (level < 3) {
        SoundEffects.playCongratsSound();
        showModal(
          'Level Complete!',
          `Amazing! You covered all ${totalCells} cells in ${moves + 1} moves. Ready for Level ${level + 1}?`,
          '🎯',
          () => {
            setLevel(level + 1);
            initializeLevel(level + 1);
          }
        );
      } else {
        SoundEffects.playCongratsSound();
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

  // Add keyboard support for web/desktop
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameActive) return;

      let direction = '';
      switch (event.key) {
        case 'ArrowUp':
          direction = '⬆️';
          event.preventDefault();
          break;
        case 'ArrowDown':
          direction = '⬇️';
          event.preventDefault();
          break;
        case 'ArrowLeft':
          direction = '⬅️';
          event.preventDefault();
          break;
        case 'ArrowRight':
          direction = '➡️';
          event.preventDefault();
          break;
      }

      if (direction) {
        handleMove(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameActive, handleMove]);

  // Start minigame music when game starts playing
  useEffect(() => {
    if (gameState === 'playing') {
      MusicController.setTrack('minigame');
    }
  }, [gameState]);

  // Handle swipe gestures with new Gesture API
  const panGesture = Gesture.Pan().onEnd((event) => {
    runOnJS(SoundEffects.playRandomPop)();
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
    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Track minigame play for analytics
    trackMinigamePlayed('gym');
    trackMinigameProgress('gym');

    setGameState('playing');
    setLevel(1);
    initializeLevel(1);
  };

  const handleForfeit = () => {
    SoundEffects.playRandomPop();
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
    const isStart = x === startPosition.x && y === startPosition.y;
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
    } else if (isStart && !isTraveled) {
      // Only show start door if player hasn't traveled from it yet
      cellContent = (
        <Image
          source={require('../../assets/images/emojis/door.png')}
          style={styles.doorIcon}
        />
      );
      cellStyle = [styles.gridCell, styles.startCell];
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

          <TouchableOpacity
            style={styles.jokerIconButton}
            onPress={() => {
              SoundEffects.playRandomPop();
              setShowAvailableJokers(true);
            }}
          >
            <PixelBorder
              borderColor="#ef4444"
              borderWidth={2}
              backgroundColor="#1a2332"
              innerPadding={8}
            >
              <TextWithEmojis style={styles.jokerIconText} imageSize={20}>
                🃏
              </TextWithEmojis>
            </PixelBorder>
          </TouchableOpacity>

          <PixelBorder
            borderColor="#e74c3c"
            borderWidth={3}
            backgroundColor="#2c3e50"
            innerPadding={20}
            style={{ marginBottom: 20, width: '90%' }}
          >
            <Text style={styles.instructionsHeader}>How to Play:</Text>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <View>
                <TextWithEmojis style={styles.stepText} imageSize={28}>
                  Cover every cell on the grid without being caught by monitors
                  🚨
                </TextWithEmojis>
              </View>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <View>
                <Text style={styles.stepText}>Swipe to move</Text>
              </View>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <View>
                <Text style={styles.stepText}>lvl 1: 5x5 grid, 1 monitor</Text>
                <Text style={styles.stepText}>lvl 2: 6x6 grid, 2 monitors</Text>
                <Text style={styles.stepText}>lvl 3: 7x7 grid, 3 monitors</Text>
              </View>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>
                Monitors move randomly each turn
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
              SoundEffects.playRandomPop();
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

        <AvailableJokersModal
          visible={showAvailableJokers}
          onClose={() => setShowAvailableJokers(false)}
          jokers={GYM_JOKERS}
          subject="Gym"
          themeColors={{
            borderColor: '#ef4444',
            backgroundColor: '#1a2332',
            headerColor: '#2d4a3e',
            textColor: '#fee2e2',
          }}
        />
      </View>
    );
  }

  // Render game
  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.container}>
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
              title="Gym Class Stealth"
              subtitle={`${hallMonitors.length} Hall Monitor${hallMonitors.length > 1 ? 's' : ''}: 🚨`}
              leftInfo={`Level ${level}/3`}
              centerInfo={`Visited: ${traveledCells.size}/${gridSize * gridSize}`}
              rightInfo={`Moves: ${moves}`}
              theme="gym"
            />

            <View style={styles.contentContainer}>
              <View style={styles.gameContainer}>
                <View style={styles.gridContainer}>
                  {Array.from({ length: gridSize }, (_, y) => (
                    <View key={y} style={styles.gridRow}>
                      {Array.from({ length: gridSize }, (_, x) =>
                        renderCell(x, y)
                      )}
                    </View>
                  ))}
                </View>
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
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c3e50', // Dark gym blue-gray
  },
  innerContainer: {
    flex: 1,
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
    width: '90%',
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
  gridContainer: {
    borderWidth: 2,
    borderColor: colors.red.error, // Gym red border
    borderRadius: 8,
    backgroundColor: '#34495e', // Dark gym floor
    alignSelf: 'center',
    marginTop: 16,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
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
