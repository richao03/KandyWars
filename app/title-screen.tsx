import { CommonActions, useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import colors from '../src/constants/colors';
import { useGame } from '../src/hooks/useGame';
import { MusicController } from '../src/utils/musicController';
import StudioTitleScreen from './components/StudioTitleScreen';
import SugarWarsTitleScreen from './components/SugarWarsTitleScreen';

export default function TitleScreenPage() {
  const { lastActiveView, periodCount, isInitialized } = useGame();
  const [showStudioScreen, setShowStudioScreen] = useState(true);
  const navigation = useNavigation();

  // Play menu music when showing CandyWars title screen
  useEffect(() => {
    // Only play music when showing CandyWars title screen (not studio screen)
    if (!showStudioScreen) {
      MusicController.setTrack('menu');
    }

    // No cleanup needed - next view will set its own music
  }, [showStudioScreen]);

  const handleNewGame = async (
    difficulty: 'easy' | 'medium' | 'hard' | number
  ) => {
    try {
      if (__DEV__) {
        console.log(
          '📱 TitleScreen: handleNewGame called with difficulty:',
          difficulty
        );
        console.log(
          '📱 TitleScreen: Resetting navigation stack and navigating to market...'
        );
      }

      // Music will continue playing until market view is reached

      // Reset the entire navigation state to only have (tabs)/market
      // This ensures all old screen instances are unmounted
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: '(tabs)', params: { screen: 'market' } }],
        })
      );
      if (__DEV__) console.log('📱 TitleScreen: Navigation stack reset complete');
    } catch (error) {
      console.error('❌ TitleScreen: Error in handleNewGame:', error);
    }
  };

  const handleContinue = () => {
    if (__DEV__) console.log(
      '🎮 Continue pressed - periodCount:',
      periodCount,
      'isInitialized:',
      isInitialized
    );

    // Music will continue playing until market view is reached

    // If this is a newly created game (difficulty selected but not started)
    if (isInitialized && periodCount === 0) {
      if (__DEV__) console.log('🎮 Continuing newly created game - going to story screen');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'story-screen' }],
        })
      );
      return;
    }

    // Navigate to the last active view for games in progress
    const targetScreen =
      lastActiveView === 'after-school' ? 'after-school' : 'market';
    if (__DEV__) console.log('🎮 Continuing game in progress - going to', targetScreen);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: '(tabs)', params: { screen: targetScreen } }],
      })
    );
  };

  const handleSettings = () => {
    // Music continues playing in settings
    router.push('/title-settings');
  };

  const handleStudioComplete = () => {
    if (__DEV__) console.log('🎬 DEBUG: Studio completed, showing Sugar Wars title screen');
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
        <SugarWarsTitleScreen
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onSettings={handleSettings}
        />
      )}
    </View>
  );
}

// No styles needed - components handle their own styling
