import React from 'react';
import RecessGame from './minigames/RecessGame';
import { useRouter } from 'expo-router';
import { useGame } from '../src/hooks/useGame';

export default function RecessGameScreen() {
  const router = useRouter();
  const { markStudiedTonight } = useGame();

  const handleComplete = () => {
    // Mark study as completed in game state
    markStudiedTonight();
    console.log('Recess game completed! Going back to previous screen...');
    router.push('/(tabs)/after-school');
  };

  return <RecessGame onComplete={handleComplete} />;
}