import React from 'react';
import { router } from 'expo-router';
import CandyWarsTitleScreen from './components/CandyWarsTitleScreen';
import { useWallet } from '../src/context/WalletContext';

export default function TitleScreenPage() {
  const { initializeWallet } = useWallet();

  const handleNewGame = (difficulty: 'easy' | 'medium' | 'hard') => {
    initializeWallet(difficulty);
    router.replace('/(tabs)/market');
  };

  const handleContinue = () => {
    router.replace('/(tabs)/market');
  };

  const handleSettings = () => {
    router.push('/(tabs)/settings');
  };

  return (
    <CandyWarsTitleScreen
      onNewGame={handleNewGame}
      onContinue={handleContinue}
      onSettings={handleSettings}
    />
  );
}