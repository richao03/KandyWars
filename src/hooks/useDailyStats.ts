import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setDailyStats,
  addDayStats,
  setCurrentDayStats,
  updateCurrentDayStats,
  clearDailyStats,
  resetDailyStats,
  selectTotalProfit,
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
    const currentDay = dailyStatsState.currentDayStats || { profit: 0, expenses: 0, candiesSold: 0 };
    console.log('📊 useDailyStats getTotalStats called, currentDay:', currentDay);
    const result = {
      profit: currentDay.profit || 0,
      spent: currentDay.expenses || 0,
      candiesSold: currentDay.candiesSold || 0,
      netGain: (currentDay.profit || 0) - (currentDay.expenses || 0),
    };
    console.log('📊 useDailyStats getTotalStats returning:', result);
    return result;
  }, [dailyStatsState.currentDayStats]);

  const addProfit = useCallback((amount: number) => {
    dispatch(updateCurrentDayStats({ profit: (dailyStatsState.currentDayStats?.profit || 0) + amount }));
  }, [dispatch, dailyStatsState.currentDayStats]);

  const addSpent = useCallback((amount: number) => {
    dispatch(updateCurrentDayStats({ expenses: (dailyStatsState.currentDayStats?.expenses || 0) + amount }));
  }, [dispatch, dailyStatsState.currentDayStats]);

  const addCandySold = useCallback((quantity: number) => {
    dispatch(updateCurrentDayStats({ candiesSold: (dailyStatsState.currentDayStats?.candiesSold || 0) + quantity }));
  }, [dispatch, dailyStatsState.currentDayStats]);

  const setStartingMoney = useCallback((amount: number) => {
    // This could be stored in a separate field if needed
    console.log('setStartingMoney called with:', amount);
  }, []);

  const getStatsByDay = useCallback((day: number) => {
    return dailyStatsState.dailyStats.find(s => s.day === day);
  }, [dailyStatsState.dailyStats]);

  return {
    dailyStats: dailyStatsState.dailyStats,
    currentDayStats: dailyStatsState.currentDayStats,
    totalProfit,
    updateDailyStats,
    addDayStatsEntry,
    updateCurrentDay,
    updateCurrentDayPartial,
    clearStats,
    reset,
    resetDailyStats: resetDailyStatsAction,
    getTotalStats,
    addProfit,
    addSpent,
    addCandySold,
    setStartingMoney,
    getStatsByDay,
  };
};