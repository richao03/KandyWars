import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SoundEffects } from '../../src/utils/soundEffects';

interface PressableButtonProps {
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  disabled?: boolean;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
  activeOpacity?: number;
}

export default function PressableButton({
  onPress,
  style,
  children,
  disabled = false,
  shadowColor = '#000',
  shadowOffset = { width: 0, height: 3 },
  shadowOpacity = 1,
  shadowRadius = 4,
  elevation = 6,
  activeOpacity = 1,
}: PressableButtonProps) {
  const translateY = useSharedValue(0);
  const shadowOpacityValue = useSharedValue(shadowOpacity);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedShadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: shadowOpacityValue.value,
    elevation: disabled ? 2 : elevation - translateY.value / 2,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    // Trigger light haptic feedback and pop sound on press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    SoundEffects.playRandomPop();
    // Push down effect - very fast and no bounce
    translateY.value = withSpring(4, {
      damping: 1000,
      stiffness: 1500,
    });
    // Reduce shadow when pressed down
    shadowOpacityValue.value = withSpring(shadowOpacity * 0.4, {
      damping: 1000,
      stiffness: 1500,
    });
  };

  const handlePressOut = () => {
    if (disabled) return;

    // Return to original position - very fast and no bounce
    translateY.value = withSpring(0, {
      damping: 1000,
      stiffness: 1500,
    });

    // Restore shadow
    shadowOpacityValue.value = withSpring(shadowOpacity, {
      damping: 1000,
      stiffness: 1500,
    });
  };

  const shadowView = (
    <Animated.View
      style={[
        styles.shadow,
        {
          shadowColor,
          shadowOffset,
          shadowRadius,
        },
        animatedShadowStyle,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );

  // When no onPress is provided, the consumer is relying on a parent pressable
  // (e.g. PressableScale) to handle taps. Rendering a TouchableOpacity here
  // would claim the responder and silently swallow the parent's onPress.
  if (!onPress) {
    return <View style={[styles.touchable, style]}>{shadowView}</View>;
  }

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[styles.touchable, style]}
    >
      {shadowView}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    // Ensure touchable doesn't add extra spacing
  },
  shadow: {
    // Platform-specific shadow defaults
    ...Platform.select({
      ios: {
        shadowColor: '#000',
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
