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
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../src/constants/colors';
import { JOKER_IDS, findJokerById, hasJokerById } from '../../src/constants/jokerIds';
import { getJokerEffectsAtLevel } from '../../src/utils/jokerEffectEngine';
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
import {
  getPeriodsPerDay,
  selectMediumCandiesUnlocked,
  selectBigCandiesUnlocked,
  unlockMediumCandies,
  unlockBigCandies,
  selectBulkEmpireStacks,
} from '../../src/store/slices/gameSlice';
import { spendBalance, selectDifficultyLevel } from '../../src/store/slices/walletSlice';
import { incrementMaxInventory } from '../../src/store/slices/inventorySlice';
import {
  consumeEffect,
  selectActiveEffects,
} from '../../src/store/slices/merchantSlice';
import {
  advanceTutorial,
  selectTutorialStep,
  selectTutorialComplete,
  skipTutorial,
  startTutorial,
} from '../../src/store/slices/tutorialSlice';
import { JokerService } from '../../src/utils/jokerService';
import { MerchantUtils } from '../../src/utils/merchantUtils';
import { MusicController } from '../../src/utils/musicController';
import { SoundEffects } from '../../src/utils/soundEffects';
import { calculateSaleTotal } from '../../src/utils/saleCalculations';
import { useHustle } from '../../src/hooks/useHustle';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import seedrandom from 'seedrandom';
import {
  generateQuest,
  completeQuest,
  clearActiveQuest,
  failQuest,
  selectActiveQuest,
  selectIsQuestActive,
} from '../../src/store/slices/questSlice';
import { setCurrentEvent } from '../../src/store/slices/eventHandlerSlice';
import { ScrollView } from 'react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import FirstTimeHint from '../components/FirstTimeHint';
import EventModal from '../components/EventModal';
import { Location } from '../components/LocationModal';
import MarketContent from '../components/MarketContent';
import TutorialOverlay from '../components/TutorialOverlay';
import TransactionModalManager, {
  TransactionModalHandle,
} from '../components/TransactionModalManager';
import { Candy } from '../types';
import { CANDY_REGISTRY } from '../../src/constants/candyRegistry';
import { CandySize } from '../../src/types/candy';

// Debug panel for testing joker acquisition channels (DEV only)
function DebugJokerPanel({
  dispatch,
  seed,
  day,
  period,
  periodsPerDay,
  generateHustlesAction,
  setShowHustleJokerSelection,
  setShowQuestJokerSelection,
  setQuestJokerChoices,
  generateQuest: generateQuestAction,
  unlockedCandies,
  jokers,
}: any) {
  const [visible, setVisible] = React.useState(false);

  if (!visible) {
    return (
      <TouchableOpacity
        style={{ position: 'absolute', top: 50, right: 10, backgroundColor: '#ff0', borderRadius: 4, padding: 4, zIndex: 999 }}
        onPress={() => setVisible(true)}
      >
        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>DBG</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ position: 'absolute', top: 40, right: 5, width: 180, backgroundColor: '#1a1a2e', borderRadius: 8, padding: 8, zIndex: 999, borderWidth: 1, borderColor: '#fbbf24' }}>
      <TouchableOpacity onPress={() => setVisible(false)} style={{ alignSelf: 'flex-end', marginBottom: 4 }}>
        <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: 'bold' }}>X</Text>
      </TouchableOpacity>
      <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Joker Debug</Text>

      {/* 1. Trigger Hustle Joker Selection */}
      <TouchableOpacity
        style={{ backgroundColor: '#2d2d4e', padding: 6, borderRadius: 4, marginBottom: 4 }}
        onPress={() => {
          generateHustlesAction(seed, day, periodsPerDay);
          setShowHustleJokerSelection(true);
        }}
      >
        <Text style={{ color: '#fff', fontSize: 10 }}>Hustle Joker</Text>
      </TouchableOpacity>

      {/* 2. Trigger Quest Joker Selection */}
      <TouchableOpacity
        style={{ backgroundColor: '#2d2d4e', padding: 6, borderRadius: 4, marginBottom: 4 }}
        onPress={() => {
          const ownedIds = new Set(jokers.map((j: any) => j.id?.toString()));
          const unowned = STANDARDIZED_JOKERS.filter((sj) => !ownedIds.has(sj.id.toString()));
          const choices = unowned.slice(0, 2);
          if (choices.length > 0) {
            setQuestJokerChoices(choices);
            setShowQuestJokerSelection(true);
          }
        }}
      >
        <Text style={{ color: '#fff', fontSize: 10 }}>Quest Joker</Text>
      </TouchableOpacity>

      {/* 3. Trigger Detention Discovery (fake bully event) */}
      <TouchableOpacity
        style={{ backgroundColor: '#2d2d4e', padding: 6, borderRadius: 4, marginBottom: 4 }}
        onPress={() => {
          setVisible(false); // Close debug panel so EventModal is visible
          setTimeout(() => {
            dispatch(setCurrentEvent({
              id: `debug-bully-${Date.now()}`,
              effect: 'LOSE_MONEY',
              category: 'bad',
              title: 'Bullied! (Debug)',
              description: 'A bully stole your lunch money!',
              backgroundImage: 'bully',
              dollarAmount: 100,
              hasJokerDrop: true,
              detentionJokerChoices: STANDARDIZED_JOKERS.filter(
                (sj) => !jokers.some((j: any) => j.id?.toString() === sj.id.toString())
              ).slice(0, 2),
            }));
          }, 100);
        }}
      >
        <Text style={{ color: '#fff', fontSize: 10 }}>Detention Drop</Text>
      </TouchableOpacity>

      {/* 4. Trigger Merchant (navigate) */}
      <TouchableOpacity
        style={{ backgroundColor: '#2d2d4e', padding: 6, borderRadius: 4, marginBottom: 4 }}
        onPress={() => router.push('/merchant-shop')}
      >
        <Text style={{ color: '#fff', fontSize: 10 }}>Merchant Shop</Text>
      </TouchableOpacity>

      <Text style={{ color: '#888', fontSize: 8, marginTop: 2 }}>Day {day} P{period} | {jokers.length} jokers</Text>
    </View>
  );
}

// Lazy load modals that are shown less frequently
const DayStatsModal = lazy(() => import('../components/DayStatsModal'));
const SchoolsOutModal = lazy(() => import('../components/SchoolsOutModal'));
const SleepConfirmModal = lazy(() => import('../components/SleepConfirmModal'));
const StashMoneyModal = lazy(() => import('../components/StashMoneyModal'));
const InventoryModal = lazy(() => import('../components/InventoryModal'));
const LocationModal = lazy(() => import('../components/LocationModal'));
const JokerSelection = lazy(() => import('../components/JokerSelection'));

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
  const periodsPerDay = useAppSelector(getPeriodsPerDay);

  // Candy size unlock state
  const mediumUnlocked = useAppSelector(selectMediumCandiesUnlocked);
  const bigUnlocked = useAppSelector(selectBigCandiesUnlocked);

  const dispatch = useAppDispatch();

  // Tutorial state
  const tutorialStep = useAppSelector(selectTutorialStep);
  const tutorialComplete = useAppSelector(selectTutorialComplete);
  const difficultyLevel = useAppSelector(selectDifficultyLevel);
  const isTutorialActive = tutorialStep > 0 && !tutorialComplete;

  // Tutorial measurement state — store raw window coordinates, compute adjusted in useMemo
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
  const [rawMeasurements, setRawMeasurements] = useState<{
    wallet?: { x: number; y: number; width: number; height: number };
    piggyBank?: { x: number; y: number; width: number; height: number };
    gummyBears?: { x: number; y: number; width: number; height: number };
    nextPeriod?: { x: number; y: number; width: number; height: number };
  }>({});

  // Measure the market container's window offset
  const handleContainerLayout = useCallback(() => {
    if (marketContainerRef.current) {
      requestAnimationFrame(() => {
        marketContainerRef.current?.measureInWindow((x, y) => {
          if (__DEV__) console.log(`📖 Container offset: x=${x}, y=${y}`);
          setContainerOffset({ x, y });
        });
      });
    }
  }, []);

  // Adjust all measurements by subtracting container offset
  const tutorialMeasurements = useMemo(() => {
    const adjust = (rect?: { x: number; y: number; width: number; height: number }) => {
      if (!rect) return undefined;
      return {
        x: rect.x - containerOffset.x,
        y: rect.y - containerOffset.y,
        width: rect.width,
        height: rect.height,
      };
    };
    return {
      wallet: adjust(rawMeasurements.wallet),
      piggyBank: adjust(rawMeasurements.piggyBank),
      gummyBears: adjust(rawMeasurements.gummyBears),
      nextPeriod: adjust(rawMeasurements.nextPeriod),
    };
  }, [rawMeasurements, containerOffset]);

  const handleWalletLayout = useCallback(
    (layout: { x: number; y: number; width: number; height: number }) => {
      setRawMeasurements((prev) => ({ ...prev, wallet: layout }));
    },
    []
  );
  const handlePiggyBankLayout = useCallback(
    (layout: { x: number; y: number; width: number; height: number }) => {
      setRawMeasurements((prev) => ({ ...prev, piggyBank: layout }));
    },
    []
  );
  const handleGummyBearsLayout = useCallback(
    (layout: { x: number; y: number; width: number; height: number }) => {
      setRawMeasurements((prev) => ({ ...prev, gummyBears: layout }));
    },
    []
  );
  const handleNextPeriodLayout = useCallback(
    (layout: { x: number; y: number; width: number; height: number }) => {
      setRawMeasurements((prev) => ({ ...prev, nextPeriod: layout }));
    },
    []
  );

  const instanceIdRef = useRef(Math.random().toString(36).substring(7));
  useEffect(() => {
    // Music will be managed by the showLunchMinigames effect below
    // No need to manually stop/start here - MusicController handles transitions
    return () => {
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

  // Hustle system
  const {
    activeHustles,
    generateHustles: generateHustlesAction,
    completeHustle: completeHustleAction,
    getHustleForLocation,
    getHustleRumors,
  } = useHustle();
  const [showHustleJokerSelection, setShowHustleJokerSelection] = useState(false);
  const [hustleNotEnoughCandy, setHustleNotEnoughCandy] = useState<string | null>(null);

  // Student Delivery Quest system
  const activeQuest = useAppSelector(selectActiveQuest);
  const isQuestActive = useAppSelector(selectIsQuestActive);
  const [showQuestJokerSelection, setShowQuestJokerSelection] = useState(false);
  const [questJokerChoices, setQuestJokerChoices] = useState<any[]>([]);

  // Initialize computed joker effects system
  useComputedJokerEffects();

  const jokerService = useMemo(() => JokerService.getInstance(), []);

  const marketContainerRef = useRef<View>(null);

  usePriceDoubling(); // This hook handles price restoration on period change
  useHomeMadeBonus(); // This hook handles Home Made joker bonus
  // Farmers Carry hook now runs in GameEffectsManager (root layout) to ensure it's always mounted

  // Auto-start tutorial on difficulty 1, day 1, period 1
  useEffect(() => {
    if (__DEV__) {
      console.log(
        `📖 Tutorial check - difficulty: ${difficultyLevel}, periodCount: ${periodCount}, complete: ${tutorialComplete}, step: ${tutorialStep}, active: ${isTutorialActive}`
      );
    }
    if (
      difficultyLevel === 1 &&
      periodCount === 0 &&
      !tutorialComplete &&
      tutorialStep === 0
    ) {
      if (__DEV__) console.log('📖 Tutorial auto-starting!');
      dispatch(startTutorial());
    }
  }, [difficultyLevel, periodCount, tutorialComplete, tutorialStep, dispatch]);

  // Show location modal after event modal is dismissed
  useEffect(() => {
    if (pendingLocationModal && !hasActiveEvent) {
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
      setPendingLocationModal(false);
    }
  }, [currentLocation, periodCount]);

  // Generate hustles when day changes
  const lastHustleDayRef = useRef<number>(-1);
  useEffect(() => {
    if (seed && day > 0 && day !== lastHustleDayRef.current) {
      lastHustleDayRef.current = day;
      generateHustlesAction(seed, day, periodsPerDay);
      if (__DEV__) console.log(`🤝 HUSTLE: Generated hustles for day ${day}`);
    }
  }, [seed, day, periodsPerDay, generateHustlesAction]);

  // Show hustle "not enough candy" message in scroller
  useEffect(() => {
    if (hustleNotEnoughCandy) {
      setHint(hustleNotEnoughCandy);
    }
  }, [hustleNotEnoughCandy, setHint]);

  // Generate quests on Day 2 and Day 4 (period 1)
  const lastQuestDayRef = useRef<number>(-1);
  useEffect(() => {
    if (seed && day > 0 && period === 1 && day !== lastQuestDayRef.current) {
      lastQuestDayRef.current = day;
      const unlockedCandies = CANDY_REGISTRY
        .filter((c) => {
          if (c.size === 'medium' && !mediumUnlocked) return false;
          if (c.size === 'big' && !bigUnlocked) return false;
          return true;
        })
        .map((c) => c.name);
      dispatch(generateQuest({ seed, day, unlockedCandies }));
      if (__DEV__) console.log(`📦 QUEST: Attempted quest generation for day ${day}`);
    }
  }, [seed, day, period, dispatch, mediumUnlocked, bigUnlocked]);

  // Check quest failure when period passes the target
  useEffect(() => {
    if (activeQuest && !activeQuest.completed && day === activeQuest.day) {
      if (period > activeQuest.targetPeriod) {
        dispatch(failQuest());
        setHint('The student found another supplier...');
        if (__DEV__) console.log('📦 QUEST: Failed - target period passed');
      }
    }
    if (activeQuest && !activeQuest.completed && day > activeQuest.day) {
      dispatch(failQuest());
      if (__DEV__) console.log('📦 QUEST: Failed - day changed');
    }
  }, [activeQuest, day, period, dispatch, setHint]);

  // Track the last event period to prevent duplicate triggers
  const lastEventPeriodRef = useRef<number>(-1);
  const lastHintPeriodRef = useRef<number>(-1);

  // Ref for transaction modal manager (prevents parent re-renders)
  const transactionModalRef = useRef<TransactionModalHandle>(null);

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

      // Collect hustle rumors for display
      const hustleRumors = getHustleRumors();

      // Build quest hint if active
      const questHint = activeQuest && !activeQuest.completed && day === activeQuest.day
        ? `A student needs you to hold ${activeQuest.quantity} ${activeQuest.candyName} until period ${activeQuest.targetPeriod}. Sell them then for a reward!`
        : null;

      // Combine all rumors/hints
      const allRumors = [...hustleRumors];
      if (questHint) allRumors.push(questHint);

      // Use the already-calculated period instead of recalculating
      if (period === 0) {
        setEvent('NEW_DAY');
        // Show rumors at start of day if any
        if (allRumors.length > 0) {
          // Delay slightly so NEW_DAY text shows first, then hint overrides
          setTimeout(() => {
            setHint(allRumors.join('  ---  '));
          }, 3000);
        }
      } else if (currentEvent) {
        // Major events: FOUND_MONEY, LOSE_MONEY, STASH_LOCKED - show modal
        // Minor events: PRICE_SPIKE, PRICE_DROP - show flavor text only

        // Set event type for tracking
        setEvent(currentEvent.effect);

        // Only trigger event if we haven't already triggered it for this period
        if (lastEventPeriodRef.current !== periodCount) {
          lastEventPeriodRef.current = periodCount;

          // Minor events (PRICE_SPIKE, PRICE_DROP): Show flavor text only, no modal
          if (
            currentEvent.effect === 'PRICE_SPIKE' ||
            currentEvent.effect === 'PRICE_DROP'
          ) {
            setFlavorText(currentEvent.flavorText || '');
          } else {
            handleEvent(currentEvent);
          }
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

          if (Math.random() < effectiveHintChance) {
            const allHints = nextPeriodEvents
              .map((e) => e.hint)
              .filter((h) => h)
              .join('\n\n');
            setHint(allHints);
          } else if (allRumors.length > 0) {
            // Show rumors when no event hints pass the roll
            setHint(allRumors.join('  ---  '));
          } else {

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
      } else if (allRumors.length > 0) {
        // Show rumors when no events at all
        setHint(allRumors.join('  ---  '));
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
    getHustleRumors,
    activeQuest,
    day,
  ]);

  const [candies, setCandies] = useState<CandyForMarket[]>([]);
  const [selectedSize, setSelectedSize] = useState<CandySize>('small');

  // Memoize joker count and inventory limit to prevent unnecessary re-renders
  const jokerCount = useMemo(() => jokers.length, [jokers.length]);
  const inventoryLimit = useMemo(
    () => getInventoryLimit(),
    [getInventoryLimit]
  );

  // Available size tabs (only unlocked sizes)
  const availableSizes = useMemo(() => {
    const sizes: { key: CandySize; label: string }[] = [
      { key: 'small', label: 'Small' },
    ];
    if (mediumUnlocked) sizes.push({ key: 'medium', label: 'Medium' });
    if (bigUnlocked) sizes.push({ key: 'big', label: 'Large' });
    return sizes;
  }, [mediumUnlocked, bigUnlocked]);

  // Filter candies based on unlock state and selected size tab
  const visibleCandies = useMemo(() => {
    let filtered = baseCandies.filter((candy) => {
      if (candy.size === 'medium' && !mediumUnlocked) return false;
      if (candy.size === 'big' && !bigUnlocked) return false;
      return candy.size === selectedSize;
    });
    // During tutorial step 3, only show Gummy Bears
    if (tutorialStep === 3) {
      filtered = filtered.filter((c) => c.name === 'Gummy Bears');
    }
    return filtered;
  }, [mediumUnlocked, bigUnlocked, selectedSize, tutorialStep]);

  // Determine which unlock button to show (only on the highest unlocked size tab)
  const unlockButton = useMemo(() => {
    if (!mediumUnlocked && day >= 2 && selectedSize === 'small') {
      return { size: 'medium' as const, cost: 500 };
    }
    if (mediumUnlocked && !bigUnlocked && day >= 3 && selectedSize === 'medium') {
      return { size: 'big' as const, cost: 5000 };
    }
    return null;
  }, [mediumUnlocked, bigUnlocked, day, selectedSize]);

  // Simple price lookup from gameData - NO heavy calculations
  // Price breakdowns are calculated lazily in TransactionModal when needed
  const calculatedCandies = useMemo(() => {
    const eventPrices = gameData.eventPrices || {};

    return visibleCandies.map((candy) => {
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
    visibleCandies,
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

  // Candy size unlock modal state
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [unlockModalContent, setUnlockModalContent] = useState({
    title: '',
    message: '',
    emoji: '',
  });

  const handleUnlockSize = useCallback(
    (size: 'medium' | 'big') => {
      const cost = size === 'medium' ? 500 : 5000;
      if (balance < cost) return;

      dispatch(spendBalance(cost));

      if (size === 'medium') {
        dispatch(unlockMediumCandies());
        setSelectedSize('medium');
        setUnlockModalContent({
          title: 'New Candy Unlocked!',
          message: "You've earned the big kids' candy shelf! Medium candies are now available in the market.",
          emoji: '🍬',
        });
      } else {
        dispatch(unlockBigCandies());
        setSelectedSize('big');
        setUnlockModalContent({
          title: 'Premium Candy Unlocked!',
          message: 'Welcome to the top shelf! Big candies are now available. Time to make some serious money!',
          emoji: '🍫',
        });
      }

      SoundEffects.playCongratsSound();
      setUnlockModalVisible(true);
    },
    [balance, dispatch]
  );

  // Set music when screen is focused or lunch minigames toggle
  // This handles both initial mount and returning from minigames
  useFocusEffect(
    useCallback(() => {
      const targetTrack = showLunchMinigames ? 'day2' : 'day1';
      // Only change music if it's different from current track
      if (MusicController.getCurrentTrack() !== targetTrack) {
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
    transactionModalRef.current?.open(index);
    // Advance tutorial when tapping candy during step 3 (buy) or step 6 (sell)
    if (tutorialStep === 3 || tutorialStep === 6) {
      dispatch(advanceTutorial());
    }
  }, [tutorialStep, dispatch]);

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
  const bulkEmpireStacks = useAppSelector(selectBulkEmpireStacks);
  const bulkEmpireStacksRef = useRef(bulkEmpireStacks);
  const activeQuestRef = useRef(activeQuest);

  useEffect(() => {
    candiesRef.current = candies;
    balanceRef.current = balance;
    inventoryRef.current = inventory;
    jokersRef.current = jokers;
    activeEffectsRef.current = activeEffects;
    merchantEffectsRef.current = merchantEffects;
    hallPassModifiersRef.current = hallPassModifiers;
    hasEarlySaleTodayRef.current = hasEarlySaleToday;
    periodsPerDayRef.current = periodsPerDay;
    periodCountRef.current = periodCount;
    totalCandiesSoldRef.current = totalCandiesSold;
    locationHistoryRef.current = locationHistory;
    bulkEmpireStacksRef.current = bulkEmpireStacks;
    activeQuestRef.current = activeQuest;
  }, [candies, balance, inventory, jokers, activeEffects, merchantEffects, hallPassModifiers, hasEarlySaleToday, periodsPerDay, periodCount, totalCandiesSold, locationHistory, bulkEmpireStacks, activeQuest]);

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
          purchasePrice = candy.cost * 0.9;
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

          if (sellMultiplierInfo.jokerId) {
            clearActiveEffect(sellMultiplierInfo.jokerId);
          }
        }

        // Consume Influencer Shoutout if active (before calculation)
        if (MerchantUtils.hasInfluencerShoutout(currentMerchantEffects)) {
          dispatch(consumeEffect({ itemId: 'influencer_shoutout' }));
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
          bulkEmpireStacks: bulkEmpireStacksRef.current,
          inventory: currentInventory,
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

        // All dispatches in the flat function body — React batches these
        add(totalGain);
        addProfit(finalProfit); // Track daily profit (profit only, not purchase value)
        addCandySold(quantity); // Track daily candy sales
        recordDailyStatsSale(candy.name, quantity, totalGain, currentPeriodCount);

        // Triple Threat (ID 18) — no daily sales tracking needed (handled in saleCalculations)

        // Track sale for period-based hall pass unlocks (Time Crunch, Final Exam)
        // IMPORTANT: Pass finalProfit (profit after all bonuses/penalties) not revenue for accurate tracking
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

        // Check Student Delivery Quest completion
        const questRef = activeQuestRef.current;
        if (
          questRef &&
          !questRef.completed &&
          candy.name === questRef.candyName &&
          currentDay === questRef.day &&
          currentPeriodInDay === questRef.targetPeriod &&
          quantity >= questRef.quantity
        ) {
          dispatch(completeQuest());
          // Generate 2 random joker choices for the reward (seeded)
          const questRng = seedrandom(`${questRef.id}-reward`);
          const ownedIds = new Set(jokersRef.current.map((j: any) => j.id.toString()));
          const unowned = STANDARDIZED_JOKERS.filter((sj) => !ownedIds.has(sj.id.toString()));
          if (unowned.length > 0) {
            // Shuffle unowned jokers deterministically
            const shuffled = [...unowned];
            for (let si = shuffled.length - 1; si > 0; si--) {
              const sj = Math.floor(questRng() * (si + 1));
              [shuffled[si], shuffled[sj]] = [shuffled[sj], shuffled[si]];
            }
            setQuestJokerChoices(shuffled.slice(0, Math.min(2, shuffled.length)));
            setShowQuestJokerSelection(true);
            SoundEffects.playPositiveSound();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (__DEV__) console.log('📦 QUEST: Completed! Showing joker reward');
          } else {
            dispatch(clearActiveQuest());
            if (__DEV__) console.log('📦 QUEST: Completed but no unowned jokers available');
          }
        }
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


  const handleNextDay = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Calculate lunch period dynamically (period 4 for 8-period days, period 3 for 6-period days)
    const lunchPeriod = Math.floor(periodsPerDay / 2);

    if (period === periodsPerDay) {
      setDayStatsModalVisible(true);
    } else if (period === lunchPeriod && !showLunchMinigames) {
      setLunchConfirmVisible(true);
    } else {
      if (hasActiveEvent) {
        setPendingLocationModal(true);
      } else {
        setLocationModalVisible(true);
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

  const handleLocationSelect = useCallback(
    (location: Location) => {
      if (location === 'the connect') {
        setLocationModalVisible(false);
        router.push('/merchant-shop');
        return;
      }

      startTransition(() => {
        setLocationModalVisible(false);
        setLocalPricesUpdating(true);

        const hasTradeRoutes = jokers.some((joker: any) => joker.id === 39);
        if (hasTradeRoutes) {
          dispatch(incrementMaxInventory(1));
        }

        if (showLunchMinigames) {
          setShowLunchMinigames(false);
        }

        // Detect day change for daily stat resets
        const oldDay = day;

        // Call incrementPeriod and update flavor text
        incrementPeriod(location);
        setEvent('PERIOD_CHANGE');

        // Advance tutorial from step 5 (next period) to step 6 (sell gummy bears)
        if (tutorialStep === 5) {
          dispatch(advanceTutorial());
        }

        // Check if we crossed into a new day and reset daily stats if so
        // Note: We can't directly read the new day here, but we can use periodCount
        // Day changes when periodCount % periodsPerDay === 0
        const newPeriodCount = periodCount + 1;
        const newDay = Math.floor((newPeriodCount - 1) / periodsPerDay) + 1;
        if (newDay > oldDay) {
          dispatch(resetDailyStats());
        }

        // Check for Hallway Hustle at the new location+period
        const newPeriodInDay = (newPeriodCount % periodsPerDay) + 1;
        const matchingHustle = getHustleForLocation(location, newPeriodInDay);
        if (matchingHustle) {
          // Check if player has enough candy
          const candyInInventory = inventory.find(
            (item) => item.name === matchingHustle.candyName || item.id === matchingHustle.candyName
          );
          const ownedQty = candyInInventory?.quantity ?? 0;

          if (ownedQty >= matchingHustle.quantity) {
            // Take the candy and show joker selection
            removeFromInventory(matchingHustle.candyName, matchingHustle.quantity);
            completeHustleAction(matchingHustle.id);
            if (__DEV__) console.log(`🤝 HUSTLE: Completed! Took ${matchingHustle.quantity} ${matchingHustle.candyName}`);
            // Show joker selection after a brief delay for loading state to clear
            setTimeout(() => {
              setShowHustleJokerSelection(true);
            }, 500);
          } else {
            // Not enough candy — show notification
            setHustleNotEnoughCandy(
              `A kid here wants ${matchingHustle.quantity} ${matchingHustle.candyName}, but you only have ${ownedQty}...`
            );
            if (__DEV__) console.log(`🤝 HUSTLE: Not enough candy. Need ${matchingHustle.quantity} ${matchingHustle.candyName}, have ${ownedQty}`);
            // Clear the message after 4 seconds
            setTimeout(() => setHustleNotEnoughCandy(null), 4000);
          }
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
      tutorialStep,
      getHustleForLocation,
      inventory,
      removeFromInventory,
      completeHustleAction,
    ]
  );

  const handleLunchConfirm = useCallback(() => {
    setLunchConfirmVisible(false);
    setShowLunchMinigames(true);
  }, []);

  const handleEndDay = useCallback(() => {
    setEndDayConfirmVisible(true);
  }, []);

  const handleEndDayConfirm = useCallback(() => {
    // Trigger success haptic feedback when ending day
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setEndDayConfirmVisible(false);

    // Reset lunch minigames flag when ending day early
    if (showLunchMinigames) {
      setShowLunchMinigames(false);
    }

    const maxPeriods = periodsPerDay * 5;

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
      }
    }

    setDayStatsBonuses(bonuses);

    setLocationModalVisible(false);
    setSchoolsOutModalVisible(false);
    setStashMoneyModalVisible(false);
    setSleepConfirmModalVisible(false);

    setTimeout(() => {
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
    setDayStatsModalVisible(false);

    const maxPeriods = periodsPerDay * 5;
    const isDay5 = day >= 5;
    const hasCompletedAllPeriods = periodCount >= maxPeriods - 1;

    if (isDay5 || hasCompletedAllPeriods) {
      router.push('/game-end');
      return;
    }

    MusicController.stop();
    MusicController.setTrack('cricket');
    setSchoolsOutModalVisible(true);
  }, [periodCount, day, period, periodsPerDay]);

  const handleDayStatsCancel = useCallback(() => {
    setDayStatsModalVisible(false);
  }, []);

  // Schools out modal handler
  const handleSchoolsOutComplete = useCallback(() => {
    setSchoolsOutModalVisible(false);
    MusicController.stop();
    startAfterSchool();
    router.replace('/(tabs)/after-school');
  }, [startAfterSchool]);

  const handleSleepConfirm = useCallback(() => {
    setSleepConfirmModalVisible(false);
    setLocalPricesUpdating(true);

    if (showLunchMinigames) {
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
      unlockButton,
      onUnlock: handleUnlockSize,
      playerBalance: balance,
      // Size tabs
      availableSizes,
      selectedSize,
      onSizeSelect: setSelectedSize,
      showSizeTabs: availableSizes.length > 1,
      // Tutorial layout callbacks
      ...(isTutorialActive
        ? {
            onWalletLayout: handleWalletLayout,
            onPiggyBankLayout: handlePiggyBankLayout,
            onGummyBearsLayout: handleGummyBearsLayout,
            onNextPeriodLayout: handleNextPeriodLayout,
          }
        : {}),
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
      unlockButton,
      handleUnlockSize,
      balance,
      availableSizes,
      selectedSize,
      isTutorialActive,
      handleWalletLayout,
      handlePiggyBankLayout,
      handleGummyBearsLayout,
      handleNextPeriodLayout,
    ]
  );

  return (
    <View ref={marketContainerRef} collapsable={false} style={styles.container} onLayout={handleContainerLayout}>
      {showLunchMinigames && (
        <FirstTimeHint
          hintKey="lunch_minigame"
          message="It's lunch! Play a minigame to earn a Joker that boosts your profits."
        />
      )}
      <MarketContent {...marketProps} />

      {isTutorialActive && (
        <TutorialOverlay
          tutorialStep={tutorialStep}
          measurements={tutorialMeasurements}
          onAdvance={() => dispatch(advanceTutorial())}
          onSkip={() => dispatch(skipTutorial())}
        />
      )}

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

      <ConfirmationModal
        visible={unlockModalVisible}
        title={unlockModalContent.title}
        message={unlockModalContent.message}
        emoji={unlockModalContent.emoji}
        confirmText="Let's Go!"
        onConfirm={() => setUnlockModalVisible(false)}
        onCancel={() => setUnlockModalVisible(false)}
        theme="market"
        dismissible={true}
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
              setInventoryModalVisible(false);
            }}
            inventory={inventory}
            totalCount={getTotalInventoryCount()}
            capacity={getInventoryLimit()}
          />
        </Suspense>
      )}

      {/* Hallway Hustle Joker Selection */}
      {showHustleJokerSelection && (
        <TouchableOpacity
          style={styles.hustleJokerOverlay}
          activeOpacity={1}
          onPress={() => {
            // Safety dismiss if overlay is stuck
            if (__DEV__) console.log('🤝 HUSTLE: Overlay tapped — dismissing');
            setShowHustleJokerSelection(false);
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ flex: 1 }}>
            <Suspense fallback={<View />}>
              <JokerSelection
                jokers={STANDARDIZED_JOKERS}
                theme="candy"
                onComplete={() => {
                  setShowHustleJokerSelection(false);
                }}
                rewardTier={1}
                completionLevel={2}
                headerText="Hallway Hustle Reward!"
              />
            </Suspense>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Student Delivery Quest Joker Selection */}
      {showQuestJokerSelection && questJokerChoices.length > 0 && (
        <TouchableOpacity
          style={styles.hustleJokerOverlay}
          activeOpacity={1}
          onPress={() => {
            // Safety dismiss if overlay is stuck
            if (__DEV__) console.log('📦 QUEST: Overlay tapped — dismissing');
            setShowQuestJokerSelection(false);
            setQuestJokerChoices([]);
            dispatch(clearActiveQuest());
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ flex: 1 }}>
            <Suspense fallback={<View />}>
              <JokerSelection
                jokers={STANDARDIZED_JOKERS}
                theme="candy"
                onComplete={() => {
                  setShowQuestJokerSelection(false);
                  setQuestJokerChoices([]);
                  dispatch(clearActiveQuest());
                }}
                rewardTier={1}
                completionLevel={2}
                headerText="Delivery Quest Complete!"
              />
            </Suspense>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* EventModal for special events */}
      <EventModal />

      {/* Debug Panel — DEV only */}
      {__DEV__ && (
        <DebugJokerPanel
          dispatch={dispatch}
          seed={seed}
          day={day}
          period={period}
          periodsPerDay={periodsPerDay}
          generateHustlesAction={generateHustlesAction}
          setShowHustleJokerSelection={setShowHustleJokerSelection}
          setShowQuestJokerSelection={setShowQuestJokerSelection}
          setQuestJokerChoices={setQuestJokerChoices}
          generateQuest={generateQuest}
          unlockedCandies={candies.map((c: any) => c.name)}
          jokers={jokers}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefaf5', // Warm off-white paper (fallback)
  },
  hustleJokerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
