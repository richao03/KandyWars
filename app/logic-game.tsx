import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import LogicGame from './minigames/LogicGame';

export default function LogicGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();

  const navigateBack = () => {
    router.back();
  };

  const handleGameComplete = () => {
    console.log('Logic game completed! Context:', minigameContext);

    if (minigameContext === 'after-school') {
      markStudiedTonight();
      console.log('After-school study session finished.');
    } else if (minigameContext === 'lunch') {
      markLunchMinigamePlayed();
      console.log('Lunch minigame finished.');
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

  return <LogicGame onComplete={handleGameComplete} onBack={handleBack} />;
}
