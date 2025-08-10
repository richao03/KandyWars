import React, { createContext, useContext, useState } from 'react';

type DailyStats = {
  totalProfit: number;
  totalSpent: number;
  candiesSold: number;
  startingMoney: number;
};

type DailyStatsContextType = {
  dailyStats: DailyStats;
  addProfit: (amount: number) => void;
  addSpent: (amount: number) => void;
  addCandySold: (quantity: number) => void;
  setStartingMoney: (amount: number) => void;
  resetDailyStats: (startingBalance: number) => void;
  getTotalStats: () => {
    profit: number;
    spent: number;
    candiesSold: number;
    netGain: number;
  };
};

const DailyStatsContext = createContext<DailyStatsContextType | undefined>(undefined);

export const DailyStatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    totalProfit: 0,
    totalSpent: 0,
    candiesSold: 0,
    startingMoney: 20,
  });

  const addProfit = (amount: number) => {
    setDailyStats(prev => ({
      ...prev,
      totalProfit: prev.totalProfit + amount,
    }));
  };

  const addSpent = (amount: number) => {
    setDailyStats(prev => ({
      ...prev,
      totalSpent: prev.totalSpent + amount,
    }));
  };

  const addCandySold = (quantity: number) => {
    setDailyStats(prev => ({
      ...prev,
      candiesSold: prev.candiesSold + quantity,
    }));
  };

  const setStartingMoney = (amount: number) => {
    setDailyStats(prev => ({
      ...prev,
      startingMoney: amount,
    }));
  };

  const resetDailyStats = (startingBalance: number) => {
    setDailyStats({
      totalProfit: 0,
      totalSpent: 0,
      candiesSold: 0,
      startingMoney: startingBalance,
    });
  };

  const getTotalStats = () => {
    return {
      profit: dailyStats.totalProfit,
      spent: dailyStats.totalSpent,
      candiesSold: dailyStats.candiesSold,
      netGain: dailyStats.totalProfit - dailyStats.totalSpent,
    };
  };

  return (
    <DailyStatsContext.Provider value={{
      dailyStats,
      addProfit,
      addSpent,
      addCandySold,
      setStartingMoney,
      resetDailyStats,
      getTotalStats,
    }}>
      {children}
    </DailyStatsContext.Provider>
  );
};

export const useDailyStats = (): DailyStatsContextType => {
  const context = useContext(DailyStatsContext);
  if (!context) {
    throw new Error('useDailyStats must be used within DailyStatsProvider');
  }
  return context;
};