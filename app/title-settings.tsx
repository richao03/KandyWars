import colors from '@/src/constants/colors';
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
import { resetFirebaseSession } from './components/CandyWarsTitleScreen';
import ConfirmationModal from './components/ConfirmationModal';
import PixelBorder from './components/PixelBorder';

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
      'This will permanently delete ALL your game data including:\n\n• All saved games\n• Player names\n• Tutorial progress\n• Hall Passes\n• Settings\n• Firebase data\n\nThis action cannot be undone. Are you sure?',
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
          borderColor="#d4a574"
          borderWidth={3}
          backgroundColor="rgba(212, 165, 116, 0.3)"
          innerPadding={0}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </PixelBorder>
        <Text style={styles.title}>⚙️ Settings</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Player Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 Player Profile</Text>

          <PixelBorder
            borderColor="#d4a574"
            borderWidth={4}
            backgroundColor="rgba(212, 165, 116, 0.2)"
            innerPadding={0}
          >
            {isLoading ? (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingTitle}>Player Name</Text>
                  <Text style={styles.settingDescription}>Loading...</Text>
                </View>
                <ActivityIndicator size="small" color="#3b82f6" />
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
            borderColor="#F4A460"
            borderWidth={4}
            backgroundColor="rgba(244, 164, 96, 0.2)"
            innerPadding={0}
          >
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleViewLeaderboard}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingTitle}>🏆 View Leaderboard</Text>
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
          <Text style={styles.sectionTitle}>🗑️ Data Management</Text>

          <PixelBorder
            borderColor="#CD853F"
            borderWidth={4}
            backgroundColor="rgba(205, 133, 63, 0.2)"
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
                <ActivityIndicator size="small" color="#ff4444" />
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
          <Text style={styles.sectionTitle}>ℹ️ About</Text>

          <PixelBorder
            borderColor="#DEB887"
            borderWidth={4}
            backgroundColor="rgba(222, 184, 135, 0.2)"
            innerPadding={0}
          >
            <View style={styles.infoItem}>
              <Text style={styles.infoTitle}>🍬 Candy Warz</Text>
              <Text style={styles.infoDescription}>
                A strategic candy trading game where you manage debt, buy and
                sell candy, and collect powerful jokers to succeed.
              </Text>
            </View>
          </PixelBorder>

          <PixelBorder
            borderColor="#d4a574"
            borderWidth={4}
            backgroundColor="rgba(212, 165, 116, 0.2)"
            innerPadding={0}
          >
            <View style={styles.infoItem}>
              <Text style={styles.infoTitle}>📱 Version</Text>
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
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.black,
    borderBottomWidth: 3,
    borderBottomColor: '#d4a574',
  },
  backButton: {
    padding: 8,
    width: 80,
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    fontFamily: 'PixeloidMono',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    padding: 16,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    fontFamily: 'PixeloidMono',
  },
  settingDescription: {
    fontSize: 14,
    color: '#9ca3af',
    fontFamily: 'PixeloidMono',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
    fontFamily: 'PixeloidMono',
  },
  dangerText: {
    color: '#DC143C',
  },
  infoItem: {
    backgroundColor: 'transparent',
    padding: 16,
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    fontFamily: 'PixeloidMono',
  },
  infoDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    fontFamily: 'PixeloidMono',
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#d4a574',
    borderWidth: 3,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    marginTop: 8,
    marginBottom: 12,
  },
  nameActions: {
    flexDirection: 'row',
    gap: 12,
  },
  nameButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#32CD32',
  },
  cancelButton: {
    backgroundColor: '#8B4513',
  },
  nameButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
  },
});
