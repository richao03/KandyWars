import { useCallback, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectComputedInventoryLimit, migrateJokerState } from '../store/slices/jokerSlice';
import {
  addCandy,
  removeCandy,
  clearInventory,
  setMaxInventory,
  resetInventory,
  selectInventoryCount,
  selectIsInventoryFull,
} from '../store/slices/inventorySlice';
import { selectSelectedHallPassEffects } from '../store/slices/hallPassSlice';
import { HallPassUtils } from '../utils/hallPassUtils';

export const useInventory = () => {
  const dispatch = useAppDispatch();
  // Subscribe to specific values instead of entire state slice
  const inventory = useAppSelector(state => state.inventory.inventory);
  const maxInventory = useAppSelector(state => state.inventory.maxInventory);
  const inventoryCount = useAppSelector(selectInventoryCount);
  const isInventoryFull = useAppSelector(selectIsInventoryFull);

  // Legacy method names for backward compatibility
  const addToInventory = useCallback((name: string, quantity: number, price: number, purchasedAt?: number): boolean => {
    dispatch(addCandy({ id: name, name, price, quantity, purchasedAt }));
    return true;
  }, [dispatch]);

  const removeFromInventory = useCallback((name: string, quantity: number): boolean => {
    dispatch(removeCandy({ id: name, quantity }));
    return true;
  }, [dispatch]);

  const convertCandyType = useCallback((
    fromType: string,
    fromQuantity: number,
    toType: string,
    toPrice: number
  ): boolean => {
    dispatch(removeCandy({ id: fromType, quantity: fromQuantity }));
    dispatch(addCandy({ id: toType, name: toType, price: toPrice, quantity: fromQuantity }));
    return true;
  }, [dispatch]);

  const removeAllFromInventory = useCallback(() => {
    dispatch(clearInventory());
  }, [dispatch]);

  const confiscateHalfInventory = useCallback((): number => {
    let totalConfiscated = 0;
    inventory.forEach(item => {
      const confiscateAmount = Math.floor((item.quantity || 1) / 2);
      totalConfiscated += confiscateAmount;
      if (confiscateAmount > 0) {
        dispatch(removeCandy({ id: item.id, quantity: confiscateAmount }));
      }
    });
    return totalConfiscated;
  }, [dispatch, inventory]);

  const getTotalInventoryCount = useCallback((): number => {
    return inventoryCount;
  }, [inventoryCount]);

  // Use pre-computed inventory limit from Redux instead of calculating every time
  const computedInventoryLimit = useAppSelector(selectComputedInventoryLimit);
  const jokerState = useAppSelector(state => state.joker);
  const hallPassEffects = useAppSelector(selectSelectedHallPassEffects);

  // Ensure joker state is properly migrated on first use
  useEffect(() => {
    if (!jokerState.computedEffects) {
      console.log('🔧 Initializing joker computedEffects in useInventory');
      dispatch(migrateJokerState());
    }
  }, [dispatch, jokerState.computedEffects]);

  const getInventoryLimit = useCallback((): number => {
    // Apply Hall Pass inventory bonus
    const finalLimit = HallPassUtils.applyInventoryBonus(computedInventoryLimit, hallPassEffects);
    return finalLimit;
  }, [computedInventoryLimit, hallPassEffects]);

  // New Redux-style methods
  const addCandyAction = useCallback((candy: any) => {
    dispatch(addCandy(candy));
  }, [dispatch]);

  const removeCandyAction = useCallback((candyId: string, quantity?: number) => {
    dispatch(removeCandy({ id: candyId, quantity }));
  }, [dispatch]);

  const clearInventoryAction = useCallback(() => {
    dispatch(clearInventory());
  }, [dispatch]);

  const setMaxInventoryAction = useCallback((max: number) => {
    dispatch(setMaxInventory(max));
  }, [dispatch]);

  const resetInventoryAction = useCallback(() => {
    dispatch(resetInventory());
  }, [dispatch]);

  return {
    // Original data
    inventory,
    maxInventory,
    inventoryCount,
    isInventoryFull,

    // Legacy methods (for backward compatibility)
    addToInventory,
    removeFromInventory,
    convertCandyType,
    removeAllFromInventory,
    confiscateHalfInventory,
    getTotalInventoryCount,
    getInventoryLimit,

    // New Redux-style methods
    addCandy: addCandyAction,
    removeCandy: removeCandyAction,
    clearInventory: clearInventoryAction,
    setMaxInventory: setMaxInventoryAction,
    resetInventory: resetInventoryAction,
  };
};