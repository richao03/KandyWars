import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import GeographyGame from './minigames/GeographyGame';

export default function GeographyGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();

  const navigateBack = () => {
    router.back();
  };

  const handleComplete = () => {
    if (__DEV__) console.log('Geography game completed! Context:', minigameContext);

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

  return <GeographyGame onComplete={handleComplete} onBack={handleBack} />;
}
