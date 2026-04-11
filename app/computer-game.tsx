import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import ComputerGame from './minigames/ComputerGame';

export default function ComputerGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();

  const navigateBack = () => {
    router.back();
  };

  const handleGameComplete = () => {
    if (__DEV__) console.log('Computer game completed! Context:', minigameContext);

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

  return <ComputerGame onComplete={handleGameComplete} onBack={handleBack} />;
}
