import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CopilotStep, useCopilot, walkthroughable } from 'react-native-copilot';
import { JOKER_IDS } from '../../src/constants/jokerIds';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useCandySales } from '../../src/hooks/useCandySales';
import { useComputedJokerEffects } from '../../src/hooks/useComputedJokerEffects';
import { useDailyStats } from '../../src/hooks/useDailyStats';
import { useDiamondHand } from '../../src/hooks/useDiamondHand';
import { useDroughtRelief } from '../../src/hooks/useDroughtRelief';
import { useEmptyInventoryBonus } from '../../src/hooks/useEmptyInventoryBonus';
import { useEventHandler } from '../../src/hooks/useEventHandler';
import { useGame } from '../../src/hooks/useGame';
import { useHallPass } from '../../src/hooks/useHallPass';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { usePriceDoubling } from '../../src/hooks/usePriceDoubling';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { JokerService } from '../../src/utils/jokerService';
import ConfirmationModal from '../components/ConfirmationModal';
import DayStatsModal from '../components/DayStatsModal';
import DeliModal from '../components/DeliModal';
import EventModal from '../components/EventModal';
import GameHUD from '../components/GameHUD';
import InventoryModal from '../components/InventoryModal';
import LocationModal, { Location } from '../components/LocationModal';
import SchoolsOutModal from '../components/SchoolsOutModal';
import SleepConfirmModal from '../components/SleepConfirmModal';
import StashMoneyModal from '../components/StashMoneyModal';
import TransactionModal from '../components/TransactionModal';
import { Candy } from '../types';

const CopilotView = walkthroughable(View);
const CopilotTouchableOpacity = walkthroughable(TouchableOpacity);

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
  // Track focus state to prevent unnecessary work when tab is not active
  const [isTabFocused, setIsTabFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      console.log('📊 MARKET: Tab focused - enabling expensive operations');
      setIsTabFocused(true);
      return () => {
        console.log(
          '📊 MARKET: Tab unfocused - disabling expensive operations'
        );
        setIsTabFocused(false);
      };
    }, [])
  );

  // Only log when focused to reduce console noise
  if (isTabFocused) {
    console.log('📊 MARKET: Component rendering (tab is focused)');
  }

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
    start,
    stop: stopCopilot,
    eventEmitter,
    copilotEvents,
    isFirstStep,
    currentStep,
    visible,
  } = useCopilot();

  // Debug copilot state and events
  useEffect(() => {
    console.log(
      '🎓 Copilot state - isFirstStep:',
      isFirstStep,
      'currentStep:',
      currentStep,
      'copilotEvents:',
      copilotEvents
    );

    // Log available events
    if (eventEmitter && eventEmitter._events) {
      console.log('🎓 Available events:', Object.keys(eventEmitter._events));
    }
  }, [isFirstStep, currentStep, copilotEvents, eventEmitter]);

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
    pricesUpdating,
    setPricesUpdating,
  } = useGame();
  const { hasActiveEvent: hasActiveEventFn, handleEvent } = useEventHandler();
  const hasActiveEvent = hasActiveEventFn();
  const { getTotalStats, addProfit, addSpent, addCandySold } = useDailyStats();
  const { setEvent, setFlavorText, setHint } = useFlavorText();
  const { addSale, resetSales, consecutivePeriodSales } = useCandySales();
  const [pendingLocationModal, setPendingLocationModal] = useState(false);
  const [localPricesUpdating, setLocalPricesUpdating] = useState(false);

  const { activeEffects, jokers, removeJoker } = useJokers();
  const { applySalePriceBonus, getSalePriceBonus } = useHallPass();

  // Initialize computed joker effects system only when tab is focused
  useEffect(() => {
    if (isTabFocused) {
      console.log('📊 MARKET: Initializing computed joker effects...');
    }
  }, [isTabFocused]);

  useComputedJokerEffects();

  const jokerService = useMemo(() => JokerService.getInstance(), []);

  usePriceDoubling(); // This hook handles price restoration on period change
  useEmptyInventoryBonus(); // This hook handles Embrace the Grind joker bonus
  const { recordSale } = useDiamondHand(); // This hook handles Diamond Hand joker bonus
  const { recordSale: recordDroughtSale } = useDroughtRelief(); // This hook handles Drought Relief joker bonus
  // Tutorial using Copilot - check if we should show tutorial for day 1 period 1 (period starts at 0)
  // Also check tutorial completion status
  const shouldShowTutorial = day === 1 && periodCount === 0;
  const tutorialStarted = useRef(false);

  // Debug tutorial conditions
  console.log('🎓 Tutorial Debug:', {
    day,
    periodCount,
    shouldShowTutorial,
    tutorialStarted: tutorialStarted.current,
    isFirstStep,
    currentStep,
    copilotVisible: visible,
  });

  // Simple tutorial auto-start (copied from after-school.tsx pattern)
  useEffect(() => {
    if (shouldShowTutorial && !tutorialStarted.current) {
      console.log(
        '🎓 Auto-starting tutorial - simple approach like after-school.tsx'
      );

      // Small delay to ensure UI is ready (same as after-school.tsx)
      const timeoutId = setTimeout(() => {
        console.log('🎯 Starting market copilot tutorial');
        tutorialStarted.current = true;
        start();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [shouldShowTutorial, start]);

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

  // Update flavor text when period changes - only when tab is focused
  useEffect(() => {
    if (!isTabFocused) {
      return; // Skip flavor text updates when tab is not active
    }
    // Check for current event at current location
    const currentEvent = gameData.periodEvents.find(
      (e) => e.period === periodCount && e.location === currentLocation
    );

    // Check if there's an upcoming event at current location
    const nextPeriodEvent = gameData.periodEvents.find(
      (e) => e.period === periodCount + 1 && e.location === currentLocation
    );

    if (periodCount === 0) {
      setEvent('NEW_DAY');
    } else if (currentEvent && currentEvent.description) {
      // Show the current event description
      if (currentEvent.effect === 'PRICE_SPIKE') {
        setEvent('PRICE_SPIKE');
      } else if (currentEvent.effect === 'PRICE_DROP') {
        setEvent('PRICE_DROP');
      } else if (currentEvent.effect === 'FOUND_MONEY') {
        setEvent('FOUND_MONEY');
      } else if (currentEvent.effect === 'LOSE_MONEY') {
        setEvent('LOSE_MONEY');
      } else if (currentEvent.effect === 'STASH_LOCKED') {
        setEvent('STASH_LOCKED');
      }

      // Trigger the event modal for interactive events
      console.log(
        '🎯 EVENT: Triggering event modal for period',
        periodCount,
        ':',
        currentEvent.title
      );
      handleEvent(currentEvent);

      // Also show the event's specific description
      setTimeout(() => setFlavorText(currentEvent.description || ''), 100);
    } else if (nextPeriodEvent && nextPeriodEvent.hint) {
      // Check if jokers affect hint chance
      const baseHintChance = 0.7; // 70% base chance
      const effectiveHintChance = jokerService.applyJokerEffects(
        baseHintChance,
        'hint_chance',
        jokers,
        periodCount,
        baseHintChance,
        undefined,
        activeEffects
      );

      if (Math.random() < effectiveHintChance) {
        // Use the actual hint from the event template
        setHint(nextPeriodEvent.hint);
      } else {
        // Show period-specific flavor text instead of hint
        if (periodCount <= 2) {
          setEvent('MORNING_TRADE');
        } else if (periodCount >= 4 && periodCount <= 6) {
          setEvent('LUNCH_RUSH');
        } else if (periodCount >= 7) {
          setEvent('FINAL_PERIOD');
        } else {
          setEvent('PERIOD_CHANGE');
        }
      }
    } else if (nextPeriodEvent) {
      // If there's an event but no hint defined, show regular flavor text
      if (periodCount <= 2) {
        setEvent('MORNING_TRADE');
      } else if (periodCount >= 4 && periodCount <= 6) {
        setEvent('LUNCH_RUSH');
      } else if (periodCount >= 7) {
        setEvent('FINAL_PERIOD');
      } else {
        setEvent('PERIOD_CHANGE');
      }
    } else {
      // Period-specific flavor text based on time of day
      if (periodCount <= 2) {
        setEvent('MORNING_TRADE');
      } else if (periodCount >= 4 && periodCount <= 6) {
        setEvent('LUNCH_RUSH');
      } else if (periodCount >= 7) {
        setEvent('FINAL_PERIOD');
      } else {
        setEvent('PERIOD_CHANGE');
      }
    }
  }, [
    isTabFocused,
    periodCount,
    currentLocation,
    gameData.periodEvents,
    setEvent,
    setFlavorText,
    setHint,
    jokers,
    activeEffects,
  ]);

  const [candies, setCandies] = useState<CandyForMarket[]>(() =>
    baseCandies.map((candy) => ({
      ...candy,
      basePrice: candy.baseMin, // Add basePrice property
      cost: candy.baseMin, // Initialize with base minimum price
      quantityOwned: 0,
      averagePrice: null,
    }))
  );

  // Only update candies when tab is focused to prevent excessive re-renders
  useEffect(() => {
    if (!isTabFocused) {
      return; // Skip expensive computation when tab is not active
    }

    const currentInventoryLimit = getInventoryLimit();

    setCandies((prev) =>
      prev.map((candy) => {
        // Check for current location-specific events with price overrides or multipliers
        const currentEvent = gameData.periodEvents.find(
          (e) =>
            e.period === periodCount &&
            e.location === currentLocation &&
            e.candy === candy.name &&
            (e.priceOverride !== undefined || e.multiplier !== undefined)
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

        let finalCost = currentPrice;
        if (currentEvent?.priceOverride !== undefined) {
          finalCost = currentEvent.priceOverride;
        } else if (currentEvent?.multiplier !== undefined) {
          finalCost = currentPrice * currentEvent.multiplier;
        }

        // Note: Price storage moved to separate useEffect to avoid setState during render

        // Get inventory information for this candy
        const inventoryItem = inventory.find(
          (item) => item.name === candy.name
        );

        return {
          ...candy,
          basePrice: trueBasePrice, // Update basePrice for accurate comparison
          cost: finalCost,
          quantityOwned: inventoryItem?.quantity || 0,
          averagePrice: inventoryItem?.price || null,
          priceBreakdown:
            currentEvent?.priceOverride === undefined &&
            currentEvent?.multiplier === undefined
              ? priceBreakdown
              : undefined, // Only show breakdown if not overridden by events
        };
      })
    );
  }, [
    isTabFocused,
    periodCount,
    gameData,
    currentLocation,
    inventory,
    jokers,
    activeEffects,
    getInventoryLimit,
  ]);

  // Separate effect to store candy prices to avoid setState during render
  useEffect(() => {
    baseCandies.forEach((candy) => {
      if (!gameData.candyPrices[candy.name]?.[periodCount]) {
        // Calculate the same price as in the candies state update
        const seed = candy.name.charCodeAt(0) + periodCount;
        const random = Math.sin(seed) * 10000;
        const normalizedRandom = random - Math.floor(random);
        const trueBasePrice =
          candy.baseMin + normalizedRandom * (candy.baseMax - candy.baseMin);

        // Check for current location-specific events with price overrides or multipliers
        const currentEvent = gameData.periodEvents.find(
          (e) =>
            e.period === periodCount &&
            e.location === currentLocation &&
            e.candy === candy.name &&
            (e.priceOverride !== undefined || e.multiplier !== undefined)
        );

        let finalCost =
          gameData.candyPrices[candy.name]?.[periodCount] || trueBasePrice;
        if (currentEvent?.priceOverride !== undefined) {
          finalCost = currentEvent.priceOverride;
        } else if (currentEvent?.multiplier !== undefined) {
          finalCost =
            (gameData.candyPrices[candy.name]?.[periodCount] || trueBasePrice) *
            currentEvent.multiplier;
        }

        modifyCandyPrice(candy.name, finalCost, periodCount);
      }
    });
  }, [
    periodCount,
    currentLocation,
    gameData.periodEvents,
    gameData.candyPrices,
    modifyCandyPrice,
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
  const [stashMoneyModalVisible, setStashMoneyModalVisible] = useState(false);
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
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);

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
          // === SELLING LOGIC ===

          // Record sales for tracking systems
          recordSale(); // Diamond Hand tracking
          recordDroughtSale(); // Drought Relief tracking
          addSale(candy.name); // General sales tracking

          // === CALCULATE ALL BONUSES FROM REDUX STATE ===
          let multiplier = 1;
          const bonusDetails: string[] = [];

          // 1. Check for one-time sell multiplier jokers (Persuasion, etc) from Redux state
          const sellMultiplierInfo = jokerService.hasOneTimeSellMultiplier(
            jokers, // From Redux via useJokers()
            periodCount,
            activeEffects // From Redux via useJokers()
          );
          if (sellMultiplierInfo.hasEffect && sellMultiplierInfo.multiplier) {
            multiplier *= sellMultiplierInfo.multiplier;
            bonusDetails.push(
              `🗣️ ${sellMultiplierInfo.jokerName}: ${sellMultiplierInfo.multiplier}x multiplier`
            );
            console.log(
              `🗣️ ${sellMultiplierInfo.jokerName} activated! ${sellMultiplierInfo.multiplier}x multiplier applied`
            );
          }

          // 2. Check Redux jokers for Even Stevens / Odd Todd
          const candyInventoryLimit = getInventoryLimit();
          const hasEvenStevens = jokers.some(
            (j) => j.id === JOKER_IDS.EVEN_STEVENS.toString()
          );
          const hasOddTodd = jokers.some(
            (j) => j.id === JOKER_IDS.ODD_TODD.toString()
          );

          if (hasEvenStevens && candyInventoryLimit % 2 === 0) {
            multiplier *= 1.1;
            bonusDetails.push(`⚖️ Even Stevens: 10% bonus (even inventory)`);
            console.log(
              `⚖️ Even Stevens: +10% sales bonus applied (inventory limit: ${candyInventoryLimit})`
            );
          } else if (hasOddTodd && candyInventoryLimit % 2 === 1) {
            multiplier *= 1.1;
            bonusDetails.push(`🎭 Odd Todd: 10% bonus (odd inventory)`);
            console.log(
              `🎭 Odd Todd: +10% sales bonus applied (inventory limit: ${candyInventoryLimit})`
            );
          }

          // 3. Check Redux jokers for Recess bonuses
          const hasHopscotch = jokers.some(
            (j) => j.id === JOKER_IDS.HOPSCOTCH_BONUS.toString()
          );
          const hasSwingset = jokers.some(
            (j) => j.id === JOKER_IDS.SWINGSET_MOMENTUM.toString()
          );

          if (hasHopscotch && period % 2 === 0) {
            multiplier *= 1.2;
            bonusDetails.push(`🏃 Hopscotch: 20% bonus (even period)`);
            console.log(
              `🏃 Hopscotch Bonus: +20% sales bonus applied (period ${period} is even)`
            );
          }

          if (hasSwingset && consecutivePeriodSales > 1) {
            const swingsetMultiplier = 1 + (consecutivePeriodSales - 1) * 0.1;
            multiplier *= swingsetMultiplier;
            bonusDetails.push(
              `⛹️ Swingset: ${((swingsetMultiplier - 1) * 100).toFixed(0)}% bonus (${consecutivePeriodSales} consecutive periods)`
            );
            console.log(
              `⛹️ Swingset Momentum: ${((swingsetMultiplier - 1) * 100).toFixed(0)}% sales bonus applied`
            );
          }

          // 4. Calculate profit-based hall pass bonus from Redux state
          const inventoryItem = inventory.find(
            (item) => item.name === candy.name
          );
          const purchasePrice = inventoryItem?.price || candy.cost;
          const profitPerUnit = Math.max(0, candy.cost - purchasePrice);
          const totalProfit = profitPerUnit * quantity;

          // Get hall pass bonus from Redux via useHallPass()
          const hallPassSaleBonusPercent = getSalePriceBonus();
          const hallPassProfitBonus =
            hallPassSaleBonusPercent > 0
              ? totalProfit * ((hallPassSaleBonusPercent * 5) / 100) // 5x multiplier on profit
              : 0;

          if (hallPassProfitBonus > 0) {
            bonusDetails.push(
              `🎖️ Hall Pass: +$${hallPassProfitBonus.toFixed(2)} profit bonus (${hallPassSaleBonusPercent}% × 5x)`
            );
          }

          // === CALCULATE FINAL GAIN ===
          const baseGain = candy.cost * quantity; // Revenue from sale
          const totalGain = (baseGain + hallPassProfitBonus) * multiplier; // Hall pass added to base, then joker multipliers

          console.log(
            '🛒 Market: Selling candy:',
            candy.name,
            'quantity:',
            quantity,
            'sale price:',
            candy.cost,
            'purchase price:',
            purchasePrice,
            'profit per unit:',
            profitPerUnit,
            'total profit:',
            totalProfit,
            'hall pass bonus %:',
            hallPassSaleBonusPercent,
            'hall pass profit bonus:',
            hallPassProfitBonus,
            'base revenue:',
            baseGain,
            'joker multiplier:',
            multiplier,
            'final total:',
            totalGain
          );
          add(totalGain);
          addProfit(totalGain); // Track daily profit
          addCandySold(quantity); // Track daily candy sales
          removeFromInventory(candy.name, quantity);

          // === SHOW BONUS NOTIFICATIONS ===
          if (bonusDetails.length > 0) {
            setTimeout(() => {
              const title =
                bonusDetails.length > 1 ? 'Multiple Bonuses!' : 'Sale Bonus!';
              const emoji = bonusDetails.length > 1 ? '🎉' : '💰';
              const message =
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
    setLocationModalVisible(false);

    // Show loading prices immediately
    setLocalPricesUpdating(true);

    // Call incrementPeriod and update flavor text
    incrementPeriod(location);
    setEvent('PERIOD_CHANGE');

    // Reset loading state after 1.5 seconds
    setTimeout(() => {
      setLocalPricesUpdating(false);
    }, 625);
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

  // Day stats modal handlers
  const handleDayStatsClose = () => {
    console.log('📊 Day stats modal closing - continuing to after school');
    setDayStatsModalVisible(false);

    // Show schools out modal first
    console.log('📊 Showing schools out modal');
    setSchoolsOutModalVisible(true);
  };

  const handleDayStatsCancel = () => {
    console.log('📊 Day stats modal cancelled - staying at school');
    setDayStatsModalVisible(false);
    // Don't show any other modals, just return to market
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

  const handleSleepConfirm = () => {
    setSleepConfirmModalVisible(false);

    // Show loading prices immediately
    setLocalPricesUpdating(true);

    incrementPeriod('home room'); // Start next day at home room

    // Reset loading state after 1.5 seconds
    setTimeout(() => {
      setLocalPricesUpdating(false);
    }, 1500);
  };

  const handleSleepCancel = () => {
    // Cancel sleep confirmation
    setSleepConfirmModalVisible(false);
  };

  const handleMoneyStashed = () => {
    setStashMoneyModalVisible(false);
  };

  // Handle returning from deli
  const handleDeliReturn = () => {
    setDeliModalVisible(false);
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
                onInventoryPress={() => setInventoryModalVisible(true)}
                flavorTextWrapper={(children) => (
                  <CopilotStep
                    style={{ fontFamily: 'CrayonPastel' }}
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
                            {localPricesUpdating
                              ? '$-.--'
                              : `$${item.cost.toFixed(2)}`}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ),
                  [openModal, localPricesUpdating]
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
                      Leave School for the Day
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
                        Next Period
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
                      <Text style={styles.endDayButtonText}>End Day</Text>
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
        onCancel={handleDayStatsCancel}
        stats={React.useMemo(() => {
          const stats = getTotalStats();
          console.log(
            '📊 DayStatsModal stats:',
            stats,
            'visible:',
            dayStatsModalVisible,
            'day:',
            day
          );
          return (
            stats || {
              profit: 0,
              spent: 0,
              candiesSold: 0,
              netGain: 0,
            }
          );
        }, [getTotalStats, dayStatsModalVisible, day])}
        day={day}
      />

      <SchoolsOutModal
        visible={schoolsOutModalVisible}
        onComplete={handleSchoolsOutComplete}
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

      {/* Inventory Modal */}
      <InventoryModal
        visible={inventoryModalVisible}
        onClose={() => {
          console.log(
            '🔴 Market onClose called, current state:',
            inventoryModalVisible
          );
          setInventoryModalVisible(false);
          console.log('🔴 Market onClose completed, should be false now');
        }}
        inventory={inventory}
        totalCount={getTotalInventoryCount()}
        capacity={getInventoryLimit()}
      />
      {/* Debug inventory data */}
      {inventoryModalVisible &&
        console.log('🔴 Market inventory data:', inventory)}
      {inventoryModalVisible &&
        console.log('🔴 Market totalCount:', getTotalInventoryCount())}
      {inventoryModalVisible &&
        console.log('🔴 Market capacity:', getInventoryLimit())}

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
    marginBottom: 6,
    padding: 8,
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
  candyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontWeight: '700',
    fontSize: 19,
    color: '#6b4423', // Dark brown crayon
    textShadow: '0.5px 0.5px 0px #d4a574',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
  },
  priceChange: {
    fontSize: 16,
    marginLeft: 4,
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
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: '#166534',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  nextPeriodSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f0fdf4',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
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
export default memo(Market);
