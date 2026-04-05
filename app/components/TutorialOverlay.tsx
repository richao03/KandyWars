import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import PixelBorder from './PixelBorder';

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TutorialOverlayProps {
  tutorialStep: number;
  measurements: {
    wallet?: LayoutRect;
    piggyBank?: LayoutRect;
    gummyBears?: LayoutRect;
    nextPeriod?: LayoutRect;
  };
  onAdvance: () => void;
  onSkip: () => void;
}

const STEP_CONFIG: Record<
  number,
  { target: string; message: string; tapThrough: boolean }
> = {
  1: { target: 'wallet', message: "This is your wallet. Guard it with your life... or at least your lunch money", tapThrough: false },
  2: {
    target: 'piggyBank',
    message: "This is your goal. Fill this piggy bank before Friday or it's game over!",
    tapThrough: false,
  },
  3: {
    target: 'gummyBears',
    message: "Gummy Bears for $2?! That's basically free. Tap to snag some!",
    tapThrough: true,
  },
  5: {
    target: 'nextPeriod',
    message: 'Time to move! Pick a spot for next period',
    tapThrough: true,
  },
  6: {
    target: 'gummyBears',
    message: 'Gummy Bears jumped to $8! Sell sell sell!',
    tapThrough: true,
  },
  8: {
    target: '',
    message: "Buy low, sell high - that's the whole game. Now go make enough bread before the week's over. Good luck!",
    tapThrough: false,
  },
};

const PADDING = 6;

export default function TutorialOverlay({
  tutorialStep,
  measurements,
  onAdvance,
  onSkip,
}: TutorialOverlayProps) {
  const { height: screenHeight } = useWindowDimensions();

  if (__DEV__) {
    console.log(
      `📖 TutorialOverlay render - step: ${tutorialStep}, measurements:`,
      Object.keys(measurements).filter((k) => measurements[k as keyof typeof measurements])
    );
  }

  // Steps 4 and 7 are handled inside TransactionModal
  if (tutorialStep === 0 || tutorialStep === 4 || tutorialStep === 7) {
    return null;
  }

  const config = STEP_CONFIG[tutorialStep];
  if (!config) return null;

  // Step 8: centered congrats modal, no spotlight
  if (tutorialStep === 8) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={onAdvance}>
          <View style={[StyleSheet.absoluteFill, styles.dimBackground]}>
            <View style={styles.congratsContainer}>
              <PixelBorder
                borderColor="#FFD700"
                borderWidth={4}
                backgroundColor="#1a1a2e"
                innerPadding={0}
              >
                <View style={styles.congratsInner}>
                  <Text style={styles.congratsTitle}>You're a Natural!</Text>
                  <Text style={styles.congratsMessage}>{config.message}</Text>
                  <Text style={styles.tapHint}>Tap to continue</Text>
                </View>
              </PixelBorder>
            </View>
            {/* Skip button */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    );
  }

  // Get target measurement
  const target = measurements[config.target as keyof typeof measurements];
  if (!target) {
    // Measurement not ready yet, show nothing
    return null;
  }

  // Calculate cutout rect with padding
  const cutout = {
    x: target.x - PADDING,
    y: target.y - PADDING,
    width: target.width + PADDING * 2,
    height: target.height + PADDING * 2,
  };

  // Determine tooltip position: below target if in top half, above if in bottom
  const targetCenterY = cutout.y + cutout.height / 2;
  const showTooltipBelow = targetCenterY < screenHeight / 2;

  const tooltipStyle = showTooltipBelow
    ? { top: cutout.y + cutout.height + 12 }
    : { bottom: screenHeight - cutout.y + 12 };

  // For tap-through steps, we leave the cutout area uncovered so taps reach the element
  // For non-tap-through steps, the entire overlay is tappable to advance
  if (config.tapThrough) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Top dark rect */}
        <View
          style={[styles.darkRect, { top: 0, left: 0, right: 0, height: cutout.y }]}
          pointerEvents="none"
        />
        {/* Bottom dark rect */}
        <View
          style={[
            styles.darkRect,
            {
              top: cutout.y + cutout.height,
              left: 0,
              right: 0,
              bottom: 0,
            },
          ]}
          pointerEvents="none"
        />
        {/* Left dark rect */}
        <View
          style={[
            styles.darkRect,
            {
              top: cutout.y,
              left: 0,
              width: cutout.x,
              height: cutout.height,
            },
          ]}
          pointerEvents="none"
        />
        {/* Right dark rect */}
        <View
          style={[
            styles.darkRect,
            {
              top: cutout.y,
              left: cutout.x + cutout.width,
              right: 0,
              height: cutout.height,
            },
          ]}
          pointerEvents="none"
        />

        {/* Highlight border around cutout */}
        <View
          style={[
            styles.highlightBorder,
            {
              top: cutout.y,
              left: cutout.x,
              width: cutout.width,
              height: cutout.height,
            },
          ]}
          pointerEvents="none"
        />

        {/* Tooltip */}
        <View
          style={[styles.tooltipContainer, tooltipStyle, { left: 16, right: 16 }]}
          pointerEvents="none"
        >
          <PixelBorder
            borderColor="#FFD700"
            borderWidth={3}
            backgroundColor="#1a1a2e"
            innerPadding={0}
          >
            <View style={styles.tooltipInner}>
              <Text style={styles.tooltipText}>{config.message}</Text>
            </View>
          </PixelBorder>
        </View>

        {/* Skip button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Non-tap-through: full overlay is tappable to advance
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onAdvance}>
        <View style={StyleSheet.absoluteFill}>
          {/* Top dark rect */}
          <View
            style={[styles.darkRect, { top: 0, left: 0, right: 0, height: cutout.y }]}
          />
          {/* Bottom dark rect */}
          <View
            style={[
              styles.darkRect,
              {
                top: cutout.y + cutout.height,
                left: 0,
                right: 0,
                bottom: 0,
              },
            ]}
          />
          {/* Left dark rect */}
          <View
            style={[
              styles.darkRect,
              {
                top: cutout.y,
                left: 0,
                width: cutout.x,
                height: cutout.height,
              },
            ]}
          />
          {/* Right dark rect */}
          <View
            style={[
              styles.darkRect,
              {
                top: cutout.y,
                left: cutout.x + cutout.width,
                right: 0,
                height: cutout.height,
              },
            ]}
          />

          {/* Highlight border around cutout */}
          <View
            style={[
              styles.highlightBorder,
              {
                top: cutout.y,
                left: cutout.x,
                width: cutout.width,
                height: cutout.height,
              },
            ]}
            pointerEvents="none"
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Tooltip */}
      <View
        style={[styles.tooltipContainer, tooltipStyle, { left: 16, right: 16 }]}
        pointerEvents="none"
      >
        <PixelBorder
          borderColor="#FFD700"
          borderWidth={3}
          backgroundColor="#1a1a2e"
          innerPadding={0}
        >
          <View style={styles.tooltipInner}>
            <Text style={styles.tooltipText}>{config.message}</Text>
            <Text style={styles.tapHint}>Tap to continue</Text>
          </View>
        </PixelBorder>
      </View>

      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={onSkip}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  dimBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkRect: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  highlightBorder: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 15,
  },
  tooltipContainer: {
    position: 'absolute',
    zIndex: 100,
  },
  tooltipInner: {
    padding: 16,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
    textAlign: 'center',
  },
  tapHint: {
    color: '#FFD700',
    fontSize: 11,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.8,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 200,
  },
  skipText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'PixeloidMono',
    opacity: 0.8,
  },
  congratsContainer: {
    width: '85%',
    maxWidth: 340,
  },
  congratsInner: {
    padding: 24,
    alignItems: 'center',
  },
  congratsTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    marginBottom: 12,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  congratsMessage: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
    textAlign: 'center',
  },
});
