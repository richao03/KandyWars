import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

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
    // Trigger light haptic feedback on press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[styles.touchable, style]}
    >
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
