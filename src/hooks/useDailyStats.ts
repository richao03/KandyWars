import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setDailyStats,
  addDayStats,
  setCurrentDayStats,
  updateCurrentDayStats,
  clearDailyStats,
  recordSale,
  recordPurchase,
  recordAllowance,
  recordMerchantPurchase,
  resetDailyStats,
  resetPlaythroughStats,
  selectTotalProfit,
  MerchantPurchase,
} from '../store/slices/dailyStatsSlice';

export const useDailyStats = () => {
  const dispatch = useAppDispatch();
  const dailyStatsState = useAppSelector(state => state.dailyStats);
  const totalProfit = useAppSelector(selectTotalProfit);

  const updateDailyStats = useCallback((stats: any[]) => {
    dispatch(setDailyStats(stats));
  }, [dispatch]);

  const addDayStatsEntry = useCallback((stats: any) => {
    dispatch(addDayStats(stats));
  }, [dispatch]);

  const updateCurrentDay = useCallback((stats: any) => {
    dispatch(setCurrentDayStats(stats));
  }, [dispatch]);

  const updateCurrentDayPartial = useCallback((partialStats: any) => {
    dispatch(updateCurrentDayStats(partialStats));
  }, [dispatch]);

  const clearStats = useCallback(() => {
    dispatch(clearDailyStats());
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(resetDailyStats());
  }, [dispatch]);

  const resetDailyStatsAction = useCallback(() => {
    dispatch(resetDailyStats());
  }, [dispatch]);

  const getTotalStats = useCallback(() => {
    // Sum up ALL days including current day
    const allDays = [...dailyStatsState.dailyStats];
    if (dailyStatsState.currentDayStats) {
      // Add current day if not already in array
      const currentDayExists = allDays.some(d => d.day === dailyStatsState.currentDayStats!.day);
      if (!currentDayExists) {
        allDays.push(dailyStatsState.currentDayStats);
      }
    }

    const result = allDays.reduce((acc, day) => ({
      profit: acc.profit + (day.profit || 0),
      spent: acc.spent + (day.expenses || 0),
      candiesSold: acc.candiesSold + (day.candiesSold || 0),
      netGain: acc.netGain + ((day.profit || 0) - (day.expenses || 0)),
      allowance: acc.allowance + (day.allowance || 0),
    }), { profit: 0, spent: 0, candiesSold: 0, netGain: 0, allowance: 0 });

    if (__DEV__) console.log('📊 useDailyStats getTotalStats - all days:', allDays, 'result:', result);
    return result;
  }, [dailyStatsState.dailyStats, dailyStatsState.currentDayStats]);

  const addProfit = useCallback((amount: number) => {
    dispatch(updateCurrentDayStats({ profit: (dailyStatsState.currentDayStats?.profit || 0) + amount }));
  }, [dispatch, dailyStatsState.currentDayStats]);

  const addSpent = useCallback((amount: number) => {
    dispatch(updateCurrentDayStats({ expenses: (dailyStatsState.currentDayStats?.expenses || 0) + amount }));
    dispatch(recordPurchase({ amount }));
  }, [dispatch, dailyStatsState.currentDayStats]);

  const addCandySold = useCallback((quantity: number) => {
    dispatch(updateCurrentDayStats({ candiesSold: (dailyStatsState.currentDayStats?.candiesSold || 0) + quantity }));
  }, [dispatch, dailyStatsState.currentDayStats]);

  const addAllowance = useCallback((amount: number) => {
    dispatch(updateCurrentDayStats({ allowance: (dailyStatsState.currentDayStats?.allowance || 0) + amount }));
    dispatch(recordAllowance({ amount }));
  }, [dispatch, dailyStatsState.currentDayStats]);

  const setStartingMoney = useCallback((amount: number) => {
    // This could be stored in a separate field if needed
    if (__DEV__) console.log('setStartingMoney called with:', amount);
  }, []);

  const getStatsByDay = useCallback((day: number) => {
    return dailyStatsState.dailyStats.find(s => s.day === day);
  }, [dailyStatsState.dailyStats]);

  const recordSaleAction = useCallback((candyName: string, quantity: number, profit: number, period: number) => {
    dispatch(recordSale({ candyName, quantity, profit, period }));
  }, [dispatch]);

  const getBestSale = useCallback(() => {
    return dailyStatsState.bestSale;
  }, [dailyStatsState.bestSale]);

  const getMostSoldCandy = useCallback(() => {
    const counts = dailyStatsState.candySoldCounts;
    if (Object.keys(counts).length === 0) return null;

    const mostSold = Object.entries(counts).reduce((max, [candy, count]) =>
      count > max.count ? { candy, count } : max
    , { candy: '', count: 0 });

    return mostSold.count > 0 ? mostSold : null;
  }, [dailyStatsState.candySoldCounts]);

  const getPlaythroughStats = useCallback(() => {
    return dailyStatsState.playthroughStats;
  }, [dailyStatsState.playthroughStats]);

  const resetPlaythrough = useCallback(() => {
    dispatch(resetPlaythroughStats());
  }, [dispatch]);

  const recordMerchantPurchaseAction = useCallback((purchase: MerchantPurchase) => {
    dispatch(recordMerchantPurchase(purchase));
  }, [dispatch]);

  return {
    dailyStats: dailyStatsState.dailyStats,
    currentDayStats: dailyStatsState.currentDayStats,
    totalProfit,
    bestSale: dailyStatsState.bestSale,
    candySoldCounts: dailyStatsState.candySoldCounts,
    playthroughStats: dailyStatsState.playthroughStats,
    updateDailyStats,
    addDayStatsEntry,
    updateCurrentDay,
    updateCurrentDayPartial,
    clearStats,
    reset,
    resetDailyStats: resetDailyStatsAction,
    resetPlaythrough,
    getTotalStats,
    addProfit,
    addSpent,
    addCandySold,
    addAllowance,
    setStartingMoney,
    getStatsByDay,
    recordSale: recordSaleAction,
    getBestSale,
    getMostSoldCandy,
    getPlaythroughStats,
    recordMerchantPurchase: recordMerchantPurchaseAction,
  };
};