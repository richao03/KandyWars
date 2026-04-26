// app/(tabs)/settings.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import colors from '../../src/constants/colors';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useDailyStats } from '../../src/hooks/useDailyStats';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { scoreboardService } from '../../src/services/firebase';
import { nameValidationService } from '../../src/services/nameValidationService';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { fullResetGame } from '../../src/store/slices/gameSlice';
import { resetHallPasses } from '../../src/store/slices/hallPassSlice';
import {
  setTotalCompletions,
  setWonDifficulties,
} from '../../src/store/slices/scoreboardSlice';
import { resetTutorial } from '../../src/store/slices/tutorialSlice';
import {
  clearCachedUserObject,
  updateCachedUserObject,
} from '../../src/store/slices/userObjectSlice';
import {
  setSoundVolume,
  setMusicVolume,
  selectSoundVolume,
  selectMusicVolume,
} from '../../src/store/slices/settingsSlice';
import {
  toggleReduceMotion,
  selectReduceMotion,
} from '../../src/store/slices/juiceSettingsSlice';
import { SoundEffects } from '../../src/utils/soundEffects';
import { MusicController } from '../../src/utils/musicController';
import { generateSeededGameData } from '../../utils/generateSeededGameData';
import ConfirmationModal from '../components/ConfirmationModal';
import PixelBorder from '../components/PixelBorder';
import { resetFirebaseSession } from '../components/SugarWarsTitleScreen';
import TextWithEmojis from '../components/TextWithEmojis';

function Settings() {
  const { resetGame, jumpToPeriod } = useGame();
  const { setSeed, setGameData } = useSeed();
  const walletContext = useWallet();
  const { resetInventory } = useInventory();
  const { resetJokers } = useJokers();
  const { resetFlavorText } = useFlavorText();
  const { resetPlaythrough } = useDailyStats();
  const dispatch = useAppDispatch();
  const cachedUser = useAppSelector((state) => state.userObject.cachedUser);
  const soundVolume = useAppSelector(selectSoundVolume);
  const musicVolume = useAppSelector(selectMusicVolume);
  const reduceMotion = useAppSelector(selectReduceMotion);

  // Handle potential null wallet context
  const resetWallet = walletContext?.resetWallet || (() => {});
  const initializeWallet = walletContext?.initializeWallet || (() => {});
  const setPlayerName = walletContext?.setPlayerName || (() => {});
  const currentDifficulty = walletContext?.difficulty;
  const currentPlayerName =
    cachedUser?.playerName || walletContext?.playerName || 'Player';
  const [isRestarting, setIsRestarting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isValidatingName, setIsValidatingName] = useState(false);
  const [nameValidationError, setNameValidationError] = useState<string | null>(
    null
  );
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    emoji: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    visible: false,
    title: '',
    message: '',
    emoji: '',
    onConfirm: () => {},
  });

  const resetConfirmModal = () => {
    setConfirmModal({
      visible: false,
      title: '',
      message: '',
      emoji: '',
      onConfirm: () => {},
    });
  };

  const handleRestartGame = () => {
    if (__DEV__) console.log('🔄 Restart button clicked');
    setConfirmModal({
      visible: true,
      title: 'Restart Game',
      message:
        'Are you sure you want to restart the game? This will delete all progress and cannot be undone.',
      confirmText: 'Restart',
      cancelText: 'Cancel',
      onConfirm: async () => {
        if (__DEV__) {
          console.log(
            '✅ Restart confirmed, restarting with current difficulty:',
            currentDifficulty
          );
        }
        // Don't reset modal yet - keep it visible during restart
        setIsRestarting(true);

        try {
          // Reset all game data
          await resetGame();

          // Reset all contexts
          resetInventory();
          resetJokers();
          resetFlavorText();
          resetPlaythrough();

          // Generate new seed for fresh game FIRST (this clears the seed context)
          const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setSeed(newSeed);

          // Generate game data using the seed
          const gameData = generateSeededGameData(newSeed, 40);
          setGameData(gameData);
          if (__DEV__) {
            console.log(
              '🎲 Generated game data with 40 periods:',
              gameData.periodEvents.length,
              'events'
            );
          }

          // Reset wallet completely (don't initialize with difficulty yet - let title screen handle it)
          resetWallet();

          // Show success modal (this replaces the current modal)
          setConfirmModal({
            visible: true,
            title: 'Game Restarted',
            message: `Starting a fresh game! Please select your difficulty.`,
            emoji: '✨',
            confirmText: 'Go to Title Screen',
            onConfirm: () => {
              // Close modal first
              resetConfirmModal();
              // Navigate after modal closes
              setTimeout(() => {
                router.replace('/title-screen');
              }, 200);
            },
            onCancel: () => {
              // Allow closing without navigating
              resetConfirmModal();
            },
          });
        } catch (error) {
          console.error('Error restarting game:', error);
          setConfirmModal({
            visible: true,
            title: 'Error',
            message: 'Failed to restart the game. Please try again.',
            emoji: '❌',
            onConfirm: () => resetConfirmModal(),
            onCancel: () => resetConfirmModal(),
          });
        } finally {
          setIsRestarting(false);
        }
      },
      onCancel: () => {
        if (__DEV__) console.log('❌ Restart canceled');
        resetConfirmModal();
      },
    });
  };

  const handleReturnToTitleScreen = () => {
    if (__DEV__) console.log('🏠 Return to Title Screen button clicked');
    setConfirmModal({
      visible: true,
      title: 'Return to Title Screen',
      message: 'Return to the main menu? Your progress will be saved.',
      emoji: '🏠',
      confirmText: 'Return',
      cancelText: 'Cancel',
      onConfirm: () => {
        if (__DEV__) console.log('✅ Return to title screen confirmed');
        // Navigate to title screen first
        router.replace('/title-screen');
        // Reset modal after navigation
        setTimeout(() => resetConfirmModal(), 100);
      },
      onCancel: () => {
        if (__DEV__) console.log('❌ Return to title screen canceled');
        resetConfirmModal();
      },
    });
  };

  const handleEditName = () => {
    setNewPlayerName(currentPlayerName || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmedName = newPlayerName.trim();

    if (trimmedName.length === 0) {
      Alert.alert('Invalid Name', 'Please enter a valid name.');
      return;
    }

    if (trimmedName.length > 20) {
      Alert.alert(
        'Name Too Long',
        'Please enter a name with 20 characters or less.'
      );
      return;
    }

    // Skip validation if name hasn't changed
    if (trimmedName.toLowerCase() === (currentPlayerName || '').toLowerCase()) {
      setEditingName(false);
      setNewPlayerName('');
      return;
    }

    setIsValidatingName(true);
    setNameValidationError(null);

    try {
      // Update Redux cache with new player name
      dispatch(updateCachedUserObject({ playerName: trimmedName }));
      if (__DEV__) console.log('✅ Player name updated in Redux:', trimmedName);

      // Get updated user object from Redux and sync to service cache
      const updatedUser = cachedUser
        ? { ...cachedUser, playerName: trimmedName }
        : null;
      if (updatedUser) {
        scoreboardService.setCachedUserObject(updatedUser);
        if (__DEV__) console.log('✅ Player name synced to service cache:', updatedUser);

        // Also ensure scoreboard slice is in sync with userObject
        dispatch(setWonDifficulties(updatedUser.difficultyWon));
        dispatch(setTotalCompletions(updatedUser.totalWinCount));
        if (__DEV__) {
          console.log(
            '✅ Scoreboard slice synced:',
            updatedUser.difficultyWon,
            updatedUser.totalWinCount
          );
        }
      }

      // Also update wallet context for backward compatibility
      setPlayerName(trimmedName);

      setEditingName(false);
      setNewPlayerName('');
      setNameValidationError(null);

      Alert.alert(
        'Name Updated',
        `Your name has been changed to "${trimmedName}". It will be saved to the server when you complete a game.`
      );
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Unable to update name. Please try again.');
    } finally {
      setIsValidatingName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditingName(false);
    setNewPlayerName('');
    setNameValidationError(null);
  };

  const handleClearAllData = () => {
    setConfirmModal({
      visible: true,
      title: ' Clear All Data',
      message:
        'WARNING: This will delete ALL saved data including game progress, player name, joker cards, and settings. You will start as a completely new player. This action cannot be undone!',
      emoji: '⚠️',
      confirmText: 'DELETE EVERYTHING',
      cancelText: 'Cancel',
      onConfirm: async () => {
        if (__DEV__) console.log('🗑️ Clearing all data...');
        resetConfirmModal();
        setIsRestarting(true);

        try {
          // Get the current user object before clearing
          const currentPlayerId = walletContext?.playerId;
          const currentPlayerName = walletContext?.playerName;

          // Delete user document from Firebase
          if (__DEV__) console.log('🗑️ Deleting user document from Firebase...');
          try {
            await scoreboardService.initializeAuth();
            await scoreboardService.deleteUserObject();
            if (__DEV__) console.log('✅ User document deleted from Firebase');
          } catch (error) {
            console.error(
              '❌ Failed to delete user document from Firebase:',
              error
            );
          }

          // Clear the Firebase name association if we have a player ID
          if (currentPlayerId && currentPlayerName) {
            if (__DEV__) {
              console.log(
                '🗑️ Clearing Firebase name association for:',
                currentPlayerId
              );
            }
            try {
              await nameValidationService.clearPlayerName(
                currentPlayerId,
                currentPlayerName
              );
            } catch (error) {
              console.error('Failed to clear Firebase name:', error);
            }
          }

          // STEP 1: Reset all Redux slices FIRST (in memory)
          dispatch(resetHallPasses());
          dispatch(clearCachedUserObject());
          dispatch(setWonDifficulties([]));
          dispatch(setTotalCompletions(0));
          if (__DEV__) console.log('✅ All Redux slices reset in memory');

          // STEP 2: Reset all game contexts
          dispatch(fullResetGame()); // Use fullResetGame to clear isInitialized
          resetWallet();
          resetInventory();
          resetJokers();
          resetFlavorText();
          resetPlaythrough();
          if (__DEV__) console.log('✅ All game contexts reset');

          // STEP 3: Clear service cache and Firebase session
          scoreboardService.clearUserObjectCache();
          resetFirebaseSession(); // Reset session flag so Firebase re-initializes
          if (__DEV__) console.log('✅ Service cache and Firebase session cleared');

          // STEP 4: Clear ALL AsyncStorage data
          const allKeys = await AsyncStorage.getAllKeys();
          if (__DEV__) console.log('🗑️ Found keys to clear:', allKeys);
          await AsyncStorage.multiRemove(allKeys);

          // Clear AsyncStorage again with specific keys to make sure
          const specificKeys = [
            'candyWarz_playerId',
            'playerName',
            'wallet_balance',
            'wallet_difficulty',
            'wallet_piggyBank',
            'game_state',
            'inventory',
            'jokers',
            'flavor_text_shown',
            'persist:root', // Redux persist key
          ];

          await AsyncStorage.multiRemove(specificKeys);
          if (__DEV__) console.log('✅ AsyncStorage cleared');

          // Generate new seed
          const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setSeed(newSeed);

          // Generate game data using the seed
          const gameData = generateSeededGameData(newSeed, 40);
          setGameData(gameData);
          if (__DEV__) {
            console.log(
              '🎲 Generated game data with 40 periods:',
              gameData.periodEvents.length,
              'events'
            );
          }

          if (__DEV__) console.log('✅ All data cleared successfully');

          // Add a delay to ensure all operations complete
          await new Promise((resolve) => setTimeout(resolve, 500));

          if (__DEV__) console.log('✅ Navigating to root as new player');

          // Navigate to root which should show the title screen
          router.replace('/');
        } catch (error) {
          console.error('Failed to clear all data:', error);
          Alert.alert('Error', 'Failed to clear all data. Please try again.');
          setIsRestarting(false);
        }
      },
      onCancel: () => {
        if (__DEV__) console.log('❌ Clear all data canceled');
        resetConfirmModal();
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <PixelBorder
          borderColor="#ff91a4"
          borderWidth={4}
          backgroundColor="#ffc0cb"
          innerPadding={24}
          style={styles.sectionWrapper}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎮 Player Info</Text>

            <View style={styles.playerInfoContainer}>
              <Text style={styles.playerInfoLabel}>Player Name:</Text>
              {editingName ? (
                <View style={styles.nameEditContainer}>
                  <TextInput
                    style={[
                      styles.nameInput,
                      nameValidationError && styles.nameInputError,
                    ]}
                    value={newPlayerName}
                    onChangeText={(text) => {
                      setNewPlayerName(text);
                      setNameValidationError(null); // Clear error when user types
                    }}
                    placeholder="Enter your name"
                    placeholderTextColor="#999"
                    maxLength={20}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    editable={!isValidatingName}
                  />

                  {nameValidationError && (
                    <Text style={styles.nameErrorText}>
                      {nameValidationError}
                    </Text>
                  )}
                  <View style={styles.nameButtonContainer}>
                    <PixelBorder
                      borderColor="#4a7c4a"
                      borderWidth={2}
                      backgroundColor="#d4f6d4"
                      innerPadding={0}
                      style={{ flex: 1 }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.nameButton,
                          isValidatingName && styles.disabledNameButton,
                        ]}
                        onPress={handleSaveName}
                        disabled={isValidatingName}
                      >
                        {isValidatingName ? (
                          <View style={styles.nameLoadingContainer}>
                            <ActivityIndicator size="small" color="#2d5a2d" />
                            <Text style={styles.saveButtonText}>
                              Checking...
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.saveButtonText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </PixelBorder>

                    <PixelBorder
                      borderColor="#ef4444"
                      borderWidth={2}
                      backgroundColor="#fee2e2"
                      innerPadding={0}
                      style={{ flex: 1 }}
                    >
                      <TouchableOpacity
                        style={styles.nameButton}
                        onPress={handleCancelEditName}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </PixelBorder>
                  </View>
                </View>
              ) : (
                <View style={styles.nameDisplayContainer}>
                  <Text style={styles.playerNameText}>
                    {currentPlayerName || 'Player'}
                  </Text>
                  <TouchableOpacity
                    style={styles.editNameButton}
                    onPress={handleEditName}
                  >
                    <Text style={styles.editNameButtonText}>✏️ Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </PixelBorder>

        <PixelBorder
          borderColor="#b088f9"
          borderWidth={4}
          backgroundColor="#d9c4ff"
          innerPadding={24}
          style={styles.sectionWrapper}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔊 Audio</Text>

            <View style={styles.volumeRow}>
              <Text style={styles.volumeLabel}>Music</Text>
              <Slider
                style={styles.volumeSlider}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={musicVolume}
                onValueChange={(val: number) => {
                  dispatch(setMusicVolume(val));
                  MusicController.setVolume(val);
                }}
                minimumTrackTintColor="#b088f9"
                maximumTrackTintColor="#ccc"
                thumbTintColor="#7c3aed"
              />
              <Text style={styles.volumeValue}>{Math.round(musicVolume * 100)}%</Text>
            </View>

            <View style={styles.volumeRow}>
              <Text style={styles.volumeLabel}>SFX</Text>
              <Slider
                style={styles.volumeSlider}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={soundVolume}
                onValueChange={(val: number) => {
                  dispatch(setSoundVolume(val));
                  SoundEffects.setVolume(val);
                }}
                minimumTrackTintColor="#b088f9"
                maximumTrackTintColor="#ccc"
                thumbTintColor="#7c3aed"
              />
              <Text style={styles.volumeValue}>{Math.round(soundVolume * 100)}%</Text>
            </View>
          </View>
        </PixelBorder>

        <PixelBorder
          borderColor="#80d4f0"
          borderWidth={4}
          backgroundColor="#c2ecfa"
          innerPadding={24}
          style={styles.sectionWrapper}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>♿ Accessibility</Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Reduce Motion</Text>
                <Text style={styles.toggleDescription}>
                  Simpler animations and flashes
                </Text>
              </View>
              <Switch
                value={reduceMotion}
                onValueChange={(_val: boolean) => {
                  dispatch(toggleReduceMotion());
                }}
                trackColor={{ false: '#ccc', true: '#80d4f0' }}
                thumbColor={reduceMotion ? '#0099cc' : '#f4f3f4'}
              />
            </View>
          </View>
        </PixelBorder>

        <PixelBorder
          borderColor="#ff85c0"
          borderWidth={4}
          backgroundColor="#ffb3d9"
          innerPadding={24}
          style={styles.sectionWrapper}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎮 Game Controls</Text>

            <PixelBorder
              borderColor="#66b3ff"
              borderWidth={4}
              backgroundColor="#b3d9ff"
              innerPadding={0}
              style={styles.buttonWrapper}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={handleReturnToTitleScreen}
              >
                <View style={styles.titleScreenButtonRow}>
                  <Image
                    source={require('../../assets/images/emojis/home.png')}
                    style={styles.titleScreenButtonIcon}
                  />
                  <Text style={styles.titleScreenButtonText}>
                    Return to Title Screen
                  </Text>
                </View>
                <Text style={styles.buttonSubtext}>
                  Go back to main menu (progress saved)
                </Text>
              </TouchableOpacity>
            </PixelBorder>

            <PixelBorder
              borderColor="#ff8080"
              borderWidth={4}
              backgroundColor="#ffb3b3"
              innerPadding={0}
              style={styles.buttonWrapper}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={handleRestartGame}
                disabled={isRestarting}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {!isRestarting && (
                    <Image
                      source={require('../../assets/images/emojis/refresh.png')}
                      style={{
                        width: 24,
                        height: 24,
                        resizeMode: 'contain',
                        marginRight: 6,
                      }}
                    />
                  )}
                  <Text style={styles.dangerButtonText}>
                    {isRestarting ? 'Restarting...' : 'Restart Game'}
                  </Text>
                </View>
                <Text style={styles.buttonSubtext}>
                  Delete all progress and start fresh
                </Text>
              </TouchableOpacity>
            </PixelBorder>

            {__DEV__ && (
              <PixelBorder
                borderColor="#ff9800"
                borderWidth={3}
                backgroundColor="#ffa726"
                innerPadding={0}
                style={styles.buttonWrapper}
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    jumpToPeriod(32); // Day 5, Period 1 (32 = 4 days * 8 periods)
                    router.push('/(tabs)/market');
                  }}
                >
                  <Text style={styles.dangerButtonText}>
                    🐛 DEBUG: Jump to Day 5
                  </Text>
                  <Text style={styles.buttonSubtext}>
                    Skip to day 5 for testing
                  </Text>
                </TouchableOpacity>
              </PixelBorder>
            )}

            <PixelBorder
              borderColor="#ff80bf"
              borderWidth={4}
              backgroundColor="#ffe6f0"
              innerPadding={0}
              style={styles.buttonWrapper}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={handleClearAllData}
                disabled={isRestarting}
              >
                <Text style={styles.clearDataButtonText}>
                  {isRestarting ? 'Clearing...' : '🗑️ Clear All Data'}
                </Text>
                <Text style={styles.buttonSubtext}>
                  Start as a completely new player
                </Text>
              </TouchableOpacity>
            </PixelBorder>
          </View>
        </PixelBorder>

        <PixelBorder
          borderColor="#c79fff"
          borderWidth={4}
          backgroundColor="#e6d5ff"
          innerPadding={24}
          style={styles.sectionWrapper}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Leaderboard</Text>
            <PixelBorder
              borderColor="#b366ff"
              borderWidth={4}
              backgroundColor="#d9b3ff"
              innerPadding={0}
              style={styles.buttonWrapper}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.push('/leaderboard')}
              >
                <TextWithEmojis
                  style={styles.leaderboardButtonText}
                  imageSize={24}
                >
                  🏆 View Leaderboard
                </TextWithEmojis>
                <Text style={styles.buttonSubtext}>
                  See how you rank against other players
                </Text>
              </TouchableOpacity>
            </PixelBorder>
          </View>
        </PixelBorder>

        {__DEV__ && (
          <PixelBorder
            borderColor="#a855f7"
            borderWidth={2}
            backgroundColor="rgba(243, 232, 255, 0.8)"
            innerPadding={20}
            style={styles.sectionWrapper}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔧 Debug Tools</Text>
              <PixelBorder
                borderColor="#a855f7"
                borderWidth={3}
                backgroundColor="#f3e8ff"
                innerPadding={0}
              >
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={() => {
                    if (__DEV__) {
                      console.log(
                        '🔧 DEBUG: Getting total completions from cache...'
                      );
                    }
                    const total = scoreboardService.getTotalWinCount();
                    if (__DEV__) console.log('🏆 TOTAL WIN COUNT FROM CACHE:', total);
                    Alert.alert(
                      'Total Win Count',
                      `You have won ${total} game(s)`,
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text style={styles.debugButtonText}>
                    Show Total Completions
                  </Text>
                </TouchableOpacity>
              </PixelBorder>
              <View style={{ height: 8 }} />
              <PixelBorder
                borderColor="#a855f7"
                borderWidth={3}
                backgroundColor="#f3e8ff"
                innerPadding={0}
              >
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={() => {
                    dispatch(resetTutorial());
                    Alert.alert(
                      'Tutorial Reset',
                      'Tutorial will show again on next difficulty 1 game.',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text style={styles.debugButtonText}>Reset Tutorial</Text>
                </TouchableOpacity>
              </PixelBorder>
              <View style={{ height: 8 }} />
              <PixelBorder
                borderColor="#a855f7"
                borderWidth={3}
                backgroundColor="#f3e8ff"
                innerPadding={0}
              >
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={() => router.push('/debug-minigames' as any)}
                >
                  <Text style={styles.debugButtonText}>🎮 Minigame Picker</Text>
                </TouchableOpacity>
              </PixelBorder>
              <View style={{ height: 8 }} />
              <PixelBorder
                borderColor="#a855f7"
                borderWidth={3}
                backgroundColor="#f3e8ff"
                innerPadding={0}
              >
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={() => router.push('/debug-tier-preview' as any)}
                >
                  <Text style={styles.debugButtonText}>🎨 Sale Tier Preview</Text>
                </TouchableOpacity>
              </PixelBorder>
            </View>
          </PixelBorder>
        )}

        <PixelBorder
          borderColor="#66e0b8"
          borderWidth={4}
          backgroundColor="#b3f0d9"
          innerPadding={24}
          style={styles.sectionWrapper}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ℹ️ About</Text>
            <Text style={styles.aboutText}>
              Sugar Wars - The ultimate school trading simulation game
            </Text>
            <Text style={styles.aboutText}>
              Build your candy empire, collect jokers, and dominate the market!
            </Text>
          </View>
        </PixelBorder>
      </ScrollView>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        emoji={confirmModal.emoji}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel || (() => resetConfirmModal())}
        theme="school"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff5f7', // Cotton Candy Pink background
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionWrapper: {
    marginBottom: 24,
  },
  section: {
    // PixelBorder now handles background and padding
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#cc2a6f', // Cherry Blossom
    marginBottom: 18,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4a2080',
    fontFamily: 'PixeloidMono',
    width: 50,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  volumeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a2080',
    fontFamily: 'PixeloidMono',
    width: 40,
    textAlign: 'right',
  },
  buttonWrapper: {
    marginBottom: 10,
  },
  button: {
    padding: 20,
    alignItems: 'center',
  },
  titleScreenButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc', // Blueberry Ice
    marginBottom: 6,
    fontFamily: 'PixeloidMono',
  },
  titleScreenButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleScreenButtonIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginRight: 8,
  },
  dangerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#cc3333', // Coral Candy
    marginBottom: 6,
    fontFamily: 'PixeloidMono',
  },
  buttonSubtext: {
    fontSize: 12,
    color: '#6b5b73', // Neutral darker gray
    fontStyle: 'italic',
    fontFamily: 'PixeloidMono',
  },
  aboutText: {
    fontSize: 15,
    color: '#00a372',
    lineHeight: 24,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  leaderboardButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7700cc', // Grape Soda
    marginBottom: 6,
    fontFamily: 'PixeloidMono',
  },
  clearDataButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff1493',
    fontFamily: 'PixeloidMono',
  },
  // Player info styles
  playerInfoContainer: {
    marginBottom: 15,
  },
  playerInfoLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b0045',
    marginBottom: 12,
    fontFamily: 'PixeloidMono',
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 16,
    borderWidth: 3,
    borderColor: '#ff91a4',
    borderRadius: 8,
  },
  playerNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8b0045',
    fontFamily: 'PixeloidMono',
    flex: 1,
  },
  editNameButton: {
    backgroundColor: '#d6e8ff',
    borderWidth: 1,
    borderColor: '#5c7cb8',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editNameButtonText: {
    fontSize: 14,
    color: '#4a5a8a',
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  nameEditContainer: {
    gap: 10,
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 3,
    borderColor: '#ff91a4',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: 'PixeloidMono',
    color: '#8b0045',
  },
  nameButtonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  nameButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5a2d',
    fontFamily: 'PixeloidMono',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red.error,
    fontFamily: 'PixeloidMono',
  },
  nameInputError: {
    borderColor: colors.red.error,
    borderWidth: 3,
  },
  nameErrorText: {
    color: colors.red.error,
    fontSize: 12,
    fontFamily: 'PixeloidMono',
    marginTop: 5,
    marginBottom: 5,
  },
  disabledNameButton: {
    opacity: 0.6,
  },
  nameLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#005f80',
    fontFamily: 'PixeloidMono',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#3a6b7a',
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
  },
  debugButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#7e22ce',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
});

export default React.memo(Settings);
