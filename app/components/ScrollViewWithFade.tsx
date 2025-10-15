import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

interface ScrollViewWithFadeProps extends ScrollViewProps {
  fadeColor?: string; // Background color for the fade (default: offWhite #f8f9fa)
  fadeHeight?: number; // Height of fade in pixels (default: 10)
  wrapperStyle?: ViewStyle; // Additional styles for the wrapper
  children: React.ReactNode;
}

export default function ScrollViewWithFade({
  fadeColor = '#f8f9fa',
  fadeHeight = 10,
  wrapperStyle,
  children,
  style,
  ...scrollViewProps
}: ScrollViewWithFadeProps) {
  // Convert hex color to rgba for gradient
  const hexToRgba = (hex: string, alpha: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(248, 249, 250, ${alpha})`;

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const rgbaTransparent = hexToRgba(fadeColor, 0);
  const rgbaSemi = hexToRgba(fadeColor, 0.8);

  return (
    <View style={[styles.scrollViewWrapper, wrapperStyle]}>
      {/* Top fade gradient */}
      <LinearGradient
        colors={[fadeColor, rgbaSemi, rgbaTransparent]}
        locations={[0, 0.1, 1]}
        style={[styles.fadeTop, { height: fadeHeight }]}
        pointerEvents="none"
      />

      <ScrollView
        style={style}
        showsVerticalScrollIndicator={false}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>

      {/* Bottom fade gradient */}
      <LinearGradient
        colors={[rgbaTransparent, rgbaSemi, fadeColor]}
        locations={[0, 0.9, 1]}
        style={[styles.fadeBottom, { height: fadeHeight }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollViewWrapper: {
    position: 'relative',
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
  },
});
