import { CommonActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import RecessGame from './minigames/RecessGame';

export default function RecessGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();
  const navigation = useNavigation();

  const handleComplete = () => {
    console.log('Recess game completed! Context:', minigameContext);

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

    // Use CommonActions.reset() to properly clean up navigation stack
    const targetRoute = minigameContext === 'lunch' ? 'market' : 'after-school';
    console.log(`🧹 Resetting navigation stack to ${targetRoute} tab`);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: '(tabs)', params: { screen: targetRoute } }],
      })
    );
  };

  return <RecessGame onComplete={handleComplete} />;
}
