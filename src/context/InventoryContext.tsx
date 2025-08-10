// context/InventoryContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadInventory, saveInventory } from '../utils/persistence';
import { useJokers } from './JokerContext';

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
  getTotalInventoryCount: () => number;
  getInventoryLimit: () => number;
  setNewInventoryLimit: (newLimit: number) => void;
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
  const { jokers } = useJokers();
  console.log(';what is emoty inventory', inventory);

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
  const addToInventory = (
    name: string,
    quantity: number,
    price: number
  ): boolean => {
    console.log('name, :', name);

    console.log('quantity, :', quantity);
    // Calculate current total from current inventory state
    const currentTotal = Object.values(inventory).reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const actualLimit = getInventoryLimit();
    console.log('inventoryLimit :', actualLimit);
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

  const getInventoryLimit = () => {
    // Check for joker effects that modify inventory capacity
    const hasGeometricExpansion = jokers.some(
      (joker) =>
        joker.effect === 'double_inventory_space' && joker.type === 'persistent'
    );

    return hasGeometricExpansion ? inventoryLimit * 2 : inventoryLimit;
  };
  const setNewInventoryLimit = (newLimit: number) => {
    setInventoryLimit(newLimit);
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
        removeAllFromInventory,
        getTotalInventoryCount,
        getInventoryLimit,
        setNewInventoryLimit,
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
