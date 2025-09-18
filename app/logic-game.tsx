import React from 'react';
import { router } from 'expo-router';
import { useGame } from '../src/context/GameContext';
import LogicGame from './minigames/LogicGame';

export default function LogicGameScreen() {
  const { markStudiedTonight } = useGame();

  const handleGameComplete = () => {
    // Mark study as completed in game state
    markStudiedTonight();
    console.log('Logic game completed! Study session finished.');
    // Return to market/study flow
    router.push('/(tabs)/after-school');
  };

  return <LogicGame onComplete={handleGameComplete} />;
}