import React, { ReactNode, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import {
  EDGE_LIGHT_PALETTES,
} from '../../src/utils/computeBigSaleFX';
import {
  ScreenFXController,
  type EdgeLightsTier,
  type ScreenShakeOptions,
} from '../../src/utils/screenFXController';

const EDGE_BAND_THICKNESS = 22;
const WAVE_AMPLITUDE = 5;
const WAVE_WAVELENGTH = 38;

/**
 * ScreenFX — owns the shake/flash/edge-light shared values, registers a
 * controller API, and renders:
 *   1. The shake-wrapped screen children (so the entire app shakes).
 *   2. A full-screen color flash overlay.
 *   3. Four pulsing edge bands (top/bottom/left/right) for the $10k+ tiers.
 *
 * Mount once near the app root, wrapping the `<Stack>` (or whichever
 * navigator hosts game content). See `app/_layout.tsx`.
 */
export default function ScreenFX({ children }: { children: ReactNode }) {
  // Shake transform shared values.
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);

  // Edge lights state.
  const edgeOpacity = useSharedValue(0);
  const [edgeTier, setEdgeTier] = React.useState<EdgeLightsTier>('none');

  // Register controller API on mount.
  useEffect(() => {
    const fireShake = (opts: ScreenShakeOptions) => {
      cancelAnimation(shakeX);
      cancelAnimation(shakeY);
      const cycleMs = Math.max(40, opts.duration / Math.max(1, opts.cycles * 2));
      const decay = (i: number, n: number) => 1 - i / n;
      const xSequence = [];
      const ySequence = [];
      const totalSteps = opts.cycles * 2;
      for (let i = 0; i < totalSteps; i++) {
        const sign = i % 2 === 0 ? 1 : -1;
        const amp = opts.intensity * decay(i, totalSteps);
        xSequence.push(withTiming(sign * amp, { duration: cycleMs }));
        ySequence.push(
          withTiming(sign * amp * 0.6, { duration: cycleMs })
        );
      }
      xSequence.push(withTiming(0, { duration: cycleMs }));
      ySequence.push(withTiming(0, { duration: cycleMs }));
      shakeX.value = withSequence(...xSequence);
      shakeY.value = withSequence(...ySequence);
    };

    const setEdgeLights = (tier: EdgeLightsTier, durationMs: number = 1800) => {
      cancelAnimation(edgeOpacity);
      setEdgeTier(tier);
      if (tier === 'none' || durationMs <= 0) {
        edgeOpacity.value = withTiming(0, { duration: 200 });
        return;
      }
      // Fade in to 0.5, hold for the duration, then fade out. No pulsation —
      // the glow appears once and recedes cleanly.
      const fadeInMs = 250;
      const fadeOutMs = 400;
      const holdMs = Math.max(0, durationMs - fadeInMs - fadeOutMs);
      edgeOpacity.value = 0;
      edgeOpacity.value = withSequence(
        withTiming(0.5, { duration: fadeInMs }),
        withTiming(0.5, { duration: holdMs }),
        withTiming(0, { duration: fadeOutMs })
      );
    };

    const reset = () => {
      cancelAnimation(shakeX);
      cancelAnimation(shakeY);
      cancelAnimation(edgeOpacity);
      shakeX.value = 0;
      shakeY.value = 0;
      edgeOpacity.value = 0;
      setEdgeTier('none');
    };

    ScreenFXController.register({
      fireShake,
      setEdgeLights,
      reset,
    });

    return () => {
      ScreenFXController._unregister();
    };
  }, [shakeX, shakeY, edgeOpacity]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { translateY: shakeY.value },
    ],
  }));

  const edgeStyle = useAnimatedStyle(() => ({
    opacity: edgeOpacity.value,
  }));

  const palette = EDGE_LIGHT_PALETTES[edgeTier] ?? [];
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.shakeWrap, shakeStyle]}>
        {children}
      </Animated.View>

      {/* Edge lights — four wavy bands fading inward. */}
      {edgeTier !== 'none' && palette.length > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, edgeStyle]}
        >
          <WavyEdge
            side="top"
            color={palette[0] ?? '#fff'}
            length={screenWidth}
            tier={edgeTier}
          />
          <WavyEdge
            side="bottom"
            color={palette[palette.length - 1] ?? palette[0] ?? '#fff'}
            length={screenWidth}
            tier={edgeTier}
          />
          <WavyEdge
            side="left"
            color={palette[1] ?? palette[0] ?? '#fff'}
            length={screenHeight}
            tier={edgeTier}
          />
          <WavyEdge
            side="right"
            color={palette[Math.min(2, palette.length - 1)] ?? palette[0] ?? '#fff'}
            length={screenHeight}
            tier={edgeTier}
          />
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  shakeWrap: {
    flex: 1,
  },
});

/**
 * WavyEdge — one of four screen-edge bands. Renders an SVG with:
 *   - a straight outer boundary (against the screen border)
 *   - a wavy inner boundary (sin-wave sampled, ~5px amplitude)
 *   - a linear gradient fading from full-color at the outer edge to
 *     transparent at the inner edge
 *
 * The path is generated directly in the SVG's natural orientation per side
 * (no CSS transforms) so it renders consistently on iOS / Android / web.
 */
function WavyEdge({
  side,
  color,
  length,
  tier,
}: {
  side: 'top' | 'bottom' | 'left' | 'right';
  color: string;
  length: number;
  tier: EdgeLightsTier;
}) {
  const isHorizontal = side === 'top' || side === 'bottom';
  const samples = Math.max(24, Math.ceil(length / 8));
  const gradientId = `wavy-${side}-${tier}`;

  // Generate path + gradient stops natively oriented per side.
  // Coordinate convention inside each SVG:
  //   horizontal sides: x = position along edge length, y = depth (0=outer)
  //   vertical sides:   y = position along edge length, x = depth (0=outer)
  //
  // For "top" / "left", outer = depth 0; for "bottom" / "right", outer = depth = thickness.
  const { path, gradX1, gradY1, gradX2, gradY2 } = useMemo(() => {
    const T = EDGE_BAND_THICKNESS;
    const A = WAVE_AMPLITUDE;
    const innerStart = T - A;
    const wave = (i: number) =>
      innerStart +
      A * (0.5 + 0.5 * Math.sin((i / samples) * (length / WAVE_WAVELENGTH) * Math.PI * 2));

    if (side === 'top') {
      // Outer at y=0, wavy inner near y=T
      let d = `M 0 0 L ${length} 0 L ${length} ${innerStart}`;
      for (let i = samples; i >= 0; i--) {
        const x = (i / samples) * length;
        d += ` L ${x} ${wave(i)}`;
      }
      d += ' Z';
      return { path: d, gradX1: 0, gradY1: 0, gradX2: 0, gradY2: T };
    }
    if (side === 'bottom') {
      // Outer at y=T, wavy inner near y=0
      const innerEnd = A;
      let d = `M 0 ${T} L ${length} ${T} L ${length} ${innerEnd}`;
      for (let i = samples; i >= 0; i--) {
        const x = (i / samples) * length;
        const y = innerEnd - A * (0.5 + 0.5 * Math.sin((i / samples) * (length / WAVE_WAVELENGTH) * Math.PI * 2));
        d += ` L ${x} ${y}`;
      }
      d += ' Z';
      return { path: d, gradX1: 0, gradY1: T, gradX2: 0, gradY2: 0 };
    }
    if (side === 'left') {
      // Outer at x=0, wavy inner near x=T
      let d = `M 0 0 L 0 ${length} L ${innerStart} ${length}`;
      for (let i = samples; i >= 0; i--) {
        const y = (i / samples) * length;
        const x = innerStart + A * (0.5 + 0.5 * Math.sin((i / samples) * (length / WAVE_WAVELENGTH) * Math.PI * 2));
        d += ` L ${x} ${y}`;
      }
      d += ' Z';
      return { path: d, gradX1: 0, gradY1: 0, gradX2: T, gradY2: 0 };
    }
    // right: outer at x=T, wavy inner near x=0
    const innerEndX = A;
    let d = `M ${T} 0 L ${T} ${length} L ${innerEndX} ${length}`;
    for (let i = samples; i >= 0; i--) {
      const y = (i / samples) * length;
      const x = innerEndX - A * (0.5 + 0.5 * Math.sin((i / samples) * (length / WAVE_WAVELENGTH) * Math.PI * 2));
      d += ` L ${x} ${y}`;
    }
    d += ' Z';
    return { path: d, gradX1: T, gradY1: 0, gradX2: 0, gradY2: 0 };
  }, [side, length, samples]);

  let positionStyle: any;
  if (side === 'top') {
    positionStyle = { top: 0, left: 0, width: length, height: EDGE_BAND_THICKNESS };
  } else if (side === 'bottom') {
    positionStyle = {
      bottom: 0,
      left: 0,
      width: length,
      height: EDGE_BAND_THICKNESS,
    };
  } else if (side === 'left') {
    positionStyle = {
      top: 0,
      left: 0,
      width: EDGE_BAND_THICKNESS,
      height: length,
    };
  } else {
    positionStyle = {
      top: 0,
      right: 0,
      width: EDGE_BAND_THICKNESS,
      height: length,
    };
  }

  const svgWidth = isHorizontal ? length : EDGE_BAND_THICKNESS;
  const svgHeight = isHorizontal ? EDGE_BAND_THICKNESS : length;

  return (
    <View style={[{ position: 'absolute' }, positionStyle]} pointerEvents="none">
      <Svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      >
        <Defs>
          <LinearGradient
            id={gradientId}
            x1={gradX1}
            y1={gradY1}
            x2={gradX2}
            y2={gradY2}
            gradientUnits="userSpaceOnUse"
          >
            {/* Outer edge starts at 0.5 (subtler glow), midpoint already
                halved, fully transparent at the inner wavy boundary. */}
            <Stop offset="0" stopColor={color} stopOpacity="0.5" />
            <Stop offset="0.55" stopColor={color} stopOpacity="0.25" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={path} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}
