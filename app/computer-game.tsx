import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/context/GameContext';
import ComputerGame from './minigames/ComputerGame';

export default function ComputerGameScreen() {
  const { markStudiedTonight } = useGame();

  const handleGameComplete = () => {
    // Mark study as completed in game state
    markStudiedTonight();
    console.log('Computer game completed! Study session finished.');
    // Return to market/study flow
    router.push('/(tabs)/after-school');
  };

  return <ComputerGame onComplete={handleGameComplete} />;
}