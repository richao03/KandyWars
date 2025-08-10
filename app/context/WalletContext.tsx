import React, { createContext, useContext, useState } from 'react';

type WalletContextType = {
  balance: number;
  stashedAmount: number;
  spend: (amount: number) => boolean;
  add: (amount: number) => void;
  stashMoney: (amount: number) => boolean;
  withdrawFromStash: (amount: number) => boolean;
  confiscateStash: () => number; // Returns amount confiscated
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState(20); // starting cash
  const [stashedAmount, setStashedAmount] = useState(0); // money in piggy bank

  const spend = (amount: number): boolean => {
    if (balance >= amount) {
      setBalance(prev => prev - amount);
      return true;
    }
    return false;
  };

  const add = (amount: number) => {
    setBalance(prev => prev + amount);
  };

  const stashMoney = (amount: number): boolean => {
    if (balance >= amount) {
      setBalance(prev => prev - amount);
      setStashedAmount(prev => prev + amount);
      return true;
    }
    return false;
  };

  const withdrawFromStash = (amount: number): boolean => {
    if (stashedAmount >= amount) {
      setStashedAmount(prev => prev - amount);
      setBalance(prev => prev + amount);
      return true;
    }
    return false;
  };

  const confiscateStash = (): number => {
    const confiscatedAmount = stashedAmount;
    setStashedAmount(0);
    return confiscatedAmount;
  };

  return (
    <WalletContext.Provider value={{ 
      balance, 
      stashedAmount,
      spend, 
      add,
      stashMoney,
      withdrawFromStash,
      confiscateStash
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
