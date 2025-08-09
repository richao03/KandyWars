import React from 'react';
import { router } from 'expo-router';
import LogicGame from './minigames/LogicGame';

export default function LogicGameScreen() {
  const handleGameComplete = () => {
    // TODO: Mark study as completed in game state
    console.log('Logic game completed! Study session finished.');
    // Return to market/study flow
    router.back();
  };

  return <LogicGame onComplete={handleGameComplete} />;
}