import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useGame } from '../../src/hooks/useGame';
import { useHallPass } from '../../src/hooks/useHallPass';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { generateSeededGameData } from '../../utils/generateSeededGameData';
import DifficultySelectionModal from './DifficultySelectionModal';
import ExactFontHandwriting from './ExactFontHandwriting';
import HallPassModal from './HallPassModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import StoryModal from './StoryModal';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { setPeriodCount } from '../../src/store/slices/gameSlice';
import { setBalance, setStashedAmount } from '../../src/store/slices/walletSlice';
import { setHallPassModifiers } from '../../src/store/slices/hallPassModifiersSlice';
import { computeHallPassModifiers } from '../../src/utils/computeHallPassModifiers';
import { scoreboardService } from '../../src/services/firebase';

const { width, height } = Dimensions.get('window');

interface CandyWarsTitleScreenProps {
  onNewGame?: (level: number) => void;
  onContinue?: () => void;
  onSettings?: () => void;
}

export default function CandyWarsTitleScreen({
  onNewGame,
  onContinue,
  onSettings,
}: CandyWarsTitleScreenProps) {
  const wallet = useWallet();
  const dispatch = useAppDispatch();
  const { resetGame, periodCount, isInitialized, setIsInitialized, setHasCompletedMarketTutorial, setHasCompletedAfterSchoolTutorial } = useGame();
  const { resetInventory } = useInventory();
  const { resetJokers } = useJokers();
  const { resetFlavorText } = useFlavorText();
  const { setSeed, setGameData } = useSeed();
  const { selectPass, selectedPasses } = useHallPass();
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
    console.log('🎬 CandyWarsTitleScreen: Component mounted, resetting state');
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

    console.log(
      '🎬 CandyWarsTitleScreen: Starting fully visible to avoid white screen'
    );

    // Fetch and log won difficulties on game load
    const fetchWonDifficulties = async () => {
      try {
        const wonDifficulties = await scoreboardService.getWonDifficulties();
        console.log('🏆 Won difficulties on game load:', wonDifficulties);
      } catch (error) {
        console.error('❌ Failed to fetch won difficulties:', error);
      }
    };
    fetchWonDifficulties();
  }, []);

  // Recompute modifiers if there are selected passes but modifiers aren't initialized
  // This handles the case where selectedPassIds persisted but modifiers didn't
  const hallPassModifiersState = useAppSelector((state) => state.hallPassModifiers);
  useEffect(() => {
    if (selectedPasses.length > 0 && !hallPassModifiersState.isInitialized) {
      console.log('🎖️ Title Screen: Found', selectedPasses.length, 'selected passes but modifiers not initialized, computing now');
      const modifiers = computeHallPassModifiers(selectedPasses);
      dispatch(setHallPassModifiers(modifiers));
      console.log('🎖️ Title Screen: Modifiers initialized:', modifiers);
    }
  }, [selectedPasses.length, hallPassModifiersState.isInitialized, selectedPasses, dispatch]);

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
  };

  const handleCandyComplete = () => {
    // Prevent multiple calls using ref
    if (buttonsShown.current) return;
    buttonsShown.current = true;

    console.log('🎨 CandyWarsTitleScreen: Showing buttons');
    // Buttons appear after "Candy" is done
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
    try {
      console.log('🎬 NEW GAME: Starting new game process');
      // First show hall pass selection
      console.log('🎬 NEW GAME: Showing hall pass selection');
      setIsNewGameFlow(true); // Mark this as new game flow
      setShowHallPassModal(true);
    } catch (error) {
      console.error('❌ NEW GAME: Error in handleNewGamePress:', error);
    }
  };

  // Hall Passes button shows selection mode for toggling active Hall Pass
  const handleHallPassesPress = () => {
    console.log('🎬 HALL PASSES: Opening Hall Pass selection');
    setIsNewGameFlow(false); // Not part of new game flow
    setShowHallPassModal(true);
  };

  // Handle when user packs hall passes in new game flow
  const handlePackHallPasses = () => {
    console.log('🎬 NEW GAME: Hall passes packed, showing difficulty selection');
    setShowHallPassModal(false);
    setShowDifficultyModal(true);
  };

  // Hall Pass selection handler for toggling active pass
  const handleHallPassToggle = (passId: string) => {
    console.log('🎬 HALL PASSES: Hall Pass toggled:', passId);
    selectPass(passId);
    // Don't close modal - user can select multiple
    // Note: Modifiers will be computed when difficulty is selected and game starts
  };

  const handleDifficultySelect = async (level: number) => {
    try {
      console.log('🎯 ===== STARTING NEW GAME =====');
      setShowDifficultyModal(false);
      setSelectedLevel(level);

      // Immediately save game state when difficulty is selected
      console.log('💾 Auto-saving game with difficulty level:', level);
      console.log('🎖️ STEP 1: Checking selected hall passes...');
      console.log('🎖️ selectedPasses.length:', selectedPasses.length);
      console.log('🎖️ selectedPasses:', selectedPasses.map(p => p.name));

      // IMPORTANT: Compute hall pass modifiers from selected passes FIRST
      // This must happen BEFORE resetting or generating anything
      console.log('🎖️ STEP 2: Computing hall pass modifiers from selected passes');
      const hallPassModifiers = computeHallPassModifiers(selectedPasses);
      console.log('🎖️ Hall pass modifiers computed:', JSON.stringify(hallPassModifiers));

      // Calculate total periods including hall pass bonus
      const basePeriods = 40;
      const totalPeriods = basePeriods + (hallPassModifiers.extraPeriodsPerDay * 5); // 5 days
      console.log(`🎲 Total periods: ${totalPeriods} (base: ${basePeriods} + bonus: ${hallPassModifiers.extraPeriodsPerDay * 5})`);

      // Generate new seed for fresh game data
      const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSeed(newSeed);
      console.log('🔄 New seed set:', newSeed);

      // Generate game data using the seed with hall pass-adjusted periods
      const gameData = generateSeededGameData(newSeed, totalPeriods);
      setGameData(gameData);
      console.log('🎲 Generated game data with', totalPeriods, 'periods:', gameData.periodEvents.length, 'events');

      // Reset all game state (this preserves selectedPassIds and clears hallPassModifiers)
      console.log('🎖️ STEP 4: Resetting all game state for new game');
      resetGame(); // Preserves selectedPassIds, clears hallPassModifiers via extraReducer
      resetInventory();
      resetJokers();
      resetFlavorText();

      // Initialize wallet with the selected difficulty level
      // NOTE: This will trigger another resetGame() call internally, which clears modifiers
      const existingPlayerName = wallet?.playerName;
      console.log('🎖️ STEP 5: Initializing wallet (this will call resetGame again)');
      wallet?.initializeWallet(level, existingPlayerName);

      // IMPORTANT: Set hall pass modifiers AFTER wallet initialization
      // Because initializeWallet calls resetGame which clears the modifiers
      console.log('🎖️ STEP 6: Setting hall pass modifiers AFTER wallet init');
      console.log('🎖️ About to dispatch setHallPassModifiers with:', JSON.stringify(hallPassModifiers));
      dispatch(setHallPassModifiers(hallPassModifiers));
      console.log('🎖️ ✅ Hall pass modifiers dispatched successfully');

      // Mark game as initialized so continue button works
      setIsInitialized(true);
      console.log('💾 Auto-save complete - game can now be continued');

      // Start fade to black, then show story modal
      console.log('🎬 Starting fade to black for level:', level);
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        // Show story modal after fade to black completes
        console.log('🎬 Showing story modal for level:', level);
        setShowStoryModal(true);
      });
    } catch (error) {
      console.error('❌ Error in handleDifficultySelect:', error);
    }
  };

  const handleCloseDifficultyModal = () => {
    setShowDifficultyModal(false);
  };

  const handleStoryContinue = async () => {
    try {
      console.log(
        '🎬 NEW GAME: Story continue pressed, selectedLevel:',
        selectedLevel
      );
      setShowStoryModal(false);

      if (!selectedLevel) {
        console.error('❌ NEW GAME: No selected level!');
        return;
      }

      // Game is already initialized from difficulty selection, just navigate to story screen
      console.log(
        '🎬 NEW GAME: Game already initialized, navigating to story screen'
      );
      router.push('/story-screen');
      console.log('🎬 NEW GAME: Navigation command sent');
    } catch (error) {
      console.error(
        '❌ NEW GAME: Critical error in handleStoryContinue:',
        error
      );
    }
  };

  const handleTapToSkip = () => {
    // Skip animation and immediately show buttons
    if (!showButtons && !buttonsShown.current) {
      console.log('👆 Screen tapped - skipping to buttons');
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
            onLoad={() => console.log('🖼️ Background image loaded successfully')}
            onError={(error) =>
              console.error('❌ Background image failed to load:', error)
            }
          >
            <View style={styles.titleWrapper}>
              <ExactFontHandwriting
                onAnimationComplete={handleAnimationComplete}
                onCandyComplete={handleCandyComplete}
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

              {__DEV__ && (
                <>
                  <PressableButton
                    onPress={() => {
                      setHasCompletedMarketTutorial(false);
                      setHasCompletedAfterSchoolTutorial(false);
                      console.log('🔧 DEBUG: Tutorial flags reset');
                    }}
                    shadowColor="#6b2d2d"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.4}
                    shadowRadius={5}
                    elevation={8}
                    style={{ width: '80%' }}
                  >
                    <PixelBorder
                      borderColor="#ff6b6b"
                      borderWidth={3}
                      backgroundColor="#ffe8e8"
                      innerPadding={0}
                    >
                      <View style={[styles.button, styles.debugButton]}>
                        <Text style={[styles.buttonText, styles.debugText]}>
                          Reset Tutorial
                        </Text>
                      </View>
                    </PixelBorder>
                  </PressableButton>

                  <PressableButton
                    onPress={() => {
                      console.log('🔧 DEBUG: Setting up WIN scenario - Day 5');
                      // Set to day 5 (period 32 = day 5, period 1)
                      dispatch(setPeriodCount(32));
                      // Give enough money to win (adoption fee + extra)
                      const adoptionFee = wallet.adoptionFee || 1000;
                      dispatch(setBalance(adoptionFee + 100));
                      dispatch(setStashedAmount(0));
                      setIsInitialized(true);
                      console.log('🔧 DEBUG: WIN setup complete - navigate to continue');
                    }}
                    shadowColor="#15803d"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.4}
                    shadowRadius={5}
                    elevation={8}
                    style={{ width: '80%' }}
                  >
                    <PixelBorder
                      borderColor="#4ade80"
                      borderWidth={3}
                      backgroundColor="#d1fae5"
                      innerPadding={0}
                    >
                      <View style={[styles.button, styles.debugButton]}>
                        <Text style={[styles.buttonText, { color: '#15803d' }]}>
                          Debug: Win Setup
                        </Text>
                      </View>
                    </PixelBorder>
                  </PressableButton>

                  <PressableButton
                    onPress={() => {
                      console.log('🔧 DEBUG: Setting up LOSE scenario - Day 5');
                      // Set to day 5 (period 32 = day 5, period 1)
                      dispatch(setPeriodCount(32));
                      // Give not enough money to win
                      const adoptionFee = wallet.adoptionFee || 1000;
                      dispatch(setBalance(adoptionFee - 200));
                      dispatch(setStashedAmount(0));
                      setIsInitialized(true);
                      console.log('🔧 DEBUG: LOSE setup complete - navigate to continue');
                    }}
                    shadowColor="#991b1b"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.4}
                    shadowRadius={5}
                    elevation={8}
                    style={{ width: '80%' }}
                  >
                    <PixelBorder
                      borderColor="#f87171"
                      borderWidth={3}
                      backgroundColor="#fee2e2"
                      innerPadding={0}
                    >
                      <View style={[styles.button, styles.debugButton]}>
                        <Text style={[styles.buttonText, { color: '#991b1b' }]}>
                          Debug: Lose Setup
                        </Text>
                      </View>
                    </PixelBorder>
                  </PressableButton>

                  <PressableButton
                    onPress={async () => {
                      console.log('🔧 DEBUG: Fetching total completions from Firebase...');
                      try {
                        const total = await scoreboardService.getTotalCompletions();
                        console.log('🏆 TOTAL COMPLETIONS FROM FIREBASE:', total);
                        alert(`Total Completions: ${total}`);
                      } catch (error) {
                        console.error('❌ Failed to fetch completions:', error);
                        alert('Error fetching completions - check console');
                      }
                    }}
                    shadowColor="#7e22ce"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.4}
                    shadowRadius={5}
                    elevation={8}
                    style={{ width: '80%' }}
                  >
                    <PixelBorder
                      borderColor="#a855f7"
                      borderWidth={3}
                      backgroundColor="#f3e8ff"
                      innerPadding={0}
                    >
                      <View style={[styles.button, styles.debugButton]}>
                        <Text style={[styles.buttonText, { color: '#7e22ce' }]}>
                          Show Completions
                        </Text>
                      </View>
                    </PixelBorder>
                  </PressableButton>
                </>
              )}
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
  },
  buttonContainer: {
    paddingHorizontal: 60,
    alignItems: 'center',
    gap: 20,
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
  debugButton: {
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
