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
import DifficultySelectionModal from './DifficultySelectionModal';
import ExactFontHandwriting from './ExactFontHandwriting';
import HallPassModal from './HallPassModal';
import PixelBorder from './PixelBorder';
import StoryModal from './StoryModal';

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
  const { resetGame, periodCount, isInitialized, setIsInitialized } = useGame();
  const { resetInventory } = useInventory();
  const { resetJokers } = useJokers();
  const { resetFlavorText } = useFlavorText();
  const { setSeed } = useSeed();
  const { selectPass } = useHallPass();
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
  }, []);

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

  const handleNewGamePress = async () => {
    try {
      console.log('🎬 NEW GAME: Starting new game process');
      // Go straight to difficulty selection
      console.log('🎬 NEW GAME: Showing difficulty selection');
      setShowDifficultyModal(true);
    } catch (error) {
      console.error('❌ NEW GAME: Error in handleNewGamePress:', error);
    }
  };

  // Hall Passes button shows selection mode for toggling active Hall Pass
  const handleHallPassesPress = () => {
    console.log('🎬 HALL PASSES: Opening Hall Pass selection');
    setShowHallPassModal(true);
  };

  // Hall Pass selection handler for toggling active pass
  const handleHallPassToggle = (passId: string | null) => {
    console.log('🎬 HALL PASSES: Hall Pass toggled:', passId);
    selectPass(passId);
    setShowHallPassModal(false);
  };

  const handleDifficultySelect = async (level: number) => {
    try {
      setShowDifficultyModal(false);
      setSelectedLevel(level);

      // Immediately save game state when difficulty is selected
      console.log('💾 Auto-saving game with difficulty level:', level);

      // Generate new seed for fresh game data
      const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSeed(newSeed);
      console.log('🔄 New seed set:', newSeed);

      // Reset all game state before initializing new game
      console.log('🔄 Resetting all game state for new game');
      resetGame();
      resetInventory();
      resetJokers();
      resetFlavorText();

      // Initialize wallet with the selected difficulty level
      // This will trigger auto-save via redux-persist and handle all other resets
      const existingPlayerName = wallet?.playerName;
      console.log('💾 Initializing wallet for auto-save with level:', level);
      wallet?.initializeWallet(level, existingPlayerName);

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

  console.log(
    '🎬 CandyWarsTitleScreen: Rendering - showButtons:',
    showButtons,
    'animationComplete:',
    animationComplete
  );

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <Animated.View
        style={[styles.backgroundWrapper, { opacity: backgroundOpacity }]}
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
              <PixelBorder
                borderColor="#4a7c4a"
                borderWidth={3}
                backgroundColor="#d4f6d4"
                style={{ width: '80%' }}
                innerPadding={0}
              >
                <TouchableOpacity
                  style={[styles.button, styles.newGameButton]}
                  onPress={handleNewGamePress}
                >
                  <Text style={[styles.buttonText, styles.newGameText]}>
                    New Game
                  </Text>
                </TouchableOpacity>
              </PixelBorder>

              <PixelBorder
                borderColor={!isInitialized ? '#ccc' : '#b85c8a'}
                borderWidth={3}
                backgroundColor={!isInitialized ? '#e0e0e0' : '#ffd6e8'}
                style={{ width: '80%', opacity: !isInitialized ? 0.6 : 1 }}
                innerPadding={0}
              >
                <TouchableOpacity
                  style={[styles.button, styles.continueButton]}
                  onPress={!isInitialized ? undefined : onContinue}
                  disabled={!isInitialized}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      styles.continueText,
                      !isInitialized && styles.disabledText,
                    ]}
                  >
                    {'Continue'}
                  </Text>
                </TouchableOpacity>
              </PixelBorder>

              <PixelBorder
                borderColor="#b8a05c"
                borderWidth={3}
                backgroundColor="#fff2d6"
                style={{ width: '80%' }}
                innerPadding={0}
              >
                <TouchableOpacity
                  style={[styles.button, styles.hallPassButton]}
                  onPress={handleHallPassesPress}
                >
                  <Text style={[styles.buttonText, styles.hallPassText]}>
                    Hall Passes
                  </Text>
                </TouchableOpacity>
              </PixelBorder>

              <PixelBorder
                borderColor="#5c7cb8"
                borderWidth={3}
                backgroundColor="#d6e8ff"
                style={{ width: '80%' }}
                innerPadding={0}
              >
                <TouchableOpacity
                  style={[styles.button, styles.settingsButton]}
                  onPress={onSettings}
                >
                  <Text style={[styles.buttonText, styles.settingsText]}>
                    Settings
                  </Text>
                </TouchableOpacity>
              </PixelBorder>
            </Animated.View>
          )}
        </ImageBackground>
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
        onClose={() => setShowHallPassModal(false)}
        onSelectPass={handleHallPassToggle}
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
  disabledText: {
    color: '#999',
  },
});
