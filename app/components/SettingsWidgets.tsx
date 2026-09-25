import React, { useEffect } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

/**
 * Small building blocks for the Settings ("Principal's Office") screen.
 * All animation here is plain timing — no springs — so toggles and meters
 * snap cleanly instead of wobbling.
 */

export type SettingsTone =
  | 'blue'
  | 'gold'
  | 'green'
  | 'purple'
  | 'orange'
  | 'red'
  | 'brown';

export const TONES: Record<
  SettingsTone,
  { border: string; bg: string; text: string; tabBg: string; tabText: string }
> = {
  blue: {
    border: '#3b6cb0',
    bg: '#eaf2ff',
    text: '#2f5590',
    tabBg: '#3b6cb0',
    tabText: '#ffffff',
  },
  gold: {
    border: '#b8860b',
    bg: '#fff5d4',
    text: '#7a5200',
    tabBg: '#e0a91c',
    tabText: '#3d2a00',
  },
  green: {
    border: '#4a7c4a',
    bg: '#ecf7e0',
    text: '#2f5a2f',
    tabBg: '#5c9a5c',
    tabText: '#ffffff',
  },
  purple: {
    border: '#6b4fa3',
    bg: '#f1ebfb',
    text: '#4c357a',
    tabBg: '#7a5cc0',
    tabText: '#ffffff',
  },
  orange: {
    border: '#b8650f',
    bg: '#fff0d6',
    text: '#8a4a05',
    tabBg: '#e0821c',
    tabText: '#ffffff',
  },
  red: {
    border: '#b91c1c',
    bg: '#fde2e2',
    text: '#8f1414',
    tabBg: '#d23b3b',
    tabText: '#ffffff',
  },
  brown: {
    border: '#8b4513',
    bg: '#fff5d4',
    text: '#6b4423',
    tabBg: '#8b4513',
    tabText: '#fff5d4',
  },
};

const MONO = 'PixeloidMono';

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard — a manila-folder style card with a colored tab on top-left.
// ─────────────────────────────────────────────────────────────────────────────
export function SectionCard({
  tone = 'brown',
  icon,
  title,
  subtitle,
  children,
  style,
  hazard = false,
}: {
  tone?: SettingsTone;
  icon?: any;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  hazard?: boolean;
}) {
  const t = TONES[tone];
  return (
    <View style={[styles.cardWrap, style]}>
      <View style={styles.tabRow}>
        <View
          style={[
            styles.tab,
            { backgroundColor: t.tabBg, borderColor: t.border },
          ]}
        >
          {icon && <Image source={icon} style={styles.tabIcon} />}
          <Text style={[styles.tabText, { color: t.tabText }]}>{title}</Text>
        </View>
        {subtitle && (
          <Text style={[styles.tabSubtitle, { color: t.text }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <PixelBorder
        borderColor={t.border}
        borderWidth={4}
        backgroundColor={t.bg}
        innerPadding={0}
      >
        {hazard && <HazardStripes color={t.border} />}
        <View style={styles.cardBody}>{children}</View>
      </PixelBorder>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HazardStripes — diagonal-ish warning tape built from alternating blocks.
// ─────────────────────────────────────────────────────────────────────────────
export function HazardStripes({ color = '#b91c1c' }: { color?: string }) {
  return (
    <View style={styles.hazardRow} pointerEvents="none">
      {Array.from({ length: 24 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.hazardBlock,
            { backgroundColor: i % 2 === 0 ? color : '#ffd23f' },
          ]}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PixelMeter — 10 tappable blocks + −/+ steppers. Replaces the native slider
// (which rubber-banded when driven from Redux on every frame).
// ─────────────────────────────────────────────────────────────────────────────
const METER_STEPS = 10;

export function PixelMeter({
  icon,
  label,
  value,
  onChange,
  tone = 'gold',
}: {
  icon?: any;
  label: string;
  value: number; // 0..1
  onChange: (next: number) => void;
  tone?: SettingsTone;
}) {
  const t = TONES[tone];
  const filled = Math.round(Math.min(1, Math.max(0, value)) * METER_STEPS);

  const set = (steps: number) => {
    const clamped = Math.min(METER_STEPS, Math.max(0, steps));
    onChange(clamped / METER_STEPS);
  };

  return (
    <View style={styles.meterRow}>
      <View style={styles.meterLabelCol}>
        {icon && <Image source={icon} style={styles.meterIcon} />}
        <Text style={styles.meterLabel}>{label}</Text>
      </View>

      <Stepper
        glyph="−"
        onPress={() => set(filled - 1)}
        disabled={filled === 0}
        tone={tone}
      />

      <View style={styles.meterBlocks}>
        {Array.from({ length: METER_STEPS }).map((_, i) => {
          const on = i < filled;
          // Taller blocks toward the right, like an EQ bar.
          const h = 10 + i * 1.6;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => set(i + 1 === filled ? i : i + 1)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8 }}
              style={styles.meterBlockHit}
            >
              <View
                style={[
                  styles.meterBlock,
                  {
                    height: h,
                    backgroundColor: on ? t.tabBg : '#e8d4a8',
                    borderColor: on ? t.border : '#c9b48a',
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <Stepper
        glyph="+"
        onPress={() => set(filled + 1)}
        disabled={filled === METER_STEPS}
        tone={tone}
      />

      <Text style={[styles.meterValue, { color: t.text }]}>
        {filled === 0 ? 'OFF' : `${filled * 10}%`}
      </Text>
    </View>
  );
}

function Stepper({
  glyph,
  onPress,
  disabled,
  tone,
}: {
  glyph: string;
  onPress: () => void;
  disabled?: boolean;
  tone: SettingsTone;
}) {
  const t = TONES[tone];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={[
        styles.stepper,
        {
          borderColor: t.border,
          backgroundColor: disabled ? '#f1e7cf' : '#fffaf0',
        },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.stepperText, { color: t.text }]}>{glyph}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PixelToggle — chunky ON/OFF switch. Timing-only knob slide, no bounce.
// ─────────────────────────────────────────────────────────────────────────────
const KNOB = 26;
const TRACK_W = 64;

export function PixelToggle({
  value,
  onToggle,
  tone = 'green',
}: {
  value: boolean;
  onToggle: () => void;
  tone?: SettingsTone;
}) {
  const t = TONES[tone];
  const x = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    x.value = withTiming(value ? 1 : 0, {
      duration: 140,
      easing: Easing.out(Easing.quad),
    });
  }, [value, x]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * (TRACK_W - KNOB - 8) }],
  }));

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
      <View
        style={[
          styles.toggleTrack,
          {
            backgroundColor: value ? t.tabBg : '#d9cbb0',
            borderColor: value ? t.border : '#8a6e4e',
          },
        ]}
      >
        <Text
          style={[
            styles.toggleLabel,
            value ? styles.toggleLabelOn : styles.toggleLabelOff,
            { color: value ? t.tabText : '#6b4423' },
          ]}
        >
          {value ? 'ON' : 'OFF'}
        </Text>
        <Animated.View style={[styles.toggleKnob, knobStyle]} />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MenuTile — chunky 3D-press tile for the actions grid.
// ─────────────────────────────────────────────────────────────────────────────
export function MenuTile({
  icon,
  label,
  sub,
  onPress,
  disabled,
  tone = 'brown',
  style,
}: {
  icon?: any;
  label: string;
  sub?: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: SettingsTone;
  style?: ViewStyle;
}) {
  const t = TONES[tone];
  return (
    <PressableButton
      onPress={onPress}
      disabled={disabled}
      shadowColor={t.border}
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.45}
      shadowRadius={4}
      elevation={6}
      style={[styles.tileWrap, style ?? {}]}
    >
      <PixelBorder
        borderColor={t.border}
        borderWidth={3}
        backgroundColor={disabled ? '#efe6d2' : '#fffaf0'}
        innerPadding={0}
      >
        <View style={[styles.tile, disabled && { opacity: 0.55 }]}>
          {icon && (
            <View
              style={[
                styles.tileIconFrame,
                { backgroundColor: t.bg, borderColor: t.border },
              ]}
            >
              <Image source={icon} style={styles.tileIcon} />
            </View>
          )}
          <Text style={[styles.tileLabel, { color: t.text }]} numberOfLines={2}>
            {label}
          </Text>
          {sub && (
            <Text style={styles.tileSub} numberOfLines={2}>
              {sub}
            </Text>
          )}
        </View>
      </PixelBorder>
    </PressableButton>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ListRow — compact row for dev tools / long lists (label + optional sub).
// ─────────────────────────────────────────────────────────────────────────────
export function ListRow({
  label,
  sub,
  onPress,
  tone = 'brown',
  disabled,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  tone?: SettingsTone;
  disabled?: boolean;
}) {
  const t = TONES[tone];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.listRow,
        { borderLeftColor: t.border, backgroundColor: '#fffaf0' },
        disabled && { opacity: 0.55 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.listRowLabel, { color: t.text }]}>{label}</Text>
        {sub && <Text style={styles.listRowSub}>{sub}</Text>}
      </View>
      <Text style={[styles.listRowChevron, { color: t.text }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Card
  cardWrap: { marginBottom: 14 },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 10,
    marginBottom: -3,
    zIndex: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    gap: 6,
  },
  tabIcon: { width: 18, height: 18, resizeMode: 'contain' },
  tabText: {
    fontFamily: MONO,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  tabSubtitle: {
    fontFamily: MONO,
    fontSize: 10,
    marginLeft: 10,
    marginBottom: 8,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  cardBody: { padding: 14 },

  // Hazard
  hazardRow: {
    flexDirection: 'row',
    height: 8,
    overflow: 'hidden',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  hazardBlock: { width: 18, height: 8, transform: [{ skewX: '-30deg' }] },

  // Meter
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  meterLabelCol: {
    width: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meterIcon: { width: 18, height: 18, resizeMode: 'contain' },
  meterLabel: {
    fontFamily: MONO,
    fontWeight: 'bold',
    fontSize: 11,
    color: '#4a3520',
  },
  meterBlocks: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 28,
    paddingHorizontal: 2,
  },
  meterBlockHit: { justifyContent: 'flex-end', paddingHorizontal: 1 },
  meterBlock: { width: 12, borderWidth: 2, borderRadius: 2 },
  meterValue: {
    fontFamily: MONO,
    fontWeight: 'bold',
    fontSize: 11,
    width: 36,
    textAlign: 'right',
  },
  stepper: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontFamily: MONO,
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 18,
  },

  // Toggle
  toggleTrack: {
    width: TRACK_W,
    height: KNOB + 8,
    borderRadius: 6,
    borderWidth: 3,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleKnob: {
    position: 'absolute',
    left: 4,
    top: 1,
    width: KNOB,
    height: KNOB,
    borderRadius: 4,
    backgroundColor: '#fffaf0',
    borderWidth: 2,
    borderColor: '#6b4423',
  },
  toggleLabel: {
    fontFamily: MONO,
    fontWeight: 'bold',
    fontSize: 10,
    position: 'absolute',
  },
  toggleLabelOn: { left: 8 },
  toggleLabelOff: { right: 6 },

  // Tile
  tileWrap: { flex: 1, minWidth: '46%' },
  tile: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 104,
    justifyContent: 'center',
  },
  tileIconFrame: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileIcon: { width: 24, height: 24, resizeMode: 'contain' },
  tileLabel: {
    fontFamily: MONO,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  tileSub: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#8a6e4e',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },

  // ListRow
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderRadius: 3,
  },
  listRowLabel: { fontFamily: MONO, fontWeight: 'bold', fontSize: 12 },
  listRowSub: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#8a6e4e',
    fontStyle: 'italic',
  },
  listRowChevron: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
});
