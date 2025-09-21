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

  const consecutivePeriodSales = useCallback(() => {
    // This would need to be implemented based on your business logic
    return 0;
  }, []);

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