import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import JokerSelection from '../components/JokerSelection';
import { HOME_EC_JOKERS } from '../../src/utils/jokerEffectEngine';

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
      case 1: return { matches: 10, time: 15 };
      case 2: return { matches: 12, time: 15 };
      case 3: return { matches: 15, time: 15 };
      default: return { matches: 10, time: 15};
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <GestureHandlerRootView style={styles.gameContainer}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🍳 Kitchen Practice 🧑‍🍳</Text>
          <View style={styles.gameInfo}>
            <Text style={styles.levelText}> {level} / 3</Text>
            <Text style={[styles.timerText, { color: timeLeft <= 5 ? '#ff4d4f' : '#52c41a' }]}>
              ⏱️ {timeLeft}s
            </Text>
          </View>
          <Text style={styles.scoreText}>Progress: {score}/{levelConfig.matches}</Text>
          <Text style={styles.subtitle}>Sort ingredients to their designated stations</Text>
        </View>

        {/* Game Area - Center Panel */}
        <View style={styles.gameArea}>
          {/* Edge candies - Kitchen Stations */}
          <View style={[styles.edgeCandy, styles.topCandy]}>
            <Text style={styles.edgeCandyText}>🍭</Text>
            <Text style={styles.stationLabel}>PREP</Text>
          </View>
          <View style={[styles.edgeCandy, styles.rightCandy]}>
            <Text style={styles.edgeCandyText}>🍬</Text>
            <Text style={styles.stationLabel}>GRILL</Text>
          </View>
          <View style={[styles.edgeCandy, styles.bottomCandy]}>
            <Text style={styles.edgeCandyText}>🧁</Text>
            <Text style={styles.stationLabel}>OVEN</Text>
          </View>
          <View style={[styles.edgeCandy, styles.leftCandy]}>
            <Text style={styles.edgeCandyText}>🍫</Text>
            <Text style={styles.stationLabel}>COOL</Text>
          </View>

          {/* Preview panel */}
          {nextCandy && (
            <View style={styles.previewPanel}>
              <Text style={styles.previewLabel}>NEXT:</Text>
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

        {/* Footer - Bottom Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn} onPress={() => setGameState('instructions')}>
            <Text style={styles.footerBtnText}>📋 Instructions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerBtn, styles.leaveBtn]} onPress={handleForfeit}>
            <Text style={styles.footerBtnText}>🚪 Leave</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn} onPress={restartGame}>
            <Text style={styles.footerBtnText}>🔄 Restart</Text>
          </TouchableOpacity>
        </View>

      </GestureHandlerRootView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1f26', // Dark metallic background
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
    marginBottom: 20,
    backgroundColor: '#2c3139', // Dark steel
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#495057', // Steel border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8f9fa', // Light text
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: '#495057',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#adb5bd', // Medium gray
    fontFamily: 'CrayonPastel',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745', // Success green
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#343a40', // Steel gray
    margin: 10,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#495057', // Steel border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    minHeight: 400,
  },
  edgeCandy: {
    position: 'absolute',
    width: 70,
    height: 70,
    backgroundColor: '#6c757d', // Stainless steel
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#adb5bd', // Light steel border
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  stationLabel: {
    position: 'absolute',
    bottom: -18,
    fontSize: 8,
    fontWeight: '700',
    color: '#f8f9fa',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    backgroundColor: 'rgba(52, 58, 64, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  topCandy: {
    top: 20,
    left: '50%',
    marginLeft: -35,
  },
  rightCandy: {
    right: 20,
    top: '50%',
    marginTop: -35,
  },
  bottomCandy: {
    bottom: 20,
    left: '50%',
    marginLeft: -35,
  },
  leftCandy: {
    left: 20,
    top: '50%',
    marginTop: -35,
  },
  edgeCandyText: {
    fontSize: 30,
  },
  previewPanel: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#495057', // Steel background
    borderRadius: 8,
    padding: 8,
    borderWidth: 2,
    borderColor: '#6c757d',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f8f9fa',
    fontFamily: 'CrayonPastel',
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
    backgroundColor: '#f8f9fa', // Light metallic
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerCandyText: {
    fontSize: 40,
  },
  feedbackContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(73, 80, 87, 0.95)', // Dark steel overlay
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: '#adb5bd',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8f9fa',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#2c3139',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#495057',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#adb5bd',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
  },
  footerBtn: {
    flex: 1,
    backgroundColor: '#495057', // Steel gray
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6c757d',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  leaveBtn: {
    backgroundColor: '#6c757d',
    borderColor: '#adb5bd',
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8f9fa',
    fontFamily: 'CrayonPastel',
  },
  // Instructions styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#1c1f26',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8f9fa',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#495057',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionsCard: {
    backgroundColor: '#2c3139',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#495057',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#adb5bd',
    fontFamily: 'CrayonPastel',
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: '#495057',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6c757d',
    fontFamily: 'CrayonPastel',
    marginRight: 10,
    minWidth: 20,
  },
  stepText: {
    fontSize: 16,
    color: '#f8f9fa',
    fontFamily: 'CrayonPastel',
    flex: 1,
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: '#495057',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#6c757d',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8f9fa',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#343a40',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});