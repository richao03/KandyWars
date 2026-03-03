import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  HallPassEffect,
  clearNewlyUnlockedPasses,
  initializeHallPasses,
  resetHallPassSelection,
  selectAllHallPasses,
  selectHallPass,
  selectNewlyUnlockedHallPasses,
  selectSelectedHallPass,
  selectSelectedHallPassEffects,
  selectSelectedHallPasses,
  selectSelectedPassIds,
  selectUnlockedHallPasses,
  unlockHallPass,
} from '../store/slices/hallPassSlice';
import { selectActiveEffects } from '../store/slices/merchantSlice';
import { MerchantUtils } from '../utils/merchantUtils';

export const useHallPass = () => {
  const dispatch = useAppDispatch();
  const allPasses = useAppSelector(selectAllHallPasses);
  const unlockedPasses = useAppSelector(selectUnlockedHallPasses);
  const newlyUnlockedPasses = useAppSelector(selectNewlyUnlockedHallPasses);
  const selectedPass = useAppSelector(selectSelectedHallPass); // For backwards compatibility
  const selectedPasses = useAppSelector(selectSelectedHallPasses);
  const selectedPassIds = useAppSelector(selectSelectedPassIds);
  const selectedEffects = useAppSelector(selectSelectedHallPassEffects);
  const hallPassState = useAppSelector((state) => state.hallPass);
  const merchantEffects = useAppSelector(selectActiveEffects);

  // Debug hall pass state (remove in production)
  // console.log('🎖️ Hall Pass State Debug:', {
  //   selectedPassId: hallPassState.selectedPassId,
  //   unlockedPassIds: hallPassState.unlockedPassIds,
  //   selectedPassName: selectedPass?.name,
  //   selectedEffects: selectedEffects,
  // });

  // Initialize hall passes on mount to refresh definitions from static data
  useEffect(() => {
    if (!hallPassState.isLoaded) {
      dispatch(initializeHallPasses());
    }
  }, [dispatch, hallPassState.isLoaded]);

  const unlockPass = useCallback(
    (passId: string) => {
      dispatch(unlockHallPass({ passId }));
    },
    [dispatch]
  );

  const selectPass = useCallback(
    (passId: string) => {
      dispatch(selectHallPass(passId));
    },
    [dispatch]
  );

  const resetSelection = useCallback(() => {
    dispatch(resetHallPassSelection());
  }, [dispatch]);

  const clearNewlyUnlocked = useCallback(() => {
    dispatch(clearNewlyUnlockedPasses());
  }, [dispatch]);

  const isPassUnlocked = useCallback(
    (passId: string) => {
      return hallPassState.unlockedPassIds.includes(passId);
    },
    [hallPassState.unlockedPassIds]
  );

  // Get effect values for easy access in game logic
  const getEffectValue = useCallback(
    (effectType: HallPassEffect['type']): number => {
      const effect = selectedEffects.find((e) => e.type === effectType);
      return effect?.value || 0;
    },
    [selectedEffects]
  );

  const getSalePriceBonus = useCallback((): number => {
    return getEffectValue('sale_price_bonus');
  }, [getEffectValue]);

  const getInventoryBonus = useCallback((): number => {
    return getEffectValue('inventory_bonus');
  }, [getEffectValue]);

  const getAllowanceBonus = useCallback((): number => {
    return getEffectValue('allowance_bonus');
  }, [getEffectValue]);

  const getJokerBonus = useCallback((): number => {
    return getEffectValue('joker_bonus');
  }, [getEffectValue]);

  const hasSpecialEffect = useCallback(
    (description: string): boolean => {
      return selectedEffects.some(
        (e) => e.type === 'special' && e.description.includes(description)
      );
    },
    [selectedEffects]
  );

  // Apply hall pass effects to values (NOTE: This function is kept for compatibility but profit bonuses are now calculated in market.tsx)
  const applySalePriceBonus = useCallback(
    (basePrice: number): number => {
      // Apply Hall Pass bonus first
      const bonus = getSalePriceBonus();
      let finalPrice =
        bonus > 0 ? Math.round(basePrice * (1 + bonus / 100)) : basePrice;

      // Then apply Merchant bonus (Street Cred)
      finalPrice = MerchantUtils.applyProfitBonus(finalPrice, merchantEffects);

      return finalPrice;
    },
    [getSalePriceBonus, merchantEffects]
  );

  const applyAllowanceBonus = useCallback(
    (baseAllowance: number): number => {
      const bonus = getAllowanceBonus();
      return bonus > 0
        ? Math.round(baseAllowance * (1 + bonus / 100))
        : baseAllowance;
    },
    [getAllowanceBonus]
  );

  const applyInventoryBonus = useCallback(
    (baseInventory: number): number => {
      const bonus = getInventoryBonus();
      return baseInventory + bonus;
    },
    [getInventoryBonus]
  );

  // Check if requirements are met for unlocking passes
  const checkUnlockRequirements = useCallback(
    (
      gameStats: {
        completions: number;
        finalProfit: number;
        difficulty: number;
        completionTime?: number;
        studyStreak?: boolean;
        noJokers?: boolean;
        totalCandySold?: number;
        confiscationCount?: number;
        stashedAmount?: number;
        jokerCount?: number;
        maxDepositsCount?: number;
        earlyPeriodProfit?: number; // Profit from periods 1-4 (Time Crunch unlock)
        latePeriodProfit?: number; // Profit from periods 7-8 (Final Exam unlock)
        transactionCount?: number; // Number of sales transactions (Speedrun Champion unlock)
      },
      minigameTrackingData?: {
        hasPlayedAllMinigames: boolean;
      }
    ) => {
      const newUnlocks: string[] = [];

      // Check each pass requirement
      allPasses.forEach((pass) => {
        if (pass.isUnlocked) return; // Already unlocked

        switch (pass.id) {
          case 'no_longer_freshman':
            if (gameStats.completions >= 1) {
              newUnlocks.push(pass.id);
            }
            break;
          case 'sophomore_swagger':
            if (gameStats.completions >= 3) newUnlocks.push(pass.id);
            break;
          case 'junior_genius':
            if (gameStats.finalProfit >= 100000) newUnlocks.push(pass.id);
            break;
          case 'senior_executive':
            if (gameStats.completions >= 5) newUnlocks.push(pass.id);
            break;
          case 'valedictorian_vendor':
            if (minigameTrackingData?.hasPlayedAllMinigames)
              newUnlocks.push(pass.id);
            break;
          case 'candy_kingpin':
            if (gameStats.completions >= 10) newUnlocks.push(pass.id);
            break;
          case 'forged_pass':
            if (gameStats.jokerCount && gameStats.jokerCount >= 8)
              newUnlocks.push(pass.id);
            break;
          case 'minimalist_master':
            // Unlock if player won with no jokers in inventory
            if (gameStats.noJokers && gameStats.completions > 0)
              newUnlocks.push(pass.id);
            break;
          case 'high_roller':
            // Unlock if player sold over 1000 units of candies
            if (gameStats.totalCandySold && gameStats.totalCandySold > 1000)
              newUnlocks.push(pass.id);
            break;
          case 'perfect_scholar':
            if (gameStats.difficulty >= 6) newUnlocks.push(pass.id);
            break;
          case 'teachers_pet':
            if (gameStats.confiscationCount && gameStats.confiscationCount >= 3)
              newUnlocks.push(pass.id);
            break;
          case 'finance_club':
            if (gameStats.stashedAmount && gameStats.stashedAmount >= 35000)
              newUnlocks.push(pass.id);
            break;
          case 'maximalist':
            if (gameStats.maxDepositsCount && gameStats.maxDepositsCount >= 4)
              newUnlocks.push(pass.id);
            break;
          case 'time_crunch':
            // Unlock if player won with 50%+ profit from periods 1-4
            if (
              gameStats.earlyPeriodProfit &&
              gameStats.latePeriodProfit !== undefined
            ) {
              const totalProfit =
                gameStats.earlyPeriodProfit + gameStats.latePeriodProfit;
              const earlyPercent =
                totalProfit > 0
                  ? (gameStats.earlyPeriodProfit / totalProfit) * 100
                  : 0;
              if (earlyPercent >= 50 && gameStats.completions > 0) {
                newUnlocks.push(pass.id);
              }
            }
            break;
          case 'final_exam':
            // Unlock if player won with 50%+ profit from periods 7-8
            if (
              gameStats.earlyPeriodProfit !== undefined &&
              gameStats.latePeriodProfit
            ) {
              const totalProfit =
                gameStats.earlyPeriodProfit + gameStats.latePeriodProfit;
              const latePercent =
                totalProfit > 0
                  ? (gameStats.latePeriodProfit / totalProfit) * 100
                  : 0;
              if (latePercent >= 50 && gameStats.completions > 0) {
                newUnlocks.push(pass.id);
              }
            }
            break;
          case 'speedrun_champion':
            // Unlock if player won with less than 30 total sales transactions
            if (
              gameStats.transactionCount &&
              gameStats.transactionCount < 20 &&
              gameStats.completions > 0
            ) {
              newUnlocks.push(pass.id);
            }
            break;
          case 'inheritance':
            // Unlock if player won with $50,000+ in piggy bank
            // Note: stashedAmount starts negative (debt), so need to check if >= 50000 after paying off debt
            if (
              gameStats.stashedAmount &&
              gameStats.stashedAmount >= 50000 &&
              gameStats.completions > 0
            ) {
              newUnlocks.push(pass.id);
            }
            break;
        }
      });

      // Unlock new passes
      newUnlocks.forEach((passId) => {
        dispatch(unlockHallPass({ passId }));
      });

      return newUnlocks;
    },
    [allPasses, dispatch]
  );

  return {
    // State
    allPasses,
    unlockedPasses,
    newlyUnlockedPasses,
    selectedPass, // For backwards compatibility
    selectedPasses,
    selectedPassIds,
    selectedEffects,
    isLoaded: hallPassState.isLoaded,

    // Actions
    unlockPass,
    selectPass,
    resetSelection,
    clearNewlyUnlocked,
    isPassUnlocked,

    // Effect getters
    getSalePriceBonus,
    getInventoryBonus,
    getAllowanceBonus,
    getJokerBonus,
    hasSpecialEffect,

    // Effect appliers
    applySalePriceBonus,
    applyAllowanceBonus,
    applyInventoryBonus,

    // Unlock system
    checkUnlockRequirements,
  };
};
