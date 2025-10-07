import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';

interface ModifiedPrice {
  candyType: string;
  period: number;
  originalPrice: number;
  modifiedPrice: number;
}

interface PriceDoublingState {
  previousPeriod: number;
  modifiedPrices: ModifiedPrice[];
}

const initialState: PriceDoublingState = {
  previousPeriod: -1,
  modifiedPrices: [],
};

const priceDoublingSlice = createSlice({
  name: 'priceDoubling',
  initialState,
  reducers: {
    setPreviousPeriod: (state, action: PayloadAction<number>) => {
      state.previousPeriod = action.payload;
    },
    addModifiedPrice: (state, action: PayloadAction<ModifiedPrice>) => {
      const existing = state.modifiedPrices.find(
        p => p.candyType === action.payload.candyType && p.period === action.payload.period
      );
      if (!existing) {
        state.modifiedPrices.push(action.payload);

        // Keep only last 20 entries to prevent unbounded growth
        // This covers roughly 2-3 periods worth of price modifications
        if (state.modifiedPrices.length > 20) {
          state.modifiedPrices = state.modifiedPrices.slice(-20);
        }
      }
    },
    removeModifiedPrice: (state, action: PayloadAction<{ candyType: string; period: number }>) => {
      state.modifiedPrices = state.modifiedPrices.filter(
        p => !(p.candyType === action.payload.candyType && p.period === action.payload.period)
      );
    },
    clearModifiedPricesForPeriod: (state, action: PayloadAction<number>) => {
      state.modifiedPrices = state.modifiedPrices.filter(p => p.period !== action.payload);
    },
    clearAllModifiedPrices: (state) => {
      state.modifiedPrices = [];
    },
    resetPriceDoubling: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, () => initialState);
  },
});

export const {
  setPreviousPeriod,
  addModifiedPrice,
  removeModifiedPrice,
  clearModifiedPricesForPeriod,
  clearAllModifiedPrices,
  resetPriceDoubling,
} = priceDoublingSlice.actions;

// Selectors
export const selectPreviousPeriod = (state: { priceDoubling: PriceDoublingState }) =>
  state.priceDoubling.previousPeriod;

export const selectModifiedPrices = (state: { priceDoubling: PriceDoublingState }) =>
  state.priceDoubling.modifiedPrices;

export const selectModifiedPricesForPeriod = (period: number) =>
  (state: { priceDoubling: PriceDoublingState }) =>
    state.priceDoubling.modifiedPrices.filter(p => p.period === period);

export default priceDoublingSlice.reducer;