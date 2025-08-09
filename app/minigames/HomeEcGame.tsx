import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import JokerSelection from '../components/JokerSelection';

interface HomeEcGameProps {
  onComplete: () => void;
}

// Available candy types
const CANDY_TYPES = ['🍭', '🍬', '🧁', '🍫'];
const TARGET_POSITIONS = {
  '🍭': 'up',
  '🍬': 'right', 
  '🧁': 'down',
  '🍫': 'left',
} as const;

// Home Economics jokers
const HOME_EC_JOKERS = [
  { id: 1, name: "Master Recipe", description: "Double sorting points for 10 seconds" },
  { id: 2, name: "Time Freeze", description: "Slow down kitchen rush for 15 seconds" },
  { id: 3, name: "Extra Prep Time", description: "Add 30 seconds to cooking timer" },
  { id: 4, name: "Perfect Technique", description: "Next 5 sorts are automatically perfect" },
  { id: 5, name: "Crystal Ball", description: "See next 10 ingredients coming" },
  { id: 6, name: "Lightning Hands", description: "Super fast sorting reflexes for 20 seconds" },
  { id: 7, name: "Forgiveness", description: "Ignore next 3 sorting mistakes" },
  { id: 8, name: "Ingredient Rain", description: "Bonus points for perfect combos" },
];

export default function HomeEcGame({ onComplete }: HomeEcGameProps) {
  // Game state
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [centerCandy, setCenterCandy] = useState('');
  const [nextCandy, setNextCandy] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackPosition, setFeedbackPosition] = useState<{x: string, y: string} | null>(null);
  const [isFlying, setIsFlying] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Level configurations
  const getLevelConfig = (levelNum: number) => {
    switch (levelNum) {
      case 1: return { matches: 10, time: 15, name: 'Apprentice Chef' };
      case 2: return { matches: 12, time: 15, name: 'Sous Chef' };
      case 3: return { matches: 15, time: 15, name: 'Master Chef' };
      default: return { matches: 10, time: 15, name: 'Apprentice Chef' };
    }
  };

  // Generate random candy
  const generateCandy = () => CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];

  // Start new candy
  const startNewCandy = useCallback(() => {
    if (nextCandy) {
      setCenterCandy(nextCandy);
    } else {
      setCenterCandy(generateCandy());
    }
    setNextCandy(generateCandy());
    
    // Reset animation values
    translateX.value = 0;
    translateY.value = 0;
    opacity.value = 1;
    setIsFlying(false);
  }, [nextCandy, translateX, translateY, opacity]);

  // Handle swipe
  const handleSwipe = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isFlying || !centerCandy || gameState !== 'playing') return;

    const correctDirection = TARGET_POSITIONS[centerCandy as keyof typeof TARGET_POSITIONS];
    const isCorrect = direction === correctDirection;
    
    setIsFlying(true);

    // Animate candy flying to edge and set feedback position
    let targetX = 0;
    let targetY = 0;
    
    switch (direction) {
      case 'up': 
        targetY = -300;
        setFeedbackPosition({ x: '50%', y: '10%' });
        break;
      case 'down': 
        targetY = 300;
        setFeedbackPosition({ x: '50%', y: '85%' });
        break;
      case 'left': 
        targetX = -200;
        setFeedbackPosition({ x: '15%', y: '50%' });
        break;
      case 'right': 
        targetX = 200;
        setFeedbackPosition({ x: '85%', y: '50%' });
        break;
    }

    translateX.value = withTiming(targetX, { duration: 250 });
    translateY.value = withTiming(targetY, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 });

    // Show feedback and update score
    if (isCorrect) {
      setScore(prev => {
        const newScore = prev + 1;
        const levelConfig = getLevelConfig(level);
        
        if (newScore >= levelConfig.matches) {
          // Level complete
          if (timerRef.current) clearInterval(timerRef.current);
          
          if (level < 3) {
            setTimeout(() => {
              Alert.alert(
                `🎉 Level ${level} Complete!`,
                `Ready for Level ${level + 1}?`,
                [{ text: 'Next Level', onPress: startNextLevel }]
              );
            }, 600);
          } else {
            setTimeout(() => {
              Alert.alert(
                '🏆 All Levels Complete!',
                'Amazing work, Master Chef!',
                [{ text: 'Choose Reward', onPress: () => setGameState('jokerSelection') }]
              );
            }, 600);
          }
        }
        
        return newScore;
      });
      setFeedback('✅ +1');
    } else {
      setScore(prev => Math.max(0, prev - 1)); // Subtract 1 but don't go below 0
      setFeedback('❌ -1');
    }

    // Start new candy after brief delay to let first candy fly
    setTimeout(() => {
      startNewCandy();
    }, 200);
    
    // Clear feedback after candy flies away
    setTimeout(() => {
      setFeedback('');
      setFeedbackPosition(null);
    }, 400);

  }, [isFlying, centerCandy, gameState, level, startNewCandy]);

  // Gesture handler
  const gestureHandler = useAnimatedGestureHandler({
    onEnd: (event) => {
      'worklet';
      const { translationX, translationY } = event;
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      if (absX > 50 || absY > 50) {
        let direction: 'up' | 'down' | 'left' | 'right';
        
        if (absX > absY) {
          direction = translationX > 0 ? 'right' : 'left';
        } else {
          direction = translationY > 0 ? 'down' : 'up';
        }
        
        runOnJS(handleSwipe)(direction);
      }
    },
  });

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setTimeLeft(15);
    setFeedback('');
    startNewCandy();
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          Alert.alert(
            '⏰ Time Up!',
            'Try again from Level 1?',
            [
              { text: 'Give Up', onPress: () => router.back(), style: 'destructive' },
              { text: 'Restart', onPress: restartGame }
            ]
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startNewCandy]);

  // Start next level
  const startNextLevel = useCallback(() => {
    setLevel(prev => prev + 1);
    setScore(0);
    setTimeLeft(15);
    startNewCandy();
    
    // Restart timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          Alert.alert(
            '⏰ Time Up!',
            'Try again from Level 1?',
            [
              { text: 'Give Up', onPress: () => router.back(), style: 'destructive' },
              { text: 'Restart', onPress: restartGame }
            ]
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startNewCandy]);

  // Restart game
  const restartGame = useCallback(() => {
    setGameState('instructions');
    setLevel(1);
    setScore(0);
    setTimeLeft(15);
    setFeedback('');
    setFeedbackPosition(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // Initialize first candies
  useEffect(() => {
    if (gameState === 'playing' && !centerCandy) {
      startNewCandy();
    }
  }, [gameState, centerCandy, startNewCandy]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // Animated style for center candy
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  // Handle forfeit
  const handleForfeit = () => {
    if (gameState === 'playing') {
      Alert.alert(
        '🚪 Leave Kitchen?',
        'Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', onPress: () => router.back(), style: 'destructive' }
        ]
      );
    } else {
      router.back();
    }
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection 
        jokers={HOME_EC_JOKERS}
        theme="homeec"
        subject="Home Economics"
        onComplete={onComplete}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>🍭 Candy Kitchen Study! 🍳</Text>
          
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>📝 How to Cook:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>Swipe the center candy toward the matching edge candy</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>🍭 Lollipop → Swipe UP</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>🍬 Candy → Swipe RIGHT</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>🧁 Cupcake → Swipe DOWN</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>5.</Text>
              <Text style={styles.stepText}>🍫 Chocolate → Swipe LEFT</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>6.</Text>
              <Text style={styles.stepText}>Wrong match loses points, complete all 3 levels!</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.startGameButton} 
            onPress={startGame}
          >
            <Text style={styles.startGameButtonText}>👩‍🍳 Start Cooking Challenge!</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.startGameButton} onPress={handleForfeit}>
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    );
  }

  const levelConfig = getLevelConfig(level);

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🍭 Candy Kitchen 🍳</Text>
        <Text style={styles.levelText}>Level {level}: {levelConfig.name}</Text>
        <Text style={styles.scoreText}>Score: {score}/{levelConfig.matches}</Text>
        <Text style={styles.timerText}>Time: {timeLeft}s</Text>
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Edge candies */}
        <View style={[styles.edgeCandy, styles.topCandy]}>
          <Text style={styles.edgeCandyText}>🍭</Text>
        </View>
        <View style={[styles.edgeCandy, styles.rightCandy]}>
          <Text style={styles.edgeCandyText}>🍬</Text>
        </View>
        <View style={[styles.edgeCandy, styles.bottomCandy]}>
          <Text style={styles.edgeCandyText}>🧁</Text>
        </View>
        <View style={[styles.edgeCandy, styles.leftCandy]}>
          <Text style={styles.edgeCandyText}>🍫</Text>
        </View>

        {/* Preview panel */}
        {nextCandy && (
          <View style={styles.previewPanel}>
            <Text style={styles.previewLabel}>Next:</Text>
            <Text style={styles.previewCandy}>{nextCandy}</Text>
          </View>
        )}

        {/* Center candy */}
        {centerCandy && !isFlying && (
          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[styles.centerCandy, animatedStyle]}>
              <Text style={styles.centerCandyText}>{centerCandy}</Text>
            </Animated.View>
          </PanGestureHandler>
        )}

        {/* Flying candy */}
        {centerCandy && isFlying && (
          <Animated.View style={[styles.centerCandy, animatedStyle]}>
            <Text style={styles.centerCandyText}>{centerCandy}</Text>
          </Animated.View>
        )}

        {/* Feedback */}
        {feedback && feedbackPosition && (
          <View style={[
            styles.feedbackContainer,
            {
              left: feedbackPosition.x,
              top: feedbackPosition.y,
              transform: [{ translateX: -30 }, { translateY: -15 }],
            }
          ]}>
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.instructionsButton} onPress={() => setGameState('instructions')}>
          <Text style={styles.instructionsButtonText}>👩‍🍳 Instructions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={handleForfeit}>
          <Text style={styles.backButtonText}>🚪 Leave</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5E6',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#F4A460',
    borderBottomWidth: 3,
    borderBottomColor: '#D2691E',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 16,
    color: '#FFF8DC',
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#228B22',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC143C',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FAEBD7',
    margin: 10,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#D2691E',
  },
  edgeCandy: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: '#F0E68C',
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#DAA520',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCandy: {
    top: 20,
    left: '50%',
    marginLeft: -30,
  },
  rightCandy: {
    right: 20,
    top: '50%',
    marginTop: -30,
  },
  bottomCandy: {
    bottom: 20,
    left: '50%',
    marginLeft: -30,
  },
  leftCandy: {
    left: 20,
    top: '50%',
    marginTop: -30,
  },
  edgeCandyText: {
    fontSize: 30,
  },
  previewPanel: {
    position: 'absolute',
    top: 20,
    left: 15,
    backgroundColor: '#F5DEB3',
    borderRadius: 8,
    padding: 8,
    borderWidth: 2,
    borderColor: '#DEB887',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 10,
    color: '#8B4513',
    marginBottom: 2,
  },
  previewCandy: {
    fontSize: 20,
  },
  centerCandy: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
    width: 80,
    height: 80,
    backgroundColor: '#FFF',
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FF6347',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCandyText: {
    fontSize: 40,
  },
  feedbackContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -15,
    marginLeft: -30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FF6347',
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  instructionsButton: {
    flex: 1,
    backgroundColor: '#D2B48C',
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F0E68C',
    alignItems: 'center',
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#A0522D',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Instructions styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#FDF5E6',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#D2691E',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#D2691E',
    marginBottom: 20,
    shadowColor: '#FF6347',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6347',
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
    color: '#FF6347',
    fontFamily: 'CrayonPastel',
    marginRight: 10,
    minWidth: 20,
  },
  stepText: {
    fontSize: 16,
    color: '#8B4513',
    fontFamily: 'CrayonPastel',
    flex: 1,
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: '#FF6347',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FF4500',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF6347',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'CrayonPastel',
  },
});