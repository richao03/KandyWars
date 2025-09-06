import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedTitleProps {
  onAnimationComplete?: () => void;
}

export default function AnimatedTitle({ onAnimationComplete }: AnimatedTitleProps) {
  const strokeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start the handwriting animation
    Animated.sequence([
      // Fade in the SVG container
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Draw the stroke
      Animated.timing(strokeAnimation, {
        toValue: 1,
        duration: 3000, // 3 seconds to write
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    });
  }, []);

  // Simplified path for "Candy Wars" - you would need to convert your actual font to SVG paths
  // This is a placeholder path that creates a simple "C" shape for demonstration
  const candyPath = "M 50 50 Q 30 30, 30 70 Q 30 110, 50 90"; // Simplified C
  const warsPath = "M 150 50 L 150 90 M 170 50 L 170 90"; // Simplified W
  
  // For a real implementation, you would need to:
  // 1. Convert your DonGraffiti font text to SVG paths using a tool
  // 2. Get the path data (d attribute) from the SVG
  // 3. Use that path data here

  const pathLength = 1000; // Approximate path length

  const strokeDashoffset = strokeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [pathLength, 0],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnimation }]}>
      <Svg width={width * 0.9} height={200} viewBox="0 0 400 200">
        <Defs>
          <LinearGradient id="candyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#ffd6e8" />
            <Stop offset="100%" stopColor="#b85c8a" />
          </LinearGradient>
          <LinearGradient id="warsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#d4f6d4" />
            <Stop offset="100%" stopColor="#4a7c4a" />
          </LinearGradient>
        </Defs>
        
        {/* Candy text path */}
        <AnimatedPath
          d={candyPath}
          stroke="url(#candyGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={strokeDashoffset}
        />
        
        {/* Wars text path */}
        <AnimatedPath
          d={warsPath}
          stroke="url(#warsGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});