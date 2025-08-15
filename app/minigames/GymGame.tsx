import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameModal, { useGameModal } from '../components/GameModal';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { ResponsiveSpacing } from '../../src/utils/responsive';
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
  shadeValue: number; // Now stores the actual shade value (0, 0.5, 1, 1.5, etc.)
  color: string;
  isStart?: boolean;
  isGoal?: boolean;
}

interface ArtGameProps {
  onComplete: () => void;
}

// Art jokers for creativity

// Fine-tuned Shade Index System - 0.5 grade increments for path, 1 grade for decoys
const generateColorPalette = (hue: number, stageNum: number) => {
  const colors: string[] = [];
  const saturation = 80; // Fixed saturation for consistency
  
  // Generate more fine-grained shades for precise color gradation
  // Need many more shades since decoys now use 0.25 increments
  const totalShades = stageNum === 1 ? 50 : stageNum === 2 ? 60 : 80;
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

export default function ArtGame({ onComplete }: ArtGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  
  // Joker effects
  const { jokers } = useJokers();
  const { periodCount } = useGame();
  const studyTimeMultiplier = useStudyTimeMultiplier(jokers, periodCount);
  
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [stage, setStage] = useState(1); // 1, 2, 3
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ row: number; col: number } | null>(null);
  const [goalPosition, setGoalPosition] = useState<{ row: number; col: number } | null>(null);
  const [mistakesLeft, setMistakesLeft] = useState(5); // 5 chances per level
  const [gameRunning, setGameRunning] = useState(false);
  const [currentPath, setCurrentPath] = useState<{row: number, col: number}[]>([]);
  const [pathStartTime, setPathStartTime] = useState<number | null>(null);
  const [stageComplete, setStageComplete] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [pathDirection, setPathDirection] = useState<'darker' | 'lighter' | null>(null);
  
  
  // Removed timer reference as we're using mistake-based system
  const shakeValue = useSharedValue(0);
  const flashValue = useSharedValue(0);
  
  // Stage configuration
  const getStageConfig = (stageNum: number) => {
    switch (stageNum) {
      case 1: return { gridSize: 6, pathsNeeded: 3, mistakes: 5 };
      case 2: return { gridSize: 7, pathsNeeded: 4, mistakes: 5 };
      case 3: return { gridSize: 8, pathsNeeded: 5, mistakes: 5 };
      default: return { gridSize: 6, pathsNeeded: 3, mistakes: 5 };
    }
  };

  const stageConfig = useMemo(() => getStageConfig(stage), [stage]);

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
          shadeValue: -1, // Will be filled with actual shade values (0, 0.5, 1, etc.)
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
    
    // Decide direction: true = getting darker (high→low), false = getting lighter (low→high)
    const goingDarker = Math.random() < 0.5;
    
    // Calculate the maximum shade value we can reach given path length
    // Each step is 0.5, so max value = (pathLength - 1) * 0.5
    const maxPossibleShade = (pathLength - 1) * 0.5;
    
    // Set start and end shade values
    let startShadeValue: number;
    let endShadeValue: number;
    
    if (goingDarker) {
      // Start at high value, decrease by 0.5 each step
      startShadeValue = maxPossibleShade;
      endShadeValue = 0;
    } else {
      // Start at 0, increase by 0.5 each step
      startShadeValue = 0;
      endShadeValue = maxPossibleShade;
    }
    
    // Track all shade values used in the path
    const pathShadeValues = new Set<number>();
    
    // Assign shade values with exact 0.5 increments along the path
    for (let i = 0; i < pathCoords.length; i++) {
      const coord = pathCoords[i];
      let shadeValue: number;
      
      if (goingDarker) {
        // Start high, decrease by exactly 0.5 each step
        shadeValue = startShadeValue - (i * 0.5);
      } else {
        // Start at 0, increase by exactly 0.5 each step
        shadeValue = i * 0.5;
      }
      
      // Ensure precise 0.5 increments by rounding to nearest 0.5
      shadeValue = Math.round(shadeValue * 2) / 2;
      
      grid[coord.row][coord.col].shadeValue = shadeValue;
      pathShadeValues.add(shadeValue);
      
      // Debug: Log path progression to ensure correct 0.5 increments
      console.log(`Path step ${i}: [${coord.row},${coord.col}] = shade ${shadeValue}`);
    }
    
    // Store the path direction for decoy generation and validation
    const currentPathDirection = goingDarker ? 'darker' : 'lighter';
    setPathDirection(currentPathDirection);
    
    // Debug: Log all path shade values
    console.log(`Path direction: ${currentPathDirection}, path values: [${Array.from(pathShadeValues).sort((a,b) => a-b).join(', ')}]`);
    
    // Fill remaining tiles with decoy values
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col].shadeValue === -1) {
          // For each non-path tile, find all adjacent path tiles
          const adjacentPathValues: number[] = [];
          const adjacentPositions = [
            {row: row - 1, col}, {row: row + 1, col}, // up, down
            {row, col: col - 1}, {row, col: col + 1}  // left, right
          ];
          
          for (const adjPos of adjacentPositions) {
            if (adjPos.row >= 0 && adjPos.row < gridSize && 
                adjPos.col >= 0 && adjPos.col < gridSize) {
              const adjTile = grid[adjPos.row][adjPos.col];
              if (adjTile.shadeValue !== -1) { // It's a path tile
                adjacentPathValues.push(adjTile.shadeValue);
              }
            }
          }
          
          // Create decoy values that are much closer to the path to increase difficulty
          const validDecoyValues: number[] = [];
          
          // For each adjacent path tile, add values that are slightly off
          for (const adjPathValue of adjacentPathValues) {
            // Generate multiple decoy options with 28% larger offsets for better distinction
            const decoyOffsets = [
              0.352, // 28% more than 0.275 (0.275 * 1.28)
              -0.352,
              1.056, // 28% more than 0.825 (0.825 * 1.28)
              -1.056,
              0.704, // 28% more than 0.55 (0.55 * 1.28)
              -0.704,
            ];
            
            for (const offset of decoyOffsets) {
              const decoyValue = adjPathValue + offset;
              
              // Make sure the decoy values are valid (≥0) and not exactly on the correct path
              if (decoyValue >= 0 && !pathShadeValues.has(decoyValue)) {
                validDecoyValues.push(decoyValue);
              }
            }
          }
          
          // Assign a decoy value (very close to path - 0.25 to 0.75 grade off)
          if (validDecoyValues.length > 0) {
            // Remove duplicates and pick randomly
            const uniqueDecoyValues = [...new Set(validDecoyValues)];
            grid[row][col].shadeValue = uniqueDecoyValues[Math.floor(Math.random() * uniqueDecoyValues.length)];
          } else {
            // Fallback: use a random value that's not too close to path values
            let fallbackValue = Math.random() * maxPossibleShade * 2;
            // Round to nearest 0.5
            fallbackValue = Math.round(fallbackValue * 2) / 2;
            grid[row][col].shadeValue = fallbackValue;
          }
        }
        
        // Map shade value to color index in palette
        // Ensure path values are well-distributed across the palette
        const maxShadeInGame = Math.max(...Array.from(pathShadeValues), maxPossibleShade);
        
        // Scale shade value to use more of the palette range
        const normalizedShade = grid[row][col].shadeValue / Math.max(maxShadeInGame, 1);
        const paletteIndex = Math.min(
          palette.length - 1,
          Math.floor(normalizedShade * (palette.length - 1))
        );
        
        // Debug logging for path tiles to ensure they get different colors
        const isOnPath = pathShadeValues.has(grid[row][col].shadeValue);
        if (isOnPath) {
          console.log(`Path tile [${row},${col}]: shadeValue=${grid[row][col].shadeValue}, normalized=${normalizedShade}, paletteIndex=${paletteIndex}`);
        }
        
        grid[row][col].color = palette[Math.max(0, paletteIndex)];
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
    setMistakesLeft(config.mistakes);
    setStageComplete(false);
    setIsGameActive(true);
    generateGrid();
  };

  // Handle when mistakes run out
  const handleMistakesUp = () => {
    setIsGameActive(false);
    
    showModal(
      '❌ No More Chances!',
      'You\'ve used all your chances! Try again?',
      '❌',
      () => {
        initializeStage(stage);
      }
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
      showModal(
        '🎨 Master Artist!',
        'Incredible! You\'ve completed all artistic challenges!',
        '🎨'
      );
    } else {
      const newStage = stage + 1;
      setStage(newStage);
      // Ensure mistakes are reset for new level
      setMistakesLeft(5);
      initializeStage(newStage);
    }
  };

  // Check if move is valid - must be adjacent AND monotonic in correct direction with 0.5 increments
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
    
    // Step 3: Check shade value difference is EXACTLY 0.5 AND in the correct direction
    const valueDiff = toTile.shadeValue - fromTile.shadeValue;
    
    if (pathDirection === 'darker') {
      // Path goes darker: shade values should decrease by exactly 0.5
      return Math.abs(valueDiff + 0.5) < 0.001; // Use small epsilon for floating point comparison
    } else {
      // Path goes lighter: shade values should increase by exactly 0.5
      return Math.abs(valueDiff - 0.5) < 0.001; // Use small epsilon for floating point comparison
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
        setStageComplete(true);
        setIsGameActive(false);
        
        // Show celebration and next stage option
        setTimeout(() => {
          if (stage < 3) {
            const nextConfig = getStageConfig(stage + 1);
            showModal(
              `🎉 Level ${stage} Complete!`,
              `Beautiful artwork! Ready for Level ${stage + 1}? (${nextConfig.gridSize}x${nextConfig.gridSize} canvas, ${nextConfig.mistakes} chances)`,
              '🎉',
              () => {
                nextStage();
              }
            );
          } else {
            showModal(
              '🎨 Master Artist!',
              'Incredible! You\'ve completed all artistic challenges!',
              '🎨',
              () => {
                setGameState('jokerSelection');
              }
            );
          }
        }, 500);
      }
    } else {
      // Invalid move - shake, decrease mistakes, and reset
      shakeValue.value = withSequence(
        withSpring(-10, { duration: 50 }),
        withSpring(10, { duration: 50 }),
        withSpring(-5, { duration: 50 }),
        withSpring(0, { duration: 50 })
      );
      
      Vibration.vibrate(100);
      
      // Decrease mistakes
      setMistakesLeft(prev => {
        const newMistakes = prev - 1;
        if (newMistakes <= 0) {
          handleMistakesUp();
          return 0;
        }
        return newMistakes;
      });
      
      // Reset to start
      if (tiles.length > 0) {
        const startTile = tiles.find(t => t.isStart)!;
        setCurrentPosition({ row: startTile.row, col: startTile.col });
        setCurrentPath([{ row: startTile.row, col: startTile.col }]);
        setPathStartTime(Date.now());
      }
    }
  };

  // No cleanup needed for mistake-based system

  const handleForfeit = () => {
    if (gameState === 'playing') {
      showModal(
        '🎨 Leave Art Session?',
        "If you leave now, you'll forfeit your chance to study tonight and won't get an artistic reward.",
        '🎨',
        () => {
          router.back();
        }
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
        theme="art"
        subject="Art"
        onComplete={onComplete}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>🎨 Art Study Session! 🖌️</Text>
          
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>🎯 How to Create:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>Navigate from START to GOAL by tapping adjacent tiles</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>Move only to adjacent tiles with the next shade in sequence (use the color key for guidance!)</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>Wrong move = lose 1 chance and reset to START (5 chances per level)</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>Reach the GOAL tile to complete each artistic challenge</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>5.</Text>
              <Text style={styles.stepText}>Complete 3 levels with increasingly complex color progressions!</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.startGameButton} 
            onPress={() => setGameState('playing')}
          >
            <Text style={styles.startGameButtonText}>🎨 Start Creating!</Text>
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
    <View style={[styles.container, {
      padding: ResponsiveSpacing.containerPadding(),
      paddingBottom: ResponsiveSpacing.containerPaddingBottom(),
    }]}>
      <Animated.View style={[styles.gameContainer, shakeStyle]}>
        <Animated.View style={flashStyle} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎨 Art Creation</Text>
          <View style={styles.gameInfo}>
            <Text style={styles.level}>Level {stage}/3</Text>
            <Text style={[styles.mistakes, { color: mistakesLeft <= 2 ? '#ff4d4f' : '#52c41a' }]}>
              ❤️ {mistakesLeft}/5
            </Text>
          </View>
          <Text style={styles.subtitle}>Follow the subtle color gradation path - artistic precision required!</Text>
          
          {/* Color Key - matches current grid colors exactly */}
          <View style={styles.colorKeyContainer}>
            <Text style={styles.colorKeyTitle}>Color Key (Light → Dark or Dark → Light):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorKeyScroll}>
              <View style={styles.colorKeyRow}>
                {tiles.length > 0 && (() => {
                  // Generate the full palette for current stage and show all shades
                  const currentScheme = COLOR_SCHEMES.find(scheme => {
                    const testPalette = generateColorPalette(scheme.hue, stage);
                    return tiles.some(tile => tile.color === testPalette[Math.floor(tile.shadeValue * 2)]);
                  }) || COLOR_SCHEMES[0];
                  
                  const fullPalette = generateColorPalette(currentScheme.hue, stage);
                  
                  // Show the palette with shade values
                  const maxShadeValue = Math.max(...tiles.map(t => t.shadeValue));
                  const numSteps = Math.floor(maxShadeValue * 2) + 1;
                  
                  return Array.from({ length: numSteps }, (_, index) => {
                    const shadeValue = index * 0.5;
                    const paletteIndex = Math.min(fullPalette.length - 1, index);
                    return (
                      <View 
                        key={index} 
                        style={[
                          styles.colorKeySwatch,
                          { backgroundColor: fullPalette[paletteIndex] }
                        ]}
                      >
                        <Text style={styles.colorKeyNumber}>{shadeValue}</Text>
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
                    {isCurrentPosition && <Text style={styles.playerMarker}>🖌️</Text>}
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
      <View style={[styles.footer, {
        gap: ResponsiveSpacing.buttonGap(),
        paddingVertical: ResponsiveSpacing.buttonPadding(),
      }]}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => {
          setGameState('instructions');
        }}>
          <Text style={styles.footerBtnText}>📋 Instructions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, styles.leaveBtn]} onPress={handleForfeit}>
          <Text style={styles.footerBtnText}>🎨 Leave</Text>
        </TouchableOpacity>
       
      

      <GameModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        emoji={modal.emoji}
        onClose={hideModal}
        onConfirm={modal.onConfirm}
      /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2332',
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
  mistakes: {
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