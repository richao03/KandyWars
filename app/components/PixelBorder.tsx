import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface PixelBorderProps {
  children: React.ReactNode;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  innerPadding?: number;
  pixelSize?: number;
  /** When true, container and content both get flex:1 to fill parent height */
  fill?: boolean;
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
  contentStyle,
  innerPadding = 8,
  fill = false,
}) => {
  const pixelSize = borderWidth;
  const cornerSize = pixelSize * 5; // 5 steps for the corner

  const pixelStyles = useMemo(() => {
    const bc = borderColor;
    const ps = pixelSize;
    const cs = cornerSize;

    return {
      content: {
        backgroundColor: 'transparent',
        margin: ps,
        padding: innerPadding,
      },
      backgroundCenter: {
        backgroundColor,
        left: ps,
        right: ps,
        top: cs,
        bottom: cs,
      },
      backgroundTopCore: {
        backgroundColor,
        left: cs,
        right: cs,
        top: ps,
        height: ps,
      },
      backgroundTopOuterStep: {
        backgroundColor,
        left: ps * 3,
        right: ps * 3,
        top: ps * 2,
        height: ps,
      },
      backgroundTopInnerStep: {
        backgroundColor,
        left: ps * 2,
        right: ps * 2,
        top: ps * 3,
        height: ps * 2,
      },
      backgroundBottomCore: {
        backgroundColor,
        left: cs,
        right: cs,
        bottom: ps,
        height: ps,
      },
      backgroundBottomOuterStep: {
        backgroundColor,
        left: ps * 3,
        right: ps * 3,
        bottom: ps * 2,
        height: ps,
      },
      backgroundBottomInnerStep: {
        backgroundColor,
        left: ps * 2,
        right: ps * 2,
        bottom: ps * 3,
        height: ps * 2,
      },
      topBorder: {
        backgroundColor: bc,
        height: ps,
        left: cs,
        right: cs,
        top: 0,
      },
      bottomBorder: {
        backgroundColor: bc,
        height: ps,
        left: cs,
        right: cs,
        bottom: 0,
      },
      leftBorder: {
        backgroundColor: bc,
        width: ps,
        top: cs,
        bottom: cs,
        left: 0,
      },
      rightBorder: {
        backgroundColor: bc,
        width: ps,
        top: cs,
        bottom: cs,
        right: 0,
      },
      // Top-left corner
      tl0: {
        backgroundColor: bc,
        width: ps * 2,
        height: ps,
        top: ps * 4,
        left: 0,
      },
      tl1: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        top: ps * 3,
        left: ps,
      },
      tl2: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        top: ps * 2,
        left: ps * 2,
      },
      tl3: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        top: ps,
        left: ps * 3,
      },
      tl4: {
        backgroundColor: bc,
        width: ps,
        height: ps * 2,
        top: 0,
        left: ps * 4,
      },
      // Top-right corner
      tr0: {
        backgroundColor: bc,
        width: ps * 2,
        height: ps,
        top: ps * 4,
        right: 0,
      },
      tr1: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        top: ps * 3,
        right: ps,
      },
      tr2: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        top: ps * 2,
        right: ps * 2,
      },
      tr3: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        top: ps,
        right: ps * 3,
      },
      tr4: {
        backgroundColor: bc,
        width: ps,
        height: ps * 2,
        top: 0,
        right: ps * 4,
      },
      // Bottom-left corner
      bl0: {
        backgroundColor: bc,
        width: ps * 2,
        height: ps,
        bottom: ps * 4,
        left: 0,
      },
      bl1: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        bottom: ps * 3,
        left: ps,
      },
      bl2: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        bottom: ps * 2,
        left: ps * 2,
      },
      bl3: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        bottom: ps,
        left: ps * 3,
      },
      bl4: {
        backgroundColor: bc,
        width: ps,
        height: ps * 2,
        bottom: 0,
        left: ps * 4,
      },
      // Bottom-right corner
      br0: {
        backgroundColor: bc,
        width: ps * 2,
        height: ps,
        bottom: ps * 4,
        right: 0,
      },
      br1: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        bottom: ps * 3,
        right: ps,
      },
      br2: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        bottom: ps * 2,
        right: ps * 2,
      },
      br3: {
        backgroundColor: bc,
        width: ps,
        height: ps,
        bottom: ps,
        right: ps * 3,
      },
      br4: {
        backgroundColor: bc,
        width: ps,
        height: ps * 2,
        bottom: 0,
        right: ps * 4,
      },
    };
  }, [borderColor, pixelSize, cornerSize, backgroundColor, innerPadding]);

  return (
    <View style={[styles.container, fill && { flex: 1 }, style]}>
      {/* Build the surface from rectangular pixel bands instead of a rounded
          rectangle. This keeps the fill entirely inside the stepped border. */}
      <View style={[styles.background, pixelStyles.backgroundCenter]} />
      <View style={[styles.background, pixelStyles.backgroundTopCore]} />
      <View style={[styles.background, pixelStyles.backgroundTopOuterStep]} />
      <View style={[styles.background, pixelStyles.backgroundTopInnerStep]} />
      <View style={[styles.background, pixelStyles.backgroundBottomCore]} />
      <View
        style={[styles.background, pixelStyles.backgroundBottomOuterStep]}
      />
      <View
        style={[styles.background, pixelStyles.backgroundBottomInnerStep]}
      />

      <View
        style={[
          styles.content,
          pixelStyles.content,
          fill && { flex: 1 },
          contentStyle,
        ]}
      >
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
    // A max-height constrains this outer frame, not the intrinsic height of
    // its children. Clip at the frame by default so neither the inner
    // background nor modal content can paint beyond the pixel border.
    // Callers that intentionally render effects outside the frame can still
    // opt out with style={{ overflow: 'visible' }}.
    overflow: 'hidden',
  },
  content: {
    // Let content yield when the PixelBorder itself has a height constraint.
    // Without this, its background can retain its intrinsic height and extend
    // below a max-height border (most noticeable in modals on small screens).
    flexShrink: 1,
    minHeight: 0,
    minWidth: 0,
  },
  background: {
    position: 'absolute',
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
