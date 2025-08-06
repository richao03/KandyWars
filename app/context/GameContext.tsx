import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFlavorText } from './FlavorTextContext';
import { useSeed } from './SeedContext';

type GameContextType = {
  day: number;
  period: number;
  incrementPeriod: () => void;
  resetGame: () => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [periodCount, setPeriodCount] = useState(0); // 0 to 39 (5 days * 8 periods)
  const { setEvent } = useFlavorText();
  const { gameData } = useSeed();

  const day = Math.floor(periodCount / 8) + 1;
  const period = (periodCount % 8 + 1);
  const currentEvent = gameData.periodEvents.find(e => e.period === period);

  console.log("what is current event", currentEvent)
  useEffect(() => {
    if (currentEvent?.effect) {
      setEvent(currentEvent.effect)
    } else {
      setEvent('DEFAULT');
    }
  }, [period]);

  const incrementPeriod = () => {
    if (currentEvent) {
      console.log("whts going on here?")
      setEvent(currentEvent.effect)
    } else {
      setEvent('NEW_PERIOD');
    }
    setPeriodCount((prev) => prev + 1);

  };

  const resetGame = () => {
    setPeriodCount(0);
  };

  return (
    <GameContext.Provider value={{ day, period, incrementPeriod, resetGame }}>
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
