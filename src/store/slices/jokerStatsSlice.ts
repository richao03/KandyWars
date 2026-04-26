import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';

export interface JokerStats {
  // Existing scaling joker counters
  compoundInterestDays: number;
  reputationTypesSold: number;
  streetSmartsEventsSurvived: number;
  clearanceSaleLosses: number;
  // Momentum is computed from candySalesSlice, not stored here

  // New scaling joker counters
  hoarderMaxHits: number;       // times inventory hit max capacity
  pennyWiseStashes: number;     // times money was stashed
  survivorCandiesMelted: number; // total candies lost to melting
  tradeRoutesPeriods: number;   // periods elapsed while Trade Routes was owned
}

const initialState: JokerStats = {
  compoundInterestDays: 0,
  reputationTypesSold: 0,
  streetSmartsEventsSurvived: 0,
  clearanceSaleLosses: 0,
  hoarderMaxHits: 0,
  pennyWiseStashes: 0,
  survivorCandiesMelted: 0,
  tradeRoutesPeriods: 0,
};

const jokerStatsSlice = createSlice({
  name: 'jokerStats',
  initialState,
  reducers: {
    incrementStat: (state, action: PayloadAction<{ stat: keyof JokerStats; amount?: number }>) => {
      const { stat, amount = 1 } = action.payload;
      state[stat] += amount;
    },
    setStat: (state, action: PayloadAction<{ stat: keyof JokerStats; value: number }>) => {
      state[action.payload.stat] = action.payload.value;
    },
    resetJokerStats: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, () => initialState);
  },
});

export const { incrementStat, setStat, resetJokerStats } = jokerStatsSlice.actions;

// Selectors
export const selectJokerStats = (state: { jokerStats: JokerStats }) => state.jokerStats;
export const selectJokerStat = (stat: keyof JokerStats) =>
  (state: { jokerStats: JokerStats }) => state.jokerStats[stat];

export default jokerStatsSlice.reducer;
