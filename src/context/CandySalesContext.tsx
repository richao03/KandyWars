import React, { createContext, useContext, useEffect, useState } from 'react';
import { useJokers } from './JokerContext';
import { useGame } from './GameContext';
import { loadGameState, saveGameState } from '../utils/persistence';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';

type CandySalesContextType = {
  consecutiveSales: string[];
  totalSaleCount: number; // Track total sales for Jump Rope Rhythm
  consecutivePeriodSales: number; // Track consecutive periods with sales for Swingset Momentum
  addSale: (candyName: string) => { shouldApplyCandySaladBonus: boolean; shouldApplyJumpRopeBonus: boolean }; // Returns bonuses that should apply
  resetSales: () => void;
  recordPeriodSale: () => void; // Record that a sale happened this period
};

const CandySalesContext = createContext<CandySalesContextType | undefined>(undefined);

export const CandySalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consecutiveSales, setConsecutiveSales] = useState<string[]>([]);
  const [totalSaleCount, setTotalSaleCount] = useState<number>(0);
  const [consecutivePeriodSales, setConsecutivePeriodSales] = useState<number>(0);
  const [lastSalePeriod, setLastSalePeriod] = useState<number>(-1); // Track when last sale occurred
  const [isLoaded, setIsLoaded] = useState(false);
  const { jokers } = useJokers();
  const { periodCount } = useGame();

  // Load sales tracking state
  useEffect(() => {
    const loadSalesData = async () => {
      const defaultState = { 
        consecutiveSales: [], 
        totalSaleCount: 0, 
        consecutivePeriodSales: 0, 
        lastSalePeriod: -1 
      };
      const savedState = await loadGameState(defaultState, 'candySalesTracking');
      setConsecutiveSales(savedState.consecutiveSales || []);
      setTotalSaleCount(savedState.totalSaleCount || 0);
      setConsecutivePeriodSales(savedState.consecutivePeriodSales || 0);
      setLastSalePeriod(savedState.lastSalePeriod || -1);
      setIsLoaded(true);
    };
    loadSalesData();
  }, []);

  // Save sales tracking state
  useEffect(() => {
    if (!isLoaded) return;
    saveGameState({ 
      consecutiveSales, 
      totalSaleCount, 
      consecutivePeriodSales, 
      lastSalePeriod 
    }, 'candySalesTracking');
  }, [consecutiveSales, totalSaleCount, consecutivePeriodSales, lastSalePeriod, isLoaded]);

  // Reset sales tracking at the start of each new period
  useEffect(() => {
    setConsecutiveSales([]);
  }, [periodCount]);

  const addSale = (candyName: string): { shouldApplyCandySaladBonus: boolean; shouldApplyJumpRopeBonus: boolean } => {
    // Increment total sale count for Jump Rope Rhythm
    const newTotalSaleCount = totalSaleCount + 1;
    setTotalSaleCount(newTotalSaleCount);

    // Track consecutive period sales for Swingset Momentum
    recordPeriodSale();

    // Check Jump Rope Rhythm bonus (every 3rd sale gets +33%)
    const jumpRopeJoker = findJokerById(jokers, JOKER_IDS.JUMP_ROPE_RHYTHM);
    const shouldApplyJumpRopeBonus = jumpRopeJoker && (newTotalSaleCount % 3 === 0);

    // Check if user has Candy Salad joker for 5x bonus
    const candySaladJoker = findJokerById(jokers, JOKER_IDS.CANDY_SALAD);
    let shouldApplyCandySaladBonus = false;
    
    if (candySaladJoker) {
      // Check if this candy type was already sold in this sequence
      if (consecutiveSales.includes(candyName)) {
        // Reset the sequence since this breaks the "different types" rule
        setConsecutiveSales([candyName]);
      } else {
        // Add this candy to the sequence
        const newSequence = [...consecutiveSales, candyName];
        setConsecutiveSales(newSequence);

        // Check if this is the 4th different type (triggers 5x bonus)
        shouldApplyCandySaladBonus = newSequence.length === 4;
      }
    }
    
    return { shouldApplyCandySaladBonus, shouldApplyJumpRopeBonus };
  };

  const recordPeriodSale = () => {
    // If this is a consecutive period sale, increment the counter
    if (lastSalePeriod === periodCount - 1) {
      setConsecutivePeriodSales(prev => prev + 1);
    } else {
      // Reset if there was a gap
      setConsecutivePeriodSales(1);
    }
    setLastSalePeriod(periodCount);
  };

  const resetSales = () => {
    setConsecutiveSales([]);
  };

  return (
    <CandySalesContext.Provider value={{
      consecutiveSales,
      totalSaleCount,
      consecutivePeriodSales,
      addSale,
      resetSales,
      recordPeriodSale,
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