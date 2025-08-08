import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

interface Card {
  id: number;
  value: number;
  column: 'left' | 'right';
  matched: boolean;
}

interface MathGameProps {
  onComplete: () => void;
}

// Separate component for draggable cards to avoid hooks inside map
interface DraggableCardProps {
  card: Card;
  isSelected: boolean;
  onPress: (card: Card) => void;
  translateX: any;
  translateY: any;
  scale: any;
  opacity: any;
}

const DraggableCard: React.FC<DraggableCardProps> = React.memo(({
  card,
  isSelected,
  onPress,           // keep this: we’ll call it on pan start to “select”
  translateX,
  translateY,
  scale,
  opacity,
  panGestureHandler, // not needed anymore, but keeping prop avoids bigger refactor
}) => {
  // each card gets its own gesture handler so it knows “which card am I?”
  const handler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      // select this card immediately when drag begins
      runOnJS(onPress)(card);
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
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      // tell parent to evaluate drop (uses absolute touch coords)
      runOnJS((x, y) => {
        // expose a global or lift a callback via props if you want to avoid runOnJS indirection
      })(evt.absoluteX, evt.absoluteY);
    },
    onFail: () => {
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
    },
    onCancel: () => {
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
    opacity: isSelected ? opacity.value : 1,
    zIndex: isSelected ? 1000 : 1,
  }));

  return (
    <PanGestureHandler
      enabled={!card.matched}
      onGestureEvent={handler}
      activeOffsetX={[-5, 5]}      // make it require a slight move to activate
      activeOffsetY={[-5, 5]}
    >
      <Animated.View
        style={[
          styles.card,
          styles.leftCard,
          card.matched && styles.matchedCard,
          isSelected && styles.selectedCard,
          animatedStyle,
        ]}
      >
        {/* No TouchableOpacity wrapping the text — press-to-select now happens on pan start */}
        <Text style={[styles.cardText, card.matched && styles.matchedText]}>
          {card.value}
        </Text>
      </Animated.View>
    </PanGestureHandler>
  );
});
// Placeholder jokers for the math pool
const MATH_JOKERS = [
  { id: 1, name: "Price Manipulator", description: "Change any candy price by ±50%" },
  { id: 2, name: "Time Bender", description: "Go back one period" },
  { id: 3, name: "Space Expander", description: "Double inventory space for 3 periods" },
  { id: 4, name: "Market Crasher", description: "All prices drop by 30% next period" },
  { id: 5, name: "Lucky Break", description: "Get a hint about upcoming events" },
  { id: 6, name: "Instant Seller", description: "Sell all candy at current prices instantly" },
  { id: 7, name: "Cash Multiplier", description: "Double your money (once per game)" },
  { id: 8, name: "Event Skipper", description: "Avoid one negative event" },
  { id: 9, name: "Inventory Overflow", description: "Ignore inventory limits for 1 period" },
  { id: 10, name: "Price Prophet", description: "See all prices 2 periods ahead" },
];

export default function MathGame({ onComplete }: MathGameProps) {
  const [targetNumber, setTargetNumber] = useState(0);
  const [leftCards, setLeftCards] = useState<Card[]>([]);
  const [rightCards, setRightCards] = useState<Card[]>([]);
  const [selectedLeftCard, setSelectedLeftCard] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<{ left: number; right: number }[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [showJokerSelection, setShowJokerSelection] = useState(false);
  const [selectedJokers, setSelectedJokers] = useState<typeof MATH_JOKERS>([]);

  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [dropZoneLayout, setDropZoneLayout] = useState<{[key: number]: {x: number, y: number, width: number, height: number}}>({});
  
  // Animated values for dragging
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Generate a new math puzzle
  const generatePuzzle = () => {
    const target = Math.floor(Math.random() * 20) + 10; // Target between 10-29
    const pairs: Array<{ left: number; right: number }> = [];
    const leftValues: number[] = [];
    const rightValues: number[] = [];

    // Generate 5 pairs that add up to target
    for (let i = 0; i < 5; i++) {
      const leftValue = Math.floor(Math.random() * (target - 2)) + 1; // 1 to target-1
      const rightValue = target - leftValue;
      pairs.push({ left: leftValue, right: rightValue });
      leftValues.push(leftValue);
      rightValues.push(rightValue);
    }


    // Shuffle arrays
    const shuffledLeft = [...leftValues].sort(() => Math.random() - 0.5);
    const shuffledRight = [...rightValues].sort(() => Math.random() - 0.5);

    setTargetNumber(target);
    setLeftCards(shuffledLeft.map((value, index) => ({ id: index, value, column: 'left', matched: false })));
    setRightCards(shuffledRight.map((value, index) => ({ id: index + 100, value, column: 'right', matched: false })));
    setMatchedPairs([]);
    setGameComplete(false);
  };

  useEffect(() => {
    generatePuzzle();
  }, []);

  // Gesture handler for dragging
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
      scale.value = withSpring(1.1);
      opacity.value = withSpring(0.8);
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: (event) => {
      console.log("on end")
      // Reset position and scale
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      
      // Check if dropped on a valid target
      runOnJS(handleDrop)(event.absoluteX, event.absoluteY);
    },
  });
  
  const handleDrop = (dropX: number, dropY: number) => {
    console.log("handleDrop")
    if (!draggedCard) return;
    
    // Find which right card was dropped on
    const rightCardEntries = Object.entries(dropZoneLayout);
    const droppedOnCard = rightCardEntries.find(([cardId, layout]) => {
      return dropX >= layout.x && dropX <= layout.x + layout.width &&
             dropY >= layout.y && dropY <= layout.y + layout.height;
    });
    
    if (droppedOnCard) {
      console.log("dropped a card")
      const rightCardId = parseInt(droppedOnCard[0]);
      const rightCard = rightCards.find(c => c.id === rightCardId);
      
      if (rightCard && !rightCard.matched && draggedCard.value + rightCard.value === targetNumber) {
        // Valid match!
        const newMatchedPairs = [...matchedPairs, { left: draggedCard.id, right: rightCard.id }];
        setMatchedPairs(newMatchedPairs);
        
        // Mark cards as matched
        setLeftCards(prev => prev.map(c => c.id === draggedCard.id ? { ...c, matched: true } : c));
        setRightCards(prev => prev.map(c => c.id === rightCard.id ? { ...c, matched: true } : c));
        
        // Check if game is complete
        if (newMatchedPairs.length === 5) {
          setGameComplete(true);
          setTimeout(() => setShowJokerSelection(true), 1000);
        }
      } else {
        // Invalid match
        Alert.alert('Not a match!', `${draggedCard.value} + ${rightCard?.value} ≠ ${targetNumber}`);
      }
    }
    
    setDraggedCard(null);
    setSelectedLeftCard(null);
  };

  const handleCardPress = (card: Card) => {
    if (card.matched) return;

    if (card.column === 'left') {
      setDraggedCard(card);
      setSelectedLeftCard(card.id);
    }
  };
  
  const handleRightCardLayout = (cardId: number, event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setDropZoneLayout(prev => ({
      ...prev,
      [cardId]: { x, y, width, height }
    }));
  };

  const selectRandomJokers = () => {
    const shuffled = [...MATH_JOKERS].sort(() => Math.random() - 0.5);
    setSelectedJokers(shuffled.slice(0, 3));
  };

  const handleJokerChoice = (jokerId: number) => {
    console.log(`Selected joker: ${MATH_JOKERS.find(j => j.id === jokerId)?.name}`);
    // TODO: Apply joker effect to game state
    onComplete();
  };

  if (showJokerSelection) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.jokerContainer}>
          <Text style={styles.jokerTitle}>🎭 Choose Your Math Joker!</Text>
          <Text style={styles.jokerSubtitle}>Select one powerful ability to break the game:</Text>
          
          {selectedJokers.length === 0 && (
            <TouchableOpacity style={styles.generateButton} onPress={selectRandomJokers}>
              <Text style={styles.generateButtonText}>🎲 Generate 3 Random Jokers</Text>
            </TouchableOpacity>
          )}

          {selectedJokers.map((joker) => (
            <TouchableOpacity
              key={joker.id}
              style={styles.jokerCard}
              onPress={() => handleJokerChoice(joker.id)}
            >
              <Text style={styles.jokerName}>{joker.name}</Text>
              <Text style={styles.jokerDescription}>{joker.description}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
            <Text style={styles.skipButtonText}>Skip Joker Selection</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔢 Math Challenge</Text>
        <Text style={styles.target}>Target Number: {targetNumber}</Text>
        <Text style={styles.instruction}>Match cards that add up to {targetNumber}</Text>
        <Text style={styles.progress}>Matches: {matchedPairs.length}/5</Text>
      </View>

      <View style={styles.gameArea}>
        {/* Left Column */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>Left Numbers</Text>
          {leftCards.map((card) => (
            <DraggableCard
        key={card.id}
  card={card}
  isSelected={selectedLeftCard === card.id}
  onPress={handleCardPress}
  translateX={translateX}
  translateY={translateY}
  scale={scale}
  opacity={opacity}
            />
          ))}
        </View>

        {/* Right Column */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>Right Numbers</Text>
          {rightCards.map((card) => (
            <View
              key={card.id}
              style={[
                styles.card,
                styles.rightCard,
                card.matched && styles.matchedCard,
                draggedCard && !card.matched && styles.dropZone
              ]}
              onLayout={(event) => handleRightCardLayout(card.id, event)}
            >
              <Text style={[styles.cardText, card.matched && styles.matchedText]}>
                {card.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {gameComplete && (
        <View style={styles.completionMessage}>
          <Text style={styles.completionText}>🎉 Excellent! All pairs matched!</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>🏠 Go Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.newGameButton} onPress={generatePuzzle}>
          <Text style={styles.newGameButtonText}>🔄 New Puzzle</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefaf5',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    textShadow: '1px 1px 0px #e6d4b7',
    marginBottom: 8,
  },
  target: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1890ff',
    fontFamily: 'CrayonPastel',
    marginBottom: 4,
  },
  instruction: {
    fontSize: 16,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  progress: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'CrayonPastel',
    marginTop: 4,
  },
  gameArea: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
  },
  columnHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 12,
  },
  card: {
    width: 80,
    height: 80,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
    backgroundColor: '#e6f7ff',
    borderColor: '#1890ff',
  },
  rightCard: {
    backgroundColor: '#fff2e8',
    borderColor: '#fa8c16',
  },
  selectedCard: {
    backgroundColor: '#ffffcc',
    borderColor: '#ffcc00',
    transform: [{ scale: 1.05 }],
  },
  matchedCard: {
    backgroundColor: '#f6ffed',
    borderColor: '#52c41a',
    opacity: 0.7,
  },
  cardText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5d4e37',
    fontFamily: 'CrayonPastel',
  },
  matchedText: {
    color: '#52c41a',
  },
  completionMessage: {
    alignItems: 'center',
    padding: 16,
  },
  completionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#52c41a',
    fontFamily: 'CrayonPastel',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#ffcc99',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#cc7a00',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
  newGameButton: {
    flex: 1,
    backgroundColor: '#e6f7ff',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#1890ff',
    alignItems: 'center',
  },
  newGameButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
  // Joker Selection Styles
  jokerContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  jokerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
  },
  jokerSubtitle: {
    fontSize: 16,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 24,
  },
  generateButton: {
    backgroundColor: '#f9f0ff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#722ed1',
    alignItems: 'center',
    marginBottom: 20,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
  jokerCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#d4a574',
    marginBottom: 12,
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  jokerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    marginBottom: 4,
  },
  jokerDescription: {
    fontSize: 14,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    lineHeight: 18,
  },
  skipButton: {
    backgroundColor: '#e9ecef',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    marginTop: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'CrayonPastel',
  },
});