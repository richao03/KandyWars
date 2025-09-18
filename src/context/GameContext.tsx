import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';
import {
  clearAllGameData,
  loadGameState,
  saveGameState,
} from '../utils/persistence';
import { useFlavorText } from './FlavorTextContext';
import { useJokers } from './JokerContext';
import { useSeed } from './SeedContext';
import { useWallet } from './WalletContext';

export type Location =
  | 'gym'
  | 'cafeteria'
  | 'home room'
  | 'library'
  | 'science lab'
  | 'school yard'
  | 'bathroom';

type LocationHistory = {
  period: number;
  location: Location;
};

type GameContextType = {
  day: number;
  period: number;
  periodCount: number;
  currentLocation: Location;
  locationHistory: LocationHistory[];
  isAfterSchool: boolean;
  hasStudiedTonight: boolean;
  lastActiveView: 'market' | 'after-school';
  incrementPeriod: (location: Location) => void;
  startAfterSchool: () => void;
  startNewDay: () => void;
  resetGame: () => void;
  revertToPreviousPeriod: () => boolean;
  jumpToPeriod: (targetPeriod: number) => boolean;
  markStudiedTonight: () => void;
  setLastActiveView: (view: 'market' | 'after-school') => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [periodCount, setPeriodCount] = useState(0); // 0 to 39 (5 days * 8 periods)
  const [currentLocation, setCurrentLocation] = useState<Location>('home room');
  const [locationHistory, setLocationHistory] = useState<LocationHistory[]>([
    { period: 0, location: 'home room' },
  ]);
  const [isAfterSchool, setIsAfterSchool] = useState(false); // Explicitly controlled after-school mode
  const [hasStudiedTonight, setHasStudiedTonight] = useState(false);
  const [lastActiveView, setLastActiveView] = useState<'market' | 'after-school'>('market');
  const [trojanHorseCounter, setTrojanHorseCounter] = useState(0); // Tracks escalation level
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const flavorTextContext = useFlavorText();
  const seedContext = useSeed();
  const jokerContext = useJokers();
  const walletContext = useWallet();

  // Handle cases where contexts might not be available
  const setEvent = flavorTextContext?.setEvent || (() => {});
  const setHint = flavorTextContext?.setHint || (() => {});
  const gameData = seedContext?.gameData || { periodEvents: [] };
  const jokers = jokerContext?.jokers || [];
  const balance = walletContext?.balance || 0;
  const stealMoney = walletContext?.stealMoney || (() => {});
  const addMoney = walletContext?.add || (() => {});
  const modifyCandyPrice = seedContext?.modifyCandyPrice || (() => {});
  const getOriginalCandyPrice = seedContext?.getOriginalCandyPrice || (() => 0);

  // Memoize day and period calculations to prevent recalculation on every render
  const day = useMemo(
    () => Math.max(1, Math.floor(periodCount / 8) + 1),
    [periodCount]
  );
  const period = useMemo(
    () => Math.max(1, (periodCount % 8) + 1),
    [periodCount]
  );

  // Load game state on mount
  useEffect(() => {
    const loadGameData = async () => {
      const defaultState = {
        periodCount: 0,
        currentLocation: 'home room' as Location,
        locationHistory: [{ period: 0, location: 'home room' as Location }],
        isAfterSchool: false,
        hasStudiedTonight: false,
        lastActiveView: 'market' as const,
        trojanHorseCounter: 0,
      };

      const savedState = await loadGameState(defaultState);

      setPeriodCount(savedState.periodCount ?? 0);
      setCurrentLocation(savedState.currentLocation || 'home room');
      setLocationHistory(
        savedState.locationHistory || [{ period: 0, location: 'home room' }]
      );
      setIsAfterSchool(savedState.isAfterSchool ?? false);
      setHasStudiedTonight(savedState.hasStudiedTonight ?? false);
      setLastActiveView(savedState.lastActiveView || 'market');
      setTrojanHorseCounter(savedState.trojanHorseCounter ?? 0);
      setIsLoaded(true);
      setIsInitialized(true);

      console.log(
        '💾 GameContext - Set periodCount to:',
        savedState.periodCount ?? 0
      );
    };

    loadGameData();
  }, []);

  // Save game state whenever it changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load

    const gameState = {
      periodCount,
      currentLocation,
      locationHistory,
      isAfterSchool,
      hasStudiedTonight,
      lastActiveView,
      trojanHorseCounter,
    };

    console.log('💾 GameContext - Saving game state:', gameState);
    saveGameState(gameState);
  }, [
    periodCount,
    currentLocation,
    locationHistory,
    isAfterSchool,
    hasStudiedTonight,
    lastActiveView,
    trojanHorseCounter,
    isLoaded,
  ]);

  // Check for location-specific events
  const currentEvent = gameData?.periodEvents?.find(
    (e) =>
      e.period === periodCount &&
      (!e.location || e.location === currentLocation)
  );

  // Track which events have been processed
  const [processedEvents, setProcessedEvents] = useState<Set<number>>(
    new Set()
  );

  // Track which periods have had Trojan Horse effect applied
  const [processedTrojanHorsePeriods, setProcessedTrojanHorsePeriods] =
    useState<Set<number>>(new Set());

  // Process current event effects
  useEffect(() => {
    if (currentEvent && isInitialized) {
      // Check if we've already processed this event at this period
      const eventKey = periodCount;
      if (processedEvents.has(eventKey)) {
        console.log(
          `🎭 Event at period ${periodCount} already processed, skipping`
        );
        return;
      }

      console.log(
        `🎭 Processing event: ${currentEvent.effect || 'Unknown'} at period ${periodCount}`
      );

      switch (currentEvent.effect) {
        case 'LOSE_MONEY':
          // Bully event: lose all money
          // NOTE: The actual money stealing is handled by EventHandlerContext
          // when the modal is dismissed, so we don't steal it here
          console.log(`💸 LOSE_MONEY event detected at period ${periodCount}`);
          // Mark this event as processed
          setProcessedEvents((prev) => new Set(prev).add(eventKey));
          break;

        case 'FOUND_MONEY':
          // Found money event: add money to wallet
          let moneyToAdd = currentEvent.dollarAmount || 10; // Default to $10 if not specified

          // Check for jokers that multiply found money
          const logicAnomalyJoker = findJokerById(
            jokers,
            JOKER_IDS.LOGIC_ANOMALY
          );
          const hideAndSeekJoker = findJokerById(
            jokers,
            JOKER_IDS.HIDE_AND_SEEK
          );

          if (logicAnomalyJoker) {
            moneyToAdd = moneyToAdd * 3;
            console.log(
              `🧠 Logic Anomaly: Tripled found money from $${currentEvent.dollarAmount || 10} to $${moneyToAdd}`
            );
          } else if (hideAndSeekJoker) {
            moneyToAdd = moneyToAdd * 3;
            console.log(
              `🙈 Hide and Seek: Tripled found money from $${currentEvent.dollarAmount || 10} to $${moneyToAdd}`
            );
          }

          console.log(`💰 FOUND_MONEY event: adding $${moneyToAdd}`);
          addMoney(moneyToAdd);
          // Mark this event as processed
          setProcessedEvents((prev) => new Set(prev).add(eventKey));
          break;

        default:
          console.log(
            `⚠️ Unhandled event effect: ${currentEvent.effect || 'Unknown'}`
          );
      }
    }
  }, [
    currentEvent,
    periodCount,
    balance,
    isInitialized,
    processedEvents,
    stealMoney,
    jokers,
  ]);

  // Handle Trojan Horse joker effects
  useEffect(() => {
    if (!isInitialized || !gameData?.candyPrices) return;

    const trojanHorseJoker = findJokerById(jokers, JOKER_IDS.TROJAN_HORSE);

    if (trojanHorseJoker && !processedTrojanHorsePeriods.has(periodCount)) {
      // Calculate price increase based on period within current day (resets daily)
      // There are 8 periods per day, so get the period within the current day
      const periodWithinDay = periodCount % 8;
      const priceIncrease = (periodWithinDay + 1) * 10;

      console.log(
        `🐴 Trojan Horse: Applying +$${priceIncrease} to all candy prices for period ${periodCount} (day period ${periodWithinDay + 1}/8)`
      );

      // Apply price increase to all candies for current period
      const candyTypes = [
        'Bubble Gum',
        'M&Ms',
        'Skittles',
        'Snickers',
        'Sour Patch Kids',
        'Warheads',
        'Jaw Breaker',
      ];

      candyTypes.forEach((candyType) => {
        const originalPrice = getOriginalCandyPrice(candyType, periodCount);
        if (originalPrice > 0) {
          const newPrice = originalPrice + priceIncrease;
          modifyCandyPrice(candyType, periodCount, newPrice);
        }
      });

      // Mark this period as processed
      setProcessedTrojanHorsePeriods((prev) => new Set(prev).add(periodCount));
    }
  }, [
    periodCount,
    jokers,
    isInitialized,
    gameData,
    modifyCandyPrice,
    getOriginalCandyPrice,
    processedTrojanHorsePeriods,
  ]);

  useEffect(() => {
    // Don't override flavor text when in after-school mode
    if (isAfterSchool) {
      return;
    }

    // Check for hints about next period's events
    const nextPeriodEvent = gameData?.periodEvents?.find(
      (e) => e.period === periodCount + 1 && e.hint
    );

    if (nextPeriodEvent?.hint) {
      // Check if user has a joker that affects hint visibility
      const tapedInJoker = findJokerById(jokers, JOKER_IDS.TAPPED_IN);

      let hintChance = 0.25; // Base 25% chance

      if (tapedInJoker) {
        hintChance = 1.0; // Tapped In joker shows all hints (100% chance)
        // console.log('Tapped In active - setting 100% hint chance');
      } else {
        // console.log('No hint jokers - using base 25% chance');
      }

      const randomRoll = Math.random();

      if (randomRoll < hintChance) {
        setHint(nextPeriodEvent.hint);
      } else if (currentEvent?.effect) {
        setEvent(currentEvent.effect);
      } else {
        setEvent('DEFAULT');
      }
    } else if (currentEvent?.effect) {
      setEvent(currentEvent.effect);
    } else {
      setEvent('DEFAULT');
    }
  }, [periodCount, currentLocation, jokers, isAfterSchool]);

  const incrementPeriod = useCallback(
    (location: Location) => {
      const newPeriodCount = periodCount + 1;
      setPeriodCount(newPeriodCount);
      setCurrentLocation(location);
      setLocationHistory((prev) => [
        ...prev,
        { period: newPeriodCount, location },
      ]);

      // Trigger candy generation for "Something from Nothing" joker
      // This will be handled by a separate effect in InventoryContext
    },
    [periodCount]
  );

  const startAfterSchool = useCallback(() => {
    setIsAfterSchool(true);
    setLastActiveView('after-school');
    // Note: Trojan Horse effect is now based on period count, not a separate counter
  }, []);

  const startNewDay = useCallback(() => {
    console.log('🎮 GameContext: startNewDay called');
    console.log(
      '🎮 GameContext: Current periodCount before startNewDay:',
      periodCount
    );
    console.log('🎮 GameContext: Current day/period:', day, period);

    setIsAfterSchool(false);
    setHasStudiedTonight(false); // Reset study status for new day

    // Calculate the periodCount for the first period of the next day
    const currentDay = Math.floor(periodCount / 8) + 1;
    const nextDayPeriodCount = currentDay * 8; // Start of next day (period 1)

    console.log(
      '🎮 GameContext: Advancing from periodCount',
      periodCount,
      'to',
      nextDayPeriodCount
    );

    setPeriodCount(nextDayPeriodCount);
    setCurrentLocation('home room'); // Reset to home room for new day
    setLocationHistory([{ period: nextDayPeriodCount, location: 'home room' }]);

    console.log(
      '🎮 GameContext: startNewDay completed, new day/period should be:',
      Math.floor(nextDayPeriodCount / 8) + 1,
      (nextDayPeriodCount % 8) + 1
    );
  }, [periodCount, day, period]);

  const resetGame = async () => {
    console.log('🔄 GameContext: Resetting game...');

    // Clear all saved game data FIRST
    await clearAllGameData();

    // Then reset all state
    setPeriodCount(0);
    setCurrentLocation('home room');
    setLocationHistory([{ period: 0, location: 'home room' }]);
    setIsAfterSchool(false);
    setHasStudiedTonight(false);
    setLastActiveView('market');
    setTrojanHorseCounter(0);
    setProcessedEvents(new Set()); // Clear processed events
    setProcessedTrojanHorsePeriods(new Set()); // Clear processed Trojan Horse periods

    // Force save the reset state
    const resetState = {
      periodCount: 0,
      currentLocation: 'home room' as Location,
      locationHistory: [{ period: 0, location: 'home room' as Location }],
      isAfterSchool: false,
      hasStudiedTonight: false,
      lastActiveView: 'market' as const,
      trojanHorseCounter: 0,
    };
    await saveGameState(resetState);

    console.log('✅ GameContext: Game reset complete, period set to 0');
  };

  const markStudiedTonight = useCallback(() => {
    setHasStudiedTonight(true);
  }, []);

  const handleSetLastActiveView = useCallback((view: 'market' | 'after-school') => {
    setLastActiveView(view);
  }, []);

  const revertToPreviousPeriod = (): boolean => {
    if (periodCount > 0) {
      const newPeriodCount = periodCount - 1;
      setPeriodCount(newPeriodCount);

      // Find the previous location from history
      const previousLocation =
        locationHistory.find((h) => h.period === newPeriodCount)?.location ||
        'home room';
      setCurrentLocation(previousLocation);

      // Remove future history entries
      setLocationHistory((prev) =>
        prev.filter((h) => h.period <= newPeriodCount)
      );

      return true;
    }
    return false; // Can't revert from period 0
  };

  const jumpToPeriod = (targetPeriod: number): boolean => {
    // Validate target period (must be >= 0 and <= current period to only go back)
    if (targetPeriod < 0 || targetPeriod > periodCount) {
      console.warn(
        `Cannot jump to period ${targetPeriod}. Must be between 0 and ${periodCount}`
      );
      return false;
    }

    // If we're already at the target period, no need to change
    if (targetPeriod === periodCount) {
      return true;
    }

    // Reset Trojan Horse counter to what it would be at target period
    // Counter increases by 1 each period, so at period N, counter should be N
    setTrojanHorseCounter(targetPeriod);

    // Clear processed events for periods after target period
    // This allows events to re-occur when time progresses again
    setProcessedEvents((prev) => {
      const newSet = new Set<number>();
      prev.forEach((eventKey) => {
        if (eventKey <= targetPeriod) {
          newSet.add(eventKey);
        }
      });
      return newSet;
    });

    // Restore original candy prices for all periods after target period
    // This reverts any price manipulations that happened in the "future"
    if (seedContext?.restoreCandyPrice && seedContext?.gameData) {
      const candyTypes = [
        'Bubble Gum',
        'M&Ms',
        'Skittles',
        'Snickers',
        'Sour Patch Kids',
        'Warheads',
        'Jaw Breaker',
      ];

      for (let period = targetPeriod + 1; period <= periodCount; period++) {
        candyTypes.forEach((candyType) => {
          seedContext.restoreCandyPrice(candyType, period);
        });
      }

      console.log(
        `🔄 Restored original candy prices for periods ${targetPeriod + 1} to ${periodCount}`
      );
    }

    // Set the period count (this triggers other context updates)
    setPeriodCount(targetPeriod);

    // Find the location from history for this period, default to 'home room'
    const targetLocation =
      locationHistory.find((h) => h.period === targetPeriod)?.location ||
      'home room';
    setCurrentLocation(targetLocation);

    // Remove future history entries (anything after target period)
    setLocationHistory((prev) => prev.filter((h) => h.period <= targetPeriod));

    console.log(
      `⚡ Tachyonic Sprint: Jumped to period ${targetPeriod}. Wallet and inventory preserved, game state reverted.`
    );
    return true;
  };

  // Memoize the context value to prevent unnecessary rerenders
  const contextValue = useMemo(
    () => ({
      day,
      period,
      periodCount,
      currentLocation,
      locationHistory,
      isAfterSchool,
      hasStudiedTonight,
      lastActiveView,
      incrementPeriod,
      startAfterSchool,
      startNewDay,
      resetGame,
      revertToPreviousPeriod,
      jumpToPeriod,
      markStudiedTonight,
      setLastActiveView: handleSetLastActiveView,
    }),
    [
      day,
      period,
      periodCount,
      currentLocation,
      locationHistory,
      isAfterSchool,
      hasStudiedTonight,
      lastActiveView,
      incrementPeriod,
      startAfterSchool,
      startNewDay,
      resetGame,
      revertToPreviousPeriod,
      jumpToPeriod,
      markStudiedTonight,
      handleSetLastActiveView,
    ]
  );

  // Don't render children until initialized to prevent NaN values
  if (!isInitialized) {
    return null;
  }

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};

export const useGame = (): GameContextType | null => {
  const context = useContext(GameContext);
  if (!context) {
    return null;
  }
  return context;
};
