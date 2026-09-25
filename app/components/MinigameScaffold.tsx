import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import MinigameHUD from './MinigameHUD';
import type { MinigameTheme } from './MinigameHUD';
import PixelBorder from './PixelBorder';
import TextWithEmojis from './TextWithEmojis';

// Per-theme Leave-button colors: a themed border over a dark background so the
// white label stays legible regardless of the game's screen color. Defined
// locally (not imported) so the scaffold can never lose them to a module-init
// quirk. Games can still override via the leave* props.
const LEAVE_COLORS: Record<MinigameTheme, { border: string; background: string }> = {
  math: { border: '#f5f5dc', background: '#0d2818' },
  computer: { border: '#00d4ff', background: '#16213e' },
  logic: { border: '#87ceeb', background: '#2b2b2b' },
  history: { border: '#DEB887', background: '#3a2a1a' },
  homeec: { border: '#ffffff', background: '#5d3a1a' },
  gym: { border: '#8B7355', background: '#3a2f1f' },
  economy: { border: '#daa520', background: '#2d4a37' },
  recess: { border: '#4A90C1', background: '#1e3a4f' },
  geography: { border: '#c89968', background: '#3a2e1e' },
  art: { border: '#ffffff', background: '#1a1a1a' },
  nim: { border: '#8B7355', background: '#3a2f1f' },
};

interface MinigameScaffoldProps {
  // --- HUD passthrough ---
  theme: MinigameTheme;
  title: string;
  subtitle?: string;
  leftInfo?: string;
  centerInfo?: string;
  rightInfo?: string;

  // --- Layout ---
  /** Full-screen background color (defaults to the theme's background). */
  backgroundColor?: string;
  /** Wrap the body in a ScrollView. Leave false for drag-based games. */
  scrollable?: boolean;
  /** Optional extra footer (e.g. Execute/Clear) rendered above the Leave row. */
  footer?: React.ReactNode;

  // --- Leave button ---
  onLeave: () => void;
  leaveLabel?: string;
  leaveBorderColor?: string;
  leaveBackgroundColor?: string;

  children: React.ReactNode;
}

/**
 * Shared layout shell for every minigame "playing" screen. Standardizes:
 *  - the MinigameHUD header,
 *  - a flex:1 body (optionally scrollable),
 *  - a Leave button pinned to the bottom at a uniform height (marginBottom 16),
 *    auto-themed from the game's theme.
 *
 * Games keep their own state machine; they just render their board as children.
 */
export default function MinigameScaffold({
  theme,
  title,
  subtitle,
  leftInfo,
  centerInfo,
  rightInfo,
  backgroundColor,
  scrollable = false,
  footer,
  onLeave,
  leaveLabel = '🚪 Leave',
  leaveBorderColor,
  leaveBackgroundColor,
  children,
}: MinigameScaffoldProps) {
  const insets = useSafeAreaInsets();
  const leaveColors = LEAVE_COLORS[theme] ?? LEAVE_COLORS.computer;
  const leaveBorder = leaveBorderColor ?? leaveColors.border;
  const leaveBg = leaveBackgroundColor ?? leaveColors.background;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor ?? leaveBg,
          padding: ResponsiveSpacing.containerPadding(),
          paddingBottom: 0,
        },
      ]}
    >
      <MinigameHUD
        theme={theme}
        title={title}
        subtitle={subtitle}
        leftInfo={leftInfo}
        centerInfo={centerInfo}
        rightInfo={rightInfo}
      />

      {scrollable ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}

      {footer}

      {/* Leave button — pinned to the bottom, uniform across all games */}
      <View style={[styles.leaveRow, { marginBottom: insets.bottom + 16 }]}>
        <PixelBorder
          borderColor={leaveBorder}
          borderWidth={3}
          backgroundColor={leaveBg}
          innerPadding={0}
          style={styles.leaveBorder}
        >
          <TouchableOpacity
            style={styles.leaveInner}
            onPress={onLeave}
            activeOpacity={0.8}
          >
            <TextWithEmojis style={styles.leaveText} imageSize={28}>
              {leaveLabel}
            </TextWithEmojis>
          </TouchableOpacity>
        </PixelBorder>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  leaveRow: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  leaveBorder: {
    flex: 1,
  },
  leaveInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
});
