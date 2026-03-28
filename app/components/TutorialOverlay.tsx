import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PressableButton from './PressableButton';
import { useTutorial } from '../../src/hooks/useTutorial';

const OVERLAY_COLOR = 'rgba(0,0,0,0.7)';
const CUTOUT_PADDING = 8;
const TOOLTIP_MARGIN = 16;

interface StepConfig {
  text: string;
  /** Whether advancement requires the user to tap the underlying target */
  actionBased: boolean;
  buttonLabel: string;
}

const STEP_CONFIGS: Record<number, StepConfig> = {
  1: {
    text: 'This is your cash. You start with $20 — spend it wisely!',
    actionBased: false,
    buttonLabel: 'Next',
  },
  2: {
    text: 'This is your debt. Pay it off by the end of Day 5 to win!',
    actionBased: false,
    buttonLabel: 'Next',
  },
  3: {
    text: 'Gummy Bears are cheap right now! Tap to buy some.',
    actionBased: true,
    buttonLabel: '',
  },
  4: {
    text: 'Tap the Buy button to purchase Gummy Bears!',
    actionBased: true,
    buttonLabel: '',
  },
  5: {
    text: 'Nice! Now travel to the next period — prices will change!',
    actionBased: true,
    buttonLabel: '',
  },
  6: {
    text: 'Gummy Bears went up! Tap to sell them for a profit!',
    actionBased: true,
    buttonLabel: '',
  },
  7: {
    text: 'Switch to the Sell tab to sell your candy.',
    actionBased: true,
    buttonLabel: '',
  },
  8: {
    text: 'Now tap Sell to pocket your profit!',
    actionBased: true,
    buttonLabel: '',
  },
  // Steps 9-11 use custom overlays in _layout.tsx and jokers.tsx
};

export default function TutorialOverlay() {
  const { currentStep, isActive, advance, skip, getTargetLayout } =
    useTutorial();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const screenDims = Dimensions.get('window');
  // Force re-render tick so we re-read the layout map after measurement
  const [layoutTick, setLayoutTick] = useState(0);

  useEffect(() => {
    if (isActive) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, currentStep, fadeAnim]);

  // Poll for target layout becoming available (measurements happen async)
  useEffect(() => {
    if (!isActive) return;
    const target = getTargetLayout(currentStep);
    if (target && target.width > 0) return; // Already have it

    // Retry a few times with increasing delays
    const timers = [400, 800, 1500].map((delay) =>
      setTimeout(() => setLayoutTick((t) => t + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isActive, currentStep, getTargetLayout]);

  const stepConfig = STEP_CONFIGS[currentStep];
  const targetLayout = getTargetLayout(currentStep);

  // Compute cutout and tooltip positions
  const positions = useMemo(() => {
    if (!targetLayout || targetLayout.width === 0 || targetLayout.height === 0)
      return null;

    const cutout = {
      x: targetLayout.x - CUTOUT_PADDING,
      y: targetLayout.y - CUTOUT_PADDING,
      width: targetLayout.width + CUTOUT_PADDING * 2,
      height: targetLayout.height + CUTOUT_PADDING * 2,
    };

    // Determine tooltip placement
    const cutoutCenterY = cutout.y + cutout.height / 2;
    const tooltipBelow = cutoutCenterY < screenDims.height / 2;

    const tooltipY = tooltipBelow
      ? cutout.y + cutout.height + 16
      : cutout.y - 16;

    // Center tooltip horizontally, clamped to screen
    const tooltipWidth = Math.min(screenDims.width - TOOLTIP_MARGIN * 2, 300);
    let tooltipX = cutout.x + cutout.width / 2 - tooltipWidth / 2;
    tooltipX = Math.max(
      TOOLTIP_MARGIN,
      Math.min(tooltipX, screenDims.width - tooltipWidth - TOOLTIP_MARGIN)
    );

    // Arrow position (relative to tooltip)
    const arrowLeft = Math.max(
      20,
      Math.min(
        cutout.x + cutout.width / 2 - tooltipX - 8,
        tooltipWidth - 36
      )
    );

    return { cutout, tooltipBelow, tooltipY, tooltipX, tooltipWidth, arrowLeft };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLayout, screenDims, currentStep, layoutTick]);

  if (!isActive || !stepConfig) return null;

  // Wait for target to be measured before showing anything — prevents flash
  if (!positions) return null;

  const { cutout, tooltipBelow, tooltipY, tooltipX, tooltipWidth, arrowLeft } =
    positions;

  return (
    <Animated.View
      style={[styles.fullOverlay, { opacity: fadeAnim }]}
      pointerEvents="box-none"
    >
      {/* Top dim rect */}
      <View
        style={[
          styles.dimRect,
          {
            top: 0,
            left: 0,
            right: 0,
            height: Math.max(0, cutout.y),
          },
        ]}
        pointerEvents="auto"
      />

      {/* Left dim rect */}
      <View
        style={[
          styles.dimRect,
          {
            top: cutout.y,
            left: 0,
            width: Math.max(0, cutout.x),
            height: cutout.height,
          },
        ]}
        pointerEvents="auto"
      />

      {/* Right dim rect */}
      <View
        style={[
          styles.dimRect,
          {
            top: cutout.y,
            left: cutout.x + cutout.width,
            right: 0,
            height: cutout.height,
          },
        ]}
        pointerEvents="auto"
      />

      {/* Bottom dim rect */}
      <View
        style={[
          styles.dimRect,
          {
            top: cutout.y + cutout.height,
            left: 0,
            right: 0,
            bottom: 0,
          },
        ]}
        pointerEvents="auto"
      />

      {/* Cutout area — passthrough taps for action-based steps */}
      <View
        style={{
          position: 'absolute',
          top: cutout.y,
          left: cutout.x,
          width: cutout.width,
          height: cutout.height,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: '#FFD700',
        }}
        pointerEvents={stepConfig.actionBased ? 'none' : 'auto'}
      />

      {/* Tooltip */}
      <View
        style={[
          styles.tooltip,
          {
            left: tooltipX,
            width: tooltipWidth,
            ...(tooltipBelow
              ? { top: tooltipY }
              : { bottom: screenDims.height - tooltipY }),
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Arrow */}
        <View
          style={[
            tooltipBelow ? styles.arrowUp : styles.arrowDown,
            {
              left: arrowLeft,
              ...(tooltipBelow ? { top: -10 } : { bottom: -10 }),
            },
          ]}
        />

        <Text style={styles.tooltipText}>{stepConfig.text}</Text>
        <View style={styles.buttonRow}>
          <PressableButton onPress={skip}>
            <Text style={styles.skipText}>Skip Tutorial</Text>
          </PressableButton>
          {!stepConfig.actionBased && (
            <PressableButton onPress={advance}>
              <View style={styles.nextButton}>
                <Text style={styles.nextButtonText}>
                  {stepConfig.buttonLabel}
                </Text>
              </View>
            </PressableButton>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  fullDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAY_COLOR,
  },
  dimRect: {
    position: 'absolute',
    backgroundColor: OVERLAY_COLOR,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 10000,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'PixeloidMono',
  },
  nextButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
  },
  centeredTooltip: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 10000,
  },
  arrowUp: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFD700',
  },
  arrowDown: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFD700',
  },
});
