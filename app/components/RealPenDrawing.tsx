import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface RealPenDrawingProps {
  onAnimationComplete?: () => void;
}

export default function RealPenDrawing({ onAnimationComplete }: RealPenDrawingProps) {
  // Animation values for each letter stroke
  const letterAnimations = useRef([
    new Animated.Value(0), // C
    new Animated.Value(0), // a
    new Animated.Value(0), // n
    new Animated.Value(0), // d
    new Animated.Value(0), // y
    new Animated.Value(0), // W
    new Animated.Value(0), // a
    new Animated.Value(0), // r
    new Animated.Value(0), // s
  ]).current;

  useEffect(() => {
    // Animate each letter being drawn in sequence
    const animations = letterAnimations.map((anim, index) => 
      Animated.timing(anim, {
        toValue: 1,
        duration: 500, // Each letter takes 500ms to draw
        delay: index * 400, // Start next letter slightly before previous finishes
        useNativeDriver: false,
      })
    );

    Animated.sequence(animations).start(() => {
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 500);
      }
    });
  }, []);

  // SVG paths for each letter - these simulate pen strokes
  // These are simplified - for best results, trace actual font paths
  const letterPaths = {
    // "C" - single curved stroke
    C: {
      path: "M 50 30 Q 20 30, 20 60 Q 20 90, 50 90 Q 70 90, 80 80",
      length: 150,
    },
    // "a" - circle then stem
    a1: {
      path: "M 110 50 Q 90 50, 90 65 Q 90 80, 110 80 Q 130 80, 130 65 Q 130 50, 110 50",
      length: 100,
    },
    a2: {
      path: "M 130 50 L 130 85",
      length: 35,
    },
    // "n" - down stroke then arch
    n1: {
      path: "M 150 50 L 150 85",
      length: 35,
    },
    n2: {
      path: "M 150 60 Q 150 50, 170 50 Q 180 50, 180 60 L 180 85",
      length: 70,
    },
    // "d" - circle then tall stem
    d1: {
      path: "M 210 50 Q 190 50, 190 65 Q 190 80, 210 80 Q 230 80, 230 65 Q 230 50, 210 50",
      length: 100,
    },
    d2: {
      path: "M 230 25 L 230 85",
      length: 60,
    },
    // "y" - diagonal strokes
    y1: {
      path: "M 250 50 L 265 70",
      length: 30,
    },
    y2: {
      path: "M 280 50 L 265 70 L 260 95",
      length: 50,
    },
    // "W" - zigzag strokes
    W1: {
      path: "M 40 120 L 50 160",
      length: 40,
    },
    W2: {
      path: "M 50 160 L 60 130",
      length: 35,
    },
    W3: {
      path: "M 60 130 L 70 160",
      length: 35,
    },
    W4: {
      path: "M 70 160 L 80 120",
      length: 40,
    },
    // "a" for Wars
    a2_1: {
      path: "M 110 140 Q 90 140, 90 155 Q 90 170, 110 170 Q 130 170, 130 155 Q 130 140, 110 140",
      length: 100,
    },
    a2_2: {
      path: "M 130 140 L 130 175",
      length: 35,
    },
    // "r" - down then curve
    r1: {
      path: "M 150 140 L 150 175",
      length: 35,
    },
    r2: {
      path: "M 150 150 Q 150 140, 165 140",
      length: 25,
    },
    // "s" - S curve
    s: {
      path: "M 190 145 Q 180 145, 180 152 Q 180 160, 190 160 Q 200 160, 200 167 Q 200 175, 190 175",
      length: 80,
    },
  };

  // Helper to create animated stroke dash offset
  const getStrokeDashOffset = (animation: Animated.Value, pathLength: number) => {
    return animation.interpolate({
      inputRange: [0, 1],
      outputRange: [pathLength, 0],
    });
  };

  return (
    <View style={styles.container}>
      <Svg width="320" height="200" viewBox="0 0 320 200">
        {/* Draw "Candy" */}
        <G>
          {/* C */}
          <AnimatedPath
            d={letterPaths.C.path}
            stroke="#ffd6e8"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.C.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[0], letterPaths.C.length)}
          />
          
          {/* a */}
          <AnimatedPath
            d={letterPaths.a1.path}
            stroke="#ffd6e8"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.a1.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[1], letterPaths.a1.length)}
          />
          <AnimatedPath
            d={letterPaths.a2.path}
            stroke="#ffd6e8"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.a2.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[1], letterPaths.a2.length)}
          />
          
          {/* n */}
          <AnimatedPath
            d={letterPaths.n1.path}
            stroke="#ffd6e8"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.n1.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[2], letterPaths.n1.length)}
          />
          <AnimatedPath
            d={letterPaths.n2.path}
            stroke="#ffd6e8"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.n2.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[2], letterPaths.n2.length)}
          />
          
          {/* d */}
          <AnimatedPath
            d={letterPaths.d1.path}
            stroke="#ffd6e8"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.d1.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[3], letterPaths.d1.length)}
          />
          <AnimatedPath
            d={letterPaths.d2.path}
            stroke="#ffd6e8"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.d2.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[3], letterPaths.d2.length)}
          />
          
          {/* y */}
          <AnimatedPath
            d={letterPaths.y1.path}
            stroke="#ffd6e8"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.y1.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[4], letterPaths.y1.length)}
          />
          <AnimatedPath
            d={letterPaths.y2.path}
            stroke="#ffd6e8"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.y2.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[4], letterPaths.y2.length)}
          />
        </G>

        {/* Draw "Wars" */}
        <G>
          {/* W */}
          <AnimatedPath
            d={letterPaths.W1.path}
            stroke="#d4f6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.W1.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[5], letterPaths.W1.length)}
          />
          <AnimatedPath
            d={letterPaths.W2.path}
            stroke="#d4f6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.W2.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[5], letterPaths.W2.length)}
          />
          <AnimatedPath
            d={letterPaths.W3.path}
            stroke="#d4f6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.W3.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[5], letterPaths.W3.length)}
          />
          <AnimatedPath
            d={letterPaths.W4.path}
            stroke="#d4f6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.W4.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[5], letterPaths.W4.length)}
          />
          
          {/* a */}
          <AnimatedPath
            d={letterPaths.a2_1.path}
            stroke="#d4f6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.a2_1.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[6], letterPaths.a2_1.length)}
          />
          <AnimatedPath
            d={letterPaths.a2_2.path}
            stroke="#d4f6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.a2_2.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[6], letterPaths.a2_2.length)}
          />
          
          {/* r */}
          <AnimatedPath
            d={letterPaths.r1.path}
            stroke="#d4f6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.r1.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[7], letterPaths.r1.length)}
          />
          <AnimatedPath
            d={letterPaths.r2.path}
            stroke="#d4f6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.r2.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[7], letterPaths.r2.length)}
          />
          
          {/* s */}
          <AnimatedPath
            d={letterPaths.s.path}
            stroke="#d4f6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={letterPaths.s.length}
            strokeDashoffset={getStrokeDashOffset(letterAnimations[8], letterPaths.s.length)}
          />
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
    minHeight: 200,
  },
});