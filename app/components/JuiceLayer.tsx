import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../src/store/hooks';
import { selectReduceMotion } from '../../src/store/slices/juiceSettingsSlice';
import {
  FlashOptions,
  JuiceController,
  JuiceLayerApi,
  nextPoolIndex,
  PopupOptions,
  PopupOrigin,
  VignetteOptions,
} from '../../src/utils/juiceController';
import { SparkPool } from './SparkEffect';

/**
 * JuiceLayer
 *
 * Full-screen overlay that renders three kinds of feedback:
 *   1. Color flash (opacity pulse on a solid tint)
 *   2. Color vignette (edge-tinted gradient that pulses in/out)
 *   3. Floating number popups (pool of 8 animated text nodes)
 *
 * Mounted once in `app/_layout.tsx` as the last child of the root so it
 * overlays every screen. `pointerEvents: 'none'` at every level keeps
 * touches passing through to the underlying UI.
 *
 * On mount we register an imperative API with `JuiceController` so any
 * module can trigger effects without React props. On unmount we call
 * `JuiceController.reset()` to stop any in-flight effects and clear the
 * registration.
 *
 * Reduce-motion behavior (when `selectReduceMotion` is true):
 *   - Flash: unchanged (opacity-only already).
 *   - Vignette: reduced peak intensity; no pulse feel (shortened hold).
 *   - Popups: opacity fade only, no translateY rise, no scale punch.
 */

const POPUP_POOL_SIZE = 8;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface PopupSlot {
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  duration: number;
}

interface AnimatedPopupProps {
  reduceMotion: boolean;
}

interface AnimatedPopupHandle {
  fire: (slot: PopupSlot) => void;
  reset: () => void;
}

// Popup pool member: own shared values for translateY / opacity / scale.
const AnimatedPopup = React.forwardRef<AnimatedPopupHandle, AnimatedPopupProps>(
  function AnimatedPopup({ reduceMotion }, ref) {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(1);
    const [slot, setSlot] = React.useState<PopupSlot | null>(null);

    React.useImperativeHandle(ref, () => ({
      fire(next: PopupSlot) {
        setSlot(next);
        // Reset shared values
        translateY.value = 0;
        opacity.value = 0;
        scale.value = reduceMotion ? 1 : Math.max(0.1, next.scale * 0.6);

        const dur = next.duration;
        const rise = reduceMotion ? 0 : -48;

        opacity.value = withSequence(
          withTiming(1, { duration: Math.min(120, dur * 0.25), easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: dur * 0.75, easing: Easing.in(Easing.quad) })
        );

        if (!reduceMotion) {
          translateY.value = withTiming(rise, {
            duration: dur,
            easing: Easing.out(Easing.quad),
          });
          scale.value = withSequence(
            withTiming(next.scale, { duration: Math.min(180, dur * 0.3), easing: Easing.out(Easing.back(2)) }),
            withTiming(next.scale * 0.9, { duration: dur * 0.7, easing: Easing.in(Easing.quad) })
          );
        }
      },
      reset() {
        translateY.value = 0;
        opacity.value = 0;
        scale.value = 1;
      },
    }));

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }, { scale: scale.value }],
    }));

    if (!slot) return null;

    return (
      <Animated.Text
        style={[
          styles.popupText,
          {
            left: slot.x,
            top: slot.y,
            color: slot.color,
          },
          animatedStyle,
        ]}
        pointerEvents="none"
      >
        {slot.text}
      </Animated.Text>
    );
  }
);

function JuiceLayer() {
  const reduceMotion = useAppSelector(selectReduceMotion);

  // Flash + vignette shared state
  const flashOpacity = useSharedValue(0);
  const flashColorRef = useRef<string>('#FFFFFF');
  const [flashColor, setFlashColor] = React.useState<string>('#FFFFFF');

  const vignetteOpacity = useSharedValue(0);
  const [vignetteColor, setVignetteColor] = React.useState<string>('#000000');

  // Popup pool refs
  const popupRefs = useRef<(AnimatedPopupHandle | null)[]>(
    Array.from({ length: POPUP_POOL_SIZE }, () => null)
  );
  const popupIndexRef = useRef<number>(0);

  const fireFlash = useCallback(
    (opts: FlashOptions) => {
      const maxOpacity = opts.maxOpacity ?? 0.5;
      const duration = opts.duration ?? 400;
      flashColorRef.current = opts.color;
      setFlashColor(opts.color);

      const fadeIn = Math.min(120, duration * 0.3);
      const fadeOut = Math.max(0, duration - fadeIn);

      flashOpacity.value = withSequence(
        withTiming(maxOpacity, { duration: fadeIn, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: fadeOut, easing: Easing.in(Easing.quad) })
      );
    },
    [flashOpacity]
  );

  const fireVignette = useCallback(
    (opts: VignetteOptions) => {
      const intensity = opts.intensity ?? 0.6;
      const duration = opts.duration ?? 500;
      setVignetteColor(opts.color);

      const effectiveIntensity = reduceMotion ? intensity * 0.5 : intensity;
      const fadeIn = Math.min(150, duration * 0.3);
      const fadeOut = Math.max(0, duration - fadeIn);

      vignetteOpacity.value = withSequence(
        withTiming(effectiveIntensity, {
          duration: fadeIn,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0, { duration: fadeOut, easing: Easing.in(Easing.quad) })
      );
    },
    [vignetteOpacity, reduceMotion]
  );

  const firePopup = useCallback(
    (text: string, origin: PopupOrigin, opts?: PopupOptions) => {
      const idx = popupIndexRef.current;
      popupIndexRef.current = nextPoolIndex(idx, POPUP_POOL_SIZE);
      const handle = popupRefs.current[idx];
      if (!handle) return;

      handle.fire({
        text,
        x: origin.x,
        y: origin.y,
        color: opts?.color ?? '#FFD700',
        scale: opts?.scale ?? 1.0,
        duration: opts?.duration ?? 600,
      });
    },
    []
  );

  const fireReset = useCallback(() => {
    flashOpacity.value = 0;
    vignetteOpacity.value = 0;
    popupRefs.current.forEach((h) => h?.reset());
    popupIndexRef.current = 0;
  }, [flashOpacity, vignetteOpacity]);

  useEffect(() => {
    const api: JuiceLayerApi = {
      fireFlash,
      fireVignette,
      firePopup,
      fireReset,
    };
    JuiceController.register(api);
    return () => {
      JuiceController.reset();
      JuiceController.unregister();
    };
  }, [fireFlash, fireVignette, firePopup, fireReset]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const vignetteStyle = useAnimatedStyle(() => ({
    opacity: vignetteOpacity.value,
  }));

  return (
    <View style={styles.root} pointerEvents="none">
      {/* Flash overlay — solid color full-screen */}
      <Animated.View
        style={[styles.flash, { backgroundColor: flashColor }, flashStyle]}
        pointerEvents="none"
      />
      {/* Vignette overlay — radial-style edge tint via concentric gradients */}
      <Animated.View style={[styles.vignette, vignetteStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', vignetteColor]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[vignetteColor, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', vignetteColor]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[vignetteColor, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 0.5, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Popup pool */}
      {Array.from({ length: POPUP_POOL_SIZE }).map((_, i) => (
        <AnimatedPopup
          key={i}
          reduceMotion={reduceMotion}
          ref={(h) => {
            popupRefs.current[i] = h;
          }}
        />
      ))}
      <SparkPool />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    zIndex: 9999,
    elevation: 9999,
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  popupText: {
    position: 'absolute',
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    fontSize: 22,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default React.memo(JuiceLayer);
