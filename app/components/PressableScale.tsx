import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useAppSelector } from '../../src/store/hooks';
import { selectReduceMotion } from '../../src/store/slices/juiceSettingsSlice';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends PressableProps {
  /** Scale factor when pressed. Default 0.95 */
  pressedScale?: number;
  children: React.ReactNode;
}

/**
 * Drop-in replacement for Pressable / TouchableOpacity that adds a
 * spring press-down scale animation (I3 game-feel).
 * Respects the reduceMotion accessibility setting from juiceSettingsSlice.
 */
function PressableScale({
  pressedScale = 0.95,
  onPressIn,
  onPressOut,
  children,
  disabled,
  style,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useAppSelector(selectReduceMotion);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    if (!disabled && !reduceMotion) {
      scale.value = withSpring(pressedScale, { damping: 12, stiffness: 400 });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 12, stiffness: 400 });
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export default PressableScale;
