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
  selectBalance,
  selectStashedAmount,
  selectAdoptionFee,
  selectDifficultyLevel,
  selectPlayerName,
  selectPlayerId,
  selectIsFirstTimeDifficultySelection,
} from '../store/slices/walletSlice';
import { resetGame } from '../store/slices/gameSlice';
import { resetInventory } from '../store/slices/inventorySlice';
import { resetJokers } from '../store/slices/jokerSlice';
import { resetDailyStats } from '../store/slices/dailyStatsSlice';
import { resetCandySales } from '../store/slices/candySalesSlice';
import { selectSelectedHallPassEffects } from '../store/slices/hallPassSlice';
import { selectActiveEffects } from '../store/slices/merchantSlice';
import { HallPassUtils } from '../utils/hallPassUtils';
import { MerchantUtils } from '../utils/merchantUtils';
import { processEffectsByTarget } from '../utils/jokerEffectEngine';

export const useWallet = () => {
  const dispatch = useAppDispatch();
  // Subscribe to specific values using named selectors
  const balance = useAppSelector(selectBalance);
  const stashedAmount = useAppSelector(selectStashedAmount);
  const adoptionFee = useAppSelector(selectAdoptionFee);
  const difficultyLevel = useAppSelector(selectDifficultyLevel);
  const playerName = useAppSelector(selectPlayerName);
  const playerId = useAppSelector(selectPlayerId);
  const isFirstTimeDifficultySelection = useAppSelector(selectIsFirstTimeDifficultySelection);
  const hallPassEffects = useAppSelector(selectSelectedHallPassEffects);
  const hallPassModifiers = useAppSelector(state => state.hallPassModifiers);
  const selectedPassIds = useAppSelector((state) => state.hallPass.selectedPassIds);
  const dailyStats = useAppSelector(state => state.dailyStats.dailyStats);
  const currentDayStats = useAppSelector(state => state.dailyStats.currentDayStats);
  const merchantEffects = useAppSelector(selectActiveEffects);

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

    // Apply Hall Pass allowance bonus from pre-computed modifiers
    const allowanceBonusPercent = hallPassModifiers.allowanceBonusPercent;
    if (allowanceBonusPercent > 0) {
      baseAllowance = Math.round(baseAllowance * (1 + allowanceBonusPercent / 100));
      if (__DEV__) console.log(`🎖️ Hall Pass allowance bonus: ${allowanceBonusPercent}% → $${baseAllowance}`);
    }

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

      // Cap allowance multiplier at 8x to prevent exponential stacking
      const MAX_ALLOWANCE_MULTIPLIER = 8;
      allowanceMultiplier = Math.min(allowanceMultiplier, MAX_ALLOWANCE_MULTIPLIER);

      // Apply multipliers first, then additions
      finalAllowance = (baseAllowance * allowanceMultiplier) + allowanceAddition;
      if (__DEV__) console.log(`💰 Allowance calculation: base=${baseAllowance}, multiplier=${allowanceMultiplier}, addition=${allowanceAddition}, final=${finalAllowance}`);
    }

    // Apply Merchant allowance bonus (Fake Report Card)
    finalAllowance = MerchantUtils.applyAllowanceBonus(finalAllowance, merchantEffects);

    // Finance Club: Add 10% of yesterday's profit to allowance
    const hasFinanceClub = selectedPassIds.includes('finance_club');
    if (__DEV__) {
      console.log(`💼 Finance Club Debug: Checking if Finance Club is active...`);
      console.log(`💼 Finance Club Debug: selectedPassIds:`, selectedPassIds);
      console.log(`💼 Finance Club Debug: hasFinanceClub: ${hasFinanceClub}`);
      console.log(`💼 Finance Club Debug: currentDayStats:`, currentDayStats);
    }

    if (hasFinanceClub && currentDayStats) {
      // Get current day number
      const currentDay = currentDayStats.day;
      if (__DEV__) {
        console.log(`💼 Finance Club Debug: Current day: ${currentDay}`);
        console.log(`💼 Finance Club Debug: Looking for yesterday (day ${currentDay - 1}) in dailyStats:`, dailyStats);
      }

      // Find yesterday's stats (day - 1)
      const yesterdayStats = dailyStats.find(d => d.day === currentDay - 1);
      if (__DEV__) console.log(`💼 Finance Club Debug: Yesterday's stats found:`, yesterdayStats);

      if (yesterdayStats && yesterdayStats.profit > 0) {
        const profitBonus = Math.round(yesterdayStats.profit * 0.1);
        if (__DEV__) {
          console.log(`💼 Finance Club: Yesterday's profit: $${yesterdayStats.profit}`);
          console.log(`💼 Finance Club: Calculating 10% bonus: ${yesterdayStats.profit} * 0.1 = ${yesterdayStats.profit * 0.1}`);
          console.log(`💼 Finance Club: Rounded bonus: $${profitBonus}`);
          console.log(`💼 Finance Club: Allowance before bonus: $${finalAllowance}`);
        }
        finalAllowance += profitBonus;
        if (__DEV__) console.log(`💼 Finance Club: ✅ Added $${profitBonus} to allowance → Final: $${finalAllowance}`);
      } else if (yesterdayStats && yesterdayStats.profit <= 0) {
        if (__DEV__) console.log(`💼 Finance Club: ⚠️ Yesterday's profit was $${yesterdayStats.profit} (not positive) - no bonus added`);
      } else {
        if (__DEV__) console.log(`💼 Finance Club: ⚠️ No stats found for yesterday (day ${currentDay - 1}) - likely first day, no bonus added`);
      }
    } else if (hasFinanceClub && !currentDayStats) {
      if (__DEV__) console.log(`💼 Finance Club: ⚠️ Finance Club active but currentDayStats is null/undefined`);
    } else {
      if (__DEV__) console.log(`💼 Finance Club: Hall pass not selected, skipping bonus`);
    }

    // Family Business: Add $1000 if 3+ allowance multiplier jokers owned
    if (jokers && jokers.length > 0) {
      const allowanceMultiplierJokers = processEffectsByTarget(jokers, 'allowance_multiplier');
      const hasFamilyBusiness = jokers.some((j: any) => j.id === 26);

      if (hasFamilyBusiness && allowanceMultiplierJokers.length >= 3) {
        finalAllowance += 1000;
        if (__DEV__) console.log(`👨‍👩‍👧‍👦 Family Business: You have ${allowanceMultiplierJokers.length} allowance multiplier jokers → +$1000 to allowance`);
      }
    }

    // Deposit Bonus: earn % of stashed amount as daily allowance
    if (jokers && jokers.length > 0 && stashedAmount > 0) {
      const stashBonusEffects = processEffectsByTarget(jokers, 'stash_allowance_bonus');
      for (const effect of stashBonusEffects) {
        // stashedAmount can be negative (debt), only apply if positive
        if (stashedAmount > 0) {
          const bonus = Math.round(stashedAmount * effect.amount);
          finalAllowance += bonus;
          if (__DEV__) console.log(`💰 Deposit Bonus: ${Math.round(effect.amount * 100)}% of $${stashedAmount} stash → +$${bonus} allowance`);
        }
      }
    }

    dispatch(addBalance(finalAllowance));
    return finalAllowance;
  }, [dispatch, hallPassModifiers.allowanceBonusPercent, selectedPassIds, dailyStats, currentDayStats, merchantEffects, stashedAmount]);

  const stashMoneyAction = useCallback((amount: number): boolean => {
    const epsilon = 0.001;
    if (balance >= amount - epsilon) {
      dispatch(stashMoney({ amountPaid: amount, amountStashed: amount }));
      return true;
    }
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
    dispatch(resetCandySales()); // Reset period profit tracking for new game
    dispatch(initializeWallet({ level, playerName }));
  }, [dispatch]);

  const setPlayerNameAction = useCallback((name: string) => {
    dispatch(setPlayerName(name));
  }, [dispatch]);

  const hasExistingName = useCallback(async (): Promise<boolean> => {
    return playerName !== null;
  }, [playerName]);

  const applyDailyInterest = useCallback((jokers?: any[]): number => {
    if (__DEV__) {
      console.log(`💰 High Yield Account Debug: Checking daily interest...`);
      console.log(`💰 High Yield Account Debug: jokers:`, jokers?.map(j => ({ id: j.id, name: j.name })));
      console.log(`💰 High Yield Account Debug: stashedAmount: $${stashedAmount}`);
    }

    // Check if player has High Yield Account joker (ID 53)
    if (!jokers || jokers.length === 0) {
      if (__DEV__) console.log(`💰 High Yield Account: No jokers owned, skipping interest`);
      return 0;
    }

    if (stashedAmount <= 0) {
      if (__DEV__) console.log(`💰 High Yield Account: No money stashed ($${stashedAmount}), skipping interest`);
      return 0;
    }

    const highYieldJoker = jokers.find((j: any) => j.id === 53);
    if (__DEV__) console.log(`💰 High Yield Account Debug: hasHighYieldAccount (ID 53): ${!!highYieldJoker}`);

    if (!highYieldJoker) {
      if (__DEV__) console.log(`💰 High Yield Account: Joker not owned, skipping interest`);
      return 0;
    }

    // Apply compound interest based on joker level (8%/15%/25%)
    const level = highYieldJoker.level ?? 1;
    const rate = level <= 1 ? 0.08 : level === 2 ? 0.15 : 0.25;
    const MAX_DAILY_INTEREST = 5000;
    const rawInterest = stashedAmount * rate;
    const interest = Math.min(rawInterest, MAX_DAILY_INTEREST);
    if (__DEV__) {
      console.log(`💰 High Yield Account: Level ${level}, rate ${rate * 100}%, raw interest: $${rawInterest.toFixed(2)}, capped: $${interest.toFixed(2)} (max $${MAX_DAILY_INTEREST}/day)`);
      console.log(`💰 High Yield Account: Stashed before interest: $${stashedAmount}`);
    }
    dispatch(stashMoney({ amountPaid: 0, amountStashed: interest }));
    if (__DEV__) {
      console.log(`💰 High Yield Account: ✅ Earned $${interest.toFixed(2)} interest (${rate * 100}% of $${stashedAmount}, capped at $${MAX_DAILY_INTEREST})`);
      console.log(`💰 High Yield Account: Stashed after interest: $${stashedAmount + interest}`);
    }
    return interest;
  }, [dispatch, stashedAmount]);

  const applyInheritance = useCallback((): number => {
    if (__DEV__) {
      console.log(`💎 Inheritance Debug: Checking if Inheritance is active...`);
      console.log(`💎 Inheritance Debug: selectedPassIds:`, selectedPassIds);
      console.log(`💎 Inheritance Debug: includes('inheritance'): ${selectedPassIds.includes('inheritance')}`);
      console.log(`💎 Inheritance Debug: current wallet balance: $${balance}`);
      console.log(`💎 Inheritance Debug: current stashed amount: $${stashedAmount}`);
    }

    // Check if Inheritance hall pass is selected
    if (!selectedPassIds.includes('inheritance')) {
      if (__DEV__) console.log(`💎 Inheritance: Hall pass not selected, skipping transfer`);
      return 0;
    }

    if (balance <= 0) {
      if (__DEV__) console.log(`💎 Inheritance: ⚠️ Wallet balance is $${balance} (not positive) - no transfer`);
      return 0;
    }

    // Add 10% of wallet to piggy bank (FREE money, doesn't remove from wallet)
    const transferAmount = balance * 0.1;
    if (__DEV__) {
      console.log(`💎 Inheritance: Calculating transfer: ${balance} * 0.1 = ${transferAmount}`);
      console.log(`💎 Inheritance: Wallet before: $${balance} (will stay the same)`);
      console.log(`💎 Inheritance: Stashed before: $${stashedAmount}`);
    }
    dispatch(stashMoney({ amountPaid: 0, amountStashed: transferAmount }));
    if (__DEV__) {
      console.log(`💎 Inheritance: ✅ Added $${transferAmount.toFixed(2)} to piggy bank (FREE money, wallet unchanged)`);
      console.log(`💎 Inheritance: Wallet after: $${balance} (unchanged)`);
      console.log(`💎 Inheritance: Stashed after: $${stashedAmount + transferAmount}`);
    }
    return transferAmount;
  }, [dispatch, selectedPassIds, balance, stashedAmount]);

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
    applyDailyInterest,
    applyInheritance,
  };
};