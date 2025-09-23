import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  incrementPeriod,
  startAfterSchool,
  startNewDay,
  resetGame,
  revertToPreviousPeriod,
  jumpToPeriod,
  markStudiedTonight,
  setLastActiveView,
  setPricesUpdating,
  setIsInitialized,
  selectDay,
  selectPeriod,
} from '../store/slices/gameSlice';

export const useGame = () => {
  const dispatch = useAppDispatch();
  // Subscribe to specific values instead of entire state slice
  const day = useAppSelector(selectDay);
  const period = useAppSelector(selectPeriod);
  const periodCount = useAppSelector(state => state.game.periodCount);
  const currentLocation = useAppSelector(state => state.game.currentLocation);
  const lastActiveView = useAppSelector(state => state.game.lastActiveView);
  const hasStudiedTonight = useAppSelector(state => state.game.hasStudiedTonight);
  const pricesUpdating = useAppSelector(state => state.game.pricesUpdating);
  const isInitialized = useAppSelector(state => state.game.isInitialized);
  const locationHistory = useAppSelector(state => state.game.locationHistory);
  const isAfterSchool = useAppSelector(state => state.game.isAfterSchool);

  const incrementPeriodAction = useCallback((location: Parameters<typeof incrementPeriod>[0]) => {
    dispatch(incrementPeriod(location));
  }, [dispatch]);

  const startAfterSchoolAction = useCallback(() => {
    dispatch(startAfterSchool());
  }, [dispatch]);

  const startNewDayAction = useCallback(() => {
    dispatch(startNewDay());
  }, [dispatch]);

  const resetGameAction = useCallback(() => {
    dispatch(resetGame());
  }, [dispatch]);

  const revertToPreviousPeriodAction = useCallback(() => {
    dispatch(revertToPreviousPeriod());
    return true;
  }, [dispatch]);

  const jumpToPeriodAction = useCallback((targetPeriod: number) => {
    dispatch(jumpToPeriod(targetPeriod));
    return true;
  }, [dispatch]);

  const markStudiedTonightAction = useCallback(() => {
    dispatch(markStudiedTonight());
  }, [dispatch]);

  const setLastActiveViewAction = useCallback((view: 'market' | 'after-school') => {
    dispatch(setLastActiveView(view));
  }, [dispatch]);

  const setPricesUpdatingAction = useCallback((updating: boolean) => {
    dispatch(setPricesUpdating(updating));
  }, [dispatch]);

  const setIsInitializedAction = useCallback((initialized: boolean) => {
    dispatch(setIsInitialized(initialized));
  }, [dispatch]);

  return {
    day,
    period,
    periodCount,
    currentLocation,
    locationHistory,
    isAfterSchool,
    hasStudiedTonight,
    lastActiveView,
    pricesUpdating,
    isInitialized,
    incrementPeriod: incrementPeriodAction,
    startAfterSchool: startAfterSchoolAction,
    startNewDay: startNewDayAction,
    resetGame: resetGameAction,
    revertToPreviousPeriod: revertToPreviousPeriodAction,
    jumpToPeriod: jumpToPeriodAction,
    markStudiedTonight: markStudiedTonightAction,
    setLastActiveView: setLastActiveViewAction,
    setPricesUpdating: setPricesUpdatingAction,
    setIsInitialized: setIsInitializedAction,
  };
};