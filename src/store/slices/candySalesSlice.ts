import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SaleRecord {
  candyId: string;
  candyName: string;
  quantity: number;
  price: number;
  total: number;
  timestamp: number;
  period: number;
}

interface CandySalesState {
  sales: SaleRecord[];
  totalRevenue: number;
  totalCandiesSold: number;
}

const initialState: CandySalesState = {
  sales: [],
  totalRevenue: 0,
  totalCandiesSold: 0,
};

const candySalesSlice = createSlice({
  name: 'candySales',
  initialState,
  reducers: {
    addSale: (state, action: PayloadAction<SaleRecord>) => {
      state.sales.push(action.payload);
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
    resetCandySales: () => initialState,
  },
});

export const {
  addSale,
  setSales,
  clearSales,
  resetCandySales,
} = candySalesSlice.actions;

export default candySalesSlice.reducer;

// Selectors
export const selectSalesByPeriod = (state: { candySales: CandySalesState }, period: number) =>
  state.candySales.sales.filter(sale => sale.period === period);

export const selectRevenueByPeriod = (state: { candySales: CandySalesState }, period: number) =>
  selectSalesByPeriod(state, period).reduce((sum, sale) => sum + sale.total, 0);