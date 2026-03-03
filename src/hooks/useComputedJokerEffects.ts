import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  recomputeJokerEffects,
  migrateJokerState,
  selectComputedInventoryLimit,
  selectComputedHintChance,
  selectComputedStudyTimeMultiplier,
  selectComputedEffects
} from '../store/slices/jokerSlice';
import { selectDay } from '../store/slices/gameSlice';

/**
 * Hook that automatically recomputes joker effects when relevant state changes.
 * This centralizes all joker effect calculations in Redux to avoid repeated computations.
 */
export const useComputedJokerEffects = () => {
  const dispatch = useAppDispatch();
  const migrationDone = useRef(false);
  // Use refs instead of module-level globals for proper cleanup and hot-reload safety
  const recomputeInProgress = useRef(false);
  const recomputeTimer = useRef<NodeJS.Timeout | null>(null);
  const lastRecomputeKey = useRef('');

  // Watch for changes that should trigger effect recomputation
  const jokers = useAppSelector(state => state.joker.jokers);
  const activeEffects = useAppSelector(state => state.joker.activeEffects);
  const computedEffects = useAppSelector(state => state.joker.computedEffects);
  const periodCount = useAppSelector(state => state.game.periodCount);
  const baseInventoryLimit = useAppSelector(state => state.inventory.maxInventory);
  const day = useAppSelector(selectDay);

  // Migrate state if needed on first render (run only once)
  useEffect(() => {
    try {
      if (!computedEffects && !migrationDone.current) {
        if (__DEV__) console.log('🔧 Migrating joker state to include computedEffects');
        migrationDone.current = true;
        dispatch(migrateJokerState());
      }
    } catch (error) {
      console.error('❌ Error in joker migration:', error);
    }
  }, [dispatch, computedEffects]);

  // Reset migration flag when computedEffects becomes null (e.g., during game reset)
  useEffect(() => {
    if (!computedEffects) {
      migrationDone.current = false;
    }
  }, [computedEffects]);

  // Recompute effects when any relevant state changes
  useEffect(() => {
    if (!computedEffects) return;

    // Create a unique key for this state combination (level hash detects upgrades)
    const levelHash = jokers.reduce((acc: number, j: any) => acc + (j.level ?? 1), 0);
    const stateKey = `${jokers.length}-${levelHash}-${activeEffects.length}-${periodCount}-${baseInventoryLimit}-${day}`;

    // Skip if we already processed this exact state
    if (stateKey === lastRecomputeKey.current) {
      return;
    }

    // Skip if a recompute is already in progress
    if (recomputeInProgress.current) {
      return;
    }

    // Clear any pending timer and schedule a new recompute
    if (recomputeTimer.current) {
      clearTimeout(recomputeTimer.current);
    }

    // Debounce: wait 150ms for state to settle before recomputing
    recomputeTimer.current = setTimeout(() => {
      try {
        // Double-check we're not already computing
        if (recomputeInProgress.current) return;

        recomputeInProgress.current = true;
        lastRecomputeKey.current = stateKey;

        if (__DEV__) {
          console.log('🔄 Recomputing joker effects due to state change');
        }
        dispatch(recomputeJokerEffects({
          baseInventoryLimit,
          periodCount,
          day
        }));

        // Reset after a short delay
        setTimeout(() => {
          recomputeInProgress.current = false;
          recomputeTimer.current = null;
        }, 100);
      } catch (error) {
        console.error('❌ Error in joker recomputation:', error);
        recomputeInProgress.current = false;
        recomputeTimer.current = null;
      }
    }, 150);

    // Cleanup function
    return () => {
      if (recomputeTimer.current) {
        clearTimeout(recomputeTimer.current);
        recomputeTimer.current = null;
      }
    };
  }, [dispatch, jokers, activeEffects.length, periodCount, baseInventoryLimit, computedEffects, day]);

  // Return selectors for easy access to computed effects
  return {
    // These will automatically update when effects are recomputed
    computedEffects: useAppSelector(selectComputedEffects),
    inventoryLimit: useAppSelector(selectComputedInventoryLimit),
    hintChance: useAppSelector(selectComputedHintChance),
    studyTimeMultiplier: useAppSelector(selectComputedStudyTimeMultiplier),
  };
};