import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface PixelBorderProps {
  children: React.ReactNode;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  style?: ViewStyle;
  innerPadding?: number;
  pixelSize?: number;
}

/**
 * PixelBorder Component
 * Creates a pixel-art style border that works on both Android and iOS
 * Uses positioned View elements to create the stepped corner effect
 */
const PixelBorder: React.FC<PixelBorderProps> = ({
  children,
  borderColor = '#4a6c82',
  borderWidth = 4,
  backgroundColor = 'transparent',
  style = {},
  innerPadding = 8,
}) => {
  const pixelSize = borderWidth;
  const cornerSize = pixelSize * 5; // 5 steps for the corner

  const pixelStyles = useMemo(() => {
    const bc = borderColor;
    const ps = pixelSize;
    const cs = cornerSize;

    return {
      content: { borderRadius: 15, backgroundColor, margin: ps, padding: innerPadding },
      topBorder: { backgroundColor: bc, height: ps, left: cs, right: cs, top: 0 },
      bottomBorder: { backgroundColor: bc, height: ps, left: cs, right: cs, bottom: 0 },
      leftBorder: { backgroundColor: bc, width: ps, top: cs, bottom: cs, left: 0 },
      rightBorder: { backgroundColor: bc, width: ps, top: cs, bottom: cs, right: 0 },
      // Top-left corner
      tl0: { backgroundColor: bc, width: ps * 2, height: ps, top: ps * 4, left: 0 },
      tl1: { backgroundColor: bc, width: ps, height: ps, top: ps * 3, left: ps },
      tl2: { backgroundColor: bc, width: ps, height: ps, top: ps * 2, left: ps * 2 },
      tl3: { backgroundColor: bc, width: ps, height: ps, top: ps, left: ps * 3 },
      tl4: { backgroundColor: bc, width: ps, height: ps * 2, top: 0, left: ps * 4 },
      // Top-right corner
      tr0: { backgroundColor: bc, width: ps * 2, height: ps, top: ps * 4, right: 0 },
      tr1: { backgroundColor: bc, width: ps, height: ps, top: ps * 3, right: ps },
      tr2: { backgroundColor: bc, width: ps, height: ps, top: ps * 2, right: ps * 2 },
      tr3: { backgroundColor: bc, width: ps, height: ps, top: ps, right: ps * 3 },
      tr4: { backgroundColor: bc, width: ps, height: ps * 2, top: 0, right: ps * 4 },
      // Bottom-left corner
      bl0: { backgroundColor: bc, width: ps * 2, height: ps, bottom: ps * 4, left: 0 },
      bl1: { backgroundColor: bc, width: ps, height: ps, bottom: ps * 3, left: ps },
      bl2: { backgroundColor: bc, width: ps, height: ps, bottom: ps * 2, left: ps * 2 },
      bl3: { backgroundColor: bc, width: ps, height: ps, bottom: ps, left: ps * 3 },
      bl4: { backgroundColor: bc, width: ps, height: ps * 2, bottom: 0, left: ps * 4 },
      // Bottom-right corner
      br0: { backgroundColor: bc, width: ps * 2, height: ps, bottom: ps * 4, right: 0 },
      br1: { backgroundColor: bc, width: ps, height: ps, bottom: ps * 3, right: ps },
      br2: { backgroundColor: bc, width: ps, height: ps, bottom: ps * 2, right: ps * 2 },
      br3: { backgroundColor: bc, width: ps, height: ps, bottom: ps, right: ps * 3 },
      br4: { backgroundColor: bc, width: ps, height: ps * 2, bottom: 0, right: ps * 4 },
    };
  }, [borderColor, pixelSize, cornerSize, backgroundColor, innerPadding]);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.content, pixelStyles.content]}>
        {children}
      </View>

      {/* Top border */}
      <View style={[styles.borderHorizontal, pixelStyles.topBorder]} />
      {/* Bottom border */}
      <View style={[styles.borderHorizontal, pixelStyles.bottomBorder]} />
      {/* Left border */}
      <View style={[styles.borderVertical, pixelStyles.leftBorder]} />
      {/* Right border */}
      <View style={[styles.borderVertical, pixelStyles.rightBorder]} />

      {/* Top-left corner pixels */}
      <View style={[styles.pixel, pixelStyles.tl0]} />
      <View style={[styles.pixel, pixelStyles.tl1]} />
      <View style={[styles.pixel, pixelStyles.tl2]} />
      <View style={[styles.pixel, pixelStyles.tl3]} />
      <View style={[styles.pixel, pixelStyles.tl4]} />

      {/* Top-right corner pixels */}
      <View style={[styles.pixel, pixelStyles.tr0]} />
      <View style={[styles.pixel, pixelStyles.tr1]} />
      <View style={[styles.pixel, pixelStyles.tr2]} />
      <View style={[styles.pixel, pixelStyles.tr3]} />
      <View style={[styles.pixel, pixelStyles.tr4]} />

      {/* Bottom-left corner pixels */}
      <View style={[styles.pixel, pixelStyles.bl0]} />
      <View style={[styles.pixel, pixelStyles.bl1]} />
      <View style={[styles.pixel, pixelStyles.bl2]} />
      <View style={[styles.pixel, pixelStyles.bl3]} />
      <View style={[styles.pixel, pixelStyles.bl4]} />

      {/* Bottom-right corner pixels */}
      <View style={[styles.pixel, pixelStyles.br0]} />
      <View style={[styles.pixel, pixelStyles.br1]} />
      <View style={[styles.pixel, pixelStyles.br2]} />
      <View style={[styles.pixel, pixelStyles.br3]} />
      <View style={[styles.pixel, pixelStyles.br4]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  content: {
    // Content will have dynamic margin and padding
  },
  borderHorizontal: {
    position: 'absolute',
  },
  borderVertical: {
    position: 'absolute',
  },
  borderTop: {},
  borderBottom: {},
  borderLeft: {},
  borderRight: {},
  pixel: {
    position: 'absolute',
  },
});

export default React.memo(PixelBorder);
