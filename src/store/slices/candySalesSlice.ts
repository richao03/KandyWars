import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

interface SaleRecord {
  candyId: string;
  candyName: string;
  quantity: number;
  price: number;
  total: number;
  timestamp: number;
  period: number;
  periodsPerDay?: number; // Optional: defaults to 8 (6 for Time Crunch)
}

interface CandySalesState {
  sales: SaleRecord[];
  totalRevenue: number;
  totalCandiesSold: number;
  hasEarlySaleToday: boolean; // Tracks if any sale was made before period 6 today
  earlyPeriodProfit: number; // Total profit from periods 1-4 (for Time Crunch unlock)
  latePeriodProfit: number; // Total profit from periods 7-8 (for Final Exam unlock)
  transactionCount: number; // Total number of sales transactions (for Speedrun Champion unlock)
}

const initialState: CandySalesState = {
  sales: [],
  totalRevenue: 0,
  totalCandiesSold: 0,
  hasEarlySaleToday: false,
  earlyPeriodProfit: 0,
  latePeriodProfit: 0,
  transactionCount: 0,
};

const candySalesSlice = createSlice({
  name: 'candySales',
  initialState,
  reducers: {
    addSale: (state, action: PayloadAction<SaleRecord>) => {
      // Add the sale to the array
      state.sales.push(action.payload);

      // Increment transaction count for Speedrun Champion unlock tracking
      state.transactionCount++;

      // Get period within day for tracking
      const periodsPerDay = action.payload.periodsPerDay ?? 8; // Default to 8 if not provided
      const periodInDay = ((action.payload.period - 1) % periodsPerDay) + 1; // Get period within day (1-6 or 1-8)

      // Track period-based profits for hall pass unlocks
      const profit = action.payload.total;
      if (__DEV__) console.log(`💰 Sale tracking: Period ${action.payload.period}, periodInDay: ${periodInDay}, profit: $${profit.toFixed(2)}`);
      if (periodInDay >= 1 && periodInDay <= 4) {
        state.earlyPeriodProfit += profit;
        if (__DEV__) console.log(`💰 ✅ Early period profit: +$${profit.toFixed(2)} (total: $${state.earlyPeriodProfit.toFixed(2)})`);
      } else if (periodInDay >= 7 && periodInDay <= periodsPerDay) {
        // For 6-period days, periods 7-8 don't exist, so this only applies to 8-period days
        state.latePeriodProfit += profit;
        if (__DEV__) console.log(`💰 ✅ Late period profit: +$${profit.toFixed(2)} (total: $${state.latePeriodProfit.toFixed(2)})`);
      } else {
        if (__DEV__) console.log(`💰 ⚠️ Mid-period sale (${periodInDay}) - not counted for Time Crunch or Final Exam`);
      }

      // Track if this is an early sale for Vacuum Sealer penalty
      // Use proportional threshold: first half of day
      const earlyThreshold = Math.ceil(periodsPerDay / 2);
      if (periodInDay < earlyThreshold) {
        state.hasEarlySaleToday = true;
        if (__DEV__) console.log(`🚫 Vacuum Sealer: Early sale detected at period ${periodInDay}/${periodsPerDay} (threshold: ${earlyThreshold}) - penalty will apply to ALL profits`);
      }

      // Keep only sales from the last 10 periods to prevent unbounded growth
      const minPeriodToKeep = Math.max(0, action.payload.period - 10);
      state.sales = state.sales.filter(sale => sale.period >= minPeriodToKeep);

      state.totalRevenue += action.payload.total;
      state.totalCandiesSold += action.payload.quantity;
    },
    setSales: (state, action: PayloadAction<SaleRecord[]>) => {
      state.sales = action.payload;
      state.totalRevenue = action.payload.reduce((sum, sale) => sum + sale.total, 0);
      state.totalCandiesSold = action.payload.reduce((sum, sale) => sum + sale.quantity, 0);
    },
    clearSales: (state) => {
      state.sales = [];
      state.totalRevenue = 0;
      state.totalCandiesSold = 0;
    },
    resetEarlySaleFlag: (state) => {
      state.hasEarlySaleToday = false;
      if (__DEV__) console.log('🔄 Vacuum Sealer: Early sale flag reset for new day');
    },
    resetDailyStats: (state) => {
      // Reset daily flags when starting a new day (called from market.tsx period advancement)
      state.hasEarlySaleToday = false;
      if (__DEV__) console.log('🔄 New day: Early sale flag reset');
    },
    resetCandySales: () => initialState,
  },
});

export const {
  addSale,
  setSales,
  clearSales,
  resetEarlySaleFlag,
  resetDailyStats,
  resetCandySales,
} = candySalesSlice.actions;

export default candySalesSlice.reducer;

// Selectors
export const selectSalesByPeriod = (period: number) =>
  createSelector(
    [(state: { candySales: CandySalesState }) => state.candySales.sales],
    (sales) => sales.filter(sale => sale.period === period)
  );

export const selectRevenueByPeriod = (period: number) =>
  createSelector(
    [selectSalesByPeriod(period)],
    (periodSales) => periodSales.reduce((sum, sale) => sum + sale.total, 0)
  );