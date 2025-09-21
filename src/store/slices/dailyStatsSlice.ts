import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DayStats {
  day: number;
  revenue: number;
  candiesSold: number;
  expenses: number;
  profit: number;
}

interface DailyStatsState {
  dailyStats: DayStats[];
  currentDayStats: DayStats | null;
}

const initialState: DailyStatsState = {
  dailyStats: [],
  currentDayStats: {
    day: 1,
    revenue: 0,
    candiesSold: 0,
    expenses: 0,
    profit: 0,
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
          ...action.payload,
        };
      }
    },
    clearDailyStats: (state) => {
      state.dailyStats = [];
      state.currentDayStats = null;
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
  resetDailyStats,
} = dailyStatsSlice.actions;

export default dailyStatsSlice.reducer;

// Selectors
export const selectStatsByDay = (state: { dailyStats: DailyStatsState }, day: number) =>
  state.dailyStats.dailyStats.find(s => s.day === day);

export const selectTotalProfit = (state: { dailyStats: DailyStatsState }) =>
  state.dailyStats.dailyStats.reduce((sum, day) => sum + day.profit, 0);