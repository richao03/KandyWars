import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import colors from '../../src/constants/colors';
import { JOKER_IDS, findJokerById } from '../../src/constants/jokerIds';
import { useCandySales } from '../../src/hooks/useCandySales';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { scoreboardService } from '../../src/services/firebase';
import { useAppSelector } from '../../src/store/hooks';
import { selectActiveEffects } from '../../src/store/slices/merchantSlice';
import { Candy } from '../../src/types/candy';
import { calculateSaleTotal } from '../../src/utils/saleCalculations';
import { SoundEffects } from '../../src/utils/soundEffects';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
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
}: Props) {
  const [mode, setMode] = useState<'Buy' | 'Sell'>('Buy');
  const [quantity, setQuantity] = useState(1);
  const [isClosing, setIsClosing] = useState(false);
  const { jokers, activeEffects } = useJokers();
  const { getInventoryLimit, inventory } = useInventory();
  const { periodCount } = useGame();

  // Get hall pass modifiers and early sale state from Redux
  const hallPassModifiers = useAppSelector((state) => state.hallPassModifiers);
  const hasEarlySaleToday = useAppSelector(
    (state) => state.candySales.hasEarlySaleToday
  );
  const merchantEffects = useAppSelector(selectActiveEffects);
  const { consecutivePeriodSales, totalCandiesSold } = useCandySales();

  // Clamp maxBuyQuantity and maxSellQuantity to prevent negative values
  // If value is negative, set to 0
  const clampedMaxBuyQuantity = maxBuyQuantity < 0 ? 0 : maxBuyQuantity;
  const clampedMaxSellQuantity = maxSellQuantity < 0 ? 0 : maxSellQuantity;
  const maxQuantity =
    mode === 'Buy' ? clampedMaxBuyQuantity : clampedMaxSellQuantity;

  const inventoryLimit = useMemo(
    () => getInventoryLimit(),
    [getInventoryLimit]
  );

  // Set quantity to max when modal opens
  useEffect(() => {
    if (visible) {
      console.log('isVisible maxQuantity: ', maxQuantity);
      // Set to max quantity for current mode (minimum 1)
      setQuantity(Math.max(1, maxQuantity));
    }
  }, [visible]);

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
    return mode === 'Buy' && timeZoneArbitrageJoker && isMorning;
  }, [mode, timeZoneArbitrageJoker, isMorning]);

  // Check for Sunset Surge joker (afternoon sale bonus)
  const sunsetSurgeJoker = findJokerById(jokers, JOKER_IDS.SUNSET_SURGE);
  const isAfternoon = useMemo(() => {
    const periodWithinDay = periodCount % 8;
    return periodWithinDay >= 6; // Periods 6, 7 are "afternoon"
  }, [periodCount]);

  const qualifiesForAfternoonBonus = useMemo(() => {
    return mode === 'Sell' && sunsetSurgeJoker && isAfternoon;
  }, [mode, sunsetSurgeJoker, isAfternoon]);

  // Check for Bulk Sale joker
  const bulkDiscountJoker = findJokerById(jokers, JOKER_IDS.BULK_SALE);
  const qualifiesForBulkDiscount = useMemo(() => {
    return mode === 'Buy' && bulkDiscountJoker && quantity > inventoryLimit / 2;
  }, [mode, bulkDiscountJoker, quantity, inventoryLimit]);

  // Check for Slow Cooker joker (sell multiplier)
  const slowCookerJoker = findJokerById(jokers, JOKER_IDS.SLOW_COOKER);

  // Calculate periodsHeld for Slow Cooker (resets every day)
  const { periodsHeld, slowCookerMultiplier } = useMemo(() => {
    if (!slowCookerJoker || mode !== 'Sell') {
      return { periodsHeld: 0, slowCookerMultiplier: 1 };
    }
    const inventoryItem = inventory.find((item) => item.name === candy.name);
    const purchasedAtPeriod = inventoryItem?.purchasedAt ?? periodCount;

    // Calculate current day and purchased day (8 periods per day)
    const currentDay = Math.floor(periodCount / 8);
    const purchasedDay = Math.floor(purchasedAtPeriod / 8);

    // If purchased on a different day, reset to current period (day just started)
    const effectivePurchasedPeriod =
      currentDay === purchasedDay
        ? purchasedAtPeriod
        : Math.floor(periodCount / 8) * 8; // Start of current day

    const periods = Math.max(0, periodCount - effectivePurchasedPeriod);
    const multiplier = Math.pow(1.1, periods);
    return { periodsHeld: periods, slowCookerMultiplier: multiplier };
  }, [slowCookerJoker, mode, inventory, candy.name, periodCount]);

  // Calculate final price with discounts/bonuses
  const finalUnitPrice = useMemo(() => {
    // For selling, use the priceBreakdown if available (includes all joker effects)
    if (mode === 'Sell' && priceBreakdown) {
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

  // Calculate joker sell multiplier from effects (Pursuasion, etc.)
  const jokerSellMultiplier = useMemo(() => {
    if (mode === 'Sell' && priceBreakdown?.jokerEffects) {
      let multiplier = 1;

      // Find all active sell_multiplier effects
      priceBreakdown.jokerEffects.forEach((effect) => {
        if (effect.isActive && effect.effectType === 'sell') {
          // Check if this is a multiplier effect (like Pursuasion: ×2)
          const multMatch = effect.effect.match(/×(\d+\.?\d*)/);
          if (multMatch) {
            const mult = parseFloat(multMatch[1]);
            multiplier *= mult;
            console.log(
              `📊 Found ${effect.jokerName} multiplier: ${mult}x (total now: ${multiplier}x)`
            );
          } else if (effect.amount) {
            // Convert percentage bonus to multiplier (33% → 1.33x)
            const percentBonus = effect.amount;
            const mult = 1 + percentBonus / 100;
            multiplier *= mult;
            console.log(
              `📊 Found ${effect.jokerName} bonus: +${percentBonus}% = ${mult}x (total now: ${multiplier}x)`
            );
          }
        }
      });

      return multiplier;
    }
    return 1;
  }, [mode, priceBreakdown]);

  // Calculate all bonuses (only for selling)
  const hallPassBonusTotal = useMemo(() => {
    if (mode === 'Sell' && priceBreakdown?.hallPassEffect) {
      return priceBreakdown.hallPassEffect.bonusAmount * quantity;
    }
    return 0;
  }, [mode, priceBreakdown, quantity]);

  const merchantBonusTotal = useMemo(() => {
    if (mode === 'Sell' && priceBreakdown?.merchantEffect) {
      return priceBreakdown.merchantEffect.bonusAmount * quantity;
    }
    return 0;
  }, [mode, priceBreakdown, quantity]);

  const influencerBonusTotal = useMemo(() => {
    if (mode === 'Sell' && priceBreakdown?.influencerShoutoutEffect) {
      return priceBreakdown.influencerShoutoutEffect.bonusAmount * quantity;
    }
    return 0;
  }, [mode, priceBreakdown, quantity]);

  // Calculate sale result for selling - contains pocket value and bonus breakdown
  const saleResult = useMemo(() => {
    if (mode === 'Sell' && candy.averagePrice !== null) {
      // Use shared calculation function to ensure consistency with actual sale
      return calculateSaleTotal({
        candyName: candy.name,
        basePrice: candy.cost,
        purchasePrice: candy.averagePrice,
        quantity,
        jokers,
        periodCount,
        inventoryLimit: getInventoryLimit(),
        activeEffects,
        hallPassModifiers,
        merchantEffects,
        consecutivePeriodSales: consecutivePeriodSales(),
        totalCandiesSold: totalCandiesSold || 0,
        hasEarlySaleToday,
        inventory,
        initialMultiplier: 1, // Don't include one-time jokers in preview
      });
    }
    return null;
  }, [
    mode,
    candy.name,
    candy.cost,
    candy.averagePrice,
    quantity,
    jokers,
    periodCount,
    getInventoryLimit,
    activeEffects,
    hallPassModifiers,
    merchantEffects,
    consecutivePeriodSales,
    totalCandiesSold,
    hasEarlySaleToday,
    inventory,
  ]);

  // Calculate pocket value from sale result
  const pocketValue = useMemo(() => {
    if (saleResult) {
      return saleResult.totalGain.toFixed(2);
    } else if (mode === 'Sell') {
      // Fallback if no average price (shouldn't happen in sell mode)
      const baseRevenue = candy.cost * quantity;
      return baseRevenue.toFixed(2);
    }

    // For buying
    return (finalUnitPrice * quantity).toFixed(2);
  }, [saleResult, mode, candy.cost, quantity, finalUnitPrice]);

  // Keep per-unit calculations for display purposes
  const hallPassBonusPerUnit = useMemo(() => {
    return quantity > 0 ? hallPassBonusTotal / quantity : 0;
  }, [hallPassBonusTotal, quantity]);

  const merchantBonusPerUnit = useMemo(() => {
    return quantity > 0 ? merchantBonusTotal / quantity : 0;
  }, [merchantBonusTotal, quantity]);

  const influencerBonusPerUnit = useMemo(() => {
    return quantity > 0 ? influencerBonusTotal / quantity : 0;
  }, [influencerBonusTotal, quantity]);

  const pocketFontSizes = useMemo(() => {
    const length = pocketValue.length;
    if (length <= 6) {
      // Small numbers: $100.00
      return { label: 18, amount: 18 };
    } else if (length <= 8) {
      // Medium numbers: $1,000.00
      return { label: 16, amount: 16 };
    } else if (length <= 10) {
      // Large numbers: $10,000.00
      return { label: 16, amount: 16 };
    } else {
      // Very large nuers: $100,000.00+
      return { label: 16, amount: 16 };
    }
  }, [pocketValue]);

  const handleConfirm = () => {
    if (quantity > 0 && quantity <= maxQuantity) {
      // Mark modal as closing to prevent slider events
      setIsClosing(true);

      // Play pop sound when confirming transaction
      SoundEffects.playRandomPop();

      // Track highest single sale for SELL transactions
      if (mode === 'Sell' && priceBreakdown) {
        const saleRevenue = priceBreakdown.finalPrice * quantity;
        console.log('💰 Sale revenue:', saleRevenue);

        const userObject = scoreboardService.getCachedUserObject();
        if (!userObject) {
          console.warn(
            '⚠️ User object not cached, cannot track highest single sale'
          );
        } else if (saleRevenue > userObject.highestSingleSale) {
          console.log(
            '🎉 New highest single sale!',
            saleRevenue,
            'Previous:',
            userObject.highestSingleSale
          );
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

  // Calculate number of sparks based on transaction value - dramatic tiers
  const numSparks = useMemo(() => {
    if (mode === 'Sell') {
      const totalValue = parseFloat(pocketValue);

      // Dramatic tiers with exponential growth
      if (totalValue < 100) return 0;
      if (totalValue < 500) return 3; // $100-$499: 6 particles
      // $2000-$4999: 18 particles (+29%)
      if (totalValue < 1000) return 5;
      if (totalValue < 5000) return 7;
      if (totalValue < 10000) return 12; // $5000-$9999: 21 particles (+17%)
      if (totalValue < 30000) return 20;
      return 24; // $10000+: 24 particles (max)
    }
    return 0;
  }, [mode, pocketValue]);

  // Calculate border color based on profit tiers - green to blue gradient
  const buttonBorderColor = useMemo(() => {
    if (mode === 'Sell') {
      const totalValue = parseFloat(pocketValue);

      if (totalValue >= 20000) return '#0066ff'; // Bright blue
      if (totalValue >= 15000) return '#00cccc'; // Cyan
      if (totalValue >= 10000) return '#00ffcc'; // Aquamarine
      if (totalValue >= 5000) return '#00ff99'; // Spring green
      if (totalValue >= 2000) return '#2ecc71'; // Emerald
      if (totalValue >= 1000) return '#4caf50'; // Material green
      return 'rgba(123,169,101,1)'; // Button border green
    }
    return 'rgba(123,169,101,1)';
  }, [mode, pocketValue]);

  const buttonBackgroundColor = useMemo(() => {
    if (mode === 'Sell') {
      const totalValue = parseFloat(pocketValue);

      if (totalValue >= 20000) return 'rgba(0, 102, 255, 0.3)'; // Blue tint
      if (totalValue >= 15000) return 'rgba(0, 204, 204, 0.3)'; // Cyan tint
      if (totalValue >= 10000) return 'rgba(0, 255, 204, 0.3)'; // Aquamarine tint
      if (totalValue >= 5000) return 'rgba(0, 255, 153, 0.3)'; // Spring green tint
      if (totalValue >= 2000) return 'rgba(46, 204, 113, 0.3)'; // Emerald tint
      if (totalValue >= 1000) return 'rgba(76, 175, 80, 0.3)'; // Material green tint
      return 'rgba(154,193,118,1)'; // Default button green
    }
    return 'rgba(154,193,118,1)';
  }, [mode, pocketValue]);

  // Calculate color palette based on profit tiers - green to blue gradient
  const sparkColors = useMemo(() => {
    if (mode === 'Sell') {
      const totalValue = parseFloat(pocketValue);

      if (totalValue >= 20000) {
        // $20000+: Deep vibrant blues
        return [
          '#0066ff', // Bright blue
          '#0080ff', // Azure
          '#0099ff', // Sky blue
          '#00b3ff', // Light blue
          '#1e90ff', // Dodger blue
          '#4169e1', // Royal blue
          '#5a7fff', // Lighter royal blue
          '#00bfff', // Deep sky blue
        ];
      } else if (totalValue >= 15000) {
        // $15000-$19999: Blue-cyan range
        return [
          '#00cccc', // Cyan
          '#00e6e6', // Bright cyan
          '#00d9ff', // Vivid cyan
          '#00c3ff', // Cyan-blue
          '#00b0ff', // Light blue
          '#009fff', // Sky cyan
          '#1e90ff', // Dodger blue
          '#4db8ff', // Light dodger blue
        ];
      } else if (totalValue >= 10000) {
        // $10000-$14999: Cyan-teal range
        return [
          '#00ffcc', // Aquamarine
          '#00ffb3', // Bright aqua
          '#00e6cc', // Turquoise
          '#00d9e6', // Cyan-teal
          '#00cccc', // Cyan
          '#00b8d4', // Dark cyan
          '#26c6da', // Light cyan
          '#4dd0e1', // Bright turquoise
        ];
      } else if (totalValue >= 5000) {
        // $5000-$9999: Teal-green range
        return [
          '#00ff99', // Spring green
          '#00e68a', // Mint green
          '#00cc88', // Emerald green
          '#00b894', // Teal green
          '#1abc9c', // Turquoise
          '#16a085', // Dark turquoise
          '#26d9a0', // Sea green
          '#2ecc71', // Bright emerald
        ];
      } else if (totalValue >= 2000) {
        // $2000-$4999: Green-teal transition
        return [
          '#3dff88', // Bright mint
          '#2ecc71', // Emerald
          '#27ae60', // Nephritis
          '#16a085', // Dark turquoise
          '#1abc9c', // Turquoise
          '#20c997', // Teal
        ];
      } else if (totalValue >= 1000) {
        // $1000-$1999: Bright greens
        return [
          '#4caf50', // Material green
          '#43a047', // Forest green
          '#388e3c', // Deep green
          '#2e7d32', // Dark green
        ];
      } else if (totalValue >= 500) {
        // $500-$999: Medium greens (starting point)
        return [
          '#5ced00', // Vivid green
          '#4caf50', // Material green
          '#43a047', // Forest green
        ];
      } else {
        // $100-$499: Base button greens
        return [
          'rgba(123,169,101,1)', // Button border green
          '#7ba965', // Slightly brighter
          '#6a9a54', // Forest tint
        ];
      }
    }
    return ['rgba(123,169,101,1)', '#7ba965', '#6a9a54'];
  }, [mode, pocketValue]);

  // Spark/particle animation for sell button - dynamic number based on value (max 24 for performance)
  const spark0Y = useSharedValue(0);
  const spark0X = useSharedValue(0);
  const spark0Opacity = useSharedValue(0);
  const spark0Scale = useSharedValue(1);
  const spark0ColorProgress = useSharedValue(0);

  const spark1Y = useSharedValue(0);
  const spark1X = useSharedValue(0);
  const spark1Opacity = useSharedValue(0);
  const spark1Scale = useSharedValue(1);
  const spark1ColorProgress = useSharedValue(0);

  const spark2Y = useSharedValue(0);
  const spark2X = useSharedValue(0);
  const spark2Opacity = useSharedValue(0);
  const spark2Scale = useSharedValue(1);
  const spark2ColorProgress = useSharedValue(0);

  const spark3Y = useSharedValue(0);
  const spark3X = useSharedValue(0);
  const spark3Opacity = useSharedValue(0);
  const spark3Scale = useSharedValue(1);
  const spark3ColorProgress = useSharedValue(0);

  const spark4Y = useSharedValue(0);
  const spark4X = useSharedValue(0);
  const spark4Opacity = useSharedValue(0);
  const spark4Scale = useSharedValue(1);
  const spark4ColorProgress = useSharedValue(0);

  const spark5Y = useSharedValue(0);
  const spark5X = useSharedValue(0);
  const spark5Opacity = useSharedValue(0);
  const spark5Scale = useSharedValue(1);
  const spark5ColorProgress = useSharedValue(0);

  const spark6Y = useSharedValue(0);
  const spark6X = useSharedValue(0);
  const spark6Opacity = useSharedValue(0);
  const spark6Scale = useSharedValue(1);
  const spark6ColorProgress = useSharedValue(0);

  const spark7Y = useSharedValue(0);
  const spark7X = useSharedValue(0);
  const spark7Opacity = useSharedValue(0);
  const spark7Scale = useSharedValue(1);
  const spark7ColorProgress = useSharedValue(0);

  const spark8Y = useSharedValue(0);
  const spark8X = useSharedValue(0);
  const spark8Opacity = useSharedValue(0);
  const spark8Scale = useSharedValue(1);
  const spark8ColorProgress = useSharedValue(0);

  const spark9Y = useSharedValue(0);
  const spark9X = useSharedValue(0);
  const spark9Opacity = useSharedValue(0);
  const spark9Scale = useSharedValue(1);
  const spark9ColorProgress = useSharedValue(0);

  const spark10Y = useSharedValue(0);
  const spark10X = useSharedValue(0);
  const spark10Opacity = useSharedValue(0);
  const spark10Scale = useSharedValue(1);
  const spark10ColorProgress = useSharedValue(0);

  const spark11Y = useSharedValue(0);
  const spark11X = useSharedValue(0);
  const spark11Opacity = useSharedValue(0);
  const spark11Scale = useSharedValue(1);
  const spark11ColorProgress = useSharedValue(0);

  const spark12Y = useSharedValue(0);
  const spark12X = useSharedValue(0);
  const spark12Opacity = useSharedValue(0);
  const spark12Scale = useSharedValue(1);
  const spark12ColorProgress = useSharedValue(0);

  const spark13Y = useSharedValue(0);
  const spark13X = useSharedValue(0);
  const spark13Opacity = useSharedValue(0);
  const spark13Scale = useSharedValue(1);
  const spark13ColorProgress = useSharedValue(0);

  const spark14Y = useSharedValue(0);
  const spark14X = useSharedValue(0);
  const spark14Opacity = useSharedValue(0);
  const spark14Scale = useSharedValue(1);
  const spark14ColorProgress = useSharedValue(0);

  const spark15Y = useSharedValue(0);
  const spark15X = useSharedValue(0);
  const spark15Opacity = useSharedValue(0);
  const spark15Scale = useSharedValue(1);
  const spark15ColorProgress = useSharedValue(0);

  const spark16Y = useSharedValue(0);
  const spark16X = useSharedValue(0);
  const spark16Opacity = useSharedValue(0);
  const spark16Scale = useSharedValue(1);
  const spark16ColorProgress = useSharedValue(0);

  const spark17Y = useSharedValue(0);
  const spark17X = useSharedValue(0);
  const spark17Opacity = useSharedValue(0);
  const spark17Scale = useSharedValue(1);
  const spark17ColorProgress = useSharedValue(0);

  const spark18Y = useSharedValue(0);
  const spark18X = useSharedValue(0);
  const spark18Opacity = useSharedValue(0);
  const spark18Scale = useSharedValue(1);
  const spark18ColorProgress = useSharedValue(0);

  const spark19Y = useSharedValue(0);
  const spark19X = useSharedValue(0);
  const spark19Opacity = useSharedValue(0);
  const spark19Scale = useSharedValue(1);
  const spark19ColorProgress = useSharedValue(0);

  const spark20Y = useSharedValue(0);
  const spark20X = useSharedValue(0);
  const spark20Opacity = useSharedValue(0);
  const spark20Scale = useSharedValue(1);
  const spark20ColorProgress = useSharedValue(0);

  const spark21Y = useSharedValue(0);
  const spark21X = useSharedValue(0);
  const spark21Opacity = useSharedValue(0);
  const spark21Scale = useSharedValue(1);
  const spark21ColorProgress = useSharedValue(0);

  const spark22Y = useSharedValue(0);
  const spark22X = useSharedValue(0);
  const spark22Opacity = useSharedValue(0);
  const spark22Scale = useSharedValue(1);
  const spark22ColorProgress = useSharedValue(0);

  const spark23Y = useSharedValue(0);
  const spark23X = useSharedValue(0);
  const spark23Opacity = useSharedValue(0);
  const spark23Scale = useSharedValue(1);
  const spark23ColorProgress = useSharedValue(0);

  // Group into arrays for easier iteration
  const sparkYValues = [
    spark0Y,
    spark1Y,
    spark2Y,
    spark3Y,
    spark4Y,
    spark5Y,
    spark6Y,
    spark7Y,
    spark8Y,
    spark9Y,
    spark10Y,
    spark11Y,
    spark12Y,
    spark13Y,
    spark14Y,
    spark15Y,
    spark16Y,
    spark17Y,
    spark18Y,
    spark19Y,
    spark20Y,
    spark21Y,
    spark22Y,
    spark23Y,
  ];
  const sparkXValues = [
    spark0X,
    spark1X,
    spark2X,
    spark3X,
    spark4X,
    spark5X,
    spark6X,
    spark7X,
    spark8X,
    spark9X,
    spark10X,
    spark11X,
    spark12X,
    spark13X,
    spark14X,
    spark15X,
    spark16X,
    spark17X,
    spark18X,
    spark19X,
    spark20X,
    spark21X,
    spark22X,
    spark23X,
  ];
  const sparkOpacityValues = [
    spark0Opacity,
    spark1Opacity,
    spark2Opacity,
    spark3Opacity,
    spark4Opacity,
    spark5Opacity,
    spark6Opacity,
    spark7Opacity,
    spark8Opacity,
    spark9Opacity,
    spark10Opacity,
    spark11Opacity,
    spark12Opacity,
    spark13Opacity,
    spark14Opacity,
    spark15Opacity,
    spark16Opacity,
    spark17Opacity,
    spark18Opacity,
    spark19Opacity,
    spark20Opacity,
    spark21Opacity,
    spark22Opacity,
    spark23Opacity,
  ];
  const sparkScaleValues = [
    spark0Scale,
    spark1Scale,
    spark2Scale,
    spark3Scale,
    spark4Scale,
    spark5Scale,
    spark6Scale,
    spark7Scale,
    spark8Scale,
    spark9Scale,
    spark10Scale,
    spark11Scale,
    spark12Scale,
    spark13Scale,
    spark14Scale,
    spark15Scale,
    spark16Scale,
    spark17Scale,
    spark18Scale,
    spark19Scale,
    spark20Scale,
    spark21Scale,
    spark22Scale,
    spark23Scale,
  ];
  const sparkColorProgress = [
    spark0ColorProgress,
    spark1ColorProgress,
    spark2ColorProgress,
    spark3ColorProgress,
    spark4ColorProgress,
    spark5ColorProgress,
    spark6ColorProgress,
    spark7ColorProgress,
    spark8ColorProgress,
    spark9ColorProgress,
    spark10ColorProgress,
    spark11ColorProgress,
    spark12ColorProgress,
    spark13ColorProgress,
    spark14ColorProgress,
    spark15ColorProgress,
    spark16ColorProgress,
    spark17ColorProgress,
    spark18ColorProgress,
    spark19ColorProgress,
    spark20ColorProgress,
    spark21ColorProgress,
    spark22ColorProgress,
    spark23ColorProgress,
  ];

  useEffect(() => {
    if (mode === 'Sell' && numSparks > 0) {
      // Animate only the number of sparks based on value
      sparkYValues.forEach((sparkY, index) => {
        if (index < numSparks) {
          const delay = index * 10; // Stagger each spark by 10ms (faster spawning)
          const duration = 700 + (index % 5) * 50;
          const riseHeight = -36 - (index % 7) * 4; // Vary height between -36 and -60 (2x higher)

          sparkY.value = withRepeat(
            withSequence(
              withTiming(0, { duration: delay }),
              withTiming(riseHeight, {
                duration: duration,
                easing: Easing.out(Easing.ease),
              }),
              withTiming(riseHeight, { duration: 0 }) // Stay at top
            ),
            -1,
            false
          );
        } else {
          // Reset unused sparks to invisible
          sparkY.value = 0;
        }
      });

      // Add wavy horizontal movement (fire-like)
      sparkXValues.forEach((sparkX, index) => {
        if (index < numSparks) {
          const delay = index * 10;
          const duration = 700 + (index % 5) * 50;
          const waveAmplitude = 8 + (index % 3) * 3; // Vary wave size between 8-14
          const waveDirection = index % 2 === 0 ? 1 : -1; // Alternate left/right

          sparkX.value = withRepeat(
            withSequence(
              withTiming(0, { duration: delay }),
              withTiming(waveDirection * waveAmplitude, {
                duration: duration / 2,
                easing: Easing.inOut(Easing.ease),
              }),
              withTiming(-waveDirection * waveAmplitude, {
                duration: duration / 2,
                easing: Easing.inOut(Easing.ease),
              }),
              withTiming(0, { duration: 0 }) // Reset
            ),
            -1,
            false
          );
        } else {
          sparkX.value = 0;
        }
      });

      sparkOpacityValues.forEach((opacity, index) => {
        if (index < numSparks) {
          const delay = index * 10;
          const duration = 700 + (index % 5) * 50;

          opacity.value = withRepeat(
            withSequence(
              withTiming(0, { duration: delay }),
              withTiming(1, { duration: 150 }),
              withTiming(0, { duration: duration - 150 }),
              withTiming(0, { duration: 0 }) // Stay invisible
            ),
            -1,
            false
          );
        } else {
          // Keep unused sparks invisible
          opacity.value = 0;
        }
      });

      sparkScaleValues.forEach((scale, index) => {
        if (index < numSparks) {
          const delay = index * 10;
          const duration = 700 + (index % 5) * 50;

          scale.value = withRepeat(
            withSequence(
              withTiming(1, { duration: delay + 200 }),
              withTiming(0.5, { duration: duration - 200 }),
              withTiming(0.5, { duration: 0 }) // Stay at final scale
            ),
            -1,
            false
          );
        } else {
          scale.value = 0;
        }
      });

      // Animate color transition from button border color to final colors
      sparkColorProgress.forEach((colorProgress, index) => {
        if (index < numSparks) {
          const delay = index * 10;
          const duration = 700 + (index % 5) * 50;

          colorProgress.value = withRepeat(
            withSequence(
              withTiming(0, { duration: delay }), // Start with button border color
              withTiming(1, {
                duration: duration,
                easing: Easing.out(Easing.ease),
              }), // Transition to final color
              withTiming(1, { duration: 0 }) // Stay at final color
            ),
            -1,
            false
          );
        } else {
          colorProgress.value = 0;
        }
      });
    } else {
      // Reset all sparks when not in sell mode
      sparkYValues.forEach((sparkY) => (sparkY.value = 0));
      sparkXValues.forEach((sparkX) => (sparkX.value = 0));
      sparkOpacityValues.forEach((opacity) => (opacity.value = 0));
      sparkScaleValues.forEach((scale) => (scale.value = 0));
      sparkColorProgress.forEach((colorProgress) => (colorProgress.value = 0));
    }
  }, [mode, numSparks]);

  // Create animated styles for all sparks with wavy movement - must be at top level
  const animatedSpark0 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark0Y.value },
      { translateX: spark0X.value },
      { scale: spark0Scale.value },
    ],
    opacity: spark0Opacity.value,
  }));
  const animatedSpark1 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark1Y.value },
      { translateX: spark1X.value },
      { scale: spark1Scale.value },
    ],
    opacity: spark1Opacity.value,
  }));
  const animatedSpark2 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark2Y.value },
      { translateX: spark2X.value },
      { scale: spark2Scale.value },
    ],
    opacity: spark2Opacity.value,
  }));
  const animatedSpark3 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark3Y.value },
      { translateX: spark3X.value },
      { scale: spark3Scale.value },
    ],
    opacity: spark3Opacity.value,
  }));
  const animatedSpark4 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark4Y.value },
      { translateX: spark4X.value },
      { scale: spark4Scale.value },
    ],
    opacity: spark4Opacity.value,
  }));
  const animatedSpark5 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark5Y.value },
      { translateX: spark5X.value },
      { scale: spark5Scale.value },
    ],
    opacity: spark5Opacity.value,
  }));
  const animatedSpark6 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark6Y.value },
      { translateX: spark6X.value },
      { scale: spark6Scale.value },
    ],
    opacity: spark6Opacity.value,
  }));
  const animatedSpark7 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark7Y.value },
      { translateX: spark7X.value },
      { scale: spark7Scale.value },
    ],
    opacity: spark7Opacity.value,
  }));
  const animatedSpark8 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark8Y.value },
      { translateX: spark8X.value },
      { scale: spark8Scale.value },
    ],
    opacity: spark8Opacity.value,
  }));
  const animatedSpark9 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark9Y.value },
      { translateX: spark9X.value },
      { scale: spark9Scale.value },
    ],
    opacity: spark9Opacity.value,
  }));
  const animatedSpark10 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark10Y.value },
      { translateX: spark10X.value },
      { scale: spark10Scale.value },
    ],
    opacity: spark10Opacity.value,
  }));
  const animatedSpark11 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark11Y.value },
      { translateX: spark11X.value },
      { scale: spark11Scale.value },
    ],
    opacity: spark11Opacity.value,
  }));
  const animatedSpark12 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark12Y.value },
      { translateX: spark12X.value },
      { scale: spark12Scale.value },
    ],
    opacity: spark12Opacity.value,
  }));
  const animatedSpark13 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark13Y.value },
      { translateX: spark13X.value },
      { scale: spark13Scale.value },
    ],
    opacity: spark13Opacity.value,
  }));
  const animatedSpark14 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark14Y.value },
      { translateX: spark14X.value },
      { scale: spark14Scale.value },
    ],
    opacity: spark14Opacity.value,
  }));
  const animatedSpark15 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark15Y.value },
      { translateX: spark15X.value },
      { scale: spark15Scale.value },
    ],
    opacity: spark15Opacity.value,
  }));
  const animatedSpark16 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark16Y.value },
      { translateX: spark16X.value },
      { scale: spark16Scale.value },
    ],
    opacity: spark16Opacity.value,
  }));
  const animatedSpark17 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark17Y.value },
      { translateX: spark17X.value },
      { scale: spark17Scale.value },
    ],
    opacity: spark17Opacity.value,
  }));
  const animatedSpark18 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark18Y.value },
      { translateX: spark18X.value },
      { scale: spark18Scale.value },
    ],
    opacity: spark18Opacity.value,
  }));
  const animatedSpark19 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark19Y.value },
      { translateX: spark19X.value },
      { scale: spark19Scale.value },
    ],
    opacity: spark19Opacity.value,
  }));
  const animatedSpark20 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark20Y.value },
      { translateX: spark20X.value },
      { scale: spark20Scale.value },
    ],
    opacity: spark20Opacity.value,
  }));
  const animatedSpark21 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark21Y.value },
      { translateX: spark21X.value },
      { scale: spark21Scale.value },
    ],
    opacity: spark21Opacity.value,
  }));
  const animatedSpark22 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark22Y.value },
      { translateX: spark22X.value },
      { scale: spark22Scale.value },
    ],
    opacity: spark22Opacity.value,
  }));
  const animatedSpark23 = useAnimatedStyle(() => ({
    transform: [
      { translateY: spark23Y.value },
      { translateX: spark23X.value },
      { scale: spark23Scale.value },
    ],
    opacity: spark23Opacity.value,
  }));

  const animatedSparkStyles = [
    animatedSpark0,
    animatedSpark1,
    animatedSpark2,
    animatedSpark3,
    animatedSpark4,
    animatedSpark5,
    animatedSpark6,
    animatedSpark7,
    animatedSpark8,
    animatedSpark9,
    animatedSpark10,
    animatedSpark11,
    animatedSpark12,
    animatedSpark13,
    animatedSpark14,
    animatedSpark15,
    animatedSpark16,
    animatedSpark17,
    animatedSpark18,
    animatedSpark19,
    animatedSpark20,
    animatedSpark21,
    animatedSpark22,
    animatedSpark23,
  ];

  // Create animated color styles for all sparks - text color only, no background
  const animatedColor0 = useAnimatedStyle(() => {
    const progress = spark0ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[0 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor1 = useAnimatedStyle(() => {
    const progress = spark1ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[1 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor2 = useAnimatedStyle(() => {
    const progress = spark2ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[2 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor3 = useAnimatedStyle(() => {
    const progress = spark3ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[3 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor4 = useAnimatedStyle(() => {
    const progress = spark4ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[4 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor5 = useAnimatedStyle(() => {
    const progress = spark5ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[5 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor6 = useAnimatedStyle(() => {
    const progress = spark6ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[6 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor7 = useAnimatedStyle(() => {
    const progress = spark7ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[7 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor8 = useAnimatedStyle(() => {
    const progress = spark8ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[8 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor9 = useAnimatedStyle(() => {
    const progress = spark9ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[9 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor10 = useAnimatedStyle(() => {
    const progress = spark10ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[10 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor11 = useAnimatedStyle(() => {
    const progress = spark11ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[11 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor12 = useAnimatedStyle(() => {
    const progress = spark12ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[12 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor13 = useAnimatedStyle(() => {
    const progress = spark13ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[13 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor14 = useAnimatedStyle(() => {
    const progress = spark14ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[14 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor15 = useAnimatedStyle(() => {
    const progress = spark15ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[15 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor16 = useAnimatedStyle(() => {
    const progress = spark16ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[16 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor17 = useAnimatedStyle(() => {
    const progress = spark17ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[17 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor18 = useAnimatedStyle(() => {
    const progress = spark18ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[18 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor19 = useAnimatedStyle(() => {
    const progress = spark19ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[19 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor20 = useAnimatedStyle(() => {
    const progress = spark20ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[20 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor21 = useAnimatedStyle(() => {
    const progress = spark21ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[21 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor22 = useAnimatedStyle(() => {
    const progress = spark22ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[22 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });
  const animatedColor23 = useAnimatedStyle(() => {
    const progress = spark23ColorProgress.value;
    const buttonBorderColor = 'rgba(123,169,101,1)';
    const finalColor = sparkColors[23 % sparkColors.length];
    return { color: progress < 0.3 ? buttonBorderColor : finalColor };
  });

  const animatedSparkColorStyles = [
    animatedColor0,
    animatedColor1,
    animatedColor2,
    animatedColor3,
    animatedColor4,
    animatedColor5,
    animatedColor6,
    animatedColor7,
    animatedColor8,
    animatedColor9,
    animatedColor10,
    animatedColor11,
    animatedColor12,
    animatedColor13,
    animatedColor14,
    animatedColor15,
    animatedColor16,
    animatedColor17,
    animatedColor18,
    animatedColor19,
    animatedColor20,
    animatedColor21,
    animatedColor22,
    animatedColor23,
  ];

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

          {/* Buy Mode Discounts */}
          {mode === 'Buy' &&
            (qualifiesForMorningDiscount || qualifiesForBulkDiscount) && (
              <PixelBorder
                borderColor="#fde047"
                borderWidth={3}
                backgroundColor="#fef3c7"
                innerPadding={0}
              >
                <View style={styles.priceBreakdownContainer}>
                  {qualifiesForMorningDiscount && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <TextWithEmojis
                        style={styles.slowCookerText}
                        imageSize={24}
                      >
                        ⏰
                      </TextWithEmojis>
                      <Text style={styles.slowCookerText}>
                        Time Zone Arbitrage (10% off): -$
                        {(quantity * candy.cost * 0.1).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {qualifiesForBulkDiscount && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <TextWithEmojis
                        style={styles.slowCookerText}
                        imageSize={24}
                      >
                        🛒
                      </TextWithEmojis>
                      <Text style={styles.slowCookerText}>
                        Bulk Sale (10% off): -$
                        {(
                          quantity *
                          (qualifiesForMorningDiscount
                            ? candy.cost * 0.9
                            : candy.cost) *
                          0.1
                        ).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </PixelBorder>
            )}

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
                  {saleResult.bonusBreakdown.map((bonus, index) => {
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
                        Vacuum Sealer: -50% profit
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
                {mode === 'Sell' && (
                  <View style={styles.sparkContainerBehind}>
                    {animatedSparkStyles.map((animatedStyle, index) => {
                      if (index >= numSparks) return null; // Don't render unused particles

                      // Evenly space particles across the button width
                      const spacing = 100 / (numSparks + 1);
                      const leftPosition = `${spacing * (index + 1)}%`;
                      const sizes = [14, 16, 18, 20]; // Larger, legible $ signs
                      const size = sizes[index % sizes.length];

                      return (
                        <Animated.Text
                          key={index}
                          style={[
                            styles.sparkText,
                            {
                              left: leftPosition,
                              fontSize: size,
                            },
                            animatedStyle,
                            animatedSparkColorStyles[index],
                          ]}
                        >
                          $
                        </Animated.Text>
                      );
                    })}
                  </View>
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
  sparkContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  sparkContainerBehind: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    pointerEvents: 'none',
    zIndex: -1,
  },
  spark: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 0, // Square pixels
    bottom: 0,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  sparkText: {
    position: 'absolute',
    bottom: 0,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
});
