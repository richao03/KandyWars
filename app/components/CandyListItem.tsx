import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../src/constants/colors';
import { formatCurrency } from '../../src/utils/priceUtils';
import { getCandyDefinition, CANDY_TYPE_LABELS, CANDY_SIZE_LABELS } from '../../src/constants/candyRegistry';
import type { Candy } from '../../src/types/candy';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

export type CandyForMarket = Candy & {
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
};

// Color mapping for candy types
const TYPE_COLORS: Record<string, string> = {
  gummy: '#ff69b4',
  chocolate: '#8B4513',
  hard_candy: '#4169E1',
  sour: '#32CD32',
  chewy: '#FF8C00',
  fruity: '#FF1493',
};

// Color mapping for candy sizes
const SIZE_COLORS: Record<string, string> = {
  small: '#9CA3AF',
  medium: '#60A5FA',
  big: '#F59E0B',
};

const SHADOW_OFFSET = { width: 0, height: 3 };

interface CandyListItemProps {
  item: CandyForMarket;
  index: number;
  localPricesUpdating: boolean;
  onPress: (index: number) => void;
  onItemLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
}

const CandyListItem = React.memo(function CandyListItem({
  item,
  index,
  localPricesUpdating,
  onPress,
  onItemLayout,
}: CandyListItemProps) {
  const itemRef = useRef<View>(null);

  const handleLayout = useCallback(() => {
    if (onItemLayout && itemRef.current) {
      requestAnimationFrame(() => {
        itemRef.current?.measureInWindow((x, y, width, height) => {
          if (__DEV__) console.log(`📖 CandyListItem measured: x=${x}, y=${y}, w=${width}, h=${height}`);
          if (width > 0 && height > 0) onItemLayout({ x, y, width, height });
        });
      });
    }
  }, [onItemLayout]);
  const candyDef = getCandyDefinition(item.name);

  // Memoize badge JSX — candyDef is static per candy name, never changes
  const badges = useMemo(() => {
    if (!candyDef) return null;
    return (
      <View style={styles.badgeRow}>
        <View style={[styles.sizeBadge, { backgroundColor: SIZE_COLORS[candyDef.size] || '#9CA3AF' }]}>
          <Text style={styles.badgeText}>{CANDY_SIZE_LABELS[candyDef.size]}</Text>
        </View>
        {candyDef.types.map((type) => (
          <View key={type} style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[type] || '#888' }]}>
            <Text style={styles.badgeText}>{CANDY_TYPE_LABELS[type]}</Text>
          </View>
        ))}
      </View>
    );
  }, [candyDef]);

  return (
    <View ref={itemRef} onLayout={handleLayout} collapsable={false}>
      <PressableButton
        onPress={() => onPress(index)}
        shadowColor="#d4a574"
        shadowOffset={SHADOW_OFFSET}
        shadowOpacity={0.4}
        shadowRadius={4}
        elevation={6}
        style={styles.container}
      >
        <PixelBorder
          borderColor="#d4a574"
          borderWidth={3}
          backgroundColor="rgba(255, 255, 255, 0.7)"
          innerPadding={8}
        >
          <View style={styles.candyInfo}>
            <View style={styles.candyLeftSection}>
              <View style={styles.candyNameRow}>
                <Text style={styles.name}>{item.name}</Text>
                {item.quantityOwned > 0 && (
                  <View style={styles.ownedBadge}>
                    <Text style={styles.ownedText}>{item.quantityOwned}</Text>
                  </View>
                )}
              </View>
              {badges}
            </View>
            <View style={styles.candyPriceRow}>
              <Text style={styles.price}>
                {localPricesUpdating ? '$-.--' : `$${formatCurrency(item.cost)}`}
              </Text>
            </View>
          </View>
        </PixelBorder>
      </PressableButton>
    </View>
  );
});

export default CandyListItem;

const styles = StyleSheet.create({
  container: {
    marginBottom: 6,
  },
  candyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candyLeftSection: {
    flexDirection: 'column',
    flex: 1,
  },
  candyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  candyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  sizeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PixeloidMono',
  },
  name: {
    fontWeight: '700',
    fontSize: 19,
    color: colors.brown.primary,
    textShadowColor: '#d4a574',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 0,
    fontFamily: 'PixeloidMono',
  },
  ownedBadge: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.green.success,
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
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
});
