import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface MaskRevealTitleProps {
  onAnimationComplete?: () => void;
}

const MaskRevealTitle = React.memo(({ onAnimationComplete }: MaskRevealTitleProps) => {
  const revealAnimation = useRef(new Animated.Value(0)).current;

  const handleAnimationComplete = useCallback(() => {
    if (onAnimationComplete) {
      setTimeout(onAnimationComplete, 500);
    }
  }, [onAnimationComplete]);

  useEffect(() => {
    // Animate from left to right reveal
    Animated.timing(revealAnimation, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start(handleAnimationComplete);
  }, [handleAnimationComplete]);

  // Calculate the width of the mask that reveals the text
  const maskWidth = revealAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Hidden text (for layout) */}
      <View style={styles.textContainer}>
        <Text style={[styles.gameTitle, styles.candyText, styles.hiddenText]}>
          <Text style={styles.capitalLetter}>C</Text>andy
        </Text>
        <Text style={[styles.gameTitle, styles.warsText, styles.hiddenText]}>
          <Text style={styles.capitalLetter}>W</Text>ars
        </Text>
      </View>

      {/* Animated reveal mask */}
      <Animated.View 
        style={[
          styles.maskContainer,
          { width: maskWidth }
        ]}
      >
        <View style={styles.revealedTextContainer}>
          <Text style={[styles.gameTitle, styles.candyText]}>
            <Text style={styles.capitalLetter}>C</Text>andy
          </Text>
          <Text style={[styles.gameTitle, styles.warsText]}>
            <Text style={styles.capitalLetter}>W</Text>ars
          </Text>
        </View>
      </Animated.View>

      {/* Optional: Pen tip indicator */}
      <Animated.View 
        style={[
          styles.penTip,
          {
            left: revealAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, width * 0.8],
            }),
            opacity: revealAnimation.interpolate({
              inputRange: [0, 0.9, 1],
              outputRange: [1, 1, 0],
            }),
          }
        ]}
      />
    </View>
  );
});

export default MaskRevealTitle;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
  },
  textContainer: {
    opacity: 0.1, // Faint outline
  },
  hiddenText: {
    color: '#666',
  },
  maskContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    height: '100%',
  },
  revealedTextContainer: {
    width: width * 0.8,
  },
  gameTitle: {
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
    marginLeft: 60,
    marginBottom: -20,
  },
  warsText: {
    color: '#d4f6d4',
    textShadowColor: '#4a7c4a',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
    marginLeft: 120,
    marginTop: -20,
  },
  penTip: {
    position: 'absolute',
    top: '50%',
    width: 4,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
});