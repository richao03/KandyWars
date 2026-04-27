import { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addJoker,
  removeJoker,
  sellJoker,
  swapJoker,
  upgradeJoker,
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
  selectJokers,
  selectJokersOwned,
  selectAllJokers,
  selectLockedJokerIds,
  selectJokerActiveEffects,
  selectPersistentJokerCount,
  recomputeJokerEffects,
  MAX_PERSISTENT_SLOTS,
  isJokerPersistent,
} from '../store/slices/jokerSlice';
import { addBalance } from '../store/slices/walletSlice';
import { trackJokerObtained } from '../store/slices/localAnalyticsSlice';
import { JOKER_IDS } from '../constants/jokerIds';
import { selectDay } from '../store/slices/gameSlice';
import {
  setStat,
  selectJokerStats,
  type JokerStats,
} from '../store/slices/jokerStatsSlice';
import { incrementMaxInventory } from '../store/slices/inventorySlice';

// Variable jokers → corresponding counter field in jokerStatsSlice. When a
// variable joker is sold, its counter is reset to 0 so re-buying starts fresh
// (per "lose all effects when sold" semantics). Trade Routes additionally
// reverts its accumulated inventoryLimit bonus — see sellJokerAction.
const VARIABLE_JOKER_TO_STAT: Record<number, keyof JokerStats> = {
  [JOKER_IDS.TRADE_ROUTES]: 'tradeRoutesPeriods',
  [JOKER_IDS.COMPOUND_INTEREST]: 'compoundInterestDays',
  [JOKER_IDS.REPUTATION]: 'reputationTypesSold',
  [JOKER_IDS.STREET_SMARTS]: 'streetSmartsEventsSurvived',
  [JOKER_IDS.CLEARANCE_SALE]: 'clearanceSaleLosses',
  [JOKER_IDS.HOARDER]: 'hoarderMaxHits',
  [JOKER_IDS.PENNY_WISE]: 'pennyWiseStashes',
  [JOKER_IDS.SURVIVOR]: 'survivorCandiesMelted',
};

export interface Joker {
  id: number | string;
  name: string;
  description?: string;
  theme?: string;
  type?: 'one-time' | 'persistent';
  effect?: string;
  effects?: any[];
  level?: number;
  [key: string]: any;
}

interface ActiveJokerEffect {
  jokerId: number;
  candyType?: string;
  period?: number;
}

export const useJokers = () => {
  const dispatch = useAppDispatch();
  // Subscribe to individual fields instead of entire joker slice to reduce re-renders
  const jokers = useAppSelector(selectJokers);
  const jokersOwned = useAppSelector(selectJokersOwned);
  const allJokers = useAppSelector(selectAllJokers);
  const lockedJokerIds = useAppSelector(selectLockedJokerIds);
  const activeEffects = useAppSelector(selectJokerActiveEffects);
  const computedInventoryLimit = useAppSelector(selectComputedInventoryLimit);
  const hallPassModifiers = useAppSelector(state => state.hallPassModifiers);
  const selectedPassIds = useAppSelector(state => state.hallPass.selectedPassIds ?? []);
  const usedTodayJokerIds = useAppSelector(selectUsedTodayJokerIds);
  const jokerStats = useAppSelector(selectJokerStats);
  const persistentJokerCount = useAppSelector(selectPersistentJokerCount);
  const periodCount = useAppSelector(state => state.game.periodCount);
  const day = useAppSelector(selectDay);
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
        periodCount,
        day
      }));

      if (__DEV__) console.log(`🔧 Vacuum Sealer: Current=${currentTotal}, Target=${targetTotal}, Setting bonus=${bonus} (base ${baseInventory} + bonus ${bonus} + hallPass ${hallPassModifiers.inventoryBonusSlots} = ${targetTotal})`);
    }

    // Junior Genius: new jokers start at level 2 instead of 1
    const jokerToDispatch = selectedPassIds.includes('junior_genius') && (joker.level === 1 || !joker.level)
      ? { ...joker, level: 2 }
      : joker;

    // Add the joker to the list
    dispatch(addJoker(jokerToDispatch));

    // Track joker obtained locally (will be synced to Firebase at game end)
    if (source === 'minigame' && joker.name) {
      if (__DEV__) console.log('📊 Local: Tracking joker obtained -', joker.name);
      dispatch(trackJokerObtained(joker.name));
    }
  }, [dispatch, computedInventoryLimit, hallPassModifiers.inventoryBonusSlots, periodCount, selectedPassIds]);

  const removeJokerAction = useCallback((jokerId: string | number) => {
    dispatch(removeJoker(typeof jokerId === 'string' ? jokerId : jokerId.toString()));
  }, [dispatch]);

  // Sell a joker: remove from active set and grant cash based on level
  const sellJokerAction = useCallback((jokerId: string | number) => {
    const id = typeof jokerId === 'string' ? jokerId : jokerId.toString();
    const joker = jokers.find(j => j.id.toString() === id);
    if (!joker) return;

    const level = joker.level ?? 1;
    const sellValue = level <= 1 ? 500 : level === 2 ? 5000 : 15000;

    // "Lose all effects" — for variable jokers, reset their counter so the
    // accrued bonus is forfeited. For Trade Routes specifically, also revert
    // the accumulated inventoryLimit bonus (since that one is dispatched into
    // inventorySlice.maxInventory each period rather than being a derived
    // computedEffect).
    const numericId = Number(joker.id);
    const statKey = VARIABLE_JOKER_TO_STAT[numericId];
    if (statKey) {
      if (numericId === JOKER_IDS.TRADE_ROUTES) {
        const periods = jokerStats.tradeRoutesPeriods;
        if (periods > 0) {
          const slotsPerPeriod = level === 3 ? 4 : level === 2 ? 3 : 2;
          dispatch(incrementMaxInventory(-(slotsPerPeriod * periods)));
        }
      }
      dispatch(setStat({ stat: statKey, value: 0 }));
    }

    dispatch(sellJoker(id));
    dispatch(addBalance(sellValue));

    // Recompute effects after selling
    dispatch(recomputeJokerEffects({
      baseInventoryLimit: 30,
      periodCount,
      day,
    }));

    if (__DEV__) console.log(`💰 Sold joker ${joker.name} (Lv${level}) for $${sellValue}`);
  }, [dispatch, jokers, periodCount, day, jokerStats]);

  // Joker slot limit was removed — players can hold any number of persistent
  // jokers. `canAddPersistentJoker` always returns true; `maxPersistentSlots`
  // is exposed for UI compatibility but is effectively unbounded.
  const effectiveMaxSlots = MAX_PERSISTENT_SLOTS;

  const canAddPersistentJoker = useCallback((): boolean => {
    return true;
  }, []);

  // Check if a specific joker is persistent
  const isJokerPersistentCheck = useCallback((joker: any): boolean => {
    return isJokerPersistent(joker);
  }, []);

  const hasJoker = useCallback((jokerId: number): boolean => {
    return jokers.some(j => j.id === jokerId.toString());
  }, [jokers]);

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
    if (__DEV__) {
      console.log('🔧 useJokers: markJokerUsedToday called with ID:', jokerId, 'Type:', typeof jokerId);
      console.log('🔧 useJokers: Current usedTodayJokerIds before dispatch:', usedTodayJokerIds);
    }
    dispatch(markJokerUsedToday(jokerId));
    if (__DEV__) console.log('🔧 useJokers: markJokerUsedToday dispatch completed');
  }, [dispatch, usedTodayJokerIds]);

  const resetDailyJokerUsageAction = useCallback((day: number) => {
    dispatch(resetDailyJokerUsage(day));
  }, [dispatch]);

  const upgradeJokerAction = useCallback((jokerId: string) => {
    dispatch(upgradeJoker(jokerId));
    dispatch(recomputeJokerEffects({
      baseInventoryLimit: 30,
      periodCount,
      day,
    }));
  }, [dispatch, periodCount, day]);

  const getOwnedJokerLevel = useCallback((jokerId: string | number): number => {
    const owned = jokersOwned.find(j => j.id.toString() === jokerId.toString());
    return owned ? (owned as any).level ?? 1 : 0;
  }, [jokersOwned]);

  return {
    jokers,
    jokersOwned,
    allJokers,
    lockedJokerIds,
    usedTodayJokerIds,
    activeEffects,
    persistentJokerCount,
    maxPersistentSlots: effectiveMaxSlots,
    isLoaded: true, // Always loaded in Redux
    addJoker: addJokerAction,
    removeJoker: removeJokerAction,
    sellJoker: sellJokerAction,
    canAddPersistentJoker,
    isJokerPersistent: isJokerPersistentCheck,
    hasJoker,
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
    upgradeJoker: upgradeJokerAction,
    getOwnedJokerLevel,
  };
};