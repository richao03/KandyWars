// context/InventoryContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadInventory, saveInventory } from '../utils/persistence';
import { useJokers } from './JokerContext';
import { useGame } from './GameContext';
import { JokerService } from '../utils/jokerService';

export type InventoryItem = {
  name: string;
  quantity: number;
  averagePrice: number;
};

export type Inventory = Record<string, InventoryItem>;

type InventoryContextType = {
  inventory: Inventory;
  addToInventory: (name: string, quantity: number, price: number) => boolean;
  removeFromInventory: (name: string, quantity: number) => boolean;
  convertCandyType: (fromType: string, fromQuantity: number, toType: string, toPrice: number) => boolean;
  getTotalInventoryCount: () => number;
  getInventoryLimit: () => number;
  removeAllFromInventory: () => void;
};

const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [inventory, setInventory] = useState<Inventory>({});
  const [inventoryLimit, setInventoryLimit] = useState(30);
  const [isLoaded, setIsLoaded] = useState(false);
  const jokerService = JokerService.getInstance();
  const { jokers } = useJokers();
  const { periodCount } = useGame();

  // Load inventory on mount
  useEffect(() => {
    const loadInventoryData = async () => {
      const defaultInventory = {};
      const savedInventory = await loadInventory(defaultInventory);
      setInventory(savedInventory);
      setIsLoaded(true);
      console.log('Inventory loaded:', savedInventory);
    };

    loadInventoryData();
  }, []);

  // Save inventory whenever it changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load
    saveInventory(inventory);
  }, [inventory, isLoaded]);

  // Handle candy generation from "Something from Nothing" joker
  useEffect(() => {
    if (!isLoaded || periodCount === 0) return; // Don't generate on initial load or period 0
    
    const somethingFromNothing = jokers.find(j => j.name.replace(' (Copy)', '') === 'Something from Nothing');
    if (somethingFromNothing) {
      const CANDY_TYPES = ['Bubble Gum', 'M&Ms', 'Skittles', 'Snickers', 'Sour Patch Kids', 'Warheads'];
      
      // Add one of each candy type
      CANDY_TYPES.forEach(candyType => {
        addToInventory(candyType, 1, 0); // Add 1 candy at $0 cost
      });
      
      console.log('Something from Nothing: Generated 1 of each candy type');
    }
  }, [periodCount, jokers, isLoaded]);
  const addToInventory = (
    name: string,
    quantity: number,
    price: number
  ): boolean => {
    // Calculate current total from current inventory state
    const currentTotal = Object.values(inventory).reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const actualLimit = getInventoryLimit();
    
    // Check if adding this quantity would exceed inventory limit
    if (currentTotal + quantity > actualLimit) {
      return false; // Transaction rejected due to inventory limit
    }

    setInventory((prev) => {
      const existing = prev[name];
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        const totalOldValue = existing.averagePrice * existing.quantity;
        const totalNewValue = price * quantity;
        const newAvgPrice = (totalOldValue + totalNewValue) / newQuantity;
        return {
          ...prev,
          [name]: {
            ...existing,
            quantity: newQuantity,
            averagePrice: newAvgPrice,
          },
        };
      } else {
        return {
          ...prev,
          [name]: {
            name,
            quantity: quantity,
            averagePrice: price,
          },
        };
      }
    });
    return true; // Transaction successful
  };
  const removeAllFromInventory = () => {
    setInventory({});
  };
  const removeFromInventory = (name: string, quantity: number): boolean => {
    const existing = inventory[name];
    if (!existing || existing.quantity < quantity) return false;

    setInventory((prev) => {
      const updatedQuantity = existing.quantity - quantity;
      if (updatedQuantity === 0) {
        const { [name]: _, ...rest } = prev;
        return rest;
      } else {
        return {
          ...prev,
          [name]: {
            ...existing,
            quantity: updatedQuantity,
          },
        };
      }
    });
    return true;
  };

  const convertCandyType = (
    fromType: string,
    fromQuantity: number,
    toType: string,
    toPrice: number
  ): boolean => {
    const fromItem = inventory[fromType];
    if (!fromItem || fromItem.quantity < fromQuantity) return false;

    // This is a 1:1 conversion, so total inventory count stays the same
    setInventory((prev) => {
      const newInventory = { ...prev };
      const existingTarget = prev[toType];
      
      // Remove from source
      if (fromItem.quantity === fromQuantity) {
        delete newInventory[fromType];
      } else {
        newInventory[fromType] = {
          ...fromItem,
          quantity: fromItem.quantity - fromQuantity,
        };
      }
      
      // Add to target
      if (existingTarget) {
        const newQuantity = existingTarget.quantity + fromQuantity;
        const totalOldValue = existingTarget.averagePrice * existingTarget.quantity;
        const totalNewValue = toPrice * fromQuantity;
        const newAvgPrice = (totalOldValue + totalNewValue) / newQuantity;
        newInventory[toType] = {
          ...existingTarget,
          quantity: newQuantity,
          averagePrice: newAvgPrice,
        };
      } else {
        newInventory[toType] = {
          name: toType,
          quantity: fromQuantity,
          averagePrice: toPrice,
        };
      }
      
      return newInventory;
    });
    return true;
  };

  const getInventoryLimit = () => {
    const currentLimit = jokerService.applyJokerEffects(inventoryLimit, 'inventory_limit', jokers, periodCount);
    return currentLimit;
  };
  const getTotalInventoryCount = () => {
    return Object.values(inventory).reduce(
      (sum, item) => sum + item.quantity,
      0
    );
  };

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        addToInventory,
        removeFromInventory,
        convertCandyType,
        removeAllFromInventory,
        getTotalInventoryCount,
        getInventoryLimit,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
};
