// app/(tabs)/settings.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getDifficultyName } from '../../src/constants/petData';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useAdoptionReady } from '../../src/hooks/useAdoptionPrompt';
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
  selectReduceMotion,
  toggleReduceMotion,
} from '../../src/store/slices/juiceSettingsSlice';
import {
  setTotalCompletions,
  setWonDifficulties,
} from '../../src/store/slices/scoreboardSlice';
import {
  selectMusicVolume,
  selectSoundVolume,
  setMusicVolume,
  setSoundVolume,
} from '../../src/store/slices/settingsSlice';
import { resetTutorial } from '../../src/store/slices/tutorialSlice';
import {
  clearCachedUserObject,
  updateCachedUserObject,
} from '../../src/store/slices/userObjectSlice';
import { MusicController } from '../../src/utils/musicController';
import { SoundEffects, playLeverClick } from '../../src/utils/soundEffects';
import { generateSeededGameData } from '../../utils/generateSeededGameData';
import ConfirmationModal from '../components/ConfirmationModal';
import PickUpPetButton from '../components/PickUpPetButton';
import PixelBorder from '../components/PixelBorder';
import {
  ListRow,
  MenuTile,
  PixelMeter,
  PixelToggle,
  SectionCard,
} from '../components/SettingsWidgets';
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

function Settings() {
  const { resetGame, jumpToPeriod } = useGame();
  const { setSeed, setGameData } = useSeed();
  const walletContext = useWallet();
  const { ready: canAdoptNow, pet: adoptionPet, goAdopt } = useAdoptionReady();
  const adoptionTotal =
    (walletContext?.balance ?? 0) + (walletContext?.stashedAmount ?? 0);
  const adoptionProgress =
    (walletContext?.adoptionFee ?? 0) > 0
      ? adoptionTotal / (walletContext?.adoptionFee ?? 1)
      : 0;
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

  // Apply persisted audio volumes to the players once on mount. Per-frame
  // application during slider drags is deferred to onSlidingComplete so we
  // don't loop setVolume over ~26 pooled SFX players every drag frame.
  useEffect(() => {
    SoundEffects.setVolume(soundVolume);
    MusicController.setVolume(musicVolume);
    // Intentionally run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        if (__DEV__)
          console.log('✅ Player name synced to service cache:', updatedUser);

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

          if (__DEV__)
            console.log('🗑️ Deleting user document from Firebase...');
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
          if (__DEV__)
            console.log('✅ Service cache and Firebase session cleared');

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
        {/* ADOPT NOW — featured once the fee is covered =========== */}
        {canAdoptNow && (
          <PickUpPetButton
            pet={adoptionPet}
            onPress={() =>
              setConfirmModal({
                visible: true,
                title: `Adopt ${adoptionPet.name}?`,
                message: `You've got enough to cover the adoption fee!\n\nEnd the run now, bring ${adoptionPet.name} home, and unlock the next level?`,
                emoji: '🎉',
                confirmText: 'Adopt Now',
                cancelText: 'Keep Trading',
                onConfirm: () => {
                  resetConfirmModal();
                  goAdopt();
                },
              })
            }
          />
        )}

        {/* STUDENT ID ========================================== */}
        <SectionCard
          tone="blue"
          icon={require('../../assets/images/emojis/student.png')}
          title="Student ID"
          subtitle="Sugar Wars Academy"
        >
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
                        <ActivityIndicator
                          size="small"
                          color={PALETTE.success}
                        />
                        <Text
                          style={[
                            styles.editNameActionText,
                            { color: PALETTE.success },
                          ]}
                        >
                          Checking...
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.editNameActionText,
                          { color: PALETTE.success },
                        ]}
                      >
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
                    <Text
                      style={[
                        styles.editNameActionText,
                        { color: PALETTE.danger },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </PixelBorder>
              </View>
            </View>
          ) : (
            <View style={styles.idCard}>
              {/* Photo */}
              <View style={styles.idPhotoFrame}>
                <Image
                  source={adoptionPet.image}
                  style={styles.idPhoto}
                  resizeMode="contain"
                />
                <View style={styles.idPhotoTape} />
              </View>

              {/* Details */}
              <View style={styles.idDetails}>
                <Text style={styles.idLabel}>NAME</Text>
                <View style={styles.idNameRow}>
                  <Text style={styles.idName} numberOfLines={1}>
                    {currentPlayerName || 'Player'}
                  </Text>
                  <TouchableOpacity
                    style={styles.idEditButton}
                    onPress={handleEditName}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.idEditButtonText}>EDIT</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.idBadgeRow}>
                  <View style={styles.idBadge}>
                    <Text style={styles.idBadgeText}>
                      LVL {walletContext?.difficultyLevel ?? 1}
                    </Text>
                  </View>
                  <View style={[styles.idBadge, styles.idBadgeAlt]}>
                    <Text style={[styles.idBadgeText, styles.idBadgeAltText]}>
                      {getDifficultyName(walletContext?.difficultyLevel)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.idLabel}>
                  ADOPTION FUND · {adoptionPet.name}
                </Text>
                <View style={styles.fundBar}>
                  <View
                    style={[
                      styles.fundFill,
                      {
                        width: `${Math.round(
                          Math.min(1, Math.max(0, adoptionProgress)) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.fundText}>
                  ${Math.round(adoptionTotal).toLocaleString()} / $
                  {Math.round(walletContext?.adoptionFee ?? 0).toLocaleString()}
                  {canAdoptNow ? '  ✓ READY' : ''}
                </Text>
              </View>
            </View>
          )}
        </SectionCard>

        {/* HALL PASSES ========================================= */}
        {activePasses.length > 0 && (
          <SectionCard
            tone="gold"
            icon={require('../../assets/images/emojis/hallpass.png')}
            title="Hall Passes"
            subtitle="Active this run"
          >
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
          </SectionCard>
        )}

        {/* SOUND BOOTH (audio + accessibility) ================= */}
        <SectionCard
          tone="purple"
          icon={require('../../assets/images/emojis/msuic.png')}
          title="Sound Booth"
          subtitle="Tap a bar or use − / +"
        >
          <PixelMeter
            icon={require('../../assets/images/emojis/msuic.png')}
            label="Music"
            value={musicVolume}
            tone="purple"
            onChange={(val) => {
              dispatch(setMusicVolume(val));
              MusicController.setVolume(val);
            }}
          />
          <PixelMeter
            icon={require('../../assets/images/emojis/controller.png')}
            label="SFX"
            value={soundVolume}
            tone="purple"
            onChange={(val) => {
              dispatch(setSoundVolume(val));
              SoundEffects.setVolume(val);
              // Let the player hear the new level.
              if (val > 0) playLeverClick();
            }}
          />

          <View style={styles.prefDivider} />

          <View style={styles.toggleRow}>
            <Image
              source={require('../../assets/images/emojis/lightning.png')}
              style={styles.toggleIcon}
            />
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Reduce Motion</Text>
              <Text style={styles.toggleDescription}>
                Calmer animations, no screen shake
              </Text>
            </View>
            <PixelToggle
              value={reduceMotion}
              tone="purple"
              onToggle={() => dispatch(toggleReduceMotion())}
            />
          </View>
        </SectionCard>

        {/* MAIN MENU =========================================== */}
        <SectionCard
          tone="green"
          icon={require('../../assets/images/emojis/controller.png')}
          title="Main Menu"
        >
          <View style={styles.tileGrid}>
            <MenuTile
              icon={require('../../assets/images/emojis/home.png')}
              label="Title Screen"
              sub="Progress saved"
              tone="blue"
              onPress={handleReturnToTitleScreen}
            />
            <MenuTile
              icon={require('../../assets/images/emojis/trophy.png')}
              label="Leaderboard"
              sub="See how you rank"
              tone="gold"
              onPress={() => router.push('/leaderboard')}
            />
            <MenuTile
              icon={require('../../assets/images/emojis/refresh.png')}
              label={isRestarting ? 'Restarting…' : 'Restart Game'}
              sub="Start this run over"
              tone="orange"
              onPress={handleRestartGame}
              disabled={isRestarting}
            />
            <MenuTile
              icon={require('../../assets/images/emojis/book.png')}
              label="How to Play"
              sub="Replay the tutorial"
              tone="green"
              onPress={() => {
                dispatch(resetTutorial());
                Alert.alert(
                  'Tutorial Reset',
                  'The tutorial will show again on your next Level 1 game.',
                  [{ text: 'OK' }]
                );
              }}
            />
          </View>
        </SectionCard>

        {/* DANGER ZONE ========================================= */}
        <SectionCard
          tone="red"
          icon={require('../../assets/images/emojis/warning.png')}
          title="Danger Zone"
          subtitle="No take-backs"
          hazard
        >
          <MenuTile
            icon={require('../../assets/images/emojis/x.png')}
            label={isRestarting ? 'Clearing…' : 'Clear All Data'}
            sub="Wipe everything and start as a brand-new player"
            tone="red"
            onPress={handleClearAllData}
            disabled={isRestarting}
            style={styles.fullTile}
          />
        </SectionCard>

        {/* DEBUG (DEV) ========================================= */}
        {__DEV__ && (
          <SectionCard
            tone="brown"
            icon={require('../../assets/images/emojis/gear.png')}
            title="Debug Tools"
            subtitle="Dev builds only"
          >
            <ListRow
              label="Jump to Day 5"
              sub="Skip to day 5 for testing"
              tone="orange"
              onPress={() => {
                jumpToPeriod(32);
                router.push('/(tabs)/market');
              }}
            />
            <ListRow
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
            <ListRow
              label="Minigame Picker"
              onPress={() => router.push('/debug-minigames' as any)}
            />
            <ListRow
              label="Sale Tier Preview"
              onPress={() => router.push('/debug-tier-preview' as any)}
            />
            <ListRow
              label="Joker Picker"
              onPress={() => router.push('/debug-jokers' as any)}
            />
            <ListRow
              label="Unlock All Hall Passes"
              sub="Mark every hall pass as unlocked for testing"
              tone="orange"
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
            />
          </SectionCard>
        )}

        {/* ABOUT =============================================== */}
        <View style={styles.aboutWrap}>
          <Text style={styles.aboutTitle}>H U S T L E</Text>
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
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Student ID card ----------------------------------------------
  idCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  idPhotoFrame: {
    width: 84,
    height: 96,
    backgroundColor: '#fffaf0',
    borderWidth: 3,
    borderColor: PALETTE.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-2deg' }],
  },
  idPhoto: {
    width: 64,
    height: 64,
  },
  idPhotoTape: {
    position: 'absolute',
    top: -8,
    width: 40,
    height: 12,
    backgroundColor: 'rgba(255, 215, 94, 0.85)',
    transform: [{ rotate: '4deg' }],
  },
  idDetails: {
    flex: 1,
  },
  idLabel: {
    fontSize: 9,
    color: PALETTE.mutedText,
    fontFamily: 'PixeloidMono',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  idNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  idName: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: PALETTE.titleText,
    fontFamily: 'PixeloidMono',
  },
  idEditButton: {
    borderWidth: 2,
    borderColor: PALETTE.primary,
    backgroundColor: PALETTE.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginLeft: 8,
  },
  idEditButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PALETTE.primary,
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
  },
  idBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  idBadge: {
    backgroundColor: PALETTE.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  idBadgeAlt: {
    backgroundColor: PALETTE.accent,
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff5d4',
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
  },
  idBadgeAltText: {
    color: '#3d2a00',
  },
  fundBar: {
    height: 12,
    backgroundColor: '#e8d4a8',
    borderWidth: 2,
    borderColor: PALETTE.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 3,
  },
  fundFill: {
    height: '100%',
    backgroundColor: PALETTE.success,
  },
  fundText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PALETTE.bodyText,
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

  // Sound booth ---------------------------------------------------
  prefDivider: {
    height: 2,
    backgroundColor: 'rgba(107, 79, 163, 0.25)',
    marginVertical: 8,
    borderRadius: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  toggleIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    marginRight: 8,
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

  // Menu tiles ----------------------------------------------------
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fullTile: {
    minWidth: '100%',
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
