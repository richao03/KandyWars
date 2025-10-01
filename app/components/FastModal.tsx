import React, { useEffect } from 'react';
import {
  Dimensions,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FastModalProps {
  visible: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  animationType?: 'fade' | 'slide' | 'spring';
  backdropOpacity?: number;
  modalStyle?: ViewStyle;
}

export default function FastModal({
  visible,
  onClose,
  children,
  animationType = 'spring',
  backdropOpacity = 0.5,
  modalStyle,
}: FastModalProps) {
  const animationValue = useSharedValue(0);
  const backdropValue = useSharedValue(0);
  const [isRendered, setIsRendered] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      // Show modal
      backdropValue.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });

      if (animationType === 'spring') {
        animationValue.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
          mass: 0.8,
        });
      } else if (animationType === 'slide') {
        animationValue.value = withTiming(1, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        animationValue.value = withTiming(1, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      }
    } else {
      // Hide modal
      animationValue.value = withTiming(0, {
        duration: 200,
        easing: Easing.in(Easing.ease),
      });
      backdropValue.value = withTiming(
        0,
        {
          duration: 200,
          easing: Easing.in(Easing.ease),
        },
        () => {
          'worklet';
          runOnJS(setIsRendered)(false);
        }
      );
    }
  }, [visible, animationType]);

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropValue.value * backdropOpacity,
      display: backdropValue.value === 0 ? 'none' : 'flex',
    };
  });

  const modalAnimatedStyle = useAnimatedStyle(() => {
    if (animationType === 'slide') {
      return {
        opacity: animationValue.value,
        transform: [
          {
            translateY: interpolate(
              animationValue.value,
              [0, 1],
              [SCREEN_HEIGHT * 0.3, 0]
            ),
          },
        ],
      };
    } else if (animationType === 'spring') {
      return {
        opacity: animationValue.value,
        transform: [
          {
            scale: interpolate(animationValue.value, [0, 1], [0.8, 1]),
          },
          {
            translateY: interpolate(animationValue.value, [0, 1], [50, 0]),
          },
        ],
      };
    } else {
      return {
        opacity: animationValue.value,
      };
    }
  });

  if (!isRendered) {
    return null;
  }

  return (
    <View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
          elevation: 999999,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
      </TouchableWithoutFeedback>

      <View style={styles.modalContainer} pointerEvents="box-none">
        <Animated.View
          style={[styles.modal, modalStyle, modalAnimatedStyle]}
          pointerEvents="auto"
        >
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 999998,
    elevation: 999998,
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 999999,
    elevation: 999999,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10001,
    zIndex: 10001,
  },
});
