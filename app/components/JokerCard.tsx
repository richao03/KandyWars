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

import { JOKER_IDS } from '../../src/constants/jokerIds';
import { CANDY_NAMES } from '../../src/constants/candyRegistry';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import ConfirmationModal from './ConfirmationModal';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import TextWithEmojis from './TextWithEmojis';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface JokerCardProps {
  joker: {
    id: number;
    name: string;
    subject: string;
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

  const handleActivate = useCallback(() => {
    // For copied jokers, use originalId for activation checks
    const activationId = (joker as any).originalId || joker.id;

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
      if (__DEV__) console.log(
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
      if (__DEV__) console.log('🚫 Joker already used today:', joker.name, 'ID:', joker.id);
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
    if (__DEV__) console.log(
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
    } else if (activationId === JOKER_IDS.MASTER_NEGOTIATOR) {
      // Show candy selector modal for conversion
      onShowCandySelector?.(joker);
    } else if (activationId === JOKER_IDS.TEMPORARY_EMPEROR) {
      // Show confirmation for time skip with auto profits
      showConfirm(
        'Temporary Emperor',
        'Skip one period and automatically gain profits from selling 3 of every candy type at next period prices?',
        '👑',
        () => handleTemporaryEmperor(),
        'Rule the Market!',
        'Cancel',
        () => {}
      );
    } else if (activationId === JOKER_IDS.MARKET_MANIPULATION) {
      // Show candy selector modal for market manipulation
      onShowCandySelector?.(joker);
    } else if (activationId === JOKER_IDS.THE_BIG_SHORT) {
      // Show candy selector modal for big short
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
        'Cash rules everything around me! Instantly gain $3000?',
        '🧁',
        () => handleBakeSale(),
        'Collect Money!',
        'Cancel',
        () => {}
      );
    } else if (activationId === JOKER_IDS.CONTINENTAL_DRIFT) {
      // Show confirmation for Continental Drift
      showConfirm(
        'Continental Drift',
        'Shuffle all candy prices for this period?',
        '🌍',
        () => handleContinentalDrift(),
        'Activate',
        'Cancel',
        () => {}
      );
    } else if (activationId === JOKER_IDS.ATLAS_BONUS) {
      // Show confirmation for Atlas Bonus
      showConfirm(
        'Atlas Bonus',
        'Instantly gain $2500?',
        '🏔️',
        () => handleAtlasBonus(),
        'Collect Money',
        'Cancel',
        () => {}
      );
    } else {
      // Log unhandled instant joker activation
      if (__DEV__) console.warn(
        '⚠️ Unhandled instant joker activation:',
        joker.name,
        'ID:',
        joker.id,
        'Effect:',
        joker.effect
      );
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
    if (__DEV__) console.log(
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

    if (__DEV__) console.log(
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

  const handleTemporaryEmperor = async () => {
    // Mark the joker as used today FIRST to prevent double-activation
    // Use originalId for copies so all copies share the same "used" status
    const activationId = (joker as any).originalId || joker.id;
    markJokerUsedToday(activationId.toString());

    const skippedPeriod = periodCount + 1;
    const targetPeriod = periodCount + 2; // Skip one period, go to period after next
    let totalProfit = 0;
    const profitBreakdown = [];

    // Calculate profit from selling 3 of each candy type at target period prices
    for (const candyType of CANDY_TYPES) {
      const targetPeriodPrice = gameData.candyPrices[candyType][targetPeriod];
      if (targetPeriodPrice) {
        const profit = targetPeriodPrice * 3;
        totalProfit += profit;
        profitBreakdown.push(`${candyType}: $${profit.toFixed(2)}`);
      }
    }

    // Add money to wallet
    addMoney(totalProfit);

    // Skip a period by advancing twice (period 5 -> period 7, skipping period 6)
    incrementPeriod('market'); // First advance: period 5 -> period 6
    incrementPeriod('market'); // Second advance: period 6 -> period 7 (skip period 6)

    showAlert(
      "Emperor's Decree Executed!",
      `Time has been advanced by 2 periods (skipped period ${skippedPeriod}).\n\nAuto-profit from selling 3 of each candy:\n${profitBreakdown.join('\n')}\n\nTotal gained: $${totalProfit.toFixed(2)}`,
      '👑'
    );
  };

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
      if (__DEV__) console.log(
        '🪙 Roman Coin: Marking joker as used, ID:',
        joker.id,
        'Type:',
        typeof joker.id
      );
      // Use originalId for copies so all copies share the same "used" status
      const activationId = (joker as any).originalId || joker.id;
      markJokerUsedToday(activationId.toString());
      if (__DEV__) console.log(
        '🪙 Roman Coin: markJokerUsedToday called, waiting for state update...'
      );

      // Add $200 to wallet
      if (__DEV__) console.log('🪙 Roman Coin: Adding $2000 to wallet');
      addMoney(2000);

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

      showAlert(
        'Bake Sale Success!',
        'You collected $3000 from your bake sale! Cash rules everything around me!',
        '🧁'
      );
    } catch (error) {
      console.error('🧁 Bake Sale: Error during activation:', error);
      showAlert('Error', 'An error occurred while activating Bake Sale', '❌');
    }
  };

  const typeColor = joker.type === 'persistent' ? '#0071E3' : '#dc2626';
  const typeEmoji = joker.type === 'persistent' ? '🔮' : '⚡';
  const typeText = joker.type === 'persistent'
    ? 'Aura'
    : usedTodayJokerIds.includes(joker.id.toString())
      ? 'Used'
      : 'Instant';
  const flavorText = joker.flavorText
    || STANDARDIZED_JOKERS.find((sj) => sj.id === joker.id)?.flavorText
    || 'Mysterious power awaits...';

  const CardWrapper = onLongPress || debugMode ? TouchableOpacity : View;

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

  const handleContinentalDrift = async () => {
    if (__DEV__) console.log(
      '🌍 Continental Drift: Starting activation - shuffling candy prices'
    );

    try {
      // Mark the joker as used today FIRST to prevent double-activation
      // Use originalId for copies so all copies share the same "used" status
      const activationId = (joker as any).originalId || joker.id;
      markJokerUsedToday(activationId.toString());

      // Use candy registry
      const candyTypes = CANDY_TYPES;

      // Get all current prices for this period
      const currentPrices = candyTypes.map((candyType) => ({
        candy: candyType,
        price: getOriginalCandyPrice(candyType, periodCount),
      }));

      if (__DEV__) console.log('🌍 Continental Drift: Current prices:', currentPrices);

      // Extract just the prices and shuffle them
      const prices = currentPrices.map((cp) => cp.price);

      // Fisher-Yates shuffle algorithm
      for (let i = prices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [prices[i], prices[j]] = [prices[j], prices[i]];
      }

      if (__DEV__) console.log('🌍 Continental Drift: Shuffled prices:', prices);

      // Apply shuffled prices to candies
      const priceChanges: string[] = [];
      candyTypes.forEach((candyType, index) => {
        const originalPrice = currentPrices[index].price;
        const newPrice = prices[index];

        // Apply the shuffled price
        modifyCandyPrice(candyType, newPrice, periodCount);

        priceChanges.push(
          `${candyType}: $${originalPrice.toFixed(2)} → $${newPrice.toFixed(2)}`
        );
        if (__DEV__) console.log(
          `🌍 Continental Drift: ${candyType} price changed from $${originalPrice} to $${newPrice}`
        );
      });

      showAlert(
        'Continental Drift Activated!',
        `The market landscape has shifted! All candy prices have been shuffled:\n\n${priceChanges.join('\n')}`,
        '🌍'
      );
    } catch (error) {
      console.error('🌍 Continental Drift: Error during activation:', error);
      showAlert(
        'Error',
        'An error occurred while activating Continental Drift',
        '❌'
      );
    }
  };

  const handleAtlasBonus = async () => {
    if (__DEV__) console.log('🏔️ Atlas Bonus: Starting activation - adding $2500');

    try {
      // Mark the joker as used today FIRST to prevent double-activation
      // Use originalId for copies so all copies share the same "used" status
      const activationId = (joker as any).originalId || joker.id;
      markJokerUsedToday(activationId.toString());

      // Add $2500 to wallet (Lv1 amount)
      addMoney(2500);

      showAlert(
        'Atlas Bonus Activated!',
        'The weight of the world brings heavy profits! You gained $2500.',
        '🏔️'
      );
    } catch (error) {
      console.error('🏔️ Atlas Bonus: Error during activation:', error);
      showAlert(
        'Error',
        'An error occurred while activating Atlas Bonus',
        '❌'
      );
    }
  };

  const cardWrapperProps = onLongPress
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
      <PixelBorder borderColor="#d4af37" borderWidth={3} innerPadding={0}>
        <CardWrapper style={styles.cardContainer} {...cardWrapperProps}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.jokerName}>{joker.name}</Text>
            {(() => {
              const standardized = STANDARDIZED_JOKERS.find(sj => sj.id === joker.id);
              const maxLevel = standardized?.maxLevel ?? 1;
              const jokerLevel = (joker as any).level ?? 1;
              if (maxLevel > 1) {
                return (
                  <View style={styles.levelBadgeContainer}>
                    {[1, 2, 3].map(i => (
                      <View
                        key={i}
                        style={[
                          styles.levelDot,
                          i <= jokerLevel ? styles.levelDotFilled : styles.levelDotEmpty,
                        ]}
                      />
                    ))}
                  </View>
                );
              }
              return null;
            })()}
            {showOwned && <View style={styles.ownedIndicator} />}
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
                <TouchableOpacity
                  style={styles.useButton}
                  onPress={handleActivate}
                >
                  <Text style={styles.useButtonText}>USE</Text>
                </TouchableOpacity>
              )}
          </View>

          {/* Main Content */}
          <View style={styles.contentSection}>
            <Text style={styles.jokerDescription}>{joker.description}</Text>
          </View>

          {/* Footer Section */}
          <View style={styles.footerSection}>
            <Text style={styles.jokerFlavorText}>{flavorText}</Text>
          </View>
        </CardWrapper>
      </PixelBorder>

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
                        {(
                          inventory.find((item) => item.name === candyType)
                            ?.price || 0
                        ).toFixed(2)}
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
                  {(
                    gameData.candyPrices[candyType]?.[periodCount] || 0
                  ).toFixed(2)}
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
  levelDotFilled: {
    backgroundColor: '#fbbf24',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
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
});

// Memoize the component to prevent unnecessary rerenders
export default memo(JokerCard);
