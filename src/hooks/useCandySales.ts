import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addSale,
  setSales,
  clearSales,
  resetCandySales,
  selectSalesByPeriod,
  selectRevenueByPeriod,
} from '../store/slices/candySalesSlice';

export const useCandySales = () => {
  const dispatch = useAppDispatch();
  const candySalesState = useAppSelector(state => state.candySales);

  const recordSale = useCallback((sale: any) => {
    dispatch(addSale(sale));
  }, [dispatch]);

  const updateSales = useCallback((sales: any[]) => {
    dispatch(setSales(sales));
  }, [dispatch]);

  const clearAllSales = useCallback(() => {
    dispatch(clearSales());
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(resetCandySales());
  }, [dispatch]);

  const getSalesByPeriod = useCallback((period: number) => {
    return candySalesState.sales.filter(sale => sale.period === period);
  }, [candySalesState.sales]);

  const getRevenueByPeriod = useCallback((period: number) => {
    return getSalesByPeriod(period).reduce((sum, sale) => sum + sale.total, 0);
  }, [getSalesByPeriod]);

  const addSaleAction = useCallback((sale: any) => {
    dispatch(addSale(sale));
  }, [dispatch]);

  const resetSales = useCallback(() => {
    dispatch(resetCandySales());
  }, [dispatch]);

  const consecutivePeriodSales = useCallback((currentPeriod?: number) => {
    // Count consecutive periods with sales, starting from the current period
    // If currentPeriod is provided, count it as a potential sale (for preview in TransactionModal)
    console.log(`🔥 consecutivePeriodSales: sales array length=${candySalesState.sales.length}, currentPeriod=${currentPeriod}`);
    console.log(`🔥 sales array:`, candySalesState.sales.map(s => `period ${s.period}`).join(', '));

    if (candySalesState.sales.length === 0) {
      console.log(`🔥 No sales, returning ${currentPeriod !== undefined ? 1 : 0}`);
      // If we're checking for current period and there are no previous sales, return 1 (just this period)
      return currentPeriod !== undefined ? 1 : 0;
    }

    // Get all unique periods with sales, sorted descending
    const periodsWithSales = Array.from(
      new Set(candySalesState.sales.map(sale => sale.period))
    ).sort((a, b) => b - a);

    console.log(`🔥 Unique periods with sales:`, periodsWithSales);

    if (periodsWithSales.length === 0) {
      console.log(`🔥 No periods with sales, returning ${currentPeriod !== undefined ? 1 : 0}`);
      return currentPeriod !== undefined ? 1 : 0;
    }

    const mostRecentPeriod = periodsWithSales[0];
    console.log(`🔥 Most recent period: ${mostRecentPeriod}`);

    // If currentPeriod is provided, check if it would continue the streak
    let consecutiveCount = 1;
    let checkFromPeriod = mostRecentPeriod;

    if (currentPeriod !== undefined && currentPeriod > mostRecentPeriod) {
      // We're checking for a future sale
      if (currentPeriod === mostRecentPeriod + 1) {
        // This would continue the streak
        consecutiveCount = 2; // Current period + most recent
        console.log(`🔥 Current period ${currentPeriod} continues streak from ${mostRecentPeriod}`);
      } else {
        // Gap in periods, streak would restart
        console.log(`🔥 Gap between ${mostRecentPeriod} and ${currentPeriod}, returning 1`);
        return 1;
      }
    }

    // Count backwards from most recent period
    for (let i = 1; i < periodsWithSales.length; i++) {
      const expectedPeriod = mostRecentPeriod - i;
      console.log(`🔥 Checking: periodsWithSales[${i}]=${periodsWithSales[i]} vs expected ${expectedPeriod}`);
      if (periodsWithSales[i] === expectedPeriod) {
        consecutiveCount++;
        console.log(`🔥 Consecutive! Count now: ${consecutiveCount}`);
      } else {
        console.log(`🔥 Not consecutive, breaking`);
        break;
      }
    }

    console.log(`🔥 Final consecutive count: ${consecutiveCount}`);
    return consecutiveCount;
  }, [candySalesState.sales]);

  return {
    sales: candySalesState.sales,
    totalRevenue: candySalesState.totalRevenue,
    totalCandiesSold: candySalesState.totalCandiesSold,
    consecutivePeriodSales,
    recordSale,
    updateSales,
    clearAllSales,
    reset,
    addSale: addSaleAction,
    resetSales,
    getSalesByPeriod,
    getRevenueByPeriod,
  };
};