import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PressableButton from './PressableButton';
import PixelBorder from './PixelBorder';
import { useTutorial } from '../../src/hooks/useTutorial';

const OVERLAY_COLOR = 'rgba(0,0,0,0.7)';
const CUTOUT_PADDING = 8;
const TOOLTIP_MARGIN = 16;

interface StepConfig {
  text: string;
  actionBased: boolean;
  buttonLabel: string;
  centered?: boolean;
}

const STEP_CONFIGS: Record<number, StepConfig> = {
  1: {
    text: "You just adopted a pet rock. Problem is... you owe $5,000 for the adoption fee. Time to hustle candy at school to pay it off!",
    actionBased: false,
    buttonLabel: "Let's Go!",
    centered: true,
  },
  2: {
    text: 'This is your cash — $20 to start. Spend wisely!',
    actionBased: false,
    buttonLabel: 'Got it',
  },
  3: {
    text: 'This is your debt. Deposit money here to pay off $5,000 before Day 5 ends.',
    actionBased: false,
    buttonLabel: 'Got it',
  },
  4: {
    text: 'Gummy Bears are cheap right now! Tap to buy some.',
    actionBased: true,
    buttonLabel: '',
  },
  5: {
    text: 'Tap Buy to grab them!',
    actionBased: true,
    buttonLabel: '',
  },
  6: {
    text: 'Nice! You bought candy. Now go to the next period — prices change every period!',
    actionBased: true,
    buttonLabel: '',
  },
  7: {
    text: 'Gummy Bears jumped up! Tap to sell them for a profit!',
    actionBased: true,
    buttonLabel: '',
  },
  8: {
    text: 'Sell to pocket the profit!',
    actionBased: true,
    buttonLabel: '',
  },
};

export default function TutorialOverlay() {
  const { currentStep, isActive, advance, skip, getTargetLayout, tutorialComplete } =
    useTutorial();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const screenDims = Dimensions.get('window');
  const [layoutTick, setLayoutTick] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const prevComplete = useRef(tutorialComplete);

  const stepConfig = STEP_CONFIGS[currentStep] ?? null;
  const targetLayout = getTargetLayout(currentStep);

  // ALL hooks must be above any returns

  useEffect(() => {
    if (!prevComplete.current && tutorialComplete) {
      setShowCongrats(true);
    }
    prevComplete.current = tutorialComplete;
  }, [tutorialComplete]);

  useEffect(() => {
    if (isActive || showCongrats) {
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
  }, [isActive, currentStep, fadeAnim, showCongrats]);

  useEffect(() => {
    if (!isActive) return;
    if (stepConfig?.centered) return;
    const target = getTargetLayout(currentStep);
    if (target && target.width > 0) return;

    const timers = [400, 800, 1500].map((delay) =>
      setTimeout(() => setLayoutTick((t) => t + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isActive, currentStep, getTargetLayout, stepConfig]);

  const positions = useMemo(() => {
    if (!targetLayout || targetLayout.width === 0 || targetLayout.height === 0)
      return null;

    const cutout = {
      x: targetLayout.x - CUTOUT_PADDING,
      y: targetLayout.y - CUTOUT_PADDING,
      width: targetLayout.width + CUTOUT_PADDING * 2,
      height: targetLayout.height + CUTOUT_PADDING * 2,
    };

    const cutoutCenterY = cutout.y + cutout.height / 2;
    const tooltipBelow = cutoutCenterY < screenDims.height / 2;

    const tooltipY = tooltipBelow
      ? cutout.y + cutout.height + 16
      : cutout.y - 16;

    const tooltipWidth = Math.min(screenDims.width - TOOLTIP_MARGIN * 2, 300);
    let tooltipX = cutout.x + cutout.width / 2 - tooltipWidth / 2;
    tooltipX = Math.max(
      TOOLTIP_MARGIN,
      Math.min(tooltipX, screenDims.width - tooltipWidth - TOOLTIP_MARGIN)
    );

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

  // === RENDERING (early returns ok after all hooks) ===

  // Congrats modal
  if (showCongrats) {
    return (
      <Animated.View
        style={[styles.fullOverlay, { opacity: fadeAnim }]}
        pointerEvents="box-none"
      >
        <View style={styles.fullDim} pointerEvents="auto" />
        <View style={styles.centeredContainer}>
          <PixelBorder
            borderColor="#FFD700"
            borderWidth={3}
            backgroundColor="#1a1a2e"
            innerPadding={20}
          >
            <Text style={styles.congratsEmoji}>🎉</Text>
            <Text style={styles.congratsTitle}>Now You Get It!</Text>
            <Text style={styles.congratsText}>
              Buy low, sell high — that's the hustle! Make enough money to
              adopt your pet before Day 5 ends. Study minigames to earn
              Jokers that power up your profits!
            </Text>
            <PressableButton onPress={() => setShowCongrats(false)}>
              <View style={styles.nextButton}>
                <Text style={styles.nextButtonText}>Start Playing</Text>
              </View>
            </PressableButton>
          </PixelBorder>
        </View>
      </Animated.View>
    );
  }

  if (!isActive || !stepConfig) return null;

  // Steps 5 and 8 are handled inside TransactionModal
  if (currentStep === 5 || currentStep === 8) return null;

  // Centered modal (step 1 welcome)
  if (stepConfig.centered) {
    return (
      <Animated.View
        style={[styles.fullOverlay, { opacity: fadeAnim }]}
        pointerEvents="box-none"
      >
        <View style={styles.fullDim} pointerEvents="auto" />
        <View style={styles.centeredContainer}>
          <PixelBorder
            borderColor="#FFD700"
            borderWidth={3}
            backgroundColor="#1a1a2e"
            innerPadding={20}
          >
            <Text style={styles.congratsEmoji}>🪨</Text>
            <Text style={styles.tooltipText}>{stepConfig.text}</Text>
            <View style={styles.buttonRow}>
              <PressableButton onPress={skip}>
                <Text style={styles.skipText}>Skip Tutorial</Text>
              </PressableButton>
              <PressableButton onPress={advance}>
                <View style={styles.nextButton}>
                  <Text style={styles.nextButtonText}>
                    {stepConfig.buttonLabel}
                  </Text>
                </View>
              </PressableButton>
            </View>
          </PixelBorder>
        </View>
      </Animated.View>
    );
  }

  // Wait for spotlight target to be measured — show nothing until ready
  if (!positions) return null;

  const { cutout, tooltipBelow, tooltipY, tooltipX, tooltipWidth, arrowLeft } =
    positions;

  return (
    <Animated.View
      style={[styles.fullOverlay, { opacity: fadeAnim }]}
      pointerEvents="box-none"
    >
      {/* Dim rects */}
      <View
        style={[styles.dimRect, { top: 0, left: 0, right: 0, height: Math.max(0, cutout.y) }]}
        pointerEvents="auto"
      />
      <View
        style={[styles.dimRect, { top: cutout.y, left: 0, width: Math.max(0, cutout.x), height: cutout.height }]}
        pointerEvents="auto"
      />
      <View
        style={[styles.dimRect, { top: cutout.y, left: cutout.x + cutout.width, right: 0, height: cutout.height }]}
        pointerEvents="auto"
      />
      <View
        style={[styles.dimRect, { top: cutout.y + cutout.height, left: 0, right: 0, bottom: 0 }]}
        pointerEvents="auto"
      />

      {/* Cutout border */}
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
  centeredContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10000,
  },
  congratsEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  congratsTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  congratsText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
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
