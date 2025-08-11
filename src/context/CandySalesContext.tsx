import React, { createContext, useContext, useEffect, useState } from 'react';
import { useJokers } from './JokerContext';
import { useGame } from './GameContext';
import { loadGameState, saveGameState } from '../utils/persistence';

type CandySalesContextType = {
  consecutiveSales: string[];
  addSale: (candyName: string) => boolean; // Returns true if 5x bonus should apply
  resetSales: () => void;
};

const CandySalesContext = createContext<CandySalesContextType | undefined>(undefined);

export const CandySalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consecutiveSales, setConsecutiveSales] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { jokers } = useJokers();
  const { periodCount } = useGame();

  // Load sales tracking state
  useEffect(() => {
    const loadSalesData = async () => {
      const defaultState = { consecutiveSales: [] };
      const savedState = await loadGameState(defaultState, 'candySalesTracking');
      setConsecutiveSales(savedState.consecutiveSales || []);
      setIsLoaded(true);
    };
    loadSalesData();
  }, []);

  // Save sales tracking state
  useEffect(() => {
    if (!isLoaded) return;
    saveGameState({ consecutiveSales }, 'candySalesTracking');
  }, [consecutiveSales, isLoaded]);

  // Reset sales tracking at the start of each new period
  useEffect(() => {
    setConsecutiveSales([]);
  }, [periodCount]);

  const addSale = (candyName: string): boolean => {
    // Check if user has Candy Salad joker
    const candySaladJoker = jokers.find(j => j.name === 'Candy Salad');
    if (!candySaladJoker) {
      return false;
    }

    // Check if this candy type was already sold in this sequence
    if (consecutiveSales.includes(candyName)) {
      // Reset the sequence since this breaks the "different types" rule
      setConsecutiveSales([candyName]);
      return false;
    }

    // Add this candy to the sequence
    const newSequence = [...consecutiveSales, candyName];
    setConsecutiveSales(newSequence);

    // Check if this is the 4th different type (triggers 5x bonus)
    const shouldApplyBonus = newSequence.length === 4;
    
    return shouldApplyBonus;
  };

  const resetSales = () => {
    setConsecutiveSales([]);
  };

  return (
    <CandySalesContext.Provider value={{
      consecutiveSales,
      addSale,
      resetSales,
    }}>
      {children}
    </CandySalesContext.Provider>
  );
};

export const useCandySales = (): CandySalesContextType => {
  const context = useContext(CandySalesContext);
  if (!context) {
    throw new Error('useCandySales must be used within CandySalesProvider');
  }
  return context;
};