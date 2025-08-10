import React, { createContext, useContext, useMemo, useState } from 'react';
import seedrandom from 'seedrandom';
import { generateSeededGameData } from '../../utils/generateSeededGameData';

type SeedContextType = {
  seed: string;
  rng: seedrandom.PRNG;
  setSeed: (newSeed: string) => void;
  gameData: ReturnType<typeof generateSeededGameData>;
  modifyCandyPrice: (candyName: string, period: number, newPrice: number) => void;
  getOriginalCandyPrice: (candyName: string, period: number) => number;
  restoreCandyPrice: (candyName: string, period: number) => void;
};

const SeedContext = createContext<SeedContextType | undefined>(undefined);

export const SeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seed, setSeed] = useState('default-seed');
  
  const rng = useMemo(() => seedrandom(seed), [seed]);
  const [gameData, setGameData] = useState(() => generateSeededGameData(seed));
  const [originalPrices] = useState(() => {
    const data = generateSeededGameData(seed);
    return JSON.parse(JSON.stringify(data.candyPrices));
  });
  
  // Update gameData when seed changes
  React.useEffect(() => {
    setGameData(generateSeededGameData(seed));
  }, [seed]);
  
  const modifyCandyPrice = (candyName: string, period: number, newPrice: number) => {
    setGameData(prev => {
      const updated = { ...prev };
      updated.candyPrices = { ...prev.candyPrices };
      updated.candyPrices[candyName] = [...prev.candyPrices[candyName]];
      updated.candyPrices[candyName][period] = newPrice;
      return updated;
    });
  };
  
  const getOriginalCandyPrice = (candyName: string, period: number): number => {
    return originalPrices[candyName]?.[period] || 0;
  };
  
  const restoreCandyPrice = (candyName: string, period: number) => {
    const originalPrice = getOriginalCandyPrice(candyName, period);
    modifyCandyPrice(candyName, period, originalPrice);
  };
  
  return (
    <SeedContext.Provider value={{ 
      seed, 
      rng, 
      setSeed, 
      gameData,
      modifyCandyPrice,
      getOriginalCandyPrice,
      restoreCandyPrice
    }}>
      {children}
    </SeedContext.Provider>
  );
};

export const useSeed = () => {
  const context = useContext(SeedContext);
  if (!context) {
    throw new Error("useSeed must be used within a SeedProvider");
  }
  return context;
};
