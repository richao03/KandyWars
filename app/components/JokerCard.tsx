import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { CANDY_NAMES } from '../../src/constants/candyRegistry';
import { JOKER_IDS } from '../../src/constants/jokerIds';
import { useCandySales } from '../../src/hooks/useCandySales';
import { useEventHandler } from '../../src/hooks/useEventHandler';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { useAppSelector } from '../../src/store/hooks';
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

// Border color for an owned wildcard in the tile grid ("All" tab).
const OWNED_BORDER = '#38bdf8';

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
  /** Visual density/layout chosen by the parent context. */
  variant?: 'poster' | 'strip' | 'tile';
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
  variant = 'tile',
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
      gameData.candyPrices?.[targetCandyType]?.[periodCount] || 0;
    const sourceQuantity = sourceInventoryItem.quantity || 0;
    if (__DEV__)
      console.log(
        `Master of Trade: Target price for ${targetCandyType}: ${targetPrice}`
      );

    // Use the dedicated convertCandyType function (bypasses inventory limits for 1:1 conversion)
    const conversionSuccess = convertCandyType(
      selectedSourceCandy,
      sourceQuantity,
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
      modifyCandyPrice(
        candyType,
        Math.max(1, Math.round(original * mult)),
        periodCount
      );
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
      showAlert(
        'Error',
        'An error occurred while activating Market Crash',
        '❌'
      );
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
      showAlert(
        'Error',
        'An error occurred while activating Detention Dodge',
        '❌'
      );
    }
  };

  const jokerLevel = (joker as any).level ?? 1;
  // joker.id can arrive as a string from persistence; normalize once so the
  // numeric-id lookups/comparisons below (and the effect engine) match.
  const numericJokerId =
    typeof joker.id === 'string' ? parseInt(joker.id, 10) : joker.id;
  const LEVEL_COLORS = { 1: '#22c55e', 2: '#3b82f6', 3: '#a855f7' } as const;
  const levelColor = LEVEL_COLORS[jokerLevel as 1 | 2 | 3] || LEVEL_COLORS[1];
  const standardizedJoker = STANDARDIZED_JOKERS.find(
    (sj) => sj.id === numericJokerId
  );
  const maxLevel = standardizedJoker?.maxLevel ?? 1;
  const isLevelable = maxLevel > 1;

  // Live "(+30%)" text for variable jokers (Trade Routes,
  // Compound Interest, Reputation, Street Smarts, Clearance Sale, Momentum,
  // Hoarder, Penny Wise, Survivor) — null for non-variable jokers or
  // zero-counter state. Momentum's counter lives in candySalesSlice so it's
  // sourced via useCandySales().
  const jokerStats = useAppSelector(selectJokerStats);
  const { consecutivePeriodSales } = useCandySales();
  const liveValueText = getLiveJokerValueText(numericJokerId, jokerLevel, {
    jokerStats,
    consecutivePeriodSales: consecutivePeriodSales(),
  });

  const typeColor = joker.type === 'persistent' ? '#0071E3' : '#dc2626';
  const typeEmoji = joker.type === 'persistent' ? '🔮' : '⚡';
  const typeText =
    joker.type === 'persistent'
      ? 'Aura'
      : usedTodayJokerIds.includes(joker.id.toString())
        ? 'USED'
        : 'USE';
  const flavorText =
    joker.flavorText ||
    STANDARDIZED_JOKERS.find((sj) => sj.id === numericJokerId)?.flavorText ||
    'Mysterious power awaits...';

  const jokerArt =
    JOKER_ICON_MAP[joker.name] ||
    require('../../assets/images/emojis/joker.png');

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
  const variantCardStyle =
    variant === 'poster'
      ? styles.posterCard
      : variant === 'strip'
        ? styles.stripCard
        : styles.tileCard;

  const description = (
    getJokerDescription(numericJokerId, jokerLevel) || joker.description
  ).replace(/^\[(?:xMult|\+Profit)\]\s*/, '');
  const liveSuffix = liveValueText ? ` (${liveValueText})` : '';
  const leadingValue = isLevelable
    ? description.match(/^([+\-$]?\d+\.?\d*[xk%]?)/)
    : null;

  const renderDescription = () => (
    <Text
      style={[
        styles.jokerDescription,
        variant === 'poster' && styles.posterDescription,
        variant === 'strip' && styles.stripDescription,
        variant === 'tile' && styles.tileDescription,
      ]}
      adjustsFontSizeToFit
      minimumFontScale={0.78}
    >
      {leadingValue ? (
        <>
          <Text style={{ color: levelColor, fontWeight: '700' }}>
            {leadingValue[1]}
          </Text>
          {description.slice(leadingValue[1].length)}
        </>
      ) : (
        description
      )}
      {liveSuffix}
    </Text>
  );

  const renderLevelDots = () =>
    isLevelable ? (
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
    ) : null;

  // A usable (one-time) wildcard that hasn't fired yet can be activated
  // right from its type badge (strip variant). Once used the badge greys out
  // and reads USED.
  const canActivate =
    joker.type === 'one-time' &&
    !disableActivation &&
    !isAfterSchool &&
    !isUsedToday;

  const renderTypeBadge = (interactive = false) => {
    const actionable = interactive && canActivate;
    const badgeColor = isUsedToday ? '#9ca3af' : typeColor;
    const label =
      variant === 'tile' ? typeEmoji : `${typeEmoji} ${typeText}`;

    if (!actionable) {
      return (
        <View
          style={[
            styles.typeBadge,
            variant === 'tile' && styles.tileCompactBadge,
            { borderColor: badgeColor, borderWidth: 1 },
            isUsedToday && styles.typeBadgeUsed,
          ]}
        >
          <TextWithEmojis
            style={{ ...styles.typeText, color: badgeColor }}
            imageSize={20}
          >
            {label}
          </TextWithEmojis>
        </View>
      );
    }

    // Tappable USE chip: red fill, gold border, visible pressed state (darker
    // fill + 1px push-down) that doesn't depend on the reduce-motion setting,
    // a generous hit area, and a haptic tick on press-in.
    return (
      <Pressable
        onPress={handleActivate}
        onPressIn={() => triggerTieredHaptic(0.2, 'selection')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`Use ${joker.name}`}
        style={({ pressed }) => [
          styles.typeBadge,
          styles.typeBadgeAction,
          pressed && styles.typeBadgeActionPressed,
        ]}
      >
        <TextWithEmojis
          style={{ ...styles.typeText, color: '#ffffff' }}
          imageSize={20}
        >
          {label}
        </TextWithEmojis>
      </Pressable>
    );
  };

  const renderUseButton = () =>
    joker.type === 'one-time' &&
    !disableActivation &&
    !isAfterSchool &&
    !isUsedToday ? (
      <PressableScale style={styles.useButton} onPress={handleActivate}>
        <Text style={styles.useButtonText}>USE</Text>
      </PressableScale>
    ) : null;

  const renderStateOverlays = () => (
    <>
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>✓</Text>
        </View>
      )}
      {showOwned && variant !== 'tile' && (
        <View style={styles.ownedBadge}>
          <Text style={styles.ownedBadgeText}>OWNED ✓</Text>
        </View>
      )}
    </>
  );

  const renderSynergyBadge = () => {
    const target =
      numericJokerId === JOKER_IDS.COMBO_PLATTER
        ? 2
        : numericJokerId === JOKER_IDS.TRIPLE_THREAT
          ? 3
          : null;
    if (coveredTypeCount === undefined || target === null) return null;
    const ready = coveredTypeCount >= target;
    return (
      <View
        style={[
          styles.synergyBadge,
          ready ? styles.synergyReady : styles.synergyPending,
        ]}
      >
        <Text style={[styles.synergyText, ready && styles.synergyTextReady]}>
          {ready
            ? `${coveredTypeCount}/${target} types ✓`
            : `${coveredTypeCount}/${target} types needed`}
        </Text>
      </View>
    );
  };

  return (
    <>
      <View ref={cardContainerRef} collapsable={false}>
        <PixelBorder
          // Selected = green; owned tile = sky blue (replaces the corner
          // OWNED tag on tiles); default = gold.
          borderColor={
            isSelected
              ? '#10b981'
              : showOwned && variant === 'tile'
                ? OWNED_BORDER
                : '#d4af37'
          }
          borderWidth={3}
          innerPadding={0}
        >
          <CardWrapper
            style={[
              styles.cardContainer,
              variantCardStyle,
              selectionDisabled && { opacity: 0.4 },
              containerStyle,
            ]}
            accessibilityRole={onPress || onLongPress ? 'button' : undefined}
            accessibilityLabel={`${joker.name}. ${typeText}. ${description}${liveSuffix}`}
            accessibilityState={{
              selected: isSelected,
              disabled: selectionDisabled,
            }}
            {...cardWrapperProps}
          >
            {variant === 'poster' && (
              <>
                <View style={styles.headerSection}>
                  <Text style={styles.jokerName}>{joker.name}</Text>
                  {renderLevelDots()}
                </View>
                <View style={styles.posterBody}>
                  <View style={styles.posterCopy}>
                    <View style={styles.badgeRow}>
                      {renderTypeBadge()}
                      {renderUseButton()}
                    </View>
                    {renderDescription()}
                    {renderSynergyBadge()}
                  </View>
                  <View style={styles.posterArtStage}>
                    <View style={styles.artBurst} />
                    <View style={styles.artBurst1} />
                    <Image
                      source={jokerArt}
                      style={styles.posterArt}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </>
            )}

            {variant === 'strip' && (
              <View style={styles.stripBody}>
                <View style={styles.stripArtStage}>
                  <View style={styles.artBurst} />
                  <View style={styles.artBurst1} />
                  <Image
                    source={jokerArt}
                    style={styles.stripArt}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.stripCopy}>
                  <Text style={[styles.jokerName, styles.stripName]}>
                    {joker.name}
                  </Text>
                  {renderDescription()}
                  {renderSynergyBadge()}
                  <Text style={styles.jokerFlavorText}>{flavorText}</Text>
                </View>
                <View style={styles.stripMeta}>
                  {renderLevelDots()}
                  {/* Badge always sits at the bottom of the column, with or
                      without level dots above it. */}
                  <View style={styles.stripBadgeSlot}>
                    {renderTypeBadge(true)}
                  </View>
                </View>
              </View>
            )}

            {variant === 'tile' && (
              <>
                <View style={styles.tileArtStage}>
                  <View style={styles.artBurst} />
                  <View style={styles.artBurst1} />
                  <Image
                    source={jokerArt}
                    style={styles.tileArt}
                    resizeMode="contain"
                  />
                  <View style={styles.tileTypeBadge}>{renderTypeBadge()}</View>
                  <View style={styles.tileDots}>{renderLevelDots()}</View>
                </View>
                <View style={styles.tileHeader}>
                  <Text style={[styles.jokerName, styles.tileName]}>
                    {joker.name}
                  </Text>
                </View>
                <View style={styles.tileInfo}>
                  {joker.type === 'one-time' &&
                    !disableActivation &&
                    !isAfterSchool &&
                    !isUsedToday && (
                      <View style={styles.tileBadgeRow}>
                        {renderUseButton()}
                      </View>
                    )}
                  {renderDescription()}
                  {renderSynergyBadge()}
                </View>
              </>
            )}
            {renderStateOverlays()}
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
          <PixelBorder
            borderColor={isAfterSchool ? '#8b5cf6' : '#d4a574'}
            borderWidth={3}
            backgroundColor={isAfterSchool ? '#1f2937' : '#ffffff'}
            innerPadding={24}
            style={[styles.modalContent, styles.jokerModalContent]}
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
          </PixelBorder>
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
          <PixelBorder
            borderColor="#d4a574"
            borderWidth={3}
            backgroundColor="#ffffff"
            innerPadding={24}
            style={styles.modalContent}
          >
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

            <ScrollView
              style={styles.jokerScrollView}
              showsVerticalScrollIndicator={false}
            >
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
                      gameData.candyPrices?.[candyType]?.[periodCount] || 0
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowConversionStep2(false);
                setSelectedSourceCandy(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </PixelBorder>
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
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  posterCard: {
    width: '100%',
    minHeight: 168,
  },
  stripCard: {
    width: '100%',
    minHeight: 92,
  },
  tileCard: {
    width: '100%',
    aspectRatio: 1,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3d77a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  jokerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#70501c',
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'left',
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
  typeBadgeAction: {
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#fbbf24',
    minWidth: 56,
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7f1d1d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 3,
  },
  typeBadgeActionPressed: {
    backgroundColor: '#991b1b',
    borderColor: '#fde68a',
    transform: [{ translateY: 1 }],
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  typeBadgeUsed: {
    backgroundColor: '#f3f4f6',
    borderStyle: 'dashed',
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
    marginLeft: 8,
    lineHeight: 14,
    fontFamily: 'PixeloidMono',
    fontWeight: '500',
    textAlign: 'left',
  },
  posterBody: {
    flex: 1,
    minHeight: 132,
    flexDirection: 'row',
  },
  posterCopy: {
    width: '58%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  posterDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginVertical: 6,
  },
  posterArtStage: {
    width: '42%',
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff4bd',
    overflow: 'hidden',
  },
  posterArt: {
    width: '92%',
    height: '92%',
    opacity: 1,
    zIndex: 1,
  },
  // Slanted accent stripe behind the art. Oversized so the rotated band spans
  // the whole stage corner to corner; the stage's overflow:hidden trims it.
  artBurst: {
    position: 'absolute',
    width: '220%',
    height: '38%',
    backgroundColor: 'rgba(250, 204, 21, 0.28)',
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ rotate: '-40deg' }],
  },
  artBurst1: {
    position: 'absolute',
    width: '220%',
    height: '58%',
    backgroundColor: 'rgba(250, 204, 21, 0.28)',
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ rotate: '-40deg' }],
  },
  stripBody: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stripArtStage: {
    width: 88,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff4bd',
    overflow: 'hidden',
  },
  stripArt: {
    width: 76,
    height: 76,
    opacity: 1,
    zIndex: 1,
  },
  stripCopy: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    justifyContent: 'flex-start',
  },
  stripName: {
    flex: 0,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: '#f3d77a',
    marginTop: -8,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stripDescription: {
    fontSize: 11,
    lineHeight: 14,
  },
  stripMeta: {
    width: 88,
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#eeeadd',
    gap: 5,
  },
  stripBadgeSlot: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  tileArtStage: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff4bd',
    overflow: 'hidden',
  },
  tileArt: {
    width: '78%',
    height: '78%',
    opacity: 1,
    zIndex: 1,
  },
  tileTypeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 2,
  },
  tileCompactBadge: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  tileDots: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
  },
  tileHeader: {
    minHeight: 28,
    justifyContent: 'center',
    backgroundColor: '#f3d77a',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tileName: {
    fontSize: 11,
    textAlign: 'center',
  },
  tileInfo: {
    minHeight: 54,
    paddingHorizontal: 7,
    paddingVertical: 5,
    justifyContent: 'center',
  },
  tileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 3,
  },
  tileDescription: {
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
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
  selectedBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    zIndex: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ecfdf5',
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  ownedBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    zIndex: 9,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  ownedBadgeText: {
    color: '#d4af37',
    fontSize: 7,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContent: {
    minHeight: 300,
    maxWidth: 600,
    maxHeight: '90%',
    flexShrink: 1,
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
  candyOptionAfterSchool: {
    backgroundColor: '#312e81',
    borderColor: '#8b5cf6',
  },
  candyOptionText: {
    color: '#6b4423',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  candyOptionTextAfterSchool: {
    color: '#f7e98e',
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
