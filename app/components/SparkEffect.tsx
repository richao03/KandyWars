import React, { useEffect, useRef } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { TierLevel } from '../../src/utils/computeEffectTier';

/* --------------------------------------------------------------------------
 * Device-memory clamp — SX-g
 * Detect low-memory devices once at module load (not per render).
 * expo-device is installed (^8.0.9), so we use it; fall back to false stub.
 * ------------------------------------------------------------------------ */

let DEVICE_IS_LOW_MEMORY = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Device = require('expo-device') as {
    totalMemory: number | null | undefined;
  };
  const mem = Device.totalMemory;
  if (typeof mem === 'number' && mem > 0) {
    DEVICE_IS_LOW_MEMORY = mem < 3 * 1024 * 1024 * 1024; // < 3 GB
  }
} catch {
  // expo-device unavailable — treat as capable device
  DEVICE_IS_LOW_MEMORY = false;
}

/**
 * SparkEffect — tier-aware celebration particles.
 *
 * Architecture (refactored Wave 2):
 *   - One parent-owned `progress` SharedValue drives ALL sparks. Each Spark
 *     derives a per-index offset from it via `useAnimatedStyle` instead of
 *     running its own `withRepeat` chain of 5 shared values. At jackpot tier
 *     (24 sparks) this drops us from ~600 active UI-thread timers to 1.
 *   - Subcomponent per spark preserved so hook order stays stable across
 *     renders (no conditional hooks).
 *
 * Modes:
 *   - `ambient` (default, back-compat) — continuous loop behind sell button.
 *   - `burst` — one-shot radial emission from `origin`, non-looping.
 *   - `arc`   — single particle flies along a quadratic Bezier from `from`
 *               → `to`, displaying `symbol` as text. One-shot.
 *
 * Wave 3 additions (SX-c, SX-d, SX-g):
 *   - Tier-aware symbols in burst/pulse mode.
 *   - Jackpot-only gravity arc, rotation, and ghost trails.
 *   - Device-memory clamp on jackpot particle count.
 */

/* --------------------------------------------------------------------------
 * Public props
 * ------------------------------------------------------------------------ */

export type SparkMode = 'ambient' | 'burst' | 'arc';

export interface SparkEffectProps {
  /** Number of particles. Ignored in `arc` mode (always 1). */
  numSparks: number;
  /** Ordered tier palette — each spark picks a color by index. */
  sparkColors: string[];
  /** Emission mode. Defaults to `ambient` for backward compatibility. */
  mode?: SparkMode;
  /** Active tier — drives symbol selection and jackpot physics. */
  tier?: TierLevel;
  /** Burst origin in local coords. Required when `mode==='burst'`. */
  origin?: { x: number; y: number };
  /** Arc start point. Required when `mode==='arc'`. */
  from?: { x: number; y: number };
  /** Arc end point. Required when `mode==='arc'`. */
  to?: { x: number; y: number };
  /** Symbol text for arc mode (e.g. "+$500", "×2"). */
  symbol?: string;
  /**
   * Change this value to re-trigger a burst/arc animation. The parent can
   * bump it (e.g. `trigger={Date.now()}`) to imperatively restart.
   */
  trigger?: number;
  /** Called after a one-shot (burst/arc) animation finishes. */
  onComplete?: () => void;
  /**
   * Optional image asset. When set in `burst` mode, each spark renders this
   * image instead of a text symbol — useful for branded particles like
   * candy.png in the climaxExplosion.
   */
  imageSource?: number;
  /**
   * Ambient mode only — bump this number to disperse the currently-rising
   * sparks outward (radial-ish blast: upward + horizontal away from center)
   * and fade them out. Use together with unmounting the SparkEffect after
   * the dispersal duration if you don't want the ambient loop to resume.
   */
  disperseTrigger?: number;
  /**
   * Arc mode only — shifts the bezier control point so the trajectory bends
   * left (negative X) or right (positive X) regardless of from/to positions.
   */
  controlOffset?: { x: number; y: number };
}

/* --------------------------------------------------------------------------
 * Internal spark prop interfaces
 * ------------------------------------------------------------------------ */

interface AmbientSparkProps {
  index: number;
  numSparks: number;
  sparkColors: string[];
  progress: SharedValue<number>;
  /** 0 = normal ambient motion, 1 = fully dispersed. Drives the explosion. */
  disperseProgress: SharedValue<number>;
  imageSource?: number;
}

interface BurstSparkProps {
  index: number;
  numSparks: number;
  sparkColors: string[];
  progress: SharedValue<number>;
  origin: { x: number; y: number };
  symbol: string;
  isJackpot?: boolean;
  imageSource?: number;
}

const SPARK_SIZES = [14, 16, 18, 20];

/* --------------------------------------------------------------------------
 * Ambient spark — derives motion from shared parent progress
 * ------------------------------------------------------------------------ */

function AmbientSpark({
  index,
  numSparks,
  sparkColors,
  progress,
  disperseProgress,
  imageSource,
}: AmbientSparkProps) {
  // Spread sparks more vertically and horizontally so the trail behind the
  // sell button reads less cramped.
  const riseHeight = -60 - (index % 7) * 8;       // -60 .. -108 px (was -36 .. -60)
  const waveAmplitude = 16 + (index % 3) * 6;     // 16 .. 28 px   (was 8 .. 14)
  // Dispersal: spark flies outward away from the row's horizontal center.
  // Mapped from leftPosition: leftmost spark = -1 (fly left), rightmost = +1.
  const explodeDirection =
    numSparks > 1 ? ((index + 1) / (numSparks + 1) - 0.5) * 2 : 0; // -1 .. +1
  const explodeDistanceX = 140 + (index % 5) * 14; // varies per spark
  const explodeDistanceY = 220 + (index % 4) * 12; // upward distance
  const waveDirection = index % 2 === 0 ? 1 : -1;
  const stagger = (index * 0.04) % 1;
  const finalColor = sparkColors[index % sparkColors.length];
  const borderColor = 'rgba(123,169,101,1)';

  const animatedSparkStyle = useAnimatedStyle(() => {
    'worklet';
    const dp = disperseProgress.value;
    if (dp > 0) {
      // Dispersal: explode outward (horizontal away from center) and upward,
      // fade out. Ignores ambient motion mid-dispersal so the snap is a
      // clean blast rather than fighting the loop.
      const translateX = explodeDirection * explodeDistanceX * dp;
      const translateY = -explodeDistanceY * dp;
      const opacity = Math.max(0, 1 - dp);
      const scale = 1 - 0.5 * dp;
      return {
        transform: [{ translateY }, { translateX }, { scale }],
        opacity,
      };
    }
    const local = (progress.value + stagger) % 1;
    // Rise: ease-out-ish across the full loop
    const translateY = interpolate(local, [0, 1], [0, riseHeight]);
    // Wave: sine-like — positive half, then negative half
    const wave = Math.sin(local * Math.PI * 2);
    const translateX = wave * waveAmplitude * waveDirection;
    // Opacity: ramp in fast (0→0.1), hold, fade out (0.6→1)
    let opacity = 0;
    if (local < 0.1) {
      opacity = local / 0.1;
    } else if (local < 0.6) {
      opacity = 1;
    } else {
      opacity = Math.max(0, 1 - (local - 0.6) / 0.4);
    }
    // Scale: 1 → 0.5 as it rises
    const scale = interpolate(local, [0, 1], [1, 0.5]);

    return {
      transform: [{ translateY }, { translateX }, { scale }],
      opacity,
    };
  });

  const animatedSparkColorStyle = useAnimatedStyle(() => {
    'worklet';
    const local = (progress.value + stagger) % 1;
    return { color: local < 0.15 ? borderColor : finalColor };
  });

  const spacing = 100 / (numSparks + 1);
  const leftPosition = `${spacing * (index + 1)}%` as const;
  const size = SPARK_SIZES[index % SPARK_SIZES.length];
  const imageSize = size * 1.6;

  if (imageSource) {
    return (
      <AnimatedImage
        source={imageSource}
        style={[
          styles.sparkImage,
          {
            left: leftPosition,
            width: imageSize,
            height: imageSize,
          },
          animatedSparkStyle,
        ]}
        resizeMode="contain"
      />
    );
  }

  return (
    <Animated.Text
      style={[
        styles.sparkText,
        {
          left: leftPosition,
          fontSize: size,
        },
        animatedSparkStyle,
        animatedSparkColorStyle,
      ]}
    >
      $
    </Animated.Text>
  );
}

/* --------------------------------------------------------------------------
 * Jackpot burst spark — gravity arc + rotation + trails (SX-d)
 * Only rendered when tier === 'jackpot'.
 * ------------------------------------------------------------------------ */

interface JackpotBurstSparkProps {
  index: number;
  numSparks: number;
  sparkColors: string[];
  progress: SharedValue<number>;
  origin: { x: number; y: number };
  symbol: string;
}

/** Renders the main jackpot spark plus 2 trailing ghost sparks. */
function JackpotBurstSpark({
  index,
  numSparks,
  sparkColors,
  progress,
  origin,
  symbol,
}: JackpotBurstSparkProps) {
  const angle = (index / Math.max(1, numSparks)) * Math.PI * 2;
  // Wider radial spread for a more dramatic climax explosion.
  const radius = 90 + (index % 5) * 16;
  const dx = Math.cos(angle) * radius;
  // dy unused: jackpot Y motion uses gravity arc interpolation, not radial spread
  const finalColor = sparkColors[index % sparkColors.length] ?? '#ffffff';
  const size = SPARK_SIZES[index % SPARK_SIZES.length];
  // Random rotation direction per spark — deterministic via index
  const rotationDirection = index % 2 === 0 ? 1 : -1;
  const riseHeight = 110 + (index % 4) * 14;

  // Jackpot physics: gravity arc (toss up then fall back) + rotation
  const mainAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    const translateX = origin.x + dx * p;
    // Two-part: rise with Easing.out then partial fall — we approximate with
    // interpolation keyframes here since the parent progress drives us linearly.
    // At p=0.5 peak, at p=1 slightly fallen back.
    const peakY = origin.y - riseHeight;
    const fallbackY = origin.y - riseHeight * 0.7;
    let translateY: number;
    if (p < 0.5) {
      translateY = interpolate(p, [0, 0.5], [origin.y, peakY]);
    } else {
      translateY = interpolate(p, [0.5, 1], [peakY, fallbackY]);
    }
    // Fade in fast, then out
    let opacity = 0;
    if (p < 0.1) {
      opacity = p / 0.1;
    } else {
      opacity = Math.max(0, 1 - (p - 0.1) / 0.9);
    }
    const scale = interpolate(p, [0, 1], [1, 0.4]);
    // Rotation: 0 → ±360° over duration
    const rotate = `${rotationDirection * p * 360}deg`;

    return {
      transform: [{ translateX }, { translateY }, { scale }, { rotate }],
      opacity,
    };
  });

  // Ghost trail at -40ms offset (offset by 0.04 of a 900ms animation ≈ 36ms)
  const ghost1AnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = Math.max(0, progress.value - 0.04);
    const translateX = origin.x + dx * p;
    const peakY = origin.y - riseHeight;
    const fallbackY = origin.y - riseHeight * 0.7;
    let translateY: number;
    if (p < 0.5) {
      translateY = interpolate(p, [0, 0.5], [origin.y, peakY]);
    } else {
      translateY = interpolate(p, [0.5, 1], [peakY, fallbackY]);
    }
    let baseOpacity = 0;
    if (p < 0.1) {
      baseOpacity = p / 0.1;
    } else {
      baseOpacity = Math.max(0, 1 - (p - 0.1) / 0.9);
    }
    const scale = interpolate(p, [0, 1], [1, 0.4]);
    const rotate = `${rotationDirection * p * 360}deg`;
    return {
      transform: [{ translateX }, { translateY }, { scale }, { rotate }],
      opacity: baseOpacity * 0.3,
    };
  });

  // Ghost trail at -80ms offset (0.09 of 900ms ≈ 81ms)
  const ghost2AnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = Math.max(0, progress.value - 0.09);
    const translateX = origin.x + dx * p;
    const peakY = origin.y - riseHeight;
    const fallbackY = origin.y - riseHeight * 0.7;
    let translateY: number;
    if (p < 0.5) {
      translateY = interpolate(p, [0, 0.5], [origin.y, peakY]);
    } else {
      translateY = interpolate(p, [0.5, 1], [peakY, fallbackY]);
    }
    let baseOpacity = 0;
    if (p < 0.1) {
      baseOpacity = p / 0.1;
    } else {
      baseOpacity = Math.max(0, 1 - (p - 0.1) / 0.9);
    }
    const scale = interpolate(p, [0, 1], [1, 0.4]);
    const rotate = `${rotationDirection * p * 360}deg`;
    return {
      transform: [{ translateX }, { translateY }, { scale }, { rotate }],
      opacity: baseOpacity * 0.15,
    };
  });

  return (
    <>
      {/* Ghost trail 2 (oldest, lowest opacity) */}
      <Animated.Text
        style={[
          styles.burstSparkText,
          { fontSize: size, color: finalColor },
          ghost2AnimatedStyle,
        ]}
      >
        {symbol}
      </Animated.Text>
      {/* Ghost trail 1 */}
      <Animated.Text
        style={[
          styles.burstSparkText,
          { fontSize: size, color: finalColor },
          ghost1AnimatedStyle,
        ]}
      >
        {symbol}
      </Animated.Text>
      {/* Main spark */}
      <Animated.Text
        style={[
          styles.burstSparkText,
          { fontSize: size, color: finalColor },
          mainAnimatedStyle,
        ]}
      >
        {symbol}
      </Animated.Text>
    </>
  );
}

/* --------------------------------------------------------------------------
 * Burst spark — radial one-shot, non-looping
 * ------------------------------------------------------------------------ */

const AnimatedImage = Animated.createAnimatedComponent(Image);

function BurstSpark({
  index,
  numSparks,
  sparkColors,
  progress,
  origin,
  symbol,
  imageSource,
}: BurstSparkProps) {
  const angle = (index / Math.max(1, numSparks)) * Math.PI * 2;
  // Vary radius a little per index for organic feel — widened for a more
  // dramatic climax spread.
  const radius = 90 + (index % 5) * 16;
  const dx = Math.cos(angle) * radius;
  const dy = Math.sin(angle) * radius;
  const finalColor = sparkColors[index % sparkColors.length] ?? '#ffffff';
  const size = SPARK_SIZES[index % SPARK_SIZES.length];
  // Image particles render larger than text so the candy.png stays readable.
  const imageSize = size * 1.6;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    const translateX = origin.x + dx * p;
    const translateY = origin.y + dy * p;
    // Fade in fast, then out
    let opacity = 0;
    if (p < 0.1) {
      opacity = p / 0.1;
    } else {
      opacity = Math.max(0, 1 - (p - 0.1) / 0.9);
    }
    const scale = interpolate(p, [0, 1], [1, 0.4]);
    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity,
    };
  });

  if (imageSource) {
    return (
      <AnimatedImage
        source={imageSource}
        style={[
          styles.burstSparkImage,
          { width: imageSize, height: imageSize },
          animatedStyle,
        ]}
        resizeMode="contain"
      />
    );
  }

  return (
    <Animated.Text
      style={[
        styles.burstSparkText,
        { fontSize: size, color: finalColor },
        animatedStyle,
      ]}
    >
      {symbol}
    </Animated.Text>
  );
}

/* --------------------------------------------------------------------------
 * Arc — single particle along a quadratic Bezier
 * ------------------------------------------------------------------------ */

interface ArcProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  symbol: string;
  color: string;
  progress: SharedValue<number>;
  /** Optional offset applied to the bezier midpoint to bend the trajectory. */
  controlOffset?: { x: number; y: number };
}

function ArcParticle({
  from,
  to,
  symbol,
  color,
  progress,
  controlOffset,
}: ArcProps) {
  // Bezier control point: midpoint raised above the line by a fraction of dx,
  // optionally shifted horizontally to force the arc to bend left/right.
  const midX = (from.x + to.x) / 2 + (controlOffset?.x ?? 0);
  const midY = Math.min(from.y, to.y) - 60 + (controlOffset?.y ?? 0);

  // The symbol text is positioned via translateX/Y at its TOP-LEFT corner,
  // so we offset back by half its rough rendered size to center it on the
  // bezier path point. fontSize is 18 (PixeloidMono ~10px char width).
  const symbolHalfWidth = (symbol.length * 10) / 2;
  const symbolHalfHeight = 9;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const t = progress.value;
    const oneMinusT = 1 - t;
    // Quadratic Bezier: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
    const x =
      oneMinusT * oneMinusT * from.x + 2 * oneMinusT * t * midX + t * t * to.x;
    const y =
      oneMinusT * oneMinusT * from.y + 2 * oneMinusT * t * midY + t * t * to.y;
    let opacity = 1;
    if (t < 0.08) {
      opacity = t / 0.08;
    } else if (t > 0.85) {
      opacity = Math.max(0, 1 - (t - 0.85) / 0.15);
    }
    const scale = interpolate(t, [0, 0.3, 1], [0.8, 1.1, 0.9]);
    return {
      transform: [
        { translateX: x - symbolHalfWidth },
        { translateY: y - symbolHalfHeight },
        { scale },
      ],
      opacity,
    };
  });

  return (
    <Animated.Text style={[styles.arcText, { color }, animatedStyle]}>
      {symbol}
    </Animated.Text>
  );
}

/* --------------------------------------------------------------------------
 * Main component
 * ------------------------------------------------------------------------ */

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function SparkEffect({
  numSparks,
  sparkColors,
  mode = 'ambient',
  tier = 'none',
  origin,
  from,
  to,
  symbol = '$',
  trigger,
  onComplete,
  imageSource,
  disperseTrigger,
  controlOffset,
}: SparkEffectProps) {
  const progress = useSharedValue(0);
  const disperseProgress = useSharedValue(0);

  // Ambient loop — runs forever once mounted. Linear easing so the rise
  // stays constant-speed (the previous Easing.out felt like the animation
  // was slowing down as each cycle ended).
  useEffect(() => {
    if (mode !== 'ambient') return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.linear }),
      -1,
      false
    );
  }, [mode, progress]);

  // Dispersal — when disperseTrigger increments, animate disperseProgress
  // from 0 → 1 over ~600ms (slowed 20% from 500ms for a less abrupt blast).
  // The AmbientSpark's animatedStyle reads this shared value and switches
  // from ambient motion to outward explosion.
  useEffect(() => {
    if (mode !== 'ambient') return;
    if (!disperseTrigger || disperseTrigger <= 0) return;
    disperseProgress.value = 0;
    disperseProgress.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disperseTrigger, mode]);

  // One-shot for burst / arc — driven by `trigger` change.
  // Under Reanimated 4, passing a JS callback to withTiming's third arg runs
  // the callback as a UI-thread worklet; invoking the non-worklet onComplete
  // from there crashes (SIGABRT in worklets::AnimationFrameBatchinator::flush).
  // We drive onComplete from a JS-side setTimeout matching the animation
  // duration instead.
  useEffect(() => {
    if (mode === 'ambient') return;

    // Durations slowed by ~33% so the climax explosion lingers.
    let totalDuration: number;
    if (mode === 'burst' && tier === 'jackpot') {
      progress.value = 0;
      progress.value = withSequence(
        withTiming(0.5, { duration: 530, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 670, easing: Easing.in(Easing.ease) })
      );
      totalDuration = 1200;
    } else {
      progress.value = 0;
      const duration = mode === 'arc' ? 930 : 1200;
      progress.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.ease),
      });
      totalDuration = duration;
    }

    if (!onComplete) return;
    const timeout = setTimeout(onComplete, totalDuration);
    return () => clearTimeout(timeout);
    // `progress` is a stable ref; omitting from deps intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, trigger]);

  if (mode === 'arc') {
    if (!from || !to) {
      return null;
    }
    // Arc text always uses a vibrant gold so it reads against any background.
    // Previously used `sparkColors[0]` which for bronze/silver tiers was a
    // muted sage that looked nearly white. Gold also fits the money theme.
    const color = '#fbbf24';
    return (
      <View style={styles.overlayContainer} pointerEvents="none">
        <ArcParticle
          from={from}
          to={to}
          symbol={symbol}
          color={color}
          progress={progress}
          controlOffset={controlOffset}
        />
      </View>
    );
  }

  if (mode === 'burst') {
    if (numSparks <= 0 || !origin) {
      return <View style={styles.overlayContainer} pointerEvents="none" />;
    }

    // SX-c: tier-aware symbols for burst mode
    const symbols = getTierSymbols(tier);
    const isJackpot = tier === 'jackpot';

    // SX-d: full-screen container for jackpot so particles can escape
    const burstContainerStyle = isJackpot
      ? styles.jackpotBurstContainer
      : styles.overlayContainer;

    return (
      <View style={burstContainerStyle} pointerEvents="none">
        {Array.from({ length: numSparks }, (_, index) => {
          // Resolve per-particle symbol via modulo (SX-c)
          const particleSymbol =
            symbols.length > 0
              ? (symbols[index % symbols.length] ?? '$')
              : '$';

          // All tiers — including jackpot — use the 360° radial burst.
          // Jackpot's old gravity-arc fireworks behaviour was distinctive but
          // visually inconsistent with the other tiers; using BurstSpark
          // everywhere keeps the climax centered on the running-total origin.
          return (
            <BurstSpark
              key={index}
              index={index}
              numSparks={numSparks}
              sparkColors={sparkColors}
              progress={progress}
              origin={origin}
              symbol={particleSymbol}
              imageSource={imageSource}
            />
          );
        })}
      </View>
    );
  }

  // ambient
  if (numSparks <= 0) {
    return <View style={styles.sparkContainerBehind} />;
  }

  return (
    <View style={styles.sparkContainerBehind}>
      {Array.from({ length: numSparks }, (_, index) => (
        <AmbientSpark
          key={index}
          index={index}
          numSparks={numSparks}
          sparkColors={sparkColors}
          progress={progress}
          disperseProgress={disperseProgress}
          imageSource={imageSource}
        />
      ))}
    </View>
  );
}

/* --------------------------------------------------------------------------
 * <SparkPool /> — exported for JuiceLayer (Wave 2 Agent F)
 *
 * Mounts a fixed-size set of particle slots at opacity 0 and registers itself
 * with SparkController. Agent F should render this inside JuiceLayer once.
 * The pool is self-contained: no props required. All registration and cleanup
 * happens in a single `useEffect`.
 *
 * NOTE: This is a scaffolding hook-up layer. The bursts/arcs are managed via
 * per-slot state refs; when `fireBurst` fires we allocate the next free slot
 * and animate it. Wave 3 (J-Spark-Polish) extended with symbol-tier visuals
 * and device-specific particle caps.
 * ------------------------------------------------------------------------ */

const POOL_SIZE = 32;

interface PoolSlot {
  active: boolean;
  mode: SparkMode;
  tier: TierLevel;
  origin?: { x: number; y: number };
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  symbol: string;
  count: number;
  trigger: number;
  controlOffset?: { x: number; y: number };
}

export function SparkPool() {
  const slotsRef = useRef<PoolSlot[]>(
    Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      mode: 'ambient' as SparkMode,
      tier: 'none' as TierLevel,
      symbol: '$',
      count: 0,
      trigger: 0,
    }))
  );
  // Stale force-render key (ensures the pool re-renders on burst/arc/pulse).
  const [, forceRender] = React.useState(0);

  const allocSlot = (): number => {
    const slots = slotsRef.current;
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i].active) return i;
    }
    // Pool exhausted — overwrite slot 0 (oldest-ish)
    return 0;
  };

  useEffect(() => {
    // Lazy import to avoid circular-dep risk if Controller later imports types
    // from this file.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SparkController } = require('../../src/utils/sparkController') as {
      SparkController: {
        register: (api: {
          fireBurst: (opts: {
            origin: { x: number; y: number };
            tier: TierLevel;
            count?: number;
            symbol?: string;
          }) => void;
          fireArc: (opts: {
            from: { x: number; y: number };
            to: { x: number; y: number };
            tier: TierLevel;
            symbol: string;
            controlOffset?: { x: number; y: number };
          }) => void;
          firePulse: (opts: { tier: TierLevel; duration: number }) => void;
          reset: () => void;
        }) => void;
      };
    };

    SparkController.register({
      fireBurst: ({ origin, tier, count, symbol }) => {
        const idx = allocSlot();
        const slot = slotsRef.current[idx];
        slot.active = true;
        slot.mode = 'burst';
        slot.tier = tier;
        slot.origin = origin;
        slot.count = count ?? getTierParticleCount(tier);
        // SX-c: if no explicit symbol, let SparkEffect resolve by tier
        slot.symbol = symbol ?? '$';
        slot.trigger = (slot.trigger + 1) | 0;
        forceRender((n) => (n + 1) | 0);
      },
      fireArc: ({ from, to, tier, symbol, controlOffset }) => {
        const idx = allocSlot();
        const slot = slotsRef.current[idx];
        slot.active = true;
        slot.mode = 'arc';
        slot.tier = tier;
        slot.from = from;
        slot.to = to;
        slot.symbol = symbol;
        slot.count = 1;
        slot.controlOffset = controlOffset;
        slot.trigger = (slot.trigger + 1) | 0;
        forceRender((n) => (n + 1) | 0);
      },
      firePulse: (_opts) => {
        // Pulse has no particle representation here — Wave 3 will add a
        // full-screen color wash. For now it's a no-op so the controller
        // hand-off path is wired end-to-end.
      },
      reset: () => {
        slotsRef.current.forEach((slot) => {
          slot.active = false;
        });
        forceRender((n) => (n + 1) | 0);
      },
    });
  }, []);

  const handleComplete = (idx: number) => {
    const slot = slotsRef.current[idx];
    slot.active = false;
  };

  return (
    <View
      style={styles.poolContainer}
      pointerEvents="none"
      testID="spark-pool"
    >
      {slotsRef.current.map((slot, idx) => {
        if (!slot.active) return null;
        const palette = getTierPalette(slot.tier);
        return (
          <SparkEffect
            key={idx}
            numSparks={slot.count}
            sparkColors={palette.length > 0 ? palette : ['#ffffff']}
            mode={slot.mode}
            tier={slot.tier}
            origin={slot.origin}
            from={slot.from}
            to={slot.to}
            symbol={slot.symbol}
            trigger={slot.trigger}
            controlOffset={slot.controlOffset}
            onComplete={() => handleComplete(idx)}
          />
        );
      })}
    </View>
  );
}

/* --------------------------------------------------------------------------
 * Tier helpers — pure, testable
 * ------------------------------------------------------------------------ */

const TIER_PARTICLE_COUNT: Record<TierLevel, number> = {
  none: 0,
  bronze: 3,
  silver: 5,
  gold: 7,
  emerald: 12,
  sapphire: 20,
  jackpot: 24,
};

/**
 * Returns the particle count for a given tier.
 *
 * SX-g: At jackpot tier, low-memory devices get half the count (24 → 12).
 * Other tiers are unaffected by the memory clamp.
 *
 * @param tier - The active tier level.
 * @param lowMemoryOverride - Optional override for testing; defaults to
 *   the module-level DEVICE_IS_LOW_MEMORY flag detected at load time.
 */
export function getTierParticleCount(
  tier: TierLevel,
  lowMemoryOverride?: boolean
): number {
  const isLowMem =
    lowMemoryOverride !== undefined ? lowMemoryOverride : DEVICE_IS_LOW_MEMORY;
  const base = TIER_PARTICLE_COUNT[tier] ?? 0;
  if (tier === 'jackpot' && isLowMem) {
    return Math.floor(base / 2); // 24 → 12
  }
  return base;
}

/**
 * SX-c: Returns tier-appropriate symbols for burst/pulse particle text.
 * Ambient mode always uses '$' and ignores this helper.
 *
 * Symbol selection per particle: `symbols[particleIndex % symbols.length]`
 *
 * Ladder:
 *   none     → []
 *   bronze   → ['$']
 *   silver   → ['$']
 *   gold     → ['$', '$$']
 *   emerald  → ['$', '$$']
 *   sapphire → ['$$', '$$$']
 *   jackpot  → ['💎', '$$$']
 */
export function getTierSymbols(tier: TierLevel): string[] {
  switch (tier) {
    case 'none':
      return [];
    case 'bronze':
      return ['$'];
    case 'silver':
      return ['$'];
    case 'gold':
      return ['$', '$$'];
    case 'emerald':
      return ['$', '$$'];
    case 'sapphire':
      return ['$$', '$$$'];
    case 'jackpot':
      return ['💎', '$$$'];
    default:
      return ['$'];
  }
}

// Palette mirrors computeEffectTier.ts exactly. Kept as a local copy rather
// than importing the private const so a future palette divergence between
// "spark palette" and "tier palette" is possible without breakage.
const TIER_PALETTE: Record<TierLevel, string[]> = {
  none: [],
  bronze: ['rgba(123,169,101,1)', '#7ba965', '#6a9a54'],
  silver: ['#5ced00', '#4caf50', '#43a047'],
  gold: ['#4caf50', '#43a047', '#388e3c', '#2e7d32'],
  emerald: ['#3dff88', '#2ecc71', '#27ae60', '#16a085', '#1abc9c', '#20c997'],
  sapphire: [
    '#00cccc',
    '#00e6e6',
    '#00d9ff',
    '#00c3ff',
    '#00b0ff',
    '#009fff',
    '#1e90ff',
    '#4db8ff',
  ],
  jackpot: [
    '#0066ff',
    '#0080ff',
    '#0099ff',
    '#00b3ff',
    '#1e90ff',
    '#4169e1',
    '#5a7fff',
    '#00bfff',
  ],
};

export function getTierPalette(tier: TierLevel): string[] {
  return TIER_PALETTE[tier] ?? [];
}

/* --------------------------------------------------------------------------
 * Styles
 * ------------------------------------------------------------------------ */

const styles = StyleSheet.create({
  sparkContainerBehind: {
    position: 'absolute',
    bottom: 0,
    // Stretch wider than the sell button so sparks at the wave-amplitude
    // extremes don't crash into the button edges (negative left/right pull
    // the container out beyond the parent's width).
    left: -24,
    right: -24,
    // Taller container so the increased rise height has somewhere to breathe.
    height: 160,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    pointerEvents: 'none',
    zIndex: -1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  // SX-d: full-screen container for jackpot bursts so particles escape bounds
  jackpotBurstContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    pointerEvents: 'none',
  },
  poolContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  sparkText: {
    position: 'absolute',
    bottom: 0,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
  sparkImage: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'transparent',
  },
  burstSparkText: {
    position: 'absolute',
    top: 0,
    left: 0,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
  burstSparkImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
  },
  arcText: {
    position: 'absolute',
    top: 0,
    left: 0,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    fontSize: 18,
    backgroundColor: 'transparent',
    // Dark drop-shadow so the gold arc text pops on light modal backgrounds.
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default React.memo(SparkEffect);
