import React, { memo, useMemo, useState } from 'react';
import {
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
  onShowConfirmation,
  onShowCandySelector,
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

  const showConfirm = (
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
  };

  const showAlert = (title: string, message: string, emoji = '✨') => {
    showConfirm(title, message, emoji, () => {}, 'OK');
  };

  const handleActivate = () => {
    if (joker.effect === 'double_candy_price') {
      // Show candy selector modal
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
      setShowJokerSelector(true);
    } else if (joker.id === JOKER_IDS.MASTER_NEGOTIATOR) {
      // Show candy conversion modal - step 1 (select source)
      setShowConversionStep1(true);
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
      // Show confirmation for Lost and Found activation
      showConfirm(
        'Lost and Found',
        "Find someone's lost lunch money worth $100?",
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
        'Randomize all candy prices for this period?',
        '🌍',
        () => handleContinentalDrift(),
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
    }
  };

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
      '🔄'
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
      '🔄'
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
      console.log('🪙 Roman Coin: Adding $200 to wallet');
      addMoney(200);

      // Remove the joker (it's one-time use)
      console.log('🪙 Roman Coin: Removing joker with ID:', joker.id);
      removeJoker(joker.id);

      console.log('🪙 Roman Coin: Showing success alert');
      showAlert(
        'Roman Coin Sold!',
        'You sold the ancient Roman coin and received $200!',
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

  const handleLostAndFound = async () => {
    console.log('🎒 Lost and Found: Starting activation');

    try {
      // Generate maximum find money event (typically $50-100)
      const maxAmount = 100; // Max amount for found money events
      console.log(`🎒 Lost and Found: Adding $${maxAmount} to wallet`);
      addMoney(maxAmount);

      // Remove the joker (it's one-time use)
      console.log('🎒 Lost and Found: Removing joker with ID:', joker.id);
      removeJoker(joker.id);

      console.log('🎒 Lost and Found: Showing success alert');
      showAlert(
        'Lost and Found!',
        `You found someone\'s lost lunch money and received $${maxAmount}!`,
        '🎒'
      );
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

    try {
      // Remove the joker (it's one-time use)
      removeJoker(joker.id);
      console.log('🗣️ Pursuasion: Joker removed from inventory');

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
    console.log('🧁 Bake Sale: Starting activation');

    try {
      // Add $1000 to wallet
      addMoney(1000);
      console.log('🧁 Bake Sale: Added $1000 to wallet');

      // Remove the joker (it's one-time use)
      removeJoker(joker.id);
      console.log('🧁 Bake Sale: Joker removed from inventory');

      showAlert(
        'Bake Sale Success!',
        'You collected $1000 from your bake sale! Cash rules everything around me!',
        '🧁'
      );
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

  const CardWrapper = onLongPress ? TouchableOpacity : View;
  const handleContinentalDrift = async () => {
    console.log(
      '🌍 Continental Drift: Starting activation - randomizing all candy prices'
    );

    try {
      // Define candy types (you may need to adjust these based on your game's candy types)
      const candyTypes = [
        'Skittles',
        'M&Ms',
        'Sour Patch Kids',
        'Twix',
        'Snickers',
        'Kit Kat',
        'Jaw Breaker',
      ];

      // Randomize prices for all candy types
      const priceChanges: string[] = [];
      candyTypes.forEach((candyType) => {
        // Generate a random price between $5-$25
        const minPrice = 5;
        const maxPrice = 25;
        const newPrice =
          Math.floor(Math.random() * (maxPrice - minPrice + 1)) + minPrice;

        // Get the original price for comparison
        const originalPrice = getOriginalCandyPrice(candyType);

        // Apply the new randomized price
        modifyCandyPrice(candyType, newPrice);

        priceChanges.push(`${candyType}: $${originalPrice} → $${newPrice}`);
        console.log(
          `🌍 Continental Drift: ${candyType} price changed from $${originalPrice} to $${newPrice}`
        );
      });

      // Remove the joker (it's one-time use)
      removeJoker(joker.id);

      showAlert(
        'Continental Drift Activated!',
        `The market landscape has shifted! All candy prices have been randomized for this period:\n\n${priceChanges.join('\n')}`,
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
    console.log('🏔️ Atlas Bonus: Starting activation - adding $1500');

    try {
      // Add $1500 to wallet
      addMoney(1500);

      // Remove the joker (it's one-time use)
      removeJoker(joker.id);

      showAlert(
        'Atlas Bonus Activated!',
        'The weight of the world brings heavy profits! You gained $1500.',
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

          {/* Type Badge */}
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <TextWithEmojis style={styles.typeText} imageSize={12}>
              {`${typeEmoji} ${typeText}`}
            </TextWithEmojis>
          </View>

          {/* Main Content */}
          <View style={styles.contentSection}>
            <Text style={styles.jokerDescription}>{joker.description}</Text>
          </View>

          {/* Footer Section */}
          <View style={styles.footerSection}>
            <Text style={styles.jokerFlavorText}>{flavorText}</Text>

            {joker.type === 'one-time' &&
              !disableActivation &&
              !isAfterSchool && (
                <TouchableOpacity
                  style={styles.activateButton}
                  onPress={handleActivate}
                >
                  <Text style={styles.activateButtonText}>PLAY CARD</Text>
                </TouchableOpacity>
              )}
          </View>
        </CardWrapper>
      </PixelBorder>

      {/* Period Selector Modal */}
      <FastModal
        visible={showPeriodSelector}
        onClose={() => setShowPeriodSelector(false)}
        animationType="spring"
        backdropOpacity={0.5}
        modalStyle={styles.modalContent}
      >
        <>
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
        </>
      </FastModal>

      {/* Joker Selector Modal */}
      <FastModal
        visible={showJokerSelector}
        onClose={() => setShowJokerSelector(false)}
        animationType="spring"
        backdropOpacity={0.5}
        modalStyle={[
          styles.modalContent,
          styles.jokerModalContent,
          isAfterSchool && styles.modalContentAfterSchool,
        ]}
      >
        <>
          <Text style={styles.modalTitle}>🔄 Choose Joker to Copy</Text>

          <ScrollView
            style={styles.jokerScrollView}
            showsVerticalScrollIndicator={false}
          >
            {availableJokersForDuplication.length > 0 ? (
              availableJokersForDuplication.map((availableJoker) => (
                <TouchableOpacity
                  key={availableJoker.id}
                  style={styles.jokerOption}
                  onPress={() => handleJokerSelection(availableJoker)}
                >
                  <View style={styles.jokerOptionHeader}>
                    <Text style={styles.jokerOptionName}>
                      {availableJoker.name}
                    </Text>
                    <Text
                      style={[
                        styles.jokerOptionType,
                        {
                          color:
                            availableJoker.type === 'persistent'
                              ? '#4ade80'
                              : '#fb7185',
                        },
                      ]}
                    >
                      {availableJoker.type === 'persistent' ? '🔄' : '⚡'}
                    </Text>
                  </View>
                  <Text style={styles.jokerOptionDescription}>
                    {availableJoker.description}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noJokersContainer}>
                <Text style={styles.noJokersText}>
                  No other jokers to copy!
                </Text>
                <Text style={styles.noJokersSubtext}>
                  Study to earn more jokers first
                </Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowJokerSelector(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      </FastModal>

      {/* Candy Conversion Step 1: Select Source Modal */}
      <FastModal
        visible={showConversionStep1}
        onClose={() => setShowConversionStep1(false)}
        animationType="spring"
        backdropOpacity={0.5}
        modalStyle={[
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
                <Text style={styles.noJokersText}>No candy to convert!</Text>
                <Text style={styles.noJokersSubtext}>Buy some candy first</Text>
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
      </FastModal>

      {/* Candy Conversion Step 2: Select Target Modal */}
      <FastModal
        visible={showConversionStep2}
        onClose={() => setShowConversionStep2(false)}
        animationType="spring"
        backdropOpacity={0.5}
        modalStyle={styles.modalContent}
      >
        <>
          <Text style={styles.modalTitle}>🔄 Convert to Which Candy?</Text>

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
                {(gameData.candyPrices[candyType]?.[periodCount] || 0).toFixed(
                  2
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
        </>
      </FastModal>

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
  typeBadge: {
    alignSelf: 'flex-start',
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
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    width: '80%',
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
    maxHeight: '80%',
  },
  jokerScrollView: {
    maxHeight: 300,
    marginBottom: 16,
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
