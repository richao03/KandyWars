import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BestSale {
  candyName: string;
  quantity: number;
  profit: number;
  period: number;
}

interface CandySoldCount {
  [candyName: string]: number;
}

interface DayStats {
  day: number;
  revenue: number;
  candiesSold: number;
  expenses: number;
  profit: number;
  allowance: number;
}

interface PlaythroughStats {
  totalProfit: number;
  totalSpentOnCandy: number;
  totalAllowance: number;
  totalCandiesSold: number;
}

interface DailyStatsState {
  dailyStats: DayStats[];
  currentDayStats: DayStats | null;
  bestSale: BestSale | null;
  candySoldCounts: CandySoldCount;
  playthroughStats: PlaythroughStats;
}

const initialState: DailyStatsState = {
  dailyStats: [],
  currentDayStats: {
    day: 1,
    revenue: 0,
    candiesSold: 0,
    expenses: 0,
    profit: 0,
    allowance: 0,
  },
  bestSale: null,
  candySoldCounts: {},
  playthroughStats: {
    totalProfit: 0,
    totalSpentOnCandy: 0,
    totalAllowance: 0,
    totalCandiesSold: 0,
  },
};

const dailyStatsSlice = createSlice({
  name: 'dailyStats',
  initialState,
  reducers: {
    setDailyStats: (state, action: PayloadAction<DayStats[]>) => {
      state.dailyStats = action.payload;
    },
    addDayStats: (state, action: PayloadAction<DayStats>) => {
      const existingIndex = state.dailyStats.findIndex(s => s.day === action.payload.day);
      if (existingIndex >= 0) {
        state.dailyStats[existingIndex] = action.payload;
      } else {
        state.dailyStats.push(action.payload);
      }
    },
    setCurrentDayStats: (state, action: PayloadAction<DayStats | null>) => {
      state.currentDayStats = action.payload;
    },
    updateCurrentDayStats: (state, action: PayloadAction<Partial<DayStats>>) => {
      if (state.currentDayStats) {
        state.currentDayStats = { ...state.currentDayStats, ...action.payload };
      } else {
        state.currentDayStats = {
          day: 1,
          revenue: 0,
          candiesSold: 0,
          expenses: 0,
          profit: 0,
          allowance: 0,
          ...action.payload,
        };
      }
    },
    clearDailyStats: (state) => {
      state.dailyStats = [];
      state.currentDayStats = null;
    },
    recordSale: (state, action: PayloadAction<{ candyName: string; quantity: number; profit: number; period: number }>) => {
      const { candyName, quantity, profit, period } = action.payload;

      // Track best sale
      if (!state.bestSale || profit > state.bestSale.profit) {
        state.bestSale = { candyName, quantity, profit, period };
      }

      // Track candy sold counts
      state.candySoldCounts[candyName] = (state.candySoldCounts[candyName] || 0) + quantity;

      // Update playthrough stats
      state.playthroughStats.totalProfit += profit;
      state.playthroughStats.totalCandiesSold += quantity;
    },
    recordPurchase: (state, action: PayloadAction<{ amount: number }>) => {
      state.playthroughStats.totalSpentOnCandy += action.payload.amount;
    },
    recordAllowance: (state, action: PayloadAction<{ amount: number }>) => {
      state.playthroughStats.totalAllowance += action.payload.amount;
    },
    resetPlaythroughStats: (state) => {
      state.playthroughStats = {
        totalProfit: 0,
        totalSpentOnCandy: 0,
        totalAllowance: 0,
        totalCandiesSold: 0,
      };
    },
    resetDailyStats: () => initialState,
  },
});

export const {
  setDailyStats,
  addDayStats,
  setCurrentDayStats,
  updateCurrentDayStats,
  clearDailyStats,
  recordSale,
  recordPurchase,
  recordAllowance,
  resetPlaythroughStats,
  resetDailyStats,
} = dailyStatsSlice.actions;

export default dailyStatsSlice.reducer;

// Selectors
export const selectStatsByDay = (state: { dailyStats: DailyStatsState }, day: number) =>
  state.dailyStats.dailyStats.find(s => s.day === day);

export const selectTotalProfit = (state: { dailyStats: DailyStatsState }) =>
  state.dailyStats.dailyStats.reduce((sum, day) => sum + day.profit, 0);