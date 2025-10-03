import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
      } else {
        state.inventory.push(action.payload);
      }
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
      console.log(`📦 Max inventory increased by ${action.payload} to ${state.maxInventory}`);
    },
    resetInventory: () => initialState,
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
} = inventorySlice.actions;

export default inventorySlice.reducer;

// Selectors
export const selectInventoryCount = (state: { inventory: InventoryState }) =>
  state.inventory.inventory.reduce((sum, candy) => sum + (candy.quantity || 1), 0);

export const selectIsInventoryFull = (state: { inventory: InventoryState }) =>
  selectInventoryCount(state) >= state.inventory.maxInventory;