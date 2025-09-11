import React, { createContext, useContext, useEffect, useState } from 'react';
import { saveWallet, loadWallet, savePlayerId, loadPlayerId, savePlayerNameStatus, loadPlayerNameStatus } from '../utils/persistence';
import { JokerService } from '../utils/jokerService';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';
import { processEffectsByTarget } from '../utils/jokerEffectEngine';
import { nameValidationService } from '../services/nameValidationService';

type WalletContextType = {
  balance: number;
  stashedAmount: number;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  playerName: string | null;
  playerId: string | null;
  isFirstTimeDifficultySelection: boolean;
  spend: (amount: number) => boolean;
  add: (amount: number) => void;
  addAllowance: (jokers?: any[], periodCount?: number) => number; // Returns amount received
  stashMoney: (amount: number, jokers?: any[]) => boolean;
  withdrawFromStash: (amount: number) => boolean;
  confiscateStash: (jokers?: any[], periodCount?: number) => number; // Returns amount confiscated
  stealMoney: (amount: number, jokers?: any[], periodCount?: number) => number; // Returns amount stolen from balance
  resetWallet: () => void;
  initializeWallet: (difficulty?: 'easy' | 'medium' | 'hard', playerName?: string) => void;
  setPlayerName: (name: string) => void;
  hasExistingName: () => Promise<boolean>;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState(20); // starting cash
  const [stashedAmount, setStashedAmount] = useState(0); // money in piggy bank
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null); // current difficulty
  const [playerName, setPlayerNameState] = useState<string | null>(null); // player name
  const [playerId, setPlayerId] = useState<string | null>(null); // unique player ID
  const [isFirstTimeDifficultySelection, setIsFirstTimeDifficultySelection] = useState(true); // track first time
  const [isLoaded, setIsLoaded] = useState(false);

  // Load wallet data on mount
  useEffect(() => {
    const loadWalletData = async () => {
      console.log('💰 WalletContext: Loading wallet data from storage...');
      const defaultWallet = { 
        balance: 20, 
        stashedAmount: 0, 
        difficulty: null, 
        playerName: null,
        playerId: null,
        isFirstTimeDifficultySelection: true 
      };
      console.log('💰 WalletContext: Default wallet:', defaultWallet);
      
      const savedWallet = await loadWallet(defaultWallet);
      console.log('💰 WalletContext: Loaded wallet from storage:', savedWallet);
      
      setBalance(savedWallet.balance ?? 20);
      setStashedAmount(savedWallet.stashedAmount ?? 0);
      setDifficulty(savedWallet.difficulty ?? null);
      
      // First check for persistent player ID, then load Firebase name
      const persistentPlayerId = await loadPlayerId();
      let currentPlayerId = persistentPlayerId || savedWallet.playerId;
      
      if (!currentPlayerId) {
        currentPlayerId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        console.log('💰 Generated new player ID:', currentPlayerId);
        await savePlayerId(currentPlayerId);
      }
      setPlayerId(currentPlayerId);
      
      // Check Firebase for existing name using the persistent player ID
      try {
        const existingNameFromFirebase = await nameValidationService.getPlayerName(currentPlayerId);
        if (existingNameFromFirebase) {
          console.log('💰 Found existing name in Firebase:', existingNameFromFirebase);
          setPlayerNameState(existingNameFromFirebase);
          setIsFirstTimeDifficultySelection(false);
          await savePlayerNameStatus(true);
        } else {
          console.log('💰 No existing name found in Firebase for player ID:', currentPlayerId);
          setPlayerNameState(savedWallet.playerName ?? null);
        }
      } catch (error) {
        console.error('❌ Failed to check Firebase for existing name:', error);
        setPlayerNameState(savedWallet.playerName ?? null);
      }
      
      setIsFirstTimeDifficultySelection(savedWallet.isFirstTimeDifficultySelection ?? true);
      setIsLoaded(true);
      
      console.log('💰 WalletContext: Wallet initialization complete');
    };

    loadWalletData();
  }, []);

  // Save wallet data whenever it changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load
    const walletData = { balance, stashedAmount, difficulty, playerName, playerId, isFirstTimeDifficultySelection };
    console.log('💰 WalletContext: Saving wallet data:', walletData);
    console.log('💰 WalletContext: isLoaded:', isLoaded);
    saveWallet(walletData);
  }, [balance, stashedAmount, difficulty, playerName, playerId, isFirstTimeDifficultySelection, isLoaded]);

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
    console.log('💰 WalletContext: addAllowance called');
    console.log('💰 WalletContext: Current balance before allowance:', balance);
    console.log('💰 WalletContext: Current stashedAmount before allowance:', stashedAmount);
    
    let allowanceAmount = 20; // Base allowance is $20
    
    if (jokers) {
      // Process allowance_add effects first (flat additions)
      const addEffects = processEffectsByTarget(jokers, 'allowance_add');
      for (const effect of addEffects) {
        allowanceAmount += effect.amount;
        console.log(`💰 ${effect.jokerName}: Adding $${effect.amount} to daily allowance`);
      }

      // Process allowance_multiplier effects (multipliers)
      const multiplierEffects = processEffectsByTarget(jokers, 'allowance_multiplier');
      for (const effect of multiplierEffects) {
        const oldAmount = allowanceAmount;
        allowanceAmount *= effect.amount;
        console.log(`💰 ${effect.jokerName}: Multiplying daily allowance by ${effect.amount}x (${oldAmount} → ${allowanceAmount})`);
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

  const stashMoney = (amount: number, jokers?: any[]): boolean => {
    // Round to 2 decimal places to avoid floating point precision issues
    const roundedAmount = Math.round(amount * 100) / 100;
    const roundedBalance = Math.round(balance * 100) / 100;
    
    console.log('💰 WalletContext: stashMoney called with amount:', roundedAmount);
    console.log('💰 WalletContext: Current balance:', roundedBalance);
    console.log('💰 WalletContext: Current stashedAmount:', stashedAmount);
    
    // Check if player has enough balance for the base amount
    if (roundedBalance >= roundedAmount && roundedAmount > 0) {
      console.log('💰 WalletContext: Depositing money - reducing balance and calculating final stash amount');
      
      // Calculate final amount with deposit bonus if applicable
      let finalStashAmount = roundedAmount;
      let bonusApplied = false;
      
      if (jokers) {
        const depositBonusJoker = findJokerById(jokers, JOKER_IDS.DEPOSIT_BONUS);
        if (depositBonusJoker) {
          finalStashAmount = roundedAmount * 1.1; // Apply 10% bonus to stash amount
          bonusApplied = true;
          console.log(`💰 Deposit Bonus: Applied 10% bonus. Base: $${roundedAmount.toFixed(2)}, Final stash: $${finalStashAmount.toFixed(2)}`);
        }
      }
      
      // Deduct only the base amount from balance
      setBalance(prev => {
        const newBalance = Math.round((prev - roundedAmount) * 100) / 100;
        console.log('💰 WalletContext: New balance after deposit:', newBalance);
        return newBalance;
      });
      
      // Add the final amount (including bonus) to stash
      setStashedAmount(prev => {
        const newStashedAmount = Math.round((prev + finalStashAmount) * 100) / 100;
        console.log('💰 WalletContext: New stashedAmount after deposit:', newStashedAmount);
        return newStashedAmount;
      });
      
      return true;
    }
    console.log('💰 WalletContext: Deposit failed - insufficient balance or invalid amount');
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
    // DEPRECATED: This function is no longer used for confiscation events
    // Confiscation events now only affect candy inventory (half, rounded down)
    // The piggy bank (stash) and wallet should NOT be touched during confiscation
    // Keeping this function for backward compatibility but it does nothing
    
    console.log('⚠️ confiscateStash called but does nothing - confiscation only affects candy inventory now');
    return 0;
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

  const resetWallet = async () => {
    // Don't release the player's name from Firebase during wallet reset
    // Names should only be released when user explicitly changes them in settings
    
    setBalance(20); // Reset to starting cash
    setStashedAmount(0); // Reset stash
    setDifficulty(null); // Reset difficulty
    // Don't reset player name - keep it for persistent user experience
    // setPlayerNameState(null); // Keep player name loaded from Firebase
    // Don't reset player ID - keep it persistent across game resets
    // setPlayerId(null); // Keep player ID for Firebase name tracking
    setIsFirstTimeDifficultySelection(true); // Reset first time flag
    console.log('Wallet reset to initial state (keeping player ID and name for persistence)');
  };

  const initializeWallet = (difficulty?: 'easy' | 'medium' | 'hard', playerName?: string) => {
    console.log('💰 WalletContext: initializeWallet called!');
    console.log('💰 WalletContext: Difficulty:', difficulty);
    console.log('💰 WalletContext: Player Name:', playerName);
    console.log('💰 WalletContext: Current balance before init:', balance);
    console.log('💰 WalletContext: Current stashedAmount before init:', stashedAmount);
    console.trace('💰 WalletContext: initializeWallet call stack trace');
    
    setBalance(20); // Starting cash is always 20
    
    // Store the difficulty for future use
    if (difficulty) {
      setDifficulty(difficulty);
      setIsFirstTimeDifficultySelection(false); // Mark that difficulty has been selected
    }
    
    // Store player name if provided
    if (playerName) {
      setPlayerNameState(playerName);
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
    
    console.log(`💰 WalletContext: Wallet initialized for ${difficulty || 'default'} difficulty - balance: 20, stashedAmount: ${difficulty === 'easy' ? -5000 : difficulty === 'medium' ? -10000 : difficulty === 'hard' ? -30000 : 0}, playerName: ${playerName || 'none'}`);
  };

  const setPlayerName = (name: string) => {
    console.log('💰 WalletContext: Setting player name:', name);
    setPlayerNameState(name);
  };

  const hasExistingName = async (): Promise<boolean> => {
    if (!playerId) return false;
    
    try {
      return await nameValidationService.hasPlayerSetName(playerId);
    } catch (error) {
      console.error('❌ Failed to check if player has existing name:', error);
      return false;
    }
  };


  return (
    <WalletContext.Provider value={{ 
      balance, 
      stashedAmount,
      difficulty,
      playerName,
      playerId,
      isFirstTimeDifficultySelection,
      spend, 
      add,
      addAllowance,
      stashMoney,
      withdrawFromStash,
      confiscateStash,
      stealMoney,
      resetWallet,
      initializeWallet,
      setPlayerName,
      hasExistingName
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
