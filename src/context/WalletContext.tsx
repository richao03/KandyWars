import React, { createContext, useContext, useEffect, useState } from 'react';
import { saveWallet, loadWallet } from '../utils/persistence';
import { JokerService } from '../utils/jokerService';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';

type WalletContextType = {
  balance: number;
  stashedAmount: number;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  spend: (amount: number) => boolean;
  add: (amount: number) => void;
  addAllowance: (jokers?: any[], periodCount?: number) => number; // Returns amount received
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
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null); // current difficulty
  const [isLoaded, setIsLoaded] = useState(false);

  // Load wallet data on mount
  useEffect(() => {
    const loadWalletData = async () => {
      const defaultWallet = { balance: 20, stashedAmount: 0, difficulty: null };
      const savedWallet = await loadWallet(defaultWallet);
      setBalance(savedWallet.balance ?? 20);
      setStashedAmount(savedWallet.stashedAmount ?? 0);
      setDifficulty(savedWallet.difficulty ?? null);
      setIsLoaded(true);
      console.log('Wallet loaded:', savedWallet);
    };

    loadWalletData();
  }, []);

  // Save wallet data whenever it changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load
    const walletData = { balance, stashedAmount, difficulty };
    saveWallet(walletData);
  }, [balance, stashedAmount, difficulty, isLoaded]);

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

  const addAllowance = (jokers?: any[], periodCount?: number): number => {
    let allowanceAmount = 20; // Base allowance is $20
    
    // Check for Ace the Test joker that doubles allowance
    if (jokers) {
      const aceTheTestJoker = findJokerById(jokers, JOKER_IDS.ACE_THE_TEST);
      if (aceTheTestJoker) {
        allowanceAmount = allowanceAmount * 2;
        console.log('🎯 Ace the Test: Doubling daily allowance from $20 to $40');
      }
    }
    
    console.log('💰 WalletContext: Adding daily allowance:', allowanceAmount);
    setBalance(prev => {
      const newBalance = prev + allowanceAmount;
      console.log('💰 WalletContext: New balance after allowance:', newBalance);
      return newBalance;
    });
    
    return allowanceAmount;
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
    setDifficulty(null); // Reset difficulty
    console.log('Wallet reset to initial state');
  };

  const initializeWallet = (difficulty?: 'easy' | 'medium' | 'hard') => {
    setBalance(20); // Starting cash is always 20
    
    // Store the difficulty for future use
    if (difficulty) {
      setDifficulty(difficulty);
    }
    
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
      difficulty,
      spend, 
      add,
      addAllowance,
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

export const useWallet = (): WalletContextType | null => {
  const context = useContext(WalletContext);
  if (!context) {
    return null;
  }
  return context;
};
