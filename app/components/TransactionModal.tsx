import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { JOKER_IDS, findJokerById } from '../../src/constants/jokerIds';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { Candy } from '../../src/types/candy';
import FastModal from './FastModal';
import TextWithEmojis from './TextWithEmojis';

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
  const { getInventoryLimit, inventory } = useInventory();
  const { periodCount } = useGame();

  // Clamp maxBuyQuantity and maxSellQuantity to prevent negative values
  // If value is negative, set to 0
  const clampedMaxBuyQuantity = maxBuyQuantity < 0 ? 0 : maxBuyQuantity;
  const clampedMaxSellQuantity = maxSellQuantity < 0 ? 0 : maxSellQuantity;
  const maxQuantity =
    mode === 'buy' ? clampedMaxBuyQuantity : clampedMaxSellQuantity;

  // Debug logging for sell mode
  if (mode === 'sell') {
    console.log(`📊 TransactionModal SELL mode:`);
    console.log(
      `📊 maxSellQuantity=${maxSellQuantity}, clamped=${clampedMaxSellQuantity}`
    );
    console.log(`📊 candy=${candy.name}, quantityOwned=${candy.quantityOwned}`);
    console.log(`📊 maxQuantity=${maxQuantity}`);
  }

  const inventoryLimit = useMemo(
    () => getInventoryLimit(),
    [getInventoryLimit]
  );

  // Reset quantity when modal opens or when maxQuantity changes
  useEffect(() => {
    if (visible) {
      // Clamp quantity to valid range
      const validQuantity = Math.max(0, Math.min(quantity, maxQuantity));
      if (validQuantity !== quantity) {
        setQuantity(validQuantity);
      }
    }
  }, [visible, maxQuantity]);

  // Check for Time Zone Arbitrage joker (morning purchase discount)
  const timeZoneArbitrageJoker = findJokerById(
    jokers,
    JOKER_IDS.TIME_ZONE_ARBITRAGE
  );
  const isMorning = useMemo(() => {
    const periodWithinDay = periodCount % 8;
    return periodWithinDay <= 2; // Periods 0, 1, 2 are "morning"
  }, [periodCount]);

  const qualifiesForMorningDiscount = useMemo(() => {
    return mode === 'buy' && timeZoneArbitrageJoker && isMorning;
  }, [mode, timeZoneArbitrageJoker, isMorning]);

  // Check for Sunset Surge joker (afternoon sale bonus)
  const sunsetSurgeJoker = findJokerById(jokers, JOKER_IDS.SUNSET_SURGE);
  const isAfternoon = useMemo(() => {
    const periodWithinDay = periodCount % 8;
    return periodWithinDay >= 6; // Periods 6, 7 are "afternoon"
  }, [periodCount]);

  const qualifiesForAfternoonBonus = useMemo(() => {
    return mode === 'sell' && sunsetSurgeJoker && isAfternoon;
  }, [mode, sunsetSurgeJoker, isAfternoon]);

  // Check for Bulk Sale joker
  const bulkDiscountJoker = findJokerById(jokers, JOKER_IDS.BULK_SALE);
  const qualifiesForBulkDiscount = useMemo(() => {
    return mode === 'buy' && bulkDiscountJoker && quantity > inventoryLimit / 2;
  }, [mode, bulkDiscountJoker, quantity, inventoryLimit]);

  // Check for Slow Cooker joker (sell multiplier)
  const slowCookerJoker = findJokerById(jokers, JOKER_IDS.SLOW_COOKER);

  // Calculate periodsHeld for Slow Cooker
  const { periodsHeld, slowCookerMultiplier } = useMemo(() => {
    if (!slowCookerJoker || mode !== 'sell') {
      return { periodsHeld: 0, slowCookerMultiplier: 1 };
    }
    const inventoryItem = inventory.find((item) => item.name === candy.name);
    const purchasedAtPeriod = inventoryItem?.purchasedAt ?? periodCount;
    const periods = Math.max(1, periodCount - purchasedAtPeriod + 1);
    const multiplier = Math.pow(1.05, periods);
    return { periodsHeld: periods, slowCookerMultiplier: multiplier };
  }, [slowCookerJoker, mode, inventory, candy.name, periodCount]);

  // Calculate final price with discounts/bonuses
  const finalUnitPrice = useMemo(() => {
    // For selling, use the priceBreakdown if available (includes all joker effects)
    if (mode === 'sell' && priceBreakdown) {
      console.log(
        `💰 TransactionModal finalUnitPrice: basePrice=${priceBreakdown.basePrice}, finalPrice=${priceBreakdown.finalPrice}`
      );
      return priceBreakdown.finalPrice;
    }

    // For buying, calculate discounts manually
    let price = candy.cost;

    // Apply morning discount (10% off) for buying
    if (qualifiesForMorningDiscount) {
      price = price * 0.9;
    }

    // Apply bulk discount (10% off) - stacks with morning discount
    if (qualifiesForBulkDiscount) {
      price = price * 0.9;
    }

    return price;
  }, [
    mode,
    priceBreakdown,
    qualifiesForMorningDiscount,
    qualifiesForBulkDiscount,
    candy.cost,
  ]);

  const handleConfirm = () => {
    if (quantity > 0 && quantity <= maxQuantity) {
      onConfirm(quantity, mode);
    }
  };

  const changeMode = (newMode: 'buy' | 'sell') => {
    if (mode === newMode) {
      // If clicking the same mode, set to max quantity
      if (newMode === 'buy' && maxBuyQuantity > 0) {
        setQuantity(maxBuyQuantity);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (newMode === 'sell' && maxSellQuantity > 0) {
        setQuantity(maxSellQuantity);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } else {
      // If switching modes, change mode and reset quantity
      setMode(newMode);
      setQuantity(1);
    }
  };

  const handleSliderChange = (value: number) => {
    // Trigger light haptic feedback on slider value change
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Ensure quantity never goes below 0
    setQuantity(Math.max(0, Math.round(value)));
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

        {priceBreakdown &&
          priceBreakdown.jokerEffects.length > 0 &&
          mode === 'sell' &&
          (() => {
            // Collect all active sell effects for simplified display
            const activeEffects: Array<{ emoji: string; text: string }> = [];

            // Check for Slow Cooker
            const slowCookerEffect = priceBreakdown.jokerEffects.find(
              (effect) =>
                effect.jokerName === 'Slow Cooker' &&
                effect.effectType === 'sell'
            );
            if (slowCookerEffect && slowCookerJoker) {
              const basePrice = priceBreakdown.basePrice;
              const additionalProfit =
                basePrice * (slowCookerMultiplier - 1) * quantity;
              const periodText = periodsHeld === 1 ? 'period' : 'periods';
              activeEffects.push({
                emoji: '🍲',
                text: `Slow cooked for ${periodsHeld} ${periodText}: +$${additionalProfit.toFixed(2)}`,
              });
            }

            // Check for other sell effects (Pursuasion, Even Stevens, Odd Todd, etc.)
            // Calculate bonuses with proper compounding
            let currentPrice = priceBreakdown.basePrice;

            priceBreakdown.jokerEffects.forEach((effect) => {
              console.log('📊 TransactionModal effect:', effect);

              if (
                effect.isActive &&
                effect.effectType === 'sell' &&
                effect.jokerName !== 'Slow Cooker'
              ) {
                // Calculate the actual bonus amount with compounding
                const priceBeforeBonus = currentPrice;
                const multiplier = 1 + effect.amount / 100;
                const priceAfterBonus = currentPrice * multiplier;
                const bonusAmount =
                  (priceAfterBonus - priceBeforeBonus) * quantity;

                // Update current price for next effect (compounding)
                currentPrice = priceAfterBonus;

                console.log(
                  `📊 Adding ${effect.jokerName} to display: priceBeforeBonus=${priceBeforeBonus.toFixed(2)}, priceAfterBonus=${priceAfterBonus.toFixed(2)}, bonusAmount=${bonusAmount.toFixed(2)}`
                );

                activeEffects.push({
                  emoji: effect.jokerEmoji,
                  text: `${effect.jokerName}: +$${bonusAmount.toFixed(2)}`,
                });
              }
            });

            if (activeEffects.length > 0) {
              return (
                <View style={styles.priceBreakdownContainer}>
                  {activeEffects.map((effect, index) => (
                    <Text key={index} style={styles.slowCookerText}>
                      {effect.emoji} {effect.text}
                    </Text>
                  ))}
                </View>
              );
            }

            return null;
          })()}

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, mode === 'buy' && styles.activeTab]}
            onPress={() => changeMode('buy')}
          >
            <Text style={styles.tabText}>
              {mode === 'buy' ? 'Buy Max' : 'Buy'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'sell' && styles.activeTab]}
            onPress={() => changeMode('sell')}
          >
            <Text style={styles.tabText}>
              {mode === 'sell' ? 'Sell Max' : 'Sell'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sliderSection}>
          <Text style={styles.quantityLabel}>
            {mode === 'buy' && maxQuantity <= 0
              ? 'Inventory Full'
              : `Quantity: ${quantity} / ${maxQuantity}`}
          </Text>

          <Slider
            style={{ width: '100%', height: 50, marginVertical: 10 }}
            minimumValue={0}
            maximumValue={maxQuantity > 0 ? maxQuantity : 1}
            step={1}
            value={Math.max(0, Math.min(quantity, maxQuantity > 0 ? maxQuantity : 0))}
            onValueChange={handleSliderChange}
            minimumTrackTintColor={mode === 'buy' ? '#ef4444' : '#4ade80'}
            maximumTrackTintColor="#ccc"
            disabled={mode === 'buy' && maxQuantity <= 0}
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

          {/* Morning Discount Notification */}
          {qualifiesForMorningDiscount && mode === 'buy' && (
            <View style={styles.morningDiscountContainer}>
              <View style={styles.morningDiscountContent}>
                <Text style={styles.morningDiscountLabel}>
                  Morning Discount Applied!
                </Text>
                <Text style={styles.morningDiscountLabel}>
                  You Save: ${(quantity * candy.cost * 0.1).toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Afternoon Sale Bonus Notification */}
          {qualifiesForAfternoonBonus && mode === 'sell' && (
            <View style={styles.afternoonBonusContainer}>
              <View style={styles.afternoonBonusContent}>
                <Text style={styles.afternoonBonusLabel}>
                  Afternoon Bonus Applied!
                </Text>
                <Text style={styles.afternoonBonusLabel}>
                  You Earn: ${(quantity * candy.cost * 0.1).toFixed(2)} extra
                </Text>
              </View>
            </View>
          )}

          {/* Combined Bulk Discount Notification */}
          {qualifiesForBulkDiscount && mode === 'buy' && (
            <View style={styles.bulkDiscountContainer}>
              <View style={styles.bulkDiscountContent}>
                {/* <Image
                  source={require('../../assets/images/emojis/bullseye.png')}
                  style={styles.bullseyeIcon}
                /> */}
                <Text style={styles.bulkDiscountLabel}>
                  Bulk Discount Applied!
                </Text>
                <Text style={styles.bulkDiscountLabel}>
                  You Save: $
                  {(
                    quantity *
                    (qualifiesForMorningDiscount
                      ? candy.cost * 0.9
                      : candy.cost) *
                    0.1
                  ).toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {mode === 'buy' && maxBuyQuantity === 0 && (
            <TextWithEmojis style={styles.warningText}>
              {playerBalance !== undefined &&
              availableInventorySpace !== undefined
                ? playerBalance < candy.cost
                  ? "⚠️ You don't have enough money!"
                  : availableInventorySpace <= 0
                    ? '⚠️ Your stash is full!'
                    : "⚠️ You can't buy this item!"
                : '⚠️ Your stash is full!'}
            </TextWithEmojis>
          )}

          {mode === 'sell' && candy.averagePrice !== null && quantity > 0 && (
            <View style={styles.profitContainer}>
              <Text style={styles.profitLabel}>
                {finalUnitPrice > candy.averagePrice ? 'Profit:' : 'Loss:'}
              </Text>
              <Text
                style={[
                  styles.profitAmount,
                  {
                    color:
                      finalUnitPrice > candy.averagePrice
                        ? '#22c55e'
                        : '#ef4444',
                  },
                ]}
              >
                ${((finalUnitPrice - candy.averagePrice) * quantity).toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirm {mode}</Text>
          </TouchableOpacity>
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
    fontFamily: 'PixeloidMono',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#6b4423', // Dark brown
    textShadow: '1px 1px 0px #e6d4b7',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
    marginRight: 10,
  },
  totalValueAmount: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
    marginRight: 8,
  },
  profitAmount: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
  },
  priceBreakdownContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    padding: 4,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: '#4a90e2',
  },
  slowCookerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4a90e2',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
  },
  jokerEffectLabel: {
    fontSize: 13,
    color: '#4a90e2',
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
    flex: 1,
  },
  jokerEffectValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  finalPriceLabel: {
    fontSize: 16,
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
  },
  finalPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  bulkDiscountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#dcfce7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    maxWidth: '100%',
    borderColor: '#16a34a',
  },
  bulkDiscountContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  bullseyeIcon: {
    width: 24,
    height: 24,
  },
  bulkDiscountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  morningDiscountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#fef3c7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    maxWidth: '100%',
    borderColor: '#f59e0b',
  },
  morningDiscountContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  morningDiscountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  afternoonBonusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#f3e8ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    maxWidth: '100%',
    borderColor: '#a855f7',
  },
  afternoonBonusContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  afternoonBonusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b21a8',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  inactiveEffectRow: {
    opacity: 0.6,
  },
  inactiveEffectText: {
    color: '#999',
    fontStyle: 'italic',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dc2626',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#16a34a',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
});
