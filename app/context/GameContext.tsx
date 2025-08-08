import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFlavorText } from './FlavorTextContext';
import { useSeed } from './SeedContext';

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
  incrementPeriod: (location: Location) => void;
  resetGame: () => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [periodCount, setPeriodCount] = useState(7); // 0 to 39 (5 days * 8 periods)
  const [currentLocation, setCurrentLocation] = useState<Location>('home room');
  const [locationHistory, setLocationHistory] = useState<LocationHistory[]>([{ period: 0, location: 'home room' }]);
  const { setEvent, setHint } = useFlavorText();
  const { gameData } = useSeed();

  const day = Math.floor(periodCount / 8) + 1;
  const period = (periodCount % 8 + 1);
  
  // Check for location-specific events
  const currentEvent = gameData.periodEvents.find(e => 
    e.period === periodCount && 
    (!e.location || e.location === currentLocation)
  );

  useEffect(() => {
    // Check for hints about next period's events
    const nextPeriodEvent = gameData.periodEvents.find(e => e.period === periodCount + 1 && e.hint);
    
    if (nextPeriodEvent?.hint) {
      // Show hint about upcoming event
      setHint(nextPeriodEvent.hint);
    } else if (currentEvent?.effect) {
      setEvent(currentEvent.effect);
    } else {
      setEvent('DEFAULT');
    }
  }, [periodCount, currentLocation]);

  const incrementPeriod = (location: Location) => {
    const newPeriodCount = periodCount + 1;
    setPeriodCount(newPeriodCount);
    setCurrentLocation(location);
    setLocationHistory(prev => [...prev, { period: newPeriodCount, location }]);
  };

  const resetGame = () => {
    setPeriodCount(0);
    setCurrentLocation('home room');
    setLocationHistory([{ period: 0, location: 'home room' }]);
  };

  return (
    <GameContext.Provider value={{ 
      day, 
      period, 
      periodCount, 
      currentLocation, 
      locationHistory, 
      incrementPeriod, 
      resetGame 
    }}>
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
