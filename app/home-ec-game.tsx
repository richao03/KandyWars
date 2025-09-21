import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import HomeEcGame from './minigames/HomeEcGame';

export default function HomeEcGameScreen() {
  const { markStudiedTonight } = useGame();

  const handleGameComplete = () => {
    // Mark study as completed in game state
    markStudiedTonight();
    console.log('Home Ec game completed! Study session finished.');
    // Return to after-school view instead of study page
    router.push('/(tabs)/after-school');
  };

  return <HomeEcGame onComplete={handleGameComplete} />;
}