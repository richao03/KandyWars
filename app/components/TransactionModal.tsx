import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { JOKER_IDS, findJokerById } from '../../src/constants/jokerIds';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { Candy } from '../../src/types/candy';
import FastModal from './FastModal';

type PriceBreakdown = {
  basePrice: number;
  jokerEffects: Array<{
    jokerName: string;
    jokerEmoji: string;
    effect: string;
    amount: number;
    effectType: 'buy' | 'sell';
    isActive: boolean;
  }>;
  finalPrice: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, mode: 'buy' | 'sell') => void;
  maxBuyQuantity: number;
  maxSellQuantity: number;
  candy: Candy & {
    cost: number;
    quantityOwned: number;
    averagePrice: number | null;
  };
  priceBreakdown?: PriceBreakdown;
  playerBalance?: number;
  availableInventorySpace?: number;
};

export default function TransactionModal({
  visible,
  onClose,
  onConfirm,
  maxBuyQuantity,
  maxSellQuantity,
  candy,
  priceBreakdown,
  playerBalance,
  availableInventorySpace,
}: Props) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const { jokers } = useJokers();
  const { getInventoryLimit } = useInventory();

  const maxQuantity = mode === 'buy' ? maxBuyQuantity : maxSellQuantity;
  const inventoryLimit = useMemo(() => getInventoryLimit(), [getInventoryLimit]);

  // Check for Bulk Discount joker
  const bulkDiscountJoker = findJokerById(jokers, JOKER_IDS.BULK_DISCOUNT);
  const qualifiesForBulkDiscount = useMemo(() => {
    return mode === 'buy' && bulkDiscountJoker && quantity > inventoryLimit / 2;
  }, [mode, bulkDiscountJoker, quantity, inventoryLimit]);

  // Calculate final price with bulk discount
  const finalUnitPrice = useMemo(() => {
    if (qualifiesForBulkDiscount) {
      return candy.cost * 0.9; // Apply 10% discount
    }
    return candy.cost;
  }, [qualifiesForBulkDiscount, candy.cost]);

  const handleConfirm = () => {
    if (quantity > 0 && quantity <= maxQuantity) {
      onConfirm(quantity, mode);
    }
  };

  const changeMode = (newMode: 'buy' | 'sell') => {
    setMode(newMode);
    setQuantity(1);
  };

  const handleSliderChange = (value: number) => {
    // Trigger light haptic feedback on slider value change
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuantity(value);
  };

  return (
    <FastModal
      visible={visible}
      onClose={undefined}
      animationType="spring"
      backdropOpacity={0.6}
      modalStyle={styles.container}
    >
      <>
        <Text style={styles.title}>{candy.name}</Text>

        <View style={styles.priceInfoContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Current Price:</Text>
            <Text style={styles.priceValue}>${candy.cost.toFixed(2)}</Text>
          </View>

          {candy.quantityOwned > 0 && (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>You Own:</Text>
                <Text style={styles.priceValue}>{candy.quantityOwned}</Text>
              </View>

              {candy.averagePrice !== null && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Avg Buy Price:</Text>
                  <Text
                    style={[
                      styles.priceValue,
                      {
                        color:
                          candy.averagePrice < candy.cost
                            ? '#22c55e'
                            : '#ef4444',
                      },
                    ]}
                  >
                    ${candy.averagePrice.toFixed(2)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {priceBreakdown && priceBreakdown.jokerEffects.length > 0 && (
          <View style={styles.priceBreakdownContainer}>
            <Text style={styles.breakdownTitle}>💰 Price Breakdown</Text>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Base Price:</Text>
              <Text style={styles.breakdownValue}>
                ${priceBreakdown.basePrice.toFixed(2)}
              </Text>
            </View>

            <View style={styles.divider} />

            {priceBreakdown.jokerEffects.map((effect, index) => (
              <View
                key={index}
                style={[
                  styles.breakdownRow,
                  !effect.isActive && styles.inactiveEffectRow,
                ]}
              >
                <Text
                  style={[
                    styles.jokerEffectLabel,
                    !effect.isActive && styles.inactiveEffectText,
                  ]}
                >
                  {effect.jokerEmoji} {effect.jokerName}
                  {effect.effectType === 'sell' ? ' (Sell)' : ''}
                  {!effect.isActive ? ' (Inactive)' : ''}:
                </Text>
                <Text
                  style={[
                    styles.jokerEffectValue,
                    {
                      color: effect.isActive
                        ? effect.amount >= 0
                          ? '#22c55e'
                          : '#ef4444'
                        : '#999',
                    },
                    !effect.isActive && styles.inactiveEffectText,
                  ]}
                >
                  {effect.effect}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.breakdownRow}>
              <Text style={styles.finalPriceLabel}>Final Price:</Text>
              <Text style={styles.finalPriceValue}>
                ${priceBreakdown.finalPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, mode === 'buy' && styles.activeTab]}
            onPress={() => changeMode('buy')}
          >
            <Text style={styles.tabText}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'sell' && styles.activeTab]}
            onPress={() => changeMode('sell')}
          >
            <Text style={styles.tabText}>Sell</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sliderSection}>
          <Text style={styles.quantityLabel}>
            Quantity: {quantity} / {maxQuantity}
          </Text>

          <Slider
            style={{ width: '100%', height: 50, marginVertical: 10 }}
            minimumValue={0}
            maximumValue={maxQuantity}
            step={1}
            value={quantity}
            onValueChange={handleSliderChange}
            minimumTrackTintColor={mode === 'buy' ? '#ef4444' : '#4ade80'}
            maximumTrackTintColor="#ccc"
          />

          <View style={styles.totalValueContainer}>
            <Text style={styles.totalValueLabel}>Total Value:</Text>
            <Text
              style={[
                styles.totalValueAmount,
                { color: mode === 'buy' ? '#ef4444' : '#22c55e' },
              ]}
            >
              ${(quantity * finalUnitPrice).toFixed(2)}
            </Text>
          </View>

          {/* Combined Bulk Discount Notification */}
          {qualifiesForBulkDiscount && mode === 'buy' && (
            <View style={styles.bulkDiscountContainer}>
              <Text style={styles.bulkDiscountLabel}>
                🎯 Bulk Discount Applied! You Save: $
                {(quantity * candy.cost - quantity * finalUnitPrice).toFixed(2)}
              </Text>
            </View>
          )}

          {mode === 'buy' && maxBuyQuantity === 0 && (
            <Text style={styles.warningText}>
              {playerBalance !== undefined &&
              availableInventorySpace !== undefined
                ? playerBalance < candy.cost
                  ? "⚠️ You don't have enough money!"
                  : availableInventorySpace <= 0
                    ? '⚠️ Your stash is full!'
                    : "⚠️ You can't buy this item!"
                : '⚠️ Your stash is full!'}
            </Text>
          )}

          {mode === 'sell' && candy.averagePrice !== null && quantity > 0 && (
            <View style={styles.profitContainer}>
              <Text style={styles.profitLabel}>
                {candy.cost > candy.averagePrice ? 'Profit:' : 'Loss:'}
              </Text>
              <Text
                style={[
                  styles.profitAmount,
                  {
                    color:
                      candy.cost > candy.averagePrice ? '#22c55e' : '#ef4444',
                  },
                ]}
              >
                ${((candy.cost - candy.averagePrice) * quantity).toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <Button title="Cancel" onPress={onClose} />
          <Button title={`Confirm ${mode}`} onPress={handleConfirm} />
        </View>
      </>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fefaf5', // Warm paper background
    borderRadius: 20,
    padding: 24,
    alignItems: 'stretch',
    borderWidth: 3,
    borderColor: '#d4a574', // Brown crayon border
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    minHeight: 450,
    minWidth: '90%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#6b4423', // Dark brown
    textShadow: '1px 1px 0px #e6d4b7',
    fontFamily: 'CrayonPastel',
  },
  priceInfoContainer: {
    backgroundColor: '#fff9e6',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#e6d4b7',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  priceLabel: {
    fontSize: 16,
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
  },
  sliderSection: {
    marginTop: 16,
    paddingVertical: 8,
  },
  quantityLabel: {
    fontSize: 18,
    fontWeight: '600',
    alignSelf: 'center',
    color: '#8b4513',
    backgroundColor: '#fff9e6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#f4d03f',
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bae6fd',
  },
  totalValueLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    marginRight: 10,
  },
  totalValueAmount: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  profitContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#f0fdf4',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  profitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    marginRight: 8,
  },
  profitAmount: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  buttonRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 6,
    justifyContent: 'center',
    gap: 10,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#cc7a00',
    backgroundColor: '#fff',
  },
  activeTab: {
    backgroundColor: '#ffcc99', // Orange crayon
    borderColor: '#cc7a00',
  },
  tabText: {
    color: '#8b4513',
    fontWeight: '700',
    fontSize: 16,
  },
  priceBreakdownContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: '#4a90e2',
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4a90e2',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'CrayonPastel',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
  },
  jokerEffectLabel: {
    fontSize: 13,
    color: '#4a90e2',
    fontFamily: 'CrayonPastel',
    fontWeight: '600',
    flex: 1,
  },
  jokerEffectValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  finalPriceLabel: {
    fontSize: 16,
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    fontWeight: '700',
  },
  finalPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
    fontFamily: 'CrayonPastel',
  },
  divider: {
    height: 1,
    backgroundColor: '#bae6fd',
    marginVertical: 8,
  },
  warningContainer: {
    marginTop: 10,
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  bulkDiscountContainer: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#16a34a',
    alignItems: 'center',
  },
  bulkDiscountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  inactiveEffectRow: {
    opacity: 0.6,
  },
  inactiveEffectText: {
    color: '#999',
    fontStyle: 'italic',
  },
});
