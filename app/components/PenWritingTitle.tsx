import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient, Stop, Mask, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface PenWritingTitleProps {
  onAnimationComplete?: () => void;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function PenWritingTitle({ onAnimationComplete }: PenWritingTitleProps) {
  const pathAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pathAnimation, {
      toValue: 1,
      duration: 4000, // 4 seconds to write both words
      useNativeDriver: false,
    }).start(() => {
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 500);
      }
    });
  }, []);

  // These are example SVG paths for "Candy Wars"
  // To get accurate paths for your DonGraffiti font:
  // 1. Type "Candy Wars" in a design tool with DonGraffiti font
  // 2. Convert to outlines/paths
  // 3. Export as SVG and copy the path data
  
  // Simplified paths for demonstration - these create basic letter shapes
  const candyPaths = {
    // C - curved path
    C: "M 30,40 Q 10,40 10,60 Q 10,80 30,80 Q 45,80 50,70",
    // a - simple lowercase a
    a: "M 60,55 Q 75,55 75,65 Q 75,75 60,75 Q 55,75 55,70 L 55,80",
    // n - simple n shape
    n: "M 85,55 L 85,75 M 85,60 Q 85,55 95,55 L 95,75",
    // d - simple d
    d: "M 115,40 L 115,75 M 115,60 Q 115,55 105,55 Q 100,55 100,65 Q 100,75 105,75 Q 115,75 115,70",
    // y - with descender
    y: "M 125,55 L 130,65 L 130,85 M 135,55 L 130,65"
  };

  const warsPaths = {
    // W - double V
    W: "M 30,100 L 35,120 L 40,105 L 45,120 L 50,100",
    // a
    a: "M 60,105 Q 75,105 75,115 Q 75,125 60,125 Q 55,125 55,120 L 55,130",
    // r - simple r
    r: "M 85,105 L 85,125 M 85,110 Q 85,105 95,105",
    // s - curved s
    s: "M 110,105 Q 105,105 105,110 Q 105,115 110,115 Q 115,115 115,120 Q 115,125 110,125"
  };

  // Combine all paths into one continuous path
  const fullPath = Object.values(candyPaths).join(' ') + ' ' + Object.values(warsPaths).join(' ');
  
  // Calculate total path length (this is approximate - you'd calculate the actual length)
  const pathLength = 2000;

  const strokeDashoffset = pathAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [pathLength, 0],
  });

  return (
    <View style={styles.container}>
      <Svg width={width - 120} height={150} viewBox="0 0 150 150">
        <Defs>
          {/* Gradient for Candy */}
          <LinearGradient id="candyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#ffd6e8" />
            <Stop offset="50%" stopColor="#ff9ec7" />
            <Stop offset="100%" stopColor="#b85c8a" />
          </LinearGradient>
          
          {/* Gradient for Wars */}
          <LinearGradient id="warsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#d4f6d4" />
            <Stop offset="50%" stopColor="#8fd68f" />
            <Stop offset="100%" stopColor="#4a7c4a" />
          </LinearGradient>
          
          {/* Mask to reveal the text gradually */}
          <Mask id="textMask">
            <AnimatedPath
              d={fullPath}
              stroke="white"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pathLength}
              strokeDashoffset={strokeDashoffset}
            />
          </Mask>
        </Defs>

        {/* Draw the paths with gradient and mask */}
        <G mask="url(#textMask)">
          {/* Candy word */}
          <Path
            d={Object.values(candyPaths).join(' ')}
            stroke="url(#candyGradient)"
            strokeWidth="2"
            fill="url(#candyGradient)"
          />
          
          {/* Wars word */}
          <Path
            d={Object.values(warsPaths).join(' ')}
            stroke="url(#warsGradient)"
            strokeWidth="2"
            fill="url(#warsGradient)"
          />
        </G>

        {/* Animated pen tip (optional) */}
        <AnimatedPath
          d="M 0,0 L 2,0"
          stroke="#333"
          strokeWidth="4"
          strokeLinecap="round"
          transform={pathAnimation.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['translate(30, 40)', 'translate(135, 65)', 'translate(115, 125)'],
          })}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});