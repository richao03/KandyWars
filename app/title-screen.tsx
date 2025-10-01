import React, { useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import StudioTitleScreen from './components/StudioTitleScreen';
import CandyWarsTitleScreen from './components/CandyWarsTitleScreen';
import { useGame } from '../src/hooks/useGame';

export default function TitleScreenPage() {
  const { lastActiveView, periodCount, isInitialized } = useGame();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showStudioScreen, setShowStudioScreen] = useState(true);

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
      console.log('📱 TitleScreen: handleNewGame called with difficulty:', difficulty);
      console.log('📱 TitleScreen: Navigating to market...');
      router.replace('/(tabs)/market');
      console.log('📱 TitleScreen: Navigation command sent');
    } catch (error) {
      console.error('❌ TitleScreen: Error in handleNewGame:', error);
    }
  };

  const handleContinue = () => {
    console.log('🎮 Continue pressed - periodCount:', periodCount, 'isInitialized:', isInitialized);

    // If this is a newly created game (difficulty selected but not started)
    if (isInitialized && periodCount === 0) {
      console.log('🎮 Continuing newly created game - going to story screen');
      router.replace('/story-screen');
      return;
    }

    // Navigate to the last active view for games in progress
    if (lastActiveView === 'after-school') {
      console.log('🎮 Continuing game in progress - going to after-school');
      router.replace('/(tabs)/after-school');
    } else {
      console.log('🎮 Continuing game in progress - going to market');
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