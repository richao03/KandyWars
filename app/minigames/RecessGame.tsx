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
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GYM_JOKERS } from '../../src/utils/jokerEffectEngine';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';

interface RecessGameProps {
  onComplete: () => void;
}

type Gesture = 'rock' | 'paper' | 'scissors';
type GameResult = 'win' | 'lose' | 'tie';

const GESTURES: Gesture[] = ['rock', 'paper', 'scissors'];

// Import images
const GESTURE_IMAGES = {
  rock: require('../../assets/images/rock.png'),
  paper: require('../../assets/images/paper.png'),
  scissors: require('../../assets/images/scissors.png'),
};

export default function RecessGame({ onComplete }: RecessGameProps) {
  const { modal, showModal, hideModal } = useGameModal();

  // Game state
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'countdown', 'playing', 'result', 'jokerSelection', 'computerChoice', 'hint'
  const [debugMode, setDebugMode] = useState(false); // DEBUG: Set to true to see all positions
  const [stage, setStage] = useState(1); // 1, 2, or 3
  const [score, setScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [isFirstRound, setIsFirstRound] = useState(true);
  const [entranceStyleIndex, setEntranceStyleIndex] = useState(0);
  const [playerChoice, setPlayerChoice] = useState<Gesture | null>(null);
  const [computerChoice, setComputerChoice] = useState<Gesture | null>(null);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  // Timer removed - no time pressure
  const [isProcessingRound, setIsProcessingRound] = useState(false);
  const [showComputerPreview, setShowComputerPreview] = useState(false);
  const [hintGesture, setHintGesture] = useState<Gesture | null>(null);
  const [playerTimeLimit, setPlayerTimeLimit] = useState(1500); // Time limit for player choice

  // Animation values
  const countdownScale = useSharedValue(0);
  const countdownOpacity = useSharedValue(0);
  const playerGestureX = useSharedValue(-500);
  const playerGestureY = useSharedValue(0);
  const playerRotation = useSharedValue(90); // Base rotation for player
  const computerGestureX = useSharedValue(Dimensions.get('window').width + 500);
  const computerGestureY = useSharedValue(0);
  const computerRotation = useSharedValue(270); // Base rotation for computer
  const shouldAnimate = useSharedValue(false);

  // Timer refs (countdown and player timeout only)
  // Main game timer removed
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRoundId = useRef<number>(0);

  const screenWidth = Dimensions.get('window').width;

  // Determine winner
  const determineWinner = (player: Gesture, computer: Gesture): GameResult => {
    if (player === computer) return 'tie';

    if (
      (player === 'rock' && computer === 'scissors') ||
      (player === 'paper' && computer === 'rock') ||
      (player === 'scissors' && computer === 'paper')
    ) {
      return 'win';
    }

    return 'lose';
  };

  // Start countdown (full countdown for first round, just "GO!" for subsequent rounds)
  const startCountdown = (forceStage?: number) => {
    setGameState('countdown');
    setPlayerChoice(null);
    setComputerChoice(null);
    setIsProcessingRound(false);
    setHintGesture(null); // Clear any previous hints
    setShowComputerPreview(false); // Clear any previous previews

    // Reset animation positions and rotations (within game area)
    playerGestureX.value = -200;
    playerGestureY.value = 0;
    playerRotation.value = 90;
    computerGestureX.value = 200;
    computerGestureY.value = 0;
    computerRotation.value = 270;

    const animateCountdown = () => {
      countdownScale.value = 0;
      countdownOpacity.value = 1;
      countdownScale.value = withSpring(1, { damping: 2, stiffness: 100 });
      countdownOpacity.value = withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 300 })
      );
    };

    if (isFirstRound) {
      // Full countdown for first round: 3, 2, 1, GO!
      setCountdownNumber(3);
      let count = 3;

      animateCountdown();

      countdownTimerRef.current = setInterval(() => {
        // Check if game is still active
        if (gameState === 'levelComplete' || gameState === 'jokerSelection') {
          if (countdownTimerRef.current)
            clearInterval(countdownTimerRef.current);
          return;
        }

        count--;

        if (count === 0) {
          setCountdownNumber(0); // Show "GO!"
          animateCountdown();
          setIsFirstRound(false); // Mark that first round is done

          setTimeout(() => {
            startPlayingRound(forceStage);
          }, 1000);
        } else if (count > 0) {
          setCountdownNumber(count);
          animateCountdown();
        }
      }, 1000);
    } else {
      // Subsequent rounds: just "GO!"
      setCountdownNumber(0); // Show "GO!"
      animateCountdown();

      setTimeout(() => {
        startPlayingRound(forceStage);
      }, 1000);
    }
  };

  // Start the playing phase with stage-specific mechanics
  const startPlayingRound = (currentStage?: number) => {
    const stageToUse = currentStage ?? stage; // Use passed stage or current stage
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (playerTimeoutRef.current) clearTimeout(playerTimeoutRef.current);

    // Computer makes choice
    const compChoice = GESTURES[Math.floor(Math.random() * 3)];
    setComputerChoice(compChoice);

    if (stageToUse === 1) {
      // Stage 1: Show computer choice briefly, then let player choose
      console.log(
        `🟢 STAGE 1 LOGIC: Setting up computer preview for stage ${stageToUse}`
      );
      setGameState('computerChoice');
      setShowComputerPreview(true);

      setTimeout(() => {
        setShowComputerPreview(false);
        setGameState('playing');
        startPlayerTimeout(2000); // Generous time limit
      }, 1000); // Show computer choice for 1 second
    } else if (stageToUse === 2) {
      // Stage 2: Show hint animation with decoy then real gesture
      console.log(
        'Stage 2: Setting up hint animation - current stage is:',
        stageToUse
      );
      setGameState('hint');

      // Get a decoy gesture (guaranteed different from real gesture)
      const wrongGestures = GESTURES.filter((g) => g !== compChoice);
      const decoyGesture =
        wrongGestures[Math.floor(Math.random() * wrongGestures.length)];

      // Animation sequence: decoy -> real gesture
      setHintGesture(decoyGesture);

      setTimeout(() => {
        setHintGesture(compChoice); // Show real gesture clearly
        setTimeout(() => {
          setHintGesture(null);
          setGameState('playing');
          startPlayerTimeout(1800); // Medium time limit
        }, 800); // Show real gesture for 800ms
      }, 700); // Show decoy for 700ms
    } else {
      // Stage 3: Show hint with 2 decoys then quick flash of real gesture
      console.log(
        'Stage 3: Setting up complex hint animation - current stage is:',
        stageToUse
      );
      setGameState('hint');

      // Get 2 different decoy gestures (both different from real gesture)
      const wrongGestures = GESTURES.filter((g) => g !== compChoice);
      // Shuffle wrong gestures to ensure variety
      const shuffledWrong = [...wrongGestures].sort(() => Math.random() - 0.5);
      const decoy1 = shuffledWrong[0];
      const decoy2 = shuffledWrong[1];

      // Animation sequence: decoy1 -> decoy2 -> real gesture (quick flash)
      setHintGesture(decoy1);

      setTimeout(() => {
        setHintGesture(decoy2);
        setTimeout(() => {
          setHintGesture(compChoice); // Quick flash of real gesture
          setTimeout(() => {
            setHintGesture(null);
            setGameState('playing');
            startPlayerTimeout(1000); // Very short time limit
          }, 200); // Very quick flash (200ms)
        }, 600); // Show second decoy for 600ms
      }, 600); // Show first decoy for 600ms
    }
  };

  // Start player timeout with round ID tracking
  const startPlayerTimeout = (timeLimit: number) => {
    const roundId = ++currentRoundId.current;

    playerTimeoutRef.current = setTimeout(() => {
      if (
        roundId === currentRoundId.current &&
        !playerChoice &&
        gameState === 'playing' &&
        !isProcessingRound
      ) {
        handlePlayerChoice(null); // Time out - player loses
      }
    }, timeLimit);
  };

  // Handle player choice
  const handlePlayerChoice = (choice: Gesture | null) => {
    if (gameState !== 'playing' || playerChoice || isProcessingRound) {
      return;
    }

    setIsProcessingRound(true);
    setPlayerChoice(choice);

    // Increment round ID to invalidate any pending timeouts
    currentRoundId.current++;

    // Clear the player timeout since they made a choice
    if (playerTimeoutRef.current) {
      clearTimeout(playerTimeoutRef.current);
      playerTimeoutRef.current = null;
    }

    if (!choice) {
      // Player timed out
      const newLosses = losses + 1;
      console.log(
        `Player timed out! Losses: ${newLosses}/3 on stage ${stage}`
      );
      setLastResult('lose');
      setLosses(newLosses);

      // Check if player has lost 3 times (game over)
      const isGameOver = newLosses >= 3;
      if (isGameOver) {
        console.log(`💀 3 LOSSES! Game over on stage ${stage}`);
      }

      // Set game state and continue automatically
      setGameState('result');
      shouldAnimate.value = true;
      setRoundsPlayed((prev) => prev + 1);

      // No modal - automatically continue after showing result
      setTimeout(() => {
        if (isGameOver) {
          // Game over - show modal
          showModal(
            '💀 Game Over!',
            'You lost 3 times! Better luck next time!',
            '💀',
            () => {
              router.back();
            },
            false // Non-dismissible - must click to continue
          );
        } else if (gameState !== 'levelComplete' && gameState !== 'jokerSelection') {
          startCountdown();
        }
      }, 2000); // Wait for result animation

      return; // Exit early to prevent duplicate processing
    } else if (computerChoice) {
      const result = determineWinner(choice, computerChoice);
      setLastResult(result);

      let shouldCompleteStage = false;
      let isGameOver = false;

      if (result === 'win') {
        setScore((prev) => prev + 10);
        const newWins = wins + 1;
        setWins(newWins);
        console.log(`Win! Total wins: ${newWins}/4 on stage ${stage}`);

        if (newWins >= 4) {
          shouldCompleteStage = true;
          console.log(`🎉 STAGE COMPLETE! Stage ${stage} done with ${newWins} wins!`);
        } else {
          console.log(`Win ${newWins}/4 on stage ${stage} - need ${4 - newWins} more wins`);
        }
      } else if (result === 'tie') {
        setScore((prev) => prev + 5);
      } else {
        const newLosses = losses + 1;
        console.log(`Loss! Losses: ${newLosses}/3 on stage ${stage}`);
        setLosses(newLosses);

        // Check if player has lost 3 times (game over)
        if (newLosses >= 3) {
          console.log(`💀 3 LOSSES! Game over on stage ${stage}`);
          isGameOver = true;
        }
      }

      // Set game state first
      setGameState('result');

      // Trigger animations using the shared value trigger
      shouldAnimate.value = true;

      setRoundsPlayed((prev) => prev + 1);

      // Show result then start next round or complete stage
      setTimeout(() => {
        // Reset positions to edges of game area (not off-screen)
        playerGestureX.value = -200;
        playerGestureY.value = 0;
        computerGestureX.value = 200;
        computerGestureY.value = 0;

        // Check if stage was just completed (4 wins total)
        if (shouldCompleteStage) {
          console.log(`🎯 Calling handleStageComplete() for stage ${stage} after showing result`);
          handleStageComplete();
        } else if (isGameOver) {
          // Game over - show modal
          console.log(`💀 Showing game over modal after result animation`);
          showModal(
            '💀 Game Over!',
            'You lost 3 times! Better luck next time!',
            '💀',
            () => {
              router.back();
            },
            false // Non-dismissible - must click to continue
          );
        } else if (
          gameState !== 'levelComplete' &&
          gameState !== 'jokerSelection' &&
          !isProcessingRound
        ) {
          startCountdown();
        }
      }, 2000);
    }
  };

  // Handle stage complete
  const handleStageComplete = () => {
    console.log(`🎊 handleStageComplete called for stage ${stage}`);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (playerTimeoutRef.current) clearTimeout(playerTimeoutRef.current);

    // Clear any pending timeouts by setting gameState first
    setGameState('levelComplete');

    if (stage < 3) {
      console.log(`📈 Stage ${stage} < 3, showing advancement modal`);
    } else {
      console.log(`🏆 Stage ${stage} = 3, showing final completion modal`);
    }

    if (stage < 3) {
      const stageNames = ['', 'Beginner', 'Intermediate', 'Expert'];
      const nextStageNames = ['', 'Intermediate', 'Expert', ''];

      showModal(
        `🎉 ${stageNames[stage]} Stage Complete!`,
        `Score: ${score}\nYou got 4 wins in a row!\nReady for ${nextStageNames[stage + 1]} Stage?`,
        '🎉',
        () => {
          let newStage: number;
          setStage((prev) => {
            newStage = prev + 1;
            console.log(`Stage advancing from ${prev} to ${newStage}`);
            return newStage;
          });
          
          // Use setTimeout to ensure state update completes before starting countdown
          setTimeout(() => {
            setRoundsPlayed(0);
            setWins(0); // Reset wins for new stage
            setLosses(0); // Reset losses for new stage
            setIsFirstRound(true); // Reset to show full countdown for new stage
            
            // Pass the new stage to ensure correct stage logic is used
            setTimeout(() => {
              console.log(`🚀 Starting countdown for newly advanced stage: ${newStage}`);
              startCountdown(newStage);
            }, 100); // Additional delay to ensure all state updates
          }, 200); // Increased delay to ensure stage state updates properly
        },
        false // Non-dismissible - must click to continue
      );
    } else {
      showModal(
        '🏆 Rock Paper Scissors Master!',
        `Final Score: ${score}\nYou've mastered all stages!`,
        '🏆',
        () => {
          setGameState('jokerSelection');
        },
        false // Non-dismissible - must click to continue
      );
    }
  };

  // Timer removed - game continues indefinitely until stage completion

  // Start game
  const startGame = () => {
    setGameState('countdown');
    setStage(1);
    setScore(0);
    setRoundsPlayed(0);
    setWins(0);
    setLosses(0);
    setIsFirstRound(true); // Reset first round flag
    setEntranceStyleIndex(0); // Reset entrance style rotation

    startCountdown();
  };

  // Log hint modal display
  useEffect(() => {
    if (gameState === 'hint' && hintGesture) {
      console.log(
        `🎭 HINT MODAL DISPLAYED: Stage ${stage} hint with gesture ${hintGesture}`
      );
    }
    if (gameState === 'computerChoice' && showComputerPreview) {
      console.log(
        `👁️ PREVIEW MODAL DISPLAYED: Stage ${stage} showing computer choice ${computerChoice}`
      );
    }
  }, [gameState, hintGesture, showComputerPreview, stage, computerChoice]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (playerTimeoutRef.current) clearTimeout(playerTimeoutRef.current);
    };
  }, []);

  // Animated styles
  const countdownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownScale.value }],
    opacity: countdownOpacity.value,
  }));

  const playerGestureStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: playerGestureX.value },
      { translateY: playerGestureY.value },
    ],
  }));

  const computerGestureStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: computerGestureX.value },
      { translateY: computerGestureY.value },
    ],
  }));

  const playerImageStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${playerRotation.value}deg` }],
  }));

  const computerImageStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${computerRotation.value}deg` }],
  }));

  // Handle gesture animations with useAnimatedReaction
  useAnimatedReaction(
    () => shouldAnimate.value,
    (animate) => {
      if (animate) {
        // Rotate through entrance styles: 0 -> 1 -> 2 -> 0 -> 1 -> 2...
        const entranceStyle = entranceStyleIndex % 3;

        // Update to next style for next round
        runOnJS(setEntranceStyleIndex)(entranceStyleIndex + 1);

        // All positions are now relative to the center of gameArea
        // Adjust positions so sleeves are at edges when hands come from corners
        // Image is 225x225, sleeve is roughly at 180px from center of image

        if (entranceStyle === 0) {
          // Style 1: Start from corners - sleeve at edge
          // For diagonal at 135°, offset so sleeve touches corner
          playerGestureX.value = -280; // Sleeve at left edge
          playerGestureY.value = -200; // Sleeve at top edge
          computerGestureX.value = 280; // Sleeve at right edge
          computerGestureY.value = 200; // Sleeve at bottom edge

          // Angles for diagonal entrance
          playerRotation.value = 135;
          computerRotation.value = 315;
        } else if (entranceStyle === 1) {
          // Style 2: Opposite corners - sleeve at edge
          playerGestureX.value = -280; // Sleeve at left edge
          playerGestureY.value = 200; // Sleeve at bottom edge
          computerGestureX.value = 280; // Sleeve at right edge
          computerGestureY.value = -200; // Sleeve at top edge

          // Angles for diagonal entrance
          playerRotation.value = 45;
          computerRotation.value = 225;
        } else {
          // Style 3: Straight from sides - sleeve at edge
          playerGestureX.value = -320; // Sleeve at left edge
          playerGestureY.value = 0;
          computerGestureX.value = 320; // Sleeve at right edge
          computerGestureY.value = 0;

          // Standard horizontal rotations
          playerRotation.value = 90;
          computerRotation.value = 270;
        }

        // Animate to final positions within the game area
        // ⚠️ POSITIONING VALUES: These determine where hands end up:
        console.log(
          `🎯 Entrance Style: ${entranceStyle} - ${entranceStyle === 0 ? 'BOTTOM-RIGHT CPU' : entranceStyle === 1 ? 'TOP-RIGHT CPU' : 'CENTER-RIGHT CPU'}`
        );
        if (entranceStyle === 0) {
          // Position in opposite corners of game area
          playerGestureX.value = withSpring(-70, {
            // 🎯 ADJUST: Player X position (moved right 30px total: -100 + 30 = -70)
            damping: 15,
            stiffness: 100,
          }); // Left side of game area
          playerGestureY.value = withSpring(-140, {
            // 🎯 ADJUST: Player Y position (moved up 40px total: -100 - 40 = -140)
            damping: 15,
            stiffness: 100,
          }); // Upper portion
          computerGestureX.value = withSpring(100, {
            // 🎯 ADJUST: CPU X position (moved left 20px: 120 - 20 = 100)
            damping: 15,
            stiffness: 100,
          }); // Right side of game area
          computerGestureY.value = withSpring(100, {
            // 🎯 ADJUST: CPU Y position (reduced to Y=50)
            damping: 15,
            stiffness: 100,
          }); // Lower portion
          console.log('🔥 BOTTOM-RIGHT CPU POSITION SET TO: X=100, Y=100');
        } else if (entranceStyle === 1) {
          // Position in opposite corners (reversed)
          playerGestureX.value = withSpring(-50, {
            // 🎯 ADJUST: Player X position (moved right 30px total: -80 + 30 = -50)
            damping: 15,
            stiffness: 100,
          }); // Left side of game area
          playerGestureY.value = withSpring(0, {
            // 🎯 ADJUST: Player Y position (moved up 40px total: 40 - 40 = 0)
            damping: 15,
            stiffness: 100,
          }); // Lower portion
          computerGestureX.value = withSpring(80, {
            // 🎯 ADJUST: CPU X position
            damping: 15,
            stiffness: 100,
          }); // Right side of game area
          computerGestureY.value = withSpring(-40, {
            // 🎯 ADJUST: CPU Y position
            damping: 15,
            stiffness: 100,
          }); // Upper portion
        } else {
          // Horizontal positions within game area
          playerGestureX.value = withSpring(-50, {
            // 🎯 ADJUST: Player X position (moved right 30px total: -80 + 30 = -50)
            damping: 15,
            stiffness: 100,
          }); // Left side
          playerGestureY.value = withSpring(10, {
            damping: 15,
            stiffness: 100,
          }); // 🎯 ADJUST: Player Y position (moved up 40px total: 50 - 40 = 10)
          computerGestureX.value = withSpring(80, {
            // 🎯 ADJUST: CPU X position
            damping: 15,
            stiffness: 100,
          }); // Right side
          computerGestureY.value = withSpring(-50, {
            // 🎯 ADJUST: CPU Y position (moved up 50px: 0 -> -50)
            damping: 15,
            stiffness: 100,
          });
          console.log('🔥 CENTER-RIGHT CPU POSITION SET TO: X=80, Y=-50');
        }

        // Animate rotations to final positions (maintain entrance angle for diagonals)
        if (entranceStyle === 0) {
          // Top-left/bottom-right diagonal - keep at diagonal angles
          playerRotation.value = withSpring(135, {
            damping: 15,
            stiffness: 100,
          });
          computerRotation.value = withSpring(315, {
            damping: 15,
            stiffness: 100,
          });
        } else if (entranceStyle === 1) {
          // Bottom-left/top-right diagonal - keep at diagonal angles
          playerRotation.value = withSpring(45, {
            damping: 15,
            stiffness: 100,
          });
          computerRotation.value = withSpring(225, {
            damping: 15,
            stiffness: 100,
          });
        } else {
          // Straight entrance - standard horizontal positions
          playerRotation.value = withSpring(90, {
            damping: 15,
            stiffness: 100,
          });
          computerRotation.value = withSpring(270, {
            damping: 15,
            stiffness: 100,
          });
        }

        // Reset the trigger
        shouldAnimate.value = false;
      }
    }
  );

  // Handle forfeit
  const handleForfeit = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (playerTimeoutRef.current) clearTimeout(playerTimeoutRef.current);

    showModal(
      '🏃 Leave Recess?',
      'Abandoning the playground battle?',
      '🏃',
      () => {
        router.back();
      }
    );
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection
        jokers={GYM_JOKERS}
        theme="recess"
        subject="Gym"
        onComplete={onComplete}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>
            ✂️ Rock Paper Scissors Battle! 🪨
          </Text>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>🎮 How to Play:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>🎯</Text>
              <Text style={styles.stepText}>
                Beat the computer at Rock Paper Scissors
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>🔑</Text>
              <Text style={styles.stepText}>
                Choose quickly after countdown - timing matters!
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>⚠️</Text>
              <Text style={styles.stepText}>
                Need 4 wins in a row per stage, 3 losses = game over
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startGameButton} onPress={startGame}>
            <Text style={styles.startGameButtonText}>🎮 Start Battle!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.startGameButton}
            onPress={() => router.back()}
          >
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          padding: ResponsiveSpacing.containerPadding(),
          paddingBottom: 12, // Fixed 12px from bottom
        },
      ]}
    >
      {/* Header */}
      <MinigameHUD
        title="✂️ Rock Paper Scissors! 🪨"
        subtitle={`Round ${roundsPlayed + 1} | Wins: ${wins}/4 | Losses: ${losses}/3`}
        leftInfo={`Stage ${stage}/3`}
        rightInfo={`Score: ${score}`}
        theme="recess"
      />

      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Countdown */}
        {gameState === 'countdown' && (
          <Animated.View
            style={[styles.countdownContainer, countdownAnimatedStyle]}
          >
            <Text style={styles.countdownText}>
              {countdownNumber === 0 ? 'GO!' : countdownNumber}
            </Text>
          </Animated.View>
        )}

        {/* Computer Choice Preview (Stage 1) */}
        {gameState === 'computerChoice' &&
          showComputerPreview &&
          computerChoice && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Computer's Choice!</Text>
              <View style={styles.previewGestureContainer}>
                <Image
                  source={GESTURE_IMAGES[computerChoice]}
                  style={styles.previewGestureImage}
                />
              </View>
              <Text style={styles.previewHint}>Now choose to counter it!</Text>
            </View>
          )}

        {/* Hint Animation (Stage 2 & 3) */}
        {gameState === 'hint' && hintGesture && (
          <View style={styles.hintContainer}>
            <Text style={styles.hintTitle}>
              {stage === 2
                ? "Watch the Computer's Hand..."
                : 'Computer is Thinking...'}
            </Text>
            <View style={styles.hintGestureContainer}>
              <Image
                source={GESTURE_IMAGES[hintGesture]}
                style={styles.hintGestureImage}
              />
            </View>
            <Text style={styles.hintText}>
              {stage === 2
                ? 'Pay attention to the final gesture!'
                : 'Catch the final flash!'}
            </Text>
          </View>
        )}

        {/* Result Display */}
        {gameState === 'result' && (
          <View style={styles.resultContainer}>
            {/* Result Text - Now positioned above gestures */}
            <Text
              style={[
                styles.resultText,
                lastResult === 'win' && styles.winText,
                lastResult === 'lose' && styles.loseText,
                lastResult === 'tie' && styles.tieText,
              ]}
            >
              {lastResult === 'win'
                ? 'YOU WIN!'
                : lastResult === 'lose'
                  ? 'YOU LOSE!'
                  : 'TIE!'}
            </Text>

            {/* Player Choice - with animated rotation */}
            {playerChoice && gameState === 'result' && (
              <Animated.View
                style={[
                  styles.gestureContainer,
                  styles.playerGesture,
                  playerGestureStyle,
                ]}
              >
                <Text style={styles.gestureLabel}>YOU</Text>
                <Animated.Image
                  source={GESTURE_IMAGES[playerChoice]}
                  style={[styles.gestureImage, playerImageStyle]}
                />
              </Animated.View>
            )}

            {/* Computer Choice - with animated rotation */}
            {computerChoice && gameState === 'result' && (
              <Animated.View
                style={[
                  styles.gestureContainer,
                  styles.computerGesture,
                  computerGestureStyle,
                ]}
              >
                <Text style={styles.gestureLabel}>CPU</Text>
                <Animated.Image
                  source={GESTURE_IMAGES[computerChoice]}
                  style={[styles.gestureImage, computerImageStyle]}
                />
              </Animated.View>
            )}
          </View>
        )}
      </View>

      {/* Choice Buttons */}
      <View style={styles.choiceContainer}>
        <TouchableOpacity
          style={[
            styles.choiceButton,
            playerChoice === 'rock' && styles.selectedChoice,
            gameState !== 'playing' && { opacity: 0.5 },
          ]}
          onPress={() => handlePlayerChoice('rock')}
          disabled={gameState !== 'playing'}
        >
          <Image source={GESTURE_IMAGES.rock} style={styles.choiceImage} />
          <Text style={styles.choiceText}>ROCK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.choiceButton,
            playerChoice === 'paper' && styles.selectedChoice,
            gameState !== 'playing' && { opacity: 0.5 },
          ]}
          onPress={() => handlePlayerChoice('paper')}
          disabled={gameState !== 'playing'}
        >
          <Image source={GESTURE_IMAGES.paper} style={styles.choiceImage} />
          <Text style={styles.choiceText}>PAPER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.choiceButton,
            playerChoice === 'scissors' && styles.selectedChoice,
            gameState !== 'playing' && { opacity: 0.5 },
          ]}
          onPress={() => handlePlayerChoice('scissors')}
          disabled={gameState !== 'playing'}
        >
          <Image source={GESTURE_IMAGES.scissors} style={styles.choiceImage} />
          <Text style={styles.choiceText}>SCISSORS</Text>
        </TouchableOpacity>
      </View>

      {/* DEBUG: Show all 6 gesture positions */}
      {debugMode && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>DEBUG: All Hand Positions</Text>

          {/* Style 0: Diagonal corners */}
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>
              Style 0 (corners): Player(-80,-40) CPU(90,50)
            </Text>
            <View
              style={[styles.debugHand, { left: -80 + 100, top: -40 + 50 }]}
            >
              <Image source={GESTURE_IMAGES.rock} style={styles.debugImage} />
              <Text style={styles.debugText}>P</Text>
            </View>
            <View style={[styles.debugHand, { left: 90 + 100, top: 50 + 50 }]}>
              <Image source={GESTURE_IMAGES.rock} style={styles.debugImage} />
              <Text style={styles.debugText}>C</Text>
            </View>
          </View>

          {/* Style 1: Opposite diagonal corners */}
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>
              Style 1 (opposite): Player(-80,40) CPU(80,-40)
            </Text>
            <View style={[styles.debugHand, { left: -80 + 100, top: 40 + 50 }]}>
              <Image source={GESTURE_IMAGES.paper} style={styles.debugImage} />
              <Text style={styles.debugText}>P</Text>
            </View>
            <View style={[styles.debugHand, { left: 80 + 100, top: -40 + 50 }]}>
              <Image source={GESTURE_IMAGES.paper} style={styles.debugImage} />
              <Text style={styles.debugText}>C</Text>
            </View>
          </View>

          {/* Style 2: Horizontal */}
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>
              Style 2 (horizontal): Player(-80,0) CPU(80,0)
            </Text>
            <View style={[styles.debugHand, { left: -80 + 100, top: 0 + 50 }]}>
              <Image
                source={GESTURE_IMAGES.scissors}
                style={styles.debugImage}
              />
              <Text style={styles.debugText}>P</Text>
            </View>
            <View style={[styles.debugHand, { left: 80 + 100, top: 0 + 50 }]}>
              <Image
                source={GESTURE_IMAGES.scissors}
                style={styles.debugImage}
              />
              <Text style={styles.debugText}>C</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.debugToggle}
            onPress={() => setDebugMode(false)}
          >
            <Text style={styles.debugToggleText}>Hide Debug</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Buttons */}
      <View
        style={[
          styles.bottomButtons,
          {
            gap: ResponsiveSpacing.buttonGap(),
            paddingVertical: 0, // Remove vertical padding
          },
        ]}
      >
        <TouchableOpacity style={styles.bottomButton} onPress={handleForfeit}>
          <Text style={styles.bottomButtonText}>🚪 Leave</Text>
        </TouchableOpacity>
      </View>

      <GameModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        emoji={modal.emoji}
        onClose={hideModal}
        onConfirm={modal.onConfirm}
        dismissible={modal.dismissible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#6BB6E3',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90C1',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    marginBottom: 8,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  level: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  score: {
    fontSize: 16,
    color: '#FFD700',
    fontFamily: 'CrayonPastel',
  },
  timer: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  rounds: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8, // Very small bottom margin
    marginHorizontal: 16,
    borderWidth: 3,
    borderColor: '#4A90C1',
    borderRadius: 20,
    backgroundColor: 'rgba(107, 182, 227, 0.1)', // Very light blue tint
    overflow: 'hidden', // Clip images at the border
  },
  countdownContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
  },
  resultContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gestureContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  playerGesture: {
    left: 0,
    top: '30%',
    zIndex: 2,
  },
  computerGesture: {
    left: '15%', // Changed from right: 0 to left: 0 so translateX works properly
    top: '-5%',
    zIndex: 2,
  },
  gestureLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    marginBottom: 8,
  },
  gestureImage: {
    width: 225,
    height: 225,
    resizeMode: 'contain',
  },
  resultText: {
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 1000,
    transform: [{ translateY: -24 }], // Half of font size to center vertically
  },
  winText: {
    color: '#4CAF50',
  },
  loseText: {
    color: '#F44336',
  },
  tieText: {
    color: '#FFC107',
  },
  // Preview styles (Stage 1)
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    marginBottom: 10,
    textAlign: 'center',
  },
  previewGestureContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#2E7D32',
  },
  previewGestureImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  previewHint: {
    fontSize: 16,
    color: '#E8F5E8',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Hint styles (Stage 2)
  hintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    borderWidth: 3,
    borderColor: '#FF9800',
  },
  hintTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    marginBottom: 10,
    textAlign: 'center',
  },
  hintGestureContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#F57C00',
  },
  hintGestureImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  hintText: {
    fontSize: 14,
    color: '#FFF3E0',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  choiceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8, // Further reduced
    backgroundColor: '#6BB6E3',
    borderTopWidth: 3,
    borderTopColor: '#4A90C1',
    marginTop: 4, // Small gap from game area
  },
  choiceButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10, // Reduced from 12
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#4A90C1',
  },
  selectedChoice: {
    backgroundColor: '#FFD700',
    borderColor: '#FFA500',
  },
  choiceImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A90C1',
    fontFamily: 'CrayonPastel',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 0, // Removed all padding
    marginTop: 8, // Small margin from choice buttons
  },
  bottomButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D84747',
  },
  bottomButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  // Instructions styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#87CEEB',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#4A90C1',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionsCard: {
    backgroundColor: '#6BB6E3',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#4A90C1',
    marginBottom: 20,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
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
    color: '#FFD700',
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
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#388E3C',
    alignItems: 'center',
    marginBottom: 16,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  // DEBUG STYLES
  debugContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    zIndex: 1000,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
  },
  debugRow: {
    position: 'relative',
    height: 100,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    padding: 10,
  },
  debugLabel: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'CrayonPastel',
    marginBottom: 10,
  },
  debugHand: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
  },
  debugImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  debugText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '700',
    position: 'absolute',
    bottom: -12,
  },
  debugToggle: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  debugToggleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
});
