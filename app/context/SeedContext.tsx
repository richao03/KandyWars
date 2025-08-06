import React, { createContext, useContext, useEffect, useState } from 'react';
import seedrandom from 'seedrandom';
import { generateSeededGameData } from '../../utils/generateSeededGameData';

type SeedContextType = {
  seed: string;
  rng: seedrandom.PRNG;
  setSeed: (newSeed: string) => void;
  gameData: ReturnType<typeof generateSeededGameData>;
};

const SeedContext = createContext<SeedContextType | undefined>(undefined);

export const SeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seed, setSeed] = useState('default-seed');
  const [rng, setRng] = useState(() => seedrandom(seed));
  const [gameData, setGameData] = useState(() => generateSeededGameData(seed));

  useEffect(() => {
    const newRng = seedrandom(seed);
    setRng(() => newRng);
    setGameData(() => generateSeededGameData(seed));
  }, [seed]);

  return (
    <SeedContext.Provider value={{ seed, rng, setSeed, gameData }}>
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
