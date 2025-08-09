import React from 'react';
import { router } from 'expo-router';
import HistoryGame from './minigames/HistoryGame';

export default function HistoryGameScreen() {
  const handleGameComplete = () => {
    // TODO: Mark study as completed in game state
    console.log('History game completed! Study session finished.');
    // Return to market/study flow
    router.back();
  };

  return <HistoryGame onComplete={handleGameComplete} />;
}