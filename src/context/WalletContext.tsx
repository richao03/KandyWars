import React, { createContext, useContext, useEffect, useState } from 'react';
import { saveWallet, loadWallet } from '../utils/persistence';
import { JokerService } from '../utils/jokerService';

type WalletContextType = {
  balance: number;
  stashedAmount: number;
  spend: (amount: number) => boolean;
  add: (amount: number) => void;
  stashMoney: (amount: number) => boolean;
  withdrawFromStash: (amount: number) => boolean;
  confiscateStash: (jokers?: any[], periodCount?: number) => number; // Returns amount confiscated
  stealMoney: (amount: number, jokers?: any[], periodCount?: number) => number; // Returns amount stolen from balance
  resetWallet: () => void;
  initializeWallet: (difficulty?: 'easy' | 'medium' | 'hard') => void;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState(20); // starting cash
  const [stashedAmount, setStashedAmount] = useState(0); // money in piggy bank
  const [isLoaded, setIsLoaded] = useState(false);

  // Load wallet data on mount
  useEffect(() => {
    const loadWalletData = async () => {
      const defaultWallet = { balance: 20, stashedAmount: 0 };
      const savedWallet = await loadWallet(defaultWallet);
      setBalance(savedWallet.balance ?? 20);
      setStashedAmount(savedWallet.stashedAmount ?? 0);
      setIsLoaded(true);
      console.log('Wallet loaded:', savedWallet);
    };

    loadWalletData();
  }, []);

  // Save wallet data whenever it changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load
    const walletData = { balance, stashedAmount };
    saveWallet(walletData);
  }, [balance, stashedAmount, isLoaded]);

  const spend = (amount: number): boolean => {
    if (balance >= amount) {
      setBalance(prev => prev - amount);
      return true;
    }
    return false;
  };

  const add = (amount: number) => {
    console.log('💰 WalletContext: Adding money to wallet:', amount, 'Previous balance:', balance);
    setBalance(prev => {
      const newBalance = prev + amount;
      console.log('💰 WalletContext: New balance will be:', newBalance);
      return newBalance;
    });
  };

  const stashMoney = (amount: number): boolean => {
    // Round to 2 decimal places to avoid floating point precision issues
    const roundedAmount = Math.round(amount * 100) / 100;
    const roundedBalance = Math.round(balance * 100) / 100;
    
    if (roundedBalance >= roundedAmount && roundedAmount > 0) {
      setBalance(prev => Math.round((prev - roundedAmount) * 100) / 100);
      setStashedAmount(prev => Math.round((prev + roundedAmount) * 100) / 100);
      return true;
    }
    return false;
  };

  const withdrawFromStash = (amount: number): boolean => {
    // Round to 2 decimal places to avoid floating point precision issues
    const roundedAmount = Math.round(amount * 100) / 100;
    const roundedStashed = Math.round(stashedAmount * 100) / 100;
    
    if (roundedStashed >= roundedAmount && roundedAmount > 0) {
      setStashedAmount(prev => Math.round((prev - roundedAmount) * 100) / 100);
      setBalance(prev => Math.round((prev + roundedAmount) * 100) / 100);
      return true;
    }
    return false;
  };

  const confiscateStash = (jokers?: any[], periodCount?: number): number => {
    // Check for money protection from Safe Deposit joker
    if (jokers && periodCount !== undefined) {
      const jokerService = JokerService.getInstance();
      const hasMoneyProtection = jokerService.hasJokerEffect('money_protection', jokers, periodCount);
      
      if (hasMoneyProtection) {
        console.log('💰 Safe Deposit protection activated - stash confiscation prevented!');
        return 0; // No money confiscated due to protection
      }
    }
    
    const confiscatedAmount = stashedAmount;
    setStashedAmount(0);
    return confiscatedAmount;
  };

  const stealMoney = (amount: number, jokers?: any[], periodCount?: number): number => {
    // Check for money protection from Safe Deposit joker
    if (jokers && periodCount !== undefined) {
      const jokerService = JokerService.getInstance();
      const hasMoneyProtection = jokerService.hasJokerEffect('money_protection', jokers, periodCount);
      
      if (hasMoneyProtection) {
        console.log('💰 Safe Deposit protection activated - money theft prevented!');
        return 0; // No money stolen due to protection
      }
    }
    
    const actualStolenAmount = Math.min(amount, balance);
    setBalance(prev => prev - actualStolenAmount);
    return actualStolenAmount;
  };

  const resetWallet = () => {
    setBalance(20); // Reset to starting cash
    setStashedAmount(0); // Reset stash
    console.log('Wallet reset to initial state');
  };

  const initializeWallet = (difficulty?: 'easy' | 'medium' | 'hard') => {
    setBalance(20); // Starting cash is always 20
    
    // Set piggy bank balance based on difficulty (negative amounts represent debt)
    switch (difficulty) {
      case 'easy':
        setStashedAmount(-5000);
        break;
      case 'medium':
        setStashedAmount(-10000);
        break;
      case 'hard':
        setStashedAmount(-30000);
        break;
      default:
        setStashedAmount(0); // Default case
    }
    
    console.log(`Wallet initialized for ${difficulty || 'default'} difficulty`);
  };

  return (
    <WalletContext.Provider value={{ 
      balance, 
      stashedAmount,
      spend, 
      add,
      stashMoney,
      withdrawFromStash,
      confiscateStash,
      stealMoney,
      resetWallet,
      initializeWallet
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
