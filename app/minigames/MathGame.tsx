import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import JokerSelection from '../components/JokerSelection';


interface Card {
  id: number;
  value: number;
  column: 'left' | 'right';
  matched: boolean;
}

interface MathGameProps {
  onComplete: () => void;
}

interface DraggableCardProps {
  card: Card;
  isSelected: boolean;
  onStartDrag: (card: Card) => void;
  onEndDrag: (absX: number, absY: number) => void;
  translateX: Animated.SharedValue<number>;
  translateY: Animated.SharedValue<number>;
  scale: Animated.SharedValue<number>;
  opacity: Animated.SharedValue<number>;
}

const DraggableCard: React.FC<DraggableCardProps> = React.memo(
  ({ card, isSelected, onStartDrag, onEndDrag, translateX, translateY, scale, opacity }) => {
    const handler = useAnimatedGestureHandler({
      onStart: (_, ctx: any) => {
        runOnJS(onStartDrag)(card);
        ctx.startX = translateX.value;
        ctx.startY = translateY.value;
        scale.value = withSpring(1.08);
        opacity.value = withSpring(0.9);
      },
      onActive: (evt, ctx: any) => {
        translateX.value = ctx.startX + evt.translationX;
        translateY.value = ctx.startY + evt.translationY;
      },
      onEnd: (evt) => {
        const { absoluteX, absoluteY } = evt;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        runOnJS(onEndDrag)(absoluteX, absoluteY);
      },
      onCancel: () => {
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
      },
      onFail: () => {
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
      },
    });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: isSelected ? translateX.value : 0 },
        { translateY: isSelected ? translateY.value : 0 },
        { scale: isSelected ? scale.value : 1 },
      ],
      zIndex: isSelected ? 1000 : 1,
    }));

    return (
      <PanGestureHandler
        enabled={!card.matched}
        onGestureEvent={handler}
        shouldCancelWhenOutside={false}
        activeOffsetX={[-5, 5]}
        activeOffsetY={[-5, 5]}
      >
        <Animated.View
          style={[
            styles.card,
            card.column === 'left' ? styles.leftCard : styles.rightCard,
            isSelected && styles.selectedCard,
            card.matched && styles.matchedCard,
            animatedStyle,
          ]}
        >
          <Text style={[styles.cardText, card.matched && styles.matchedText]}>{card.value}</Text>
        </Animated.View>
      </PanGestureHandler>
    );
  }
);

// Academic math jokers for the classroom
const MATH_JOKERS = [
  { id: 1, name: 'Golden Ratio Calculator', description: 'Optimize all trade ratios for maximum profit' },
  { id: 2, name: 'Time Equation', description: 'Reverse one period using temporal mathematics' },
  { id: 3, name: 'Geometric Expansion', description: 'Double inventory space using spatial geometry' },
  { id: 4, name: 'Market Statistics', description: 'Apply probability theory to crash prices 30%' },
  { id: 5, name: 'Fortune Algorithm', description: 'Use predictive modeling for market insights' },
  { id: 6, name: 'Instant Calculus', description: 'Calculate optimal sell points in real-time' },
  { id: 7, name: 'Exponential Growth', description: 'Apply compound interest to double money once' },
  { id: 8, name: 'Logic Gate', description: 'Use boolean logic to bypass negative events' },
  { id: 9, name: 'Infinity Theory', description: 'Break inventory limits with mathematical concepts' },
  { id: 10, name: 'Prophet Equations', description: 'Forecast market trends 2 periods ahead' },
];

export default function MathGame({ onComplete }: MathGameProps) {
  // Game state management
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'gameOver', 'jokerSelection'
  const [stage, setStage] = useState(1); // 1, 2, 3
  const [timeLeft, setTimeLeft] = useState(14); // Start with stage 1 time
  const [stageComplete, setStageComplete] = useState(false);
  const [allStagesComplete, setAllStagesComplete] = useState(false);
  
  // Existing game state
  const [targetNumber, setTargetNumber] = useState(0);
  const [leftCards, setLeftCards] = useState<Card[]>([]);
  const [rightCards, setRightCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<{ left: number; right: number }[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [selectedJokers, setSelectedJokers] = useState<typeof MATH_JOKERS>([]);
  
  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [draggedCard, setDraggedCard] = useState<Card | null>(null);

  // Right-card absolute frames in screen coords
  const dropZoneLayout = useRef<
    Record<number, { x: number; y: number; width: number; height: number } | undefined>
  >({}).current;

  // Refs to all cards so we can call measureInWindow (screen coords)
  const cardRefs = useRef<Record<number, View | null>>({}).current;

  // Animated values (single active draggable at a time)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Generate a new math puzzle
  const generatePuzzle = () => {
    const config = getStageConfig(stage);
    const target = Math.floor(Math.random() * config.maxTarget) + 10;
    const leftValues: number[] = [];
    const rightValues: number[] = [];
    for (let i = 0; i < config.pairs; i++) {
      const leftValue = Math.floor(Math.random() * (target - 2)) + 1; // 1..target-1
      const rightValue = target - leftValue;
      leftValues.push(leftValue);
      rightValues.push(rightValue);
    }
    const shuffledLeft = [...leftValues].sort(() => Math.random() - 0.5);
    const shuffledRight = [...rightValues].sort(() => Math.random() - 0.5);

    setTargetNumber(target);
    setLeftCards(shuffledLeft.map((value, index) => ({ id: index, value, column: 'left', matched: false })));
    setRightCards(shuffledRight.map((value, index) => ({ id: index + 100, value, column: 'right', matched: false })));
    setMatchedPairs([]);
    setSelectedCardId(null);
    setDraggedCard(null);

    // clear cached frames; they’ll re-measure onLayout
    Object.keys(dropZoneLayout).forEach((k) => (dropZoneLayout[+k] = undefined));
  };

  // Stage configuration - 5 pairs with decreasing time
  const getStageConfig = (stageNum: number) => {
    switch (stageNum) {
      case 1: return { time: 14, pairs: 5, maxTarget: 20 };
      case 2: return { time: 12, pairs: 5, maxTarget: 20 };
      case 3: return { time: 10, pairs: 5, maxTarget: 20 };
      default: return { time: 14, pairs: 5, maxTarget: 20 };
    }
  };

  // Start timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up!
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle when time runs out
  const handleTimeUp = () => {
    Alert.alert(
      '⏰ Time\'s Up!', 
      'You ran out of time! Try again?',
      [
        { text: 'Give Up', onPress: () => router.back(), style: 'destructive' },
        { text: 'Try Again', onPress: () => {
          generatePuzzle();
          startTimer();
        }}
      ]
    );
  };

  // Initialize game only when playing
  useEffect(() => {
    if (gameState === 'playing') {
      generatePuzzle();
      startTimer();
    }
  }, [gameState]);

  // Progress to next stage
  const nextStage = () => {
    if (stage >= 3) {
      // All stages complete!
      setAllStagesComplete(true);
      setTimeout(() => setGameState('jokerSelection'), 1000);
    } else {
      const newStage = stage + 1;
      setStage(newStage);
      setStageComplete(false);
      // Reset timer for new stage before generating puzzle
      const newConfig = getStageConfig(newStage);
      setTimeLeft(newConfig.time);
      generatePuzzle();
      startTimer();
    }
  };

  // Cleanup timer on unmount and initialize game
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  // Animation values for fun effects
  const pulseValue = useSharedValue(1);
  const shakeValue = useSharedValue(0);
  
  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0) {
      // Pulse effect for urgency
      pulseValue.value = withRepeat(
        withTiming(1.2, { duration: 200 }),
        -1,
        true
      );
    } else {
      pulseValue.value = withTiming(1);
    }
    
    if (timeLeft <= 1) {
      // Shake effect when almost out of time
      shakeValue.value = withRepeat(
        withTiming(10, { duration: 50 }),
        -1,
        true
      );
    } else {
      shakeValue.value = withTiming(0);
    }
  }, [timeLeft]);

  // Measure a card into screen coords (so it matches evt.absoluteX/Y)
  const measureCard = (id: number) => {
    const ref = cardRefs[id];
    if (!ref) return;
    ref.measureInWindow((x, y, width, height) => {
      dropZoneLayout[id] = { x, y, width, height };
    });
  };

  const onStartDrag = (card: Card) => {
    if (card.matched) return;
   setDraggedCard(card);
  setSelectedCardId(card.id); // works for left or right
  };

  const onEndDrag = (absX: number, absY: number) => {
    if (!draggedCard) return;

    // ensure we have frames (first time, or after orientation/layout changes)
    for (const card of [...leftCards, ...rightCards]) {
      if (!dropZoneLayout[card.id]) {
        measureCard(card.id);
      }
    }

    // Find any card under the drop point (both left and right)
    let hitCard: Card | null = null;
    
    // Check all cards for collision
    for (const card of [...leftCards, ...rightCards]) {
      const rect = dropZoneLayout[card.id];
      if (!rect) continue;
      const inside =
        absX >= rect.x && absX <= rect.x + rect.width && absY >= rect.y && absY <= rect.y + rect.height;
      if (inside) {
        hitCard = card;
        break;
      }
    }

    if (!hitCard) {
      // no drop target
      setDraggedCard(null);
      setSelectedCardId(null);
      return;
    }

    // Don't allow dropping on same column or matched cards
    if (hitCard.column === draggedCard.column || hitCard.matched) {
      setDraggedCard(null);
      setSelectedCardId(null);
      return;
    }

    const isMatch = draggedCard.value + hitCard.value === targetNumber;

    if (isMatch) {
      const leftId = draggedCard.column === 'left' ? draggedCard.id : hitCard.id;
      const rightId = draggedCard.column === 'right' ? draggedCard.id : hitCard.id;
      const newMatchedPairs = [...matchedPairs, { left: leftId, right: rightId }];
      setMatchedPairs(newMatchedPairs);
      // Mark both cards as matched
      setLeftCards((prev) => 
        prev.map((c) => 
          (c.id === draggedCard.id || c.id === hitCard.id) ? { ...c, matched: true } : c
        )
      );
      setRightCards((prev) => 
        prev.map((c) => 
          (c.id === draggedCard.id || c.id === hitCard.id) ? { ...c, matched: true } : c
        )
      );

      const config = getStageConfig(stage);
      if (newMatchedPairs.length === config.pairs) {
        // Stage complete!
        if (timerRef.current) clearInterval(timerRef.current);
        setStageComplete(true);
        setGameComplete(true);
        
        // Show celebration and next stage option
        setTimeout(() => {
          if (stage < 3) {
            const nextStageConfig = getStageConfig(stage + 1);
            Alert.alert(
              `🎉 Level ${stage} Complete!`,
              `Great job! Ready for Level ${stage + 1}? (${nextStageConfig.time} seconds)`,
              [
                { text: 'Next Level', onPress: nextStage }
              ]
            );
          } else {
            Alert.alert(
              '🏆 Amazing! All Stages Complete!',
              'You\'ve mastered all three difficulty levels!',
              [
                { text: 'Choose Reward', onPress: () => {
                  setAllStagesComplete(true);
                  setTimeout(() => setGameState('jokerSelection'), 500);
                }}
              ]
            );
          }
        }, 500);
      }
    } else {
      // defer Alert to avoid firing during gesture teardown
      setTimeout(() => {
        Alert.alert('❌ Incorrect!', `${draggedCard.value} + ${hitCard.value} = ${draggedCard.value + hitCard.value} ≠ ${targetNumber}`);
      }, 0);
    }

    setDraggedCard(null);
    setSelectedCardId(null);
  };

  const selectRandomJokers = () => {
    const shuffled = [...MATH_JOKERS].sort(() => Math.random() - 0.5);
    setSelectedJokers(shuffled.slice(0, 3));
  };

  // Handle forfeit (going back)
  const handleForfeit = () => {
    if (gameState === 'playing') {
      Alert.alert(
        '📚 Leave Math Study?',
        'If you leave now, you\'ll miss your study session and won\'t earn any academic rewards.',
        [
          { text: 'Keep Studying', style: 'cancel' },
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
  
  // Animated styles for timer
  const timerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: pulseValue.value },
        { translateX: shakeValue.value }
      ]
    };
  });
  
  // Timer color based on urgency
  const getTimerColor = () => {
    if (timeLeft <= 1) return '#ff4d4f';
    if (timeLeft <= 3) return '#fa8c16';
    if (timeLeft <= 5) return '#fadb14';
    return '#52c41a';
  };

  const handleJokerChoice = (jokerId: number) => {
    console.log(`Selected joker: ${MATH_JOKERS.find((j) => j.id === jokerId)?.name}`);
    onComplete();
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection 
        jokers={MATH_JOKERS}
        theme="math"
        subject="Math"
        onComplete={onComplete}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>📐 Math Study Session! 📏</Text>
          
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>📝 How to Solve:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>You'll see a target number at the top of your chalkboard</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>Drag number cards from left and right columns together</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>Find pairs that add up to equal the target number</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>Complete all 3 difficulty levels before time runs out!</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>5.</Text>
              <Text style={styles.stepText}>Each level gets faster - Level 1: 14s, Level 2: 12s, Level 3: 10s</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.startGameButton} 
            onPress={() => setGameState('playing')}
          >
            <Text style={styles.startGameButtonText}>📝 Start Math Challenge!</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.startGameButton} onPress={handleForfeit}>
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📐 Math Challenge</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.level}>Level {stage}/3</Text>
          <Text style={styles.progress}>Matches: {matchedPairs.length}/{getStageConfig(stage).pairs}</Text>
          <Animated.View style={[styles.timerContainer, timerAnimatedStyle]}>
            <Text style={[styles.timer, { color: getTimerColor() }]}>⏱️ {timeLeft}s</Text>
          </Animated.View>
        </View>
        <View style={styles.targetContainer}>
          <Text style={styles.targetLabel}>📏 Target Sum:</Text>
          <Text style={styles.target}>{targetNumber}</Text>
        </View>
      </View>

      <View style={styles.gameArea}>
        {/* Massive background target number wallpaper */}
        <View style={styles.backgroundNumber}>
          <Text style={styles.backgroundNumberText}>{targetNumber}</Text>
        </View>
        {/* Left Column */}
        <View style={styles.column}>
          {leftCards.map((card) => (
            <View key={card.id} ref={(r) => (cardRefs[card.id] = r)} onLayout={() => measureCard(card.id)}>
              <DraggableCard
                card={card}
                isSelected={selectedCardId === card.id}
                onStartDrag={onStartDrag}
                onEndDrag={onEndDrag}
                translateX={translateX}
                translateY={translateY}
                scale={scale}
                opacity={opacity}
              />
            </View>
          ))}
        </View>

        {/* Right Column - Now also draggable */}
        <View style={styles.column}>
          {rightCards.map((card) => (
            <View key={card.id} ref={(r) => (cardRefs[card.id] = r)} onLayout={() => measureCard(card.id)}>
              <DraggableCard
                card={card}
                isSelected={selectedCardId === card.id}
                onStartDrag={onStartDrag}
                onEndDrag={onEndDrag}
                translateX={translateX}
                translateY={translateY}
                scale={scale}
                opacity={opacity}
              />
            </View>
          ))}
        </View>
      </View>


      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.instructionsButton} onPress={() => {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState('instructions');
        }}>
          <Text style={styles.instructionsButtonText}>📝 Instructions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={handleForfeit}>
          <Text style={styles.backButtonText}>📚 Leave</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.newGameButton} onPress={() => {
          generatePuzzle();
          startTimer();
        }}>
          <Text style={styles.newGameButtonText}>🧮 Reset Problem</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d4a3e',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#1a2f23',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8fbc8f',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#8fbc8f',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 12,
  },
  targetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1b13',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8fbc8f',
    marginBottom: 8,
  },
  targetLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    marginRight: 8,
  },
  target: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffff99',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#f5f5dc',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  instruction: {
    fontSize: 16,
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  progress: {
    fontSize: 14,
    color: '#8fbc8f',
    fontFamily: 'CrayonPastel',
    marginTop: 4,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  gameArea: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    position: 'relative',
    paddingHorizontal: 8,
    backgroundColor: '#1a2f23',
    marginHorizontal: -8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8fbc8f',
  },
  column: {
    flex: 1,
    zIndex: 10,
  },
  columnHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 12,
    textDecorationLine: 'underline',
    textDecorationColor: '#ffff99',
  },
  card: {
    width: 80,
    height: 80,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#ffff99',
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  cardTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZone: {
    borderWidth: 4,
    borderStyle: 'dashed',
    borderColor: '#52c41a',
    backgroundColor: '#f6ffed',
  },
  leftCard: {
    backgroundColor: '#0f1b13',
    borderColor: '#ffff99',
  },
  rightCard: {
    backgroundColor: '#0f1b13',
    borderColor: '#f5deb3',
  },
  selectedCard: {
    backgroundColor: '#2a4a2a',
    borderColor: '#ffff99',
    borderWidth: 3,
    shadowOpacity: 1.0,
    shadowRadius: 10,
    transform: [{ scale: 1.05 }],
  },
  matchedCard: {
    backgroundColor: '#1a2f1a',
    borderColor: '#90ee90',
    opacity: 0.4,
  },
  cardText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#ffff99',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  matchedText: {
    display: 'none',
    color: '#90ee90',
  },
  completionMessage: {
    alignItems: 'center',
    padding: 16,
  },
  completionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#90ee90',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#f5f5dc',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#8b4513',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#daa520',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
  newGameButton: {
    flex: 1,
    backgroundColor: '#556b2f',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9acd32',
    alignItems: 'center',
  },
  newGameButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
  // Joker Selection Styles
  jokerContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#2d4a3e',
  },
  jokerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: '#8fbc8f',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  jokerSubtitle: {
    fontSize: 16,
    color: '#8fbc8f',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 24,
  },
  generateButton: {
    backgroundColor: '#1a2f23',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffff99',
    alignItems: 'center',
    marginBottom: 20,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
  jokerCard: {
    backgroundColor: '#1a2f23',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8fbc8f',
    marginBottom: 12,
    shadowColor: '#ffff99',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  jokerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffff99',
    fontFamily: 'CrayonPastel',
    marginBottom: 4,
  },
  jokerDescription: {
    fontSize: 14,
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    lineHeight: 18,
  },
  skipButton: {
    backgroundColor: '#8b4513',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#daa520',
    alignItems: 'center',
    marginTop: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
  // Timer and Stage Header Styles
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  stageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffff99',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#f5f5dc',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  timerContainer: {
    backgroundColor: '#0f1b13',
    marginTop:8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8fbc8f',
  },
  timer: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  // Background target number styles - massive wallpaper
  backgroundNumber: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  backgroundNumberText: {
    fontSize: 150,
    fontWeight: '900',
    color: '#2d4a3e',
    fontFamily: 'CrayonPastel',
    opacity: 0.3,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Instructions Styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#2d4a3e',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#8fbc8f',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionsCard: {
    backgroundColor: '#1a2f23',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#8fbc8f',
    marginBottom: 20,
    shadowColor: '#ffff99',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffff99',
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
    color: '#ffff99',
    fontFamily: 'CrayonPastel',
    marginRight: 10,
    minWidth: 20,
  },
  stepText: {
    fontSize: 16,
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
    flex: 1,
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: '#556b2f',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#9acd32',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#ffff99',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
  instructionsButton: {
    flex: 1,
    backgroundColor: '#1a2f23',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8fbc8f',
    alignItems: 'center',
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f5f5dc',
    fontFamily: 'CrayonPastel',
  },
});
