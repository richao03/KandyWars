import React, { memo, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { JOKER_IDS } from '../../src/constants/jokerIds';
import { useGame } from '../../src/context/GameContext';
import { useInventory } from '../../src/context/InventoryContext';
import { useJokers } from '../../src/context/JokerContext';
import { useSeed } from '../../src/context/SeedContext';
import { useWallet } from '../../src/context/WalletContext';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import ConfirmationModal from './ConfirmationModal';

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
}

const CANDY_TYPES = [
  'Bubble Gum',
  'M&Ms',
  'Skittles',
  'Snickers',
  'Sour Patch Kids',
  'Warheads',
];

function JokerCard({
  joker,
  isAfterSchool,
  onLongPress,
  isDragging,
  isCompact,
  showOwned,
  disableActivation = false,
}: JokerCardProps) {
  const { jokers, activateJoker, addJoker } = useJokers();
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
  const [showCandySelector, setShowCandySelector] = useState(false);
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
  };

  const showAlert = (title: string, message: string, emoji = '✨') => {
    showConfirm(title, message, emoji, () => {}, 'OK');
  };

  const handleActivate = () => {
    if (joker.effect === 'double_candy_price') {
      // Show candy selector modal
      setShowCandySelector(true);
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
    } else if (joker.id === JOKER_IDS.MASTER_OF_TRADE) {
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
      setShowCandySelector(true);
    } else if (joker.id === JOKER_IDS.THE_BIG_SHORT) {
      // Show candy selector modal for big short
      setShowCandySelector(true);
    } else if (joker.id === JOKER_IDS.BET_YOU_IM_FASTER) {
      // Show candy selector modal for inventory filling
      setShowCandySelector(true);
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
    }
  };

  const handleCandySelection = async (candyType: string) => {
    if (joker.id === JOKER_IDS.MARKET_MANIPULATION) {
      // Handle Market Manipulation: set chosen candy to highest price
      const originalPrice = gameData.candyPrices[candyType]?.[periodCount] || 0;

      // Get all current candy prices for this period
      const allPrices: Record<string, number> = {};
      const CANDY_TYPES = [
        'Bubble Gum',
        'M&Ms',
        'Skittles',
        'Snickers',
        'Sour Patch Kids',
        'Warheads',
      ];
      CANDY_TYPES.forEach((candy) => {
        allPrices[candy] = gameData.candyPrices[candy]?.[periodCount] || 0;
      });

      // Find the highest price
      const highestPrice = Math.max(...Object.values(allPrices));

      // Set the chosen candy to the highest price
      modifyCandyPrice(candyType, periodCount, highestPrice);

      // Activate the joker (this will remove it from inventory)
      const success = await activateJoker(joker.id, candyType, periodCount);

      if (success) {
        showAlert(
          'Market Manipulation Activated!',
          `${candyType} price has been set to the highest market price!\n\nPrice: $${originalPrice.toFixed(2)} → $${highestPrice.toFixed(2)}`,
          '📈'
        );
      }
    } else if (joker.id === JOKER_IDS.THE_BIG_SHORT) {
      // Handle The Big Short: set chosen candy to lowest price
      const originalPrice = gameData.candyPrices[candyType]?.[periodCount] || 0;

      // Get all current candy prices for this period
      const allPrices: Record<string, number> = {};
      const CANDY_TYPES = [
        'Bubble Gum',
        'M&Ms',
        'Skittles',
        'Snickers',
        'Sour Patch Kids',
        'Warheads',
      ];
      CANDY_TYPES.forEach((candy) => {
        allPrices[candy] = gameData.candyPrices[candy]?.[periodCount] || 0;
      });

      // Find the lowest price
      const lowestPrice = Math.min(...Object.values(allPrices));

      // Set the chosen candy to the lowest price
      modifyCandyPrice(candyType, periodCount, lowestPrice);

      // Activate the joker (this will remove it from inventory)
      const success = await activateJoker(joker.id, candyType, periodCount);

      if (success) {
        showAlert(
          'The Big Short Activated!',
          `${candyType} price has been set to the lowest market price!\n\nPrice: $${originalPrice.toFixed(2)} → $${lowestPrice.toFixed(2)}`,
          '📉'
        );
      }
    } else if (joker.id === JOKER_IDS.BET_YOU_IM_FASTER) {
      // Handle Bet You I'm Faster: fill inventory with chosen candy
      await handleBetYouImFaster(candyType);
    } else {
      // Handle other price-doubling effects
      const originalPrice = gameData.candyPrices[candyType]?.[periodCount] || 0;
      const doubledPrice = originalPrice * 2;

      // Modify the actual game data for this period
      modifyCandyPrice(candyType, periodCount, doubledPrice);

      // Activate the joker (this will remove it from inventory)
      const success = await activateJoker(joker.id, candyType, periodCount);

      if (success) {
        showAlert(
          'Joker Activated!',
          `${joker.name} has been used to double the price of ${candyType} for this period.\n\nPrice: $${originalPrice.toFixed(2)} → $${doubledPrice.toFixed(2)}`,
          '✨'
        );
      }
    }
    setShowCandySelector(false);
  };

  const handleTimeRevert = async () => {
    const jokerActivated = await activateJoker(joker.id);
    if (jokerActivated) {
      const timeReverted = revertToPreviousPeriod();
      if (timeReverted) {
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
    }
  };

  const handleBetYouImFaster = async (candyType: string) => {
    const inventoryLimit = getInventoryLimit();
    const currentInventoryCount = getTotalInventoryCount();
    const availableSpace = inventoryLimit - currentInventoryCount;

    if (availableSpace <= 0) {
      showAlert(
        'Inventory Full!',
        'Your inventory is full! Clear some space first.',
        '📦'
      );
      setShowCandySelector(false);
      return;
    }

    // Fill inventory with chosen candy (free candy at $0 cost)
    const success = addToInventory(candyType, availableSpace, 0);

    if (success) {
      // Remove the joker (it's one-time use)
      await activateJoker(joker.id);

      showAlert(
        'Speed Demon Victory!',
        `Lightning fast! You filled your inventory with ${availableSpace} ${candyType} candies!`,
        '⚡'
      );
    } else {
      showAlert('Fill Failed!', 'Unable to fill inventory. Try again!', '❌');
    }

    setShowCandySelector(false);
  };

  const handlePeriodSelection = async (targetPeriod: number) => {
    if (jumpToPeriod && jumpToPeriod(targetPeriod)) {
      // Remove the joker (it's one-time use)
      await activateJoker(joker.id);

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
    const success = await activateJoker(joker.id);

    if (success) {
      showAlert(
        'Glitch Activated!',
        `Successfully created a copy of "${selectedJoker.name}". The glitch has been consumed.`,
        '🔄'
      );
    }

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

    const sourceInventoryItem = inventory[selectedSourceCandy];
    if (!sourceInventoryItem || sourceInventoryItem.quantity === 0) {
      showAlert('Error', 'No source candy available for conversion!', '⚠️');
      return;
    }

    const currentTotal = getTotalInventoryCount();
    const inventoryLimit = getInventoryLimit();
    console.log(
      `Master of Trade: Current inventory: ${currentTotal}/${inventoryLimit}`
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
    await activateJoker(joker.id);

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
  const availableCandiesForConversion = Object.keys(inventory).filter(
    (candyType) => inventory[candyType].quantity > 0
  );

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
    await activateJoker(joker.id);

    showAlert(
      "Emperor's Decree Executed!",
      `Time has been advanced by 2 periods (skipped period ${skippedPeriod}).\n\nAuto-profit from selling 3 of each candy:\n${profitBreakdown.join('\n')}\n\nTotal gained: $${totalProfit.toFixed(2)}`,
      '👑'
    );
  };

  const handleMarketCrash = async () => {
    // Remove the joker (it's one-time use)
    await activateJoker(joker.id);

    showAlert(
      'Market Crash Executed!',
      'All candy prices have been reduced by 50% for this period. Time to stock up!',
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
      console.log('🪙 Roman Coin: Activating joker with ID:', joker.id);
      const success = await activateJoker(joker.id);
      console.log('🪙 Roman Coin: Activation result:', success);

      if (success) {
        console.log('🪙 Roman Coin: Showing success alert');
        showAlert(
          'Roman Coin Sold!',
          'You sold the ancient Roman coin and received $200!',
          '🪙'
        );
      } else {
        console.log('🪙 Roman Coin: Activation failed, showing error');
        showAlert('Error', 'Failed to activate Roman Coin joker', '❌');
      }
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
      console.log('🎒 Lost and Found: Activating joker with ID:', joker.id);
      const success = await activateJoker(joker.id);
      console.log('🎒 Lost and Found: Activation result:', success);

      if (success) {
        console.log('🎒 Lost and Found: Showing success alert');
        showAlert(
          'Lost and Found!',
          `You found someone\'s lost lunch money and received $${maxAmount}!`,
          '🎒'
        );
      } else {
        console.log('🎒 Lost and Found: Activation failed, showing error');
        showAlert('Error', 'Failed to activate Lost and Found joker', '❌');
      }
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
      const success = await activateJoker(joker.id);
      console.log('⚡ Dodgeball Dash: Activation result:', success);

      if (success) {
        showAlert(
          'Dodgeball Dash Activated!',
          'Your next candy sale will earn double profit!',
          '⚡'
        );
      } else {
        showAlert('Error', 'Failed to activate Dodgeball Dash joker', '❌');
      }
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
      // Activate the joker to track the effect for this period
      const success = await activateJoker(joker.id, undefined, periodCount);
      console.log('🗣️ Pursuasion: Activation result:', success);

      if (success) {
        showAlert(
          'Pursuasion Activated!',
          'Your next candy sale will earn 2x profit!',
          '🗣️'
        );
      } else {
        showAlert('Error', 'Failed to activate Pursuasion joker', '❌');
      }
    } catch (error) {
      console.error('🗣️ Pursuasion: Error during activation:', error);
      showAlert(
        'Error',
        'An error occurred while activating Pursuasion',
        '❌'
      );
    }
  };

  // Memoize computed values to prevent recreation on every render
  const typeColor = useMemo(() => {
    if (joker.type === 'persistent') {
      return '#4ade80';
    }
    return '#fb7185';
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
  const cardWrapperProps = onLongPress
    ? { onLongPress, activeOpacity: 0.8 }
    : {};

  return (
    <>
      <View style={styles.jokerCard}>
        <View style={styles.cardContainer}>
          <CardWrapper style={styles.cardContent} {...cardWrapperProps}>
            <View style={styles.jokerHeader}>
              <View style={styles.jokerTitleRow}>
                <View style={styles.jokerTitleLeft}>
                  <Text
                    style={styles.jokerName}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {joker.name}
                  </Text>
                </View>
                <View style={styles.jokerTypeContainer}>
                  {showOwned && <Text style={styles.ownedIndicator}>✓</Text>}
                </View>
              </View>
            </View>
            <View style={styles.typeRow}>
              <Text style={[styles.typeIndicatorText, { color: typeColor }]}>
                {typeText}
              </Text>
              {joker.type === 'one-time' && !disableActivation && !isAfterSchool ? (
                <TouchableOpacity
                  style={styles.activateButton}
                  onPress={handleActivate}
                >
                  <Text style={styles.activateButtonText}>ACTIVATE</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
            </View>
            <View style={styles.descriptionContainer}>
              <Text
                style={styles.jokerDescription}
                numberOfLines={4}
                ellipsizeMode="tail"
              >
                {joker.description}{' '}
              </Text>

              <View style={styles.separator} />
              <Text
                style={styles.jokerFlavorText}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                {flavorText}
              </Text>
            </View>
          </CardWrapper>
        </View>
      </View>

      {/* Candy Selector Modal */}
      <Modal
        visible={showCandySelector}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {joker.id === JOKER_IDS.MARKET_MANIPULATION
                ? '📈 Choose Candy to Manipulate'
                : joker.id === JOKER_IDS.THE_BIG_SHORT
                  ? '📉 Choose Candy to Short'
                  : '🍭 Choose Candy to Double'}
            </Text>

            {CANDY_TYPES.map((candyType) => (
              <TouchableOpacity
                key={candyType}
                style={styles.candyOption}
                onPress={() => handleCandySelection(candyType)}
              >
                <Text style={styles.candyOptionText}>{candyType}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCandySelector(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Period Selector Modal */}
      <Modal
        visible={showPeriodSelector}
        transparent={true}
        animationType="slide"
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
      <Modal
        visible={showJokerSelector}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              styles.jokerModalContent,
              isAfterSchool && styles.modalContentAfterSchool,
            ]}
          >
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
          </View>
        </View>
      </Modal>

      {/* Candy Conversion Step 1: Select Source Modal */}
      <Modal
        visible={showConversionStep1}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              styles.jokerModalContent,
              isAfterSchool && styles.modalContentAfterSchool,
            ]}
          >
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
                        ×{inventory[candyType].quantity}
                      </Text>
                    </View>
                    <Text style={styles.candyAvgPrice}>
                      Avg: ${inventory[candyType].averagePrice.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noJokersContainer}>
                  <Text style={styles.noJokersText}>No candy to convert!</Text>
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
          </View>
        </View>
      </Modal>

      {/* Candy Conversion Step 2: Select Target Modal */}
      <Modal
        visible={showConversionStep2}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔄 Convert to Which Candy?</Text>

            {selectedSourceCandy && (
              <Text style={styles.conversionSummary}>
                Converting: {inventory[selectedSourceCandy].quantity}{' '}
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

      {/* Confirmation Modal */}
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
    </>
  );
}

const styles = StyleSheet.create({
  jokerCard: {
    borderRadius: 15,
    marginTop: 6,
    borderColor: '#6b4423',
    borderWidth: 3,
    elevation: 13,
    flex: 1,
    height: 180,
  },
  cardContainer: {
    borderRadius: 12,
    backgroundColor: '#fefaf5',
    flex: 1,
  },
  cardContent: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingBottom: 4,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  jokerHeader: {
    // marginBottom: 4,
    paddingTop: 2,
    paddingBottom: 2,
    marginLeft: -8,
    marginRight: -8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    backgroundColor: '#6b4423',
    borderBottomColor: 'rgba(212, 165, 116, 0.2)',
  },
  jokerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jokerTitleLeft: {
    flex: 1,
    marginLeft: 8,
  },
  jokerName: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'CrayonPastel',
    marginBottom: 2,
    lineHeight: 16,
  },
  jokerType: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontFamily: 'CrayonPastel',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(107, 68, 35, 0.3)',
  },
  jokerTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownedIndicator: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#22c55e',
    backgroundColor: '#f0fdf4',
    width: 16,
    height: 16,
    borderRadius: 8,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderWidth: 1,
    borderColor: '#22c55e',
    marginRight: 2,
  },

  descriptionContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    minHeight: 120,
  },
  jokerDescription: {
    fontSize: 14,
    color: '#5d4037',
    lineHeight: 18,
    fontFamily: 'CrayonPastel',
    fontWeight: '600',
    marginTop: 4,
    maxHeight: 72,
    flex: 0,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(212, 165, 116, 0.3)',
    marginVertical: 4,
  },
  jokerFlavorText: {
    fontSize: 12,
    color: '#8b4513',
    lineHeight: 16,
    fontFamily: 'CrayonPastel',
    fontStyle: 'italic',
    opacity: 0.9,
    marginBottom: 0,
    height: 48,
    flex: 0,
    textAlignVertical: 'top',
  },
  activateButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#22c55e',
    marginTop: 4,
  },
  activateButtonText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
    textTransform: 'uppercase',
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
  },
  typeIndicator: {
    alignSelf: 'flex-end',
  },
  typeIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
    marginTop: 4,
    fontFamily: 'CrayonPastel',
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
    fontFamily: 'CrayonPastel',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxWidth: 300,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
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
    fontFamily: 'CrayonPastel',
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
    fontFamily: 'CrayonPastel',
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
    fontFamily: 'CrayonPastel',
    flex: 1,
  },
  jokerOptionType: {
    fontSize: 16,
    fontWeight: '600',
  },
  jokerOptionDescription: {
    fontSize: 14,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
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
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
  },
  noJokersSubtext: {
    fontSize: 14,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
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
    fontFamily: 'CrayonPastel',
  },
  candyAvgPrice: {
    fontSize: 12,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    opacity: 0.8,
  },
  conversionSummary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5e6d3',
    borderRadius: 8,
  },
  targetPrice: {
    fontSize: 12,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    opacity: 0.8,
    marginTop: 2,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
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
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  currentPeriodText: {
    color: '#888888',
  },
});

// Memoize the component to prevent unnecessary rerenders
export default memo(JokerCard);
