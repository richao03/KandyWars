import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFlavorText } from './FlavorTextContext';
import { useJokers } from './JokerContext';
import { useSeed } from './SeedContext';
import { saveGameState, loadGameState, clearAllGameData } from '../utils/persistence';

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
  incrementPeriod: (location: Location) => void;
  startAfterSchool: () => void;
  startNewDay: () => void;
  resetGame: () => void;
  revertToPreviousPeriod: () => boolean;
  markStudiedTonight: () => void;
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { setEvent, setHint } = useFlavorText();
  const { gameData } = useSeed();
  const { jokers } = useJokers();

  const day = Math.max(1, Math.floor(periodCount / 8) + 1);
  const period = Math.max(1, (periodCount % 8) + 1);

  // Load game state on mount
  useEffect(() => {
    const loadGameData = async () => {
      const defaultState = {
        periodCount: 0,
        currentLocation: 'home room' as Location,
        locationHistory: [{ period: 0, location: 'home room' as Location }],
        isAfterSchool: false,
        hasStudiedTonight: false,
      };
      
      const savedState = await loadGameState(defaultState);
      
      setPeriodCount(savedState.periodCount ?? 0);
      setCurrentLocation(savedState.currentLocation || 'home room');
      setLocationHistory(savedState.locationHistory || [{ period: 0, location: 'home room' }]);
      setIsAfterSchool(savedState.isAfterSchool ?? false);
      setHasStudiedTonight(savedState.hasStudiedTonight ?? false);
      setIsLoaded(true);
      setIsInitialized(true);
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
    };
    
    saveGameState(gameState);
  }, [periodCount, currentLocation, locationHistory, isAfterSchool, hasStudiedTonight, isLoaded]);

  // Check for location-specific events
  const currentEvent = gameData.periodEvents.find(
    (e) =>
      e.period === periodCount &&
      (!e.location || e.location === currentLocation)
  );

  useEffect(() => {
    // Check for hints about next period's events
    const nextPeriodEvent = gameData.periodEvents.find(
      (e) => e.period === periodCount + 1 && e.hint
    );
    
    // Debug logging for events
    const allEventsWithHints = gameData.periodEvents.filter(e => e.hint);
    console.log(`All events with hints:`, allEventsWithHints.map(e => `Period ${e.period}: ${e.effect}`));
    console.log(`Looking for event at period ${periodCount + 1}:`, gameData.periodEvents.filter(e => e.period === periodCount + 1));

    if (nextPeriodEvent?.hint) {
      // Check if user has a joker that affects hint visibility
      const scoutJoker = jokers.find((j) => j.name === 'Scout');
      const predictorJoker = jokers.find((j) => j.name === 'Predictor');

      console.log(`Hint Debug - Period ${periodCount}, Next event: ${nextPeriodEvent.effect}, Has hint: ${!!nextPeriodEvent.hint}`);
      console.log(`Jokers:`, jokers.map(j => j.name));
      console.log(`Scout found: ${!!scoutJoker}, Predictor found: ${!!predictorJoker}`);

      let hintChance = 0.25; // Base 25% chance

      if (predictorJoker) {
        hintChance = 1.0; // Predictor joker shows all hints (100% chance)
        console.log('Predictor active - setting 100% hint chance');
      } else if (scoutJoker) {
        hintChance = 0.5; // Scout joker increases hint chance to 50%
        console.log('Scout active - setting 50% hint chance');
      } else {
        console.log('No hint jokers - using base 25% chance');
      }

      const randomRoll = Math.random();
      console.log(`Random roll: ${randomRoll}, Hint chance: ${hintChance}, Will show hint: ${randomRoll < hintChance}`);

      if (randomRoll < hintChance) {
        console.log(`Setting hint: "${nextPeriodEvent.hint}"`);
        setHint(nextPeriodEvent.hint);
      } else if (currentEvent?.effect) {
        console.log('No hint shown, showing current event');
        setEvent(currentEvent.effect);
      } else {
        console.log('No hint shown, showing DEFAULT');
        setEvent('DEFAULT');
      }
    } else if (currentEvent?.effect) {
      setEvent(currentEvent.effect);
    } else {
      setEvent('DEFAULT');
    }
  }, [periodCount, currentLocation, jokers]);

  const incrementPeriod = (location: Location) => {
    const newPeriodCount = periodCount + 1;
    setPeriodCount(newPeriodCount);
    setCurrentLocation(location);
    setLocationHistory((prev) => [
      ...prev,
      { period: newPeriodCount, location },
    ]);
    
    // Trigger candy generation for "Something from Nothing" joker
    // This will be handled by a separate effect in InventoryContext
  };

  const startAfterSchool = () => {
    setIsAfterSchool(true);
  };

  const startNewDay = () => {
    setIsAfterSchool(false);
    setHasStudiedTonight(false); // Reset study status for new day
    // Increment to next day's first period
    incrementPeriod('home room');
  };

  const resetGame = async () => {
    setPeriodCount(0);
    setCurrentLocation('home room');
    setLocationHistory([{ period: 0, location: 'home room' }]);
    setIsAfterSchool(false);
    setHasStudiedTonight(false);
    
    // Clear all saved game data
    await clearAllGameData();
    console.log('Game reset and all saved data cleared');
  };

  const markStudiedTonight = () => {
    setHasStudiedTonight(true);
  };

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

  // Don't render children until initialized to prevent NaN values
  if (!isInitialized) {
    return null;
  }

  return (
    <GameContext.Provider
      value={{
        day,
        period,
        periodCount,
        currentLocation,
        locationHistory,
        isAfterSchool,
        hasStudiedTonight,
        incrementPeriod,
        startAfterSchool,
        startNewDay,
        resetGame,
        revertToPreviousPeriod,
        markStudiedTonight,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
