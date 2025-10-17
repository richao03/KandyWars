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
  selectSelectedHallPasses,
  selectSelectedHallPassEffects,
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
    // Only initialize if not already loaded to prevent duplicate calls
    if (!hallPassState.isLoaded) {
      console.log('🎓 useHallPass: Dispatching initializeHallPasses');
      dispatch(initializeHallPasses());
    } else {
      console.log('🎓 useHallPass: Already initialized, skipping');
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
    const bonus = getEffectValue('sale_price_bonus');
    console.log('🎖️ getSalePriceBonus called, returning:', bonus);
    console.log('🎖️ Selected passes:', selectedPassIds);
    console.log('🎖️ Selected effects:', selectedEffects);
    return bonus;
  }, [getEffectValue, selectedPassIds, selectedEffects]);

  const getInventoryBonus = useCallback((): number => {
    const bonus = getEffectValue('inventory_bonus');
    console.log('🎖️ getInventoryBonus called, returning:', bonus);
    console.log('🎖️ Selected passes:', selectedPassIds);
    console.log('🎖️ Selected effects:', selectedEffects);
    return bonus;
  }, [getEffectValue, selectedPassIds, selectedEffects]);

  const getAllowanceBonus = useCallback((): number => {
    const bonus = getEffectValue('allowance_bonus');
    console.log('🎖️ getAllowanceBonus called, returning:', bonus);
    console.log('🎖️ Selected passes:', selectedPassIds);
    console.log('🎖️ Selected effects:', selectedEffects);
    return bonus;
  }, [getEffectValue, selectedPassIds, selectedEffects]);

  const getJokerBonus = useCallback((): number => {
    const bonus = getEffectValue('joker_bonus');
    console.log('🎖️ getJokerBonus called, returning:', bonus);
    console.log('🎖️ Selected passes:', selectedPassIds);
    console.log('🎖️ Selected effects:', selectedEffects);
    return bonus;
  }, [getEffectValue, selectedPassIds, selectedEffects]);

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
      let finalPrice = bonus > 0 ? Math.round(basePrice * (1 + bonus / 100)) : basePrice;

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
      },
      minigameTrackingData?: {
        hasPlayedAllMinigames: boolean;
      }
    ) => {
      console.log('🎓 checkUnlockRequirements called with:', { gameStats, minigameTrackingData });
      console.log('🎓 Total passes to check:', allPasses.length);

      const newUnlocks: string[] = [];

      // Check each pass requirement
      allPasses.forEach((pass) => {
        console.log(`🎓 Checking pass: ${pass.id}, isUnlocked: ${pass.isUnlocked}`);
        if (pass.isUnlocked) return; // Already unlocked

        switch (pass.id) {
          case 'no_longer_freshman':
            console.log(`🎓 No Longer Freshman check: completions=${gameStats.completions}, required=1`);
            if (gameStats.completions >= 1) {
              console.log('🎓 No Longer Freshman UNLOCKED!');
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
            if (gameStats.noJokers && gameStats.completions > 0) newUnlocks.push(pass.id);
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
        }
      });

      // Unlock new passes
      console.log('🎓 About to dispatch unlock actions for:', newUnlocks);
      newUnlocks.forEach((passId) => {
        console.log(`🎓 Dispatching unlockHallPass for: ${passId}`);
        dispatch(unlockHallPass({ passId }));
      });
      console.log('🎓 All unlock dispatches completed');

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
