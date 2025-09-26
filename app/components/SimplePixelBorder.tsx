import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface SimplePixelBorderProps {
  children: React.ReactNode;
  borderColor?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
}

/**
 * SimplePixelBorder Component
 * A more performant pixel border with fewer elements
 * Creates a stepped corner effect using just 8 Views
 */
const SimplePixelBorder: React.FC<SimplePixelBorderProps> = ({
  children,
  borderColor = '#4a6c82',
  backgroundColor = '#ffffff',
  style = {},
  size = 'medium',
}) => {
  const sizes = {
    small: { border: 2, step: 6 },
    medium: { border: 3, step: 8 },
    large: { border: 4, step: 12 },
  };

  const { border: borderWidth, step: stepSize } = sizes[size];

  return (
    <View style={[styles.container, style]}>
      {/* Main background with pixel corners cut out */}
      <View
        style={[
          styles.mainBorder,
          {
            backgroundColor: borderColor,
            margin: stepSize,
          },
        ]}
      />

      {/* Corner cuts - top-left */}
      <View
        style={[
          styles.cornerCut,
          {
            top: 0,
            left: 0,
            width: stepSize,
            height: stepSize,
            backgroundColor: 'transparent',
          },
        ]}
      >
        {/* Stepped pixels */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: stepSize * 0.6,
            height: borderWidth,
            backgroundColor: borderColor,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: borderWidth,
            height: stepSize * 0.6,
            backgroundColor: borderColor,
          }}
        />
      </View>

      {/* Corner cuts - top-right */}
      <View
        style={[
          styles.cornerCut,
          {
            top: 0,
            right: 0,
            width: stepSize,
            height: stepSize,
            backgroundColor: 'transparent',
          },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: stepSize * 0.6,
            height: borderWidth,
            backgroundColor: borderColor,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: borderWidth,
            height: stepSize * 0.6,
            backgroundColor: borderColor,
          }}
        />
      </View>

      {/* Corner cuts - bottom-left */}
      <View
        style={[
          styles.cornerCut,
          {
            bottom: 0,
            left: 0,
            width: stepSize,
            height: stepSize,
            backgroundColor: 'transparent',
          },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: stepSize * 0.6,
            height: borderWidth,
            backgroundColor: borderColor,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: borderWidth,
            height: stepSize * 0.6,
            backgroundColor: borderColor,
          }}
        />
      </View>

      {/* Corner cuts - bottom-right */}
      <View
        style={[
          styles.cornerCut,
          {
            bottom: 0,
            right: 0,
            width: stepSize,
            height: stepSize,
            backgroundColor: 'transparent',
          },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: stepSize * 0.6,
            height: borderWidth,
            backgroundColor: borderColor,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: borderWidth,
            height: stepSize * 0.6,
            backgroundColor: borderColor,
          }}
        />
      </View>

      {/* Inner content */}
      <View
        style={[
          styles.content,
          {
            backgroundColor,
            margin: stepSize + borderWidth,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  mainBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cornerCut: {
    position: 'absolute',
    overflow: 'hidden',
  },
  content: {
    // Dynamic margin based on border size
  },
});

export default SimplePixelBorder;