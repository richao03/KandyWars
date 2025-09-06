import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface HandwritingTitleProps {
  onAnimationComplete?: () => void;
}

export default function HandwritingTitle({ onAnimationComplete }: HandwritingTitleProps) {
  const [showCandy, setShowCandy] = useState(false);
  const [showWars, setShowWars] = useState(false);
  
  // Individual letter animations for "Candy"
  const candyLetters = ['C', 'a', 'n', 'd', 'y'];
  const candyAnims = useRef(candyLetters.map(() => new Animated.Value(0))).current;
  
  // Individual letter animations for "Wars"
  const warsLetters = ['W', 'a', 'r', 's'];
  const warsAnims = useRef(warsLetters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Start showing Candy
    setShowCandy(true);
    
    // Animate each letter of "Candy" sequentially
    const candyAnimations = candyAnims.map((anim, index) => 
      Animated.timing(anim, {
        toValue: 1,
        duration: 200,
        delay: index * 150, // Stagger each letter
        useNativeDriver: true,
      })
    );

    Animated.parallel(candyAnimations).start(() => {
      // After Candy is complete, start Wars
      setShowWars(true);
      
      const warsAnimations = warsAnims.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 200,
          delay: index * 150, // Stagger each letter
          useNativeDriver: true,
        })
      );

      Animated.parallel(warsAnimations).start(() => {
        if (onAnimationComplete) {
          setTimeout(onAnimationComplete, 500); // Small delay before completion
        }
      });
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Candy */}
      {showCandy && (
        <View style={styles.candyContainer}>
          {candyLetters.map((letter, index) => (
            <Animated.Text
              key={`candy-${index}`}
              style={[
                styles.letter,
                styles.candyText,
                index === 0 && styles.capitalLetter,
                {
                  opacity: candyAnims[index],
                  transform: [
                    {
                      scale: candyAnims[index].interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 1.2, 1],
                      }),
                    },
                    {
                      translateY: candyAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {letter}
            </Animated.Text>
          ))}
        </View>
      )}

      {/* Wars */}
      {showWars && (
        <View style={styles.warsContainer}>
          {warsLetters.map((letter, index) => (
            <Animated.Text
              key={`wars-${index}`}
              style={[
                styles.letter,
                styles.warsText,
                index === 0 && styles.capitalLetter,
                {
                  opacity: warsAnims[index],
                  transform: [
                    {
                      scale: warsAnims[index].interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 1.2, 1],
                      }),
                    },
                    {
                      translateY: warsAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {letter}
            </Animated.Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  candyContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginLeft: 60,
    marginBottom: -10,
  },
  warsContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginRight: 60,
    marginTop: -10,
  },
  letter: {
    fontSize: 70,
    fontWeight: 'bold',
    fontFamily: 'DonGraffiti',
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
});