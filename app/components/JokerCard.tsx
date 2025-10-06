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
  onShowJokerSelector?: (joker: any) => void;
  onTriggerEvent?: (eventData: any) => void;
}

const CANDY_TYPES = [
  'Bubble Gum',
  'M&Ms',
  'Skittles',
  'Snickers',
  'Sour Patch Kids',
  'Warheads',
  'Jaw Breaker',
];

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
  onShowJokerSelector,
  onTriggerEvent,
}: JokerCardProps) {
  const { jokers, activateJoker, addJoker, removeJoker } = useJokers();
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
  const [showJokerSelector, setShowJokerSelector] = useState(false);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false); // Select period for time travel
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
    if (isActivating.current) {
      console.log('🃏 Activation already in progress, ignoring duplicate call for:', joker.name);
      return;
    }

    if (disableActivation) {
      console.log('🃏 Activation disabled for:', joker.name);
      return;
    }

    isActivating.current = true;
    console.log('🃏 handleActivate called for joker:', joker.name, 'ID:', joker.id);

    // Reset the flag after a short delay
    setTimeout(() => {
      isActivating.current = false;
    }, 1000); // Increased to 1 second

    if (joker.id === JOKER_IDS.DOUBLE_UP || joker.effect === 'double_candy_price') {
      // Show candy selector modal for Double Up
      onShowCandySelector?.(joker);
    } else if (joker.effect === 'revert_period') {
      // Show confirmation for time revert
      showConfirm(
        'Time Equation',
        'Are you sure you want to revert to the previous period? This cannot be undone.',
        '⏰',
        () => handleTimeRevert(),
        'Revert Time',
        'Cancel',
        () => {}
      );
    } else if (joker.id === JOKER_IDS.GLITCH_IN_THE_MATRIX) {
      // Show joker selector modal for duplication
      if (onShowJokerSelector) {
        onShowJokerSelector(joker);
      } else {
        setShowJokerSelector(true);
      }
    } else if (joker.id === JOKER_IDS.MASTER_NEGOTIATOR) {
      // Show candy selector modal for conversion
      onShowCandySelector?.(joker);
    } else if (joker.id === JOKER_IDS.TEMPORARY_EMPEROR) {
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
    } else if (joker.id === JOKER_IDS.MARKET_CRASH) {
      // Show confirmation for market crash
      showConfirm(
        'Market Crash',
        'Crash all candy prices by 50% for this period? Perfect for bulk buying!',
        '📉',
        () => handleMarketCrash(),
        'Crash the Market!',
        'Cancel',
        () => {}
      );
    } else if (joker.id === JOKER_IDS.MARKET_MANIPULATION) {
      // Show candy selector modal for market manipulation
      onShowCandySelector?.(joker);
    } else if (joker.id === JOKER_IDS.THE_BIG_SHORT) {
      // Show candy selector modal for big short
      onShowCandySelector?.(joker);
    } else if (joker.id === JOKER_IDS.PROPACANDIES) {
      // Show candy selector modal for Propacandies
      onShowCandySelector?.(joker);
    } else if (joker.id === JOKER_IDS.BET_YOU_IM_FASTER) {
      // Show candy selector modal for inventory filling
      onShowCandySelector?.(joker);
    } else if (joker.id === JOKER_IDS.TACHYONIC_SPRINT) {
      // Show period selector modal for time travel
      setShowPeriodSelector(true);
    } else if (joker.id === JOKER_IDS.ROMAN_COIN) {
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
    } else if (joker.id === JOKER_IDS.LOST_AND_FOUND) {
      // Generate random amount for preview
      const baseAmount = Math.floor(Math.random() * 401) + 100; // 100 to 500
      const hasHideAndSeek = jokers.some((j: any) => j.id === JOKER_IDS.HIDE_AND_SEEK);
      const finalAmount = hasHideAndSeek ? baseAmount * 3 : baseAmount;

      showConfirm(
        'Lost and Found',
        hasHideAndSeek
          ? `Find someone's lost lunch money! You'll find $${baseAmount} (tripled to $${finalAmount} with Hide and Seek!)`
          : `Find someone's lost lunch money worth $${baseAmount}?`,
        '🎒',
        () => handleLostAndFound(),
        'Find Money',
        'Cancel',
        () => {}
      );
    } else if (joker.id === JOKER_IDS.DODGEBALL_DASH) {
      // Show confirmation for Dodgeball Dash activation
      showConfirm(
        'Dodgeball Dash',
        'Set up your next sale to earn double profit?',
        '⚡',
        () => handleDodgeballDash(),
        'Activate',
        'Cancel',
        () => {}
      );
    } else if (joker.id === JOKER_IDS.PURSUASION) {
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
    } else if (joker.id === JOKER_IDS.BAKE_SALE) {
      // Show confirmation for Bake Sale
      showConfirm(
        'Bake Sale',
        'Cash rules everything around me! Instantly gain $1000?',
        '🧁',
        () => handleBakeSale(),
        'Collect Money!',
        'Cancel',
        () => {}
      );
    } else if (joker.id === JOKER_IDS.CONTINENTAL_DRIFT) {
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
    } else if (joker.id === JOKER_IDS.TROJAN_HORSE) {
      // Show confirmation for Trojan Horse
      showConfirm(
        'Trojan Horse',
        'Skip one period and get 5 of every candy (even if it overflows)?',
        '🐴',
        () => handleTrojanHorse(),
        'Activate',
        'Cancel',
        () => {}
      );
    } else if (joker.id === JOKER_IDS.ATLAS_BONUS) {
      // Show confirmation for Atlas Bonus
      showConfirm(
        'Atlas Bonus',
        'Instantly gain $1500?',
        '🏔️',
        () => handleAtlasBonus(),
        'Collect Money',
        'Cancel',
        () => {}
      );
    } else {
      // Log unhandled instant joker activation
      console.warn('⚠️ Unhandled instant joker activation:', joker.name, 'ID:', joker.id, 'Effect:', joker.effect);
      showAlert(
        'Not Implemented',
        `The activation for "${joker.name}" is not yet implemented.`,
        '🚧'
      );
    }
  }, [joker, disableActivation, onShowCandySelector, onShowJokerSelector, showConfirm, showAlert]);

  const handleTimeRevert = async () => {
    const timeReverted = revertToPreviousPeriod();
    if (timeReverted) {
      // Remove the joker (it's one-time use)
      removeJoker(joker.id);

      showAlert(
        'Time Reversed!',
        'You have successfully reverted to the previous period. Use this knowledge wisely!',
        '⏰'
      );
    } else {
      showAlert(
        'Time Revert Failed',
        'Cannot revert time from the first period.',
        '⏰'
      );
    }
  };

  const handlePeriodSelection = async (targetPeriod: number) => {
    if (jumpToPeriod && jumpToPeriod(targetPeriod)) {
      // Remove the joker (it's one-time use)
      removeJoker(joker.id);

      showAlert(
        'Tachyonic Sprint Activated!',
        `Time has bent to your will! You have traveled back to period ${targetPeriod}.\n\nYour wallet and inventory remain intact, but game events and prices have been reset.`,
        '⚡'
      );
    } else {
      showAlert(
        'Time Travel Failed!',
        `Unable to travel to period ${targetPeriod}. The timeline remains unchanged.`,
        '❌'
      );
    }
    setShowPeriodSelector(false);
  };

  const handleJokerSelection = async (selectedJoker: any) => {
    // Create a copy of the selected joker with a new ID
    const duplicatedJoker = {
      ...selectedJoker,
      id: Date.now() + Math.random(), // Generate unique ID
      name: selectedJoker.name + ' (Copy)',
    };

    // Add the duplicated joker
    addJoker(duplicatedJoker);

    // Remove the Glitch in the Matrix joker (it's one-time use)
    removeJoker(joker.id);

    showAlert(
      'Glitch Activated!',
      `Successfully created a copy of "${selectedJoker.name}". The glitch has been consumed.`,
      'refresh'
    );

    setShowJokerSelector(false);
  };

  // Get available jokers for duplication (exclude the Glitch in the Matrix card itself)
  const availableJokersForDuplication = jokers.filter(
    (j) => j.name !== 'Glitch in the Matrix'
  );

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

    const currentTotal = getTotalInventoryCount();
    console.log(
      `Master of Trade: Current inventory: ${currentTotal}/${memoizedInventoryLimit}`
    );
    console.log(
      `Master of Trade: Converting ${sourceInventoryItem.quantity} ${selectedSourceCandy} to ${targetCandyType}`
    );

    // Get current target candy price for conversion
    const targetPrice =
      gameData.candyPrices[targetCandyType]?.[periodCount] || 0;
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

    console.log(
      `Master of Trade: Successfully converted ${sourceInventoryItem.quantity} ${selectedSourceCandy} to ${targetCandyType}`
    );

    // Remove the Master of Trade joker (it's one-time use)
    removeJoker(joker.id);

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

    // Remove the joker (it's one-time use)
    removeJoker(joker.id);

    showAlert(
      "Emperor's Decree Executed!",
      `Time has been advanced by 2 periods (skipped period ${skippedPeriod}).\n\nAuto-profit from selling 3 of each candy:\n${profitBreakdown.join('\n')}\n\nTotal gained: $${totalProfit.toFixed(2)}`,
      '👑'
    );
  };

  const handleMarketCrash = async () => {
    const priceChanges = [];

    // Reduce all candy prices by 50% for the current period
    for (const candyType of CANDY_TYPES) {
      const originalPrice = gameData.candyPrices[candyType]?.[periodCount] || 0;
      const crashedPrice = Math.max(originalPrice * 0.5, 0.01); // 50% reduction, minimum $0.01

      console.log(
        `🔧 Market Crash: ${candyType} - Original: $${originalPrice.toFixed(2)}, Crashed: $${crashedPrice.toFixed(2)}`
      );
      modifyCandyPrice(candyType, crashedPrice, periodCount);
      priceChanges.push(
        `${candyType}: $${originalPrice.toFixed(2)} → $${crashedPrice.toFixed(2)}`
      );
    }

    // Remove the joker (it's one-time use)
    console.log(
      '🔧 Market Crash: Attempting to remove joker with ID:',
      joker.id,
      'Type:',
      typeof joker.id
    );
    removeJoker(joker.id);
    console.log('🔧 Market Crash: removeJoker called');

    showAlert(
      'Market Crash Executed!',
      `All candy prices have been reduced by 50% for this period!\n\n${priceChanges.join('\n')}\n\nTime to stock up!`,
      '📉'
    );
  };

  const handleRomanCoin = async () => {
    console.log('🪙 Roman Coin: Starting activation');

    try {
      // Add $200 to wallet
      console.log('🪙 Roman Coin: Adding $2000 to wallet');
      addMoney(2000);

      console.log('🪙 Roman Coin: Showing success alert');
      showAlert(
        'Roman Coin Sold!',
        'You sold the ancient Roman coin and received $2000!',
        '🪙'
      );

      // Remove the joker after a delay to avoid interfering with modal
      setTimeout(() => {
        console.log('🪙 Roman Coin: Removing joker with ID:', joker.id);
        removeJoker(joker.id);
      }, 500);
    } catch (error) {
      console.error('🪙 Roman Coin: Error during activation:', error);
      showAlert(
        'Error',
        'An error occurred while activating the Roman Coin',
        '❌'
      );
    }
  };

  const handleLostAndFound = async () => {
    console.log('🎒 Lost and Found: Starting activation');

    try {
      // Generate random amount between $100-$500
      const baseAmount = Math.floor(Math.random() * 401) + 100; // 100 to 500

      // Check for Hide and Seek joker (triples found money)
      const hasHideAndSeek = jokers.some((j: any) => j.id === JOKER_IDS.HIDE_AND_SEEK);
      const finalAmount = hasHideAndSeek ? baseAmount * 3 : baseAmount;

      console.log(`🎒 Lost and Found: Found $${baseAmount}${hasHideAndSeek ? ` × 3 (Hide and Seek) = $${finalAmount}` : ''}`);

      // Trigger the found money event through the event handler
      if (onTriggerEvent) {
        const eventData = {
          description: 'Found some money!',
          effect: 'FOUND_MONEY' as const,
          category: 'good' as const,
          heading: 'Lucky!',
          title: 'You found some money!',
          subtitle: hasHideAndSeek
            ? `With Hide and Seek, you found $${finalAmount}!`
            : `You found $${finalAmount}!`,
          dollarAmount: finalAmount,
          backgroundImage: 'foundmoney',
        };

        onTriggerEvent(eventData);
      } else {
        // Fallback if no event handler
        addMoney(finalAmount);
        showAlert(
          'Lost and Found!',
          `You found $${finalAmount}!${hasHideAndSeek ? ' (Tripled by Hide and Seek)' : ''}`,
          '🎒'
        );
      }

      // Remove the joker after a delay to avoid interfering with modal
      setTimeout(() => {
        console.log('🎒 Lost and Found: Removing joker with ID:', joker.id);
        removeJoker(joker.id);
      }, 500);
    } catch (error) {
      console.error('🎒 Lost and Found: Error during activation:', error);
      showAlert(
        'Error',
        'An error occurred while activating Lost and Found',
        '❌'
      );
    }
  };

  const handleDodgeballDash = async () => {
    console.log('⚡ Dodgeball Dash: Starting activation');

    try {
      // This joker sets up a "next sale doubles" effect
      // We'll need to track this in the sales system
      console.log('⚡ Dodgeball Dash: Setting up next sale multiplier');

      // Remove the joker (it's one-time use)
      removeJoker(joker.id);
      console.log('⚡ Dodgeball Dash: Joker removed from inventory');

      showAlert(
        'Dodgeball Dash Activated!',
        'Your next candy sale will earn double profit!',
        '⚡'
      );
    } catch (error) {
      console.error('⚡ Dodgeball Dash: Error during activation:', error);
      showAlert(
        'Error',
        'An error occurred while activating Dodgeball Dash',
        '❌'
      );
    }
  };

  const handlePersuasion = async () => {
    console.log('🗣️ Pursuasion: Starting activation');
    console.log('🗣️ Pursuasion: Current period:', periodCount);
    console.log('🗣️ Pursuasion: Joker ID:', joker.id);

    try {
      // Activate the joker effect for current period
      const activated = await activateJoker(Number(joker.id), undefined, periodCount);
      console.log('🗣️ Pursuasion: Effect activated result:', activated);
      console.log('🗣️ Pursuasion: Effect activated for period', periodCount);

      // Show alert BEFORE removing joker to avoid re-render interference
      showAlert(
        'Pursuasion Activated!',
        'Your next candy sale will earn 2x profit!',
        '🗣️'
      );

      // Remove the joker after a delay to avoid interfering with modal
      setTimeout(() => {
        removeJoker(joker.id);
        console.log('🗣️ Pursuasion: Joker removed from inventory');
      }, 500);
    } catch (error) {
      console.error('🗣️ Pursuasion: Error during activation:', error);
      showAlert('Error', 'An error occurred while activating Pursuasion', '❌');
    }
  };

  const handleBakeSale = async () => {
    console.log('🧁 Bake Sale: Starting activation');

    try {
      // Add $1000 to wallet
      addMoney(1000);
      console.log('🧁 Bake Sale: Added $1000 to wallet');

      showAlert(
        'Bake Sale Success!',
        'You collected $1000 from your bake sale! Cash rules everything around me!',
        '🧁'
      );

      // Remove the joker after a delay to avoid interfering with modal
      setTimeout(() => {
        removeJoker(joker.id);
        console.log('🧁 Bake Sale: Joker removed from inventory');
      }, 500);
    } catch (error) {
      console.error('🧁 Bake Sale: Error during activation:', error);
      showAlert('Error', 'An error occurred while activating Bake Sale', '❌');
    }
  };

  // Memoize computed values to prevent recreation on every render
  const typeColor = useMemo(() => {
    if (joker.type === 'persistent') {
      return '#0071E3'; // Gold for persistent (aura)
    }
    return '#dc2626'; // Red for one-time (instant)
  }, [joker.type]);

  const typeEmoji = useMemo(() => {
    if (joker.type === 'persistent') {
      return '🔮'; // Gold for persistent (aura)
    }
    return '⚡';
  }, [joker.type]);

  const typeText = useMemo(() => {
    return joker.type === 'persistent' ? 'Aura' : 'Instant';
  }, [joker.type]);

  // Get flavor text from standardized jokers if missing (for backward compatibility)
  const flavorText = useMemo(() => {
    if (joker.flavorText) {
      return joker.flavorText;
    }
    // Look up flavor text from standardized jokers
    const standardizedJoker = STANDARDIZED_JOKERS.find(
      (sj) => sj.id === joker.id
    );
    return standardizedJoker?.flavorText || 'Mysterious power awaits...';
  }, [joker.id, joker.flavorText]);

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
    console.log(
      '🌍 Continental Drift: Starting activation - shuffling candy prices'
    );

    try {
      // Define candy types (matches the game's candy types)
      const candyTypes = [
        'Snickers',
        'M&Ms',
        'Skittles',
        'Warheads',
        'Sour Patch Kids',
        'Bubble Gum',
        'Jaw Breaker',
      ];

      // Get all current prices for this period
      const currentPrices = candyTypes.map((candyType) => ({
        candy: candyType,
        price: getOriginalCandyPrice(candyType, periodCount),
      }));

      console.log('🌍 Continental Drift: Current prices:', currentPrices);

      // Extract just the prices and shuffle them
      const prices = currentPrices.map((cp) => cp.price);

      // Fisher-Yates shuffle algorithm
      for (let i = prices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [prices[i], prices[j]] = [prices[j], prices[i]];
      }

      console.log('🌍 Continental Drift: Shuffled prices:', prices);

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
        console.log(
          `🌍 Continental Drift: ${candyType} price changed from $${originalPrice} to $${newPrice}`
        );
      });

      // Remove the joker (it's one-time use)
      removeJoker(joker.id);

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

  const handleTrojanHorse = async () => {
    console.log(
      '🐴 Trojan Horse: Starting activation - skipping period and adding candy'
    );

    try {
      // Define candy types
      const candyTypes = [
        'Snickers',
        'M&Ms',
        'Skittles',
        'Warheads',
        'Sour Patch Kids',
        'Bubble Gum',
        'Jaw Breaker',
      ];

      // Add 5 of each candy type (even if it overflows inventory)
      candyTypes.forEach((candyType) => {
        const currentPrice = getOriginalCandyPrice(candyType, periodCount);
        addToInventory(candyType, 5, currentPrice);
        console.log(
          `🐴 Trojan Horse: Added 5 ${candyType} at $${currentPrice.toFixed(2)}`
        );
      });

      // Skip one period
      incrementPeriod();
      console.log('🐴 Trojan Horse: Skipped one period');

      // Remove the joker (it's one-time use)
      removeJoker(joker.id);

      showAlert(
        'Trojan Horse Activated!',
        `Smuggled in 5 of every candy and skipped ahead one period!`,
        '🐴'
      );
    } catch (error) {
      console.error('🐴 Trojan Horse: Error during activation:', error);
      showAlert(
        'Error',
        'An error occurred while activating Trojan Horse',
        '❌'
      );
    }
  };

  const handleAtlasBonus = async () => {
    console.log('🏔️ Atlas Bonus: Starting activation - adding $1500');

    try {
      // Add $1500 to wallet
      addMoney(1500);

      showAlert(
        'Atlas Bonus Activated!',
        'The weight of the world brings heavy profits! You gained $1500.',
        '🏔️'
      );

      // Remove the joker after a delay to avoid interfering with modal
      setTimeout(() => {
        removeJoker(joker.id);
      }, 500);
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

  return (
    <>
      <PixelBorder borderColor="#d4af37" borderWidth={3} innerPadding={0}>
        <CardWrapper style={styles.cardContainer} {...cardWrapperProps}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.jokerName}>{joker.name}</Text>
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
              !isAfterSchool && (
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

      {/* Period Selector Modal */}
      <Modal
        visible={showPeriodSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPeriodSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚡ Choose Period to Travel To</Text>

            <Text style={styles.modalSubtitle}>
              Current Period: {periodCount}
            </Text>

            {Array.from({ length: periodCount + 1 }, (_, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.periodOption,
                  i === periodCount && styles.currentPeriodOption,
                ]}
                onPress={() => handlePeriodSelection(i)}
                disabled={i === periodCount}
              >
                <Text
                  style={[
                    styles.periodOptionText,
                    i === periodCount && styles.currentPeriodText,
                  ]}
                >
                  Period {i} {i === periodCount ? '(Current)' : ''}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPeriodSelector(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Joker Selector Modal */}
      <FastModal
        visible={showJokerSelector}
        onClose={() => setShowJokerSelector(false)}
        animationType="spring"
        backdropOpacity={0.5}
        modalStyle={styles.modalContent}
      >
        <>
          <View style={{ alignItems: 'center' }}>
            <Image
              source={require('../../assets/images/emojis/refresh.png')}
              style={{ width: 54, height: 54, resizeMode: 'contain', marginBottom: 12 }}
            />
          </View>
          <TextWithEmojis style={styles.modalTitle} imageSize={24}>
            Choose Joker to Copy
          </TextWithEmojis>

          {availableJokersForDuplication.length > 0 ? (
            availableJokersForDuplication.map((availableJoker) => (
              <TouchableOpacity
                key={availableJoker.id}
                style={styles.jokerSelectButton}
                onPress={() => handleJokerSelection(availableJoker)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.jokerSelectButtonText}>
                    {availableJoker.name}{' '}
                  </Text>
                  {availableJoker.type === 'persistent' ? (
                    <Image
                      source={require('../../assets/images/emojis/refresh.png')}
                      style={{ width: 14, height: 14, resizeMode: 'contain', marginLeft: 4 }}
                    />
                  ) : (
                    <Text style={styles.jokerSelectButtonText}>⚡</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noJokersContainer}>
              <Text style={styles.noJokersText}>No other jokers to copy!</Text>
              <Text style={styles.noJokersSubtext}>
                Study to earn more jokers first
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowJokerSelector(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      </FastModal>

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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Image
                source={require('../../assets/images/emojis/refresh.png')}
                style={{ width: 20, height: 20, resizeMode: 'contain', marginRight: 8 }}
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
  jokerCard: {
    marginTop: 8,
    flex: 1,
    height: 180,
  },
  cardContainer: {
    backgroundColor: '#f8f8f0',
    padding: 8,
    borderRadius: 12,
    minHeight: 160,
    justifyContent: 'space-between',
  },

  bottomCorner: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    marginTop: -12,
    marginHorizontal: -8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    marginTop: 8,
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
  activateButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  activateButtonText: {
    color: '#d4af37',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  persistentIndicator: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  persistentText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
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
  jokerSelectButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  jokerSelectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  jokerOption: {
    backgroundColor: '#f5e6d3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d4a574',
  },
  jokerOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jokerOptionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    flex: 1,
  },
  jokerOptionType: {
    fontSize: 16,
    fontWeight: '600',
  },
  jokerOptionDescription: {
    fontSize: 14,
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
    lineHeight: 18,
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
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 16,
  },
  periodOption: {
    padding: 16,
    backgroundColor: '#f5e6d3',
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d4a574',
  },
  currentPeriodOption: {
    backgroundColor: '#e0e0e0',
    borderColor: '#999999',
    opacity: 0.6,
  },
  periodOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  currentPeriodText: {
    color: '#888888',
  },
});

// Memoize the component to prevent unnecessary rerenders
export default memo(JokerCard);
