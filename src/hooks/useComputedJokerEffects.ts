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

  // Recompute effects when any relevant state changes (excluding computedEffects to prevent loops)
  useEffect(() => {
    try {
      // Only recompute if we have the computed effects structure in place
      if (computedEffects) {
        console.log('🔄 Recomputing joker effects due to state change');
        dispatch(recomputeJokerEffects({
          baseInventoryLimit,
          periodCount
        }));
      }
    } catch (error) {
      console.error('❌ Error in joker recomputation:', error);
    }
  }, [dispatch, jokers, activeEffects, periodCount, baseInventoryLimit]); // Removed computedEffects from deps

  // Return selectors for easy access to computed effects
  return {
    // These will automatically update when effects are recomputed
    computedEffects: useAppSelector(selectComputedEffects),
    inventoryLimit: useAppSelector(selectComputedInventoryLimit),
    hintChance: useAppSelector(selectComputedHintChance),
    studyTimeMultiplier: useAppSelector(selectComputedStudyTimeMultiplier),
  };
};