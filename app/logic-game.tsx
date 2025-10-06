import React from 'react';
import { router } from 'expo-router';
import { useGame } from '../src/hooks/useGame';
import LogicGame from './minigames/LogicGame';

export default function LogicGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();

  const handleGameComplete = () => {
    console.log('Logic game completed! Context:', minigameContext);

    // Mark study as completed based on context
    if (minigameContext === 'after-school') {
      markStudiedTonight();
      console.log('After-school study session finished.');
    } else if (minigameContext === 'lunch') {
      markLunchMinigamePlayed();
      console.log('Lunch minigame finished.');
    }

    // Clear context and navigate to appropriate screen
    setMinigameContext(null);

    // Use navigate() to go to the tab without creating new instances
    if (minigameContext === 'lunch') {
      router.navigate('/(tabs)/market');
    } else {
      router.navigate('/(tabs)/after-school');
    }
  };

  return <LogicGame onComplete={handleGameComplete} />;
}
