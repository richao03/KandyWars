import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  HallPassEffect,
  initializeHallPasses,
  resetHallPassSelection,
  selectAllHallPasses,
  selectHallPass,
  selectSelectedHallPass,
  selectSelectedHallPassEffects,
  selectUnlockedHallPasses,
  unlockHallPass,
} from '../store/slices/hallPassSlice';

export const useHallPass = () => {
  const dispatch = useAppDispatch();
  const allPasses = useAppSelector(selectAllHallPasses);
  const unlockedPasses = useAppSelector(selectUnlockedHallPasses);
  const selectedPass = useAppSelector(selectSelectedHallPass);
  const selectedEffects = useAppSelector(selectSelectedHallPassEffects);
  const hallPassState = useAppSelector((state) => state.hallPass);

  // Debug hall pass state (remove in production)
  // console.log('🎖️ Hall Pass State Debug:', {
  //   selectedPassId: hallPassState.selectedPassId,
  //   unlockedPassIds: hallPassState.unlockedPassIds,
  //   selectedPassName: selectedPass?.name,
  //   selectedEffects: selectedEffects,
  // });

  // Initialize hall passes on mount to refresh definitions from static data
  useEffect(() => {
    dispatch(initializeHallPasses());
  }, [dispatch]);

  const unlockPass = useCallback(
    (passId: string) => {
      dispatch(unlockHallPass({ passId }));
    },
    [dispatch]
  );

  const selectPass = useCallback(
    (passId: string | null) => {
      dispatch(selectHallPass(passId));
    },
    [dispatch]
  );

  const resetSelection = useCallback(() => {
    dispatch(resetHallPassSelection());
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
      // This function is now mainly used for compatibility - actual profit bonuses are calculated in selling logic
      const bonus = getSalePriceBonus();
      return bonus > 0 ? Math.round(basePrice * (1 + bonus / 100)) : basePrice;
    },
    [getSalePriceBonus]
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
        perfectAttendance?: boolean;
        studyStreak?: boolean;
        noJokers?: boolean;
        totalCandySold?: number;
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
            if (gameStats.completions >= 1) newUnlocks.push(pass.id);
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
          case 'speed_demon':
            if (
              gameStats.completionTime &&
              gameStats.completionTime < 10 * 60 * 1000
            )
              newUnlocks.push(pass.id);
            break;
          case 'minimalist_master':
            if (gameStats.noJokers) newUnlocks.push(pass.id);
            break;
          case 'high_roller':
            if (gameStats.totalCandySold && gameStats.totalCandySold > 300)
              newUnlocks.push(pass.id);
            break;
          case 'perfect_scholar':
            if (gameStats.difficulty >= 6) newUnlocks.push(pass.id);
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
    selectedPass,
    selectedEffects,
    isLoaded: hallPassState.isLoaded,

    // Actions
    unlockPass,
    selectPass,
    resetSelection,
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
