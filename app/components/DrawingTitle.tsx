import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

interface DrawingTitleProps {
  onAnimationComplete?: () => void;
}

export default function DrawingTitle({ onAnimationComplete }: DrawingTitleProps) {
  const drawAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('Starting drawing animation...');
    Animated.timing(drawAnimation, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start(() => {
      console.log('Drawing animation complete');
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 500);
      }
    });
  }, []);

  // Calculate stroke dash offset for drawing effect
  const strokeDashoffset = drawAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [800, 0], // Adjust based on text length
  });

  return (
    <View style={styles.container}>
      <Svg width="100%" height={200} viewBox="0 0 400 200" style={{ alignSelf: 'center' }}>
        <Defs>
          <LinearGradient id="candyStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#b85c8a" />
            <Stop offset="100%" stopColor="#ffd6e8" />
          </LinearGradient>
          <LinearGradient id="warsStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#4a7c4a" />
            <Stop offset="100%" stopColor="#d4f6d4" />
          </LinearGradient>
        </Defs>

        {/* Candy - drawn with stroke */}
        <AnimatedSvgText
          x="50"
          y="80"
          fontSize="70"
          fontFamily="DonGraffiti"
          fill="none"
          stroke="#b85c8a"
          strokeWidth="3"
          strokeDasharray="800"
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          Candy
        </AnimatedSvgText>

        {/* Wars - drawn with stroke */}
        <AnimatedSvgText
          x="150"
          y="140"
          fontSize="70"
          fontFamily="DonGraffiti"
          fill="none"
          stroke="#4a7c4a"
          strokeWidth="3"
          strokeDasharray="800"
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          Wars
        </AnimatedSvgText>

        {/* After drawing, fill the text */}
        <AnimatedSvgText
          x="50"
          y="80"
          fontSize="70"
          fontFamily="DonGraffiti"
          fill="#ffd6e8"
          opacity={drawAnimation.interpolate({
            inputRange: [0.8, 1],
            outputRange: [0, 1],
          })}
        >
          Candy
        </AnimatedSvgText>

        <AnimatedSvgText
          x="150"
          y="140"
          fontSize="70"
          fontFamily="DonGraffiti"
          fill="#d4f6d4"
          opacity={drawAnimation.interpolate({
            inputRange: [0.8, 1],
            outputRange: [0, 1],
          })}
        >
          Wars
        </AnimatedSvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 200,
  },
});