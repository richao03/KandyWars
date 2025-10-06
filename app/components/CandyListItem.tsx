import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PixelBorder from './PixelBorder';
import type { Candy } from '../../src/types/candy';

export type CandyForMarket = Candy & {
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
  priceBreakdown?: any;
};

interface CandyListItemProps {
  item: CandyForMarket;
  index: number;
  localPricesUpdating: boolean;
  onPress: (index: number) => void;
}

const CandyListItem = React.memo(function CandyListItem({
  item,
  index,
  localPricesUpdating,
  onPress,
}: CandyListItemProps) {
  return (
    <View style={styles.container}>
      <PixelBorder
        borderColor="#d4a574"
        borderWidth={3}
        backgroundColor="rgba(255, 255, 255, 0.7)"
        innerPadding={8}
      >
        <TouchableOpacity
          onPress={() => onPress(index)}
          style={{ backgroundColor: 'transparent' }}
        >
          <View style={styles.candyInfo}>
            <View style={styles.candyNameRow}>
              <Text style={styles.name}>{item.name}</Text>
              {item.quantityOwned > 0 && (
                <View style={styles.ownedBadge}>
                  <Text style={styles.ownedText}>{item.quantityOwned}</Text>
                </View>
              )}
            </View>
            <View style={styles.candyPriceRow}>
              <Text style={styles.price}>
                {localPricesUpdating ? '$-.--' : `$${item.cost.toFixed(2)}`}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </PixelBorder>
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
  name: {
    fontWeight: '700',
    fontSize: 19,
    color: '#6b4423', // Dark brown crayon
    textShadow: '0.5px 0.5px 0px #d4a574',
    fontFamily: 'PixeloidMono',
  },
  ownedBadge: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PixeloidMono',
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#8b0000', // Dark red crayon
    backgroundColor: '#ffe6e6', // Light red background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffb3b3',
    fontFamily: 'PixeloidMono',
  },
});
