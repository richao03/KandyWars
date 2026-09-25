import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { getPetForLevel } from '../constants/petData';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { dismissAdoptionPrompt } from '../store/slices/gameSlice';
import { MusicController } from '../utils/musicController';
import { useWallet } from './useWallet';

/**
 * Shared "can the player adopt right now?" state plus the action that ends the
 * run early. Used by the one-time popup (useAdoptionPrompt) and by the
 * featured "Go pick up <pet>" button on the Settings tab.
 */
export function useAdoptionReady() {
  const dispatch = useAppDispatch();
  const { balance, stashedAmount, adoptionFee, difficultyLevel } = useWallet();
  const isInitialized = useAppSelector((state) => state.game.isInitialized);

  const ready =
    isInitialized && adoptionFee > 0 && balance + stashedAmount >= adoptionFee;

  // End the run now: the results screen scores it as a win and unlocks the
  // next level (it evaluates balance + stash - fee whenever it loads).
  const goAdopt = useCallback(() => {
    dispatch(dismissAdoptionPrompt());
    MusicController.stop();
    router.push('/game-end');
  }, [dispatch]);

  return { ready, pet: getPetForLevel(difficultyLevel), goAdopt };
}

/**
 * Early-win prompt. Once balance + stash covers the adoption fee, offer the
 * player the choice to end the run now (go straight to the results screen,
 * which scores it as a win and unlocks the next level) or keep playing.
 *
 * Shown at most once per run: choosing "Continue" sets a persisted flag on the
 * game slice that resets with the rest of the game state on a new run. After
 * that the player can still end early from the Settings tab.
 *
 * `active` lets a screen hold the prompt back while it is not focused or
 * another blocking flow (e.g. going-to-school transition) is running.
 */
export function useAdoptionPrompt(active: boolean = true) {
  const dispatch = useAppDispatch();
  const { ready, pet, goAdopt } = useAdoptionReady();
  const dismissed = useAppSelector(
    (state) => state.game.adoptionPromptDismissed
  );

  const shouldShow = active && ready && !dismissed;

  // Small delay so the prompt lands after whatever sale/stash modal just closed.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!shouldShow) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  const handleContinue = useCallback(() => {
    setVisible(false);
    dispatch(dismissAdoptionPrompt());
  }, [dispatch]);

  const handleEndGame = useCallback(() => {
    setVisible(false);
    goAdopt();
  }, [goAdopt]);

  return { visible, pet, handleContinue, handleEndGame };
}
