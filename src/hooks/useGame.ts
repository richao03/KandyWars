import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  incrementPeriod,
  startAfterSchool,
  startNewDay,
  resetGame,
  revertToPreviousPeriod,
  jumpToPeriod,
  markStudiedTonight,
  markLunchMinigamePlayed,
  setLastActiveView,
  setPricesUpdating,
  setIsInitialized,
  setMinigameContext,
  setHasCompletedMarketTutorial,
  setHasCompletedAfterSchoolTutorial,
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
  const hasPlayedLunchMinigame = useAppSelector(state => state.game.hasPlayedLunchMinigame);
  const minigameContext = useAppSelector(state => state.game.minigameContext);
  const pricesUpdating = useAppSelector(state => state.game.pricesUpdating);
  const isInitialized = useAppSelector(state => state.game.isInitialized);
  const locationHistory = useAppSelector(state => state.game.locationHistory);
  const isAfterSchool = useAppSelector(state => state.game.isAfterSchool);
  const hasCompletedMarketTutorial = useAppSelector(state => state.game.hasCompletedMarketTutorial);
  const hasCompletedAfterSchoolTutorial = useAppSelector(state => state.game.hasCompletedAfterSchoolTutorial);

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

  const markLunchMinigamePlayedAction = useCallback(() => {
    dispatch(markLunchMinigamePlayed());
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

  const setMinigameContextAction = useCallback((context: 'lunch' | 'after-school' | null) => {
    dispatch(setMinigameContext(context));
  }, [dispatch]);

  const setHasCompletedMarketTutorialAction = useCallback((completed: boolean) => {
    dispatch(setHasCompletedMarketTutorial(completed));
  }, [dispatch]);

  const setHasCompletedAfterSchoolTutorialAction = useCallback((completed: boolean) => {
    dispatch(setHasCompletedAfterSchoolTutorial(completed));
  }, [dispatch]);

  // Memoize the return object to prevent unnecessary re-renders in consuming components
  return useMemo(() => ({
    day,
    period,
    periodCount,
    currentLocation,
    locationHistory,
    isAfterSchool,
    hasStudiedTonight,
    hasPlayedLunchMinigame,
    minigameContext,
    lastActiveView,
    pricesUpdating,
    isInitialized,
    hasCompletedMarketTutorial,
    hasCompletedAfterSchoolTutorial,
    incrementPeriod: incrementPeriodAction,
    startAfterSchool: startAfterSchoolAction,
    startNewDay: startNewDayAction,
    resetGame: resetGameAction,
    revertToPeriousPeriod: revertToPreviousPeriodAction,
    jumpToPeriod: jumpToPeriodAction,
    markStudiedTonight: markStudiedTonightAction,
    markLunchMinigamePlayed: markLunchMinigamePlayedAction,
    setLastActiveView: setLastActiveViewAction,
    setPricesUpdating: setPricesUpdatingAction,
    setIsInitialized: setIsInitializedAction,
    setMinigameContext: setMinigameContextAction,
    setHasCompletedMarketTutorial: setHasCompletedMarketTutorialAction,
    setHasCompletedAfterSchoolTutorial: setHasCompletedAfterSchoolTutorialAction,
  }), [
    day,
    period,
    periodCount,
    currentLocation,
    locationHistory,
    isAfterSchool,
    hasStudiedTonight,
    hasPlayedLunchMinigame,
    minigameContext,
    lastActiveView,
    pricesUpdating,
    isInitialized,
    hasCompletedMarketTutorial,
    hasCompletedAfterSchoolTutorial,
    incrementPeriodAction,
    startAfterSchoolAction,
    startNewDayAction,
    resetGameAction,
    revertToPreviousPeriodAction,
    jumpToPeriodAction,
    markStudiedTonightAction,
    markLunchMinigamePlayedAction,
    setLastActiveViewAction,
    setPricesUpdatingAction,
    setIsInitializedAction,
    setMinigameContextAction,
    setHasCompletedMarketTutorialAction,
    setHasCompletedAfterSchoolTutorialAction,
  ]);
};