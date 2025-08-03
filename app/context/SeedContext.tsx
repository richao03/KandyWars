import React, { createContext, useContext, useEffect, useState } from 'react';
import seedrandom from 'seedrandom';

type SeedContextType = {
  seed: string;
  rng: seedrandom.PRNG;
  setSeed: (newSeed: string) => void;
};

const SeedContext = createContext<SeedContextType | undefined>(undefined);

export const SeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seed, setSeedInternal] = useState(() => "hello");
  const [rng, setRng] = useState(() => seedrandom(seed));

  const setSeed = (newSeed: string) => {
    setSeedInternal(newSeed);
    setRng(() => seedrandom(newSeed));
  };

  useEffect(() => {
    setRng(() => seedrandom(seed));
  }, [seed]);

  return (
    <SeedContext.Provider value={{ seed, rng, setSeed }}>
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
