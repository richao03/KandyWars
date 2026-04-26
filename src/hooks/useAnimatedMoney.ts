/**
 * useAnimatedMoney
 *
 * Animates a numeric value from its previous state to a new target using
 * react-native-reanimated's withTiming, and optionally fires pitch-laddered
 * tick SFX during the count-up.
 *
 * Usage:
 * ```tsx
 * import Animated, { useAnimatedProps } from 'react-native-reanimated';
 * import { useAnimatedMoney } from '@/hooks/useAnimatedMoney';
 *
 * const AnimatedText = Animated.createAnimatedComponent(Text);
 *
 * function WalletHUD({ balance }: { balance: number }) {
 *   const animatedBalance = useAnimatedMoney(balance, { pitched: true });
 *   const animatedProps = useAnimatedProps(() => ({
 *     text: `$${animatedBalance.value.toFixed(2)}`,
 *   }));
 *   return <AnimatedText animatedProps={animatedProps} />;
 * }
 * ```
 */

import { useEffect, useRef } from 'react';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useAppSelector } from '../store/hooks';
import { selectReduceMotion } from '../store/slices/juiceSettingsSlice';
import { playMoneyTick } from '../utils/soundEffects';
import { computeCountUpDuration, computeTickTimestamps } from '../utils/animatedMoneyMath';

export interface UseAnimatedMoneyOptions {
  /** Fire pitch-laddered money tick sounds during count-up. Default false. */
  pitched?: boolean;
  /** Override the auto-computed duration (ms). */
  duration?: number;
  /** Number of tick sounds to fire during animation. Default 8. */
  tickCount?: number;
}

/**
 * Animates a numeric value toward `target` and optionally fires SFX ticks.
 *
 * @param target  The target number to animate to.
 * @param options Optional configuration.
 * @returns       A Reanimated SharedValue<number>. Bind to UI via useAnimatedProps.
 */
export function useAnimatedMoney(
  target: number,
  options: UseAnimatedMoneyOptions = {}
) {
  const reduceMotion = useAppSelector(selectReduceMotion);
  const { pitched = false, duration: durationOverride, tickCount = 8 } = options;

  const displayed = useSharedValue(target);
  const previousTargetRef = useRef(target);
  const tickTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const from = previousTargetRef.current;
    const to = target;
    previousTargetRef.current = to;

    if (from === to) return;

    // Cancel any pending tick sounds from a prior animation
    tickTimeoutsRef.current.forEach(clearTimeout);
    tickTimeoutsRef.current = [];

    if (reduceMotion) {
      displayed.value = to;
      return;
    }

    const duration = durationOverride ?? computeCountUpDuration(from, to);

    if (duration <= 0) {
      displayed.value = to;
      return;
    }

    displayed.value = withTiming(to, { duration, easing: Easing.out(Easing.exp) });

    if (pitched && to > from) {
      const timestamps = computeTickTimestamps(duration, tickCount);
      timestamps.forEach((offset, i) => {
        const timeout = setTimeout(() => {
          const progress = tickCount > 1 ? i / (tickCount - 1) : 1;
          playMoneyTick(progress);
        }, offset);
        tickTimeoutsRef.current.push(timeout);
      });
    }

    return () => {
      tickTimeoutsRef.current.forEach(clearTimeout);
      tickTimeoutsRef.current = [];
    };
  }, [target, reduceMotion, pitched, durationOverride, tickCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return displayed;
}
