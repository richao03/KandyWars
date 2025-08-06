// context/InventoryContext.tsx
import React, { createContext, useContext, useState } from 'react';

export type InventoryItem = {
  name: string;
  quantity: number;
  averagePrice: number;
};

export type Inventory = Record<string, InventoryItem>;

type InventoryContextType = {
  inventory: Inventory;
  addToInventory: (name: string, price: number) => void;
  removeFromInventory: (name: string, quantity: number) => boolean;
  getTotalInventoryCount: () => number;
  getInventoryLimit: () => number
  setNewInventoryLimit: (newLimit: number) => void
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<Inventory>({});
  const [inventoryLimit, setInventoryLimit] = useState(30)
  const addToInventory = (name: string, price: number) => {
    setInventory(prev => {
      const existing = prev[name];
      if (existing) {
        const newQuantity = existing.quantity + 1;
        const newAvgPrice =
          (existing.averagePrice * existing.quantity + price) / newQuantity;
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
            quantity: 1,
            averagePrice: price,
          },
        };
      }
    });
  };

  const removeFromInventory = (name: string, quantity: number): boolean => {
    const existing = inventory[name];
    if (!existing || existing.quantity < quantity) return false;

    setInventory(prev => {
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
    return inventoryLimit
  }
  const setNewInventoryLimit = (newLimit: number) => {
    setInventoryLimit(newLimit)
  }
  const getTotalInventoryCount = () => {
    return Object.values(inventory).reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <InventoryContext.Provider
      value={{ inventory, addToInventory, removeFromInventory, getTotalInventoryCount, getInventoryLimit, setNewInventoryLimit }}
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
