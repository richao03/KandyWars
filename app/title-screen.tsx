import React, { useState, useEffect, useRef } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import StudioTitleScreen from './components/StudioTitleScreen';
import CandyWarsTitleScreen from './components/CandyWarsTitleScreen';
import { useWallet } from '../src/hooks/useWallet';
import { useGame } from '../src/hooks/useGame';
import { useInventory } from '../src/hooks/useInventory';
import { useJokers } from '../src/hooks/useJokers';
import { useFlavorText } from '../src/context/FlavorTextContext';
import { useSeed } from '../src/hooks/useSeed';
import { nameValidationService } from '../src/services/nameValidationService';
import { loadPlayerId } from '../src/utils/persistence';

export default function TitleScreenPage() {
  console.log('🔍 DEBUG: TitleScreenPage rendering/re-rendering');
  const searchParams = useLocalSearchParams();
  const walletContext = useWallet();
  const { resetGame, lastActiveView } = useGame();
  const { resetInventory } = useInventory();
  const { resetJokers } = useJokers();
  const { resetFlavorText } = useFlavorText();
  const { setSeed } = useSeed();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showStudioScreen, setShowStudioScreen] = useState(true);
  const initializeWallet = walletContext?.initializeWallet || (() => {});

  console.log('🔍 DEBUG: TitleScreenPage state - showStudioScreen:', showStudioScreen, 'refreshKey:', refreshKey);

  // Force component refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 DEBUG: Title screen focused');
      // Only refresh if we're showing CandyWars screen, not during studio screen
      if (!showStudioScreen) {
        setRefreshKey(prev => prev + 1);
      }
    }, [showStudioScreen])
  );

  const handleNewGame = async (difficulty: 'easy' | 'medium' | 'hard' | number) => {
    try {
      console.log('📱 TitleScreen: handleNewGame called - game reset will happen after difficulty selection');
      router.replace('/(tabs)/market');
    } catch (error) {
      console.error('Error starting new game:', error);
    }
  };

  const handleContinue = () => {
    // Navigate to the last active view (after-school or market)
    if (lastActiveView === 'after-school') {
      router.replace('/(tabs)/after-school');
    } else {
      router.replace('/(tabs)/market');
    }
  };

  const handleSettings = () => {
    router.push('/title-settings');
  };

  const handleStudioComplete = () => {
    console.log('🎬 DEBUG: Studio completed, showing CandyWars title screen');
    setShowStudioScreen(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* Always render both screens, control visibility */}
      {showStudioScreen && (
        <StudioTitleScreen
          key="studio-screen"
          onComplete={handleStudioComplete}
        />
      )}

      {!showStudioScreen && (
        <CandyWarsTitleScreen
          key={refreshKey}
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onSettings={handleSettings}
        />
      )}
    </View>
  );
}

// No styles needed - components handle their own styling