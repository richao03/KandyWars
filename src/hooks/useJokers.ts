import { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addJoker,
  removeJoker,
  lockJoker,
  unlockJoker,
  setJokers,
  resetJokers,
  addActiveEffect,
  removeActiveEffect,
  clearAllActiveEffects,
  selectComputedInventoryLimit,
  setVacuumSealerBonus,
  markJokerUsedToday,
  resetDailyJokerUsage,
  selectUsedTodayJokerIds,
  recomputeJokerEffects,
} from '../store/slices/jokerSlice';
import { trackJokerObtained } from '../store/slices/localAnalyticsSlice';
import { JOKER_IDS } from '../constants/jokerIds';

interface ActiveJokerEffect {
  jokerId: number;
  candyType?: string;
  period?: number;
}

export const useJokers = () => {
  const dispatch = useAppDispatch();
  const jokerState = useAppSelector(state => state.joker);
  const activeEffects = useAppSelector(state => state.joker.activeEffects);
  const computedInventoryLimit = useAppSelector(selectComputedInventoryLimit);
  const hallPassModifiers = useAppSelector(state => state.hallPassModifiers);
  const usedTodayJokerIds = useAppSelector(selectUsedTodayJokerIds);
  const periodCount = useAppSelector(state => state.game.periodCount);
  const [onFirstJokerCallbacks] = useState<(() => void)[]>([]);

  const addJokerAction = useCallback((joker: any, source?: 'minigame' | 'purchase' | 'event', minigameType?: string) => {
    // Special handling for Vacuum Sealer: doubles current inventory, then becomes disabled
    // Check both id and originalId (for copies from Glitch in the Matrix)
    const jokerIdToCheck = joker.originalId || joker.id;
    if (jokerIdToCheck === JOKER_IDS.VACUUM_SEALER || jokerIdToCheck === JOKER_IDS.VACUUM_SEALER.toString()) {
      // Calculate TOTAL current inventory (including hall passes)
      const currentTotal = computedInventoryLimit + hallPassModifiers.inventoryBonusSlots;

      // We want to double this, so final should be: currentTotal * 2
      // Since hall pass is added separately in useInventory, we need:
      // (base + bonus) + hallPass = currentTotal * 2
      // bonus = (currentTotal * 2) - base - hallPass
      const baseInventory = 30;
      const targetTotal = currentTotal * 2;
      const bonus = targetTotal - baseInventory - hallPassModifiers.inventoryBonusSlots;

      dispatch(setVacuumSealerBonus(bonus));

      // Immediately trigger recomputation so UI updates right away
      dispatch(recomputeJokerEffects({
        baseInventoryLimit: baseInventory,
        periodCount
      }));

      console.log(`🔧 Vacuum Sealer: Current=${currentTotal}, Target=${targetTotal}, Setting bonus=${bonus} (base ${baseInventory} + bonus ${bonus} + hallPass ${hallPassModifiers.inventoryBonusSlots} = ${targetTotal})`);
    }

    // Add the joker to the list
    dispatch(addJoker(joker));

    // Track joker obtained locally (will be synced to Firebase at game end)
    if (source === 'minigame' && joker.name) {
      console.log('📊 Local: Tracking joker obtained -', joker.name);
      dispatch(trackJokerObtained(joker.name));
    }
  }, [dispatch, computedInventoryLimit, hallPassModifiers.inventoryBonusSlots, periodCount]);

  const removeJokerAction = useCallback((jokerId: string | number) => {
    dispatch(removeJoker(typeof jokerId === 'string' ? jokerId : jokerId.toString()));
  }, [dispatch]);

  const hasJoker = useCallback((jokerId: number): boolean => {
    return jokerState.jokers.some(j => j.id === jokerId.toString());
  }, [jokerState.jokers]);

  const getJokersBySubject = useCallback((subject: string) => {
    return jokerState.jokers.filter(joker =>
      joker.tier === subject || joker.name.toLowerCase().includes(subject.toLowerCase())
    );
  }, [jokerState.jokers]);

  const activateJoker = useCallback(async (
    jokerId: number,
    candyType?: string,
    period?: number
  ): Promise<boolean> => {
    const effect = { jokerId, candyType, period };
    dispatch(addActiveEffect(effect));
    return true;
  }, [dispatch]);

  const clearActiveEffect = useCallback((jokerId: number) => {
    dispatch(removeActiveEffect(jokerId));
  }, [dispatch]);

  const reorderJokers = useCallback((newOrder: any[]) => {
    dispatch(setJokers(newOrder));
  }, [dispatch]);

  const registerOnFirstJoker = useCallback((callback: () => void) => {
    onFirstJokerCallbacks.push(callback);
  }, [onFirstJokerCallbacks]);

  const unregisterOnFirstJoker = useCallback((callback: () => void) => {
    const index = onFirstJokerCallbacks.indexOf(callback);
    if (index > -1) {
      onFirstJokerCallbacks.splice(index, 1);
    }
  }, [onFirstJokerCallbacks]);

  const lockJokerAction = useCallback((jokerId: string) => {
    dispatch(lockJoker(jokerId));
  }, [dispatch]);

  const unlockJokerAction = useCallback((jokerId: string) => {
    dispatch(unlockJoker(jokerId));
  }, [dispatch]);

  const resetJokersAction = useCallback(() => {
    dispatch(resetJokers());
  }, [dispatch]);

  const markJokerUsedTodayAction = useCallback((jokerId: string) => {
    console.log('🔧 useJokers: markJokerUsedToday called with ID:', jokerId, 'Type:', typeof jokerId);
    console.log('🔧 useJokers: Current usedTodayJokerIds before dispatch:', usedTodayJokerIds);
    dispatch(markJokerUsedToday(jokerId));
    console.log('🔧 useJokers: markJokerUsedToday dispatch completed');
  }, [dispatch, usedTodayJokerIds]);

  const resetDailyJokerUsageAction = useCallback((day: number) => {
    dispatch(resetDailyJokerUsage(day));
  }, [dispatch]);

  return {
    jokers: jokerState.jokers,
    jokersOwned: jokerState.jokersOwned,
    allJokers: jokerState.allJokers,
    lockedJokerIds: jokerState.lockedJokerIds,
    usedTodayJokerIds,
    activeEffects,
    isLoaded: true, // Always loaded in Redux
    addJoker: addJokerAction,
    removeJoker: removeJokerAction,
    hasJoker,
    getJokersBySubject,
    activateJoker,
    clearActiveEffect,
    reorderJokers,
    registerOnFirstJoker,
    unregisterOnFirstJoker,
    lockJoker: lockJokerAction,
    unlockJoker: unlockJokerAction,
    resetJokers: resetJokersAction,
    markJokerUsedToday: markJokerUsedTodayAction,
    resetDailyJokerUsage: resetDailyJokerUsageAction,
  };
};