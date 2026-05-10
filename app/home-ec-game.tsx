import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import { useMinigameTracking } from '../src/hooks/useMinigameTracking';
import HomeEcGame from './minigames/HomeEcGame';

export default function HomeEcGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();
  const { trackMinigameWon } = useMinigameTracking();

  const navigateBack = () => {
    router.back();
  };

  const handleGameComplete = () => {
    trackMinigameWon('home-ec');
    if (__DEV__) console.log('Home Ec game completed! Context:', minigameContext);

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

  return <HomeEcGame onComplete={handleGameComplete} onBack={handleBack} />;
}
