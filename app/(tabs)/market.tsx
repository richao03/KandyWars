import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import colors from '../../src/constants/colors';
import { JOKER_IDS, findJokerById } from '../../src/constants/jokerIds';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useCandySales } from '../../src/hooks/useCandySales';
import { useComputedJokerEffects } from '../../src/hooks/useComputedJokerEffects';
import { useDailyStats } from '../../src/hooks/useDailyStats';
import { useEventHandler } from '../../src/hooks/useEventHandler';
import { useGame } from '../../src/hooks/useGame';
import { useHallPass } from '../../src/hooks/useHallPass';
import { useHomeMadeBonus } from '../../src/hooks/useHomeMadeBonus';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { usePriceDoubling } from '../../src/hooks/usePriceDoubling';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { resetDailyStats } from '../../src/store/slices/candySalesSlice';
import { getPeriodsPerDay } from '../../src/store/slices/gameSlice';
import { incrementMaxInventory } from '../../src/store/slices/inventorySlice';
import {
  consumeEffect,
  selectActiveEffects,
} from '../../src/store/slices/merchantSlice';
import { JokerService } from '../../src/utils/jokerService';
import { MerchantUtils } from '../../src/utils/merchantUtils';
import { MusicController } from '../../src/utils/musicController';
import { calculateSaleTotal } from '../../src/utils/saleCalculations';
import ConfirmationModal from '../components/ConfirmationModal';
import EventModal from '../components/EventModal';
import { Location } from '../components/LocationModal';
import MarketContent from '../components/MarketContent';
import TransactionModalManager, {
  TransactionModalHandle,
} from '../components/TransactionModalManager';
import { Candy } from '../types';
import { CANDY_REGISTRY } from '../../src/constants/candyRegistry';
import { useTutorial } from '../../src/hooks/useTutorial';
import { selectDifficultyLevel } from '../../src/store/slices/walletSlice';
import TutorialOverlay from '../components/TutorialOverlay';

// Lazy load modals that are shown less frequently
const DayStatsModal = lazy(() => import('../components/DayStatsModal'));
const SchoolsOutModal = lazy(() => import('../components/SchoolsOutModal'));
const SleepConfirmModal = lazy(() => import('../components/SleepConfirmModal'));
const StashMoneyModal = lazy(() => import('../components/StashMoneyModal'));
const InventoryModal = lazy(() => import('../components/InventoryModal'));
const LocationModal = lazy(() => import('../components/LocationModal'));

type CandyForMarket = Candy & {
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
};

const baseCandies = CANDY_REGISTRY.map((c) => ({
  name: c.name,
  baseMin: c.baseMin,
  baseMax: c.baseMax,
  types: c.types,
  size: c.size,
}));

function Market(props) {
  // Check if this tab is currently focused to prevent unnecessary renders
  const isFocused = useIsFocused();

  // Get periods per day based on hall pass selection (6 for Time Crunch, 8 otherwise)
  const periodsPerDay = useAppSelector((state) => getPeriodsPerDay(state));

  // Debug: Log mount/unmount
  const instanceIdRef = useRef(Math.random().toString(36).substring(7));
  useEffect(() => {
    if (__DEV__) {
      console.log(
        `🟢 Market component MOUNTED - Instance: ${instanceIdRef.current}`
      );
    }

    // Music will be managed by the showLunchMinigames effect below
    // No need to manually stop/start here - MusicController handles transitions

    return () => {
      if (__DEV__) {
        console.log(
          `🔴 Market component UNMOUNTED - Instance: ${instanceIdRef.current}`
        );
      }
      // No cleanup needed - next view will set its own music
    };
  }, []);

  const { rng, seed, gameData, getOriginalCandyPrice, restoreCandyPrice } =
    useSeed();

  const { balance, spend, add } = useWallet();

  // Track active view on mount only
  useEffect(() => {
    setLastActiveView('market');
  }, [setLastActiveView]);

  // Reset lunch minigames flag when period advances past lunch period
  const lunchPeriod = Math.floor(periodsPerDay / 2);
  useEffect(() => {
    if (period !== lunchPeriod && showLunchMinigames) {
      if (__DEV__) console.log(
        `🍽️ Period advanced past ${lunchPeriod}, hiding lunch minigames`
      );
      setShowLunchMinigames(false);
    }
  }, [period, lunchPeriod, showLunchMinigames]);
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
    isAfterSchool,
    locationHistory,
  } = useGame();

  // Music is managed by the showLunchMinigames effect below
  // (removed duplicate music effect to prevent race conditions)

  // Log every render to see how many instances are active
  if (__DEV__) console.log(
    `📊 Market RENDER - Instance: ${instanceIdRef.current}, Period: ${period}, PeriodCount: ${periodCount}, Day: ${day}, isAfterSchool: ${isAfterSchool}`
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
  const { applySalePriceBonus, getSalePriceBonus, selectedPassIds } =
    useHallPass();

  // Get pre-computed hall pass modifiers from Redux (computed once at game start)
  const hallPassModifiers = useAppSelector((state) => state.hallPassModifiers);

  // Get candy sales state for Vacuum Sealer penalty check
  const hasEarlySaleToday = useAppSelector(
    (state) => state.candySales.hasEarlySaleToday
  );

  // Get merchant effects
  const merchantEffects = useAppSelector(selectActiveEffects);

  // Initialize computed joker effects system
  useComputedJokerEffects();

  const jokerService = useMemo(() => JokerService.getInstance(), []);

  // Tutorial system
  const { currentStep: tutorialStep, isActive: tutorialActive, advance: advanceTutorial, skip: skipTutorial, start: startTutorial, tutorialComplete, registerTarget } = useTutorial();
  const difficultyLevel = useAppSelector(selectDifficultyLevel);

  // Tutorial target refs
  const walletRef = useRef<View>(null);
  const piggyRef = useRef<View>(null);
  const gummyBearsRef = useRef<View>(null);
  const nextPeriodRef = useRef<View>(null);
  const marketContainerRef = useRef<View>(null);
  const containerOffsetRef = useRef({ x: 0, y: 0 });

  // Start tutorial on mount for difficulty 1 first game
  useEffect(() => {
    if (difficultyLevel === 1 && !tutorialComplete && periodCount === 0 && !tutorialActive) {
      startTutorial();
    }
  }, [difficultyLevel, tutorialComplete, periodCount, tutorialActive, startTutorial]);

  // Measure the market container offset so we can convert window coords to local coords
  const measureContainerOffset = useCallback((): Promise<{ x: number; y: number }> => {
    return new Promise((resolve) => {
      if (marketContainerRef.current) {
        (marketContainerRef.current as View).measureInWindow((cx: number, cy: number) => {
          containerOffsetRef.current = { x: cx, y: cy };
          resolve({ x: cx, y: cy });
        });
      } else {
        resolve(containerOffsetRef.current);
      }
    });
  }, []);

  // Measure tutorial targets when step changes
  const measureTarget = useCallback((ref: React.RefObject<View | null>, stepId: number) => {
    if (ref.current) {
      measureContainerOffset().then((offset) => {
        (ref.current as View).measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            // Convert from window coords to market container local coords
            registerTarget(stepId, {
              x: x - offset.x,
              y: y - offset.y,
              width,
              height,
            });
          }
        });
      });
    }
  }, [registerTarget, measureContainerOffset]);

  // Re-measure targets when tutorial step changes
  // Steps 4, 7, 8 are inside TransactionModal — measured there
  // Step 9 is Jokers tab — measured in (tabs)/_layout.tsx
  useEffect(() => {
    if (!tutorialActive) return;

    // Small delay to ensure layout is complete
    const timer = setTimeout(() => {
      if (tutorialStep === 1) measureTarget(walletRef, 1);
      if (tutorialStep === 2) measureTarget(piggyRef, 2);
      if (tutorialStep === 3) measureTarget(gummyBearsRef, 3);
      if (tutorialStep === 5) measureTarget(nextPeriodRef, 5);
      if (tutorialStep === 6) measureTarget(gummyBearsRef, 6);
    }, 300);

    return () => clearTimeout(timer);
  }, [tutorialStep, tutorialActive, measureTarget]);

  usePriceDoubling(); // This hook handles price restoration on period change
  useHomeMadeBonus(); // This hook handles Home Made joker bonus
  // Farmers Carry hook now runs in GameEffectsManager (root layout) to ensure it's always mounted

  // Show location modal after event modal is dismissed
  useEffect(() => {
    if (pendingLocationModal && !hasActiveEvent) {
      if (__DEV__) console.log('Market - Event dismissed, showing location modal');
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
      if (__DEV__) console.log('Market - Location/period changed, clearing pending modal');
      setPendingLocationModal(false);
    }
  }, [currentLocation, periodCount]);

  // Track the last event period to prevent duplicate triggers
  const lastEventPeriodRef = useRef<number>(-1);
  const lastHintPeriodRef = useRef<number>(-1);

  // Ref for transaction modal manager (prevents parent re-renders)
  const transactionModalRef = useRef<TransactionModalHandle>(null);

  // Log all events once when game is initialized
  const hasLoggedEventsRef = useRef(false);
  if (!hasLoggedEventsRef.current && gameData.periodEvents.length > 0) {
    hasLoggedEventsRef.current = true;
    if (__DEV__) {
      console.log(
        `📊 ALL GENERATED EVENTS (${gameData.periodEvents.length} total):`
      );
      gameData.periodEvents.forEach((event, index) => {
        console.log(
          `  Event ${index + 1}: Period ${event.period}, Effect: ${event.effect}, Candy: ${event.candy || 'N/A'}, Location: ${event.location || 'ANY'}, Multiplier: ${event.multiplier || 'N/A'}`
        );
      });
    }
  }

  // Update flavor text when period changes
  useEffect(() => {
    // Only process events if this instance is focused (prevents duplicate event processing from zombie instances)
    if (!isFocused) {
      return;
    }

    // Debounce flavor text updates to prevent rapid re-renders during navigation
    const timeoutId = setTimeout(() => {
      // Check for current event
      // Universal events (isUniversal=true) trigger at any location
      // Location-based events (isUniversal=false) require matching location
      // Note: periodCount is 0-indexed (0-39), but event periods are 1-indexed (1-40)
      const currentEvent = gameData.periodEvents.find(
        (e) =>
          e.period === periodCount + 1 &&
          (e.isUniversal || e.location === currentLocation)
      );

      // Check for upcoming events in next period (for hints)
      // Always show hints for all upcoming events (Option 3: Hybrid)
      // Note: periodCount is 0-indexed, event periods are 1-indexed, so +2 for next period
      const nextPeriodEvents = gameData.periodEvents.filter(
        (e) => e.period === periodCount + 2
      );

      // Use the already-calculated period instead of recalculating
      if (period === 0) {
        setEvent('NEW_DAY');
      } else if (currentEvent) {
        // Major events: FOUND_MONEY, LOSE_MONEY, STASH_LOCKED - show modal
        // Minor events: PRICE_SPIKE, PRICE_DROP - show flavor text only

        // Set event type for tracking
        setEvent(currentEvent.effect);

        // Only trigger event if we haven't already triggered it for this period
        // This prevents duplicate event triggers when other dependencies change
        if (__DEV__) console.log(
          `🔄 Event trigger check - lastEventPeriod: ${lastEventPeriodRef.current}, currentPeriod: ${periodCount}`
        );
        if (lastEventPeriodRef.current !== periodCount) {
          lastEventPeriodRef.current = periodCount;

          // Minor events (PRICE_SPIKE, PRICE_DROP): Show flavor text only, no modal
          if (
            currentEvent.effect === 'PRICE_SPIKE' ||
            currentEvent.effect === 'PRICE_DROP'
          ) {
            if (__DEV__) console.log(
              '🎯 MINOR EVENT: Showing flavor text only (no modal):',
              currentEvent.flavorText
            );
            setFlavorText(currentEvent.flavorText || '');
          }
          // Major events (FOUND_MONEY, LOSE_MONEY, STASH_LOCKED): Show modal
          else {
            if (__DEV__) console.log(
              '🎯 MAJOR EVENT: Triggering event modal for period',
              period,
              ':',
              currentEvent.title
            );
            handleEvent(currentEvent);
          }
        } else {
          if (__DEV__) console.log(
            `⏭️ Event already triggered for period ${periodCount}, skipping`
          );
        }
      } else if (nextPeriodEvents.length > 0) {
        // Show hints for all upcoming events in next period
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
            activeEffects,
            periodsPerDay
          );

          if (__DEV__) console.log(
            `💡 Hint check - ${nextPeriodEvents.length} events next period, baseChance: ${baseHintChance}, effectiveChance: ${effectiveHintChance}`
          );

          if (Math.random() < effectiveHintChance) {
            // Show all hints from upcoming events (multiple hints possible)
            const allHints = nextPeriodEvents
              .map((e) => e.hint)
              .filter((h) => h)
              .join('\n\n');
            if (__DEV__) console.log(
              `💡 Showing hints for ${nextPeriodEvents.length} events:\n${allHints}`
            );
            setHint(allHints);
          } else {
            if (__DEV__) console.log(`💡 Random check failed, showing flavor text instead`);

            // Show period-specific flavor text instead of hint
            if (period <= 2) {
              setEvent('MORNING_TRADE');
            } else if (
              period >= Math.floor(periodsPerDay / 2) &&
              period <= Math.ceil(periodsPerDay * 0.75)
            ) {
              setEvent('LUNCH_RUSH');
            } else if (period >= periodsPerDay - 1) {
              setEvent('FINAL_PERIOD');
            } else {
              setEvent('PERIOD_CHANGE');
            }
          }
        }
      } else {
        // Period-specific flavor text based on time of day
        if (period <= 2) {
          setEvent('MORNING_TRADE');
        } else if (
          period >= Math.floor(periodsPerDay / 2) &&
          period <= Math.ceil(periodsPerDay * 0.75)
        ) {
          setEvent('LUNCH_RUSH');
        } else if (period >= periodsPerDay - 1) {
          setEvent('FINAL_PERIOD');
        } else {
          setEvent('PERIOD_CHANGE');
        }
      }
    }, 50); // 50ms debounce

    return () => clearTimeout(timeoutId);
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
    period,
    periodsPerDay,
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

  // Simple price lookup from gameData - NO heavy calculations
  // Price breakdowns are calculated lazily in TransactionModal when needed
  const calculatedCandies = useMemo(() => {
    const eventPrices = gameData.eventPrices || {};

    return baseCandies.map((candy) => {
      // Just look up the price - no heavy calculations!
      let basePrice: number;

      // First check location-specific event price
      if (eventPrices[periodCount]?.[currentLocation]?.[candy.name]) {
        basePrice = eventPrices[periodCount][currentLocation][candy.name];
      }
      // Then check 'any' location event price
      else if (eventPrices[periodCount]?.['any']?.[candy.name]) {
        basePrice = eventPrices[periodCount]['any'][candy.name];
      }
      // Finally fall back to base price from gameData
      else {
        basePrice = gameData.candyPrices[candy.name]?.[periodCount] || 0;
      }

      // Get inventory data
      const inventoryItem = inventory.find((item) => item.name === candy.name);

      return {
        ...candy,
        basePrice,
        cost: basePrice,
        quantityOwned: inventoryItem?.quantity ?? 0,
        averagePrice: inventoryItem?.price ?? null,
        // priceBreakdown removed - TransactionModal calculates on-demand
      };
    });
  }, [
    periodCount,
    currentLocation,
    gameData.candyPrices,
    gameData.eventPrices,
    inventory,
  ]);

  // Sync memoized candies to state only when they change
  useEffect(() => {
    setCandies(calculatedCandies);
  }, [calculatedCandies]);

  // Modal state moved to TransactionModalManager to prevent parent re-renders
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
  const [lunchConfirmVisible, setLunchConfirmVisible] = useState(false);
  const [isDroneDeposit, setIsDroneDeposit] = useState(false);

  // Set music when screen is focused or lunch minigames toggle
  // This handles both initial mount and returning from minigames
  useFocusEffect(
    useCallback(() => {
      const targetTrack = showLunchMinigames ? 'day2' : 'day1';
      // Only change music if it's different from current track
      if (MusicController.getCurrentTrack() !== targetTrack) {
        if (__DEV__) console.log(`🎵 [MARKET] Setting music: ${targetTrack}`);
        MusicController.setTrack(targetTrack);
      }
    }, [showLunchMinigames])
  );

  // Stop cricket music when schoolsOut modal is dismissed
  useEffect(() => {
    if (!schoolsOutModalVisible) {
      MusicController.stop();
    }
  }, [schoolsOutModalVisible]);

  const openModal = useCallback((index: number) => {
    // Open modal via ref - this does NOT cause parent re-render!
    transactionModalRef.current?.open(index);

    // Advance tutorial when user taps Gummy Bears (index 0 = first candy)
    // Step 3 → 4 (buy modal), Step 6 → 7 (sell modal)
    if ((tutorialStep === 3 || tutorialStep === 6) && index === 0) {
      advanceTutorial();
    }
  }, [tutorialStep, advanceTutorial]);

  const closeModal = useCallback(() => {
    transactionModalRef.current?.close();
  }, []);

  const handleInventoryPress = useCallback(() => {
    setInventoryModalVisible(true);
  }, []);

  // --- Refs for read-only values used inside handleTransaction ---
  // These prevent handleTransaction from being recreated when these values change
  const candiesRef = useRef(candies);
  const balanceRef = useRef(balance);
  const inventoryRef = useRef(inventory);
  const jokersRef = useRef(jokers);
  const activeEffectsRef = useRef(activeEffects);
  const merchantEffectsRef = useRef(merchantEffects);
  const hallPassModifiersRef = useRef(hallPassModifiers);
  const hasEarlySaleTodayRef = useRef(hasEarlySaleToday);
  const periodsPerDayRef = useRef(periodsPerDay);
  const periodCountRef = useRef(periodCount);
  const totalCandiesSoldRef = useRef(totalCandiesSold);
  const locationHistoryRef = useRef(locationHistory);

  useEffect(() => { candiesRef.current = candies; }, [candies]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
  useEffect(() => { jokersRef.current = jokers; }, [jokers]);
  useEffect(() => { activeEffectsRef.current = activeEffects; }, [activeEffects]);
  useEffect(() => { merchantEffectsRef.current = merchantEffects; }, [merchantEffects]);
  useEffect(() => { hallPassModifiersRef.current = hallPassModifiers; }, [hallPassModifiers]);
  useEffect(() => { hasEarlySaleTodayRef.current = hasEarlySaleToday; }, [hasEarlySaleToday]);
  useEffect(() => { periodsPerDayRef.current = periodsPerDay; }, [periodsPerDay]);
  useEffect(() => { periodCountRef.current = periodCount; }, [periodCount]);
  useEffect(() => { totalCandiesSoldRef.current = totalCandiesSold; }, [totalCandiesSold]);
  useEffect(() => { locationHistoryRef.current = locationHistory; }, [locationHistory]);

  const handleTransaction = useCallback(
    (candyIndex: number, quantity: number, mode: 'buy' | 'sell') => {
      if (candyIndex === null || candyIndex === undefined) return;
      const candy = candiesRef.current[candyIndex];
      if (!candy) return;

      if (mode === 'buy') {
        // Check for Time Zone Arbitrage joker effect (morning purchase discount)
        const currentPeriodCount = periodCountRef.current;
        const periodWithinDay = currentPeriodCount % 8;
        const isMorning = periodWithinDay <= 2; // Periods 0, 1, 2 are "morning"
        const currentJokers = jokersRef.current;
        const hasTimeZoneArbitrage = currentJokers.some(
          (joker: any) => joker.id == 42 || joker.id === '42'
        );

        let purchasePrice = candy.cost;
        if (hasTimeZoneArbitrage && isMorning) {
          purchasePrice = candy.cost * 0.9; // 10% discount
          if (__DEV__) console.log(
            `🕘 Time Zone Arbitrage: Morning purchase discount applied! ${candy.cost} -> ${purchasePrice.toFixed(2)}`
          );
        }

        const totalCost = purchasePrice * quantity;
        if (balanceRef.current < totalCost) {
          return;
        }

        // Try to add to inventory first - this will check inventory limits
        const inventorySuccess = addToInventory(
          candy.name,
          quantity,
          purchasePrice,
          currentPeriodCount // Track when candy was purchased
        );
        if (!inventorySuccess) {
          // Inventory is full, transaction fails
          return;
        }

        spend(totalCost);
        addSpent(totalCost); // Track daily spending

        // Reset consecutive sales tracking when buying
        resetSales();

        // Pure state update — no side effects
        const newQty = candy.quantityOwned + quantity;
        const newAvg =
          candy.averagePrice === null
            ? purchasePrice
            : (candy.averagePrice * candy.quantityOwned +
                purchasePrice * quantity) /
              newQty;

        setCandies((prev) =>
          prev.map((c, i) =>
            i !== candyIndex
              ? c
              : { ...c, quantityOwned: newQty, averagePrice: newAvg }
          )
        );
      } else {
        // === SELLING LOGIC ===
        const currentPeriodCount = periodCountRef.current;
        const currentJokers = jokersRef.current;
        const currentActiveEffects = activeEffectsRef.current;
        const currentInventory = inventoryRef.current;
        const currentHallPassModifiers = hallPassModifiersRef.current;
        const currentMerchantEffects = merchantEffectsRef.current;
        const currentHasEarlySaleToday = hasEarlySaleTodayRef.current;
        const currentPeriodsPerDay = periodsPerDayRef.current;

        // === HANDLE ONE-TIME JOKERS (with side effects) ===
        let oneTimeMultiplier = 1;
        const bonusDetails: Array<{
          emoji: string;
          name: string;
          multiplier: number;
          flatBonus?: number;
        }> = [];

        // 1. Check for one-time sell multiplier jokers (Persuasion, etc) from Redux state
        const sellMultiplierInfo = jokerService.hasOneTimeSellMultiplier(
          currentJokers,
          currentPeriodCount,
          currentActiveEffects
        );
        if (sellMultiplierInfo.hasEffect && sellMultiplierInfo.multiplier) {
          oneTimeMultiplier *= sellMultiplierInfo.multiplier;
          bonusDetails.push({
            emoji: sellMultiplierInfo.jokerEmoji || '🗣️',
            name: sellMultiplierInfo.jokerName,
            multiplier: sellMultiplierInfo.multiplier,
          });
          if (__DEV__) console.log(
            `🗣️ ${sellMultiplierInfo.jokerName} activated! ${sellMultiplierInfo.multiplier}x multiplier applied`
          );

          // Clear the one-time effect after use
          if (sellMultiplierInfo.jokerId) {
            clearActiveEffect(sellMultiplierInfo.jokerId);
            if (__DEV__) console.log(
              `🗣️ ${sellMultiplierInfo.jokerName} effect cleared after sale`
            );
          }
        }

        // Consume Influencer Shoutout if active (before calculation)
        if (MerchantUtils.hasInfluencerShoutout(currentMerchantEffects)) {
          dispatch(consumeEffect({ itemId: 'influencer_shoutout' }));
          if (__DEV__) console.log(
            '📣 Influencer Shoutout consumed (will be applied in calculation)'
          );
        }

        // === CALCULATE SALE USING SHARED FUNCTION ===
        const inventoryItem = currentInventory.find(
          (item) => item.name === candy.name
        );
        const purchasePrice = inventoryItem?.price ?? candy.cost;

        // Compute dynamic sale params from refs
        const currentPeriodsPerDayVal = currentPeriodsPerDay;
        const currentDay = Math.max(1, Math.floor(currentPeriodCount / currentPeriodsPerDayVal) + 1);
        const currentPeriodInDay = Math.max(1, (currentPeriodCount % currentPeriodsPerDayVal) + 1);
        const currentInventoryCount = getTotalInventoryCount();
        const dayStartPeriod = Math.floor(currentPeriodCount / currentPeriodsPerDayVal) * currentPeriodsPerDayVal;
        const todayLocations = new Set(
          (locationHistoryRef.current || [])
            .filter((h: any) => h.period >= dayStartPeriod)
            .map((h: any) => h.location)
        );

        const saleResult = calculateSaleTotal({
          candyName: candy.name,
          basePrice: candy.cost,
          purchasePrice,
          quantity,
          jokers: currentJokers,
          periodCount: currentPeriodCount,
          inventoryLimit: getInventoryLimit(),
          activeEffects: currentActiveEffects,
          hallPassModifiers: currentHallPassModifiers,
          merchantEffects: currentMerchantEffects,
          consecutivePeriodSales: consecutivePeriodSales(),
          totalCandiesSold: totalCandiesSoldRef.current || 0,
          hasEarlySaleToday: currentHasEarlySaleToday,
          initialMultiplier: oneTimeMultiplier,
          inventoryCount: currentInventoryCount,
          day: currentDay,
          uniqueLocationsToday: todayLocations.size,
          period: currentPeriodInDay,
          periodsPerDay: currentPeriodsPerDayVal,
        });

        // Merge bonus breakdown from one-time jokers
        bonusDetails.push(...saleResult.bonusBreakdown);

        const {
          totalGain,
          profitPerUnit,
          totalProfit,
          purchaseValue,
          hallPassBonus,
          jokerMultiplier,
          vacuumSealerPenalty,
        } = saleResult;

        const finalProfit = totalGain - purchaseValue;

        if (__DEV__) console.log(
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
          'hall pass bonus:',
          hallPassBonus,
          'joker multiplier:',
          jokerMultiplier,
          'vacuum sealer penalty:',
          vacuumSealerPenalty,
          'final profit:',
          finalProfit,
          'purchase value returned:',
          purchaseValue,
          'total gain:',
          totalGain
        );

        // All dispatches in the flat function body — React batches these
        add(totalGain);
        addProfit(finalProfit); // Track daily profit (profit only, not purchase value)
        addCandySold(quantity); // Track daily candy sales
        recordDailyStatsSale(candy.name, quantity, totalGain, currentPeriodCount); // Track best sale and most sold candy

        // Track sale for period-based hall pass unlocks (Time Crunch, Final Exam)
        // IMPORTANT: Pass finalProfit (profit after all bonuses/penalties) not revenue for accurate tracking
        if (__DEV__) console.log(
          `📊 Tracking sale for hall pass: ${candy.name}, Period: ${currentPeriodCount}, Profit: ${finalProfit.toFixed(2)}`
        );
        addSale({
          candyId: candy.name,
          candyName: candy.name,
          quantity: quantity,
          price: candy.cost,
          total: finalProfit, // ✅ Pass PROFIT (after all bonuses and penalties), not revenue
          timestamp: Date.now(),
          period: currentPeriodCount,
          periodsPerDay: currentPeriodsPerDay,
        });

        removeFromInventory(candy.name, quantity);

        // Pure state update — no side effects
        setCandies((prev) =>
          prev.map((c, i) =>
            i !== candyIndex
              ? c
              : { ...c, quantityOwned: c.quantityOwned - quantity }
          )
        );
      }

      closeModal();
    },
    [
      // Only stable dispatch callbacks remain as deps:
      addToInventory, spend, addSpent, resetSales, add, addProfit,
      addCandySold, recordDailyStatsSale, addSale, removeFromInventory,
      closeModal, jokerService, clearActiveEffect,
      dispatch, getInventoryLimit, consecutivePeriodSales,
    ]
  );

  // Tutorial step ref for use in callbacks without recreating them
  const tutorialStepRef = useRef(tutorialStep);
  useEffect(() => { tutorialStepRef.current = tutorialStep; }, [tutorialStep]);

  const handleNextDay = useCallback(() => {
    if (__DEV__) console.log(
      '🔵 handleNextDay called - period:',
      period,
      'day:',
      day,
      'hasActiveEvent:',
      hasActiveEvent,
      'periodsPerDay:',
      periodsPerDay
    );

    // Advance tutorial when user taps Next Period during step 5
    // Let normal flow happen (location modal), overlay hides until location is picked
    if (tutorialStepRef.current === 5) {
      advanceTutorial(); // → step 6
    }

    // Trigger success haptic feedback when advancing to next period
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Calculate lunch period dynamically (period 4 for 8-period days, period 3 for 6-period days)
    const lunchPeriod = Math.floor(periodsPerDay / 2);

    if (period === periodsPerDay) {
      // End of day - show day stats first
      if (__DEV__) {
        console.log(
          `🔵 Period ${periodsPerDay} reached (end of day) - showing day stats modal for day:`,
          day
        );
        console.log(
          '🔵 Current dayStatsModalVisible state:',
          dayStatsModalVisible
        );
      }
      setDayStatsModalVisible(true);
      if (__DEV__) console.log('🔵 setDayStatsModalVisible(true) called');
    } else if (period === lunchPeriod && !showLunchMinigames) {
      // Lunch period - Show lunch confirmation modal
      if (__DEV__) {
        console.log(
          `🍽️ [MARKET] 🎯 LUNCH PERIOD DETECTED! Period ${lunchPeriod} (lunch) - Showing lunch confirmation modal`
        );
        console.log(
          `🍽️ [MARKET] Day: ${day}, Period: ${period}, PeriodsPerDay: ${periodsPerDay}`
        );
      }
      setLunchConfirmVisible(true);
    } else {
      // Check if there's an active event
      if (hasActiveEvent) {
        if (__DEV__) console.log(
          '🔵 Market - Active event detected, will show location modal after event is dismissed'
        );
        setPendingLocationModal(true);
      } else {
        if (__DEV__) {
          console.log(
            '🔵 Market - No active event, showing location modal immediately'
          );
          console.log('🔵 Setting locationModalVisible to true');
        }
        setLocationModalVisible(true);
        if (__DEV__) console.log('🔵 locationModalVisible should now be true');
        // Check state after a brief delay to see if something is resetting it
        setTimeout(() => {
          if (__DEV__) console.log(
            '🔵 [Delayed check] locationModalVisible state after 100ms'
          );
        }, 100);
      }
    }
  }, [
    period,
    day,
    hasActiveEvent,
    dayStatsModalVisible,
    showLunchMinigames,
    periodsPerDay,
  ]);

  const dispatch = useAppDispatch();

  const handleLocationSelect = useCallback(
    (location: Location) => {
      // Check if player selected The Connect merchant
      if (location === 'the connect') {
        if (__DEV__) console.log(
          '🕶️ Player selected The Connect - navigating to merchant shop page'
        );
        setLocationModalVisible(false);
        router.push('/merchant-shop');
        return;
      }

      // Wrap all updates in startTransition to batch them together
      startTransition(() => {
        setLocationModalVisible(false);
        setLocalPricesUpdating(true);

        // Check for Trade Routes joker (id: 39) and increment inventory limit if present
        const hasTradeRoutes = jokers.some((joker: any) => joker.id === 39);
        if (hasTradeRoutes) {
          if (__DEV__) console.log(
            '🗺️ Trade Routes active: +1 inventory limit on location change'
          );
          dispatch(incrementMaxInventory(1));
        }

        // Reset lunch minigames flag when advancing from period 4
        if (showLunchMinigames) {
          if (__DEV__) console.log('🍽️ Advancing from lunch, hiding minigame view');
          setShowLunchMinigames(false);
        }

        // Detect day change for daily stat resets
        const oldDay = day;

        // Call incrementPeriod and update flavor text
        incrementPeriod(location);
        setEvent('PERIOD_CHANGE');

        // Check if we crossed into a new day and reset daily stats if so
        // Note: We can't directly read the new day here, but we can use periodCount
        // Day changes when periodCount % periodsPerDay === 0
        const newPeriodCount = periodCount + 1;
        const newDay = Math.floor((newPeriodCount - 1) / periodsPerDay) + 1;
        if (newDay > oldDay) {
          if (__DEV__) console.log(
            `🔄 Day changed from ${oldDay} to ${newDay} - resetting daily stats`
          );
          dispatch(resetDailyStats());
        }

        // Reset loading state after a short delay
        setTimeout(() => {
          setLocalPricesUpdating(false);
        }, 400);
      });
    },
    [
      jokers,
      dispatch,
      incrementPeriod,
      setEvent,
      candies,
      addToInventory,
      periodCount,
      showLunchMinigames,
      day,
      periodsPerDay,
    ]
  );

  const handleLunchConfirm = useCallback(() => {
    if (__DEV__) {
      console.log('🍽️ [MARKET] Lunch confirmed - showing minigame selection');
      console.log('🍽️ [MARKET] Setting showLunchMinigames = true');
    }
    setLunchConfirmVisible(false);
    setShowLunchMinigames(true);
  }, []);

  const handleEndDay = useCallback(() => {
    if (__DEV__) console.log('🏠 End Day button pressed');
    setEndDayConfirmVisible(true);
  }, []);

  const handleEndDayConfirm = useCallback(() => {
    if (__DEV__) console.log('🏠 End Day confirmed');
    // Trigger success haptic feedback when ending day
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setEndDayConfirmVisible(false);

    // Reset lunch minigames flag when ending day early
    if (showLunchMinigames) {
      if (__DEV__) console.log('🍽️ Ending day during lunch, hiding minigame view');
      setShowLunchMinigames(false);
    }

    // If we're on day 5 or completed all periods (40 for 8/day, 30 for 6/day), game will end after day stats
    const maxPeriods = periodsPerDay * 5;
    if (day >= 5 || periodCount >= maxPeriods) {
      if (__DEV__) {
        console.log(
          `🎮 Day 5 or all periods complete - will end game after showing day stats (max: ${maxPeriods})`
        );
        console.log('🎮 Day:', day, 'PeriodCount:', periodCount);
      }
    }

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
        const bonusAmount = 1000;
        add(bonusAmount);
        bonuses.push({
          jokerName: 'Perfect Bake',
          amount: bonusAmount,
          emoji: '🧁',
        });
        if (__DEV__) console.log(
          `🧁 Perfect Bake: +$${bonusAmount} for ending day with 0 candy!`
        );
      }
    }

    // Check for Treasure Chest joker bonus (cash per empty slot at end of day)
    const treasureChestJoker = findJokerById(jokers, JOKER_IDS.TREASURE_CHEST);
    if (treasureChestJoker) {
      const totalInventory = getTotalInventoryCount();
      const invLimit = getInventoryLimit();
      const emptySlots = Math.max(0, invLimit - totalInventory);
      if (emptySlots > 0) {
        const level = (treasureChestJoker as any).level ?? 1;
        const cashPerSlot = level === 1 ? 20 : level === 2 ? 50 : 100;
        const treasureBonus = emptySlots * cashPerSlot;
        add(treasureBonus);
        bonuses.push({
          jokerName: 'Treasure Chest',
          amount: treasureBonus,
          emoji: '🏴‍☠️',
        });
        if (__DEV__) console.log(
          `🏴‍☠️ Treasure Chest: +$${treasureBonus} for ${emptySlots} empty slots ($${cashPerSlot}/slot)!`
        );
      }
    }

    setDayStatsBonuses(bonuses);

    // Don't advance periods - just show day stats to simulate end of day
    if (__DEV__) console.log('🏠 Ending day early - showing day stats modal');

    // Reset all modal states and show day stats in a single batch
    if (__DEV__) console.log('🏠 Resetting all modal states');
    setLocationModalVisible(false);
    setSchoolsOutModalVisible(false);
    setStashMoneyModalVisible(false);
    setSleepConfirmModalVisible(false);

    // Brief delay to let modal closings render before opening day stats
    setTimeout(() => {
      if (__DEV__) {
        console.log('🏠 Now showing DayStatsModal for day:', day);
      }
      setDayStatsModalVisible(true);
    }, 150);
  }, [
    day,
    periodCount,
    periodsPerDay,
    balance,
    jokers,
    getTotalInventoryCount,
    getInventoryLimit,
    add,
    dayStatsModalVisible,
    showLunchMinigames,
  ]);

  const handleEndDayCancel = useCallback(() => {
    setEndDayConfirmVisible(false);
  }, []);

  // Day stats modal handlers
  const handleDayStatsClose = useCallback(() => {
    if (__DEV__) {
      console.log('📊 Day stats modal closing - checking if game should end');
      console.log(
        `📊 Current state: day=${day}, period=${period}, periodCount=${periodCount}, periodsPerDay=${periodsPerDay}`
      );
    }
    setDayStatsModalVisible(false);

    // If we're on day 5 OR the last period of the game, end the game
    // For 8-period days: maxPeriods = 40, last period is at periodCount 39
    // For 6-period days: maxPeriods = 30, last period is at periodCount 29
    const maxPeriods = periodsPerDay * 5;
    const isDay5 = day >= 5;
    const isLastPeriod = period === periodsPerDay;
    const hasCompletedAllPeriods = periodCount >= maxPeriods - 1; // -1 because we check BEFORE incrementing

    if (isDay5 || hasCompletedAllPeriods) {
      if (__DEV__) console.log(
        `🎮 Game ending - Day ${day}, Period ${period}/${periodsPerDay}, PeriodCount ${periodCount}/${maxPeriods}`
      );
      router.push('/game-end');
      return;
    }

    // Show schools out modal first (only for days 1-4)
    if (__DEV__) console.log('📊 Showing schools out modal');
    // Stop current music and play cricket sounds
    MusicController.stop();
    MusicController.setTrack('cricket');
    setSchoolsOutModalVisible(true);
  }, [periodCount, day, period, periodsPerDay]);

  const handleDayStatsCancel = useCallback(() => {
    if (__DEV__) console.log('📊 Day stats modal cancelled - staying at school');
    setDayStatsModalVisible(false);
    // Don't show any other modals, just return to market
  }, []);

  // Schools out modal handler
  const handleSchoolsOutComplete = useCallback(() => {
    if (__DEV__) console.log('🏫 Schools out modal complete');
    setSchoolsOutModalVisible(false);

    // Stop cricket sounds before navigating
    MusicController.stop();
    // Now navigate to after school - after-school screen will start its own music
    if (__DEV__) console.log('🏫 Navigating to after school');
    startAfterSchool();
    router.replace('/(tabs)/after-school');
  }, [startAfterSchool]);

  const handleSleepConfirm = useCallback(() => {
    setSleepConfirmModalVisible(false);

    // Show loading prices immediately
    setLocalPricesUpdating(true);

    // Reset lunch minigames flag when starting new day
    if (showLunchMinigames) {
      if (__DEV__) console.log('🍽️ Starting new day, resetting lunch minigames flag');
      setShowLunchMinigames(false);
    }

    incrementPeriod('home room'); // Start next day at home room

    // Reset loading state after 1.5 seconds
    setTimeout(() => {
      setLocalPricesUpdating(false);
    }, 1500);
  }, [incrementPeriod, showLunchMinigames]);

  const handleSleepCancel = useCallback(() => {
    // Cancel sleep confirmation
    setSleepConfirmModalVisible(false);
  }, []);

  const handleMoneyStashed = useCallback(() => {
    // Check if this was a drone deposit
    if (isDroneDeposit) {
      // Consume the Air Delivery Drone after using it
      dispatch(consumeEffect({ itemId: 'air_delivery_drone' }));
      if (__DEV__) console.log('✈️ Air Delivery Drone consumed after depositing money');
      setIsDroneDeposit(false);
    }

    setStashMoneyModalVisible(false);
  }, [isDroneDeposit, dispatch]);

  // Calculate available inventory space for modal (memoized to prevent cascading re-renders)
  const availableInventorySpace = useMemo(
    () => getInventoryLimit() - getTotalInventoryCount(),
    [getInventoryLimit, getTotalInventoryCount]
  );

  // Check if current period is lunch period (dynamically calculated based on periodsPerDay)
  const isLunchPeriod = period === Math.floor(periodsPerDay / 2);

  const handleLunchBack = useCallback(() => {
    if (__DEV__) console.log('🍔 handleLunchBack called');
    setShowLunchMinigames(false);
  }, []);

  // Common props for both market components (memoized to prevent re-renders)
  const marketProps = useMemo(
    () => ({
      candies,
      localPricesUpdating,
      isFocused,
      isLunchPeriod,
      showLunchMinigames,
      hasPlayedLunchMinigame,
      period,
      day,
      periodsPerDay,
      onCandyPress: openModal,
      onLunchBack: handleLunchBack,
      onInventoryPress: handleInventoryPress,
      onNextPeriod: handleNextDay,
      onEndDay: handleEndDay,
      walletRef,
      piggyBankRef: piggyRef,
      gummyBearsRef: gummyBearsRef,
      nextPeriodRef,
    }),
    [
      candies,
      localPricesUpdating,
      isFocused,
      isLunchPeriod,
      showLunchMinigames,
      hasPlayedLunchMinigame,
      period,
      day,
      periodsPerDay,
      openModal,
      handleLunchBack,
      handleInventoryPress,
      handleNextDay,
      handleEndDay,
    ]
  );

  return (
    <View ref={marketContainerRef} collapsable={false} style={styles.container}>
      <MarketContent {...marketProps} />

      <Suspense fallback={null}>
        <LocationModal
          visible={locationModalVisible}
          onClose={() => {
            setLocationModalVisible(false);
          }}
          onSelectLocation={handleLocationSelect}
          gameData={gameData}
        />
      </Suspense>

      {dayStatsModalVisible && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      <Suspense fallback={null}>
        <SchoolsOutModal
          visible={schoolsOutModalVisible}
          onComplete={handleSchoolsOutComplete}
        />
      </Suspense>

      <Suspense fallback={null}>
        <StashMoneyModal
          visible={stashMoneyModalVisible}
          onClose={() => {
            // If in drone mode and user just closes (backs out), don't consume drone
            if (isDroneDeposit) {
              if (__DEV__) console.log(
                '✈️ User backed out of drone deposit - not consuming drone'
              );
              setIsDroneDeposit(false);
            }
            setStashMoneyModalVisible(false);
          }}
          onConfirm={handleMoneyStashed}
          isDroneMode={isDroneDeposit}
        />
      </Suspense>

      <Suspense fallback={null}>
        <SleepConfirmModal
          visible={sleepConfirmModalVisible}
          onConfirm={handleSleepConfirm}
          onCancel={handleSleepCancel}
          currentDay={day}
        />
      </Suspense>

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
        visible={lunchConfirmVisible}
        title="Time for Lunch!"
        message="Ready to take a break and play a game?"
        emoji="🍽️"
        confirmText="Let's Go!"
        cancelText="Not Yet"
        onConfirm={handleLunchConfirm}
        onCancel={() => setLunchConfirmVisible(false)}
        theme="market"
        dismissible={true}
      />

      <ConfirmationModal
        visible={endDayConfirmVisible}
        title={day === 5 ? 'End Game?' : 'End School Day?'}
        message={
          day === 5
            ? `This is the final day!\n\n Go to result screen?`
            : `You're currently in period ${period}.\n\n Go to after-school activities?`
        }
        emoji={day === 5 ? '🎮' : '🏠'}
        confirmText={day === 5 ? 'End Game' : 'End Day'}
        cancelText="Stay in School"
        onConfirm={handleEndDayConfirm}
        onCancel={handleEndDayCancel}
        theme="market"
        dismissible={false}
      />

      {/* Transaction Modal Manager - manages its own state to prevent parent re-renders */}
      <TransactionModalManager
        ref={transactionModalRef}
        candies={candies}
        onTransaction={handleTransaction}
        playerBalance={balance}
        availableInventorySpace={availableInventorySpace}
      />

      {/* Inventory Modal - only render when visible */}
      {inventoryModalVisible && (
        <Suspense fallback={null}>
          <InventoryModal
            visible={inventoryModalVisible}
            onClose={() => {
              if (__DEV__) console.log(
                '🔴 Market onClose called, current state:',
                inventoryModalVisible
              );
              setInventoryModalVisible(false);
              if (__DEV__) console.log('🔴 Market onClose completed, should be false now');
            }}
            inventory={inventory}
            totalCount={getTotalInventoryCount()}
            capacity={getInventoryLimit()}
          />
        </Suspense>
      )}

      {/* EventModal for special events */}
      <EventModal />

      {/* Tutorial overlay - rendered last to be on top */}
      {/* Steps 4,7,8 are inside TransactionModal; steps 9-11 are in tab layout */}
      {tutorialActive && tutorialStep <= 8 && tutorialStep !== 4 && tutorialStep !== 7 && tutorialStep !== 8 && <TutorialOverlay />}
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
  buttonIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    marginRight: 8,
  },
  buttonTextRow: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
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
