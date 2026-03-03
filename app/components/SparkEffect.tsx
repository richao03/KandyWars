import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface SparkEffectProps {
  numSparks: number;
  sparkColors: string[];
}

const SPARK_COUNT = 24;

function SparkEffect({ numSparks, sparkColors }: SparkEffectProps) {
  const sparkYValues = Array.from({ length: SPARK_COUNT }, () => useSharedValue(0));
  const sparkXValues = Array.from({ length: SPARK_COUNT }, () => useSharedValue(0));
  const sparkOpacityValues = Array.from({ length: SPARK_COUNT }, () => useSharedValue(0));
  const sparkScaleValues = Array.from({ length: SPARK_COUNT }, () => useSharedValue(1));
  const sparkColorProgress = Array.from({ length: SPARK_COUNT }, () => useSharedValue(0));

  useEffect(() => {
    if (numSparks > 0) {
      sparkYValues.forEach((sparkY, index) => {
        if (index < numSparks) {
          const delay = index * 10;
          const duration = 700 + (index % 5) * 50;
          const riseHeight = -36 - (index % 7) * 4;

          sparkY.value = withRepeat(
            withSequence(
              withTiming(0, { duration: delay }),
              withTiming(riseHeight, {
                duration: duration,
                easing: Easing.out(Easing.ease),
              }),
              withTiming(riseHeight, { duration: 0 })
            ),
            -1,
            false
          );
        } else {
          sparkY.value = 0;
        }
      });

      sparkXValues.forEach((sparkX, index) => {
        if (index < numSparks) {
          const delay = index * 10;
          const duration = 700 + (index % 5) * 50;
          const waveAmplitude = 8 + (index % 3) * 3;
          const waveDirection = index % 2 === 0 ? 1 : -1;

          sparkX.value = withRepeat(
            withSequence(
              withTiming(0, { duration: delay }),
              withTiming(waveDirection * waveAmplitude, {
                duration: duration / 2,
                easing: Easing.inOut(Easing.ease),
              }),
              withTiming(-waveDirection * waveAmplitude, {
                duration: duration / 2,
                easing: Easing.inOut(Easing.ease),
              }),
              withTiming(0, { duration: 0 })
            ),
            -1,
            false
          );
        } else {
          sparkX.value = 0;
        }
      });

      sparkOpacityValues.forEach((opacity, index) => {
        if (index < numSparks) {
          const delay = index * 10;
          const duration = 700 + (index % 5) * 50;

          opacity.value = withRepeat(
            withSequence(
              withTiming(0, { duration: delay }),
              withTiming(1, { duration: 150 }),
              withTiming(0, { duration: duration - 150 }),
              withTiming(0, { duration: 0 })
            ),
            -1,
            false
          );
        } else {
          opacity.value = 0;
        }
      });

      sparkScaleValues.forEach((scale, index) => {
        if (index < numSparks) {
          const delay = index * 10;
          const duration = 700 + (index % 5) * 50;

          scale.value = withRepeat(
            withSequence(
              withTiming(1, { duration: delay + 200 }),
              withTiming(0.5, { duration: duration - 200 }),
              withTiming(0.5, { duration: 0 })
            ),
            -1,
            false
          );
        } else {
          scale.value = 0;
        }
      });

      sparkColorProgress.forEach((colorProgress, index) => {
        if (index < numSparks) {
          const delay = index * 10;
          const duration = 700 + (index % 5) * 50;

          colorProgress.value = withRepeat(
            withSequence(
              withTiming(0, { duration: delay }),
              withTiming(1, {
                duration: duration,
                easing: Easing.out(Easing.ease),
              }),
              withTiming(1, { duration: 0 })
            ),
            -1,
            false
          );
        } else {
          colorProgress.value = 0;
        }
      });
    } else {
      sparkYValues.forEach((sparkY) => (sparkY.value = 0));
      sparkXValues.forEach((sparkX) => (sparkX.value = 0));
      sparkOpacityValues.forEach((opacity) => (opacity.value = 0));
      sparkScaleValues.forEach((scale) => (scale.value = 0));
      sparkColorProgress.forEach((colorProgress) => (colorProgress.value = 0));
    }
  }, [numSparks]);

  const animatedSparkStyles = Array.from({ length: SPARK_COUNT }, (_, i) =>
    useAnimatedStyle(() => ({
      transform: [
        { translateY: sparkYValues[i].value },
        { translateX: sparkXValues[i].value },
        { scale: sparkScaleValues[i].value },
      ],
      opacity: sparkOpacityValues[i].value,
    }))
  );

  const animatedSparkColorStyles = Array.from({ length: SPARK_COUNT }, (_, i) =>
    useAnimatedStyle(() => {
      const progress = sparkColorProgress[i].value;
      const borderColor = 'rgba(123,169,101,1)';
      const finalColor = sparkColors[i % sparkColors.length];
      return { color: progress < 0.3 ? borderColor : finalColor };
    })
  );

  return (
    <View style={styles.sparkContainerBehind}>
      {animatedSparkStyles.map((animatedStyle, index) => {
        if (index >= numSparks) return null;

        const spacing = 100 / (numSparks + 1);
        const leftPosition = `${spacing * (index + 1)}%`;
        const sizes = [14, 16, 18, 20];
        const size = sizes[index % sizes.length];

        return (
          <Animated.Text
            key={index}
            style={[
              styles.sparkText,
              {
                left: leftPosition,
                fontSize: size,
              },
              animatedStyle,
              animatedSparkColorStyles[index],
            ]}
          >
            $
          </Animated.Text>
        );
      })}
    </View>
  );
}

export default React.memo(SparkEffect);

const styles = StyleSheet.create({
  sparkContainerBehind: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    pointerEvents: 'none',
    zIndex: -1,
  },
  sparkText: {
    position: 'absolute',
    bottom: 0,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
});
