import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TypewriterTitleProps {
  onAnimationComplete?: () => void;
  onSugarComplete?: () => void;
}

export default function TypewriterTitle({
  onAnimationComplete,
  onSugarComplete,
}: TypewriterTitleProps) {
  const sugarText = 'Sugar';
  const warzText = 'WarZ';
  const [sugarVisible, setSugarVisible] = useState(0);
  const [warzVisible, setWarzVisible] = useState(0);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const sugarScale = useRef(new Animated.Value(1)).current;
  const warzScale = useRef(new Animated.Value(1)).current;
  const sugarCallbackFired = useRef(false);
  const animationCallbackFired = useRef(false);

  // Blinking cursor
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [cursorOpacity]);

  // Typewriter effect
  useEffect(() => {
    const charDelay = 150;
    const pauseBetweenWords = 500;
    let timeout: ReturnType<typeof setTimeout>;
    let currentIndex = 0;
    const totalSugar = sugarText.length;
    const totalWarz = warzText.length;

    const typeNext = () => {
      currentIndex++;

      if (currentIndex <= totalSugar) {
        setSugarVisible(currentIndex);
        // Punch effect on each letter
        Animated.sequence([
          Animated.timing(sugarScale, {
            toValue: 1.08,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(sugarScale, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
        ]).start();

        if (currentIndex === totalSugar) {
          if (!sugarCallbackFired.current) {
            sugarCallbackFired.current = true;
            onSugarComplete?.();
          }
          timeout = setTimeout(typeNext, pauseBetweenWords);
        } else {
          timeout = setTimeout(typeNext, charDelay);
        }
      } else {
        const warzIndex = currentIndex - totalSugar;
        if (warzIndex <= totalWarz) {
          setWarzVisible(warzIndex);
          // Punch effect on each letter
          Animated.sequence([
            Animated.timing(warzScale, {
              toValue: 1.08,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(warzScale, {
              toValue: 1,
              duration: 80,
              useNativeDriver: true,
            }),
          ]).start();

          if (warzIndex === totalWarz) {
            if (!animationCallbackFired.current) {
              animationCallbackFired.current = true;
              onAnimationComplete?.();
            }
          } else {
            timeout = setTimeout(typeNext, charDelay);
          }
        }
      }
    };

    timeout = setTimeout(typeNext, 600);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sugarDone = sugarVisible >= sugarText.length;
  const allDone = warzVisible >= warzText.length;
  const showWarzCursor = sugarDone && !allDone;

  const renderText = (text: string, visibleCount: number, showCursor: boolean) => (
    <View>
      {/* Outline layer (deep brown, offset down-right) */}
      <Text style={[styles.titleText, styles.outlineText]}>
        {text.slice(0, visibleCount)}
      </Text>
      {/* Highlight layer (cream, offset up-left) */}
      <Text style={[styles.titleText, styles.highlightText, styles.layeredText]}>
        {text.slice(0, visibleCount)}
      </Text>
      {/* Main fill layer (golden yellow) */}
      <Text style={[styles.titleText, styles.fillText, styles.layeredText]}>
        {text.slice(0, visibleCount)}
      </Text>
      {/* Cursor next to text */}
      {showCursor && (
        <Animated.Text
          style={[styles.cursorText, styles.fillText, styles.cursorPos, { opacity: cursorOpacity }]}
        >
          _
        </Animated.Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sugar - left aligned */}
      <Animated.View style={[styles.sugarRow, { transform: [{ scale: sugarScale }] }]}>
        {renderText(sugarText, sugarVisible, !sugarDone && sugarVisible >= 0)}
      </Animated.View>

      {/* WarZ - right aligned */}
      <Animated.View style={[styles.warzRow, { transform: [{ scale: warzScale }] }]}>
        {sugarDone && renderText(warzText, warzVisible, showWarzCursor)}
      </Animated.View>
    </View>
  );
}

// Scale font to screen width so it fits nicely
const fontSize = Math.min(SCREEN_WIDTH * 0.23, 100);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    minHeight: fontSize * 2.8,
  },
  sugarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: fontSize * 1.3,
    marginLeft: 10,
  },
  warzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    minHeight: fontSize * 1.3,
    marginRight: 10,
  },
  titleText: {
    fontFamily: 'PlayMeGames',
    fontSize: fontSize,
    lineHeight: fontSize * 1.2,
    includeFontPadding: false,
  },
  layeredText: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  outlineText: {
    color: '#5A1E3C',
    textShadowColor: '#5A1E3C',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  highlightText: {
    color: '#FFB8D9',
    textShadowColor: 'transparent',
    top: -2,
    left: -1,
  },
  fillText: {
    color: '#FF6FAE',
    textShadowColor: '#5A1E3C',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 1,
  },
  cursorText: {
    fontFamily: 'PlayMeGames',
    fontSize: fontSize,
    lineHeight: fontSize * 1.2,
    includeFontPadding: false,
  },
  cursorPos: {
    position: 'absolute',
    right: -fontSize * 0.55,
    top: 0,
  },
});
