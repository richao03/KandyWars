import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../src/constants/colors';
import { scoreboardService } from '../../src/services/firebase';
import { Candy } from '../../src/types/candy';
import type { SaleInputs } from './TransactionModalManager';
import { calculateSaleTotal } from '../../src/utils/saleCalculations';
import { MerchantUtils } from '../../src/utils/merchantUtils';
import { SoundEffects } from '../../src/utils/soundEffects';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import SparkEffect from './SparkEffect';
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
  hallPassEffect?: {
    bonusPercent: number;
    bonusAmount: number;
  };
  merchantEffect?: {
    bonusPercent: number;
    bonusAmount: number;
  };
  influencerShoutoutEffect?: {
    bonusPercent: number;
    bonusAmount: number;
  };
  vacuumSealerPenalty?: {
    penaltyPercent: number; // e.g., 50 for -50%
    isActive: boolean;
  };
  finalPrice: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, mode: 'Buy' | 'Sell') => void;
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
  saleInputs?: SaleInputs | null;
};

function TransactionModal({
  visible,
  onClose,
  onConfirm,
  maxBuyQuantity,
  maxSellQuantity,
  candy,
  priceBreakdown,
  playerBalance,
  availableInventorySpace,
  saleInputs,
}: Props) {
  const [mode, setMode] = useState<'Buy' | 'Sell'>('Buy');
  const [quantity, setQuantity] = useState(1);
  const [isClosing, setIsClosing] = useState(false);

  // Read from snapshotted saleInputs prop (captured when modal opens) — no Redux subscriptions
  const jokers = saleInputs?.jokers ?? [];
  const activeEffects = saleInputs?.activeEffects ?? [];
  const computedInventoryLimit = saleInputs?.computedInventoryLimit ?? 30;
  const hallPassModifiers = saleInputs?.hallPassModifiers ?? { inventoryBonusSlots: 0, salePriceBonusPercent: 0 };
  const periodCount = saleInputs?.periodCount ?? 0;
  const hasEarlySaleToday = saleInputs?.hasEarlySaleToday ?? false;
  const merchantEffects = saleInputs?.merchantEffects ?? [];
  const candySales = saleInputs?.candySales ?? [];
  const totalCandiesSold = saleInputs?.totalCandiesSold ?? 0;
  const inventoryCount = saleInputs?.inventoryCount ?? 0;
  const saleDay = saleInputs?.day ?? 1;
  const uniqueLocationsToday = saleInputs?.uniqueLocationsToday ?? 0;
  const salePeriod = saleInputs?.period ?? 1;
  const periodsPerDay = saleInputs?.periodsPerDay ?? 8;

  // Clamp maxBuyQuantity and maxSellQuantity to prevent negative values
  // If value is negative, set to 0
  const clampedMaxBuyQuantity = maxBuyQuantity < 0 ? 0 : maxBuyQuantity;
  const clampedMaxSellQuantity = maxSellQuantity < 0 ? 0 : maxSellQuantity;
  const maxQuantity =
    mode === 'Buy' ? clampedMaxBuyQuantity : clampedMaxSellQuantity;

  // Inline getInventoryLimit (from useInventory.ts:82-91)
  const inventoryLimit = useMemo(() => {
    let limit = computedInventoryLimit + hallPassModifiers.inventoryBonusSlots;
    return MerchantUtils.applyInventoryBonus(limit, merchantEffects);
  }, [computedInventoryLimit, hallPassModifiers.inventoryBonusSlots, merchantEffects]);

  // Inline consecutivePeriodSales (from useCandySales.ts:48-94)
  const consecutiveSalesCount = useMemo(() => {
    if (!visible) return 0;
    if (candySales.length === 0) return 1;
    const periodsWithSales = Array.from(
      new Set(candySales.map((sale: any) => sale.period))
    ).sort((a: number, b: number) => b - a);
    if (periodsWithSales.length === 0) return 1;
    const mostRecentPeriod = periodsWithSales[0];
    let consecutiveCount = 1;
    for (let i = 1; i < periodsWithSales.length; i++) {
      if (periodsWithSales[i] === mostRecentPeriod - i) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    return consecutiveCount;
  }, [visible, candySales]);

  // Set quantity to max when modal opens
  useEffect(() => {
    if (visible) {
      if (__DEV__) console.log('isVisible maxQuantity: ', maxQuantity);
      // Set to max quantity for current mode (minimum 1)
      setQuantity(Math.max(1, maxQuantity));
    }
  }, [visible]);

  const finalUnitPrice = (mode === 'Sell' && priceBreakdown)
    ? priceBreakdown.finalPrice
    : candy.cost;

  // Calculate sale result for selling - contains pocket value and bonus breakdown
  // Skip expensive calculation when modal is hidden (stays mounted by TransactionModalManager)
  const saleResult = useMemo(() => {
    if (!visible) return null;
    if (mode === 'Sell' && candy.averagePrice !== null) {
      // Use shared calculation function to ensure consistency with actual sale
      return calculateSaleTotal({
        candyName: candy.name,
        basePrice: candy.cost,
        purchasePrice: candy.averagePrice,
        quantity,
        jokers,
        periodCount,
        inventoryLimit,
        activeEffects,
        hallPassModifiers,
        merchantEffects,
        consecutivePeriodSales: consecutiveSalesCount,
        totalCandiesSold: totalCandiesSold || 0,
        hasEarlySaleToday,
        initialMultiplier: 1, // Don't include one-time jokers in preview
        inventoryCount,
        day: saleDay,
        uniqueLocationsToday,
        period: salePeriod,
        periodsPerDay,
      });
    }
    return null;
  }, [
    visible,
    mode,
    candy.name,
    candy.cost,
    candy.averagePrice,
    quantity,
    jokers,
    periodCount,
    inventoryLimit,
    activeEffects,
    hallPassModifiers,
    merchantEffects,
    consecutiveSalesCount,
    totalCandiesSold,
    hasEarlySaleToday,
    inventoryCount,
    saleDay,
    uniqueLocationsToday,
    salePeriod,
    periodsPerDay,
  ]);

  const pocketValue = saleResult
    ? saleResult.totalGain.toFixed(2)
    : mode === 'Sell'
      ? (candy.cost * quantity).toFixed(2)
      : (finalUnitPrice * quantity).toFixed(2);

  const handleConfirm = () => {
    if (quantity > 0 && quantity <= maxQuantity) {
      // Mark modal as closing to prevent slider events
      setIsClosing(true);

      // Play pop sound when confirming transaction
      SoundEffects.playRandomPop();

      // Track highest single sale for SELL transactions
      if (mode === 'Sell' && priceBreakdown) {
        const saleRevenue = priceBreakdown.finalPrice * quantity;
        if (__DEV__) console.log('💰 Sale revenue:', saleRevenue);

        const userObject = scoreboardService.getCachedUserObject();
        if (!userObject) {
          if (__DEV__) {
            console.warn(
              '⚠️ User object not cached, cannot track highest single sale'
            );
          }
        } else if (saleRevenue > userObject.highestSingleSale) {
          if (__DEV__) {
            console.log(
              '🎉 New highest single sale!',
              saleRevenue,
              'Previous:',
              userObject.highestSingleSale
            );
          }
          scoreboardService.updateLocalUserObject({
            highestSingleSale: saleRevenue,
          });
        }
      }

      onConfirm(quantity, mode.toLowerCase() as 'buy' | 'sell');
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    onClose();
  };

  // Reset closing state when modal visibility changes
  useEffect(() => {
    if (visible) {
      setIsClosing(false);
    }
  }, [visible]);

  const changeMode = (newMode: 'Buy' | 'Sell') => {
    const newMaxQuantity =
      newMode === 'Buy' ? clampedMaxBuyQuantity : clampedMaxSellQuantity;

    // Update mode first
    setMode(newMode);

    // Set to 0 temporarily, then to max - this "wakes up" the slider
    setQuantity(0);
    requestAnimationFrame(() => {
      setQuantity(newMaxQuantity);
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    SoundEffects.playRandomPop();
  };

  const handleSliderChange = (value: number) => {
    // Prevent slider updates if modal is closing
    if (isClosing) return;

    // Ensure quantity is at least 1 (since minimumValue is 1)
    setQuantity(Math.max(1, Math.round(value)));
  };

  const handleSliderComplete = (value: number) => {
    // Trigger haptic feedback only when slider is released (not on every drag)
    if (!isClosing) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Sell value for tier-based styling
  const sellValue = mode === 'Sell' ? parseFloat(pocketValue) : 0;

  const numSparks = sellValue < 100 ? 0
    : sellValue < 500 ? 3
    : sellValue < 1000 ? 5
    : sellValue < 5000 ? 7
    : sellValue < 10000 ? 12
    : sellValue < 30000 ? 20
    : 24;

  const buttonBorderColor = sellValue >= 20000 ? '#0066ff'
    : sellValue >= 15000 ? '#00cccc'
    : sellValue >= 10000 ? '#00ffcc'
    : sellValue >= 5000 ? '#00ff99'
    : sellValue >= 2000 ? '#2ecc71'
    : sellValue >= 1000 ? '#4caf50'
    : 'rgba(123,169,101,1)';

  const buttonBackgroundColor = sellValue >= 20000 ? 'rgba(0, 102, 255, 0.3)'
    : sellValue >= 15000 ? 'rgba(0, 204, 204, 0.3)'
    : sellValue >= 10000 ? 'rgba(0, 255, 204, 0.3)'
    : sellValue >= 5000 ? 'rgba(0, 255, 153, 0.3)'
    : sellValue >= 2000 ? 'rgba(46, 204, 113, 0.3)'
    : sellValue >= 1000 ? 'rgba(76, 175, 80, 0.3)'
    : 'rgba(154,193,118,1)';

  const sparkColors = sellValue >= 20000
    ? ['#0066ff', '#0080ff', '#0099ff', '#00b3ff', '#1e90ff', '#4169e1', '#5a7fff', '#00bfff']
    : sellValue >= 15000
    ? ['#00cccc', '#00e6e6', '#00d9ff', '#00c3ff', '#00b0ff', '#009fff', '#1e90ff', '#4db8ff']
    : sellValue >= 10000
    ? ['#00ffcc', '#00ffb3', '#00e6cc', '#00d9e6', '#00cccc', '#00b8d4', '#26c6da', '#4dd0e1']
    : sellValue >= 5000
    ? ['#00ff99', '#00e68a', '#00cc88', '#00b894', '#1abc9c', '#16a085', '#26d9a0', '#2ecc71']
    : sellValue >= 2000
    ? ['#3dff88', '#2ecc71', '#27ae60', '#16a085', '#1abc9c', '#20c997']
    : sellValue >= 1000
    ? ['#4caf50', '#43a047', '#388e3c', '#2e7d32']
    : sellValue >= 500
    ? ['#5ced00', '#4caf50', '#43a047']
    : ['rgba(123,169,101,1)', '#7ba965', '#6a9a54'];

  return (
    <FastModal
      visible={visible}
      onClose={undefined}
      animationType="spring"
      backdropOpacity={0.6}
      modalStyle={styles.modalWrapper}
    >
      <PixelBorder
        borderColor={'#cc7a00'}
        borderWidth={3}
        backgroundColor={colors.gold.beige}
        innerPadding={0}
      >
        <View style={styles.container}>
          <PixelBorder
            borderColor="#e5e7eb"
            borderWidth={3}
            backgroundColor="#ffffff"
            innerPadding={0}
            style={{ marginBottom: 8 }}
          >
            <View style={styles.priceInfoContainer}>
              <View style={styles.priceRow}>
                <Text style={{ ...styles.priceValue, fontSize: 20 }}>
                  {candy.name}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Current Price:</Text>
                <Text style={styles.priceValue}>${candy.cost.toFixed(2)}</Text>
              </View>

              {candy.quantityOwned > 0 && (
                <>
                  {mode === 'Sell' ? (
                    <>
                      {candy.averagePrice !== null && (
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>
                            Avg Purchase Price:
                          </Text>
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
                  ) : (
                    <>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>You Own:</Text>
                        <Text style={styles.priceValue}>
                          {candy.quantityOwned}
                        </Text>
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
                </>
              )}
            </View>
          </PixelBorder>

          {/* Buy mode discounts now handled by new joker system in saleCalculations.ts */}

          {/* Display bonuses from shared calculation */}
          {saleResult &&
            saleResult.bonusBreakdown.length > 0 &&
            mode === 'Sell' && (
              <PixelBorder
                borderColor="#fde047"
                borderWidth={3}
                backgroundColor="#fef3c7"
                innerPadding={0}
              >
                <View style={styles.priceBreakdownContainer}>
                  {saleResult.bonusBreakdown.filter(b => b.name !== 'Vacuum Sealer').map((bonus, index) => {
                    // Map emojis to custom images
                    const emojiImageMap: { [key: string]: any } = {
                      '🍲': require('../../assets/images/emojis/slowcooker.png'),
                      '🏃': require('../../assets/images/emojis/hopscotch.png'),
                      '⛹️': require('../../assets/images/emojis/swingset.png'),
                      '🪢': require('../../assets/images/emojis/jumpRope.png'),
                      '🌅': require('../../assets/images/emojis/sunrise.png'),
                      '📦': require('../../assets/images/emojis/bulkSale.png'),
                      '⚖️': require('../../assets/images/emojis/scale.png'),
                      '🎖️': require('../../assets/images/emojis/hallpass.png'),
                    };

                    const imageSource = emojiImageMap[bonus.emoji];

                    return (
                      <View
                        key={index}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {imageSource ? (
                          <Image
                            source={imageSource}
                            style={{
                              width: 24,
                              height: 24,
                              resizeMode: 'contain',
                            }}
                          />
                        ) : (
                          <TextWithEmojis
                            style={styles.slowCookerText}
                            imageSize={24}
                          >
                            {bonus.emoji}
                          </TextWithEmojis>
                        )}
                        <Text style={styles.slowCookerText}>
                          {bonus.name}:{' '}
                          {bonus.multiplier > 1
                            ? `${bonus.multiplier.toFixed(2)}x`
                            : ''}
                          {bonus.flatBonus
                            ? ` +$${bonus.flatBonus.toFixed(2)}`
                            : ''}
                        </Text>
                      </View>
                    );
                  })}
                  {/* Show vacuum sealer penalty if active */}
                  {saleResult.vacuumSealerPenalty < 1 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Image
                        source={require('../../assets/images/emojis/vacuumsealer.png')}
                        style={{
                          width: 24,
                          height: 24,
                          resizeMode: 'contain',
                        }}
                      />
                      <Text style={styles.penaltyText}>
                        Vacuum Sealer: -2 to sale multiplier
                      </Text>
                    </View>
                  )}
                </View>
              </PixelBorder>
            )}

          <View style={styles.sliderSection}>
            <Text style={styles.quantityLabel}>
              {mode === 'Buy' && maxQuantity <= 0
                ? playerBalance !== undefined && playerBalance < candy.cost
                  ? 'Not Enough Money'
                  : availableInventorySpace !== undefined &&
                      availableInventorySpace <= 0
                    ? 'Inventory Full'
                    : 'Cannot Buy'
                : `Quantity: ${quantity} / ${maxQuantity}`}
            </Text>

            {mode === 'Buy' ? (
              maxQuantity > 0 ? (
                <Slider
                  key={`buy-${maxQuantity}`}
                  style={{ width: '100%', height: 50, marginVertical: 2 }}
                  minimumValue={0}
                  maximumValue={maxQuantity}
                  step={1}
                  value={Math.max(0, Math.min(quantity, maxQuantity))}
                  onValueChange={handleSliderChange}
                  onSlidingComplete={handleSliderComplete}
                  minimumTrackTintColor="#ef4444"
                  maximumTrackTintColor="#ccc"
                />
              ) : (
                <Slider
                  key="buy-disabled"
                  style={{ width: '100%', height: 50, marginVertical: 2 }}
                  minimumValue={0}
                  maximumValue={1}
                  step={1}
                  value={0}
                  onValueChange={() => {}}
                  minimumTrackTintColor="#ef4444"
                  maximumTrackTintColor="#ccc"
                  disabled={true}
                />
              )
            ) : (
              maxQuantity > 0 ? (
                <Slider
                  key={`sell-${maxQuantity}`}
                  style={{ width: '100%', height: 50, marginVertical: 2 }}
                  minimumValue={10000}
                  maximumValue={10000 + maxQuantity}
                  step={1}
                  value={10000 + Math.max(0, Math.min(quantity, maxQuantity))}
                  onValueChange={(value) => handleSliderChange(value - 10000)}
                  onSlidingComplete={(value) => handleSliderComplete(value - 10000)}
                  minimumTrackTintColor="#4ade80"
                  maximumTrackTintColor="#ccc"
                />
              ) : (
                <Slider
                  key="sell-disabled"
                  style={{ width: '100%', height: 50, marginVertical: 2 }}
                  minimumValue={10000}
                  maximumValue={10001}
                  step={1}
                  value={10000}
                  onValueChange={() => {}}
                  minimumTrackTintColor="#4ade80"
                  maximumTrackTintColor="#ccc"
                  disabled={true}
                />
              )
            )}
            <View style={styles.tabContainer}>
              <PixelBorder
                borderColor={mode === 'Buy' ? '#cc7a00' : '#e5e7eb'}
                borderWidth={3}
                backgroundColor={mode === 'Buy' ? '#ffcc99' : '#f3f4f6'}
                style={{ flex: 1, marginRight: 6 }}
              >
                <TouchableOpacity
                  style={styles.tab}
                  onPress={() => changeMode('Buy')}
                >
                  <Text style={styles.tabText}>Buy</Text>
                </TouchableOpacity>
              </PixelBorder>
              <PixelBorder
                borderColor={mode === 'Sell' ? '#cc7a00' : '#e5e7eb'}
                borderWidth={3}
                backgroundColor={mode === 'Sell' ? '#ffcc99' : '#f3f4f6'}
                style={{ flex: 1 }}
              >
                <TouchableOpacity
                  style={styles.tab}
                  onPress={() => changeMode('Sell')}
                >
                  <Text style={styles.tabText}>Sell</Text>
                </TouchableOpacity>
              </PixelBorder>
            </View>
            {mode === 'Buy' ? (
              <PixelBorder
                borderColor="#bae6fd"
                borderWidth={2}
                backgroundColor="#f0f9ff"
                innerPadding={0}
              >
                <View style={styles.totalValueContainer}>
                  <Text style={styles.totalValueLabel}>Total Cost:</Text>
                  <Text style={[styles.totalValueAmount, { color: '#ef4444' }]}>
                    ${(quantity * candy.cost).toFixed(2)}
                  </Text>
                </View>
              </PixelBorder>
            ) : (
              <PixelBorder
                borderColor="#bae6fd"
                borderWidth={2}
                backgroundColor="#f0f9ff"
                innerPadding={0}
              >
                <View style={styles.totalValueContainer}>
                  <Text style={styles.totalValueLabel}>Total Value:</Text>
                  <Text style={[styles.totalValueAmount, { color: '#22c55e' }]}>
                    ${pocketValue}
                  </Text>
                </View>
              </PixelBorder>
            )}

            {mode === 'Buy' && maxBuyQuantity === 0 && (
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
          </View>

          <View style={styles.buttonRow}>
            <PressableButton
              onPress={handleClose}
              shadowColor="rgba(185,28,28,1)"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={5}
              elevation={8}
              style={{ flex: 1, marginRight: 8 }}
            >
              <PixelBorder
                borderColor="rgba(185,28,28,1)"
                borderWidth={3}
                backgroundColor="rgba(239,68,68,1)"
                innerPadding={0}
              >
                <View style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </View>
              </PixelBorder>
            </PressableButton>
            <PressableButton
              onPress={handleConfirm}
              shadowColor={buttonBorderColor}
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={5}
              elevation={8}
              style={{ flex: 1 }}
            >
              <View style={{ position: 'relative' }}>
                {mode === 'Sell' && numSparks > 0 && (
                  <SparkEffect numSparks={numSparks} sparkColors={sparkColors} />
                )}
                <PixelBorder
                  borderColor={buttonBorderColor}
                  borderWidth={3}
                  backgroundColor={buttonBackgroundColor}
                  innerPadding={0}
                  style={{ overflow: 'visible' }}
                >
                  <View style={styles.confirmButton}>
                    <Text style={styles.confirmButtonText}>{mode}</Text>
                  </View>
                </PixelBorder>
              </View>
            </PressableButton>
          </View>
        </View>
      </PixelBorder>
    </FastModal>
  );
}

const MemoizedTransactionModal = React.memo(TransactionModal);
export default MemoizedTransactionModal;

const styles = StyleSheet.create({
  modalWrapper: {
    shadowColor: colors.brown.secondary,
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    borderRadius: 30,
    elevation: 8,
    minHeight: 450,
    minWidth: '90%',
  },
  container: {
    padding: 16,
    alignItems: 'stretch',
    minHeight: 450,
    fontFamily: 'PixeloidMono',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: colors.brown.primary, // Dark brown
    textShadow: '1px 1px 0px #e6d4b7',
    fontFamily: 'PixeloidMono',
  },
  priceInfoContainer: {
    padding: 12,
    marginVertical: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  priceLabel: {
    fontSize: 16,
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brown.secondary,
    fontFamily: 'PixeloidMono',
  },
  sliderSection: {
    paddingVertical: 8,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'center',
    color: colors.brown.secondary,
    backgroundColor: '#fff9e6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f4d03f',
    fontFamily: 'PixeloidMono',
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  totalValueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
    marginRight: 8,
  },
  totalValueAmount: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  profitContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  profitLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
    marginRight: 10,
  },
  profitAmount: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  buttonRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 16,
    justifyContent: 'center',
    gap: 10,
  },
  tab: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  tabText: {
    color: colors.brown.secondary,
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
  },
  priceBreakdownContainer: {
    padding: 4,
    marginVertical: 4,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  slowCookerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green.success,
    fontFamily: 'PixeloidMono',
  },
  penaltyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444', // Red color for penalties
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
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brown.secondary,
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
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
  },
  finalPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.green.success,
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
    borderRadius: 12,
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
    color: colors.gray.light,
    fontStyle: 'italic',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'visible',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    zIndex: 10,
  },
});
