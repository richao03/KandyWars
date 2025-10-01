import React from 'react';
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

  return (
    <View style={[styles.container, style]}>
      {/* Main content area with padding for the border */}
      <View
        style={[
          styles.content,
          {
            borderRadius: 15,
            backgroundColor,
            margin: pixelSize,
            padding: innerPadding,
          },
        ]}
      >
        {children}
      </View>

      {/* Top border */}
      <View
        style={[
          styles.borderHorizontal,
          styles.borderTop,
          {
            backgroundColor: borderColor,
            height: pixelSize,
            left: cornerSize,
            right: cornerSize,
            top: 0,
          },
        ]}
      />

      {/* Bottom border */}
      <View
        style={[
          styles.borderHorizontal,
          styles.borderBottom,
          {
            backgroundColor: borderColor,
            height: pixelSize,
            left: cornerSize,
            right: cornerSize,
            bottom: 0,
          },
        ]}
      />

      {/* Left border */}
      <View
        style={[
          styles.borderVertical,
          styles.borderLeft,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            top: cornerSize,
            bottom: cornerSize,
            left: 0,
          },
        ]}
      />

      {/* Right border */}
      <View
        style={[
          styles.borderVertical,
          styles.borderRight,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            top: cornerSize,
            bottom: cornerSize,
            right: 0,
          },
        ]}
      />

      {/* Top-left corner pixels */}
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize * 2,
            height: pixelSize,
            top: pixelSize * 4,
            left: 0,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            top: pixelSize * 3,
            left: pixelSize,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            top: pixelSize * 2,
            left: pixelSize * 2,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            top: pixelSize,
            left: pixelSize * 3,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize * 2,
            top: 0,
            left: pixelSize * 4,
          },
        ]}
      />

      {/* Top-right corner pixels */}
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize * 2,
            height: pixelSize,
            top: pixelSize * 4,
            right: 0,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            top: pixelSize * 3,
            right: pixelSize,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            top: pixelSize * 2,
            right: pixelSize * 2,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            top: pixelSize,
            right: pixelSize * 3,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize * 2,
            top: 0,
            right: pixelSize * 4,
          },
        ]}
      />

      {/* Bottom-left corner pixels */}
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize * 2,
            height: pixelSize,
            bottom: pixelSize * 4,
            left: 0,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            bottom: pixelSize * 3,
            left: pixelSize,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            bottom: pixelSize * 2,
            left: pixelSize * 2,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            bottom: pixelSize,
            left: pixelSize * 3,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize * 2,
            bottom: 0,
            left: pixelSize * 4,
          },
        ]}
      />

      {/* Bottom-right corner pixels */}
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize * 2,
            height: pixelSize,
            bottom: pixelSize * 4,
            right: 0,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            bottom: pixelSize * 3,
            right: pixelSize,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            bottom: pixelSize * 2,
            right: pixelSize * 2,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize,
            bottom: pixelSize,
            right: pixelSize * 3,
          },
        ]}
      />
      <View
        style={[
          styles.pixel,
          {
            backgroundColor: borderColor,
            width: pixelSize,
            height: pixelSize * 2,
            bottom: 0,
            right: pixelSize * 4,
          },
        ]}
      />
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

export default PixelBorder;
