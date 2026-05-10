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
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useDailyStats } from '../../src/hooks/useDailyStats';
import { useGame } from '../../src/hooks/useGame';
import { useHallPass } from '../../src/hooks/useHallPass';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { scoreboardService } from '../../src/services/firebase';
import { nameValidationService } from '../../src/services/nameValidationService';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { fullResetGame } from '../../src/store/slices/gameSlice';
import {
  resetHallPasses,
  unlockHallPass,
} from '../../src/store/slices/hallPassSlice';
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

// School-theme palette — matches GameHUD school config (#fef7e7 bg)
const PALETTE = {
  pageBg: '#fef7e7',
  cardBg: '#fff5d4',
  cardBorder: '#8b4513',
  accent: '#d4af37',
  titleText: '#6b4423',
  bodyText: '#4a3520',
  mutedText: '#8a6e4e',
  inputBg: '#fffaf0',
  divider: '#e8d4a8',
  // action accents
  primary: '#3b6cb0',
  primaryBg: '#e0ecff',
  success: '#4a7c4a',
  successBg: '#e6f4d6',
  danger: '#b91c1c',
  dangerBg: '#fde2e2',
  warning: '#b8650f',
  warningBg: '#fff0d6',
};

// Section header — pixel icon + title text in school-theme styling
function SectionHeader({
  icon,
  title,
}: {
  icon?: any;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      {icon && <Image source={icon} style={styles.sectionHeaderIcon} />}
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

// School-themed action row — pixel icon + label + chevron-style affordance
function ActionRow({
  icon,
  label,
  description,
  onPress,
  disabled,
  tone = 'default',
}: {
  icon?: any;
  label: string;
  description?: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger' | 'warning';
}) {
  const toneStyle =
    tone === 'primary'
      ? { borderColor: PALETTE.primary, backgroundColor: PALETTE.primaryBg, labelColor: PALETTE.primary }
      : tone === 'danger'
        ? { borderColor: PALETTE.danger, backgroundColor: PALETTE.dangerBg, labelColor: PALETTE.danger }
        : tone === 'warning'
          ? { borderColor: PALETTE.warning, backgroundColor: PALETTE.warningBg, labelColor: PALETTE.warning }
          : { borderColor: PALETTE.cardBorder, backgroundColor: PALETTE.inputBg, labelColor: PALETTE.titleText };

  return (
    <PixelBorder
      borderColor={toneStyle.borderColor}
      borderWidth={3}
      backgroundColor={toneStyle.backgroundColor}
      innerPadding={0}
      style={styles.actionRowWrap}
    >
      <TouchableOpacity
        style={[styles.actionRow, disabled && styles.actionRowDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.75}
      >
        {icon && <Image source={icon} style={styles.actionRowIcon} />}
        <View style={styles.actionRowText}>
          <Text style={[styles.actionRowLabel, { color: toneStyle.labelColor }]}>
            {label}
          </Text>
          {description && (
            <Text style={styles.actionRowDescription}>{description}</Text>
          )}
        </View>
      </TouchableOpacity>
    </PixelBorder>
  );
}

function Settings() {
  const { resetGame, jumpToPeriod } = useGame();
  const { setSeed, setGameData } = useSeed();
  const walletContext = useWallet();
  const { allPasses, selectedPassIds } = useHallPass();
  const activePasses = React.useMemo(
    () => allPasses.filter((p) => selectedPassIds.includes(p.id)),
    [allPasses, selectedPassIds]
  );
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
  const setPlayerName = walletContext?.setPlayerName || (() => {});
  // Wallet is the source of truth — set by story-screen when the player enters
  // their name. cachedUser.playerName can be stale "Player" from old defaults.
  const walletName = walletContext?.playerName;
  const cachedName = cachedUser?.playerName;
  const currentPlayerName =
    (walletName && walletName !== 'Player' ? walletName : null) ??
    (cachedName && cachedName !== 'Player' ? cachedName : null) ??
    walletName ??
    cachedName ??
    'Player';
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
      emoji: '',
      confirmText: 'Restart',
      cancelText: 'Cancel',
      onConfirm: async () => {
        if (__DEV__) console.log('✅ Restart confirmed');
        setIsRestarting(true);

        try {
          await resetGame();
          resetInventory();
          resetJokers();
          resetFlavorText();
          resetPlaythrough();

          const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setSeed(newSeed);

          const gameData = generateSeededGameData(newSeed, 40);
          setGameData(gameData);
          if (__DEV__) {
            console.log(
              '🎲 Generated game data with 40 periods:',
              gameData.periodEvents.length,
              'events'
            );
          }

          resetWallet();

          setConfirmModal({
            visible: true,
            title: 'Game Restarted',
            message: `Starting a fresh game! Please select your difficulty.`,
            emoji: '',
            confirmText: 'Go to Title Screen',
            onConfirm: () => {
              resetConfirmModal();
              setTimeout(() => {
                router.replace('/title-screen');
              }, 200);
            },
            onCancel: () => {
              resetConfirmModal();
            },
          });
        } catch (error) {
          console.error('Error restarting game:', error);
          setConfirmModal({
            visible: true,
            title: 'Error',
            message: 'Failed to restart the game. Please try again.',
            emoji: '',
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
      emoji: '',
      confirmText: 'Return',
      cancelText: 'Cancel',
      onConfirm: () => {
        if (__DEV__) console.log('✅ Return to title screen confirmed');
        router.replace('/title-screen');
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

    if (trimmedName.toLowerCase() === (currentPlayerName || '').toLowerCase()) {
      setEditingName(false);
      setNewPlayerName('');
      return;
    }

    setIsValidatingName(true);
    setNameValidationError(null);

    try {
      dispatch(updateCachedUserObject({ playerName: trimmedName }));
      if (__DEV__) console.log('✅ Player name updated in Redux:', trimmedName);

      const updatedUser = cachedUser
        ? { ...cachedUser, playerName: trimmedName }
        : null;
      if (updatedUser) {
        scoreboardService.setCachedUserObject(updatedUser);
        if (__DEV__) console.log('✅ Player name synced to service cache:', updatedUser);

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
      title: 'Clear All Data',
      message:
        'WARNING: This will delete ALL saved data including game progress, player name, joker cards, and settings. You will start as a completely new player. This action cannot be undone!',
      emoji: '',
      confirmText: 'DELETE EVERYTHING',
      cancelText: 'Cancel',
      onConfirm: async () => {
        if (__DEV__) console.log('🗑️ Clearing all data...');
        resetConfirmModal();
        setIsRestarting(true);

        try {
          const currentPlayerId = walletContext?.playerId;
          const currentPlayerName = walletContext?.playerName;

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

          dispatch(resetHallPasses());
          dispatch(clearCachedUserObject());
          dispatch(setWonDifficulties([]));
          dispatch(setTotalCompletions(0));
          if (__DEV__) console.log('✅ All Redux slices reset in memory');

          dispatch(fullResetGame());
          resetWallet();
          resetInventory();
          resetJokers();
          resetFlavorText();
          resetPlaythrough();
          if (__DEV__) console.log('✅ All game contexts reset');

          scoreboardService.clearUserObjectCache();
          resetFirebaseSession();
          if (__DEV__) console.log('✅ Service cache and Firebase session cleared');

          const allKeys = await AsyncStorage.getAllKeys();
          if (__DEV__) console.log('🗑️ Found keys to clear:', allKeys);
          await AsyncStorage.multiRemove(allKeys);

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
            'persist:root',
          ];

          await AsyncStorage.multiRemove(specificKeys);
          if (__DEV__) console.log('✅ AsyncStorage cleared');

          const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setSeed(newSeed);

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

          await new Promise((resolve) => setTimeout(resolve, 500));

          if (__DEV__) console.log('✅ Navigating to root as new player');
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
        {/* PLAYER ============================================== */}
        <PixelBorder
          borderColor={PALETTE.cardBorder}
          borderWidth={4}
          backgroundColor={PALETTE.cardBg}
          innerPadding={14}
          style={styles.section}
        >
          <SectionHeader
            icon={require('../../assets/images/emojis/student.png')}
            title="Player"
          />

          {editingName ? (
            <View style={styles.editNameWrap}>
              <TextInput
                style={[
                  styles.nameInput,
                  nameValidationError && styles.nameInputError,
                ]}
                value={newPlayerName}
                onChangeText={(text) => {
                  setNewPlayerName(text);
                  setNameValidationError(null);
                }}
                placeholder="Enter your name"
                placeholderTextColor={PALETTE.mutedText}
                maxLength={20}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                editable={!isValidatingName}
              />
              {nameValidationError && (
                <Text style={styles.nameErrorText}>{nameValidationError}</Text>
              )}
              <View style={styles.editNameButtonRow}>
                <PixelBorder
                  borderColor={PALETTE.success}
                  borderWidth={3}
                  backgroundColor={PALETTE.successBg}
                  innerPadding={0}
                  style={styles.editNameAction}
                >
                  <TouchableOpacity
                    style={[
                      styles.editNameActionInner,
                      isValidatingName && styles.disabledButton,
                    ]}
                    onPress={handleSaveName}
                    disabled={isValidatingName}
                  >
                    {isValidatingName ? (
                      <View style={styles.validatingRow}>
                        <ActivityIndicator size="small" color={PALETTE.success} />
                        <Text style={[styles.editNameActionText, { color: PALETTE.success }]}>
                          Checking...
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.editNameActionText, { color: PALETTE.success }]}>
                        Save
                      </Text>
                    )}
                  </TouchableOpacity>
                </PixelBorder>

                <PixelBorder
                  borderColor={PALETTE.danger}
                  borderWidth={3}
                  backgroundColor={PALETTE.dangerBg}
                  innerPadding={0}
                  style={styles.editNameAction}
                >
                  <TouchableOpacity
                    style={styles.editNameActionInner}
                    onPress={handleCancelEditName}
                  >
                    <Text style={[styles.editNameActionText, { color: PALETTE.danger }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </PixelBorder>
              </View>
            </View>
          ) : (
            <View style={styles.playerRow}>
              <View style={styles.playerNameWrap}>
                <Text style={styles.playerNameLabel}>Name</Text>
                <Text style={styles.playerNameValue}>
                  {currentPlayerName || 'Player'}
                </Text>
              </View>
              <PixelBorder
                borderColor={PALETTE.primary}
                borderWidth={2}
                backgroundColor={PALETTE.primaryBg}
                innerPadding={0}
              >
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditName}
                  activeOpacity={0.75}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </PixelBorder>
            </View>
          )}
        </PixelBorder>

        {/* HALL PASSES ========================================= */}
        {activePasses.length > 0 && (
          <PixelBorder
            borderColor={PALETTE.cardBorder}
            borderWidth={4}
            backgroundColor={PALETTE.cardBg}
            innerPadding={14}
            style={styles.section}
          >
            <SectionHeader
              icon={require('../../assets/images/emojis/hallpass.png')}
              title="Hall Passes"
            />
            {activePasses.map((pass) => (
              <View key={pass.id} style={styles.passCard}>
                <Text style={styles.passName}>{pass.name}</Text>
                {pass.effects.map((effect, idx) => (
                  <Text key={idx} style={styles.passEffect}>
                    • {effect.description}
                  </Text>
                ))}
              </View>
            ))}
          </PixelBorder>
        )}

        {/* PREFERENCES (audio + accessibility) ================= */}
        <PixelBorder
          borderColor={PALETTE.cardBorder}
          borderWidth={4}
          backgroundColor={PALETTE.cardBg}
          innerPadding={14}
          style={styles.section}
        >
          <SectionHeader
            icon={require('../../assets/images/emojis/msuic.png')}
            title="Preferences"
          />

          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Music</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={musicVolume}
              onValueChange={(val: number) => {
                dispatch(setMusicVolume(val));
                MusicController.setVolume(val);
              }}
              minimumTrackTintColor={PALETTE.accent}
              maximumTrackTintColor={PALETTE.divider}
              thumbTintColor={PALETTE.cardBorder}
            />
            <Text style={styles.sliderValue}>
              {Math.round(musicVolume * 100)}%
            </Text>
          </View>

          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>SFX</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={soundVolume}
              onValueChange={(val: number) => {
                dispatch(setSoundVolume(val));
                SoundEffects.setVolume(val);
              }}
              minimumTrackTintColor={PALETTE.accent}
              maximumTrackTintColor={PALETTE.divider}
              thumbTintColor={PALETTE.cardBorder}
            />
            <Text style={styles.sliderValue}>
              {Math.round(soundVolume * 100)}%
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Reduce Motion</Text>
              <Text style={styles.toggleDescription}>
                Simpler animations and flashes
              </Text>
            </View>
            <Switch
              value={reduceMotion}
              onValueChange={() => {
                dispatch(toggleReduceMotion());
              }}
              trackColor={{ false: PALETTE.divider, true: PALETTE.accent }}
              thumbColor={reduceMotion ? PALETTE.cardBorder : '#f4f3f4'}
            />
          </View>
        </PixelBorder>

        {/* ACTIONS ============================================= */}
        <PixelBorder
          borderColor={PALETTE.cardBorder}
          borderWidth={4}
          backgroundColor={PALETTE.cardBg}
          innerPadding={14}
          style={styles.section}
        >
          <SectionHeader title="Actions" />

          <ActionRow
            icon={require('../../assets/images/emojis/home.png')}
            label="Return to Title Screen"
            description="Progress saved"
            onPress={handleReturnToTitleScreen}
            tone="primary"
          />

          <ActionRow
            icon={require('../../assets/images/emojis/trophy.png')}
            label="Leaderboard"
            description="See how you rank"
            onPress={() => router.push('/leaderboard')}
            tone="default"
          />

          <ActionRow
            icon={require('../../assets/images/emojis/refresh.png')}
            label={isRestarting ? 'Restarting…' : 'Restart Game'}
            description="Delete progress and start fresh"
            onPress={handleRestartGame}
            disabled={isRestarting}
            tone="warning"
          />
        </PixelBorder>

        {/* DANGER ZONE ========================================= */}
        <PixelBorder
          borderColor={PALETTE.danger}
          borderWidth={4}
          backgroundColor={PALETTE.dangerBg}
          innerPadding={14}
          style={styles.section}
        >
          <SectionHeader
            icon={require('../../assets/images/emojis/warning.png')}
            title="Danger Zone"
          />

          <ActionRow
            icon={require('../../assets/images/emojis/x.png')}
            label={isRestarting ? 'Clearing…' : 'Clear All Data'}
            description="Start as a completely new player"
            onPress={handleClearAllData}
            disabled={isRestarting}
            tone="danger"
          />
        </PixelBorder>

        {/* DEBUG (DEV) ========================================= */}
        {__DEV__ && (
          <PixelBorder
            borderColor={PALETTE.cardBorder}
            borderWidth={4}
            backgroundColor={PALETTE.cardBg}
            innerPadding={14}
            style={styles.section}
          >
            <SectionHeader
              icon={require('../../assets/images/emojis/gear.png')}
              title="Debug Tools"
            />

            <ActionRow
              label="Jump to Day 5"
              description="Skip to day 5 for testing"
              onPress={() => {
                jumpToPeriod(32);
                router.push('/(tabs)/market');
              }}
              tone="warning"
            />
            <ActionRow
              label="Show Total Completions"
              onPress={() => {
                const total = scoreboardService.getTotalWinCount();
                Alert.alert(
                  'Total Win Count',
                  `You have won ${total} game(s)`,
                  [{ text: 'OK' }]
                );
              }}
            />
            <ActionRow
              label="Reset Tutorial"
              onPress={() => {
                dispatch(resetTutorial());
                Alert.alert(
                  'Tutorial Reset',
                  'Tutorial will show again on next difficulty 1 game.',
                  [{ text: 'OK' }]
                );
              }}
            />
            <ActionRow
              label="Minigame Picker"
              onPress={() => router.push('/debug-minigames' as any)}
            />
            <ActionRow
              label="Sale Tier Preview"
              onPress={() => router.push('/debug-tier-preview' as any)}
            />
            <ActionRow
              label="Joker Picker"
              onPress={() => router.push('/debug-jokers' as any)}
            />
            <ActionRow
              label="Unlock All Hall Passes"
              description="Mark every hall pass as unlocked for testing"
              onPress={() => {
                allPasses.forEach((pass) => {
                  if (!pass.isUnlocked) {
                    dispatch(unlockHallPass({ passId: pass.id }));
                  }
                });
                Alert.alert(
                  'Hall Passes Unlocked',
                  `All ${allPasses.length} hall passes are now available in selection.`,
                  [{ text: 'OK' }]
                );
              }}
              tone="warning"
            />
          </PixelBorder>
        )}

        {/* ABOUT =============================================== */}
        <View style={styles.aboutWrap}>
          <Text style={styles.aboutTitle}>SUGAR WARS</Text>
          <Text style={styles.aboutSubtitle}>
            The ultimate school trading simulation
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
    backgroundColor: PALETTE.pageBg,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 20,
  },

  // Sections ------------------------------------------------------
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: PALETTE.divider,
    borderStyle: 'dashed',
  },
  sectionHeaderIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginRight: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PALETTE.titleText,
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  // Player --------------------------------------------------------
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerNameWrap: {
    flex: 1,
  },
  playerNameLabel: {
    fontSize: 10,
    color: PALETTE.mutedText,
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  playerNameValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PALETTE.titleText,
    fontFamily: 'PixeloidMono',
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PALETTE.primary,
    fontFamily: 'PixeloidMono',
  },

  // Edit name -----------------------------------------------------
  editNameWrap: {
    gap: 10,
  },
  nameInput: {
    backgroundColor: PALETTE.inputBg,
    borderWidth: 3,
    borderColor: PALETTE.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: 'PixeloidMono',
    color: PALETTE.titleText,
  },
  nameInputError: {
    borderColor: PALETTE.danger,
  },
  nameErrorText: {
    color: PALETTE.danger,
    fontSize: 12,
    fontFamily: 'PixeloidMono',
  },
  editNameButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editNameAction: {
    flex: 1,
  },
  editNameActionInner: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  editNameActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
  validatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Hall passes ---------------------------------------------------
  emptyText: {
    fontSize: 13,
    color: PALETTE.mutedText,
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
  },
  passCard: {
    backgroundColor: PALETTE.inputBg,
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  passName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: PALETTE.titleText,
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
  },
  passEffect: {
    fontSize: 12,
    color: PALETTE.bodyText,
    fontFamily: 'PixeloidMono',
    lineHeight: 17,
  },

  // Audio ---------------------------------------------------------
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PALETTE.bodyText,
    fontFamily: 'PixeloidMono',
    width: 44,
  },
  slider: {
    flex: 1,
    height: 28,
    marginHorizontal: 6,
  },
  sliderValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: PALETTE.bodyText,
    fontFamily: 'PixeloidMono',
    width: 38,
    textAlign: 'right',
  },

  // Accessibility -------------------------------------------------
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: PALETTE.divider,
  },
  toggleText: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: PALETTE.bodyText,
    fontFamily: 'PixeloidMono',
  },
  toggleDescription: {
    fontSize: 10,
    color: PALETTE.mutedText,
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
  },

  // Action rows ---------------------------------------------------
  actionRowWrap: {
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  actionRowDisabled: {
    opacity: 0.55,
  },
  actionRowIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    marginRight: 10,
  },
  actionRowText: {
    flex: 1,
  },
  actionRowLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
  actionRowDescription: {
    fontSize: 10,
    color: PALETTE.mutedText,
    fontFamily: 'PixeloidMono',
    marginTop: 1,
    fontStyle: 'italic',
  },

  // About ---------------------------------------------------------
  aboutWrap: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 8,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PALETTE.titleText,
    fontFamily: 'PixeloidMono',
    letterSpacing: 2,
    marginBottom: 2,
  },
  aboutSubtitle: {
    fontSize: 10,
    color: PALETTE.mutedText,
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
  },
});

export default React.memo(Settings);
