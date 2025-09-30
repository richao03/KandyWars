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
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { RECESS_JOKERS } from '../../src/utils/jokerEffectEngine';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';
import PixelBorder from '../components/PixelBorder';
import TextWithEmojis from '../components/TextWithEmojis';

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

// ===== ANIMATION CONFIGURATION =====
// Spring physics settings
const SPRING_CONFIG = {
  damping: 25, // Higher = less bouncy (15-30 recommended)
  stiffness: 170, // Higher = quicker settling (100-200 recommended)
};

// Countdown animation settings
const COUNTDOWN_CONFIG = {
  damping: 2, // Countdown scale bounce
  stiffness: 100, // Countdown scale speed
  showDuration: 700, // How long countdown number shows (ms)
  fadeDuration: 300, // How long countdown fades out (ms)
};

// Stage-specific timing settings (in milliseconds)
const STAGE_TIMINGS = {
  stage1: {
    computerPreviewDuration: 1000, // How long to show computer choice
    playerTimeLimit: 2000, // Time limit for player choice
  },
  stage2: {
    decoyDuration: 700, // How long to show decoy gesture
    realGestureDuration: 800, // How long to show real gesture
    playerTimeLimit: 1800, // Time limit for player choice
  },
  stage3: {
    firstDecoyDuration: 600, // How long to show first decoy
    secondDecoyDuration: 600, // How long to show second decoy
    realGestureFlash: 200, // Very quick flash of real gesture
    playerTimeLimit: 1000, // Time limit for player choice
  },
  resultDisplayDuration: 2000, // How long to show result before next round
};

// Hand positions for each entrance style
// Adjust these to control where hands end up
const HAND_POSITIONS = {
  // Style 0: Diagonal positioning (player top-left, CPU bottom-right)
  style0: {
    player: { x: -58, y: -175 }, // Negative X = left, Negative Y = up
    cpu: { x: 122, y: 145 }, // Positive X = right, Positive Y = down
  },
  // Style 1: Reversed diagonal (player bottom-left, CPU top-right)
  style1: {
    player: { x: -59, y: 55 },
    cpu: { x: 93, y: -76 },
  },
  // Style 2: Horizontal (both centered vertically)
  style2: {
    player: { x: -49, y: 0 },
    cpu: { x: 98, y: 0 },
  },
};

// Rotation angles for each entrance style
const HAND_ROTATIONS = {
  style0: { player: 135, cpu: 315 }, // Diagonal angles
  style1: { player: 45, cpu: 225 }, // Opposite diagonal
  style2: { player: 90, cpu: 270 }, // Facing each other horizontally
};

export default function RecessGame({ onComplete }: RecessGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { trackMinigamePlayed } = useScoreboard();
  const { trackMinigamePlayed: trackMinigameProgress } = useMinigameTracking();

  // Game state
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'countdown', 'playing', 'result', 'jokerSelection', 'computerChoice', 'hint'
  const [debugMode, setDebugMode] = useState(false); // DEBUG: Set to true to see all positions
  const [stage, setStage] = useState(1); // 1, 2, or 3
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed
  const [score, setScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [countdownNumber, setCountdownNumber] = useState(3);
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
  const [showTimerLine, setShowTimerLine] = useState(false);

  // Animation values
  const countdownScale = useSharedValue(0);
  const countdownOpacity = useSharedValue(0);
  const timerLineWidth = useSharedValue(1);
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
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRoundId = useRef<number>(0);
  const gameStateRef = useRef(gameState);
  const playerChoiceRef = useRef(playerChoice);
  const isProcessingRoundRef = useRef(isProcessingRound);

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
  const startCountdown = (
    forceStage?: number,
    currentRoundsPlayed?: number
  ) => {
    setGameState('countdown');
    setPlayerChoice(null);
    setComputerChoice(null);
    setIsProcessingRound(false);
    setHintGesture(null); // Clear any previous hints
    setShowComputerPreview(false); // Clear any previous previews
    setShowTimerLine(false); // Clear any previous timer

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
      countdownScale.value = withSpring(1, {
        damping: COUNTDOWN_CONFIG.damping,
        stiffness: COUNTDOWN_CONFIG.stiffness,
      });
      countdownOpacity.value = withSequence(
        withTiming(1, { duration: COUNTDOWN_CONFIG.showDuration }),
        withTiming(0, { duration: COUNTDOWN_CONFIG.fadeDuration })
      );
    };

    // Only show full countdown (3,2,1,GO) for first round of each stage
    // All other rounds just show "GO!"
    const roundsToCheck =
      currentRoundsPlayed !== undefined ? currentRoundsPlayed : roundsPlayed;
    const isFirstRoundOfStage = roundsToCheck === 0;

    if (isFirstRoundOfStage) {
      // Full countdown: 3, 2, 1, GO!
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

          setTimeout(() => {
            startPlayingRound(forceStage);
          }, 1000);
        } else if (count > 0) {
          setCountdownNumber(count);
          animateCountdown();
        }
      }, 1000);
    } else {
      // Just show "GO!" for subsequent rounds
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
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);

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
        startPlayerTimeout(STAGE_TIMINGS.stage1.playerTimeLimit);
      }, STAGE_TIMINGS.stage1.computerPreviewDuration);
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
          startPlayerTimeout(STAGE_TIMINGS.stage2.playerTimeLimit);
        }, STAGE_TIMINGS.stage2.realGestureDuration);
      }, STAGE_TIMINGS.stage2.decoyDuration);
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
            startPlayerTimeout(STAGE_TIMINGS.stage3.playerTimeLimit);
          }, STAGE_TIMINGS.stage3.realGestureFlash);
        }, STAGE_TIMINGS.stage3.secondDecoyDuration);
      }, STAGE_TIMINGS.stage3.firstDecoyDuration);
    }
  };

  // Start player timeout with round ID tracking
  const startPlayerTimeout = (timeLimit: number) => {
    const roundId = ++currentRoundId.current;
    console.log(
      `⏱️ Starting player timeout: ${timeLimit}ms, roundId: ${roundId}`
    );

    // Show and animate timer line
    setShowTimerLine(true);
    timerLineWidth.value = 1;
    timerLineWidth.value = withTiming(0, { duration: timeLimit });

    playerTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Player timeout fired:', {
        roundId,
        currentRoundId: currentRoundId.current,
        roundIdMatch: roundId === currentRoundId.current,
        playerChoice: playerChoiceRef.current,
        gameState: gameStateRef.current,
        isProcessingRound: isProcessingRoundRef.current,
      });

      if (
        roundId === currentRoundId.current &&
        !playerChoiceRef.current &&
        gameStateRef.current === 'playing' &&
        !isProcessingRoundRef.current
      ) {
        console.log('⏰ Player timed out - calling handlePlayerChoice(null)');
        setShowTimerLine(false);
        handlePlayerChoice(null); // Time out - player loses
      } else {
        console.log('⏰ Timeout conditions not met - skipping loss');
      }
    }, timeLimit);
  };

  // Handle player choice
  const handlePlayerChoice = (choice: Gesture | null) => {
    console.log('🎮 handlePlayerChoice called:', {
      choice,
      gameState,
      gameStateRef: gameStateRef.current,
      playerChoice,
      playerChoiceRef: playerChoiceRef.current,
      isProcessingRound,
      isProcessingRoundRef: isProcessingRoundRef.current,
    });

    // Use refs for timeout calls to get current state
    if (
      gameStateRef.current !== 'playing' ||
      playerChoiceRef.current ||
      isProcessingRoundRef.current
    ) {
      console.log('🎮 Blocking handlePlayerChoice - conditions not met');
      return;
    }

    console.log('🎮 Processing choice:', choice);
    if (choice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    // Hide timer line
    setShowTimerLine(false);

    if (!choice) {
      // Player timed out - use functional update to avoid stale state
      let isGameOver = false;
      setLosses((currentLosses) => {
        const newLosses = currentLosses + 1;
        console.log(
          `Player timed out! Losses: ${newLosses}/3 on stage ${stage}`
        );

        // Check if player has lost 3 times (game over)
        isGameOver = newLosses >= 3;
        if (isGameOver) {
          console.log(`💀 3 LOSSES! Game over on stage ${stage}`);
        }

        return newLosses;
      });
      setLastResult('lose');

      if (isGameOver) {
        console.log(`💀 3 LOSSES! Game over on stage ${stage}`);
      }

      // Set game state and continue automatically
      setGameState('result');
      shouldAnimate.value = true;
      const newRoundsPlayed = roundsPlayed + 1;
      setRoundsPlayed(newRoundsPlayed);

      // No modal - automatically continue after showing result
      // Clear any existing result timeout to prevent duplicates
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }

      resultTimeoutRef.current = setTimeout(() => {
        resultTimeoutRef.current = null;
        if (isGameOver) {
          // Game over - check if player completed any stage
          if (completedLevel > 0) {
            // Player completed at least one stage, award jokers based on completion
            setGameState('jokerSelection');
          } else {
            // Player didn't complete any stage, show restart option
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showModal(
              'Game Over!',
              'You lost 3 times! Try again from Stage 1?',
              '💀',
              () => {
                setStage(1);
                setScore(0);
                setRoundsPlayed(0);
                setWins(0);
                setLosses(0);
                startCountdown();
              },
              false // Non-dismissible - must click to continue
            );
          }
        } else if (
          gameStateRef.current !== 'levelComplete' &&
          gameStateRef.current !== 'jokerSelection'
        ) {
          console.log('🔄 Starting next countdown after timeout loss');
          startCountdown(undefined, newRoundsPlayed);
        } else {
          console.log(
            '⏹️ Not starting countdown - gameState:',
            gameStateRef.current
          );
        }
      }, STAGE_TIMINGS.resultDisplayDuration);

      return; // Exit early to prevent duplicate processing
    } else if (computerChoice) {
      const result = determineWinner(choice, computerChoice);
      setLastResult(result);

      let shouldCompleteStage = false;
      let isGameOver = false;

      if (result === 'win') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScore((prev) => prev + 10);
        const newWins = wins + 1;
        setWins(newWins);
        console.log(`Win! Total wins: ${newWins}/4 on stage ${stage}`);

        if (newWins >= 4) {
          shouldCompleteStage = true;
          console.log(
            `🎉 STAGE COMPLETE! Stage ${stage} done with ${newWins} wins!`
          );
        } else {
          console.log(
            `Win ${newWins}/4 on stage ${stage} - need ${4 - newWins} more wins`
          );
        }
      } else if (result === 'tie') {
        setScore((prev) => prev + 5);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLosses((currentLosses) => {
          const newLosses = currentLosses + 1;
          console.log(`Loss! Losses: ${newLosses}/3 on stage ${stage}`);

          // Check if player has lost 3 times (game over)
          if (newLosses >= 3) {
            console.log(`💀 3 LOSSES! Game over on stage ${stage}`);
            isGameOver = true;
          }

          return newLosses;
        });
      }

      // Set game state first
      setGameState('result');

      // Trigger animations using the shared value trigger
      shouldAnimate.value = true;

      const newRoundsPlayed = roundsPlayed + 1;
      setRoundsPlayed(newRoundsPlayed);

      // Show result then start next round or complete stage
      // Clear any existing result timeout to prevent duplicates
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }

      resultTimeoutRef.current = setTimeout(() => {
        resultTimeoutRef.current = null;
        // Check if stage was just completed (4 wins total)
        if (shouldCompleteStage) {
          console.log(
            `🎯 Calling handleStageComplete() for stage ${stage} after showing result`
          );
          handleStageComplete();
        } else if (isGameOver) {
          // Game over - check if player completed any stage
          console.log(`💀 Showing game over modal after result animation`);
          if (completedLevel > 0) {
            // Player completed at least one stage, award jokers based on completion
            setGameState('jokerSelection');
          } else {
            // Player didn't complete any stage, show restart option
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showModal(
              'Game Over!',
              'You lost 3 times! Try again from Stage 1?',
              '💀',
              () => {
                setStage(1);
                setScore(0);
                setRoundsPlayed(0);
                setWins(0);
                setLosses(0);
                startCountdown();
              },
              false // Non-dismissible - must click to continue
            );
          }
        } else if (
          gameStateRef.current !== 'levelComplete' &&
          gameStateRef.current !== 'jokerSelection' &&
          !isProcessingRoundRef.current
        ) {
          // Reset positions to edges of game area (not off-screen)
          playerGestureX.value = -200;
          playerGestureY.value = 0;
          computerGestureX.value = 200;
          computerGestureY.value = 0;
          startCountdown(undefined, newRoundsPlayed);
        }
      }, STAGE_TIMINGS.resultDisplayDuration);
    }
  };

  // Handle stage complete
  const handleStageComplete = () => {
    console.log(`🎊 handleStageComplete called for stage ${stage}`);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (playerTimeoutRef.current) clearTimeout(playerTimeoutRef.current);
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);

    // Mark this stage as completed
    setCompletedLevel(stage);

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
        `${stageNames[stage]} Stage Complete!`,
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

            // Pass the new stage to ensure correct stage logic is used
            setTimeout(() => {
              console.log(
                `🚀 Starting countdown for newly advanced stage: ${newStage}`
              );
              startCountdown(newStage);
            }, 100); // Additional delay to ensure all state updates
          }, 200); // Increased delay to ensure stage state updates properly
        },
        false // Non-dismissible - must click to continue
      );
    } else {
      showModal(
        'Rock Paper Scissors Master!',
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Track minigame play for analytics
    trackMinigamePlayed('recess');
    trackMinigameProgress('recess');

    setGameState('countdown');
    setStage(1);
    setScore(0);
    setRoundsPlayed(0);
    setWins(0);
    setLosses(0);
    setEntranceStyleIndex(0); // Reset entrance style rotation

    startCountdown();
  };

  // Keep refs in sync with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    playerChoiceRef.current = playerChoice;
  }, [playerChoice]);

  useEffect(() => {
    isProcessingRoundRef.current = isProcessingRound;
  }, [isProcessingRound]);

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
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
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

  const timerLineStyle = useAnimatedStyle(() => ({
    width: `${timerLineWidth.value * 100}%`,
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
          // Style 1: Start from corners - arms hidden within game area
          // For diagonal at 135°, start from true diagonal corner for angled entrance
          playerGestureX.value = -220; // Start further out diagonally
          playerGestureY.value = -180; // Start further out diagonally
          computerGestureX.value = 200; // Start further out diagonally for angled entrance
          computerGestureY.value = 200; // Start further out diagonally for angled entrance

          // Angles for diagonal entrance
          playerRotation.value = 135;
          computerRotation.value = 315;
        } else if (entranceStyle === 1) {
          // Style 2: Opposite corners - arms hidden within game area
          playerGestureX.value = -180; // Arm hidden within left edge
          playerGestureY.value = 150; // Arm hidden within bottom edge
          computerGestureX.value = 180; // Arm hidden within right edge
          computerGestureY.value = -150; // Arm hidden within top edge

          // Angles for diagonal entrance
          playerRotation.value = 45;
          computerRotation.value = 225;
        } else {
          // Style 3: Straight from sides - arms hidden within game area
          playerGestureX.value = -200; // Arm hidden within left edge
          playerGestureY.value = 0;
          computerGestureX.value = 200; // Arm hidden within right edge
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
          playerGestureX.value = withSpring(
            HAND_POSITIONS.style0.player.x,
            SPRING_CONFIG
          );
          playerGestureY.value = withSpring(
            HAND_POSITIONS.style0.player.y,
            SPRING_CONFIG
          );
          computerGestureX.value = withSpring(
            HAND_POSITIONS.style0.cpu.x,
            SPRING_CONFIG
          );
          computerGestureY.value = withSpring(
            HAND_POSITIONS.style0.cpu.y,
            SPRING_CONFIG
          );
          console.log(
            `🔥 BOTTOM-RIGHT CPU POSITION SET TO: X=${HAND_POSITIONS.style0.cpu.x}, Y=${HAND_POSITIONS.style0.cpu.y}`
          );
        } else if (entranceStyle === 1) {
          // Position in opposite corners (reversed)
          playerGestureX.value = withSpring(
            HAND_POSITIONS.style1.player.x,
            SPRING_CONFIG
          );
          playerGestureY.value = withSpring(
            HAND_POSITIONS.style1.player.y,
            SPRING_CONFIG
          );
          computerGestureX.value = withSpring(
            HAND_POSITIONS.style1.cpu.x,
            SPRING_CONFIG
          );
          computerGestureY.value = withSpring(
            HAND_POSITIONS.style1.cpu.y,
            SPRING_CONFIG
          );
        } else {
          // Horizontal positions within game area
          playerGestureX.value = withSpring(
            HAND_POSITIONS.style2.player.x,
            SPRING_CONFIG
          );
          playerGestureY.value = withSpring(
            HAND_POSITIONS.style2.player.y,
            SPRING_CONFIG
          );
          computerGestureX.value = withSpring(
            HAND_POSITIONS.style2.cpu.x,
            SPRING_CONFIG
          );
          computerGestureY.value = withSpring(
            HAND_POSITIONS.style2.cpu.y,
            SPRING_CONFIG
          );
          console.log(
            `🔥 CENTER-RIGHT CPU POSITION SET TO: X=${HAND_POSITIONS.style2.cpu.x}, Y=${HAND_POSITIONS.style2.cpu.y}`
          );
        }

        // Animate rotations to final positions (maintain entrance angle for diagonals)
        if (entranceStyle === 0) {
          // Top-left/bottom-right diagonal - keep at diagonal angles
          playerRotation.value = withSpring(
            HAND_ROTATIONS.style0.player,
            SPRING_CONFIG
          );
          computerRotation.value = withSpring(
            HAND_ROTATIONS.style0.cpu,
            SPRING_CONFIG
          );
        } else if (entranceStyle === 1) {
          // Bottom-left/top-right diagonal - keep at diagonal angles
          playerRotation.value = withSpring(
            HAND_ROTATIONS.style1.player,
            SPRING_CONFIG
          );
          computerRotation.value = withSpring(
            HAND_ROTATIONS.style1.cpu,
            SPRING_CONFIG
          );
        } else {
          // Straight entrance - standard horizontal positions
          playerRotation.value = withSpring(
            HAND_ROTATIONS.style2.player,
            SPRING_CONFIG
          );
          computerRotation.value = withSpring(
            HAND_ROTATIONS.style2.cpu,
            SPRING_CONFIG
          );
        }

        // Reset the trigger
        shouldAnimate.value = false;
      }
    }
  );

  // Handle forfeit
  const handleForfeit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (playerTimeoutRef.current) clearTimeout(playerTimeoutRef.current);

    showModal(
      'Leave Recess?',
      'Abandoning the playground battle?',
      '🚪',
      () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.back();
      },
      false,
      true
    );
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection
        jokers={RECESS_JOKERS}
        theme="recess"
        subject="Recess"
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
          <Text style={styles.instructionsTitle}>
            Rock Paper Scissors Battle!
          </Text>

          <PixelBorder
            borderColor="#4A90C1"
            borderWidth={3}
            backgroundColor="#6BB6E3"
            innerPadding={20}
            style={{ marginBottom: 20, width: '100%' }}
          >
            <Text style={styles.instructionsHeader}>How to Play:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>
                Beat the computer at Rock Paper Scissors
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Choose quickly after countdown - timing matters!
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>
                Need 4 wins in a row per stage, 3 losses = game over
              </Text>
            </View>
          </PixelBorder>

          <PixelBorder
            borderColor="#388E3C"
            borderWidth={3}
            backgroundColor="#4CAF50"
            innerPadding={0}
            style={{ marginBottom: 16 }}
          >
            <TouchableOpacity
              style={styles.pixelButtonInner}
              onPress={startGame}
            >
              <Text style={styles.startGameButtonText}>Start Battle!</Text>
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
        title="Rock Paper Scissors"
        subtitle={``}
        leftInfo={`Stage ${stage}/3`}
        centerInfo={`Losses:${losses}/3`}
        rightInfo={`Wins:${wins}/4 `}
        theme="recess"
      />

      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Timer Line */}
        {showTimerLine && (
          <View style={styles.timerContainer}>
            <Animated.View style={[styles.timerLine, timerLineStyle]} />
          </View>
        )}

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
        <PixelBorder
          borderColor="#4A90C1"
          borderWidth={3}
          backgroundColor="#6BB6E3"
          innerPadding={0}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.bottomButtonInner}
            onPress={handleForfeit}
          >
            <TextWithEmojis style={styles.bottomButtonText} imageSize={28}>
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
        dismissible={modal.dismissible}
        showCancelButton={modal.showCancelButton}
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
  },
  score: {
    fontSize: 16,
    color: '#FFD700',
    fontFamily: 'PixeloidMono',
  },
  timer: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'PixeloidMono',
  },
  rounds: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 0, // Removed all padding
    marginTop: 8, // Small margin from choice buttons
  },
  bottomButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    color: '#FFD700',
    fontFamily: 'PixeloidMono',
    marginRight: 10,
    minWidth: 20,
    lineHeight: 22,
  },
  stepText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
  },
  pixelButtonInner: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    backgroundColor: 'transparent',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
  },
  // Timer line styles
  timerContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    zIndex: 100,
  },
  timerLine: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 3,
  },
});
