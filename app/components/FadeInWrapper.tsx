import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';

interface FadeInWrapperProps {
  children: React.ReactNode;
  shouldFadeIn?: boolean;
  duration?: number;
  onFadeInComplete?: () => void;
  style?: ViewStyle;
}

export default function FadeInWrapper({
  children,
  shouldFadeIn = true,
  duration = 1000,
  onFadeInComplete,
  style,
}: FadeInWrapperProps) {
  const fadeAnim = useRef(new Animated.Value(shouldFadeIn ? 0 : 1)).current;

  useEffect(() => {
    if (shouldFadeIn) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(() => {
        if (onFadeInComplete) {
          onFadeInComplete();
        }
      });
    }
  }, [shouldFadeIn, fadeAnim, duration, onFadeInComplete]);

  return (
    <Animated.View style={[{ flex: 1, opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
}