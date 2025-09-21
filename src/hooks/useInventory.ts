import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addCandy,
  removeCandy,
  clearInventory,
  setMaxInventory,
  resetInventory,
  selectInventoryCount,
  selectIsInventoryFull,
} from '../store/slices/inventorySlice';
import { JokerService } from '../utils/jokerService';

export const useInventory = () => {
  const dispatch = useAppDispatch();
  const inventoryState = useAppSelector(state => state.inventory);
  const inventoryCount = useAppSelector(selectInventoryCount);
  const isInventoryFull = useAppSelector(selectIsInventoryFull);
  const jokers = useAppSelector(state => state.joker.jokers);
  const activeEffects = useAppSelector(state => state.joker.activeEffects);
  const gameState = useAppSelector(state => state.game);
  const jokerService = JokerService.getInstance();

  // Legacy method names for backward compatibility
  const addToInventory = useCallback((name: string, quantity: number, price: number): boolean => {
    dispatch(addCandy({ id: name, name, price, quantity }));
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
    inventoryState.inventory.forEach(item => {
      const confiscateAmount = Math.floor((item.quantity || 1) / 2);
      totalConfiscated += confiscateAmount;
      if (confiscateAmount > 0) {
        dispatch(removeCandy({ id: item.id, quantity: confiscateAmount }));
      }
    });
    return totalConfiscated;
  }, [dispatch, inventoryState.inventory]);

  const getTotalInventoryCount = useCallback((): number => {
    return inventoryCount;
  }, [inventoryCount]);

  const getInventoryLimit = useCallback((): number => {
    const baseLimit = inventoryState.maxInventory;
    const periodCount = gameState.periodCount;

    // Apply joker effects to inventory limit
    const effectiveLimit = jokerService.applyJokerEffects(
      baseLimit,
      'inventory_limit',
      jokers,
      periodCount,
      baseLimit,
      undefined,
      activeEffects
    );

    console.log(`📦 Inventory limit calculation - Base: ${baseLimit}, With jokers: ${effectiveLimit}`);

    return effectiveLimit;
  }, [inventoryState.maxInventory, gameState.periodCount, jokers, activeEffects, jokerService]);

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
    inventory: inventoryState.inventory,
    maxInventory: inventoryState.maxInventory,
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