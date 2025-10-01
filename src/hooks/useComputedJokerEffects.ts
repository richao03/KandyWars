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

// Global state to prevent multiple simultaneous recomputations across all hook instances
let globalRecomputeInProgress = false;
let globalRecomputeTimer: NodeJS.Timeout | null = null;
let lastRecomputeKey = '';

/**
 * Hook that automatically recomputes joker effects when relevant state changes.
 * This centralizes all joker effect calculations in Redux to avoid repeated computations.
 */
export const useComputedJokerEffects = () => {
  const dispatch = useAppDispatch();
  const migrationDone = useRef(false);

  // Watch for changes that should trigger effect recomputation
  const jokers = useAppSelector(state => state.joker.jokers);
  const activeEffects = useAppSelector(state => state.joker.activeEffects);
  const computedEffects = useAppSelector(state => state.joker.computedEffects);
  const periodCount = useAppSelector(state => state.game.periodCount);
  const baseInventoryLimit = useAppSelector(state => state.inventory.maxInventory);

  // Migrate state if needed on first render (run only once)
  useEffect(() => {
    try {
      if (!computedEffects && !migrationDone.current) {
        console.log('🔧 Migrating joker state to include computedEffects');
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

    // Create a unique key for this state combination
    const stateKey = `${jokers.length}-${activeEffects.length}-${periodCount}-${baseInventoryLimit}`;

    // Skip if we already processed this exact state
    if (stateKey === lastRecomputeKey) {
      return;
    }

    // Skip if a recompute is already in progress
    if (globalRecomputeInProgress) {
      return;
    }

    // Clear any pending timer and schedule a new recompute
    if (globalRecomputeTimer) {
      clearTimeout(globalRecomputeTimer);
    }

    // Debounce: wait 50ms for state to settle before recomputing
    globalRecomputeTimer = setTimeout(() => {
      try {
        // Double-check we're not already computing
        if (globalRecomputeInProgress) return;

        globalRecomputeInProgress = true;
        lastRecomputeKey = stateKey;

        console.log('🔄 Recomputing joker effects due to state change');
        dispatch(recomputeJokerEffects({
          baseInventoryLimit,
          periodCount
        }));

        // Reset after a short delay
        setTimeout(() => {
          globalRecomputeInProgress = false;
          globalRecomputeTimer = null;
        }, 50);
      } catch (error) {
        console.error('❌ Error in joker recomputation:', error);
        globalRecomputeInProgress = false;
        globalRecomputeTimer = null;
      }
    }, 50);

    // Cleanup function
    return () => {
      if (globalRecomputeTimer) {
        clearTimeout(globalRecomputeTimer);
        globalRecomputeTimer = null;
      }
    };
  }, [dispatch, jokers.length, activeEffects.length, periodCount, baseInventoryLimit, computedEffects]);

  // Return selectors for easy access to computed effects
  return {
    // These will automatically update when effects are recomputed
    computedEffects: useAppSelector(selectComputedEffects),
    inventoryLimit: useAppSelector(selectComputedInventoryLimit),
    hintChance: useAppSelector(selectComputedHintChance),
    studyTimeMultiplier: useAppSelector(selectComputedStudyTimeMultiplier),
  };
};