import React from 'react';
import { router } from 'expo-router';
import { useGame } from '../src/context/GameContext';
import MathGame from './minigames/MathGame';

export default function MathGameScreen() {
  const { markStudiedTonight } = useGame();

  const handleGameComplete = () => {
    // Mark study as completed in game state
    markStudiedTonight();
    console.log('Math game completed! Study session finished.');
    // Return to after-school view instead of study page
    router.push('/(tabs)/after-school');
  };

  return <MathGame onComplete={handleGameComplete} />;
}