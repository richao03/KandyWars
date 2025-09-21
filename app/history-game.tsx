import React from 'react';
import { router } from 'expo-router';
import { useGame } from '../src/hooks/useGame';
import GymGame from './minigames/GymGame';

export default function GymGameScreen() {
  const { markStudiedTonight } = useGame();

  const handleGameComplete = () => {
    // Mark study as completed in game state
    markStudiedTonight();
    console.log('Gym game completed! Study session finished.');
    // Return to after-school view instead of study page
    router.push('/(tabs)/after-school');
  };

  return <GymGame onComplete={handleGameComplete} />;
}