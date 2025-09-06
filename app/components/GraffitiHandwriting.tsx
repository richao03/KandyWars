import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface GraffitiHandwritingProps {
  onAnimationComplete?: () => void;
}

export default function GraffitiHandwriting({ onAnimationComplete }: GraffitiHandwritingProps) {
  // Animation values for each letter's strokes
  const letterAnimations = useRef([
    new Animated.Value(0), // C
    new Animated.Value(0), // a
    new Animated.Value(0), // n
    new Animated.Value(0), // d
    new Animated.Value(0), // y
    new Animated.Value(0), // W
    new Animated.Value(0), // a2
    new Animated.Value(0), // r
    new Animated.Value(0), // s
  ]).current;

  useEffect(() => {
    // Stagger the animations with overlapping timing for natural flow
    const createAnimation = (index: number) => 
      Animated.timing(letterAnimations[index], {
        toValue: 1,
        duration: 600,
        delay: index * 300,
        useNativeDriver: false,
      });

    const animations = letterAnimations.map((_, index) => createAnimation(index));

    Animated.parallel(animations).start(() => {
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 800);
      }
    });
  }, []);

  // More detailed graffiti-style paths that look hand-drawn
  const graffitiPaths = {
    // "C" - thick, curved graffiti style with multiple strokes
    C: [
      {
        path: "M 70 45 Q 35 45, 35 75 Q 35 105, 70 105 Q 90 105, 95 95",
        length: 160,
      },
      // Inner highlight/shadow stroke
      {
        path: "M 65 55 Q 45 55, 45 75 Q 45 95, 65 95",
        length: 100,
        delay: 0.3,
      },
    ],
    
    // "a" - bubble letter style
    a: [
      // Outer bubble
      {
        path: "M 125 65 Q 105 65, 105 80 Q 105 95, 125 95 Q 145 95, 145 80 Q 145 65, 125 65 Z",
        length: 120,
      },
      // Vertical stroke
      {
        path: "M 145 65 L 145 100",
        length: 35,
        delay: 0.4,
      },
    ],
    
    // "n" - thick block style
    n: [
      // Left vertical
      {
        path: "M 165 65 L 165 100 L 175 100 L 175 65",
        length: 80,
      },
      // Arch with thickness
      {
        path: "M 165 75 Q 165 65, 185 65 Q 195 65, 195 75 L 195 100 L 205 100 L 205 65 Q 205 55, 185 55 Q 165 55, 165 65",
        length: 140,
        delay: 0.3,
      },
    ],
    
    // "d" - bubble with tall ascender
    d: [
      // Bubble part
      {
        path: "M 235 65 Q 215 65, 215 80 Q 215 95, 235 95 Q 255 95, 255 80 Q 255 65, 235 65 Z",
        length: 120,
      },
      // Tall vertical stroke
      {
        path: "M 255 35 L 255 100 L 265 100 L 265 35",
        length: 80,
        delay: 0.4,
      },
    ],
    
    // "y" - with descender, graffiti style
    y: [
      // Left diagonal
      {
        path: "M 285 65 L 305 85 L 295 95 L 275 75",
        length: 50,
      },
      // Right diagonal with descender
      {
        path: "M 325 65 L 305 85 L 295 110 L 285 110",
        length: 60,
        delay: 0.3,
      },
    ],
    
    // "W" - thick block letters
    W: [
      // First stroke
      {
        path: "M 45 130 L 50 170 L 60 170 L 55 130",
        length: 50,
      },
      // Second stroke  
      {
        path: "M 55 130 L 60 150 L 70 150 L 65 130",
        length: 35,
        delay: 0.2,
      },
      // Third stroke
      {
        path: "M 65 130 L 70 150 L 80 150 L 75 130", 
        length: 35,
        delay: 0.4,
      },
      // Fourth stroke
      {
        path: "M 75 130 L 80 170 L 90 170 L 85 130",
        length: 50,
        delay: 0.6,
      },
    ],
    
    // "a" for Wars - similar to first but different position
    a2: [
      {
        path: "M 115 145 Q 95 145, 95 160 Q 95 175, 115 175 Q 135 175, 135 160 Q 135 145, 115 145 Z",
        length: 120,
      },
      {
        path: "M 135 145 L 135 180",
        length: 35,
        delay: 0.4,
      },
    ],
    
    // "r" - simple but thick
    r: [
      // Vertical stroke
      {
        path: "M 155 145 L 155 180 L 165 180 L 165 145",
        length: 45,
      },
      // Top curve
      {
        path: "M 155 155 Q 155 145, 175 145 Q 185 145, 185 155",
        length: 40,
        delay: 0.3,
      },
    ],
    
    // "s" - curved graffiti S
    s: [
      {
        path: "M 210 150 Q 200 150, 200 158 Q 200 165, 210 165 Q 220 165, 220 172 Q 220 180, 210 180 Q 195 180, 195 172",
        length: 100,
      },
      // Shadow/depth line
      {
        path: "M 205 155 Q 205 160, 210 160 Q 215 160, 215 165 Q 215 175, 205 175",
        length: 60,
        delay: 0.4,
      },
    ],
  };

  const renderLetterStrokes = (letterKey: string, animationIndex: number) => {
    const strokes = graffitiPaths[letterKey];
    const animation = letterAnimations[animationIndex];
    
    return strokes.map((stroke, strokeIndex) => {
      const strokeAnimation = stroke.delay 
        ? animation.interpolate({
            inputRange: [0, stroke.delay, stroke.delay + 0.3, 1],
            outputRange: [stroke.length, stroke.length, 0, 0],
          })
        : animation.interpolate({
            inputRange: [0, 1],
            outputRange: [stroke.length, 0],
          });

      return (
        <AnimatedPath
          key={`${letterKey}-${strokeIndex}`}
          d={stroke.path}
          stroke={letterKey.startsWith('W') || letterKey === 'a2' || letterKey === 'r' || letterKey === 's' ? "#4a7c4a" : "#b85c8a"}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={stroke.length}
          strokeDashoffset={strokeAnimation}
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      <Svg width="350" height="220" viewBox="0 0 350 220">
        <G>
          {/* "Candy" letters */}
          {renderLetterStrokes('C', 0)}
          {renderLetterStrokes('a', 1)}
          {renderLetterStrokes('n', 2)}
          {renderLetterStrokes('d', 3)}
          {renderLetterStrokes('y', 4)}
          
          {/* "Wars" letters */}
          {renderLetterStrokes('W', 5)}
          {renderLetterStrokes('a2', 6)}
          {renderLetterStrokes('r', 7)}
          {renderLetterStrokes('s', 8)}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 220,
  },
});