import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import ExactFontHandwriting from './ExactFontHandwriting';
import DifficultySelectionModal from './DifficultySelectionModal';
import StoryModal from './StoryModal';
import { useWallet } from '../../src/context/WalletContext';
import { useGame } from '../../src/context/GameContext';
import { useInventory } from '../../src/context/InventoryContext';
import { useJokers } from '../../src/context/JokerContext';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useSeed } from '../../src/context/SeedContext';

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
  const { resetGame } = useGame();
  const { resetInventory } = useInventory();
  const { resetJokers } = useJokers();
  const { resetFlavorText } = useFlavorText();
  const { setSeed } = useSeed();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;
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
    // Reset wallet first before showing difficulty selection
    if (wallet?.resetWallet) {
      console.log('🎬 Resetting wallet before difficulty selection');
      await wallet.resetWallet();
    }
    setShowDifficultyModal(true);
  };

  const handleDifficultySelect = (level: number) => {
    setShowDifficultyModal(false);
    setSelectedLevel(level);

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
  };

  const handleCloseDifficultyModal = () => {
    setShowDifficultyModal(false);
  };

  const handleStoryContinue = async () => {
    setShowStoryModal(false);

    if (!selectedLevel) return;

    // Reset all game data for a fresh start
    console.log('🔄 CandyWarsTitleScreen: Starting game reset...');
    try {
      await resetGame();
      // Reset all contexts
      resetInventory();
      resetJokers();
      resetFlavorText();

      // Generate new seed for fresh game data and candy prices
      const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSeed(newSeed);
      console.log('🔄 CandyWarsTitleScreen: Game reset complete');
    } catch (error) {
      console.error('🔄 CandyWarsTitleScreen: Game reset failed:', error);
    }

    // Preserve existing player name - don't clear it unnecessarily
    // The story screen will handle name prompting if needed
    const existingPlayerName = wallet?.playerName;
    console.log('🎬 Preserving existing player name:', existingPlayerName);

    // Initialize wallet with the selected level and existing player name
    wallet?.initializeWallet(selectedLevel, existingPlayerName);

    // Always go to story screen first, username check happens there
    console.log('🎬 Going to story screen after story modal');
    router.push('/story-screen');
  };


  console.log('🎬 CandyWarsTitleScreen: Rendering - showButtons:', showButtons, 'animationComplete:', animationComplete);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backgroundWrapper, { opacity: backgroundOpacity }]}>
        <ImageBackground
          source={require('../../assets/images/titleScreen.png')}
          style={styles.backgroundContainer}
          resizeMode="cover"
          onLoad={() => console.log('🖼️ Background image loaded successfully')}
          onError={(error) => console.error('❌ Background image failed to load:', error)}
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
              <TouchableOpacity
                style={[styles.button, styles.newGameButton]}
                onPress={handleNewGamePress}
              >
                <Text style={[styles.buttonText, styles.newGameText]}>
                  New Game
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.continueButton]}
                onPress={onContinue}
              >
                <Text style={[styles.buttonText, styles.continueText]}>
                  Continue
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.settingsButton]}
                onPress={onSettings}
              >
                <Text style={[styles.buttonText, styles.settingsText]}>
                  Settings
                </Text>
              </TouchableOpacity>
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

    </View>
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
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '80%',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  newGameButton: {
    backgroundColor: '#d4f6d4', // Light green
    borderColor: '#4a7c4a',
    fontFamily: 'CrayonPastel',
  },
  continueButton: {
    backgroundColor: '#ffd6e8', // Light pink
    borderColor: '#b85c8a',
    fontFamily: 'CrayonPastel',
  },
  settingsButton: {
    backgroundColor: '#d6e8ff', // Light blue
    borderColor: '#5c7cb8',
    fontFamily: 'CrayonPastel',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
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
  settingsText: {
    color: '#4a5a8a', // Dark blue
  },
});