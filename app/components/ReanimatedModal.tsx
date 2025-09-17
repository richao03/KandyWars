import React, { useEffect, useCallback, ReactNode } from 'react';
import {
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type AnimationType = 'slideInUp' | 'slideInDown' | 'fadeIn' | 'zoomIn' | 'slideInRight' | 'slideInLeft';

interface ReanimatedModalProps {
  // react-native-modal compatible props
  isVisible?: boolean;
  visible?: boolean; // Support both isVisible and visible
  children: ReactNode;
  animationIn?: AnimationType | string;
  animationOut?: string;
  animationInTiming?: number;
  animationOutTiming?: number;
  backdropTransitionInTiming?: number;
  backdropTransitionOutTiming?: number;
  onBackdropPress?: () => void;
  onBackButtonPress?: () => void;
  useNativeDriver?: boolean;
  useNativeDriverForBackdrop?: boolean;
  backdropOpacity?: number;
  backdropColor?: string;
  hideModalContentWhileAnimating?: boolean;

  // Regular React Native Modal props
  transparent?: boolean;
  animationType?: 'none' | 'slide' | 'fade';
  onRequestClose?: () => void;
  onShow?: () => void;
  onDismiss?: () => void;

  // Additional performance props
  renderToHardwareTextureAndroid?: boolean;
  style?: any;
  avoidKeyboard?: boolean;
  coverScreen?: boolean;
  deviceHeight?: number;
  deviceWidth?: number;
  hasBackdrop?: boolean;
  propagateSwipe?: boolean;
  swipeDirection?: string | string[];
  swipeThreshold?: number;
  scrollTo?: () => void;
  scrollOffset?: number;
  scrollOffsetMax?: number;
  supportedOrientations?: string[];
}

const ReanimatedModal: React.FC<ReanimatedModalProps> = ({
  isVisible: isVisibleProp,
  visible: visibleProp,
  children,
  animationIn = 'slideInUp',
  animationOut = 'slideOutDown',
  animationInTiming = 300,
  animationOutTiming = 200,
  backdropTransitionInTiming = 300,
  backdropTransitionOutTiming = 200,
  onBackdropPress,
  onBackButtonPress,
  backdropOpacity = 0.7,
  backdropColor = 'black',
  hideModalContentWhileAnimating = false,
  transparent = true,
  animationType = 'none',
  onRequestClose,
  onShow,
  onDismiss,
  avoidKeyboard = false,
  coverScreen = true,
  hasBackdrop = true,
  ...otherProps
}) => {
  // Support both isVisible and visible props
  const isVisible = isVisibleProp ?? visibleProp ?? false;

  // Animation values
  const animationProgress = useSharedValue(0);
  const backdropProgress = useSharedValue(0);
  const contentOpacity = useSharedValue(hideModalContentWhileAnimating ? 0 : 1);

  // Handle back button on Android
  useEffect(() => {
    if (Platform.OS === 'android' && isVisible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (onBackButtonPress) {
          onBackButtonPress();
          return true;
        }
        if (onRequestClose) {
          onRequestClose();
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    }
  }, [isVisible, onBackButtonPress, onRequestClose]);

  // Handle show/hide animations
  useEffect(() => {
    if (isVisible) {
      // Show modal
      if (onShow) {
        runOnJS(onShow)();
      }

      backdropProgress.value = withTiming(1, {
        duration: backdropTransitionInTiming,
        easing: Easing.out(Easing.ease),
      });

      animationProgress.value = withTiming(1, {
        duration: animationInTiming,
        easing: Easing.out(Easing.back(1)),
      }, () => {
        if (hideModalContentWhileAnimating) {
          contentOpacity.value = withTiming(1, { duration: 100 });
        }
      });
    } else {
      // Hide modal
      if (hideModalContentWhileAnimating) {
        contentOpacity.value = 0;
      }

      animationProgress.value = withTiming(0, {
        duration: animationOutTiming,
        easing: Easing.in(Easing.ease),
      });

      backdropProgress.value = withTiming(0, {
        duration: backdropTransitionOutTiming,
        easing: Easing.in(Easing.ease),
      }, () => {
        if (onDismiss) {
          runOnJS(onDismiss)();
        }
      });
    }
  }, [isVisible]);

  // Get animation style based on animation type
  const getAnimationStyle = useCallback(() => {
    'worklet';

    const progress = animationProgress.value;

    // Map react-native-modal animation names to transformations
    if (animationIn === 'slideInUp' || animationType === 'slide') {
      return {
        transform: [
          {
            translateY: interpolate(
              progress,
              [0, 1],
              [SCREEN_HEIGHT, 0]
            ),
          },
        ],
      };
    } else if (animationIn === 'slideInDown') {
      return {
        transform: [
          {
            translateY: interpolate(
              progress,
              [0, 1],
              [-SCREEN_HEIGHT, 0]
            ),
          },
        ],
      };
    } else if (animationIn === 'slideInRight') {
      return {
        transform: [
          {
            translateX: interpolate(
              progress,
              [0, 1],
              [SCREEN_WIDTH, 0]
            ),
          },
        ],
      };
    } else if (animationIn === 'slideInLeft') {
      return {
        transform: [
          {
            translateX: interpolate(
              progress,
              [0, 1],
              [-SCREEN_WIDTH, 0]
            ),
          },
        ],
      };
    } else if (animationIn === 'fadeIn' || animationType === 'fade') {
      return {
        opacity: progress,
      };
    } else if (animationIn === 'zoomIn') {
      return {
        opacity: progress,
        transform: [
          {
            scale: interpolate(
              progress,
              [0, 1],
              [0.3, 1]
            ),
          },
        ],
      };
    }

    // Default to slide up
    return {
      transform: [
        {
          translateY: interpolate(
            progress,
            [0, 1],
            [SCREEN_HEIGHT, 0]
          ),
        },
      ],
    };
  }, [animationIn, animationType]);

  // Animated styles
  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropProgress.value * backdropOpacity,
      display: backdropProgress.value === 0 ? 'none' : 'flex',
    };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      ...getAnimationStyle(),
    };
  });

  // Don't render if not visible and animation is complete
  if (!isVisible && animationProgress.value === 0) {
    return null;
  }

  const content = (
    <View style={StyleSheet.absoluteFillObject} pointerEvents={isVisible ? 'auto' : 'none'}>
      {/* Backdrop */}
      {hasBackdrop && (
        <TouchableWithoutFeedback onPress={onBackdropPress || onRequestClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: backdropColor },
              backdropAnimatedStyle,
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.content,
          contentAnimatedStyle,
          otherProps.style,
        ]}
        pointerEvents="box-none"
      >
        {children}
      </Animated.View>
    </View>
  );

  // Wrap with KeyboardAvoidingView if needed
  if (avoidKeyboard) {
    return (
      <GestureHandlerRootView style={StyleSheet.absoluteFillObject}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={StyleSheet.absoluteFillObject}
        >
          {content}
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFillObject}>
      {content}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReanimatedModal;