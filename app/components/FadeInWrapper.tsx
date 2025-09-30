import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';

interface FadeInWrapperProps {
  children: React.ReactNode;
  shouldFadeIn?: boolean;
  duration?: number;
  onFadeInComplete?: () => void;
  style?: ViewStyle;
}

const FadeInWrapper = React.memo(function FadeInWrapper({
  children,
  shouldFadeIn = true,
  duration = 1000,
  onFadeInComplete,
  style,
}: FadeInWrapperProps) {
  const fadeAnim = useRef(new Animated.Value(shouldFadeIn ? 0 : 1)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (shouldFadeIn && !hasAnimated.current) {
      hasAnimated.current = true;
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
});

export default FadeInWrapper;