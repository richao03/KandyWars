import { useCallback, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setScores,
  addScore,
  setCurrentScore,
  setHighScore,
  setIsLoading,
  resetScoreboard,
} from '../store/slices/scoreboardSlice';
import { scoreboardService } from '../services/firebase';

export const useScoreboard = () => {
  const dispatch = useAppDispatch();
  const scoreboardState = useAppSelector(state => state.scoreboard);
  const [topScores, setTopScores] = useState<any[]>([]);
  const [playerRank, setPlayerRank] = useState(0);
  const [betaStats, setBetaStats] = useState<any>(null);

  const updateScores = useCallback((scores: any[]) => {
    dispatch(setScores(scores));
  }, [dispatch]);

  const submitScore = useCallback((score: any) => {
    dispatch(addScore(score));
  }, [dispatch]);

  const updateCurrentScore = useCallback((score: number) => {
    dispatch(setCurrentScore(score));
  }, [dispatch]);

  const updateHighScore = useCallback((score: number) => {
    dispatch(setHighScore(score));
  }, [dispatch]);

  const setLoading = useCallback((loading: boolean) => {
    dispatch(setIsLoading(loading));
  }, [dispatch]);

  const trackGameCompleted = useCallback(async (): Promise<void> => {
    // This would integrate with your Firebase scoreboard service
    console.log('Game completion tracked via Redux');
  }, []);

  const trackMinigamePlayed = useCallback(async (minigameType: string): Promise<void> => {
    console.log(`Minigame played: ${minigameType}`);
    try {
      await scoreboardService.trackMinigamePlay(minigameType, 'Player');
    } catch (error) {
      console.error('Failed to track minigame play:', error);
    }
  }, []);

  const trackDayEnded = useCallback(async (periodsCount: number): Promise<void> => {
    console.log(`Day ended with ${periodsCount} periods`);
  }, []);

  const reset = useCallback(() => {
    dispatch(resetScoreboard());
  }, [dispatch]);

  const refreshScoreboard = useCallback(async () => {
    dispatch(setIsLoading(true));
    try {
      await scoreboardService.initialize();
      const scores = await scoreboardService.getTopScores('all', 10);
      setTopScores(scores || []);
    } catch (error) {
      console.error('❌ Failed to refresh scoreboard:', error);
      setTopScores([]);
    } finally {
      dispatch(setIsLoading(false));
    }
  }, [dispatch]);

  return {
    scores: scoreboardState.scores,
    currentScore: scoreboardState.currentScore,
    highScore: scoreboardState.highScore,
    isLoading: scoreboardState.isLoading,
    isSubmitting: false, // Would need state management for this
    lastSubmissionId: null, // Would need state management for this
    gameStartTime: Date.now(), // Would need state management for this
    topScores,
    playerRank,
    betaStats,
    refreshScoreboard,
    updateScores,
    submitScore,
    updateCurrentScore,
    updateHighScore,
    setLoading,
    trackGameCompleted,
    trackMinigamePlayed,
    trackDayEnded,
    reset,
  };
};