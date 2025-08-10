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
  const { setEvent, setHint } = useFlavorText();
  const { gameData } = useSeed();
  const { jokers } = useJokers();

  const day = Math.floor(periodCount / 8) + 1;
  const period = (periodCount % 8) + 1;

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
      
      setPeriodCount(savedState.periodCount);
      setCurrentLocation(savedState.currentLocation);
      setLocationHistory(savedState.locationHistory);
      setIsAfterSchool(savedState.isAfterSchool);
      setHasStudiedTonight(savedState.hasStudiedTonight);
      setIsLoaded(true);
      
      console.log('Game state loaded:', savedState);
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

    if (nextPeriodEvent?.hint) {
      // Check if user has a joker that affects hint visibility
      const scoutJoker = jokers.find((j) => j.name === 'Scout');
      const predictorJoker = jokers.find((j) => j.name === 'Predictor');

      let hintChance = 0.25; // Base 25% chance

      if (scoutJoker) {
        hintChance = 1.0; // Scout joker shows all hints
      } else if (predictorJoker) {
        hintChance = 0.5; // Predictor joker increases hint chance
      }

      if (Math.random() < hintChance) {
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
  }, [periodCount, currentLocation, jokers]);

  const incrementPeriod = (location: Location) => {
    const newPeriodCount = periodCount + 1;
    setPeriodCount(newPeriodCount);
    setCurrentLocation(location);
    setLocationHistory((prev) => [
      ...prev,
      { period: newPeriodCount, location },
    ]);
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
