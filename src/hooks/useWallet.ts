import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addBalance,
  spendBalance,
  stashMoney,
  withdrawFromStash,
  resetWallet,
  completeReset,
  initializeWallet,
  setPlayerName,
} from '../store/slices/walletSlice';
import { resetGame } from '../store/slices/gameSlice';
import { resetInventory } from '../store/slices/inventorySlice';
import { resetJokers } from '../store/slices/jokerSlice';
import { resetDailyStats } from '../store/slices/dailyStatsSlice';
import { selectSelectedHallPassEffects } from '../store/slices/hallPassSlice';
import { HallPassUtils } from '../utils/hallPassUtils';

export const useWallet = () => {
  const dispatch = useAppDispatch();
  // Subscribe to specific values instead of entire state slice
  const balance = useAppSelector(state => state.wallet.balance);
  const stashedAmount = useAppSelector(state => state.wallet.stashedAmount);
  const adoptionFee = useAppSelector(state => state.wallet.adoptionFee);
  const difficultyLevel = useAppSelector(state => state.wallet.difficultyLevel);
  const playerName = useAppSelector(state => state.wallet.playerName);
  const playerId = useAppSelector(state => state.wallet.playerId);
  const isFirstTimeDifficultySelection = useAppSelector(state => state.wallet.isFirstTimeDifficultySelection);
  const hallPassEffects = useAppSelector(selectSelectedHallPassEffects);

  const spend = useCallback((amount: number): boolean => {
    if (balance >= amount) {
      dispatch(spendBalance(amount));
      return true;
    }
    return false;
  }, [dispatch, balance]);

  const add = useCallback((amount: number) => {
    dispatch(addBalance(amount));
  }, [dispatch]);

  const addAllowance = useCallback((jokers?: any[], periodCount?: number): number => {
    // Base allowance
    let baseAllowance = 10;

    // Apply Hall Pass allowance bonus first
    baseAllowance = HallPassUtils.applyAllowanceBonus(baseAllowance, hallPassEffects);

    // Apply joker effects
    let finalAllowance = baseAllowance;
    if (jokers && jokers.length > 0) {
      // Calculate allowance multipliers from jokers
      let allowanceMultiplier = 1;
      let allowanceAddition = 0;

      jokers.forEach(joker => {
        if (joker.effects) {
          joker.effects.forEach((effect: any) => {
            if (effect.target === 'allowance_multiplier' && effect.operation === 'multiply') {
              allowanceMultiplier *= effect.amount;
            } else if (effect.target === 'allowance_add' && effect.operation === 'add') {
              allowanceAddition += effect.amount;
            }
          });
        }
      });

      // Apply multipliers first, then additions
      finalAllowance = (baseAllowance * allowanceMultiplier) + allowanceAddition;
      console.log(`💰 Allowance calculation: base=${baseAllowance}, multiplier=${allowanceMultiplier}, addition=${allowanceAddition}, final=${finalAllowance}`);
    }

    dispatch(addBalance(finalAllowance));
    return finalAllowance;
  }, [dispatch, hallPassEffects]);

  const stashMoneyAction = useCallback((amount: number, jokers?: any[]): boolean => {
    // Use small epsilon to handle floating point precision issues
    const epsilon = 0.001;
    if (balance >= amount - epsilon) {
      dispatch(stashMoney(amount));
      return true;
    }
    console.log(`❌ Stash failed - balance: ${balance}, amount: ${amount}, difference: ${balance - amount}`);
    return false;
  }, [dispatch, balance]);

  const withdrawFromStashAction = useCallback((amount: number): boolean => {
    if (stashedAmount >= amount) {
      dispatch(withdrawFromStash(amount));
      return true;
    }
    return false;
  }, [dispatch, stashedAmount]);

  const stealMoney = useCallback((amount: number, jokers?: any[], periodCount?: number): number => {
    // This logic would need to be implemented based on your joker system
    const stolenAmount = Math.min(amount, balance);
    dispatch(spendBalance(stolenAmount));
    return stolenAmount;
  }, [dispatch, balance]);

  const resetWalletAction = useCallback(() => {
    dispatch(resetWallet());
  }, [dispatch]);

  const completeResetAction = useCallback(() => {
    dispatch(completeReset());
  }, [dispatch]);

  const initializeWalletAction = useCallback((level?: number, playerName?: string) => {
    dispatch(resetGame());
    dispatch(resetInventory());
    dispatch(resetJokers());
    dispatch(resetDailyStats());
    dispatch(initializeWallet({ level, playerName }));
  }, [dispatch]);

  const setPlayerNameAction = useCallback((name: string) => {
    dispatch(setPlayerName(name));
  }, [dispatch]);

  const hasExistingName = useCallback(async (): Promise<boolean> => {
    return playerName !== null;
  }, [playerName]);

  return {
    balance,
    stashedAmount,
    adoptionFee,
    difficultyLevel,
    playerName,
    playerId,
    isFirstTimeDifficultySelection,
    spend,
    add,
    addAllowance,
    stashMoney: stashMoneyAction,
    withdrawFromStash: withdrawFromStashAction,
    stealMoney,
    resetWallet: resetWalletAction,
    completeReset: completeResetAction,
    initializeWallet: initializeWalletAction,
    setPlayerName: setPlayerNameAction,
    hasExistingName,
  };
};