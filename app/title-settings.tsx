import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWallet } from '../src/hooks/useWallet';
import { scoreboardService } from '../src/services/firebase';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import { resetHallPasses } from '../src/store/slices/hallPassSlice';
import {
  setTotalCompletions,
  setWonDifficulties,
} from '../src/store/slices/scoreboardSlice';
import {
  clearCachedUserObject,
  setCachedUserObject,
  updateCachedUserObject,
} from '../src/store/slices/userObjectSlice';
import ConfirmationModal from './components/ConfirmationModal';
import PixelBorder from './components/PixelBorder';
import { resetFirebaseSession } from './components/SugarWarsTitleScreen';
import TextWithEmojis from './components/TextWithEmojis';

export default function TitleSettings() {
  const walletContext = useWallet();
  const dispatch = useAppDispatch();
  const cachedUser = useAppSelector((state) => state.userObject.cachedUser);

  const [isResetting, setIsResetting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirmModal = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    setConfirmModal({
      visible: true,
      title,
      message,
      onConfirm,
    });
  };

  const hideConfirmModal = () => {
    setConfirmModal({
      visible: false,
      title: '',
      message: '',
      onConfirm: () => {},
    });
  };

  const handleEditName = () => {
    setNewPlayerName(cachedUser?.playerName || 'Player');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Player name cannot be empty');
      return;
    }

    try {
      // Update Redux cache with new player name
      dispatch(updateCachedUserObject({ playerName: trimmedName }));
      console.log('✅ Player name updated in Redux:', trimmedName);

      // Sync to service cache
      const updatedUser = cachedUser
        ? { ...cachedUser, playerName: trimmedName }
        : null;
      if (updatedUser) {
        scoreboardService.setCachedUserObject(updatedUser);
        console.log('✅ Player name synced to service cache');

        // Also ensure scoreboard slice is in sync
        dispatch(setWonDifficulties(updatedUser.difficultyWon));
        dispatch(setTotalCompletions(updatedUser.totalWinCount));
      }

      setEditingName(false);
      setNewPlayerName('');

      Alert.alert(
        'Name Updated',
        `Your name has been changed to "${trimmedName}". It will be saved to the server when you complete a game.`
      );
    } catch (error) {
      console.error('❌ Failed to update player name:', error);
      Alert.alert('Error', 'Failed to update player name. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNewPlayerName('');
  };

  const handleViewLeaderboard = () => {
    router.push('/leaderboard');
  };

  // Load user object from Firebase when component mounts
  useEffect(() => {
    const loadUserObject = async () => {
      if (cachedUser) {
        console.log('✅ User object already cached:', cachedUser);
        return;
      }

      setIsLoading(true);
      try {
        console.log('📊 Loading user object from Firebase...');
        await scoreboardService.initializeAuth();
        const userObject = await scoreboardService.fetchUserObject();

        console.log('✅ User object loaded:', userObject);
        dispatch(setCachedUserObject(userObject));
        dispatch(setWonDifficulties(userObject.difficultyWon));
        dispatch(setTotalCompletions(userObject.totalWinCount));
      } catch (error) {
        console.error('❌ Failed to load user object:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserObject();
  }, [dispatch, cachedUser]);

  const handleResetAllData = async () => {
    showConfirmModal(
      'Reset All Data',
      'This will permanently delete ALL your game data including:\n\n• All saved games\n• Player names\n• Hall Passes\n• Settings\n• Firebase data\n\nThis action cannot be undone. Are you sure?',
      async () => {
        try {
          setIsResetting(true);
          console.log('🗑️ Clearing all data...');

          // Delete user document from Firebase
          console.log('🗑️ Deleting user document from Firebase...');
          try {
            await scoreboardService.initializeAuth();
            await scoreboardService.deleteUserObject();
            console.log('✅ User document deleted from Firebase');
          } catch (error) {
            console.error(
              '❌ Failed to delete user document from Firebase:',
              error
            );
          }

          // STEP 1: Reset all Redux slices FIRST (in memory)
          dispatch(resetHallPasses());
          dispatch(clearCachedUserObject());
          dispatch(setWonDifficulties([]));
          dispatch(setTotalCompletions(0));
          console.log('✅ All Redux slices reset in memory');

          // STEP 2: Reset wallet context completely (including username and player ID)
          if (walletContext) {
            await walletContext.completeReset();
            console.log(
              '✅ Wallet completely reset including username and player ID'
            );
          }

          // STEP 3: Clear service cache and Firebase session
          scoreboardService.clearUserObjectCache();
          resetFirebaseSession(); // Reset session flag so Firebase re-initializes
          console.log('✅ Service cache and Firebase session cleared');

          // STEP 4: Clear ALL AsyncStorage data
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
            'persist:root', // Redux persist key
          ];

          await AsyncStorage.multiRemove(specificKeys);
          console.log('✅ AsyncStorage cleared');

          console.log('✅ All data cleared successfully');

          Alert.alert(
            'Data Reset Complete',
            'All game data has been permanently deleted. Please restart the app to complete the reset.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate back to title screen which will reload with fresh state
                  router.replace('/title-screen');
                },
              },
            ]
          );
        } catch (error) {
          console.error('❌ Error during data reset:', error);
          Alert.alert('Error', 'Failed to reset data. Please try again.');
        } finally {
          setIsResetting(false);
          hideConfirmModal();
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#D2691E"
        translucent={true}
      />

      {/* Header */}
      <View style={styles.header}>
        <PixelBorder
          borderColor="#ff85c0"
          borderWidth={3}
          backgroundColor="rgba(255, 255, 255, 0.4)"
          innerPadding={0}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </PixelBorder>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 90 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Player Profile */}
        <View style={styles.section}>
          <TextWithEmojis imageSize={42} style={styles.sectionTitle}>
            🎮 Player Profile
          </TextWithEmojis>

          <PixelBorder
            borderColor="#ff91a4"
            borderWidth={4}
            backgroundColor="#ffc0cb"
            innerPadding={0}
          >
            {isLoading ? (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingTitle}>Player Name</Text>
                  <Text style={styles.settingDescription}>Loading...</Text>
                </View>
                <ActivityIndicator size="small" color="#ff91a4" />
              </View>
            ) : editingName ? (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingTitle}>Edit Player Name</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={newPlayerName}
                    onChangeText={setNewPlayerName}
                    placeholder="Enter your name"
                    placeholderTextColor="#6b7280"
                    maxLength={20}
                    autoCapitalize="words"
                    autoFocus
                  />
                  <View style={styles.nameActions}>
                    <TouchableOpacity
                      style={[styles.nameButton, styles.saveButton]}
                      onPress={handleSaveName}
                    >
                      <Text style={styles.nameButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nameButton, styles.cancelButton]}
                      onPress={handleCancelEdit}
                    >
                      <Text style={styles.nameButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleEditName}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingTitle}>Player Name</Text>
                  <Text style={styles.settingDescription}>
                    {cachedUser?.playerName || 'Player'}
                  </Text>
                </View>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            )}
          </PixelBorder>

          <PixelBorder
            borderColor="#ffb380"
            borderWidth={4}
            backgroundColor="#ffdab9"
            innerPadding={0}
          >
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleViewLeaderboard}
            >
              <View style={styles.settingLeft}>
                <TextWithEmojis style={styles.settingTitle}>
                  View Leaderboard
                </TextWithEmojis>
                <Text style={styles.settingDescription}>
                  See how you rank against other players
                </Text>
              </View>
              <Text style={styles.actionText}>View →</Text>
            </TouchableOpacity>
          </PixelBorder>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <TextWithEmojis imageSize={42} style={styles.sectionTitle}>
            📊 Data Management
          </TextWithEmojis>

          <PixelBorder
            borderColor="#ff8080"
            borderWidth={4}
            backgroundColor="#ffb3b3"
            innerPadding={0}
          >
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleResetAllData}
              disabled={isResetting}
            >
              <View style={styles.settingLeft}>
                <Text style={[styles.settingTitle, styles.dangerText]}>
                  Reset All Data
                </Text>
                <Text style={styles.settingDescription}>
                  Permanently delete all game data and settings
                </Text>
              </View>
              {isResetting ? (
                <ActivityIndicator size="small" color="#cc3333" />
              ) : (
                <Text style={[styles.actionText, styles.dangerText]}>
                  Delete
                </Text>
              )}
            </TouchableOpacity>
          </PixelBorder>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <TextWithEmojis imageSize={42} style={styles.sectionTitle}>
            🗣️ About
          </TextWithEmojis>

          <PixelBorder
            borderColor="#66e0b8"
            borderWidth={4}
            backgroundColor="#b3f0d9"
            innerPadding={0}
          >
            <View style={styles.infoItem}>
              <TextWithEmojis style={styles.infoTitle}>
                Candy Warz
              </TextWithEmojis>
              <Text style={styles.infoDescription}>
                A strategic candy trading game where you manage debt, buy and
                sell candy, and collect powerful jokers to succeed.
              </Text>
            </View>
          </PixelBorder>

          <PixelBorder
            borderColor="#c79fff"
            borderWidth={4}
            backgroundColor="#e6d5ff"
            innerPadding={0}
          >
            <View style={styles.infoItem}>
              <TextWithEmojis style={styles.infoTitle}>Version</TextWithEmojis>
              <Text style={styles.infoDescription}>1.0.0</Text>
            </View>
          </PixelBorder>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 50 }} />
      </ScrollView>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={hideConfirmModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff5f7', // Cotton Candy Pink background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#ffb3d9', // Bubblegum header
    borderBottomWidth: 4,
    borderBottomColor: '#ff85c0',
  },
  backButton: {
    padding: 12,
    width: 76,
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#cc2a6f', // Cherry Blossom
    marginBottom: 16,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    padding: 20,
  },
  settingLeft: {
    flex: 1,
    marginRight: 20,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a2c5c', // Deep Purple
    marginBottom: 6,
    fontFamily: 'PixeloidMono',
  },
  settingDescription: {
    fontSize: 15,
    color: '#6b5080', // Medium Purple
    fontFamily: 'PixeloidMono',
    lineHeight: 20,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#22c55e',
  },
  toggleOff: {
    backgroundColor: '#6b7280',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#cc6633', // Peach accent
    fontFamily: 'PixeloidMono',
  },
  dangerText: {
    color: '#cc3333', // Coral Candy danger
  },
  infoItem: {
    backgroundColor: 'transparent',
    padding: 20,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a2c5c', // Deep Purple
    marginBottom: 8,
    fontFamily: 'PixeloidMono',
  },
  infoDescription: {
    fontSize: 15,
    color: '#6b5080', // Medium Purple
    lineHeight: 22,
    fontFamily: 'PixeloidMono',
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: '#ff91a4',
    borderWidth: 4,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#4a2c5c', // Deep Purple
    fontFamily: 'PixeloidMono',
    marginTop: 12,
    marginBottom: 16,
  },
  nameActions: {
    flexDirection: 'row',
    gap: 16,
  },
  nameButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 3,
  },
  saveButton: {
    backgroundColor: '#66e0b8', // Mint Ice Cream
    borderColor: '#00a372',
  },
  cancelButton: {
    backgroundColor: '#ff8080', // Coral Candy
    borderColor: '#cc3333',
  },
  nameButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
