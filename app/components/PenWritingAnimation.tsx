import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface PenWritingAnimationProps {
  onAnimationComplete?: () => void;
}

// Define each letter with multiple strokes (simulate pen strokes)
const letterStrokes = {
  C: [
    { char: '(', delay: 0, duration: 300 },
    { char: 'C', delay: 200, duration: 100 },
  ],
  a: [
    { char: 'o', delay: 0, duration: 200 },
    { char: 'a', delay: 150, duration: 100 },
  ],
  n: [
    { char: '|', delay: 0, duration: 150 },
    { char: 'n', delay: 100, duration: 100 },
  ],
  d: [
    { char: 'o', delay: 0, duration: 200 },
    { char: 'd', delay: 150, duration: 150 },
  ],
  y: [
    { char: 'v', delay: 0, duration: 200 },
    { char: 'y', delay: 150, duration: 150 },
  ],
  W: [
    { char: 'V', delay: 0, duration: 200 },
    { char: 'W', delay: 150, duration: 200 },
  ],
  r: [
    { char: '|', delay: 0, duration: 150 },
    { char: 'r', delay: 100, duration: 100 },
  ],
  s: [
    { char: 'c', delay: 0, duration: 200 },
    { char: 's', delay: 150, duration: 100 },
  ],
};

export default function PenWritingAnimation({ onAnimationComplete }: PenWritingAnimationProps) {
  const [currentWord, setCurrentWord] = useState(0); // 0 = Candy, 1 = Wars
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [displayText, setDisplayText] = useState({ candy: '', wars: '' });
  const [isComplete, setIsComplete] = useState(false);

  const candyLetters = ['C', 'a', 'n', 'd', 'y'];
  const warsLetters = ['W', 'a', 'r', 's'];

  // Individual opacity animations for each letter
  const letterOpacities = useRef({
    candy: candyLetters.map(() => new Animated.Value(0)),
    wars: warsLetters.map(() => new Animated.Value(0)),
  }).current;

  useEffect(() => {
    const animateLetterWriting = () => {
      if (currentWord === 0) {
        // Animate Candy
        if (currentLetterIndex < candyLetters.length) {
          const letter = candyLetters[currentLetterIndex];
          
          // Fade in the letter with a "drawing" effect
          Animated.sequence([
            // Quick scale up and fade in (like pen touching paper)
            Animated.parallel([
              Animated.timing(letterOpacities.candy[currentLetterIndex], {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
          ]).start(() => {
            // Add letter to display text
            setDisplayText(prev => ({
              ...prev,
              candy: prev.candy + letter
            }));
            
            // Move to next letter
            setTimeout(() => {
              setCurrentLetterIndex(currentLetterIndex + 1);
            }, 150); // Pause between letters
          });
        } else {
          // Move to Wars
          setCurrentWord(1);
          setCurrentLetterIndex(0);
        }
      } else if (currentWord === 1) {
        // Animate Wars
        if (currentLetterIndex < warsLetters.length) {
          const letter = warsLetters[currentLetterIndex];
          
          Animated.sequence([
            Animated.parallel([
              Animated.timing(letterOpacities.wars[currentLetterIndex], {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
          ]).start(() => {
            setDisplayText(prev => ({
              ...prev,
              wars: prev.wars + letter
            }));
            
            setTimeout(() => {
              setCurrentLetterIndex(currentLetterIndex + 1);
            }, 150);
          });
        } else {
          // Animation complete
          setIsComplete(true);
          if (onAnimationComplete) {
            setTimeout(onAnimationComplete, 500);
          }
        }
      }
    };

    animateLetterWriting();
  }, [currentWord, currentLetterIndex]);

  // Render each letter individually with stroke animation
  const renderLetter = (letter: string, index: number, word: 'candy' | 'wars') => {
    const opacity = letterOpacities[word][index];
    const isCapital = letter === letter.toUpperCase();
    
    return (
      <Animated.View
        key={`${word}-${index}`}
        style={{
          opacity,
          transform: [
            {
              scale: opacity.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.5, 1.1, 1],
              }),
            },
          ],
        }}
      >
        <Text style={[
          styles.letter,
          word === 'candy' ? styles.candyText : styles.warsText,
          isCapital && styles.capitalLetter,
        ]}>
          {letter}
        </Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Candy word */}
      <View style={styles.candyContainer}>
        {candyLetters.map((letter, index) => (
          index <= currentLetterIndex || currentWord > 0
            ? renderLetter(letter, index, 'candy')
            : <View key={`candy-${index}`} style={styles.placeholder} />
        ))}
      </View>

      {/* Wars word */}
      {currentWord > 0 && (
        <View style={styles.warsContainer}>
          {warsLetters.map((letter, index) => (
            index <= currentLetterIndex
              ? renderLetter(letter, index, 'wars')
              : <View key={`wars-${index}`} style={styles.placeholder} />
          ))}
        </View>
      )}

      {/* Pen cursor animation */}
      {!isComplete && (
        <View style={[
          styles.penCursor,
          {
            left: currentWord === 0 
              ? 60 + (currentLetterIndex * 45)
              : 120 + (currentLetterIndex * 45),
            top: currentWord === 0 ? 70 : 120,
          }
        ]}>
          <View style={styles.penTip} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    minHeight: 180,
  },
  candyContainer: {
    flexDirection: 'row',
    position: 'absolute',
    left: 60,
    top: 20,
  },
  warsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    right: 60,
    top: 80,
  },
  letter: {
    fontSize: 70,
    fontWeight: 'bold',
    fontFamily: 'DonGraffiti',
    marginHorizontal: -5, // Letters closer together
  },
  capitalLetter: {
    fontSize: 100,
  },
  candyText: {
    color: '#ffd6e8',
    textShadowColor: '#b85c8a',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
  },
  warsText: {
    color: '#d4f6d4',
    textShadowColor: '#4a7c4a',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
  },
  placeholder: {
    width: 40,
    height: 70,
  },
  penCursor: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  penTip: {
    width: 6,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});