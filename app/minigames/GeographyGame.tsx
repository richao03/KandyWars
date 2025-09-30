import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { GEOGRAPHY_JOKERS } from '../../src/utils/jokerEffectEngine';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';
import PixelBorder from '../components/PixelBorder';
import TextWithEmojis from '../components/TextWithEmojis';

interface GeographyGameProps {
  onComplete: () => void;
}

// Available dog images for puzzles
const DOG_IMAGES = [
  require('../../assets/images/doggs/afghan.png'),
  require('../../assets/images/doggs/brussleGriffon.png'),
  require('../../assets/images/doggs/byul.png'),
  require('../../assets/images/doggs/caneCorso.png'),
  require('../../assets/images/doggs/evee.png'),
  require('../../assets/images/doggs/germanShepard.png'),
  require('../../assets/images/doggs/pitbull.png'),
  require('../../assets/images/doggs/pug.png'),
];

const DOG_NAMES = [
  'Afghan Hound',
  'Brussels Griffon',
  'Byul',
  'Cane Corso',
  'Evee',
  'German Shepherd',
  'Pitbull',
  'Pug',
];

interface Tile {
  id: number; // 0-8, where 8 is the empty tile
  currentPosition: number; // 0-8, current position on the board
  correctPosition: number; // 0-8, where this tile should be
}

export default function GeographyGame({ onComplete }: GeographyGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { trackMinigamePlayed } = useScoreboard();
  const { trackMinigamePlayed: trackMinigameProgress } = useMinigameTracking();

  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'preview', 'scrambling', 'playing', 'jokerSelection'
  const [level, setLevel] = useState(1);
  const [completedLevel, setCompletedLevel] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedDogName, setSelectedDogName] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrambleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get screen dimensions for tile sizing
  const screenWidth = Dimensions.get('window').width;
  const boardSize = Math.min(screenWidth - 64, 360); // Max 360px, with padding
  const tileSize = (boardSize - 4) / 3; // Subtract border spacing

  // Level configuration
  const getLevelConfig = (level: number) => {
    switch (level) {
      case 1:
        return { scrambleMoves: 4, timeLimit: 60 };
      case 2:
        return { scrambleMoves: 10, timeLimit: 60 };
      case 3:
        return { scrambleMoves: 15, timeLimit: 60 };
      default:
        return { scrambleMoves: 4, timeLimit: 60 };
    }
  };

  // Initialize puzzle
  const initializePuzzle = () => {
    // Create tiles 0-7 (8 is empty)
    const newTiles: Tile[] = [];
    for (let i = 0; i < 9; i++) {
      newTiles.push({
        id: i,
        currentPosition: i,
        correctPosition: i,
      });
    }
    setTiles(newTiles);
    setMoves(0);

    // Select random dog image
    const imageIndex = Math.floor(Math.random() * DOG_IMAGES.length);
    setSelectedImage(imageIndex);
    setSelectedDogName(DOG_NAMES[imageIndex]);
  };

  // Get tile at position
  const getTileAtPosition = (position: number): Tile | undefined => {
    return tiles.find((t) => t.currentPosition === position);
  };

  // Get empty tile position
  const getEmptyPosition = (): number => {
    const emptyTile = tiles.find((t) => t.id === 8);
    return emptyTile ? emptyTile.currentPosition : 8;
  };

  // Check if two positions are adjacent
  const isAdjacent = (pos1: number, pos2: number): boolean => {
    const row1 = Math.floor(pos1 / 3);
    const col1 = pos1 % 3;
    const row2 = Math.floor(pos2 / 3);
    const col2 = pos2 % 3;

    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);

    // Adjacent if one unit away horizontally or vertically (not diagonally)
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  };

  // Get valid moves from current empty position
  const getValidMoves = (emptyPos: number): number[] => {
    const validMoves: number[] = [];
    const positions = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    positions.forEach((pos) => {
      if (isAdjacent(emptyPos, pos)) {
        validMoves.push(pos);
      }
    });

    return validMoves;
  };

  // Move tile
  const moveTile = (fromPosition: number) => {
    if (isAnimating) return;

    const emptyPosition = getEmptyPosition();

    // Check if the move is valid (adjacent to empty)
    if (!isAdjacent(fromPosition, emptyPosition)) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsAnimating(true);

    // Swap the tile with the empty position
    setTiles((prevTiles) => {
      const newTiles = [...prevTiles];
      const tileToMove = newTiles.find(
        (t) => t.currentPosition === fromPosition
      );
      const emptyTile = newTiles.find((t) => t.id === 8);

      if (tileToMove && emptyTile) {
        // Swap positions
        const tempPos = tileToMove.currentPosition;
        tileToMove.currentPosition = emptyTile.currentPosition;
        emptyTile.currentPosition = tempPos;
      }

      return newTiles;
    });

    setMoves((prev) => prev + 1);

    setTimeout(() => {
      setIsAnimating(false);
      checkWinCondition();
    }, 200);
  };

  // Scramble puzzle with tiles passed as parameter
  const scramblePuzzleWithTiles = async (
    movesCount: number,
    initialTiles: Tile[]
  ) => {
    setGameState('scrambling');
    setIsAnimating(true);

    let currentTiles = [...initialTiles];
    let lastMove = -1;

    for (let i = 0; i < movesCount; i++) {
      await new Promise((resolve) => {
        scrambleTimeoutRef.current = setTimeout(() => {
          const emptyTile = currentTiles.find((t) => t.id === 8);
          if (!emptyTile) {
            resolve(undefined);
            return;
          }

          const validMoves = getValidMoves(emptyTile.currentPosition);
          // Filter out the last move to avoid undoing
          const filteredMoves = validMoves.filter((move) => move !== lastMove);

          if (filteredMoves.length > 0) {
            const randomMove =
              filteredMoves[Math.floor(Math.random() * filteredMoves.length)];
            const tileToMove = currentTiles.find(
              (t) => t.currentPosition === randomMove
            );

            if (tileToMove) {
              // Record the empty position before the move
              lastMove = emptyTile.currentPosition;

              // Swap positions
              const tempPos = tileToMove.currentPosition;
              tileToMove.currentPosition = emptyTile.currentPosition;
              emptyTile.currentPosition = tempPos;

              setTiles([...currentTiles]);
            }
          }

          resolve(undefined);
        }, 150); // Fast animation for scrambling
      });
    }

    setIsAnimating(false);
    setGameState('playing');
    startTimer();
  };

  // Scramble puzzle with animation (original, uses current tiles state)
  const scramblePuzzle = async (movesCount: number) => {
    await scramblePuzzleWithTiles(movesCount, tiles);
  };

  // Check if puzzle is solved
  const checkWinCondition = () => {
    const isSolved = tiles.every(
      (tile) => tile.currentPosition === tile.correctPosition
    );

    if (isSolved && gameState === 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setCompletedLevel(level);

      if (level < 3) {
        showModal(
          `Level ${level} Complete!`,
          `Solved in ${moves} moves! Ready for Level ${level + 1}?`,
          '🎉',
          () => {
            setLevel(level + 1);
            startLevel(level + 1);
          }
        );
      } else {
        showModal(
          'All Levels Complete!',
          `Amazing puzzle solving! You completed all levels!`,
          '🏆',
          () => {
            setGameState('jokerSelection');
          }
        );
      }
    }
  };

  // Start timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const config = getLevelConfig(level);
    setTimeLeft(config.timeLimit);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle time up
  const handleTimeUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (completedLevel > 0) {
      showModal(
        "Time's Up!",
        `You completed ${completedLevel} level${completedLevel !== 1 ? 's' : ''}! You've earned ${completedLevel} joker${completedLevel !== 1 ? 's' : ''}!`,
        '⚠️',
        () => {
          setGameState('jokerSelection');
        }
      );
    } else {
      showModal("Time's Up!", 'Try again from Level 1?', '⚠️', () => {
        setGameState('instructions');
      });
    }
  };

  // Start level
  const startLevel = (levelNum: number) => {
    // Create initial tiles
    const newTiles: Tile[] = [];
    for (let i = 0; i < 9; i++) {
      newTiles.push({
        id: i,
        currentPosition: i,
        correctPosition: i,
      });
    }
    setTiles(newTiles);
    setMoves(0);
    setTimeLeft(60);

    // Select random dog image
    const imageIndex = Math.floor(Math.random() * DOG_IMAGES.length);
    setSelectedImage(imageIndex);
    setSelectedDogName(DOG_NAMES[imageIndex]);

    setGameState('preview');

    // Show complete puzzle for 2 seconds before scrambling
    setTimeout(() => {
      const config = getLevelConfig(levelNum);
      // Pass the tiles directly to scramblePuzzle
      scramblePuzzleWithTiles(config.scrambleMoves, newTiles);
    }, 2000);
  };

  // Start game
  const startGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackMinigamePlayed('geography');
    trackMinigameProgress('geography');

    setLevel(1);
    setCompletedLevel(0);
    startLevel(1);
  };

  // Handle forfeit
  const handleForfeit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (timerRef.current) clearInterval(timerRef.current);
    if (scrambleTimeoutRef.current) clearTimeout(scrambleTimeoutRef.current);

    if (gameState === 'playing') {
      showModal('Leave Geography?', "You'll lose your progress!", '🗺️', () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.back();
      }, false, true);
    } else {
      router.back();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (scrambleTimeoutRef.current) clearTimeout(scrambleTimeoutRef.current);
    };
  }, []);

  // Render tile
  const renderTile = (position: number) => {
    const tile = getTileAtPosition(position);

    if (!tile || tile.id === 8) {
      // Empty space
      return (
        <View
          key={`empty-${position}`}
          style={[styles.tile, styles.emptyTile]}
        />
      );
    }

    // Calculate the source position for the image crop
    const sourceRow = Math.floor(tile.id / 3);
    const sourceCol = tile.id % 3;

    return (
      <TouchableOpacity
        key={`tile-${tile.id}-${position}`}
        style={[styles.tile]}
        onPress={() => moveTile(position)}
        disabled={gameState !== 'playing' || isAnimating}
      >
        <View style={styles.tileImageContainer}>
          <Image
            source={DOG_IMAGES[selectedImage]}
            style={[
              styles.tileImage,
              {
                width: boardSize,
                height: boardSize,
                transform: [
                  { translateX: -sourceCol * tileSize },
                  { translateY: -sourceRow * tileSize },
                ],
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Instructions screen
  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Geography Puzzle!</Text>

          <PixelBorder
            borderColor="#4a5568"
            borderWidth={3}
            backgroundColor="#2d3748"
            innerPadding={20}
            style={{ marginBottom: 20, width: '100%' }}
          >
            <Text style={styles.instructionsHeader}>How to Play:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>
                Slide tiles to reconstruct the dog picture
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Tap a tile next to the empty space to move it
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>
                Level 1: 4 scrambles • Level 2: 10 • Level 3: 15
              </Text>
            </View>
          </PixelBorder>

          <PixelBorder
            borderColor="#4a5568"
            borderWidth={3}
            backgroundColor="#3182ce"
            innerPadding={0}
            style={{ marginBottom: 16 }}
          >
            <TouchableOpacity
              style={styles.pixelButtonInner}
              onPress={startGame}
            >
              <Text style={styles.startGameButtonText}>Start Puzzle!</Text>
            </TouchableOpacity>
          </PixelBorder>

          <TouchableOpacity
            style={styles.pixelButtonInner}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Joker selection screen
  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection
        jokers={GEOGRAPHY_JOKERS}
        theme="geography"
        subject="Geography"
        onComplete={onComplete}
        rewardTier={completedLevel as 1 | 2 | 3}
        completionLevel={completedLevel as 1 | 2 | 3}
      />
    );
  }

  // Main game screen
  return (
    <View style={styles.container}>
      <MinigameHUD
        title="Pangea Puzzle"
        subtitle={selectedDogName}
        leftInfo={`Level ${level}/3`}
        centerInfo={`Moves: ${moves}`}
        rightInfo={`Time: ${timeLeft}s`}
        theme="geography"
      />

      {/* Show preview message */}
      {gameState === 'preview' && (
        <View style={styles.messageOverlay}>
          <Text style={styles.messageText}>Memorize the picture!</Text>
        </View>
      )}

      {/* Show scrambling message */}
      {gameState === 'scrambling' && (
        <View style={styles.messageOverlay}>
          <Text style={styles.messageText}>Scrambling...</Text>
        </View>
      )}

      {/* Puzzle board */}
      <View style={styles.puzzleContainer}>
        <View
          style={[styles.puzzleBoard, { width: boardSize, height: boardSize }]}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((position) => (
            <View
              key={`position-${position}`}
              style={[
                styles.tilePosition,
                {
                  width: tileSize,
                  height: tileSize,
                  left: (position % 3) * tileSize,
                  top: Math.floor(position / 3) * tileSize,
                },
              ]}
            >
              {renderTile(position)}
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <PixelBorder
          borderColor="#4a5568"
          borderWidth={3}
          backgroundColor="#2d3748"
          innerPadding={0}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.leaveBtnInner}
            onPress={handleForfeit}
          >
            <TextWithEmojis style={styles.footerBtnText} imageSize={30}>
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
        theme="school"
        dismissible={modal.dismissible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a202c',
    padding: 20,
  },
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#3182ce',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#63b3ed',
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
    color: '#63b3ed',
    fontFamily: 'PixeloidMono',
    marginRight: 10,
    minWidth: 20,
    lineHeight: 22,
  },
  stepText: {
    fontSize: 16,
    color: '#e2e8f0',
    fontFamily: 'PixeloidMono',
    flex: 1,
    lineHeight: 22,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PixeloidMono',
  },
  pixelButtonInner: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  puzzleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  puzzleBoard: {
    position: 'relative',
    backgroundColor: '#2d3748',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4a5568',
  },
  tilePosition: {
    position: 'absolute',
    padding: 1,
  },
  tile: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4a5568',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#718096',
  },
  emptyTile: {
    backgroundColor: '#1a202c',
    borderColor: '#2d3748',
  },
  tileImageContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  tileImage: {
    position: 'absolute',
  },
  messageOverlay: {
    position: 'absolute',
    top: '30%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(49, 130, 206, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    zIndex: 100,
  },
  messageText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
  },
  footerBtn: {
    flex: 1,
    backgroundColor: '#2d3748',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4a5568',
    alignItems: 'center',
  },
  leaveBtn: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  leaveBtnInner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
    fontFamily: 'PixeloidMono',
  },
});
