import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { CANDY_NAMES } from '../../src/constants/candyRegistry';
import { JOKER_IDS } from '../../src/constants/jokerIds';
import { useEventHandler } from '../../src/hooks/useEventHandler';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { useAppSelector } from '../../src/store/hooks';
import { useCandySales } from '../../src/hooks/useCandySales';
import { selectJokerStats } from '../../src/store/slices/jokerStatsSlice';
import { triggerTieredHaptic } from '../../src/utils/hapticTier';
import {
  STANDARDIZED_JOKERS,
  getJokerDescription,
  getLiveJokerValueText,
} from '../../src/utils/jokerEffectEngine';
import { JuiceController } from '../../src/utils/juiceController';
import { formatCurrency } from '../../src/utils/priceUtils';
import { playJokerChip } from '../../src/utils/soundEffects';
import { SparkController } from '../../src/utils/sparkController';
import { getWalletPositionOrDefault } from '../../src/utils/walletPositionStore';
import { JOKER_ICON_MAP } from '../../utils/jokerIcons';
import ConfirmationModal from './ConfirmationModal';
import PixelBorder from './PixelBorder';
import PressableScale from './PressableScale';
import TextWithEmojis from './TextWithEmojis';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface JokerCardProps {
  joker: {
    id: number;
    name: string;
    type: 'one-time' | 'persistent';
    flavorText: string;
    description: string;
    theme?: string;
    effect?: string;
  };
  isAfterSchool: boolean;
  onLongPress?: () => void;
  isDragging?: boolean;
  isCompact?: boolean;
  showOwned?: boolean;
  disableActivation?: boolean;
  debugMode?: boolean;
  /** Number of covered candy types (for Combo Platter / Triple Threat synergy badge) */
  coveredTypeCount?: number;
  /** Reward/selection mode: tap-to-select callback (paired with disableActivation). */
  onPress?: () => void;
  /** Reward/selection mode: render with green border to indicate this card is the chosen one. */
  isSelected?: boolean;
  /** Reward/selection mode: dim the card and ignore taps (e.g. aura slots full). */
  selectionDisabled?: boolean;
  /** Override the inner card container style (e.g. to remove minHeight, set aspectRatio). */
  containerStyle?: any;
  onShowConfirmation?: (
    title: string,
    message: string,
    emoji: string,
    onConfirm: () => void,
    confirmText?: string,
    cancelText?: string,
    onCancel?: () => void
  ) => void;
  onShowCandySelector?: (joker: any) => void;
  onTriggerEvent?: (eventData: any) => void;
}

const CANDY_TYPES = CANDY_NAMES;

function JokerCard({
  joker,
  isAfterSchool,
  onLongPress,
  isDragging,
  isCompact,
  showOwned,
  disableActivation = false,
  debugMode = false,
  coveredTypeCount,
  onPress,
  isSelected = false,
  selectionDisabled = false,
  containerStyle,
  onShowConfirmation,
  onShowCandySelector,
  onTriggerEvent,
}: JokerCardProps) {
  const {
    jokers,
    activateJoker,
    addJoker,
    removeJoker,
    usedTodayJokerIds,
    markJokerUsedToday,
  } = useJokers();
  const { periodCount, revertToPreviousPeriod, incrementPeriod, jumpToPeriod } =
    useGame();
  const { gameData, modifyCandyPrice, getOriginalCandyPrice } = useSeed();
  const { activateDetentionDodge } = useEventHandler();
  const {
    inventory,
    removeFromInventory,
    addToInventory,
    convertCandyType,
    getTotalInventoryCount,
    getInventoryLimit,
  } = useInventory();
  const { add: addMoney } = useWallet();

  // Memoize inventory limit to prevent excessive JokerService calls
  const memoizedInventoryLimit = useMemo(
    () => getInventoryLimit(),
    [getInventoryLimit]
  );
  // Period selector and joker duplication modals removed (old Time Equation / Glitch in the Matrix)
  const [showConversionStep1, setShowConversionStep1] = useState(false); // Select source candy
  const [showConversionStep2, setShowConversionStep2] = useState(false); // Select target candy
  const [selectedSourceCandy, setSelectedSourceCandy] = useState<string | null>(
    null
  );
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    emoji: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    visible: false,
    title: '',
    message: '',
    emoji: '',
    onConfirm: () => {},
  });

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      emoji: string,
      onConfirm: () => void,
      confirmText = 'OK',
      cancelText = 'Cancel',
      onCancel?: () => void
    ) => {
      // Use the page-level confirmation modal if available, otherwise fall back to internal modal
      if (onShowConfirmation) {
        onShowConfirmation(
          title,
          message,
          emoji,
          onConfirm,
          confirmText,
          cancelText,
          onCancel
        );
      } else {
        setConfirmModal({
          visible: true,
          title,
          message,
          emoji,
          onConfirm: () => {
            setConfirmModal((prev) => ({ ...prev, visible: false }));
            onConfirm();
          },
          onCancel: onCancel
            ? () => {
                setConfirmModal((prev) => ({ ...prev, visible: false }));
                onCancel();
              }
            : () => setConfirmModal((prev) => ({ ...prev, visible: false })),
          confirmText,
          cancelText: onCancel ? cancelText : undefined,
        });
      }
    },
    [onShowConfirmation]
  );

  const showAlert = useCallback(
    (title: string, message: string, emoji = '✨') => {
      showConfirm(title, message, emoji, () => {}, 'OK');
    },
    [showConfirm]
  );

  // Prevent multiple rapid activations
  const isActivating = useRef(false);

  // Ref to outer card wrapper for measuring position (used for money arc to wallet HUD)
  const cardContainerRef = useRef<View>(null);

  /**
   * Fire the standard activation feedback sequence (haptic + sound + gold flash).
   * When `moneyGranted` is provided, also fire a gold arc from the card to the
   * wallet HUD in the top-right corner of the screen.
   *
   * Call this at the moment a USE activation is COMMITTED (post-confirmation),
   * never on the initial tap or on cancellation.
   */
  const fireActivationFeedback = useCallback((moneyGranted?: number) => {
    triggerTieredHaptic(0.9, 'success');
    playJokerChip(0);
    JuiceController.flash({
      color: '#FFD700',
      maxOpacity: 0.35,
      duration: 280,
    });

    if (moneyGranted && moneyGranted > 0 && cardContainerRef.current) {
      // Wallet HUD center position — set by GameHUD on layout.
      // Falls back to approximate top-left HUD position if unmeasured.
      const target = getWalletPositionOrDefault(SCREEN_WIDTH);
      cardContainerRef.current.measureInWindow((x, y, width, height) => {
        SparkController.arc({
          from: { x: x + width / 2, y: y + height / 2 },
          to: target,
          tier: 'gold',
          symbol: `+$${moneyGranted}`,
        });
      });
    }
  }, []);

  const handleActivate = useCallback(() => {
    // For copied jokers, use originalId for activation checks.
    // Coerce to a number — joker.id can arrive as a string from some persistence
    // paths, and the strict-equal checks below compare against numeric JOKER_IDS.
    const activationId = Number((joker as any).originalId ?? joker.id);

    if (__DEV__) {
      console.log(
        '🔍 handleActivate called for:',
        joker.name,
        'ID:',
        joker.id,
        'ActivationID:',
        activationId,
        'Type:',
        joker.type
      );
      console.log('🔍 Current usedTodayJokerIds:', usedTodayJokerIds);
      console.log(
        '🔍 Checking if',
        activationId.toString(),
        'is in usedTodayJokerIds:',
        usedTodayJokerIds.includes(activationId.toString())
      );
    }

    if (isActivating.current) {
      if (__DEV__)
        console.log(
          '🃏 Activation already in progress, ignoring duplicate call for:',
          joker.name
        );
      return;
    }

    if (disableActivation) {
      if (__DEV__) console.log('🃏 Activation disabled for:', joker.name);
      return;
    }

    // Check if this instant joker has already been used today (use originalId for copies)
    if (
      joker.type === 'one-time' &&
      usedTodayJokerIds.includes(activationId.toString())
    ) {
      if (__DEV__)
        console.log(
          '🚫 Joker already used today:',
          joker.name,
          'ID:',
          joker.id
        );
      triggerTieredHaptic(0, 'warning');
      showAlert(
        'Already Used',
        'This instant joker has already been used today. It will be available again tomorrow!',
        '⏳'
      );
      return;
    }

    if (__DEV__) {
      console.log('✅ Joker NOT in used list, proceeding with activation');
    }
    isActivating.current = true;
    if (__DEV__)
      console.log(
        '🃏 handleActivate called for joker:',
        joker.name,
        'ID:',
        joker.id
      );

    // Reset the flag after a short delay
    setTimeout(() => {
      isActivating.current = false;
    }, 1000); // Increased to 1 second

    if (
      activationId === JOKER_IDS.DOUBLE_UP ||
      joker.effect === 'double_candy_price'
    ) {
      // Show candy selector modal for Double Up
      onShowCandySelector?.(joker);
    } else if (activationId === JOKER_IDS.MARKET_MANIPULATION) {
      // Show candy selector modal for market manipulation
      onShowCandySelector?.(joker);
    } else if (activationId === JOKER_IDS.BET_YOU_IM_FASTER) {
      // Show candy selector modal for inventory filling
      onShowCandySelector?.(joker);
    } else if (activationId === JOKER_IDS.ROMAN_COIN) {
      // Show confirmation for Roman Coin activation
      showConfirm(
        'Roman Coin',
        'Sell the ancient coin for $200?',
        '🪙',
        () => handleRomanCoin(),
        'Sell Coin',
        'Cancel',
        () => {}
      );
    } else if (activationId === JOKER_IDS.PURSUASION) {
      // Show confirmation for Pursuasion activation
      showConfirm(
        'Pursuasion',
        'Activate 2x profits for your next sale?',
        '🗣️',
        () => handlePersuasion(),
        'Activate',
        'Cancel',
        () => {}
      );
    } else if (activationId === JOKER_IDS.BAKE_SALE) {
      // Show confirmation for Bake Sale
      showConfirm(
        'Bake Sale',
        'Cash Rules Everything Around Me! Instantly gain $3000?',
        '🧁',
        () => handleBakeSale(),
        'Collect Money!',
        'Cancel',
        () => {}
      );
    } else if (activationId === JOKER_IDS.MARKET_CRASH) {
      const level = (joker as any).level ?? 1;
      const mult = level === 3 ? 0.3 : level === 2 ? 0.4 : 0.5;
      const pct = Math.round((1 - mult) * 100);
      showConfirm(
        'Market Crash',
        `Crash all candy prices by ${pct}% for this period?`,
        '📉',
        () => handleMarketCrash(mult),
        'Crash It',
        'Cancel',
        () => {}
      );
    } else if (activationId === JOKER_IDS.INFLATION) {
      const level = (joker as any).level ?? 1;
      const mult = level === 3 ? 4 : level === 2 ? 3 : 2;
      showConfirm(
        'Inflation',
        `Multiply all candy prices by ${mult}x for this period?`,
        '📈',
        () => handleInflation(mult),
        'Inflate',
        'Cancel',
        () => {}
      );
    } else if (activationId === JOKER_IDS.DETENTION_DODGE) {
      showConfirm(
        'Detention Dodge',
        'Dodge all events for the rest of today?',
        '🏃',
        () => handleDetentionDodge(),
        'Dodge',
        'Cancel',
        () => {}
      );
    } else {
      // Log unhandled instant joker activation
      if (__DEV__)
        console.warn(
          '⚠️ Unhandled instant joker activation:',
          joker.name,
          'ID:',
          joker.id,
          'Effect:',
          joker.effect
        );
      triggerTieredHaptic(0, 'warning');
      showAlert(
        'Not Implemented',
        `The activation for "${joker.name}" is not yet implemented.`,
        '🚧'
      );
    }
  }, [
    joker,
    disableActivation,
    usedTodayJokerIds,
    onShowCandySelector,
    showConfirm,
    showAlert,
    periodCount,
    revertToPreviousPeriod,
    markJokerUsedToday,
    removeJoker,
  ]);

  const handleSourceCandySelection = (candyType: string) => {
    setSelectedSourceCandy(candyType);
    setShowConversionStep1(false);
    setShowConversionStep2(true);
  };

  const handleTargetCandySelection = async (targetCandyType: string) => {
    if (!selectedSourceCandy) return;

    const sourceInventoryItem = inventory.find(
      (item) => item.name === selectedSourceCandy
    );
    if (!sourceInventoryItem || (sourceInventoryItem.quantity || 0) === 0) {
      showAlert('Error', 'No source candy available for conversion!', '⚠️');
      return;
    }

    // Mark the joker as used today FIRST to prevent double-activation
    // Use originalId for copies so all copies share the same "used" status
    const activationId = (joker as any).originalId || joker.id;
    markJokerUsedToday(activationId.toString());

    const currentTotal = getTotalInventoryCount();
    if (__DEV__) {
      console.log(
        `Master of Trade: Current inventory: ${currentTotal}/${memoizedInventoryLimit}`
      );
      console.log(
        `Master of Trade: Converting ${sourceInventoryItem.quantity} ${selectedSourceCandy} to ${targetCandyType}`
      );
    }

    // Get current target candy price for conversion
    const targetPrice =
      gameData.candyPrices[targetCandyType]?.[periodCount] || 0;
    if (__DEV__)
      console.log(
        `Master of Trade: Target price for ${targetCandyType}: ${targetPrice}`
      );

    // Use the dedicated convertCandyType function (bypasses inventory limits for 1:1 conversion)
    const conversionSuccess = convertCandyType(
      selectedSourceCandy,
      sourceInventoryItem.quantity,
      targetCandyType,
      targetPrice
    );

    if (!conversionSuccess) {
      showAlert('Error', 'Failed to convert candy!', '❌');
      return;
    }

    if (__DEV__)
      console.log(
        `Master of Trade: Successfully converted ${sourceInventoryItem.quantity} ${selectedSourceCandy} to ${targetCandyType}`
      );

    showAlert(
      'Trade Completed!',
      `Successfully converted ${sourceInventoryItem.quantity} ${selectedSourceCandy} into ${sourceInventoryItem.quantity} ${targetCandyType}!`,
      'refresh'
    );

    // Reset state
    setShowConversionStep2(false);
    setSelectedSourceCandy(null);
  };

  // Get available inventory candies for conversion
  const availableCandiesForConversion = inventory
    .filter((item) => (item.quantity || 0) > 0)
    .map((item) => item.name);

  // Get target candies (exclude the selected source)
  const availableTargetCandies = CANDY_TYPES.filter(
    (candyType) => candyType !== selectedSourceCandy
  );

  const handleRomanCoin = async () => {
    if (__DEV__) {
      console.log('🪙 Roman Coin: Starting activation');
      console.log(
        '🪙 Roman Coin: usedTodayJokerIds BEFORE marking:',
        usedTodayJokerIds
      );
    }

    try {
      // Mark the joker as used today FIRST to prevent double-activation
      if (__DEV__)
        console.log(
          '🪙 Roman Coin: Marking joker as used, ID:',
          joker.id,
          'Type:',
          typeof joker.id
        );
      // Use originalId for copies so all copies share the same "used" status
      const activationId = (joker as any).originalId || joker.id;
      markJokerUsedToday(activationId.toString());
      if (__DEV__)
        console.log(
          '🪙 Roman Coin: markJokerUsedToday called, waiting for state update...'
        );

      // Add $200 to wallet
      if (__DEV__) console.log('🪙 Roman Coin: Adding $2000 to wallet');
      addMoney(2000);

      // Fire activation feedback (commit point) — money-granting, so arc flies to wallet HUD
      fireActivationFeedback(2000);

      if (__DEV__) console.log('🪙 Roman Coin: Showing success alert');
      showAlert(
        'Roman Coin Sold!',
        'You sold the ancient Roman coin and received $2000!',
        '🪙'
      );
    } catch (error) {
      console.error('🪙 Roman Coin: Error during activation:', error);
      showAlert(
        'Error',
        'An error occurred while activating the Roman Coin',
        '❌'
      );
    }
  };

  const handlePersuasion = async () => {
    if (__DEV__) {
      console.log('🗣️ Pursuasion: Starting activation');
      console.log('🗣️ Pursuasion: Current period:', periodCount);
      console.log('🗣️ Pursuasion: Joker ID:', joker.id);
    }

    try {
      // Mark the joker as used today FIRST to prevent double-activation
      // Use originalId for copies so all copies share the same "used" status
      const activationId = (joker as any).originalId || joker.id;
      markJokerUsedToday(activationId.toString());
      if (__DEV__) console.log('🗣️ Pursuasion: Joker marked as used');

      // Activate the joker effect for current period
      const activated = await activateJoker(
        Number(joker.id),
        undefined,
        periodCount
      );
      if (__DEV__) {
        console.log('🗣️ Pursuasion: Effect activated result:', activated);
        console.log('🗣️ Pursuasion: Effect activated for period', periodCount);
      }

      // Fire activation feedback (commit point) — no direct money grant, so no arc
      fireActivationFeedback();

      // Show alert AFTER marking joker as used
      showAlert(
        'Pursuasion Activated!',
        'Your next candy sale will earn 2x profit!',
        '🗣️'
      );
    } catch (error) {
      console.error('🗣️ Pursuasion: Error during activation:', error);
      showAlert('Error', 'An error occurred while activating Pursuasion', '❌');
    }
  };

  const handleBakeSale = async () => {
    if (__DEV__) console.log('🧁 Bake Sale: Starting activation');

    try {
      // Mark the joker as used today FIRST to prevent double-activation
      // Use originalId for copies so all copies share the same "used" status
      const activationId = (joker as any).originalId || joker.id;
      markJokerUsedToday(activationId.toString());
      if (__DEV__) console.log('🧁 Bake Sale: Joker marked as used');

      // Add $1000 to wallet
      addMoney(3000);
      if (__DEV__) console.log('🧁 Bake Sale: Added $3000 to wallet');

      // Fire activation feedback (commit point) — money-granting, so arc flies to wallet HUD
      fireActivationFeedback(3000);

      showAlert(
        'Bake Sale Success!',
        'You collected $3000 from your bake sale! Cash Rules Everything Around Me!',
        '🧁'
      );
    } catch (error) {
      console.error('🧁 Bake Sale: Error during activation:', error);
      showAlert('Error', 'An error occurred while activating Bake Sale', '❌');
    }
  };

  // Apply a flat multiplier to every candy's price for the current period.
  // Used by Market Crash (mult < 1) and Inflation (mult > 1).
  const applyAllCandyPriceMultiplier = (mult: number) => {
    const candyPrices = gameData?.candyPrices;
    if (!candyPrices) return;
    for (const candyType of Object.keys(candyPrices)) {
      const original = candyPrices[candyType]?.[periodCount];
      if (typeof original !== 'number') continue;
      modifyCandyPrice(candyType, Math.max(1, Math.round(original * mult)), periodCount);
    }
  };

  const handleMarketCrash = async (mult: number) => {
    try {
      const activationId = (joker as any).originalId || joker.id;
      markJokerUsedToday(activationId.toString());
      applyAllCandyPriceMultiplier(mult);
      fireActivationFeedback();
      const pct = Math.round((1 - mult) * 100);
      showAlert(
        'Market Crashed!',
        `All candy prices dropped ${pct}% this period. Buy the dip!`,
        '📉'
      );
    } catch (error) {
      console.error('📉 Market Crash: Error during activation:', error);
      showAlert('Error', 'An error occurred while activating Market Crash', '❌');
    }
  };

  const handleInflation = async (mult: number) => {
    try {
      const activationId = (joker as any).originalId || joker.id;
      markJokerUsedToday(activationId.toString());
      applyAllCandyPriceMultiplier(mult);
      fireActivationFeedback();
      showAlert(
        'Inflation Hits!',
        `All candy prices multiplied ${mult}x this period.`,
        '📈'
      );
    } catch (error) {
      console.error('📈 Inflation: Error during activation:', error);
      showAlert('Error', 'An error occurred while activating Inflation', '❌');
    }
  };

  const handleDetentionDodge = async () => {
    try {
      const activationId = (joker as any).originalId || joker.id;
      markJokerUsedToday(activationId.toString());
      activateDetentionDodge();
      fireActivationFeedback();
      showAlert(
        'Detention Dodged!',
        "You're invisible to events for the rest of today.",
        '🏃'
      );
    } catch (error) {
      console.error('🏃 Detention Dodge: Error during activation:', error);
      showAlert('Error', 'An error occurred while activating Detention Dodge', '❌');
    }
  };

  const jokerLevel = (joker as any).level ?? 1;
  const LEVEL_COLORS = { 1: '#22c55e', 2: '#3b82f6', 3: '#a855f7' } as const;
  const levelColor = LEVEL_COLORS[jokerLevel as 1 | 2 | 3] || LEVEL_COLORS[1];
  const standardizedJoker = STANDARDIZED_JOKERS.find(
    (sj) => sj.id === joker.id
  );
  const maxLevel = standardizedJoker?.maxLevel ?? 1;
  const isLevelable = maxLevel > 1;

  // Live "(currently +30%)" text for variable jokers (Trade Routes,
  // Compound Interest, Reputation, Street Smarts, Clearance Sale, Momentum,
  // Hoarder, Penny Wise, Survivor) — null for non-variable jokers or
  // zero-counter state. Momentum's counter lives in candySalesSlice so it's
  // sourced via useCandySales().
  const jokerStats = useAppSelector(selectJokerStats);
  const { consecutivePeriodSales } = useCandySales();
  const liveValueText = getLiveJokerValueText(joker.id, jokerLevel, {
    jokerStats,
    consecutivePeriodSales: consecutivePeriodSales(),
  });

  const typeColor = joker.type === 'persistent' ? '#0071E3' : '#dc2626';
  const typeEmoji = joker.type === 'persistent' ? '🔮' : '⚡';
  const typeText =
    joker.type === 'persistent'
      ? 'Aura'
      : usedTodayJokerIds.includes(joker.id.toString())
        ? 'Used'
        : 'Instant';
  const flavorText =
    joker.flavorText ||
    STANDARDIZED_JOKERS.find((sj) => sj.id === joker.id)?.flavorText ||
    'Mysterious power awaits...';

  // PressableScale for press-down spring feedback (I3 game-feel)
  const CardWrapper =
    onLongPress || debugMode || onPress ? PressableScale : View;

  const handleDebugAdd = useCallback(() => {
    if (debugMode && !showOwned) {
      addJoker(joker);
      if (onShowConfirmation) {
        onShowConfirmation(
          'Debug: Joker Added',
          `Added ${joker.name} to inventory!`,
          '🐛',
          () => {}
        );
      }
    }
  }, [debugMode, showOwned, joker, addJoker, onShowConfirmation]);

  const cardWrapperProps = onPress
    ? {
        onPress: selectionDisabled ? undefined : onPress,
        activeOpacity: selectionDisabled ? 1 : 0.8,
        disabled: selectionDisabled,
      }
    : onLongPress
      ? { onLongPress, activeOpacity: 0.8 }
      : debugMode
        ? { onPress: handleDebugAdd, activeOpacity: 0.8 }
        : {};

  // Check if this instant joker has been used today
  const isUsedToday =
    joker.type === 'one-time' &&
    usedTodayJokerIds.includes(joker.id.toString());

  return (
    <>
      <View ref={cardContainerRef} collapsable={false}>
        <PixelBorder
          borderColor={isSelected ? '#10b981' : '#d4af37'}
          borderWidth={3}
          innerPadding={0}
        >
          <CardWrapper
            style={[
              styles.cardContainer,
              selectionDisabled && { opacity: 0.4 },
              containerStyle,
            ]}
            {...cardWrapperProps}
          >
            {/* Background icon */}
            {JOKER_ICON_MAP[joker.name] && (
              <Image
                source={JOKER_ICON_MAP[joker.name]}
                style={styles.backgroundIcon}
                resizeMode="contain"
              />
            )}
            {/* Header Section */}
            <View style={styles.headerSection}>
              <>
                <Text style={styles.jokerName}>{joker.name}</Text>
                {(isLevelable && (
                  <View style={styles.levelBadgeContainer}>
                    {[1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.levelDot,
                          i <= jokerLevel
                            ? {
                                backgroundColor: LEVEL_COLORS[i as 1 | 2 | 3],
                                shadowColor: LEVEL_COLORS[i as 1 | 2 | 3],
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.8,
                                shadowRadius: 3,
                              }
                            : styles.levelDotEmpty,
                        ]}
                      />
                    ))}
                  </View>
                )) ||
                  (showOwned && <View style={styles.ownedIndicator} />)}
              </>
            </View>

            {/* Type Badge and Play Card Row */}
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                <TextWithEmojis style={styles.typeText} imageSize={12}>
                  {`${typeEmoji} ${typeText}`}
                </TextWithEmojis>
              </View>

              {joker.type === 'one-time' &&
                !disableActivation &&
                !isAfterSchool &&
                !isUsedToday && (
                  // PressableScale for press-down spring feedback (I3 game-feel)
                  <PressableScale
                    style={styles.useButton}
                    onPress={handleActivate}
                  >
                    <Text style={styles.useButtonText}>USE</Text>
                  </PressableScale>
                )}
            </View>

            {/* Main Content */}
            <View style={styles.contentSection}>
              {(() => {
                const desc = (
                  getJokerDescription(joker.id, jokerLevel) || joker.description
                ).replace(/^\[(?:xMult|\+Profit)\]\s*/, '');
                const liveSuffix = liveValueText ? ` (${liveValueText})` : '';
                if (!isLevelable) {
                  return (
                    <Text style={styles.jokerDescription}>
                      {desc}
                      {liveSuffix}
                    </Text>
                  );
                }
                // Color only the leading numeric value (e.g., "+0.5", "3x", "$5k", "50%")
                const match = desc.match(/^([+\-$]?\d+\.?\d*[xk%]?)/);
                if (!match) {
                  return (
                    <Text style={styles.jokerDescription}>
                      {desc}
                      {liveSuffix}
                    </Text>
                  );
                }
                return (
                  <Text style={styles.jokerDescription}>
                    <Text style={{ color: levelColor, fontWeight: '700' }}>
                      {match[1]}
                    </Text>
                    {desc.slice(match[1].length)}
                    {liveSuffix}
                  </Text>
                );
              })()}
            </View>

            {/* Synergy Badge for Combo Platter / Triple Threat */}
            {coveredTypeCount !== undefined &&
              joker.id === JOKER_IDS.COMBO_PLATTER && (
                <View
                  style={[
                    styles.synergyBadge,
                    coveredTypeCount >= 2
                      ? styles.synergyReady
                      : styles.synergyPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.synergyText,
                      coveredTypeCount >= 2 && styles.synergyTextReady,
                    ]}
                  >
                    {coveredTypeCount >= 2
                      ? `${coveredTypeCount}/2 types \u2713`
                      : `${coveredTypeCount}/2 types needed`}
                  </Text>
                </View>
              )}
            {coveredTypeCount !== undefined &&
              joker.id === JOKER_IDS.TRIPLE_THREAT && (
                <View
                  style={[
                    styles.synergyBadge,
                    coveredTypeCount >= 3
                      ? styles.synergyReady
                      : styles.synergyPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.synergyText,
                      coveredTypeCount >= 3 && styles.synergyTextReady,
                    ]}
                  >
                    {coveredTypeCount >= 3
                      ? `${coveredTypeCount}/3 types \u2713`
                      : `${coveredTypeCount}/3 types needed`}
                  </Text>
                </View>
              )}

            {/* Footer Section */}
            <View style={styles.footerSection}>
              <Text style={styles.jokerFlavorText}>{flavorText}</Text>
            </View>
          </CardWrapper>
        </PixelBorder>
      </View>

      {/* Candy Conversion Step 1: Select Source Modal */}
      <Modal
        visible={showConversionStep1}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConversionStep1(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              styles.jokerModalContent,
              isAfterSchool && styles.modalContentAfterSchool,
            ]}
          >
            <>
              <Text style={styles.modalTitle}>🍭 Select Candy to Convert</Text>

              <ScrollView
                style={styles.jokerScrollView}
                showsVerticalScrollIndicator={false}
              >
                {availableCandiesForConversion.length > 0 ? (
                  availableCandiesForConversion.map((candyType) => (
                    <TouchableOpacity
                      key={candyType}
                      style={[
                        styles.candyOption,
                        isAfterSchool && styles.candyOptionAfterSchool,
                      ]}
                      onPress={() => handleSourceCandySelection(candyType)}
                    >
                      <View style={styles.candyOptionHeader}>
                        <Text
                          style={[
                            styles.candyOptionText,
                            isAfterSchool && styles.candyOptionTextAfterSchool,
                          ]}
                        >
                          {candyType}
                        </Text>
                        <Text style={styles.candyQuantity}>
                          ×
                          {inventory.find((item) => item.name === candyType)
                            ?.quantity || 0}
                        </Text>
                      </View>
                      <Text style={styles.candyAvgPrice}>
                        Avg: $
                        {formatCurrency(
                          inventory.find((item) => item.name === candyType)
                            ?.price || 0
                        )}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noJokersContainer}>
                    <Text style={styles.noJokersText}>
                      No candy to convert!
                    </Text>
                    <Text style={styles.noJokersSubtext}>
                      Buy some candy first
                    </Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConversionStep1(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          </View>
        </View>
      </Modal>

      {/* Candy Conversion Step 2: Select Target Modal */}
      <Modal
        visible={showConversionStep2}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConversionStep2(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Image
                source={require('../../assets/images/emojis/refresh.png')}
                style={{
                  width: 20,
                  height: 20,
                  resizeMode: 'contain',
                  marginRight: 8,
                }}
              />
              <Text style={styles.modalTitle}>Convert to Which Candy?</Text>
            </View>

            {selectedSourceCandy && (
              <Text style={styles.conversionSummary}>
                Converting:{' '}
                {inventory.find((item) => item.name === selectedSourceCandy)
                  ?.quantity || 0}{' '}
                {selectedSourceCandy}
              </Text>
            )}

            {availableTargetCandies.map((candyType) => (
              <TouchableOpacity
                key={candyType}
                style={styles.candyOption}
                onPress={() => handleTargetCandySelection(candyType)}
              >
                <Text style={styles.candyOptionText}>{candyType}</Text>
                <Text style={styles.targetPrice}>
                  Current Price: $
                  {formatCurrency(
                    gameData.candyPrices[candyType]?.[periodCount] || 0
                  )}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowConversionStep2(false);
                setSelectedSourceCandy(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal - only render if not using page-level modal */}
      {!onShowConfirmation && (
        <ConfirmationModal
          visible={confirmModal.visible}
          title={confirmModal.title}
          message={confirmModal.message}
          emoji={confirmModal.emoji}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          onConfirm={confirmModal.onConfirm}
          onCancel={
            confirmModal.onCancel ||
            (() => setConfirmModal((prev) => ({ ...prev, visible: false })))
          }
          theme="market"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#f8f8f0',
    padding: 8,
    borderRadius: 12,
    minHeight: 160,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  backgroundIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 120,
    height: 120,
    opacity: 0.25,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    marginTop: -8,
    marginHorizontal: -8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  jokerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d4af37',
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'left',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ownedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d4af37',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  levelBadgeContainer: {
    flexDirection: 'row',
    gap: 3,
    marginLeft: 6,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // levelDotFilled colors now inlined per level (green/blue/purple)
  levelDotEmpty: {
    backgroundColor: '#555',
    opacity: 0.4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  useButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  useButtonText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fbbf24',
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentSection: {
    flex: 1,
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  jokerDescription: {
    fontSize: 12,
    color: '#2c3e50',
    lineHeight: 14,
    fontFamily: 'PixeloidMono',
    fontWeight: '500',
    textAlign: 'left',
  },
  footerSection: {
    gap: 8,
  },
  jokerFlavorText: {
    fontSize: 10,
    color: '#666',
    lineHeight: 12,
    fontFamily: 'CrayonPastel',
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    minHeight: 300,
    maxWidth: 600,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 20,
  },
  candyOption: {
    backgroundColor: '#f5e6d3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d4a574',
  },
  candyOptionText: {
    color: '#6b4423',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#f87171',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  jokerModalContent: {
    maxHeight: '90%',
    minHeight: 500,
    width: SCREEN_WIDTH - 20,
  },
  jokerScrollView: {
    maxHeight: 400,
    marginBottom: 16,
  },
  noJokersContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noJokersText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  noJokersSubtext: {
    fontSize: 14,
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  candyOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  candyQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
  },
  candyAvgPrice: {
    fontSize: 12,
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
    opacity: 0.8,
  },
  conversionSummary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5e6d3',
    borderRadius: 8,
  },
  targetPrice: {
    fontSize: 12,
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
    opacity: 0.8,
    marginTop: 2,
  },
  synergyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  synergyReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  synergyPending: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  synergyText: {
    fontSize: 8,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    color: '#d4af37',
    letterSpacing: 0.3,
  },
  synergyTextReady: {
    color: '#22c55e',
  },
});

// Memoize the component to prevent unnecessary rerenders
export default memo(JokerCard);
