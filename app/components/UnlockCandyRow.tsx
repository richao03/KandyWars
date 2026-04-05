import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import colors from '../../src/constants/colors';
import { formatNumber } from '../../src/utils/priceUtils';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

interface UnlockCandyRowProps {
  size: 'medium' | 'big';
  cost: number;
  canAfford: boolean;
  onPress: () => void;
}

const UnlockCandyRow = React.memo(function UnlockCandyRow({
  size,
  cost,
  canAfford,
  onPress,
}: UnlockCandyRowProps) {
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  const handlePress = useCallback(() => {
    if (!canAfford) return;
    // Wobble animation, then fire onPress after it finishes
    rotation.value = withSequence(
      withTiming(-4, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(-3, { duration: 50 }),
      withTiming(3, { duration: 50 }),
      withTiming(-1, { duration: 40 }),
      withTiming(0, { duration: 40 }, () => {
        runOnJS(onPress)();
      })
    );
  }, [canAfford, onPress, rotation]);

  const label = size === 'medium' ? 'Unlock Medium Candies' : 'Unlock Big Candies';
  const costLabel = `$${formatNumber(cost)}`;

  return (
    <Animated.View style={[styles.container, animatedStyle, !canAfford && styles.disabled]}>
      <PressableButton
        onPress={handlePress}
        shadowColor="#d4a574"
        shadowOffset={{ width: 0, height: 3 }}
        shadowOpacity={0.4}
        shadowRadius={4}
        elevation={6}
        disabled={!canAfford}
      >
        <PixelBorder
          borderColor={canAfford ? '#d4a574' : '#999'}
          borderWidth={3}
          backgroundColor={canAfford ? 'rgba(255, 240, 200, 0.85)' : 'rgba(200, 200, 200, 0.7)'}
          innerPadding={8}
        >
          <View style={styles.content}>
            <View style={styles.leftSection}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={[styles.label, !canAfford && styles.labelDisabled]}>{label}</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={[styles.price, !canAfford && styles.priceDisabled]}>
                {costLabel}
              </Text>
            </View>
          </View>
        </PixelBorder>
      </PressableButton>
    </Animated.View>
  );
});

export default UnlockCandyRow;

const styles = StyleSheet.create({
  container: {
    marginBottom: 6,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  lockIcon: {
    fontSize: 22,
  },
  label: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.brown.primary,
    textShadowColor: '#d4a574',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 0,
    fontFamily: 'PixeloidMono',
  },
  labelDisabled: {
    color: colors.gray.medium,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#8b0000',
    backgroundColor: '#ffe6e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffb3b3',
    fontFamily: 'PixeloidMono',
  },
  priceDisabled: {
    color: '#999',
    backgroundColor: '#e8e8e8',
    borderColor: '#ccc',
  },
});
