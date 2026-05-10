import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import { useMinigameTracking } from '../src/hooks/useMinigameTracking';
import LogicGame from './minigames/LogicGame';

export default function LogicGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();
  const { trackMinigameWon } = useMinigameTracking();

  const navigateBack = () => {
    router.back();
  };

  const handleGameComplete = () => {
    trackMinigameWon('logic');
    if (__DEV__) console.log('Logic game completed! Context:', minigameContext);

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

  return <LogicGame onComplete={handleGameComplete} onBack={handleBack} />;
}
