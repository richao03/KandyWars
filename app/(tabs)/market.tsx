import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../src/constants/colors';
import { JOKER_IDS, findJokerById } from '../../src/constants/jokerIds';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
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
import {
  getPeriodsPerDay,
  selectMediumCandiesUnlocked,
  selectBigCandiesUnlocked,
  unlockMediumCandies,
  unlockBigCandies,
  selectShowLunchMinigames,
  setShowLunchMinigames as setShowLunchMinigamesAction,
} from '../../src/store/slices/gameSlice';
import { spendBalance, selectDifficultyLevel } from '../../src/store/slices/walletSlice';
import { consumeEffect } from '../../src/store/slices/merchantSlice';
import {
  advanceTutorial,
  selectTutorialStep,
  selectTutorialComplete,
  skipTutorial,
  startTutorial,
} from '../../src/store/slices/tutorialSlice';
import { JokerService } from '../../src/utils/jokerService';
import { MusicController } from '../../src/utils/musicController';
import { SoundEffects } from '../../src/utils/soundEffects';
import { useHustle } from '../../src/hooks/useHustle';
import { usePeriodEventFlavorText } from '../../src/hooks/usePeriodEventFlavorText';
import { usePeriodAdvance } from '../../src/hooks/usePeriodAdvance';
import { useTransactionHandler } from '../../src/hooks/useTransactionHandler';
import { computeEndDayBonuses } from '../../src/utils/endDayBonuses';
import {
  clearLastCompletedHustle,
  selectLastCompletedHustle,
  selectNotEnoughCandyMessage,
} from '../../src/store/slices/hustleSlice';
import {
  generateQuest,
  clearActiveQuest,
  failQuest,
  selectActiveQuest,
  selectIsQuestActive,
  selectPendingJokerChoices,
  setPendingJokerChoices,
  clearPendingJokerChoices,
} from '../../src/store/slices/questSlice';
import { setCurrentEvent } from '../../src/store/slices/eventHandlerSlice';
import ConfirmationModal from '../components/ConfirmationModal';
import FirstTimeHint from '../components/FirstTimeHint';
import EventModal from '../components/EventModal';
import MarketContent from '../components/MarketContent';
import TutorialOverlay from '../components/TutorialOverlay';
import TransactionModalManager, {
  TransactionModalHandle,
} from '../components/TransactionModalManager';
import { Candy } from '../types';
import { CANDY_REGISTRY, getCandyDefinition } from '../../src/constants/candyRegistry';
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
            dispatch(setPendingJokerChoices(choices));
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

  const showLunchMinigames = useAppSelector(selectShowLunchMinigames);
  const setShowLunchMinigames = useCallback(
    (v: boolean) => dispatch(setShowLunchMinigamesAction(v)),
    [dispatch]
  );

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
  } = useGame();

  const { hasActiveEvent: hasActiveEventFn } = useEventHandler();
  const hasActiveEvent = hasActiveEventFn();
  const {
    getTotalStats,
    addProfit,
    addSpent,
    addCandySold,
    recordSale: recordDailyStatsSale,
  } = useDailyStats();
  const { setEvent, setHint } = useFlavorText();
  const { addSale, resetSales, consecutivePeriodSales, totalCandiesSold } =
    useCandySales();
  const [pendingLocationModal, setPendingLocationModal] = useState(false);
  const [localPricesUpdating, setLocalPricesUpdating] = useState(false);

  const { activeEffects, jokers, removeJoker, clearActiveEffect } = useJokers();
  const { applySalePriceBonus, getSalePriceBonus, selectedPassIds } =
    useHallPass();

  // Hustle system
  const {
    activeHustles,
    generateHustles: generateHustlesAction,
    completeHustle: completeHustleAction,
    getHustleForLocation,
  } = useHustle();
  const [showHustleJokerSelection, setShowHustleJokerSelection] = useState(false);
  const lastCompletedHustle = useAppSelector(selectLastCompletedHustle);
  const hustleNotEnoughCandy = useAppSelector(selectNotEnoughCandyMessage);

  // Student Delivery Quest system
  const activeQuest = useAppSelector(selectActiveQuest);
  const isQuestActive = useAppSelector(selectIsQuestActive);
  const [showQuestJokerSelection, setShowQuestJokerSelection] = useState(false);
  const questJokerChoices = useAppSelector(selectPendingJokerChoices);

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
      const unlockedHustleCandies = CANDY_REGISTRY
        .filter((c) => {
          if (c.size === 'medium' && !mediumUnlocked) return false;
          if (c.size === 'big' && !bigUnlocked) return false;
          return true;
        })
        .map((c) => c.name);
      generateHustlesAction(seed, day, periodsPerDay, unlockedHustleCandies);
      if (__DEV__) console.log(`🤝 HUSTLE: Generated hustles for day ${day}`);
    }
  }, [seed, day, periodsPerDay, generateHustlesAction, mediumUnlocked, bigUnlocked]);

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
        return;
      }
      // Belt-and-suspenders: if the quest names a candy the player can't currently
      // access, fail it instead of leaving an unwinnable quest hanging.
      const questCandyDef = getCandyDefinition(activeQuest.candyName);
      const accessible =
        !questCandyDef ||
        questCandyDef.size === 'small' ||
        (questCandyDef.size === 'medium' && mediumUnlocked) ||
        (questCandyDef.size === 'big' && bigUnlocked);
      if (!accessible) {
        dispatch(failQuest());
        if (__DEV__) console.log('📦 QUEST: Failed - candy not unlocked');
        return;
      }
    }
    if (activeQuest && !activeQuest.completed && day > activeQuest.day) {
      dispatch(failQuest());
      if (__DEV__) console.log('📦 QUEST: Failed - day changed');
    }
  }, [activeQuest, day, period, dispatch, setHint, mediumUnlocked, bigUnlocked]);

  // Ref for transaction modal manager (prevents parent re-renders)
  const transactionModalRef = useRef<TransactionModalHandle>(null);

  // Period event + hint + flavor text orchestration (extracted to a dedicated hook
  // so market.tsx's FC body stops re-evaluating this 150-line effect on every render).
  usePeriodEventFlavorText();

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

    // Teacher's Pet — peek the direction of next-period price on the top N biggest movers.
    // N = 1/2/3 depending on joker level. Shown as ↑ or ↓ next to the candy row.
    const teachersPet = jokers.find(
      (j: any) => j.id === JOKER_IDS.TEACHERS_PET || j.id === String(JOKER_IDS.TEACHERS_PET)
    );
    const peekHints: Record<string, 'up' | 'down'> = {};
    if (teachersPet) {
      const peekCount = (teachersPet as any).level === 3 ? 3 : (teachersPet as any).level === 2 ? 2 : 1;
      const movers: Array<{ name: string; delta: number }> = [];
      for (const candy of visibleCandies) {
        const curr = gameData.candyPrices[candy.name]?.[periodCount] ?? 0;
        const next = gameData.candyPrices[candy.name]?.[periodCount + 1] ?? curr;
        const delta = next - curr;
        if (delta !== 0) movers.push({ name: candy.name, delta });
      }
      movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      for (const m of movers.slice(0, peekCount)) {
        peekHints[m.name] = m.delta > 0 ? 'up' : 'down';
      }
    }

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

      // Calculate freshness remaining (periods until melt)
      const MELT_WINDOW = 5;
      let freshnessRemaining: number | undefined;
      if (inventoryItem && inventoryItem.quantity && inventoryItem.quantity > 0 && inventoryItem.purchasedAt !== undefined) {
        const periodsHeld = periodCount - inventoryItem.purchasedAt;
        freshnessRemaining = Math.max(0, MELT_WINDOW - periodsHeld);
      }

      return {
        ...candy,
        basePrice,
        cost: basePrice,
        quantityOwned: inventoryItem?.quantity ?? 0,
        averagePrice: inventoryItem?.price ?? null,
        freshnessRemaining,
        priceHint: peekHints[candy.name] ?? null,
      };
    });
  }, [
    periodCount,
    currentLocation,
    gameData.candyPrices,
    gameData.eventPrices,
    inventory,
    visibleCandies,
    jokers,
  ]);

  // Sync memoized candies to state only when they change
  useEffect(() => {
    setCandies(calculatedCandies);
  }, [calculatedCandies]);

  // Modal state moved to TransactionModalManager to prevent parent re-renders
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [dayStatsModalVisible, setDayStatsModalVisible] = useState(false);
  const [dayStatsBonuses, setDayStatsBonuses] = useState<
    {
      jokerName: string;
      amount: number;
      emoji?: string;
    }[]
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
  const [lunchConfirmVisible, setLunchConfirmVisible] = useState(false);
  const [isDroneDeposit, setIsDroneDeposit] = useState(false);

  // Candy melt modal state
  const [meltModalVisible, setMeltModalVisible] = useState(false);
  const [meltedCandies, setMeltedCandies] = useState<{ name: string; quantity: number; value: number }[]>([]);

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

  const { handleTransaction } = useTransactionHandler({
    candies,
    setCandies,
    closeModal,
    setShowQuestJokerSelection,
  });



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

  const { handleLocationSelect } = usePeriodAdvance({
    setLocationModalVisible,
    setLocalPricesUpdating,
    setMeltedCandies,
    setMeltModalVisible,
    setShowHustleJokerSelection,
  });

  const handleLunchConfirm = useCallback(() => {
    setLunchConfirmVisible(false);
    setShowLunchMinigames(true);
  }, []);

  const handleEndDay = useCallback(() => {
    setEndDayConfirmVisible(true);
  }, []);

  const handleEndDayConfirm = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setEndDayConfirmVisible(false);

    if (showLunchMinigames) {
      setShowLunchMinigames(false);
    }

    const bonuses = computeEndDayBonuses({
      jokers,
      totalInventoryCount: getTotalInventoryCount(),
      inventoryLimit: getInventoryLimit(),
    });
    for (const bonus of bonuses) {
      add(bonus.amount);
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
    jokers,
    getTotalInventoryCount,
    getInventoryLimit,
    add,
    showLunchMinigames,
    setShowLunchMinigames,
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

      {isTutorialActive && tutorialStep <= 7 && (
        <TutorialOverlay
          tutorialStep={tutorialStep}
          measurements={tutorialMeasurements}
          onAdvance={() => dispatch(advanceTutorial())}
          onSkip={() => dispatch(skipTutorial())}
        />
      )}

      {locationModalVisible && (
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
      )}

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

      {schoolsOutModalVisible && (
        <Suspense fallback={null}>
          <SchoolsOutModal
            visible={schoolsOutModalVisible}
            onComplete={handleSchoolsOutComplete}
          />
        </Suspense>
      )}

      {stashMoneyModalVisible && (
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
      )}

      {sleepConfirmModalVisible && (
        <Suspense fallback={null}>
          <SleepConfirmModal
            visible={sleepConfirmModalVisible}
            onConfirm={handleSleepConfirm}
            onCancel={handleSleepCancel}
            currentDay={day}
          />
        </Suspense>
      )}

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
        dismissible={true}
      />

      {/* Candy Melt Modal */}
      <ConfirmationModal
        visible={meltModalVisible}
        title="Candy Melted!"
        message={meltedCandies.map(c => `${c.name} x${c.quantity} ($${c.value.toFixed(2)} lost)`).join('\n')}
        emoji="🫠"
        confirmText="OK"
        onConfirm={() => setMeltModalVisible(false)}
        onCancel={() => setMeltModalVisible(false)}
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
            dispatch(clearLastCompletedHustle());
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ flex: 1 }}>
            <Suspense fallback={<View />}>
              <JokerSelection
                jokers={STANDARDIZED_JOKERS}
                onComplete={() => {
                  setShowHustleJokerSelection(false);
                  dispatch(clearLastCompletedHustle());
                }}
                rewardTier={1}
                completionLevel={2}
                showSellAndUpgrade={false}
                headerText={
                  lastCompletedHustle
                    ? `Hallway Hustle — delivered ${lastCompletedHustle.quantity} ${lastCompletedHustle.candyName} to the ${lastCompletedHustle.location}!`
                    : 'Hallway Hustle Reward!'
                }
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
            dispatch(clearPendingJokerChoices());
            dispatch(clearActiveQuest());
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ flex: 1 }}>
            <Suspense fallback={<View />}>
              <JokerSelection
                jokers={STANDARDIZED_JOKERS}
                onComplete={() => {
                  setShowQuestJokerSelection(false);
                  dispatch(clearPendingJokerChoices());
                  dispatch(clearActiveQuest());
                }}
                rewardTier={1}
                completionLevel={2}
                showSellAndUpgrade={false}
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
