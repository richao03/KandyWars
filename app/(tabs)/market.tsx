import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CopilotStep, useCopilot, walkthroughable } from 'react-native-copilot';
import colors from '../../src/constants/colors';
import { JOKER_IDS, findJokerById } from '../../src/constants/jokerIds';
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
import { useHomeMadeBonus } from '../../src/hooks/useHomeMadeBonus';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { usePriceDoubling } from '../../src/hooks/usePriceDoubling';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { useAppDispatch } from '../../src/store/hooks';
import { incrementMaxInventory } from '../../src/store/slices/inventorySlice';
import { forceSave } from '../../src/store/store';
import { JokerService } from '../../src/utils/jokerService';
import ConfirmationModal from '../components/ConfirmationModal';
import DayStatsModal from '../components/DayStatsModal';
import DeliModal from '../components/DeliModal';
import EventModal from '../components/EventModal';
import GameHUD from '../components/GameHUD';
import InventoryModal from '../components/InventoryModal';
import LocationModal, { Location } from '../components/LocationModal';
import MarketList from '../components/MarketList';
import PixelBorder from '../components/PixelBorder';
import SchoolsOutModal from '../components/SchoolsOutModal';
import SleepConfirmModal from '../components/SleepConfirmModal';
import StashMoneyModal from '../components/StashMoneyModal';
import TextWithEmojis from '../components/TextWithEmojis';
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
  { name: 'M&Ms', baseMin: 2.0, baseMax: 35 },
  { name: 'Skittles', baseMin: 1, baseMax: 22 },
  { name: 'Warheads', baseMin: 0.5, baseMax: 10 },
  { name: 'Sour Patch Kids', baseMin: 1.8, baseMax: 30 },
  { name: 'Bubble Gum', baseMin: 0.1, baseMax: 7 },
  { name: 'Jaw Breaker', baseMin: 3, baseMax: 50 },
];

function Market(props) {
  // Check if this tab is currently focused to prevent unnecessary renders
  const isFocused = useIsFocused();

  // Debug: Log mount/unmount
  const instanceIdRef = useRef(Math.random().toString(36).substring(7));
  useEffect(() => {
    console.log(
      `🟢 Market component MOUNTED - Instance: ${instanceIdRef.current}`
    );
    return () => {
      console.log(
        `🔴 Market component UNMOUNTED - Instance: ${instanceIdRef.current}`
      );
    };
  }, []);

  const { rng, seed, gameData, getOriginalCandyPrice, restoreCandyPrice } =
    useSeed();

  const { balance, spend, add } = useWallet();

  // Always call useCopilot to satisfy Rules of Hooks, but check if tutorial is completed
  const { hasCompletedMarketTutorial, setHasCompletedMarketTutorial } =
    useGame();
  const {
    start,
    stop: stopCopilot,
    eventEmitter,
    copilotEvents,
    isFirstStep,
    currentStep,
    visible,
  } = useCopilot();

  // Track active view on mount only
  useEffect(() => {
    setLastActiveView('market');
  }, [setLastActiveView]);

  // Handle returning from lunch minigame separately
  // When user returns from minigame (hasPlayedLunchMinigame = true), hide lunch view
  useEffect(() => {
    if (hasPlayedLunchMinigame) {
      console.log('🎮 Lunch minigame completed, ensuring lunch view is hidden');
      setShowLunchMinigames(false);
    }
  }, [hasPlayedLunchMinigame]);

  // Also hide lunch minigames when screen is focused and minigame was already played
  useFocusEffect(
    React.useCallback(() => {
      console.log(
        '🎮 Market focused - hasPlayedLunchMinigame:',
        hasPlayedLunchMinigame,
        'showLunchMinigames:',
        showLunchMinigames
      );
      if (hasPlayedLunchMinigame) {
        console.log(
          '🎮 Returning to market after lunch minigame, hiding lunch view'
        );
        setShowLunchMinigames(false);
      }
    }, [hasPlayedLunchMinigame, showLunchMinigames])
  );
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
    hasPlayedLunchMinigame,
    markLunchMinigamePlayed,
  } = useGame();

  // Log every render to see how many instances are active
  console.log(
    `📊 Market RENDER - Instance: ${instanceIdRef.current}, Period: ${period}, PeriodCount: ${periodCount}, Day: ${day}`
  );

  const { hasActiveEvent: hasActiveEventFn, handleEvent } = useEventHandler();
  const hasActiveEvent = hasActiveEventFn();
  const {
    getTotalStats,
    addProfit,
    addSpent,
    addCandySold,
    recordSale: recordDailyStatsSale,
  } = useDailyStats();
  const { setEvent, setFlavorText, setHint } = useFlavorText();
  const { addSale, resetSales, consecutivePeriodSales, totalCandiesSold } =
    useCandySales();
  const [pendingLocationModal, setPendingLocationModal] = useState(false);
  const [localPricesUpdating, setLocalPricesUpdating] = useState(false);

  const { activeEffects, jokers, removeJoker, clearActiveEffect } = useJokers();
  const { applySalePriceBonus, getSalePriceBonus } = useHallPass();

  // Initialize computed joker effects system
  useComputedJokerEffects();

  const jokerService = useMemo(() => JokerService.getInstance(), []);

  usePriceDoubling(); // This hook handles price restoration on period change
  useEmptyInventoryBonus(); // This hook handles Embrace the Grind joker bonus
  useHomeMadeBonus(); // This hook handles Home Made joker bonus
  const { recordSale } = useDiamondHand(); // This hook handles Diamond Hand joker bonus
  const { recordSale: recordDroughtSale } = useDroughtRelief(); // This hook handles Drought Relief joker bonus
  // Tutorial using Copilot - only show if not already completed
  const shouldShowTutorial =
    day === 1 && periodCount === 0 && !hasCompletedMarketTutorial;
  const tutorialStarted = useRef(false);

  // Reset tutorialStarted ref when not on day 1
  useEffect(() => {
    if (day !== 1) {
      tutorialStarted.current = false;
    }
  }, [day]);

  // Simple tutorial auto-start - only run on day 1
  useEffect(() => {
    // Skip entirely if not day 1
    if (day !== 1) return;

    if (process.env.NODE_ENV === 'development') {
      console.log('🎓 Tutorial check:', {
        day,
        periodCount,
        hasCompletedMarketTutorial,
        shouldShowTutorial,
        tutorialStarted: tutorialStarted.current,
      });
    }

    if (shouldShowTutorial && !tutorialStarted.current) {
      console.log('🎓 Auto-starting market tutorial');

      // Small delay to ensure UI is ready
      const timeoutId = setTimeout(() => {
        console.log('🎯 Starting market copilot tutorial');
        tutorialStarted.current = true;
        start();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [shouldShowTutorial, start, day, periodCount, hasCompletedMarketTutorial]);

  // Mark tutorial as completed when it finishes or is skipped - only on day 1
  useEffect(() => {
    // Skip entirely if not day 1
    if (day !== 1) return;

    if (eventEmitter && copilotEvents) {
      console.log('🎓 Setting up tutorial event listeners');
      console.log('🎓 copilotEvents object:', copilotEvents);
      console.log('🎓 All copilotEvents keys:', Object.keys(copilotEvents));
      console.log('🎓 STOP event name:', copilotEvents.STOP);
      console.log('🎓 SKIP event name:', copilotEvents.SKIP);

      const handleComplete = (eventType: string) => {
        console.log('🎓 Market tutorial event fired:', eventType);
        console.log(
          '🎓 Current hasCompletedMarketTutorial:',
          hasCompletedMarketTutorial
        );
        setHasCompletedMarketTutorial(true);
        // Force immediate save to AsyncStorage
        setTimeout(() => {
          forceSave();
          console.log('💾 Tutorial completion saved to AsyncStorage');
        }, 100);
      };

      const handleStop = () => handleComplete('STOP');
      const handleSkip = () => handleComplete('SKIP');

      // Listen to ALL possible events to see what fires
      const allEventHandler = (eventName: string) => {
        console.log('🔔 Copilot event fired:', eventName);
      };

      // Try to listen to all events
      if (copilotEvents.STOP) {
        eventEmitter.on(copilotEvents.STOP, handleStop);
        console.log('✅ Registered STOP listener');
      }
      if (copilotEvents.SKIP) {
        eventEmitter.on(copilotEvents.SKIP, handleSkip);
        console.log('✅ Registered SKIP listener');
      }

      // Also try common event names
      ['stop', 'skip', 'stepChange', 'start'].forEach((eventName) => {
        eventEmitter.on(eventName, () => allEventHandler(eventName));
      });

      console.log('🎓 Event listeners registered');

      return () => {
        console.log('🎓 Cleaning up event listeners');
        if (copilotEvents.STOP)
          eventEmitter.off(copilotEvents.STOP, handleStop);
        if (copilotEvents.SKIP)
          eventEmitter.off(copilotEvents.SKIP, handleSkip);
        ['stop', 'skip', 'stepChange', 'start'].forEach((eventName) => {
          eventEmitter.off(eventName, () => allEventHandler(eventName));
        });
      };
    }
  }, [
    eventEmitter,
    copilotEvents,
    setHasCompletedMarketTutorial,
    hasCompletedMarketTutorial,
    day,
  ]);

  // Fallback: Mark tutorial as complete when user navigates away or advances to period 1+
  useEffect(() => {
    if (
      day === 1 &&
      periodCount > 0 &&
      !hasCompletedMarketTutorial &&
      tutorialStarted.current
    ) {
      console.log(
        '🎓 Fallback: Marking market tutorial complete (user advanced period)'
      );
      setHasCompletedMarketTutorial(true);
      forceSave();
    }
  }, [
    day,
    periodCount,
    hasCompletedMarketTutorial,
    setHasCompletedMarketTutorial,
  ]);

  // Fallback: Mark tutorial as complete when screen loses focus after tutorial started
  useFocusEffect(
    useCallback(() => {
      return () => {
        // On blur/unfocus
        if (
          day === 1 &&
          !hasCompletedMarketTutorial &&
          tutorialStarted.current
        ) {
          console.log(
            '🎓 Fallback: Marking market tutorial complete (user navigated away)'
          );
          setHasCompletedMarketTutorial(true);
          forceSave();
        }
      };
    }, [day, hasCompletedMarketTutorial, setHasCompletedMarketTutorial])
  );

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

  // Track the last event period to prevent duplicate triggers
  const lastEventPeriodRef = useRef<number>(-1);
  const lastHintPeriodRef = useRef<number>(-1);

  // Log all events once when game is initialized
  const hasLoggedEventsRef = useRef(false);
  if (!hasLoggedEventsRef.current && gameData.periodEvents.length > 0) {
    hasLoggedEventsRef.current = true;
    console.log(
      `📊 ALL GENERATED EVENTS (${gameData.periodEvents.length} total):`
    );
    gameData.periodEvents.forEach((event, index) => {
      console.log(
        `  Event ${index + 1}: Period ${event.period}, Effect: ${event.effect}, Candy: ${event.candy || 'N/A'}, Location: ${event.location || 'ANY'}, Multiplier: ${event.multiplier || 'N/A'}`
      );
    });
  }

  // Update flavor text when period changes
  useEffect(() => {
    // Only process events if this instance is focused (prevents duplicate event processing from zombie instances)
    if (!isFocused) {
      return;
    }

    // Check for current event at current location
    // Events without a location field trigger at any location
    // Note: periodCount is 0-indexed (0-39), but event periods are 1-indexed (1-40)
    const currentEvent = gameData.periodEvents.find(
      (e) =>
        e.period === periodCount + 1 &&
        (!e.location || e.location === currentLocation)
    );

    // Check if there's an upcoming event at current location
    // Events without a location field can show hints at any location
    // Note: periodCount is 0-indexed, event periods are 1-indexed, so +2 for next period
    const nextPeriodEvent = gameData.periodEvents.find(
      (e) =>
        e.period === periodCount + 2 &&
        (!e.location || e.location === currentLocation)
    );

    let periodOfTheDay = (periodCount % 8) + 1;
    if (periodOfTheDay === 0) {
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

      // Only trigger event if we haven't already triggered it for this period
      // This prevents duplicate event triggers when other dependencies change
      console.log(
        `🔄 Event trigger check - lastEventPeriod: ${lastEventPeriodRef.current}, currentPeriod: ${periodCount}`
      );
      if (lastEventPeriodRef.current !== periodCount) {
        lastEventPeriodRef.current = periodCount;
        console.log(
          '🎯 EVENT: Triggering event modal for period',
          periodOfTheDay,
          ':',
          currentEvent.title
        );
        handleEvent(currentEvent);

        // Also show the event's specific description
        setTimeout(() => setFlavorText(currentEvent.description || ''), 100);
      } else {
        console.log(
          `⏭️ Event already triggered for period ${periodCount}, skipping`
        );
      }
    } else if (nextPeriodEvent && nextPeriodEvent.hint) {
      // Only check hint once per period to avoid re-rolling on tab switches
      if (lastHintPeriodRef.current !== periodCount) {
        lastHintPeriodRef.current = periodCount;

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

        console.log(
          `💡 Hint check - baseChance: ${baseHintChance}, effectiveChance: ${effectiveHintChance}, hint: "${nextPeriodEvent.hint}"`
        );

        if (Math.random() < effectiveHintChance) {
          // Use the actual hint from the event template
          console.log(`💡 Showing hint: "${nextPeriodEvent.hint}"`);
          setHint(nextPeriodEvent.hint);
        } else {
          console.log(`💡 Random check failed, showing flavor text instead`);

          // Show period-specific flavor text instead of hint
          if (periodOfTheDay <= 2) {
            setEvent('MORNING_TRADE');
          } else if (periodOfTheDay >= 4 && periodOfTheDay <= 6) {
            setEvent('LUNCH_RUSH');
          } else if (periodOfTheDay >= 7) {
            setEvent('FINAL_PERIOD');
          } else {
            setEvent('PERIOD_CHANGE');
          }
        }
      }
    } else if (nextPeriodEvent) {
      // If there's an event but no hint defined, show regular flavor text
      if (periodOfTheDay <= 2) {
        setEvent('MORNING_TRADE');
      } else if (periodOfTheDay >= 4 && periodOfTheDay <= 6) {
        setEvent('LUNCH_RUSH');
      } else if (periodOfTheDay >= 7) {
        setEvent('FINAL_PERIOD');
      } else {
        setEvent('PERIOD_CHANGE');
      }
    } else {
      // Period-specific flavor text based on time of day
      if (periodOfTheDay <= 2) {
        setEvent('MORNING_TRADE');
      } else if (periodOfTheDay >= 4 && periodOfTheDay <= 6) {
        setEvent('LUNCH_RUSH');
      } else if (periodOfTheDay >= 7) {
        setEvent('FINAL_PERIOD');
      } else {
        setEvent('PERIOD_CHANGE');
      }
    }
  }, [
    isFocused,
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

  // Memoize joker count and inventory limit to prevent unnecessary re-renders
  const jokerCount = useMemo(() => jokers.length, [jokers.length]);
  const inventoryLimit = useMemo(
    () => getInventoryLimit(),
    [getInventoryLimit]
  );

  // Memoize joker service computation to avoid recalculating for each candy
  const jokerServiceComputed = useMemo(() => {
    if (!jokers || jokers.length === 0) return null;

    const service = JokerService.getInstance();
    service.initializeEngineForComputation(
      jokers,
      periodCount,
      inventoryLimit,
      activeEffects
    );
    return service;
  }, [jokers, periodCount, inventoryLimit, activeEffects]);

  // Memoize candy calculations to prevent excessive re-renders
  // Extract stable values from gameData to prevent unnecessary recalculations
  const periodEvents = useMemo(
    () => gameData.periodEvents,
    [gameData.periodEvents]
  );
  const candyPrices = useMemo(
    () => gameData.candyPrices,
    [gameData.candyPrices]
  );

  const calculatedCandies = useMemo(() => {
    const startTime = performance.now();
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '🔄 Recalculating candies | period:',
        periodCount,
        'location:',
        currentLocation,
        'jokers:',
        jokerCount,
        'activeEffects:',
        activeEffects.length,
        'inventory items:',
        inventory.length
      );
    }
    // No need to check isFocused anymore - Stack navigation properly unmounts
    const currentInventoryLimit = inventoryLimit;
    // Calculate once for all candies instead of per-candy
    const consecutiveSalesCount = consecutivePeriodSales(periodCount);

    const result = baseCandies.map((candy) => {
      // Hybrid price lookup (Option 3):
      // 1. Check if there's a pre-calculated event price for this period/location/candy
      // 2. Fall back to base price from gameData
      const eventPrices = gameData.eventPrices || {};

      let finalCost: number;

      // First check location-specific event price
      if (eventPrices[periodCount]?.[currentLocation]?.[candy.name]) {
        finalCost = eventPrices[periodCount][currentLocation][candy.name];
      }
      // Then check 'any' location event price
      else if (eventPrices[periodCount]?.['any']?.[candy.name]) {
        finalCost = eventPrices[periodCount]['any'][candy.name];
      }
      // Finally fall back to base price
      else {
        finalCost = candyPrices[candy.name]?.[periodCount] || 0;
      }

      // Get price breakdown showing base price and joker effects
      // (consecutiveSalesCount already calculated once above)

      // Use pre-computed joker service if available, otherwise fall back to regular calculation
      const priceBreakdown = jokerServiceComputed
        ? jokerService.getPriceBreakdown(
            finalCost,
            jokers,
            periodCount,
            currentInventoryLimit,
            activeEffects,
            consecutiveSalesCount,
            totalCandiesSold
          )
        : { basePrice: finalCost, jokerEffects: [], finalPrice: finalCost };

      // Note: Price storage moved to separate useEffect to avoid setState during render

      // Get inventory information for this candy
      const inventoryItem = inventory.find((item) => item.name === candy.name);

      return {
        ...candy,
        basePrice: finalCost, // Use finalCost as basePrice
        cost: finalCost,
        quantityOwned: inventoryItem?.quantity || 0,
        averagePrice: inventoryItem?.price || null,
        priceBreakdown,
      };
    });
    const endTime = performance.now();
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `⏱️ Candy calculation took ${(endTime - startTime).toFixed(2)}ms`
      );
    }
    return result;
  }, [
    periodCount,
    currentLocation,
    inventory,
    candyPrices,
    gameData.eventPrices,
    jokerCount,
    activeEffects,
    inventoryLimit,
    jokers,
    jokerServiceComputed,
    totalCandiesSold,
  ]);

  // Sync memoized candies to state only when they change
  useEffect(() => {
    setCandies(calculatedCandies);
  }, [calculatedCandies]);

  const [selectedCandyIndex, setSelectedCandyIndex] = useState<number | null>(
    null
  );
  const [modalMode, setModalMode] = useState<'buy' | 'sell'>('buy');
  const [isTransactionModalOpening, setIsTransactionModalOpening] =
    useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [dayStatsModalVisible, setDayStatsModalVisible] = useState(false);
  const [dayStatsBonuses, setDayStatsBonuses] = useState<
    Array<{
      jokerName: string;
      amount: number;
      emoji?: string;
    }>
  >([]);
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
    isBonusModal?: boolean;
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
  const [showLunchMinigames, setShowLunchMinigames] = useState(false);

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
          // Check for Time Zone Arbitrage joker effect (morning purchase discount)
          const periodWithinDay = periodCount % 8;
          const isMorning = periodWithinDay <= 2; // Periods 0, 1, 2 are "morning"
          const hasTimeZoneArbitrage = jokers.some(
            (joker: any) => joker.id === 42
          );

          let purchasePrice = candy.cost;
          if (hasTimeZoneArbitrage && isMorning) {
            purchasePrice = candy.cost * 0.9; // 10% discount
            console.log(
              `🕘 Time Zone Arbitrage: Morning purchase discount applied! ${candy.cost} -> ${purchasePrice.toFixed(2)}`
            );
          }

          const totalCost = purchasePrice * quantity;
          if (balance < totalCost) {
            return candy;
          }

          // Try to add to inventory first - this will check inventory limits
          const inventorySuccess = addToInventory(
            candy.name,
            quantity,
            purchasePrice,
            periodCount // Track when candy was purchased
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
              ? purchasePrice
              : (candy.averagePrice * candy.quantityOwned +
                  purchasePrice * quantity) /
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
          addSale({
            candyId: candy.name,
            candyName: candy.name,
            quantity: quantity,
            price: candy.cost,
            total: candy.cost * quantity,
            timestamp: Date.now(),
            period: periodCount,
          }); // General sales tracking

          // === CALCULATE ALL BONUSES FROM REDUX STATE ===
          let multiplier = 1;
          const bonusDetails: Array<{
            emoji: string;
            name: string;
            multiplier: number;
            flatBonus?: number;
          }> = [];

          // 1. Check for one-time sell multiplier jokers (Persuasion, etc) from Redux state
          const sellMultiplierInfo = jokerService.hasOneTimeSellMultiplier(
            jokers, // From Redux via useJokers()
            periodCount,
            activeEffects // From Redux via useJokers()
          );
          if (sellMultiplierInfo.hasEffect && sellMultiplierInfo.multiplier) {
            multiplier *= sellMultiplierInfo.multiplier;
            bonusDetails.push({
              emoji: sellMultiplierInfo.jokerEmoji || '🗣️',
              name: sellMultiplierInfo.jokerName,
              multiplier: sellMultiplierInfo.multiplier,
            });
            console.log(
              `🗣️ ${sellMultiplierInfo.jokerName} activated! ${sellMultiplierInfo.multiplier}x multiplier applied`
            );

            // Clear the one-time effect after use
            if (sellMultiplierInfo.jokerId) {
              clearActiveEffect(sellMultiplierInfo.jokerId);
              console.log(
                `🗣️ ${sellMultiplierInfo.jokerName} effect cleared after sale`
              );
            }
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
            bonusDetails.push({
              emoji: '⚖️',
              name: 'Even Stevens',
              multiplier: 1.1,
            });
            console.log(
              `⚖️ Even Stevens: +10% sales bonus applied (inventory limit: ${candyInventoryLimit})`
            );
          } else if (hasOddTodd && candyInventoryLimit % 2 === 1) {
            multiplier *= 1.1;
            bonusDetails.push({
              emoji: '🎭',
              name: 'Odd Todd',
              multiplier: 1.1,
            });
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
            bonusDetails.push({
              emoji: '🏃',
              name: 'Hopscotch',
              multiplier: 1.2,
            });
            console.log(
              `🏃 Hopscotch Bonus: +20% sales bonus applied (period ${period} is even)`
            );
          }

          if (hasSwingset && consecutivePeriodSales() > 1) {
            const swingsetMultiplier = 1 + (consecutivePeriodSales() - 1) * 0.1;
            multiplier *= swingsetMultiplier;
            bonusDetails.push({
              emoji: '⛹️',
              name: 'Swingset',
              multiplier: swingsetMultiplier,
            });
            console.log(
              `⛹️ Swingset Momentum: ${((swingsetMultiplier - 1) * 100).toFixed(0)}% sales bonus applied`
            );
          }

          // 4. Check for Sunset Surge afternoon bonus
          const periodWithinDay = periodCount % 8;
          const isAfternoon = periodWithinDay >= 3; // Periods 3, 4, 5, 6, 7 are "afternoon"
          const hasSunsetSurge = jokers.some((joker: any) => joker.id === 38);

          if (hasSunsetSurge && isAfternoon) {
            multiplier *= 1.1; // 10% bonus
            bonusDetails.push({
              emoji: '🌅',
              name: 'Sunset Surge',
              multiplier: 1.1,
            });
            console.log(
              `🌅 Sunset Surge: +10% afternoon sales bonus applied (period ${periodWithinDay + 1} is afternoon)`
            );
          }

          // 5. Check for Bulk Sale bonus (sell >50% of inventory space in one sale)
          const hasBulkSale = jokers.some(
            (joker: any) => joker.id === JOKER_IDS.BULK_SALE
          );
          const inventoryLimit = getInventoryLimit();
          const isBulkSale = quantity > inventoryLimit * 0.5; // More than 50% of inventory space

          if (hasBulkSale && isBulkSale) {
            multiplier *= 1.2; // 20% bonus
            bonusDetails.push({
              emoji: '📦',
              name: 'Bulk Sale',
              multiplier: 1.2,
            });
            console.log(
              `📦 Bulk Sale: +20% sales bonus applied (selling ${quantity} > ${(inventoryLimit * 0.5).toFixed(1)} slots)`
            );
          }

          // 6. Check for Slow Cooker sell multiplier (persistent joker)
          const hasSlowCooker = jokers.some(
            (j) => j.id === JOKER_IDS.SLOW_COOKER.toString()
          );
          if (hasSlowCooker) {
            // Get purchase period from inventory to calculate hold duration
            const inventoryItem = inventory.find(
              (item) => item.name === candy.name
            );
            const purchasedAtPeriod = inventoryItem?.purchasedAt ?? periodCount;
            const periodsHeld = Math.max(
              1,
              periodCount - purchasedAtPeriod + 1
            );
            const slowCookerMultiplier = Math.pow(1.05, periodsHeld); // Compound 5% per period
            multiplier *= slowCookerMultiplier;
            bonusDetails.push({
              emoji: '🍲',
              name: 'Slow Cooker',
              multiplier: slowCookerMultiplier,
            });
            console.log(
              `🍲 Slow Cooker: +${((slowCookerMultiplier - 1) * 100).toFixed(0)}% sales bonus applied (held for ${periodsHeld} periods, ${slowCookerMultiplier.toFixed(3)}x multiplier)`
            );
          }

          // 7. Calculate profit-based hall pass bonus from Redux state
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
            bonusDetails.push({
              emoji: '🎖️',
              name: 'Hall Pass',
              multiplier: 1,
              flatBonus: hallPassProfitBonus,
            });
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
          recordDailyStatsSale(candy.name, quantity, totalGain, periodCount); // Track best sale and most sold candy
          removeFromInventory(candy.name, quantity);

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
        // Check state after a brief delay to see if something is resetting it
        setTimeout(() => {
          console.log(
            '🔵 [Delayed check] locationModalVisible state after 100ms'
          );
        }, 100);
      }
    }
  };

  const dispatch = useAppDispatch();

  const handleLocationSelect = useCallback(
    (location: Location) => {
      // Wrap all updates in startTransition to batch them together
      startTransition(() => {
        setLocationModalVisible(false);
        setLocalPricesUpdating(true);

        // Check for Trade Routes joker (id: 39) and increment inventory limit if present
        const hasTradeRoutes = jokers.some((joker: any) => joker.id === 39);
        if (hasTradeRoutes) {
          console.log(
            '🗺️ Trade Routes active: +1 inventory limit on location change'
          );
          dispatch(incrementMaxInventory(1));
        }

        // Check for Something from Nothing joker (id: 46) and add candy generation
        const hasSomethingFromNothing = jokers.some(
          (joker: any) => joker.id === 46
        );
        if (hasSomethingFromNothing) {
          console.log(
            '✨ Something from Nothing active: +1 of each candy type'
          );
          const candyTypes = [
            'Snickers',
            'M&Ms',
            'Skittles',
            'Warheads',
            'Sour Patch Kids',
            'Bubble Gum',
            'Jaw Breaker',
          ];
          candyTypes.forEach((candyType) => {
            // Add 1 of each candy type to inventory at $0 purchase price
            const currentCandy = candies.find((c) => c.name === candyType);
            if (currentCandy) {
              const success = addToInventory(
                candyType,
                1,
                0, // Free candy from Something from Nothing
                periodCount
              );
              if (success) {
                console.log(
                  `✨ Something from Nothing: Added 1 ${candyType} at $0 (free candy)`
                );
              } else {
                console.log(
                  `✨ Something from Nothing: Failed to add ${candyType} (inventory full)`
                );
              }
            }
          });
        }

        // Call incrementPeriod and update flavor text
        incrementPeriod(location);
        setEvent('PERIOD_CHANGE');

        // Reset loading state after 1.5 seconds
        setTimeout(() => {
          setLocalPricesUpdating(false);
        }, 625);
      });
    },
    [jokers, dispatch, incrementPeriod, setEvent, candies, addToInventory]
  );

  const handleEndDay = () => {
    console.log('🏠 End Day button pressed');
    setEndDayConfirmVisible(true);
  };

  const handleEndDayConfirm = () => {
    console.log('🏠 End Day confirmed');
    // Trigger success haptic feedback when ending day
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setEndDayConfirmVisible(false);

    // Check for Perfect Bake joker bonus (empty inventory at end of day)
    const bonuses: Array<{
      jokerName: string;
      amount: number;
      emoji?: string;
    }> = [];

    const perfectBakeJoker = findJokerById(jokers, JOKER_IDS.PERFECT_BAKE);
    if (perfectBakeJoker) {
      const totalInventory = getTotalInventoryCount();
      if (totalInventory === 0) {
        const bonusAmount = 300;
        add(bonusAmount);
        bonuses.push({
          jokerName: 'Perfect Bake',
          amount: bonusAmount,
          emoji: '🧁',
        });
        console.log(
          `🧁 Perfect Bake: +$${bonusAmount} for ending day with 0 candy!`
        );
      }
    }

    // Check for Making Cents joker bonus (cash ends in .00 at end of day)
    const makingCentsJoker = findJokerById(jokers, JOKER_IDS.MAKING_CENTS);
    if (makingCentsJoker) {
      const currentBalance = balance;
      const cents = Math.round((currentBalance % 1) * 100);
      if (cents === 0) {
        const bonusAmount = 1000;
        add(bonusAmount);
        bonuses.push({
          jokerName: 'Making Cents',
          amount: bonusAmount,
          emoji: '💵',
        });
        console.log(
          `💵 Making Cents: +$${bonusAmount} for ending day with balance at $${currentBalance.toFixed(2)}!`
        );
      }
    }

    setDayStatsBonuses(bonuses);

    // If it's day 5, go directly to game end screen
    if (day === 5) {
      console.log('🎮 Day 5 detected - navigating to game end screen');
      router.push('/game-end');
      return;
    }

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
    router.replace('/(tabs)/after-school');
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

  // Check if current period is lunch (period 5, which is index 4 in 0-indexed system)
  const isLunchPeriod = period === 5;

  const handleLunchBack = () => {
    console.log('🍔 handleLunchBack called');
    setShowLunchMinigames(false);
  };

  // Check if we should show copilot tutorial wrappers
  const showCopilotWrappers = day === 1 && periodCount === 0;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/school.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.contentContainer}>
          {showCopilotWrappers ? (
            <CopilotStep
              text={`Welcome to Candy Wars! Here is your HUD:
• You can see your cash on hand
• Savings in your piggy bank
• Current inventory count`}
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
                      text={`Keep an eye on the rumor mill, it can:
• Hint at the next special event
• Provide useful tips
`}
                      order={2}
                      name="market_rumor_mill"
                    >
                      <CopilotView>{children}</CopilotView>
                    </CopilotStep>
                  )}
                />
              </CopilotView>
            </CopilotStep>
          ) : (
            <GameHUD
              isModalOpening={isTransactionModalOpening}
              isModalOpen={selectedCandyIndex !== null}
              onInventoryPress={() => setInventoryModalVisible(true)}
            />
          )}

          {showCopilotWrappers ? (
            <CopilotStep
              // text={`Here's the candy market!
              // • Tap on any candy to buy or sell it
              // • Prices change every period!`}
              text={`Heres the current candy market:
• Click on a candy to buy or sell
• Candy prices change every period
`}
              order={3}
              name="market_list"
            >
              <CopilotView style={[styles.listContainer]}>
                <MarketList
                  candies={candies}
                  localPricesUpdating={localPricesUpdating}
                  isFocused={isFocused}
                  isLunchPeriod={isLunchPeriod}
                  showLunchMinigames={showLunchMinigames}
                  hasPlayedLunchMinigame={hasPlayedLunchMinigame}
                  onCandyPress={openModal}
                  onLunchBack={handleLunchBack}
                />
              </CopilotView>
            </CopilotStep>
          ) : (
            <View style={styles.listContainer}>
              <MarketList
                candies={candies}
                localPricesUpdating={localPricesUpdating}
                isFocused={isFocused}
                isLunchPeriod={isLunchPeriod}
                showLunchMinigames={showLunchMinigames}
                hasPlayedLunchMinigame={hasPlayedLunchMinigame}
                onCandyPress={openModal}
                onLunchBack={handleLunchBack}
              />
            </View>
          )}

          {showCopilotWrappers ? (
            <CopilotStep
              text="Use these buttons to advance periods or end the day to skip straight to after school!"
              order={4}
              name="market_buttons"
            >
              <CopilotView>
                <View style={styles.buttonContainer}>
                  {isLunchPeriod && !hasPlayedLunchMinigame ? (
                    // Lunch period before playing minigame: Show play minigames button and end day
                    <View style={styles.buttonRow}>
                      <PixelBorder
                        borderColor="rgba(250,204,21,1)"
                        borderWidth={3}
                        backgroundColor="rgba(253,224,71,1)"
                        innerPadding={0}
                        style={styles.bigButton}
                      >
                        <TouchableOpacity
                          style={styles.pixelButtonInner}
                          onPress={() => setShowLunchMinigames(true)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.lunchButtonText}>
                            🎮 Play Minigames
                          </Text>
                          <Text style={styles.lunchSubtext}>
                            Earn a joker during lunch!
                          </Text>
                        </TouchableOpacity>
                      </PixelBorder>

                      <PixelBorder
                        borderColor="rgba(185,28,28,1)"
                        borderWidth={3}
                        backgroundColor="rgba(239,68,68,1)"
                        innerPadding={0}
                        style={styles.smallButton}
                      >
                        <TouchableOpacity
                          style={styles.pixelButtonInner}
                          onPress={handleEndDay}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.endDayButtonText}>
                            {day === 5 ? 'Game End' : 'End Day'}
                          </Text>
                          <Text style={styles.endDaySubtext}>
                            {day === 5
                              ? 'Finish the game'
                              : 'Skip to after school'}
                          </Text>
                        </TouchableOpacity>
                      </PixelBorder>
                    </View>
                  ) : isLunchPeriod &&
                    !hasPlayedLunchMinigame &&
                    showLunchMinigames ? (
                    // In StudySubjectSelector: Show Leave Lunch button and end day (only if not played yet)
                    <View style={styles.buttonRow}>
                      <PixelBorder
                        borderColor="rgba(250,204,21,1)"
                        borderWidth={3}
                        backgroundColor="rgba(253,224,71,1)"
                        innerPadding={0}
                        style={styles.bigButton}
                      >
                        <TouchableOpacity
                          style={styles.pixelButtonInner}
                          onPress={handleLunchBack}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.lunchButtonText}>
                            🚪 Leave Lunch
                          </Text>
                          <Text style={styles.lunchSubtext}>
                            Back to market
                          </Text>
                        </TouchableOpacity>
                      </PixelBorder>

                      <PixelBorder
                        borderColor="rgba(185,28,28,1)"
                        borderWidth={3}
                        backgroundColor="rgba(239,68,68,1)"
                        innerPadding={0}
                        style={styles.smallButton}
                      >
                        <TouchableOpacity
                          style={styles.pixelButtonInner}
                          onPress={handleEndDay}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.endDayButtonText}>
                            {day === 5 ? 'Game End' : 'End Day'}
                          </Text>
                          <Text style={styles.endDaySubtext}>
                            {day === 5
                              ? 'Finish the game'
                              : 'Skip to after school'}
                          </Text>
                        </TouchableOpacity>
                      </PixelBorder>
                    </View>
                  ) : period === 8 && day === 5 ? (
                    // Period 8 on Day 5: Show end game button
                    <PixelBorder
                      borderColor="rgba(101,181,101,1)"
                      borderWidth={3}
                      backgroundColor="rgba(151,221,151,1)"
                      innerPadding={0}
                    >
                      <TouchableOpacity
                        style={styles.pixelButtonInner}
                        onPress={() => {
                          Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Success
                          );
                          router.push('/game-end');
                        }}
                        activeOpacity={0.8}
                      >
                        <TextWithEmojis
                          style={styles.nextPeriodButtonText}
                          imageSize={28}
                        >
                          🏆 End Game
                        </TextWithEmojis>
                        <TextWithEmojis style={styles.nextPeriodSubtext}>
                          See your final results!
                        </TextWithEmojis>
                      </TouchableOpacity>
                    </PixelBorder>
                  ) : period === 8 ? (
                    // Period 8 on other days: Show leave school button
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
                      <PixelBorder
                        borderColor="rgba(123,169,101,1)"
                        borderWidth={3}
                        backgroundColor="rgba(154,193,118,1)"
                        innerPadding={0}
                        style={styles.bigButton}
                      >
                        <TouchableOpacity
                          style={styles.pixelButtonInner}
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
                      </PixelBorder>

                      <PixelBorder
                        borderColor="rgba(185,28,28,1)"
                        borderWidth={3}
                        backgroundColor="rgba(239,68,68,1)"
                        innerPadding={0}
                        style={styles.smallButton}
                      >
                        <TouchableOpacity
                          style={styles.pixelButtonInner}
                          onPress={handleEndDay}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.endDayButtonText}>
                            {day === 5 ? 'Game End' : 'End Day'}
                          </Text>
                          <Text style={styles.endDaySubtext}>
                            {day === 5
                              ? 'Finish the game'
                              : 'Skip to after school'}
                          </Text>
                        </TouchableOpacity>
                      </PixelBorder>
                    </View>
                  )}
                </View>
              </CopilotView>
            </CopilotStep>
          ) : (
            <View style={styles.buttonContainer}>
              {isLunchPeriod && !hasPlayedLunchMinigame ? (
                // Lunch period before playing minigame: Show play minigames button and end day
                <View style={styles.buttonRow}>
                  <PixelBorder
                    borderColor="rgba(250,204,21,1)"
                    borderWidth={3}
                    backgroundColor="rgba(253,224,71,1)"
                    innerPadding={0}
                    style={styles.bigButton}
                  >
                    <TouchableOpacity
                      style={styles.pixelButtonInner}
                      onPress={() => setShowLunchMinigames(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.lunchButtonText}>
                        🎮 Play Minigames
                      </Text>
                      <Text style={styles.lunchSubtext}>
                        Earn a joker during lunch!
                      </Text>
                    </TouchableOpacity>
                  </PixelBorder>

                  <PixelBorder
                    borderColor="rgba(185,28,28,1)"
                    borderWidth={3}
                    backgroundColor="rgba(239,68,68,1)"
                    innerPadding={0}
                    style={styles.smallButton}
                  >
                    <TouchableOpacity
                      style={styles.pixelButtonInner}
                      onPress={handleEndDay}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.endDayButtonText}>
                        {day === 5 ? 'Game End' : 'End Day'}
                      </Text>
                      <Text style={styles.endDaySubtext}>
                        {day === 5 ? 'Finish the game' : 'Skip to after school'}
                      </Text>
                    </TouchableOpacity>
                  </PixelBorder>
                </View>
              ) : isLunchPeriod &&
                !hasPlayedLunchMinigame &&
                showLunchMinigames ? (
                // In StudySubjectSelector: Show Leave Lunch button and end day (only if not played yet)
                <View style={styles.buttonRow}>
                  <PixelBorder
                    borderColor="rgba(250,204,21,1)"
                    borderWidth={3}
                    backgroundColor="rgba(253,224,71,1)"
                    innerPadding={0}
                    style={styles.bigButton}
                  >
                    <TouchableOpacity
                      style={styles.pixelButtonInner}
                      onPress={handleLunchBack}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.lunchButtonText}>🚪 Leave Lunch</Text>
                      <Text style={styles.lunchSubtext}>Back to market</Text>
                    </TouchableOpacity>
                  </PixelBorder>

                  <PixelBorder
                    borderColor="rgba(185,28,28,1)"
                    borderWidth={3}
                    backgroundColor="rgba(239,68,68,1)"
                    innerPadding={0}
                    style={styles.smallButton}
                  >
                    <TouchableOpacity
                      style={styles.pixelButtonInner}
                      onPress={handleEndDay}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.endDayButtonText}>
                        {day === 5 ? 'Game End' : 'End Day'}
                      </Text>
                      <Text style={styles.endDaySubtext}>
                        {day === 5 ? 'Finish the game' : 'Skip to after school'}
                      </Text>
                    </TouchableOpacity>
                  </PixelBorder>
                </View>
              ) : period === 8 && day === 5 ? (
                // Period 8 on Day 5: Show end game button
                <PixelBorder
                  borderColor="rgba(101,181,101,1)"
                  borderWidth={3}
                  backgroundColor="rgba(151,221,151,1)"
                  innerPadding={0}
                >
                  <TouchableOpacity
                    style={styles.pixelButtonInner}
                    onPress={() => {
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success
                      );
                      router.push('/game-end');
                    }}
                    activeOpacity={0.8}
                  >
                    <TextWithEmojis
                      style={styles.nextPeriodButtonText}
                      imageSize={28}
                    >
                      🏆 End Game
                    </TextWithEmojis>
                    <TextWithEmojis style={styles.nextPeriodSubtext}>
                      See your final results!
                    </TextWithEmojis>
                  </TouchableOpacity>
                </PixelBorder>
              ) : period === 8 ? (
                // Period 8 on other days: Show leave school button
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
                  <PixelBorder
                    borderColor="rgba(123,169,101,1)"
                    borderWidth={3}
                    backgroundColor="rgba(154,193,118,1)"
                    innerPadding={0}
                    style={styles.bigButton}
                  >
                    <TouchableOpacity
                      style={styles.pixelButtonInner}
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
                  </PixelBorder>

                  <PixelBorder
                    borderColor="rgba(185,28,28,1)"
                    borderWidth={3}
                    backgroundColor="rgba(239,68,68,1)"
                    innerPadding={0}
                    style={styles.smallButton}
                  >
                    <TouchableOpacity
                      style={styles.pixelButtonInner}
                      onPress={handleEndDay}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.endDayButtonText}>
                        {day === 5 ? 'Game End' : 'End Day'}
                      </Text>
                      <Text style={styles.endDaySubtext}>
                        {day === 5 ? 'Finish the game' : 'Skip to after school'}
                      </Text>
                    </TouchableOpacity>
                  </PixelBorder>
                </View>
              )}
            </View>
          )}
        </View>
      </ImageBackground>

      <LocationModal
        visible={locationModalVisible}
        onClose={() => {
          setLocationModalVisible(false);
        }}
        onSelectLocation={handleLocationSelect}
        gameData={gameData}
      />

      {dayStatsModalVisible && (
        <DayStatsModal
          visible={dayStatsModalVisible}
          onClose={handleDayStatsClose}
          onCancel={handleDayStatsCancel}
          stats={
            getTotalStats() || {
              profit: 0,
              spent: 0,
              candiesSold: 0,
              netGain: 0,
            }
          }
          day={day}
          bonuses={dayStatsBonuses}
        />
      )}

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
        isBonusModal={confirmationModal.isBonusModal}
        confirmText="Awesome!"
        onConfirm={confirmationModal.onConfirm}
        onCancel={() =>
          setConfirmationModal((prev) => ({ ...prev, visible: false }))
        }
        theme={'market' as const}
      />

      <ConfirmationModal
        visible={endDayConfirmVisible}
        title={day === 5 ? 'End Game?' : 'End School Day?'}
        message={
          day === 5
            ? `This is the final day!\n\nEnding the game will take you to the results screen where you can see if you've paid off your debt.`
            : `You're currently in period ${period} of 8.\n\nEnding the day will skip the remaining periods and take you directly to after-school activities.`
        }
        emoji={day === 5 ? '🎮' : '🏠'}
        confirmText={day === 5 ? 'End Game' : 'End Day'}
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

      {/* Inventory Modal - only render when visible */}
      {inventoryModalVisible && (
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
  item: {
    marginBottom: 6,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#d4a574', // Brown crayon border
    shadowColor: colors.brown.secondary,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  priceSection: {
    alignItems: 'flex-end',
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
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
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
    color: colors.white,
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
    shadowColor: colors.red.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    alignItems: 'center',
  },
  endDayButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: colors.red.dark,
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
  pixelButtonInner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  lunchButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: '#b45309',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  lunchSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fffbeb',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 1,
    opacity: 0.9,
  },
});

// Export Market directly - the Tabs parent component handles remounting via gameResetSignal key
export default Market;
