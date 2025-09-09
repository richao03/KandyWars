import React, { useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import CandyWarsTitleScreen from './components/CandyWarsTitleScreen';
import { useWallet } from '../src/context/WalletContext';
import { useGame } from '../src/context/GameContext';
import { useInventory } from '../src/context/InventoryContext';
import { useJokers } from '../src/context/JokerContext';
import { useFlavorText } from '../src/context/FlavorTextContext';

export default function TitleScreenPage() {
  const walletContext = useWallet();
  const { resetGame } = useGame();
  const { resetInventory } = useInventory();
  const { resetJokers } = useJokers();
  const { resetFlavorText } = useFlavorText();
  const [refreshKey, setRefreshKey] = useState(0);

  const initializeWallet = walletContext?.initializeWallet || (() => {});

  // Force component refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Title screen focused, refreshing component');
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  const handleNewGame = async (difficulty: 'easy' | 'medium' | 'hard') => {
    try {
      // Reset all game data for a fresh start
      await resetGame();
      
      // Reset all contexts
      resetInventory();
      resetJokers();
      resetFlavorText();
      
      // Initialize wallet with selected difficulty (includes piggy bank debt)
      initializeWallet(difficulty);
      
      router.replace('/(tabs)/market');
    } catch (error) {
      console.error('Error starting new game:', error);
    }
  };

  const handleContinue = () => {
    router.replace('/(tabs)/market');
  };

  const handleSettings = () => {
    router.push('/(tabs)/settings');
  };

  return (
    <CandyWarsTitleScreen
      key={refreshKey} // Force remount when screen comes into focus
      onNewGame={handleNewGame}
      onContinue={handleContinue}
      onSettings={handleSettings}
    />
  );
}