// app/(tabs)/settings.tsx
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { scoreboardService } from '../../src/services/firebase';
import { nameValidationService } from '../../src/services/nameValidationService';
import ConfirmationModal from '../components/ConfirmationModal';
import GameHUD from '../components/GameHUD';
import TextWithEmojis from '../components/TextWithEmojis';

export default function Settings() {
  const { resetGame } = useGame();
  const { setSeed } = useSeed();
  const walletContext = useWallet();
  const { resetInventory } = useInventory();
  const { resetJokers } = useJokers();
  const { resetFlavorText } = useFlavorText();

  // Handle potential null wallet context
  const resetWallet = walletContext?.resetWallet || (() => {});
  const initializeWallet = walletContext?.initializeWallet || (() => {});
  const setPlayerName = walletContext?.setPlayerName || (() => {});
  const currentDifficulty = walletContext?.difficulty;
  const currentPlayerName = walletContext?.playerName;
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
    console.log('🔄 Restart button clicked');
    setConfirmModal({
      visible: true,
      title: 'Restart Game',
      message:
        'Are you sure you want to restart the game? This will delete all progress and cannot be undone.',
      emoji: '🔄',
      confirmText: 'Restart',
      cancelText: 'Cancel',
      onConfirm: async () => {
        console.log(
          '✅ Restart confirmed, restarting with current difficulty:',
          currentDifficulty
        );
        resetConfirmModal();
        setIsRestarting(true);

        try {
          // Reset all game data
          await resetGame();

          // Reset all contexts
          resetInventory();
          resetJokers();
          resetFlavorText();

          // Generate new seed for fresh game FIRST (this clears the seed context)
          const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setSeed(newSeed);

          // Reset wallet completely (don't initialize with difficulty yet - let title screen handle it)
          resetWallet();

          // Show success modal
          setConfirmModal({
            visible: true,
            title: 'Game Restarted',
            message: `Starting a fresh game! Please select your difficulty.`,
            emoji: '✨',
            onConfirm: () => {
              resetConfirmModal();
              // Navigate to title screen to properly start a new game
              router.replace('/title-screen');
            },
          });
        } catch (error) {
          console.error('Error restarting game:', error);
          setConfirmModal({
            visible: true,
            title: 'Error',
            message: 'Failed to restart the game. Please try again.',

            onConfirm: () => resetConfirmModal(),
          });
        } finally {
          setIsRestarting(false);
        }
      },
      onCancel: () => {
        console.log('❌ Restart canceled');
        resetConfirmModal();
      },
    });
  };

  const handleReturnToTitleScreen = () => {
    console.log('🏠 Return to Title Screen button clicked');
    setConfirmModal({
      visible: true,
      title: 'Return to Title Screen',
      message: 'Return to the main menu? Your progress will be saved.',
      emoji: '🏠',
      confirmText: 'Return',
      cancelText: 'Cancel',
      onConfirm: () => {
        console.log('✅ Return to title screen confirmed');
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        // Navigate to title screen
        router.replace('/title-screen');
      },
      onCancel: () => {
        console.log('❌ Return to title screen canceled');
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

    // Validate name uniqueness
    setIsValidatingName(true);
    setNameValidationError(null);

    try {
      // Initialize Firebase services
      await scoreboardService.initialize();

      // Get player ID from wallet context
      const currentPlayerId = walletContext?.playerId;
      if (!currentPlayerId) {
        Alert.alert('Error', 'Player ID not found. Please restart the game.');
        setIsValidatingName(false);
        return;
      }

      // Check if name is available
      const isAvailable = await nameValidationService.isNameAvailable(
        trimmedName,
        currentPlayerId
      );

      if (!isAvailable) {
        setNameValidationError(
          'This name is already taken. Please choose a different name.'
        );
        setIsValidatingName(false);
        return;
      }

      // Update name in Firebase
      const nameUpdated = await nameValidationService.updatePlayerName(
        currentPlayerName || '',
        trimmedName,
        currentPlayerId
      );

      if (nameUpdated) {
        // Update local state
        setPlayerName(trimmedName);
        setEditingName(false);
        setNewPlayerName('');
        setNameValidationError(null);

        Alert.alert(
          'Name Updated',
          `Your name has been changed to "${trimmedName}".`
        );
      } else {
        Alert.alert(
          'Update Failed',
          'Failed to update your name. Please try again.'
        );
      }
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
      title: '⚠️ Clear All Data',
      message:
        'WARNING: This will delete ALL saved data including game progress, player name, joker cards, and settings. You will start as a completely new player. This action cannot be undone!',
      emoji: '🗑️',
      confirmText: 'DELETE EVERYTHING',
      cancelText: 'Cancel',
      onConfirm: async () => {
        console.log('🗑️ Clearing all data...');
        resetConfirmModal();
        setIsRestarting(true);

        try {
          // Get the current player ID before clearing
          const currentPlayerId = walletContext?.playerId;
          const currentPlayerName = walletContext?.playerName;

          // Clear the Firebase name association if we have a player ID
          if (currentPlayerId && currentPlayerName) {
            console.log(
              '🗑️ Clearing Firebase name association for:',
              currentPlayerId
            );
            try {
              await nameValidationService.clearPlayerName(
                currentPlayerId,
                currentPlayerName
              );
            } catch (error) {
              console.error('Failed to clear Firebase name:', error);
            }
          }

          // Clear ALL AsyncStorage data
          const allKeys = await AsyncStorage.getAllKeys();
          console.log('🗑️ Found keys to clear:', allKeys);
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
          ];

          await AsyncStorage.multiRemove(specificKeys);

          // Reset all game contexts
          await resetGame();
          resetWallet();
          resetInventory();
          resetJokers();
          resetFlavorText();

          // Generate new seed
          const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setSeed(newSeed);

          console.log('✅ All data cleared successfully');

          // Add a delay to ensure all operations complete
          await new Promise((resolve) => setTimeout(resolve, 500));

          console.log('✅ Navigating to root as new player');

          // Navigate to root which should show the title screen
          router.replace('/');
        } catch (error) {
          console.error('Failed to clear all data:', error);
          Alert.alert('Error', 'Failed to clear all data. Please try again.');
          setIsRestarting(false);
        }
      },
      onCancel: () => {
        console.log('❌ Clear all data canceled');
        resetConfirmModal();
      },
    });
  };

  return (
    <View style={styles.container}>
      <GameHUD
        customHeaderText="Game Settings"
        customLocationText="Principal's Office"
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Player Info</Text>

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
                  <TouchableOpacity
                    style={[
                      styles.nameButton,
                      styles.saveButton,
                      isValidatingName && styles.disabledNameButton,
                    ]}
                    onPress={handleSaveName}
                    disabled={isValidatingName}
                  >
                    {isValidatingName ? (
                      <View style={styles.nameLoadingContainer}>
                        <ActivityIndicator size="small" color="#2d5a2d" />
                        <Text style={styles.saveButtonText}>Checking...</Text>
                      </View>
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.nameButton, styles.cancelButton]}
                    onPress={handleCancelEditName}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Controls</Text>

          <TouchableOpacity
            style={[styles.button, styles.titleScreenButton]}
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

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleRestartGame}
            disabled={isRestarting}
          >
            <Text style={styles.dangerButtonText}>
              {isRestarting ? 'Restarting...' : '🔄 Restart Game'}
            </Text>
            <Text style={styles.buttonSubtext}>
              Delete all progress and start fresh
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearDataButton]}
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beta Leaderboard</Text>
          <TouchableOpacity
            style={[styles.button, styles.leaderboardButton]}
            onPress={() => router.push('/leaderboard')}
          >
            <TextWithEmojis style={styles.leaderboardButtonText}>
              🏆 View Leaderboard
            </TextWithEmojis>
            <Text style={styles.buttonSubtext}>
              See how you rank against other players
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            CandyWarz - The ultimate school trading simulation game
          </Text>
          <Text style={styles.aboutText}>
            Build your candy empire, collect jokers, and dominate the market!
          </Text>
        </View>
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
    backgroundColor: '#fef7e7', // Warm paper background
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#d4a574', // Brown crayon border
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6b4423', // Dark brown
    marginBottom: 15,
    fontFamily: 'PixeloidMono',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  titleScreenButton: {
    backgroundColor: '#dbeafe', // Light blue background
    borderWidth: 2,
    borderColor: '#3b82f6', // Blue border
  },
  titleScreenButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8', // Dark blue text
    marginBottom: 4,
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
  dangerButton: {
    backgroundColor: '#fee2e2', // Light red background
    borderWidth: 2,
    borderColor: '#ef4444', // Red border
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626', // Dark red text
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 12,
    color: '#6b5b73', // Neutral darker gray
    fontStyle: 'italic',
  },
  aboutText: {
    fontSize: 14,
    color: '#8b5a3c',
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  leaderboardButton: {
    backgroundColor: '#f3e8ff', // Light purple background
    borderWidth: 2,
    borderColor: '#fbbf24', // Gold border
  },
  leaderboardButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7c2d93', // Dark purple text
    marginBottom: 4,
  },
  tutorialButton: {
    backgroundColor: '#f3e8ff', // Light purple background
    borderWidth: 2,
    borderColor: '#9333ea', // Purple border
  },
  tutorialButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7c2d93', // Dark purple text
    marginBottom: 4,
  },
  clearDataButton: {
    backgroundColor: '#8b0000', // Dark red
    borderColor: '#660000',
    shadowColor: '#440000',
  },
  clearDataButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'PixeloidMono',
  },
  // Player info styles
  playerInfoContainer: {
    marginBottom: 15,
  },
  playerInfoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b4423',
    marginBottom: 10,
    fontFamily: 'PixeloidMono',
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef7e7',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d4a574',
  },
  playerNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    flex: 1,
  },
  editNameButton: {
    backgroundColor: '#d6e8ff',
    borderWidth: 1,
    borderColor: '#5c7cb8',
    borderRadius: 6,
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
    backgroundColor: '#fef7e7',
    borderWidth: 2,
    borderColor: '#d4a574',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    color: '#6b4423',
  },
  nameButtonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  nameButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  saveButton: {
    backgroundColor: '#d4f6d4',
    borderColor: '#4a7c4a',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5a2d',
    fontFamily: 'PixeloidMono',
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    fontFamily: 'PixeloidMono',
  },
  nameInputError: {
    borderColor: '#ef4444',
    borderWidth: 3,
  },
  nameErrorText: {
    color: '#dc2626',
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
});
