import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CopilotStep, useCopilot, walkthroughable } from 'react-native-copilot';
import { JOKER_IDS, findJokerById } from '../../src/constants/jokerIds';
import { useCandySales } from '../../src/context/CandySalesContext';
import { useDailyStats } from '../../src/context/DailyStatsContext';
import { useEventHandler } from '../../src/context/EventHandlerContext';
import { useGame } from '../../src/context/GameContext';
import { useInventory } from '../../src/context/InventoryContext';
import { useJokers } from '../../src/context/JokerContext';
import { useSeed } from '../../src/context/SeedContext';
import { useWallet } from '../../src/context/WalletContext';
import { useDiamondHand } from '../../src/hooks/useDiamondHand';
import { useDroughtRelief } from '../../src/hooks/useDroughtRelief';
import { useEmptyInventoryBonus } from '../../src/hooks/useEmptyInventoryBonus';
import { usePriceDoubling } from '../../src/hooks/usePriceDoubling';
import { JokerService } from '../../src/utils/jokerService';
import ConfirmationModal from '../components/ConfirmationModal';
import DayStatsModal from '../components/DayStatsModal';
import DeliModal from '../components/DeliModal';
import EndOfDayModal from '../components/EndOfDayModal';
import EventModal from '../components/EventModal';
import GameHUD from '../components/GameHUD';
import LocationModal, { Location } from '../components/LocationModal';
import SchoolsOutModal from '../components/SchoolsOutModal';
import SleepConfirmModal from '../components/SleepConfirmModal';
import StashMoneyModal from '../components/StashMoneyModal';
import TransactionModal from '../components/TransactionModal';

const CopilotView = walkthroughable(View);
const CopilotTouchableOpacity = walkthroughable(TouchableOpacity);
// import { useJokerTutorial } from '../../src/hooks/useJokerTutorial';

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

type CandyForMarket = Candy & {
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
  priceBreakdown?: PriceBreakdown;
};

const baseCandies = [
  { name: 'Snickers', baseMin: 1.5, baseMax: 20 },
  { name: 'M&Ms', baseMin: 1.0, baseMax: 25 },
  { name: 'Skittles', baseMin: 0.75, baseMax: 22 },
  { name: 'Warheads', baseMin: 0.25, baseMax: 10 },
  { name: 'Sour Patch Kids', baseMin: 1.0, baseMax: 27 },
  { name: 'Bubble Gum', baseMin: 0.1, baseMax: 5 },
  { name: 'Jaw Breaker', baseMin: 2, baseMax: 30 },
];

function Market(props) {
  const {
    rng,
    seed,
    gameData,
    modifyCandyPrice,
    getOriginalCandyPrice,
    restoreCandyPrice,
  } = useSeed();

  const { balance, spend, add } = useWallet();
  const {
    start: startCopilot,
    eventEmitter,
    copilotEvents,
    isFirstStep,
    currentStep,
  } = useCopilot();

  // Debug copilot state
  useEffect(() => {
    console.log(
      '🎓 Copilot state - isFirstStep:',
      isFirstStep,
      'currentStep:',
      currentStep
    );
  }, [isFirstStep, currentStep]);

  // Debug when component mounts and track active view
  useEffect(() => {
    console.log(
      '🎓 Market component mounted with Day:',
      day,
      'Period:',
      period
    );
    console.log('🎓 Market component - CopilotSteps should be rendered now');

    // Track that user is now in market view
    setLastActiveView('market');
  }, [setLastActiveView]);
  // useJokerTutorial(); // Register for joker tutorial
  const {
    inventory,
    addToInventory,
    removeFromInventory,
    getTotalInventoryCount,
    getInventoryLimit,
  } = useInventory();
  const {
    day,
    period,
    incrementPeriod,
    periodCount,
    currentLocation,
    startAfterSchool,
    setLastActiveView,
  } = useGame();
  const { hasActiveEvent } = useEventHandler();
  const { getTotalStats, addProfit, addSpent, addCandySold } = useDailyStats();
  const { addSale, resetSales, consecutivePeriodSales } = useCandySales();
  const [pendingLocationModal, setPendingLocationModal] = useState(false);
  const { activeEffects, jokers, removeJoker } = useJokers();
  const jokerService = JokerService.getInstance();
  usePriceDoubling(); // This hook handles price restoration on period change
  useEmptyInventoryBonus(); // This hook handles Embrace the Grind joker bonus
  const { recordSale } = useDiamondHand(); // This hook handles Diamond Hand joker bonus
  const { recordSale: recordDroughtSale } = useDroughtRelief(); // This hook handles Drought Relief joker bonus

  // Tutorial disabled - no automatic tutorial on day 1
  const shouldShowTutorial = false;
  const tutorialStarted = useRef(false);

  // Show location modal after event modal is dismissed
  useEffect(() => {
    if (pendingLocationModal && !hasActiveEvent) {
      console.log('Market - Event dismissed, showing pending location modal');
      // Small delay to ensure event modal is fully dismissed
      setTimeout(() => {
        setLocationModalVisible(true);
        setPendingLocationModal(false);
      }, 200);
    }
  }, [hasActiveEvent, pendingLocationModal]);

  // Safety: Clear pending modal if location changes (period advanced)
  useEffect(() => {
    if (pendingLocationModal) {
      console.log('Market - Location/period changed, clearing pending modal');
      setPendingLocationModal(false);
    }
  }, [currentLocation, periodCount]);

  const [candies, setCandies] = useState<CandyForMarket[]>(() =>
    baseCandies.map((candy) => ({
      ...candy,
      cost: candy.baseMin, // Initialize with base minimum price
      quantityOwned: 0,
      averagePrice: null,
    }))
  );

  useEffect(() => {
    const currentInventoryLimit = getInventoryLimit();

    setCandies((prev) =>
      prev.map((candy) => {
        // Check for current location-specific events with price overrides
        const currentEvent = gameData.periodEvents.find(
          (e) =>
            e.period === periodCount &&
            e.location === currentLocation &&
            e.candy === candy.name &&
            e.priceOverride !== undefined
        );

        // Get the TRUE base price (before any modifications) for accurate breakdown
        // Use a consistent fallback price based on the candy name and period
        const seed = candy.name.charCodeAt(0) + periodCount;
        const random = Math.sin(seed) * 10000;
        const normalizedRandom = random - Math.floor(random);
        const trueBasePrice =
          candy.baseMin + normalizedRandom * (candy.baseMax - candy.baseMin);

        // Get the current modified price from game data (includes Trojan Horse, etc.)
        let currentPrice = gameData.candyPrices[candy.name]?.[periodCount];
        if (currentPrice === undefined || currentPrice === null) {
          currentPrice = trueBasePrice;
        }

        // Get price breakdown showing base price and joker effects
        const priceBreakdown = jokerService.getPriceBreakdown(
          trueBasePrice,
          jokers,
          periodCount,
          currentInventoryLimit,
          activeEffects
        );

        const finalCost =
          currentEvent?.priceOverride !== undefined
            ? currentEvent.priceOverride
            : currentPrice;

        // Get inventory information for this candy
        const inventoryItem = inventory[candy.name];

        return {
          ...candy,
          cost: finalCost,
          quantityOwned: inventoryItem?.quantity || 0,
          averagePrice: inventoryItem?.averagePrice || null,
          priceBreakdown:
            currentEvent?.priceOverride === undefined
              ? priceBreakdown
              : undefined, // Only show breakdown if not overridden by events
        };
      })
    );
  }, [
    periodCount,
    gameData,
    currentLocation,
    inventory,
    jokers,
    getInventoryLimit,
  ]);

  const [selectedCandyIndex, setSelectedCandyIndex] = useState<number | null>(
    null
  );
  const [modalMode, setModalMode] = useState<'buy' | 'sell'>('buy');
  const [isTransactionModalOpening, setIsTransactionModalOpening] =
    useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [dayStatsModalVisible, setDayStatsModalVisible] = useState(false);
  const [schoolsOutModalVisible, setSchoolsOutModalVisible] = useState(false);
  const [endOfDayModalVisible, setEndOfDayModalVisible] = useState(false);
  const [stashMoneyModalVisible, setStashMoneyModalVisible] = useState(false);
  const [completedActivities, setCompletedActivities] = useState({
    studiedHome: false,
    stashedMoney: false,
    visitedDeli: false,
  });
  const [deliModalVisible, setDeliModalVisible] = useState(false);
  const [sleepConfirmModalVisible, setSleepConfirmModalVisible] =
    useState(false);
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    emoji: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    emoji: '',
    onConfirm: () => {},
  });
  const [endDayConfirmVisible, setEndDayConfirmVisible] = useState(false);
  const [isEarlyEndDay, setIsEarlyEndDay] = useState(false);

  const openModal = useCallback((index: number) => {
    setIsTransactionModalOpening(true);
    setSelectedCandyIndex(index);
    setModalMode('buy'); // default to buy, but modal will let user pick
  }, []);

  const closeModal = () => {
    setIsTransactionModalOpening(false);
    setSelectedCandyIndex(null);
  };

  const handleTransaction = (quantity: number, mode: 'buy' | 'sell') => {
    if (selectedCandyIndex === null) return;
    const selectedCandy = candies[selectedCandyIndex];
    const isFirstBuy =
      day === 1 && getTotalInventoryCount() === 0 && mode === 'buy';
    const isFirstSell = day === 1 && mode === 'sell';

    setCandies((prev) =>
      prev.map((candy, i) => {
        if (i !== selectedCandyIndex) return candy;

        if (mode === 'buy') {
          const totalCost = candy.cost * quantity;
          if (balance < totalCost) {
            return candy;
          }

          // Try to add to inventory first - this will check inventory limits
          const inventorySuccess = addToInventory(
            candy.name,
            quantity,
            candy.cost
          );
          if (!inventorySuccess) {
            // Inventory is full, transaction fails
            return candy;
          }

          spend(totalCost);
          addSpent(totalCost); // Track daily spending

          // Reset consecutive sales tracking when buying
          resetSales();

          const newQty = candy.quantityOwned + quantity;
          const newAvg =
            candy.averagePrice === null
              ? candy.cost
              : (candy.averagePrice * candy.quantityOwned +
                  candy.cost * quantity) /
                newQty;

          return {
            ...candy,
            quantityOwned: newQty,
            averagePrice: newAvg,
          };
        } else {
          // Record sale for Diamond Hand tracking
          recordSale();

          // Record sale for Drought Relief tracking
          recordDroughtSale();

          // Check for sale bonuses
          const saleResult = addSale(candy.name);
          let multiplier = 1;

          // Apply Candy Salad bonus if applicable
          if (saleResult.shouldApplyCandySaladBonus) {
            multiplier *= 5;
          }

          // Apply Jump Rope Rhythm bonus if applicable
          if (saleResult.shouldApplyJumpRopeBonus) {
            multiplier *= 1.33;
          }

          // Check for one-time sell multiplier jokers (like Pursuasion)
          const sellMultiplierInfo = jokerService.hasOneTimeSellMultiplier(
            jokers,
            periodCount,
            activeEffects
          );
          if (sellMultiplierInfo.hasEffect && sellMultiplierInfo.multiplier) {
            multiplier *= sellMultiplierInfo.multiplier;

            // Note: One-time sell multiplier jokers are automatically handled by the joker system
            console.log(
              `🗣️ ${sellMultiplierInfo.jokerName} activated! ${sellMultiplierInfo.multiplier}x multiplier applied`
            );
          }

          // Check for Even Stevens and Odd Todd jokers
          const inventoryLimit = getInventoryLimit();
          const evenStevensJoker = findJokerById(
            jokers,
            JOKER_IDS.EVEN_STEVENS
          );
          const oddToddJoker = findJokerById(jokers, JOKER_IDS.ODD_TODD);

          if (evenStevensJoker && inventoryLimit % 2 === 0) {
            multiplier *= 1.1; // 10% bonus for even inventory limit
            console.log(
              `⚖️ Even Stevens: +10% sales bonus applied (inventory limit: ${inventoryLimit})`
            );
          } else if (oddToddJoker && inventoryLimit % 2 === 1) {
            multiplier *= 1.1; // 10% bonus for odd inventory limit
            console.log(
              `🎭 Odd Todd: +10% sales bonus applied (inventory limit: ${inventoryLimit})`
            );
          }

          // Check for Recess jokers
          const hopscotchJoker = findJokerById(
            jokers,
            JOKER_IDS.HOPSCOTCH_BONUS
          );
          const swingsetJoker = findJokerById(
            jokers,
            JOKER_IDS.SWINGSET_MOMENTUM
          );

          // Hopscotch Bonus: Every even period sales get +20%
          if (hopscotchJoker && period % 2 === 0) {
            multiplier *= 1.2; // 20% bonus for even periods
            console.log(
              `🏃 Hopscotch Bonus: +20% sales bonus applied (period ${period} is even)`
            );
          }

          // Swingset Momentum: Each consecutive period with a sale gets +10% sale price
          if (swingsetJoker && consecutivePeriodSales > 1) {
            const swingsetMultiplier = 1 + (consecutivePeriodSales - 1) * 0.1; // +10% per consecutive period
            multiplier *= swingsetMultiplier;
            console.log(
              `⛹️ Swingset Momentum: ${((swingsetMultiplier - 1) * 100).toFixed(0)}% sales bonus applied (${consecutivePeriodSales} consecutive periods)`
            );
          }

          const baseGain = candy.cost * quantity;
          const totalGain = baseGain * multiplier;

          console.log(
            '🛒 Market: Selling candy:',
            candy.name,
            'quantity:',
            quantity,
            'price:',
            candy.cost,
            'baseGain:',
            baseGain,
            'multiplier:',
            multiplier,
            'totalGain:',
            totalGain
          );
          add(totalGain);
          addProfit(totalGain); // Track daily profit
          addCandySold(quantity); // Track daily candy sales
          removeFromInventory(candy.name, quantity);

          // Show bonus notifications if applied
          const hasAnyBonus =
            saleResult.shouldApplyCandySaladBonus ||
            saleResult.shouldApplyJumpRopeBonus ||
            sellMultiplierInfo.hasEffect ||
            (hopscotchJoker && period % 2 === 0) ||
            (swingsetJoker && consecutivePeriodSales > 1);

          if (hasAnyBonus) {
            setTimeout(() => {
              let title = 'Sale Bonus!';
              let message = '';
              let emoji = '💰';
              let bonusDetails: string[] = [];

              if (sellMultiplierInfo.hasEffect) {
                bonusDetails.push(
                  `🗣️ ${sellMultiplierInfo.jokerName}: ${sellMultiplierInfo.multiplier}x multiplier`
                );
              }
              if (saleResult.shouldApplyCandySaladBonus) {
                bonusDetails.push(`🥗 Candy Salad: 5x bonus`);
              }
              if (saleResult.shouldApplyJumpRopeBonus) {
                bonusDetails.push(`🪩 Jump Rope Rhythm: 33% bonus (3rd sale)`);
              }
              if (hopscotchJoker && period % 2 === 0) {
                bonusDetails.push(
                  `🏃 Hopscotch Bonus: 20% bonus (even period)`
                );
              }
              if (swingsetJoker && consecutivePeriodSales > 1) {
                bonusDetails.push(
                  `⛹️ Swingset Momentum: ${((1 + (consecutivePeriodSales - 1) * 0.1 - 1) * 100).toFixed(0)}% bonus (${consecutivePeriodSales} consecutive periods)`
                );
              }

              if (bonusDetails.length > 1) {
                title = 'Multiple Bonuses!';
                emoji = '🎉';
              } else if (saleResult.shouldApplyJumpRopeBonus) {
                title = 'Jump Rope Rhythm!';
                emoji = '🪩';
              }

              message =
                bonusDetails.join('\n') +
                `\n\nBase gain: $${baseGain.toFixed(2)}\nTotal gain: $${totalGain.toFixed(2)}`;

              setConfirmationModal({
                visible: true,
                title,
                message,
                emoji,
                onConfirm: () =>
                  setConfirmationModal((prev) => ({ ...prev, visible: false })),
              });
            }, 100);
          }

          return {
            ...candy,
            quantityOwned: candy.quantityOwned - quantity,
          };
        }
      })
    );

    closeModal();
  };

  const handleNextDay = () => {
    console.log(
      '🔵 handleNextDay called - period:',
      period,
      'day:',
      day,
      'hasActiveEvent:',
      hasActiveEvent
    );
    // Trigger success haptic feedback when advancing to next period
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (period === 8) {
      // End of day - show day stats first
      console.log(
        '🔵 Period 8 reached - showing day stats modal for day:',
        day
      );
      console.log(
        '🔵 Current dayStatsModalVisible state:',
        dayStatsModalVisible
      );
      setDayStatsModalVisible(true);
      console.log('🔵 setDayStatsModalVisible(true) called');
    } else {
      // Check if there's an active event
      if (hasActiveEvent) {
        console.log(
          '🔵 Market - Active event detected, will show location modal after event is dismissed'
        );
        setPendingLocationModal(true);
      } else {
        console.log(
          '🔵 Market - No active event, showing location modal immediately'
        );
        console.log('🔵 Setting locationModalVisible to true');
        setLocationModalVisible(true);
        console.log('🔵 locationModalVisible should now be true');
      }
    }
  };

  const handleLocationSelect = (location: Location) => {
    console.log('Market - Location selected:', location);
    setLocationModalVisible(false); // Ensure modal closes
    incrementPeriod(location);
  };

  const handleEndDay = () => {
    console.log('🏠 End Day button pressed');
    setEndDayConfirmVisible(true);
  };

  const handleEndDayConfirm = () => {
    console.log('🏠 End Day confirmed');
    // Trigger success haptic feedback when ending day
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setEndDayConfirmVisible(false);

    // Don't advance periods - just show day stats to simulate end of day
    console.log('🏠 Ending day early - showing day stats modal');

    // Reset all modal states first, then show day stats
    setTimeout(() => {
      console.log('🏠 Resetting all modal states');
      setLocationModalVisible(false);
      setSchoolsOutModalVisible(false);
      setEndOfDayModalVisible(false);
      setStashMoneyModalVisible(false);
      setDeliModalVisible(false);
      setSleepConfirmModalVisible(false);

      // Then show day stats modal (this simulates end of day)
      setTimeout(() => {
        console.log('🏠 Now showing DayStatsModal for day:', day);
        console.log(
          '🏠 Current dayStatsModalVisible state before setting:',
          dayStatsModalVisible
        );
        setDayStatsModalVisible(true);
        console.log('🏠 setDayStatsModalVisible(true) called via End Day');
      }, 100);
    }, 200);
  };

  const handleEndDayCancel = () => {
    setEndDayConfirmVisible(false);
  };

  // Day stats modal handler
  const handleDayStatsClose = () => {
    console.log('📊 Day stats modal closing');
    setDayStatsModalVisible(false);

    // Show schools out modal first
    console.log('📊 Showing schools out modal');
    setSchoolsOutModalVisible(true);
  };

  // Schools out modal handler
  const handleSchoolsOutComplete = () => {
    console.log('🏫 Schools out modal complete');
    setSchoolsOutModalVisible(false);

    // Now navigate to after school
    console.log('🏫 Navigating to after school');
    startAfterSchool();
    router.push('/(tabs)/after-school');
  };

  // End of day handlers
  const handleGoHome = () => {
    console.log('Going home to study...');
    setEndOfDayModalVisible(false);
    // Navigate to the study page
    router.push('/study');
  };

  const handleStashMoney = () => {
    setEndOfDayModalVisible(false);
    setStashMoneyModalVisible(true);
  };

  const handleGoDeli = () => {
    setEndOfDayModalVisible(false);
    setDeliModalVisible(true);
  };

  const handleGoToSleep = () => {
    // Show confirmation modal instead of immediately ending the day
    setEndOfDayModalVisible(false);
    setSleepConfirmModalVisible(true);
  };

  const handleSleepConfirm = () => {
    // End the day and start new day
    setSleepConfirmModalVisible(false);
    incrementPeriod('home room'); // Start next day at home room
  };

  const handleSleepCancel = () => {
    // Return to end of day modal
    setSleepConfirmModalVisible(false);
    setEndOfDayModalVisible(true);
  };

  const handleMoneyStashed = () => {
    setStashMoneyModalVisible(false);
    // Mark stashing as completed and return to end-of-day modal
    setCompletedActivities((prev) => ({ ...prev, stashedMoney: true }));
    setEndOfDayModalVisible(true);
  };

  // Handle returning from deli
  const handleDeliReturn = () => {
    setDeliModalVisible(false);
    setCompletedActivities((prev) => ({ ...prev, visitedDeli: true }));
    setEndOfDayModalVisible(true);
  };

  const selectedCandy =
    selectedCandyIndex !== null ? candies[selectedCandyIndex] : null;

  // Calculate max buy quantity considering both money and inventory space
  const totalInventory = getTotalInventoryCount();
  const inventoryCapacity = getInventoryLimit();
  const availableInventorySpace = inventoryCapacity - totalInventory;

  const maxBuyQty =
    selectedCandy && selectedCandy.cost > 0
      ? Math.min(
          Math.floor(balance / selectedCandy.cost), // Money constraint
          availableInventorySpace // Inventory space constraint
        )
      : 0;

  const maxSellQty = selectedCandy ? selectedCandy.quantityOwned : 0;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/school.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.contentContainer}>
          <CopilotStep
            text="🎒 Welcome to Candy Wars! This is your HUD showing your wallet balance, piggy bank savings, and inventory. Let's learn how to become the school's candy mogul!"
            order={1}
            name="market_hud"
          >
            <CopilotView>
              <GameHUD
                isModalOpening={isTransactionModalOpening}
                isModalOpen={selectedCandyIndex !== null}
                flavorTextWrapper={(children) => (
                  <CopilotStep
                    text="The Rumor Mill shows important information and hints! Keep an eye on these scrolling messages - they might reveal price trends, special events, or valuable tips from other students."
                    order={2}
                    name="market_rumor_mill"
                  >
                    <CopilotView>{children}</CopilotView>
                  </CopilotStep>
                )}
              />
            </CopilotView>
          </CopilotStep>

          {/* Tutorial Welcome Banner for Day 1 Period 1 */}
          {shouldShowTutorial && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 50,
                left: 20,
                right: 20,
                backgroundColor: 'rgba(74, 144, 226, 0.95)',
                padding: 15,
                borderRadius: 10,
                zIndex: 1000,
                borderWidth: 2,
                borderColor: '#4a90e2',
              }}
              onPress={() => {
                console.log('🎓 Starting tutorial from welcome banner');
                startCopilot();
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                🎒 Welcome to Candy Wars!
              </Text>
              <Text
                style={{
                  color: 'white',
                  fontSize: 14,
                  textAlign: 'center',
                  marginTop: 5,
                }}
              >
                Tap here to learn how to play
              </Text>
            </TouchableOpacity>
          )}

          <CopilotStep
            text="Here's the candy market! Each candy has a different price. Tap on any candy to buy or sell it. Prices change throughout the day!"
            order={3}
            name="market_list"
          >
            <CopilotView style={styles.listContainer}>
              <FlatList
                data={candies}
                keyExtractor={(item) => item.name}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={true}
                overScrollMode="never"
                renderItem={useCallback(
                  ({ item, index }) => (
                    <TouchableOpacity
                      style={styles.item}
                      onPress={() => openModal(index)}
                    >
                      <View style={styles.candyInfo}>
                        <View style={styles.candyNameRow}>
                          <Text style={styles.name}>{item.name}</Text>
                          {item.quantityOwned > 0 && (
                            <View style={styles.ownedBadge}>
                              <Text style={styles.ownedText}>
                                {item.quantityOwned}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.candyPriceRow}>
                          <Text style={styles.price}>
                            ${item.cost.toFixed(2)}
                          </Text>
                          {item.cost > item.basePrice && (
                            <Text style={styles.priceChange}>📈</Text>
                          )}
                          {item.cost < item.basePrice && (
                            <Text style={styles.priceChange}>📉</Text>
                          )}
                          {item.quantityOwned > 0 &&
                            item.averagePrice !== null && (
                              <Text
                                style={[
                                  styles.gainLoss,
                                  item.cost >= item.averagePrice
                                    ? styles.gain
                                    : styles.loss,
                                ]}
                              >
                                {(() => {
                                  const baseGain =
                                    (item.cost - item.averagePrice) *
                                    item.quantityOwned;
                                  const totalGain = baseGain;
                                  return totalGain >= 0
                                    ? `+$${totalGain.toFixed(2)}`
                                    : `-$${Math.abs(totalGain).toFixed(2)}`;
                                })()}
                              </Text>
                            )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ),
                  [openModal]
                )}
              />
            </CopilotView>
          </CopilotStep>

          <CopilotStep
            text="Use these buttons to advance time. 'Next Period' moves to the next class, and 'End Day' skips straight to after school!"
            order={4}
            name="market_buttons"
          >
            <CopilotView>
              <View style={styles.buttonContainer}>
                {period === 8 ? (
                  // Period 8: Only show leave school button
                  <TouchableOpacity
                    style={styles.nextPeriodButton}
                    onPress={handleNextDay}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.nextPeriodButtonText}>
                      🏠 Leave School for the Day
                    </Text>
                    <Text style={styles.nextPeriodSubtext}>
                      Time to head home!
                    </Text>
                  </TouchableOpacity>
                ) : (
                  // Periods 1-7: Show both next period and end day buttons
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.nextPeriodButton, styles.bigButton]}
                      onPress={handleNextDay}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.nextPeriodButtonText}>
                        ⏰ Next Period
                      </Text>
                      <Text style={styles.nextPeriodSubtext}>
                        Going to period {period + 1}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.endDayButton, styles.smallButton]}
                      onPress={handleEndDay}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.endDayButtonText}>🏠 End Day</Text>
                      <Text style={styles.endDaySubtext}>
                        Skip to after school
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </CopilotView>
          </CopilotStep>
        </View>
      </ImageBackground>

      <LocationModal
        visible={locationModalVisible}
        onClose={() => {
          console.log('🔵 LocationModal onClose called');
          setLocationModalVisible(false);
        }}
        onSelectLocation={handleLocationSelect}
      />

      <DayStatsModal
        visible={dayStatsModalVisible}
        onClose={handleDayStatsClose}
        stats={(() => {
          const stats = getTotalStats();
          console.log(
            '📊 DayStatsModal stats:',
            stats,
            'visible:',
            dayStatsModalVisible,
            'day:',
            day
          );
          return stats;
        })()}
        day={day}
      />

      <SchoolsOutModal
        visible={schoolsOutModalVisible}
        onComplete={handleSchoolsOutComplete}
      />

      <EndOfDayModal
        visible={endOfDayModalVisible}
        onClose={() => setEndOfDayModalVisible(false)}
        onGoHome={handleGoHome}
        onStashMoney={handleStashMoney}
        onGoDeli={handleGoDeli}
        onGoToSleep={handleGoToSleep}
        completedActivities={completedActivities}
      />

      <StashMoneyModal
        visible={stashMoneyModalVisible}
        onClose={() => setStashMoneyModalVisible(false)}
        onConfirm={handleMoneyStashed}
      />

      <DeliModal visible={deliModalVisible} onClose={handleDeliReturn} />

      <SleepConfirmModal
        visible={sleepConfirmModalVisible}
        onConfirm={handleSleepConfirm}
        onCancel={handleSleepCancel}
        currentDay={day}
      />

      <ConfirmationModal
        visible={confirmationModal.visible}
        title={confirmationModal.title}
        message={confirmationModal.message}
        emoji={confirmationModal.emoji}
        confirmText="Awesome!"
        onConfirm={confirmationModal.onConfirm}
        onCancel={() =>
          setConfirmationModal((prev) => ({ ...prev, visible: false }))
        }
        theme="market"
      />

      <ConfirmationModal
        visible={endDayConfirmVisible}
        title="End School Day?"
        message={`Are you sure you want to end the school day early? You're currently in period ${period} of 8.\n\nThis will skip the remaining periods and take you directly to after-school activities.`}
        emoji="🏠"
        confirmText="End Day"
        cancelText="Stay in School"
        onConfirm={handleEndDayConfirm}
        onCancel={handleEndDayCancel}
        theme="market"
        dismissible={false}
      />

      {selectedCandy && (
        <TransactionModal
          visible={selectedCandyIndex !== null}
          onClose={closeModal}
          onConfirm={handleTransaction}
          maxBuyQuantity={maxBuyQty}
          maxSellQuantity={maxSellQty}
          candy={selectedCandy}
          priceBreakdown={selectedCandy?.priceBreakdown}
          playerBalance={balance}
          availableInventorySpace={availableInventorySpace}
        />
      )}

      {/* EventModal for special events */}
      <EventModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefaf5', // Warm off-white paper (fallback)
  },
  backgroundImage: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  item: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#d4a574', // Brown crayon border
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  candyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontWeight: '700',
    fontSize: 19,
    color: '#6b4423', // Dark brown crayon
    textShadow: '0.5px 0.5px 0px #d4a574',
    fontFamily: 'CrayonPastel',
  },
  ownedBadge: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#8b0000', // Dark red crayon
    backgroundColor: '#ffe6e6', // Light red background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffb3b3',
  },
  jokerIndicators: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  jokerIndicator: {
    fontSize: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a90e2',
  },
  moreIndicator: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4a90e2',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: 'CrayonPastel',
  },
  buttonContainer: {
    backgroundColor: '#fefaf5',
    borderTopWidth: 3,
    borderColor: '#d4a574',
    padding: 10,
    alignItems: 'center',
    minHeight: 80,
    flexShrink: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 12, // Add space between buttons
  },
  bigButton: {
    flex: 2, // Next period button is 2x the size
  },
  smallButton: {
    flex: 1, // End day button is 1x the size
  },
  nextPeriodButton: {
    backgroundColor: 'rgba(154,193,118,1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(123,169,101,1)',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    alignItems: 'center',
  },
  nextPeriodButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    textShadowColor: '#166534',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  nextPeriodSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f0fdf4',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginTop: 1,
    opacity: 0.9,
  },
  endDayButton: {
    backgroundColor: 'rgba(239,68,68,1)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(185,28,28,1)',
    shadowColor: '#991b1b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    alignItems: 'center',
  },
  endDayButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    textShadowColor: '#991b1b',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  endDaySubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fef2f2',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginTop: 1,
    opacity: 0.9,
  },
});

// Export Market directly without wrapper
export default Market;
