import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  initializeMinigameTracking,
  initializeFromUserObject,
  markMinigamePlayed,
  selectPlayedMinigames,
  selectMinigameCompletions,
  selectHasPlayedAllMinigames,
  selectMinigameProgress,
  MinigameType,
} from '../store/slices/minigameTrackingSlice';
import { updateCachedUserObject } from '../store/slices/userObjectSlice';

export const useMinigameTracking = () => {
  const dispatch = useAppDispatch();
  const minigameState = useAppSelector(state => state.minigameTracking);
  const cachedUserObject = useAppSelector(state => state.userObject.cachedUser);
  const playedMinigames = useAppSelector(selectPlayedMinigames);
  const minigameCompletions = useAppSelector(selectMinigameCompletions);
  const hasPlayedAllMinigames = useAppSelector(selectHasPlayedAllMinigames);
  const minigameProgress = useAppSelector(selectMinigameProgress);

  // Initialize minigame tracking from cached user object (Firebase data)
  useEffect(() => {
    if (!minigameState.isLoaded) {
      if (cachedUserObject?.playedMinigames) {
        if (__DEV__) console.log('🎮 Initializing minigame tracking from Firebase cache');
        dispatch(initializeFromUserObject(cachedUserObject.playedMinigames));
      } else {
        if (__DEV__) console.log('🎮 Initializing minigame tracking without Firebase data');
        dispatch(initializeMinigameTracking());
      }
    }
  }, [dispatch, minigameState.isLoaded, cachedUserObject]);

  const trackMinigamePlayed = useCallback((minigame: MinigameType) => {
    if (__DEV__) console.log(`🎮 Minigame played: ${minigame}`);
    dispatch(markMinigamePlayed(minigame));

    // Update cached user object if the minigame is new
    if (!playedMinigames.includes(minigame) && cachedUserObject) {
      const updatedPlayedMinigames = [...playedMinigames, minigame];
      dispatch(updateCachedUserObject({ playedMinigames: updatedPlayedMinigames }));
      if (__DEV__) console.log('📦 Updated cached user object with new minigame:', minigame);
    }

    // Log progress
    const newProgress = {
      ...minigameProgress,
      played: playedMinigames.includes(minigame) ? minigameProgress.played : minigameProgress.played + 1
    };

    if (__DEV__) console.log(`📊 Minigame progress: ${newProgress.played}/${newProgress.total} played`);

    if (newProgress.played === newProgress.total) {
      if (__DEV__) console.log('🎉 All minigames completed! Valedictorian Vendor Hall Pass should be unlocked.');
    }
  }, [dispatch, minigameProgress, playedMinigames, cachedUserObject]);

  const hasPlayedMinigame = useCallback((minigame: MinigameType): boolean => {
    return playedMinigames.includes(minigame);
  }, [playedMinigames]);

  const getMinigameCompletionCount = useCallback((minigame: MinigameType): number => {
    return minigameCompletions[minigame] || 0;
  }, [minigameCompletions]);

  const getRemainingMinigames = useCallback((): MinigameType[] => {
    return minigameProgress.remaining;
  }, [minigameProgress.remaining]);

  const getMinigameProgressPercentage = useCallback((): number => {
    return Math.round((minigameProgress.played / minigameProgress.total) * 100);
  }, [minigameProgress.played, minigameProgress.total]);

  return {
    // State
    playedMinigames,
    minigameCompletions,
    hasPlayedAllMinigames,
    minigameProgress,
    isLoaded: minigameState.isLoaded,

    // Actions
    trackMinigamePlayed,

    // Utilities
    hasPlayedMinigame,
    getMinigameCompletionCount,
    getRemainingMinigames,
    getMinigameProgressPercentage,
  };
};