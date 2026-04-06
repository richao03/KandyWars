import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated as RNAnimated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../src/constants/colors';
import { scoreboardService } from '../../src/services/firebase';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import {
  advanceTutorial,
  selectTutorialStep,
} from '../../src/store/slices/tutorialSlice';
import { Candy } from '../../src/types/candy';
import { MerchantUtils } from '../../src/utils/merchantUtils';
import { calculateSaleTotal } from '../../src/utils/saleCalculations';
import { SoundEffects } from '../../src/utils/soundEffects';
import { formatCurrency } from '../../src/utils/priceUtils';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import SparkEffect from './SparkEffect';
import TextWithEmojis from './TextWithEmojis';
import type { SaleInputs } from './TransactionModalManager';

// Joker icon lookup by name — matches StatusIndicators.tsx
const JOKER_ICON_BY_NAME: Record<string, any> = {
  'Flip Artist': require('../../assets/images/emojis/bullseye.png'),
  'Combo Platter': require('../../assets/images/emojis/computer.png'),
  'Bulk Empire': require('../../assets/images/emojis/slowcooker.png'),
  'Cocoa Futures': require('../../assets/images/emojis/chocolate.png'),
  'Bear Market': require('../../assets/images/emojis/priceCrash.png'),
  'Hard Knocks': require('../../assets/images/emojis/diamondHand.png'),
  'Sour Logic': require('../../assets/images/emojis/magic.png'),
  'Double Dutch': require('../../assets/images/emojis/jumpRope.png'),
  'Tropical Import': require('../../assets/images/emojis/clock.png'),
  'Even Stevens': require('../../assets/images/emojis/scale.png'),
  'Odd Todd': require('../../assets/images/emojis/theater.png'),
  'Golden Hour': require('../../assets/images/emojis/sunrise.png'),
  Pursuasion: require('../../assets/images/emojis/talkingHead.png'),
  'Vacuum Sealer': require('../../assets/images/emojis/vacuumsealer.png'),
  'Early Bird': require('../../assets/images/emojis/sunrise.png'),
  'Bulk Discount': require('../../assets/images/emojis/bulkSale.png'),
  Underdog: require('../../assets/images/emojis/gym.png'),
  'Variety Pack': require('../../assets/images/emojis/coin.png'),
  'Broke and Hungry': require('../../assets/images/emojis/priceCrash.png'),
  'Influencer Shoutout': require('../../assets/images/emojis/talkingHead.png'),
  'Hall Pass': require('../../assets/images/emojis/hallpass.png'),
};

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

  // Scoring animation state
  const [scoringActive, setScoringActive] = useState(false);
  const [scoringStep, setScoringStep] = useState(-1); // -1 = not started, 0+ = current bonus index
  const [animatedProfit, setAnimatedProfit] = useState(0);
  const [animatedMult, setAnimatedMult] = useState(1);
  const [scoringDone, setScoringDone] = useState(false);
  const scoringFlash = useRef(new RNAnimated.Value(0)).current;
  const pendingConfirmRef = useRef<(() => void) | null>(null);

  // Tutorial
  const tutorialStep = useAppSelector(selectTutorialStep);
  const bulkEmpireStacks = useAppSelector((state: any) => state.game?.bulkEmpireStacks ?? 0);
  const tutorialDispatch = useAppDispatch();
  const isTutorialModal = tutorialStep === 4 || tutorialStep === 7;
  const dimOpacity = isTutorialModal ? 0.25 : 1;

  // Read from snapshotted saleInputs prop (captured when modal opens) — no Redux subscriptions
  const jokers = saleInputs?.jokers ?? [];
  const activeEffects = saleInputs?.activeEffects ?? [];
  const computedInventoryLimit = saleInputs?.computedInventoryLimit ?? 30;
  const hallPassModifiers = saleInputs?.hallPassModifiers ?? {
    inventoryBonusSlots: 0,
    salePriceBonusPercent: 0,
  };
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
  }, [
    computedInventoryLimit,
    hallPassModifiers.inventoryBonusSlots,
    merchantEffects,
  ]);

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

  // Set quantity to max when modal opens; auto-switch to sell for tutorial step 7
  useEffect(() => {
    if (visible) {
      if (__DEV__) console.log('isVisible maxQuantity: ', maxQuantity);
      // Tutorial step 7: auto-switch to sell mode
      if (tutorialStep === 7) {
        setMode('Sell');
        setQuantity(Math.max(1, clampedMaxSellQuantity));
      } else {
        setQuantity(Math.max(1, maxQuantity));
      }
    }
  }, [visible]);

  const finalUnitPrice =
    mode === 'Sell' && priceBreakdown ? priceBreakdown.finalPrice : candy.cost;

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
        bulkEmpireStacks,
        inventory: saleInputs?.inventory ?? [],
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
    ? formatCurrency(saleResult.totalGain)
    : mode === 'Sell'
      ? formatCurrency(candy.cost * quantity)
      : formatCurrency(finalUnitPrice * quantity);

  // Build ordered scoring steps: boosts first, then mults
  const scoringSteps = useMemo(() => {
    if (!saleResult) return [];
    const boosts = saleResult.bonusBreakdown
      .filter((b) => b.flatBonus && b.flatBonus > 0)
      .map((b) => ({ ...b, bucket: 'boost' as const }));
    const mults = saleResult.bonusBreakdown
      .filter((b) => b.multiplier > 1 && !b.flatBonus)
      .map((b) => ({ ...b, bucket: 'mult' as const }));
    return [...boosts, ...mults];
  }, [saleResult]);

  // Run the scoring animation sequence
  const runScoringAnimation = useCallback(() => {
    if (!saleResult || scoringSteps.length === 0) {
      pendingConfirmRef.current?.();
      pendingConfirmRef.current = null;
      return;
    }

    const baseProfit = saleResult.totalProfit;
    setScoringActive(true);
    setScoringDone(false);
    setAnimatedProfit(baseProfit);
    setAnimatedMult(1);
    setScoringStep(-1);

    let currentProfit = baseProfit;
    let currentMult = 1;
    let step = 0;

    const animate = () => {
      if (step >= scoringSteps.length) {
        setScoringDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          setScoringActive(false);
          setScoringStep(-1);
          pendingConfirmRef.current?.();
          pendingConfirmRef.current = null;
        }, 600);
        return;
      }

      const bonus = scoringSteps[step];
      setScoringStep(step);

      scoringFlash.setValue(1);
      RNAnimated.timing(scoringFlash, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (bonus.bucket === 'boost') {
        currentProfit += bonus.flatBonus ?? 0;
        setAnimatedProfit(currentProfit);
      } else {
        currentMult += (bonus.multiplier - 1);
        setAnimatedMult(currentMult);
      }

      step++;
      setTimeout(animate, 300);
    };

    setTimeout(animate, 200);
  }, [saleResult, scoringSteps, scoringFlash]);

  const doConfirm = useCallback(() => {
    setIsClosing(true);
    SoundEffects.playRandomPop();

    if (mode === 'Sell' && priceBreakdown) {
      const saleRevenue = priceBreakdown.finalPrice * quantity;
      const userObject = scoreboardService.getCachedUserObject();
      if (userObject && saleRevenue > userObject.highestSingleSale) {
        scoreboardService.updateLocalUserObject({ highestSingleSale: saleRevenue });
      }
    }

    onConfirm(quantity, mode.toLowerCase() as 'buy' | 'sell');

    if (tutorialStep === 4 || tutorialStep === 7) {
      tutorialDispatch(advanceTutorial());
    }
  }, [mode, quantity, priceBreakdown, onConfirm, tutorialStep, tutorialDispatch]);

  const handleConfirm = () => {
    if (quantity > 0 && quantity <= maxQuantity) {
      // For sells with bonuses, play scoring animation first
      if (mode === 'Sell' && scoringSteps.length > 0 && !scoringActive) {
        pendingConfirmRef.current = doConfirm;
        runScoringAnimation();
        return;
      }
      doConfirm();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    onClose();
  };

  // Reset state when modal visibility changes
  useEffect(() => {
    if (visible) {
      setIsClosing(false);
      setScoringActive(false);
      setScoringStep(-1);
      setScoringDone(false);
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

  const numSparks =
    sellValue < 100
      ? 0
      : sellValue < 500
        ? 3
        : sellValue < 1000
          ? 5
          : sellValue < 5000
            ? 7
            : sellValue < 10000
              ? 12
              : sellValue < 30000
                ? 20
                : 24;

  const buttonBorderColor =
    sellValue >= 20000
      ? '#0066ff'
      : sellValue >= 15000
        ? '#00cccc'
        : sellValue >= 10000
          ? '#00ffcc'
          : sellValue >= 5000
            ? '#00ff99'
            : sellValue >= 2000
              ? '#2ecc71'
              : sellValue >= 1000
                ? '#4caf50'
                : 'rgba(123,169,101,1)';

  const buttonBackgroundColor =
    sellValue >= 20000
      ? 'rgba(0, 102, 255, 0.3)'
      : sellValue >= 15000
        ? 'rgba(0, 204, 204, 0.3)'
        : sellValue >= 10000
          ? 'rgba(0, 255, 204, 0.3)'
          : sellValue >= 5000
            ? 'rgba(0, 255, 153, 0.3)'
            : sellValue >= 2000
              ? 'rgba(46, 204, 113, 0.3)'
              : sellValue >= 1000
                ? 'rgba(76, 175, 80, 0.3)'
                : 'rgba(154,193,118,1)';

  const sparkColors =
    sellValue >= 20000
      ? [
          '#0066ff',
          '#0080ff',
          '#0099ff',
          '#00b3ff',
          '#1e90ff',
          '#4169e1',
          '#5a7fff',
          '#00bfff',
        ]
      : sellValue >= 15000
        ? [
            '#00cccc',
            '#00e6e6',
            '#00d9ff',
            '#00c3ff',
            '#00b0ff',
            '#009fff',
            '#1e90ff',
            '#4db8ff',
          ]
        : sellValue >= 10000
          ? [
              '#00ffcc',
              '#00ffb3',
              '#00e6cc',
              '#00d9e6',
              '#00cccc',
              '#00b8d4',
              '#26c6da',
              '#4dd0e1',
            ]
          : sellValue >= 5000
            ? [
                '#00ff99',
                '#00e68a',
                '#00cc88',
                '#00b894',
                '#1abc9c',
                '#16a085',
                '#26d9a0',
                '#2ecc71',
              ]
            : sellValue >= 2000
              ? [
                  '#3dff88',
                  '#2ecc71',
                  '#27ae60',
                  '#16a085',
                  '#1abc9c',
                  '#20c997',
                ]
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
        <View
          style={[styles.container, isTutorialModal && { overflow: 'visible' }]}
        >
          {/* Tutorial dim overlay */}
          {isTutorialModal && (
            <View style={styles.tutorialDimOverlay} pointerEvents="none" />
          )}
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
                <Text style={styles.priceValue}>${formatCurrency(candy.cost)}</Text>
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
                            ${formatCurrency(candy.averagePrice)}
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
                            ${formatCurrency(candy.averagePrice)}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </View>
          </PixelBorder>

          {/* Sale breakdown */}
          {saleResult && mode === 'Sell' && candy.averagePrice !== null && (() => {
            const boosts = saleResult.bonusBreakdown.filter(b => b.flatBonus && b.flatBonus > 0);
            const mults = saleResult.bonusBreakdown.filter(b => b.multiplier > 1 && !b.flatBonus);
            const boostedProfit = (saleResult.totalGain - saleResult.purchaseValue) / Math.max(saleResult.jokerMultiplier, 1);
            const finalProfit = saleResult.totalGain - saleResult.purchaseValue;

            // During scoring animation, show animated version
            const displayProfit = scoringActive ? animatedProfit : boostedProfit;
            const displayMult = scoringActive ? animatedMult : saleResult.jokerMultiplier;
            const displayFinal = scoringActive
              ? (scoringDone ? finalProfit : displayProfit * displayMult)
              : finalProfit;
            const displayTotal = scoringActive
              ? (scoringDone ? saleResult.totalGain : displayProfit * displayMult + saleResult.purchaseValue)
              : saleResult.totalGain;

            // Currently animating joker
            const activeBonus = scoringActive && scoringStep >= 0 && scoringStep < scoringSteps.length
              ? scoringSteps[scoringStep]
              : null;

            const flashBg = scoringFlash.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(0,0,0,0)', activeBonus?.bucket === 'mult' ? 'rgba(217,119,6,0.3)' : 'rgba(34,197,94,0.3)'],
            });

            const renderIcon = (bonus: typeof boosts[0], i: number, prefix: string, isActive: boolean) => {
              const iconSource = JOKER_ICON_BY_NAME[bonus.name];
              const opacity = scoringActive && scoringStep >= 0
                ? (isActive ? 1 : 0.3)
                : 1;
              return iconSource ? (
                <Image key={`${prefix}-${i}`} source={iconSource} style={[styles.receiptIcon, { opacity }]} />
              ) : (
                <TextWithEmojis key={`${prefix}-${i}`} style={{ fontSize: 14, opacity }} imageSize={18}>
                  {bonus.emoji}
                </TextWithEmojis>
              );
            };

            // Check if a specific bonus is the currently animating one
            const isActiveBonus = (bonus: typeof boosts[0]) =>
              activeBonus?.name === bonus.name && activeBonus?.emoji === bonus.emoji;

            return (
              <PixelBorder
                borderColor="#fde047"
                borderWidth={3}
                backgroundColor="#fef3c7"
                innerPadding={0}
              >
                <View style={styles.priceBreakdownContainer}>
                  {/* Active joker name flash */}
                  {scoringActive && activeBonus && (
                    <RNAnimated.View style={[styles.scoringNameBanner, { backgroundColor: flashBg }]}>
                      <Text style={styles.scoringNameText}>
                        {activeBonus.bucket === 'boost' ? '[+Profit] ' : '[xMult] '}
                        {activeBonus.name}
                      </Text>
                    </RNAnimated.View>
                  )}

                  {/* Profit row */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.breakdownLabel}>Profit</Text>
                    {boosts.length > 0 && (
                      <View style={styles.iconRow}>
                        {boosts.map((b, i) => renderIcon(b, i, 'bi', isActiveBonus(b)))}
                      </View>
                    )}
                    <Text style={[styles.breakdownValue, { color: colors.green.success }]}>
                      ${formatCurrency(displayProfit)}
                    </Text>
                  </View>

                  {/* Multiplier row */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.breakdownLabel}>Multiplier</Text>
                    {(mults.length > 0 || saleResult.vacuumSealerPenalty < 1) && (
                      <View style={styles.iconRow}>
                        {mults.map((b, i) => renderIcon(b, i, 'mi', isActiveBonus(b)))}
                        {saleResult.vacuumSealerPenalty < 1 && (
                          <Image
                            source={require('../../assets/images/emojis/vacuumsealer.png')}
                            style={[styles.receiptIcon, { opacity: 0.5 }]}
                          />
                        )}
                      </View>
                    )}
                    <Text style={[styles.breakdownValue, { color: '#d97706' }]}>
                      {displayMult.toFixed(1)}x
                    </Text>
                  </View>

                  {/* Totals */}
                  <View style={styles.divider} />
                  <View style={styles.receiptRow}>
                    <Text style={[styles.breakdownLabel, { fontSize: 12 }]}>
                      ${formatCurrency(displayProfit)} × <Text style={{ color: '#d97706' }}>{displayMult.toFixed(1)}x</Text>
                    </Text>
                    <Text style={[styles.breakdownValue, { color: colors.green.success }]}>
                      ${formatCurrency(displayFinal)}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.breakdownLabel, { fontSize: 12, color: '#92400e' }]}>
                      + Cost Back
                    </Text>
                    <Text style={[styles.breakdownValue, { color: '#92400e' }]}>
                      ${formatCurrency(saleResult.purchaseValue)}
                    </Text>
                  </View>
                  <View style={styles.divider} />

                  {/* You Pocket */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.finalPriceLabel}>You Pocket</Text>
                    <Text style={styles.finalPriceValue}>
                      ${formatCurrency(displayTotal)}
                    </Text>
                  </View>
                </View>
              </PixelBorder>
            );
          })()}

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
            ) : maxQuantity > 0 ? (
              <Slider
                key={`sell-${maxQuantity}`}
                style={{ width: '100%', height: 50, marginVertical: 2 }}
                minimumValue={10000}
                maximumValue={10000 + maxQuantity}
                step={1}
                value={10000 + Math.max(0, Math.min(quantity, maxQuantity))}
                onValueChange={(value) => handleSliderChange(value - 10000)}
                onSlidingComplete={(value) =>
                  handleSliderComplete(value - 10000)
                }
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
            )}
            {/* Hide tabs during tutorial: step 4 = buy only, step 7 = sell only */}
            {tutorialStep !== 4 && tutorialStep !== 7 && (
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
                  onPress={() => {
                    changeMode('Sell');
                  }}
                >
                  <Text style={styles.tabText}>Sell</Text>
                </TouchableOpacity>
              </PixelBorder>
            </View>
            )}
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
                    ${formatCurrency(quantity * candy.cost)}
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

          {/* Tutorial hint banner */}
          {(tutorialStep === 4 || tutorialStep === 7) && (
            <View style={[styles.tutorialHint, { zIndex: 10, elevation: 10 }]}>
              <Text style={styles.tutorialHintText}>
                {tutorialStep === 4 && 'Smash that Buy button!'}
                {tutorialStep === 7 && 'Cash out! Hit Sell and watch the money roll in'}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.buttonRow,
              (tutorialStep === 4 || tutorialStep === 7) && {
                zIndex: 10,
                elevation: 10,
              },
            ]}
          >
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
              shadowColor={
                tutorialStep === 4 || tutorialStep === 7
                  ? '#FFD700'
                  : buttonBorderColor
              }
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={5}
              elevation={8}
              style={{ flex: 1 }}
            >
              <View style={{ position: 'relative' }}>
                {mode === 'Sell' && numSparks > 0 && (
                  <SparkEffect
                    numSparks={numSparks}
                    sparkColors={sparkColors}
                  />
                )}
                <PixelBorder
                  borderColor={
                    tutorialStep === 4 || tutorialStep === 7
                      ? '#FFD700'
                      : buttonBorderColor
                  }
                  borderWidth={tutorialStep === 4 || tutorialStep === 7 ? 4 : 3}
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
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  receiptSubLabel: {
    fontSize: 10,
    color: '#92400e',
    fontFamily: 'PixeloidMono',
    marginBottom: 2,
  },
  formulaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 6,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    marginHorizontal: 6,
  },
  receiptBonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    gap: 6,
  },
  receiptIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  priceBreakdownContainer: {
    padding: 12,
    marginVertical: 4,
    flexDirection: 'column',
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
    color: '#ef4444',
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
  scoringNameBanner: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  scoringNameText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    color: '#1a1a2e',
    textAlign: 'center',
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
  tutorialDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 5,
    elevation: 5,
    borderRadius: 8,
  },
  tutorialHint: {
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
  },
  tutorialHintText: {
    color: '#fff',
    fontSize: 14,
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
