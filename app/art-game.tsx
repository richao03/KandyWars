import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import { useMinigameTracking } from '../src/hooks/useMinigameTracking';
import ArtGame from './minigames/ArtGame';

export default function ArtGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();
  const { trackMinigameWon } = useMinigameTracking();

  const navigateBack = () => {
    router.back();
  };

  const handleGameComplete = () => {
    trackMinigameWon('art');
    if (__DEV__) console.log('Art game completed! Context:', minigameContext);

    if (minigameContext === 'after-school') {
      markStudiedTonight();
      if (__DEV__) console.log('After-school study session finished.');
    } else if (minigameContext === 'lunch') {
      markLunchMinigamePlayed();
      if (__DEV__) console.log('Lunch minigame finished.');
    }

    setMinigameContext(null);

    setTimeout(() => {
      navigateBack();
    }, 100);
  };

  const handleBack = () => {
    setMinigameContext(null);
    navigateBack();
  };

  return <ArtGame onComplete={handleGameComplete} onBack={handleBack} />;
}
