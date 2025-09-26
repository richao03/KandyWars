import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface GamePixelBorderProps {
  children: React.ReactNode;
  borderColor?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * GamePixelBorder Component
 * Uses the same pixel border structure as GamePixelButton
 */
export const GamePixelBorder: React.FC<GamePixelBorderProps> = ({
  children,
  borderColor = '#4a6c82',
  backgroundColor = '#ffffff',
  style = {},
  onPress,
  disabled = false,
}) => {
  const content = (
    <View style={[styles.pixelButtonContainer, style]}>
      {/* Row 1 - Top corner start (outermost) */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row 2 - Curve step 1 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row 3 - Curve step 2 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row 4 - Curve step 3 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row 5 - Curve step 4 (final step before straight sides) */}
      <View style={styles.pixelRow}>
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
      </View>

      {/* Main content rows - flexible height */}
      <View style={[styles.flexibleContentRow]}>
        <View style={[styles.sidePixel, { backgroundColor: borderColor }]} />
        <View style={[styles.flexibleContent, { backgroundColor }]}>
          {children}
        </View>
        <View style={[styles.sidePixel, { backgroundColor: borderColor }]} />
      </View>

      {/* Row -5 - Bottom curve step 4 (final step before straight sides) */}
      <View style={styles.pixelRow}>
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
      </View>

      {/* Row -4 - Bottom curve step 3 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row -3 - Bottom curve step 2 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row -2 - Bottom curve step 1 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row -1 - Bottom corner end (outermost) */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

/**
 * GamePixelButton Component
 * A button variant of the pixel border
 */
export const GamePixelButton: React.FC<{
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  borderColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  paddingVertical?: number;
  paddingHorizontal?: number;
  style?: ViewStyle;
}> = ({
  children,
  onPress,
  disabled = false,
  borderColor = '#4a6c82',
  backgroundColor = '#ffffff',
  textColor = '#000000',
  fontSize = 16,
  paddingVertical = 8,
  paddingHorizontal = 12,
  style = {},
}) => {
  const renderContent = () => {
    if (typeof children === 'string') {
      return (
        <Text style={[styles.buttonText, { color: textColor, fontSize }]}>
          {children}
        </Text>
      );
    } else if (React.isValidElement(children)) {
      return children;
    } else {
      return children;
    }
  };

  // Create ultra-rounded pixelated corners using extended stepped border effect
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pixelButtonContainer,
        pressed && styles.buttonPressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {/* Row 1 - Top corner start (outermost) */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row 2 - Curve step 1 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row 3 - Curve step 2 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row 4 - Curve step 3 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row 5 - Curve step 4 (final step before straight sides) */}
      <View style={styles.pixelRow}>
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
      </View>

      {/* Main content rows */}
      <View style={[styles.pixelRow, styles.contentRow]}>
        <View style={[styles.sidePixel, { backgroundColor: borderColor }]} />
        <View
          style={[
            styles.pixelContent,
            { backgroundColor, paddingVertical, paddingHorizontal },
          ]}
        >
          {renderContent()}
        </View>
        <View style={[styles.sidePixel, { backgroundColor: borderColor }]} />
      </View>

      {/* Row -5 - Bottom curve step 4 (final step before straight sides) */}
      <View style={styles.pixelRow}>
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
      </View>

      {/* Row -4 - Bottom curve step 3 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row -3 - Bottom curve step 2 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row -2 - Bottom curve step 1 */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>

      {/* Row -1 - Bottom corner end (outermost) */}
      <View style={styles.pixelRow}>
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View style={[styles.topPixelFill, { backgroundColor: borderColor }]} />
        <View style={[styles.cornerPixel, { backgroundColor: borderColor }]} />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
        <View
          style={[styles.cornerPixel, { backgroundColor: 'transparent' }]}
        />
      </View>
    </Pressable>
  );
};

/**
 * GamePixelCard Component
 * Uses GamePixelBorder for consistent styling
 */
export const GamePixelCard: React.FC<{
  children: React.ReactNode;
  borderColor?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}> = ({
  children,
  borderColor = '#d4a574',
  backgroundColor = '#fef7e7',
  style = {},
}) => {
  return (
    <GamePixelBorder
      borderColor={borderColor}
      backgroundColor={backgroundColor}
      style={[styles.cardStyle, style]}
    >
      {children}
    </GamePixelBorder>
  );
};

const styles = StyleSheet.create({
  // Basic pixel border styles
  outerBorder: {
    borderWidth: 3,
    borderRadius: 2,
  },
  innerContent: {
    padding: 12,
  },

  // Button styles
  button: {
    marginVertical: 4,
  },
  buttonOuter: {
    borderWidth: 3,
    borderRadius: 2,
    borderBottomWidth: 5,
    borderRightWidth: 4,
  },
  buttonInner: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
  },

  // Pixel button styles for more rounded corners
  pixelButtonContainer: {
    marginVertical: 4,
    minHeight: 30,
    alignSelf: 'stretch',
  },
  pixelCardContainer: {
    marginVertical: 4,
    flexShrink: 0,
  },
  pixelRow: {
    flexDirection: 'row',
    height: 3,
  },
  contentRow: {
    flex: 1,
    minHeight: 40,
    alignSelf: 'stretch',
  },
  cardContentRow: {
    flexDirection: 'row',
    minHeight: 120,
    alignSelf: 'stretch',
  },
  cornerPixel: {
    width: 3,
    height: '100%',
  },
  topPixelFill: {
    flex: 1,
    height: '100%',
  },
  sidePixel: {
    width: 3,
    height: '100%',
  },
  pixelContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 32,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  flexibleContentRow: {
    flexDirection: 'row',
    flexGrow: 1,
    flexShrink: 0,
    minHeight: 20,
  },
  flexibleContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingVertical: 2,
    paddingHorizontal: 4,
    flexGrow: 1,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    flexShrink: 0,
    flexGrow: 1,
  },

  // Card styles
  cardContainer: {
    marginVertical: 8,
    marginHorizontal: 4,
  },
  cardBorder: {
    borderWidth: 3,
    borderRadius: 8,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
    borderRadius: 5,
  },

  // Card style
  cardStyle: {
    marginVertical: 8,
    minHeight: 100,
  },

  // States
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GamePixelBorder;
