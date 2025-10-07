import React, { useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import StudioTitleScreen from './components/StudioTitleScreen';
import CandyWarsTitleScreen from './components/CandyWarsTitleScreen';
import { useGame } from '../src/hooks/useGame';
import colors from '../src/constants/colors';


export default function TitleScreenPage() {
  const { lastActiveView, periodCount, isInitialized } = useGame();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showStudioScreen, setShowStudioScreen] = useState(true);
  const navigation = useNavigation();

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
      console.log('📱 TitleScreen: Resetting navigation stack and navigating to market...');

      // Reset the entire navigation state to only have (tabs)/market
      // This ensures all old screen instances are unmounted
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: '(tabs)', params: { screen: 'market' } }],
        })
      );
      console.log('📱 TitleScreen: Navigation stack reset complete');
    } catch (error) {
      console.error('❌ TitleScreen: Error in handleNewGame:', error);
    }
  };

  const handleContinue = () => {
    console.log('🎮 Continue pressed - periodCount:', periodCount, 'isInitialized:', isInitialized);

    // If this is a newly created game (difficulty selected but not started)
    if (isInitialized && periodCount === 0) {
      console.log('🎮 Continuing newly created game - going to story screen');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'story-screen' }],
        })
      );
      return;
    }

    // Navigate to the last active view for games in progress
    const targetScreen = lastActiveView === 'after-school' ? 'after-school' : 'market';
    console.log('🎮 Continuing game in progress - going to', targetScreen);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: '(tabs)', params: { screen: targetScreen } }],
      })
    );
  };

  const handleSettings = () => {
    router.push('/title-settings');
  };

  const handleStudioComplete = () => {
    console.log('🎬 DEBUG: Studio completed, showing CandyWars title screen');
    setShowStudioScreen(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
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