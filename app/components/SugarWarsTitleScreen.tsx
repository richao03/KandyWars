import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGame } from '../../src/hooks/useGame';
import { useHallPass } from '../../src/hooks/useHallPass';
import { scoreboardService } from '../../src/services/firebase';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { setHallPassModifiers } from '../../src/store/slices/hallPassModifiersSlice';
import { syncHallPassesFromFirebase } from '../../src/store/slices/hallPassSlice';
import {
  setTotalCompletions,
  setWonDifficulties,
} from '../../src/store/slices/scoreboardSlice';
import { selectTutorialComplete } from '../../src/store/slices/tutorialSlice';
import { setCachedUserObject } from '../../src/store/slices/userObjectSlice';
import { startNewGame } from '../../src/store/thunks/startNewGame';
import { computeHallPassModifiers } from '../../src/utils/computeHallPassModifiers';
import { SoundEffects } from '../../src/utils/soundEffects';
import DifficultySelectionModal from './DifficultySelectionModal';
import HallPassModal from './HallPassModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import StoryModal from './StoryModal';
import TypewriterTitle from './TypewriterTitle';

const { width, height } = Dimensions.get('window');

// Module-level flag to prevent duplicate Firebase fetches across component remounts
let firebaseSessionInitialized = false;

// Export function to reset Firebase session (called when user wants fresh data)
export const resetFirebaseSession = () => {
  firebaseSessionInitialized = false;
};

interface SugarWarsTitleScreenProps {
  onNewGame?: (level: number) => void;
  onContinue?: () => void;
  onSettings?: () => void;
}

export default function SugarWarsTitleScreen({
  onNewGame,
  onContinue,
  onSettings,
}: SugarWarsTitleScreenProps) {
  const dispatch = useAppDispatch();
  const { periodCount, isInitialized, setIsInitialized } = useGame();
  const { selectPass, selectedPasses, unlockedPasses } = useHallPass();
  const cachedUserObject = useAppSelector(
    (state) => state.userObject.cachedUser
  );
  const tutorialComplete = useAppSelector(selectTutorialComplete);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showHallPassModal, setShowHallPassModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current; // For fade-in effect
  const buttonsShown = useRef(false);

  // Reset component state when it mounts/re-mounts
  useEffect(() => {
    // Cleanup sound effect pools to free memory when returning to title screen
    SoundEffects.cleanup();

    setAnimationComplete(false);
    setShowButtons(false);
    setShowDifficultyModal(false);
    setShowStoryModal(false);
    setSelectedLevel(null);
    buttonsShown.current = false;
    buttonOpacity.setValue(0);
    backgroundOpacity.setValue(1);
    // Start fully visible to avoid white screen flash
    screenOpacity.setValue(1);

    // Initialize Firebase and fetch user object on game load (ONCE PER SESSION)
    const initializeFirebaseAndUserData = async () => {
      if (firebaseSessionInitialized) return;
      firebaseSessionInitialized = true;

      try {
        const userObject = await scoreboardService.initialize();

        // Store user object in Redux (persisted across app restarts)
        dispatch(setCachedUserObject(userObject));

        // Also update legacy Redux fields for backward compatibility
        dispatch(setWonDifficulties(userObject.difficultyWon));
        dispatch(setTotalCompletions(userObject.totalWinCount));

        // Sync hall passes from Firebase to Redux (batch operation)
        if (
          userObject.unlockedHallPasses &&
          userObject.unlockedHallPasses.length > 0
        ) {
          dispatch(syncHallPassesFromFirebase(userObject.unlockedHallPasses));
        }
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
      }
    };
    initializeFirebaseAndUserData();
  }, [dispatch]);

  // Recompute modifiers if there are selected passes but modifiers aren't initialized
  // This handles the case where selectedPassIds persisted but modifiers didn't
  // Use useMemo to avoid redundant computation on every render
  const hallPassModifiersState = useAppSelector(
    (state) => state.hallPassModifiers
  );

  const computedModifiers = useMemo(() => {
    if (selectedPasses.length > 0 && !hallPassModifiersState.isInitialized) {
      return computeHallPassModifiers(selectedPasses);
    }
    return null;
  }, [
    selectedPasses.length,
    hallPassModifiersState.isInitialized,
    selectedPasses,
  ]);

  // Only dispatch once when modifiers are computed
  useEffect(() => {
    if (computedModifiers) {
      dispatch(setHallPassModifiers(computedModifiers));
    }
  }, [computedModifiers, dispatch]);

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
  };

  const handleSugarComplete = () => {
    // Prevent multiple calls using ref
    if (buttonsShown.current) return;
    buttonsShown.current = true;

    // Buttons appear after "Sugar" is done
    setShowButtons(true);
    // Fade in buttons
    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const [isNewGameFlow, setIsNewGameFlow] = useState(false);

  const handleNewGamePress = async () => {
    setIsNewGameFlow(true);

    // Only show hall pass selection if user has unlocked hall passes
    if (unlockedPasses.length > 0) {
      setShowHallPassModal(true);
    } else {
      setShowDifficultyModal(true);
    }
  };

  // Hall Passes button shows selection mode for toggling active Hall Pass
  const handleHallPassesPress = () => {
    setIsNewGameFlow(false);
    setShowHallPassModal(true);
  };

  // Handle when user packs hall passes in new game flow
  const handlePackHallPasses = () => {
    setShowHallPassModal(false);
    setShowDifficultyModal(true);
  };

  // Hall Pass selection handler for toggling active pass
  const handleHallPassToggle = (passId: string) => {
    selectPass(passId);
    // Don't close modal - user can select multiple
    // Note: Modifiers will be computed when difficulty is selected and game starts
  };

  const handleDifficultySelect = async (level: number) => {
    try {
      setShowDifficultyModal(false);
      setSelectedLevel(level);

      // Bootstrap the run: Firebase refresh, seed + game-data generation, slice
      // resets, wallet init, hall-pass modifiers, and per-pass perk one-offs.
      // All of this ordering-sensitive orchestration now lives in the thunk.
      await dispatch(startNewGame(level));

      // Mark game as initialized so continue button works
      setIsInitialized(true);

      // Start fade to black, then show story modal
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setShowStoryModal(true);
      });
    } catch (error) {
      console.error('Error in handleDifficultySelect:', error);
    }
  };

  const handleCloseDifficultyModal = () => {
    setShowDifficultyModal(false);
  };

  const handleStoryContinue = async () => {
    try {
      setShowStoryModal(false);

      if (!selectedLevel) return;

      router.push('/story-screen');
    } catch (error) {
      console.error('Error in handleStoryContinue:', error);
    }
  };

  const handleTapToSkip = () => {
    // Skip animation and immediately show buttons
    if (!showButtons && !buttonsShown.current) {
      buttonsShown.current = true;
      setShowButtons(true);
      setAnimationComplete(true);
      buttonOpacity.setValue(1); // Show buttons immediately without animation
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <Animated.View
        style={[styles.backgroundWrapper, { opacity: backgroundOpacity }]}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={handleTapToSkip}
          activeOpacity={1}
        >
          <ImageBackground
            source={require('../../assets/images/titleScreen.png')}
            style={styles.backgroundContainer}
            resizeMode="cover"
            onError={(error) =>
              console.error('Background image failed to load:', error)
            }
          >
            <View style={styles.titleWrapper}>
              <TypewriterTitle
                onAnimationComplete={handleAnimationComplete}
                onSugarComplete={handleSugarComplete}
              />
            </View>

            {showButtons && (
              <Animated.View
                style={[styles.buttonContainer, { opacity: buttonOpacity }]}
              >
                <PressableButton
                  onPress={handleNewGamePress}
                  shadowColor="#2d5a2d"
                  shadowOffset={{ width: 0, height: 4 }}
                  shadowOpacity={0.4}
                  shadowRadius={5}
                  elevation={8}
                  style={{ width: '80%' }}
                >
                  <PixelBorder
                    borderColor="#4a7c4a"
                    borderWidth={3}
                    backgroundColor="#d4f6d4"
                    innerPadding={0}
                  >
                    <View style={[styles.button, styles.newGameButton]}>
                      <Text style={[styles.buttonText, styles.newGameText]}>
                        New Game
                      </Text>
                    </View>
                  </PixelBorder>
                </PressableButton>

                <PressableButton
                  onPress={!isInitialized ? undefined : onContinue}
                  disabled={!isInitialized}
                  shadowColor="#5a2d5a"
                  shadowOffset={{ width: 0, height: 4 }}
                  shadowOpacity={0.4}
                  shadowRadius={5}
                  elevation={8}
                  style={{ width: '80%', opacity: !isInitialized ? 0.6 : 1 }}
                >
                  <PixelBorder
                    borderColor={!isInitialized ? '#ccc' : '#b85c8a'}
                    borderWidth={3}
                    backgroundColor={!isInitialized ? '#e0e0e0' : '#ffd6e8'}
                    innerPadding={0}
                  >
                    <View style={[styles.button, styles.continueButton]}>
                      <Text
                        style={[
                          styles.buttonText,
                          styles.continueText,
                          !isInitialized && styles.disabledText,
                        ]}
                      >
                        {'Continue'}
                      </Text>
                    </View>
                  </PixelBorder>
                </PressableButton>

                <PressableButton
                  onPress={handleHallPassesPress}
                  shadowColor="#6b5a2d"
                  shadowOffset={{ width: 0, height: 4 }}
                  shadowOpacity={0.4}
                  shadowRadius={5}
                  elevation={8}
                  style={{ width: '80%' }}
                >
                  <PixelBorder
                    borderColor="#b8a05c"
                    borderWidth={3}
                    backgroundColor="#fff2d6"
                    innerPadding={0}
                  >
                    <View style={[styles.button, styles.hallPassButton]}>
                      <Text style={[styles.buttonText, styles.hallPassText]}>
                        Hall Passes
                      </Text>
                    </View>
                  </PixelBorder>
                </PressableButton>

                <PressableButton
                  onPress={onSettings}
                  shadowColor="#2d5a6b"
                  shadowOffset={{ width: 0, height: 4 }}
                  shadowOpacity={0.4}
                  shadowRadius={5}
                  elevation={8}
                  style={{ width: '80%' }}
                >
                  <PixelBorder
                    borderColor="#5c7cb8"
                    borderWidth={3}
                    backgroundColor="#d6e8ff"
                    innerPadding={0}
                  >
                    <View style={[styles.button, styles.settingsButton]}>
                      <Text style={[styles.buttonText, styles.settingsText]}>
                        Settings
                      </Text>
                    </View>
                  </PixelBorder>
                </PressableButton>
              </Animated.View>
            )}
          </ImageBackground>
        </TouchableOpacity>
      </Animated.View>

      <DifficultySelectionModal
        visible={showDifficultyModal}
        onSelectDifficulty={handleDifficultySelect}
        onClose={handleCloseDifficultyModal}
      />

      <StoryModal
        visible={showStoryModal}
        level={selectedLevel || 1}
        onContinue={handleStoryContinue}
      />

      <HallPassModal
        visible={showHallPassModal}
        onClose={() => {
          setShowHallPassModal(false);
          setIsNewGameFlow(false); // Reset flag when closing
        }}
        onSelectPass={handleHallPassToggle}
        onConfirm={isNewGameFlow ? handlePackHallPasses : undefined}
        viewMode="selection"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundWrapper: {
    flex: 1,
  },
  backgroundContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 80,
    paddingTop: 40,
  },

  titleWrapper: {
    width: '100%',
    marginTop: 60,
  },
  buttonContainer: {
    paddingHorizontal: 60,
    alignItems: 'center',
    gap: 15,
  },
  button: {
    paddingVertical: 4,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  newGameButton: {
    fontFamily: 'PixeloidMono',
  },
  continueButton: {
    fontFamily: 'PixeloidMono',
  },
  hallPassButton: {
    fontFamily: 'PixeloidMono',
  },
  settingsButton: {
    fontFamily: 'PixeloidMono',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(255, 255, 255, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  newGameText: {
    color: '#2d5a2d', // Dark green
  },
  continueText: {
    color: '#8a4a6b', // Dark pink
  },
  hallPassText: {
    color: '#8a7a4a', // Dark gold
  },
  settingsText: {
    color: '#4a5a8a', // Dark blue
  },
  debugText: {
    color: '#8a2d2d', // Dark red
  },
  disabledText: {
    color: '#999',
  },
});
