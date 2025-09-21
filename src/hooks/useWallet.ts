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
import { resetJoker } from '../store/slices/jokerSlice';
import { resetDailyStats } from '../store/slices/dailyStatsSlice';

export const useWallet = () => {
  const dispatch = useAppDispatch();
  const walletState = useAppSelector(state => state.wallet);

  const spend = useCallback((amount: number): boolean => {
    if (walletState.balance >= amount) {
      dispatch(spendBalance(amount));
      return true;
    }
    return false;
  }, [dispatch, walletState.balance]);

  const add = useCallback((amount: number) => {
    dispatch(addBalance(amount));
  }, [dispatch]);

  const addAllowance = useCallback((jokers?: any[], periodCount?: number): number => {
    // This logic would need to be implemented based on your joker system
    const allowanceAmount = 10; // Base allowance
    dispatch(addBalance(allowanceAmount));
    return allowanceAmount;
  }, [dispatch]);

  const stashMoneyAction = useCallback((amount: number, jokers?: any[]): boolean => {
    if (walletState.balance >= amount) {
      dispatch(stashMoney(amount));
      return true;
    }
    return false;
  }, [dispatch, walletState.balance]);

  const withdrawFromStashAction = useCallback((amount: number): boolean => {
    if (walletState.stashedAmount >= amount) {
      dispatch(withdrawFromStash(amount));
      return true;
    }
    return false;
  }, [dispatch, walletState.stashedAmount]);

  const stealMoney = useCallback((amount: number, jokers?: any[], periodCount?: number): number => {
    // This logic would need to be implemented based on your joker system
    const stolenAmount = Math.min(amount, walletState.balance);
    dispatch(spendBalance(stolenAmount));
    return stolenAmount;
  }, [dispatch, walletState.balance]);

  const resetWalletAction = useCallback(() => {
    dispatch(resetWallet());
  }, [dispatch]);

  const completeResetAction = useCallback(() => {
    dispatch(completeReset());
  }, [dispatch]);

  const initializeWalletAction = useCallback((level?: number, playerName?: string) => {
    dispatch(resetGame());
    dispatch(resetInventory());
    dispatch(resetJoker());
    dispatch(resetDailyStats());
    dispatch(initializeWallet({ level, playerName }));
  }, [dispatch]);

  const setPlayerNameAction = useCallback((name: string) => {
    dispatch(setPlayerName(name));
  }, [dispatch]);

  const hasExistingName = useCallback(async (): Promise<boolean> => {
    return walletState.playerName !== null;
  }, [walletState.playerName]);

  return {
    balance: walletState.balance,
    stashedAmount: walletState.stashedAmount,
    difficultyLevel: walletState.difficultyLevel,
    playerName: walletState.playerName,
    playerId: walletState.playerId,
    isFirstTimeDifficultySelection: walletState.isFirstTimeDifficultySelection,
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