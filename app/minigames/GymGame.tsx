import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import JokerSelection from '../components/JokerSelection';
import { GYM_JOKERS } from '../../src/utils/jokerEffectEngine';
import { useStudyTimeMultiplier } from '../../src/utils/jokerService';
import { useJokers } from '../../src/context/JokerContext';
import { useGame } from '../../src/context/GameContext';

interface Tile {
  id: string;
  row: number;
  col: number;
  shadeIndex: number;
  color: string;
  isStart?: boolean;
  isGoal?: boolean;
}

interface GymGameProps {
  onComplete: () => void;
}

// Gym/Sports jokers for athletics

// Discrete Shade Index System - Clear 10% increments for easy distinction
const generateColorPalette = (hue: number, stageNum: number) => {
  const colors: string[] = [];
  const saturation = 80; // Fixed saturation for consistency
  
  // Generate enough shades for each stage (with buffer for longer paths)
  const totalShades = stageNum === 1 ? 15 : stageNum === 2 ? 18 : 22;
  const minLight = 8;   // Start very dark (but still visible)
  const maxLight = 92;  // End very light (but not white)
  
  // Calculate increment to distribute lightness evenly across all shades
  const increment = (maxLight - minLight) / (totalShades - 1);
  
  for (let i = 0; i < totalShades; i++) {
    const lightness = minLight + (i * increment);
    colors.push(`hsl(${hue}, ${saturation}%, ${Math.round(lightness * 10) / 10}%)`);
  }
  
  return colors;
};

const COLOR_SCHEMES = [
  { name: 'Green', hue: 120 },   // Most distinct
  { name: 'Blue', hue: 210 },
  { name: 'Purple', hue: 270 },
  { name: 'Orange', hue: 30 },
  { name: 'Red', hue: 0 },
  { name: 'Cyan', hue: 180 },
];

export default function GymGame({ onComplete }: GymGameProps) {
  // Joker effects
  const { jokers } = useJokers();
  const { periodCount } = useGame();
  const studyTimeMultiplier = useStudyTimeMultiplier(jokers, periodCount);
  
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [stage, setStage] = useState(1); // 1, 2, 3
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ row: number; col: number } | null>(null);
  const [goalPosition, setGoalPosition] = useState<{ row: number; col: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(20); // Start with stage 1 time
  const [gameRunning, setGameRunning] = useState(false);
  const [currentPath, setCurrentPath] = useState<{row: number, col: number}[]>([]);
  const [pathStartTime, setPathStartTime] = useState<number | null>(null);
  const [stageComplete, setStageComplete] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [pathDirection, setPathDirection] = useState<'darker' | 'lighter' | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const shakeValue = useSharedValue(0);
  const flashValue = useSharedValue(0);
  
  // Stage configuration
  const getStageConfig = (stageNum: number) => {
    const baseConfig = (() => {
      switch (stageNum) {
        case 1: return { time: 20, gridSize: 6, pathsNeeded: 3 };
        case 2: return { time: 15, gridSize: 7, pathsNeeded: 4 };
        case 3: return { time: 10, gridSize: 8, pathsNeeded: 5 };
        default: return { time: 20, gridSize: 6, pathsNeeded: 3 };
      }
    })();
    
    // Apply study time multiplier from Pomodoro Timer joker
    const modifiedTime = Math.round(baseConfig.time * studyTimeMultiplier);
    
    return {
      ...baseConfig,
      time: modifiedTime
    };
  };

  const stageConfig = useMemo(() => getStageConfig(stage), [stage, studyTimeMultiplier]);

  // Calculate shortest possible path length (Manhattan distance)
  const shortestPathLength = useMemo(() => {
    if (!currentPosition || !goalPosition) return 0;
    return Math.abs(goalPosition.row - currentPosition.row) + Math.abs(goalPosition.col - currentPosition.col);
  }, [currentPosition, goalPosition]);

  // Carve a valid path first, then fill randomly
  const carvePath = (grid: Tile[][], start: {row: number, col: number}, goal: {row: number, col: number}) => {
    const visited = new Set<string>();
    const path: {row: number, col: number}[] = [];
    
    // Simple pathfinding from start to goal
    const current = {...start};
    path.push({...current});
    visited.add(`${current.row},${current.col}`);
    
    while (current.row !== goal.row || current.col !== goal.col) {
      const directions = [];
      
      // Prioritize moving toward goal
      if (current.row < goal.row) directions.push({row: 1, col: 0});
      if (current.row > goal.row) directions.push({row: -1, col: 0});
      if (current.col < goal.col) directions.push({row: 0, col: 1});
      if (current.col > goal.col) directions.push({row: 0, col: -1});
      
      // Shuffle for some randomness
      for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
      }
      
      // Try to move
      let moved = false;
      for (const dir of directions) {
        const next = {row: current.row + dir.row, col: current.col + dir.col};
        const key = `${next.row},${next.col}`;
        
        if (next.row >= 0 && next.row < grid.length && 
            next.col >= 0 && next.col < grid[0].length &&
            !visited.has(key)) {
          current.row = next.row;
          current.col = next.col;
          path.push({...current});
          visited.add(key);
          moved = true;
          break;
        }
      }
      
      // If stuck, allow any valid move
      if (!moved) {
        const allDirs = [{row: 1, col: 0}, {row: -1, col: 0}, {row: 0, col: 1}, {row: 0, col: -1}];
        for (const dir of allDirs) {
          const next = {row: current.row + dir.row, col: current.col + dir.col};
          const key = `${next.row},${next.col}`;
          
          if (next.row >= 0 && next.row < grid.length && 
              next.col >= 0 && next.col < grid[0].length &&
              !visited.has(key)) {
            current.row = next.row;
            current.col = next.col;
            path.push({...current});
            visited.add(key);
            break;
          }
        }
      }
    }
    
    return path;
  };
  
  // Generate grid with guaranteed valid path
  const generateGrid = useCallback(() => {
    const { gridSize } = stageConfig;
    const scheme = COLOR_SCHEMES[Math.floor(Math.random() * COLOR_SCHEMES.length)];
    const palette = generateColorPalette(scheme.hue, stage);
    
    // Initialize grid
    const grid: Tile[][] = [];
    for (let row = 0; row < gridSize; row++) {
      grid[row] = [];
      for (let col = 0; col < gridSize; col++) {
        grid[row][col] = {
          id: `${row}-${col}`,
          row,
          col,
          shadeIndex: -1, // Will be filled
          color: '',
        };
      }
    }
    
    // Set start and goal positions - always top-left to bottom-right
    const startPos = {row: 0, col: 0};
    const goalPos = {row: gridSize - 1, col: gridSize - 1};
    
    // Carve the guaranteed path
    const pathCoords = carvePath(grid, startPos, goalPos);
    
    // Create a monotonic path (only increasing or decreasing)
    const pathLength = pathCoords.length;
    
    // Calculate total shades for this stage (must match generateColorPalette)
    const totalShades = stage === 1 ? 15 : stage === 2 ? 18 : 22;
    const maxShadeIndex = totalShades - 1;
    
    // Decide direction: true = getting darker (max→0), false = getting lighter (0→max)
    const goingDarker = Math.random() < 0.5;
    
    // Start and goal must be at opposite extremes of the spectrum
    let startShade: number;
    let targetShade: number;
    
    if (goingDarker) {
      // Start at lightest (max), end at darkest (0)
      startShade = maxShadeIndex;
      targetShade = 0;
    } else {
      // Start at darkest (0), end at lightest (max)
      startShade = 0;
      targetShade = maxShadeIndex;
    }
    
    // Assign shades along the path - ensure each step has a unique consecutive shade
    const pathShades = new Set<number>();
    
    // Check if we have enough shades for the path length
    if (pathLength > totalShades) {
      console.warn(`Path length ${pathLength} exceeds available shades ${totalShades}. This should not happen.`);
    }
    
    // Assign consecutive shades along the path
    for (let i = 0; i < pathCoords.length; i++) {
      const coord = pathCoords[i];
      let shade: number;
      
      if (goingDarker) {
        // Start at max, decrease by 1 each step
        shade = startShade - i;
        // Ensure we don't go below 0
        shade = Math.max(0, shade);
      } else {
        // Start at 0, increase by 1 each step
        shade = startShade + i;
        // Ensure we don't exceed max
        shade = Math.min(maxShadeIndex, shade);
      }
      
      grid[coord.row][coord.col].shadeIndex = shade;
      pathShades.add(shade);
    }
    
    // Store the path direction for decoy generation and validation
    const currentPathDirection = goingDarker ? 'darker' : 'lighter';
    setPathDirection(currentPathDirection);
    
    // Fill remaining tiles ensuring only one correct path exists
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col].shadeIndex === -1) {
          // For each non-path tile, find all adjacent path tiles
          const adjacentPathTiles: number[] = [];
          const adjacentPositions = [
            {row: row - 1, col}, {row: row + 1, col}, // up, down
            {row, col: col - 1}, {row, col: col + 1}  // left, right
          ];
          
          for (const adjPos of adjacentPositions) {
            if (adjPos.row >= 0 && adjPos.row < gridSize && 
                adjPos.col >= 0 && adjPos.col < gridSize) {
              const adjTile = grid[adjPos.row][adjPos.col];
              if (adjTile.shadeIndex !== -1) { // It's a path tile
                adjacentPathTiles.push(adjTile.shadeIndex);
              }
            }
          }
          
          // Find shades that are exactly 1 away in the OPPOSITE direction of the path
          const totalShades = stage === 1 ? 15 : stage === 2 ? 18 : 22;
          const validDecoyShades: number[] = [];
          
          // For each adjacent path tile, add the shade 1 step in the wrong direction
          for (const adjPathShade of adjacentPathTiles) {
            let wrongDirectionShade: number;
            
            if (currentPathDirection === 'darker') {
              // Path goes darker, so decoys should go lighter (+1)
              wrongDirectionShade = adjPathShade + 1;
            } else {
              // Path goes lighter, so decoys should go darker (-1)
              wrongDirectionShade = adjPathShade - 1;
            }
            
            // Make sure the wrong direction shade is valid
            if (wrongDirectionShade >= 0 && wrongDirectionShade < totalShades) {
              validDecoyShades.push(wrongDirectionShade);
            }
          }
          
          // Assign a decoy shade (1 step in wrong direction)
          if (validDecoyShades.length > 0) {
            // Remove duplicates and pick randomly
            const uniqueDecoyShades = [...new Set(validDecoyShades)];
            grid[row][col].shadeIndex = uniqueDecoyShades[Math.floor(Math.random() * uniqueDecoyShades.length)];
          } else {
            // Fallback: if no wrong-direction shades exist, use random far shade
            const totalShades = stage === 1 ? 15 : stage === 2 ? 18 : 22;
            let fallbackShade;
            do {
              fallbackShade = Math.floor(Math.random() * totalShades);
            } while (adjacentPathTiles.some(pathShade => Math.abs(fallbackShade - pathShade) <= 1));
            grid[row][col].shadeIndex = fallbackShade;
          }
        }
        
        // Apply color based on shade
        grid[row][col].color = palette[grid[row][col].shadeIndex];
      }
    }
    
    // Mark start and goal - goal already has correct shade from path
    grid[startPos.row][startPos.col].isStart = true;
    grid[goalPos.row][goalPos.col].isGoal = true;
    
    // Flatten grid for state
    const newTiles: Tile[] = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        newTiles.push(grid[row][col]);
      }
    }
    
    setTiles(newTiles);
    setCurrentPosition(startPos);
    setGoalPosition(goalPos);
    setCurrentPath([startPos]);
    setPathStartTime(Date.now());
  }, [stageConfig, stage]);

  // Initialize stage
  const initializeStage = (stageNum: number) => {
    const config = getStageConfig(stageNum);
    setTimeLeft(config.time);
    setStageComplete(false);
    setIsGameActive(true);
    generateGrid();
    startTimer();
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
    setIsGameActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    Alert.alert(
      '⏰ Time\'s Up!',
      'You ran out of time! Try again?',
      [
        { text: 'Try Again', onPress: () => initializeStage(stage) },
        { text: 'Give Up', onPress: () => router.back(), style: 'destructive' }
      ]
    );
  };

  // Initialize game when playing starts
  useEffect(() => {
    if (gameState === 'playing') {
      setStage(1);
      initializeStage(1);
      setGameRunning(true);
    }
  }, [gameState]);

  // Progress to next stage
  const nextStage = () => {
    if (stage >= 3) {
      // All stages complete!
      if (timerRef.current) clearInterval(timerRef.current);
      Alert.alert(
        '🏆 Champion Athlete!',
        'Incredible! You\'ve completed all training levels!',
        [
          { text: 'Choose Reward', onPress: () => {
            setTimeout(() => setGameState('jokerSelection'), 500);
          }}
        ]
      );
    } else {
      const newStage = stage + 1;
      setStage(newStage);
      initializeStage(newStage);
    }
  };

  // Check if move is valid - must be adjacent AND monotonic in correct direction
  const isValidMove = (fromRow: number, fromCol: number, toRow: number, toCol: number): boolean => {
    // Step 1: Check if tiles are adjacent (not diagonal)
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    
    if (!isAdjacent) return false;
    
    // Step 2: Get both tiles
    const fromTile = tiles.find(t => t.row === fromRow && t.col === fromCol);
    const toTile = tiles.find(t => t.row === toRow && t.col === toCol);
    
    if (!fromTile || !toTile || !pathDirection) return false;
    
    // Step 3: Check shade difference is EXACTLY 1 AND in the correct direction
    const shadeDiff = toTile.shadeIndex - fromTile.shadeIndex;
    
    if (pathDirection === 'darker') {
      // Path goes darker: shade indices should decrease by exactly 1
      return shadeDiff === -1;
    } else {
      // Path goes lighter: shade indices should increase by exactly 1
      return shadeDiff === 1;
    }
  };

  // Handle tile press
  const handleTilePress = (row: number, col: number) => {
    if (!isGameActive || !currentPosition) return;
    
    if (row === currentPosition.row && col === currentPosition.col) return; // Same tile
    
    if (isValidMove(currentPosition.row, currentPosition.col, row, col)) {
      // Valid move
      flashValue.value = withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 100 }));
      
      setCurrentPosition({ row, col });
      setCurrentPath(prev => [...prev, { row, col }]);
      
      // Check if reached goal
      if (goalPosition && row === goalPosition.row && col === goalPosition.col) {
        // Stage complete!
        if (timerRef.current) clearInterval(timerRef.current);
        setStageComplete(true);
        setIsGameActive(false);
        
        // Show celebration and next stage option
        setTimeout(() => {
          if (stage < 3) {
            const nextConfig = getStageConfig(stage + 1);
            Alert.alert(
              `🎉 Level ${stage} Complete!`,
              `Great fitness! Ready for Level ${stage + 1}? (${nextConfig.time} seconds, ${nextConfig.gridSize}x${nextConfig.gridSize} grid)`,
              [
                { text: 'Next Level', onPress: nextStage }
              ]
            );
          } else {
            Alert.alert(
              '🏆 Champion Athlete!',
              'Incredible! You\'ve completed all training levels!',
              [
                { text: 'Choose Reward', onPress: () => {
                  setTimeout(() => setGameState('jokerSelection'), 500);
                }}
              ]
            );
          }
        }, 500);
      }
    } else {
      // Invalid move - shake and reset
      shakeValue.value = withSequence(
        withSpring(-10, { duration: 50 }),
        withSpring(10, { duration: 50 }),
        withSpring(-5, { duration: 50 }),
        withSpring(0, { duration: 50 })
      );
      
      Vibration.vibrate(100);
      
      // Reset to start
      if (tiles.length > 0) {
        const startTile = tiles.find(t => t.isStart)!;
        setCurrentPosition({ row: startTile.row, col: startTile.col });
        setCurrentPath([{ row: startTile.row, col: startTile.col }]);
        setPathStartTime(Date.now());
      }
    }
  };

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleForfeit = () => {
    if (gameState === 'playing') {
      Alert.alert(
        '🏃‍♂️ Leave Gym Session?',
        "If you leave now, you\\'ll forfeit your chance to study tonight and won\\'t get a fitness reward.",
        [
          { text: 'Keep Training', style: 'cancel' },
          { text: 'Back to Instructions', onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            setGameState('instructions');
          }},
          { 
            text: 'Leave', 
            style: 'destructive',
            onPress: () => {
              if (timerRef.current) clearInterval(timerRef.current);
              router.back();
            }
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeValue.value }]
  }));

  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: flashValue.value ? 'rgba(255, 255, 255, 0.5)' : 'transparent'
  }));

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
          <Text style={styles.instructionsTitle}>🏃‍♂️ Gym Study Session! 💪</Text>
          
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>🎯 How to Train:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>Navigate from START to GOAL by tapping adjacent tiles</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>Move only to adjacent tiles with the next shade in sequence (no numbers shown - use color key!)</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>Wrong move = instant reset to START (no time penalty)</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>Reach the GOAL tile to complete each level</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>5.</Text>
              <Text style={styles.stepText}>Complete 3 levels with increasingly complex shade progressions!</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.startGameButton} 
            onPress={() => setGameState('playing')}
          >
            <Text style={styles.startGameButtonText}>🏋️‍♀️ Start Training!</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.startGameButton} onPress={handleForfeit}>
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width - 32;
  const tileSize = Math.floor((screenWidth - 16 - (stageConfig.gridSize - 1) * 2) / stageConfig.gridSize) - 2;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Animated.View style={[styles.gameContainer, shakeStyle]}>
        <Animated.View style={flashStyle} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏃‍♂️ Gym Training</Text>
          <View style={styles.gameInfo}>
            <Text style={styles.level}>Level {stage}/3</Text>
            <Text style={[styles.timer, { color: timeLeft <= 10 ? '#ff4d4f' : '#52c41a' }]}>
              ⏱️ {timeLeft}s
            </Text>
          </View>
          <Text style={styles.subtitle}>Follow the monotonic color path - no visual hints!</Text>
          
          {/* Color Key - matches current grid colors exactly */}
          <View style={styles.colorKeyContainer}>
            <Text style={styles.colorKeyTitle}>Color Key (Light → Dark or Dark → Light):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorKeyScroll}>
              <View style={styles.colorKeyRow}>
                {tiles.length > 0 && (() => {
                  // Generate the full palette for current stage and show all shades
                  const currentScheme = COLOR_SCHEMES.find(scheme => {
                    const testPalette = generateColorPalette(scheme.hue, stage);
                    return tiles.some(tile => tile.color === testPalette[tile.shadeIndex]);
                  }) || COLOR_SCHEMES[0];
                  
                  const fullPalette = generateColorPalette(currentScheme.hue, stage);
                  
                  return Array.from({ length: fullPalette.length }, (_, index) => {
                    return (
                      <View 
                        key={index} 
                        style={[
                          styles.colorKeySwatch,
                          { backgroundColor: fullPalette[index] }
                        ]}
                      >
                        <Text style={styles.colorKeyNumber}>{index}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Grid - Create rows explicitly */}
        <View style={[styles.gridContainer, { width: screenWidth }]}>
          {Array.from({ length: stageConfig.gridSize }, (_, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {Array.from({ length: stageConfig.gridSize }, (_, colIndex) => {
                const tile = tiles.find(t => t.row === rowIndex && t.col === colIndex);
                if (!tile) return null;
                
                const isCurrentPosition = currentPosition?.row === tile.row && currentPosition?.col === tile.col;
                const isInPath = currentPath.some(p => p.row === tile.row && p.col === tile.col);
                
                // Remove green highlighting - players must use visual skills only
                
                return (
                  <TouchableOpacity
                    key={tile.id}
                    style={[
                      styles.tile,
                      {
                        width: tileSize,
                        height: tileSize,
                        backgroundColor: tile.color,
                      },
                      tile.isStart && styles.startTile,
                      tile.isGoal && styles.goalTile,
                      isCurrentPosition && styles.currentTile,
                      isInPath && !isCurrentPosition && styles.pathTile,
                    ]}
                    onPress={() => handleTilePress(tile.row, tile.col)}
                  >
                    {tile.isStart && <Text style={styles.tileLabel}>START</Text>}
                    {tile.isGoal && <Text style={styles.tileLabel}>GOAL</Text>}
                    {isCurrentPosition && <Text style={styles.playerMarker}>🏃</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

   <TouchableOpacity style={styles.footerBtn} onPress={() => initializeStage(stage)}>
          <Text style={styles.footerBtnText}>🔄 Reset Level</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState('instructions');
        }}>
          <Text style={styles.footerBtnText}>📋 Instructions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, styles.leaveBtn]} onPress={handleForfeit}>
          <Text style={styles.footerBtnText}>🏃‍♂️ Leave</Text>
        </TouchableOpacity>
       
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2332',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 100,
  },
  gameContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#2d4a3e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ff6b35',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: '#ff6b35',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginTop: 8,
  },
  level: {
    fontSize: 18,
    fontWeight: '600',
    color: '#52c41a',
    fontFamily: 'CrayonPastel',
  },
  timer: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  gridContainer: {
    alignSelf: 'center',
    backgroundColor: '#0f1419',
    padding: 12,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#ff6b35',
    marginBottom: 8,
  },
  colorKeyContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  colorKeyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    marginBottom: 8,
    textAlign: 'center',
  },
  colorKeyScroll: {
    maxHeight: 40,
  },
  colorKeyRow: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
  },
  colorKeySwatch: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorKeyNumber: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 3,
  },
  tile: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  startTile: {
    borderColor: '#52c41a',
    borderWidth: 3,
    shadowColor: '#52c41a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  goalTile: {
    borderColor: '#fadb14',
    borderWidth: 3,
    shadowColor: '#fadb14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  currentTile: {
    borderColor: '#ff4d4f',
    borderWidth: 4,
    shadowColor: '#ff4d4f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
  pathTile: {
    borderColor: '#1890ff',
    borderWidth: 2,
    opacity: 0.8,
  },
  tileLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    top: 2,
  },
  playerMarker: {
    position: 'absolute',
    fontSize: 20,
    top: '50%',
    marginTop: -10,
  },
  infoContainer: {
    backgroundColor: '#2d4a3e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ff6b35',
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 4,
  },
  infoHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#52c41a',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
  },
  footerBtn: {
    flex: 1,
    backgroundColor: '#2d4a3e',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff6b35',
    alignItems: 'center',
    marginBottom:8
  },
  leaveBtn: {
    backgroundColor: '#8b4513',
    borderColor: '#daa520',
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  // Instructions Styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#1a2332',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#ff6b35',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionsCard: {
    backgroundColor: '#2d4a3e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#ff6b35',
    marginBottom: 20,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff6b35',
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
    color: '#ff6b35',
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
    backgroundColor: '#ff6b35',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#e55a2b',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#ff6b35',
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
});