import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';

interface CandyType {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  purchasedAt?: number; // Period when candy was purchased
}

interface InventoryState {
  inventory: CandyType[];
  maxInventory: number;
}

const initialState: InventoryState = {
  inventory: [],
  maxInventory: 30,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setInventory: (state, action: PayloadAction<CandyType[]>) => {
      state.inventory = action.payload;
    },
    addCandy: (state, action: PayloadAction<CandyType>) => {
      const existing = state.inventory.find(c => c.id === action.payload.id);
      if (existing) {
        existing.quantity = (existing.quantity || 0) + (action.payload.quantity || 1);
        // Reset melt timer on new purchase
        if (action.payload.purchasedAt !== undefined) {
          existing.purchasedAt = action.payload.purchasedAt;
        }
      } else {
        state.inventory.push(action.payload);
      }
    },
    meltExpiredCandy: (state, action: PayloadAction<{ currentPeriod: number; meltWindow?: number }>) => {
      const { currentPeriod, meltWindow = 5 } = action.payload;
      state.inventory = state.inventory.filter(candy => {
        if (candy.purchasedAt === undefined) return true;
        return (currentPeriod - candy.purchasedAt) < meltWindow;
      });
    },
    removeCandy: (state, action: PayloadAction<{ id: string; quantity?: number }>) => {
      const index = state.inventory.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        const candy = state.inventory[index];
        const removeQty = action.payload.quantity || 1;
        if (candy.quantity && candy.quantity > removeQty) {
          candy.quantity -= removeQty;
        } else {
          state.inventory.splice(index, 1);
        }
      }
    },
    clearInventory: (state) => {
      state.inventory = [];
    },
    setMaxInventory: (state, action: PayloadAction<number>) => {
      state.maxInventory = action.payload;
    },
    incrementMaxInventory: (state, action: PayloadAction<number>) => {
      state.maxInventory += action.payload;
      if (__DEV__) console.log(`📦 Max inventory increased by ${action.payload} to ${state.maxInventory}`);
    },
    resetInventory: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, () => initialState);
  },
});

export const {
  setInventory,
  addCandy,
  removeCandy,
  clearInventory,
  setMaxInventory,
  incrementMaxInventory,
  resetInventory,
  meltExpiredCandy,
} = inventorySlice.actions;

export default inventorySlice.reducer;

// Selectors
export const selectInventoryCount = createSelector(
  [(state: { inventory: InventoryState }) => state.inventory.inventory],
  (inventory) => inventory.reduce((sum, candy) => sum + (candy.quantity || 1), 0)
);

export const selectIsInventoryFull = createSelector(
  [
    selectInventoryCount,
    (state: { inventory: InventoryState }) => state.inventory.maxInventory,
  ],
  (count, maxInventory) => count >= maxInventory
);