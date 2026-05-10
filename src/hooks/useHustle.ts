import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  generateHustles,
  completeHustle,
  resetHustles,
  selectHustles,
  selectActiveHustles,
  selectCompletedHustleIds,
  selectHustleForCurrentLocation,
  HustleEvent,
} from '../store/slices/hustleSlice';

export const useHustle = () => {
  const dispatch = useAppDispatch();
  const hustles = useAppSelector(selectHustles);
  const activeHustles = useAppSelector(selectActiveHustles);
  const completedHustleIds = useAppSelector(selectCompletedHustleIds);

  const generateHustlesAction = useCallback(
    (
      seed: string,
      day: number,
      periodsPerDay: number,
      unlockedCandies?: string[]
    ) => {
      dispatch(generateHustles({ seed, day, periodsPerDay, unlockedCandies }));
    },
    [dispatch]
  );

  const completeHustleAction = useCallback(
    (hustleId: string) => {
      dispatch(completeHustle(hustleId));
    },
    [dispatch]
  );

  const resetHustlesAction = useCallback(() => {
    dispatch(resetHustles());
  }, [dispatch]);

  const getHustleForLocation = useCallback(
    (location: string, period: number): HustleEvent | undefined => {
      // Search active hustles for a match
      return activeHustles.find(
        (h) => h.location === location && h.period === period
      );
    },
    [activeHustles]
  );

  /**
   * Generate hustle rumor messages for the scroller.
   * Returns an array of hint strings for all active hustles today.
   */
  const getHustleRumors = useCallback((): string[] => {
    return activeHustles.map(
      (h) =>
        `A kid in the ${h.location} wants ${h.quantity} ${h.candyName} by period ${h.period}. Says he's got something good...`
    );
  }, [activeHustles]);

  return {
    hustles,
    activeHustles,
    completedHustleIds,
    generateHustles: generateHustlesAction,
    completeHustle: completeHustleAction,
    resetHustles: resetHustlesAction,
    getHustleForLocation,
    getHustleRumors,
  };
};
