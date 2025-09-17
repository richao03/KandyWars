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
import NamePromptModal from './NamePromptModal';
import StoryModal from './StoryModal';
import { useWallet } from '../../src/context/WalletContext';
import { nameValidationService } from '../../src/services/nameValidationService';
import { scoreboardService } from '../../src/services/firebase';
import { savePlayerNameStatus } from '../../src/utils/persistence';

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
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
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
    setShowNamePrompt(false);
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

  const handleStoryContinue = () => {
    setShowStoryModal(false);

    if (!selectedLevel) return;

    // Check if user already has a name (loaded from Firebase on app start)
    if (wallet?.playerName) {
      console.log('🎬 User already has a name:', wallet.playerName, ', proceeding to story screen');
      // Initialize wallet with level and existing name
      wallet?.initializeWallet(selectedLevel, wallet.playerName);

      // Call the new game reset logic before navigating to story screen
      if (onNewGame) {
        onNewGame(selectedLevel);
      }

      // Navigate to story screen instead of directly to game
      console.log('🎬 Attempting to navigate to story-screen');
      setTimeout(() => {
        try {
          console.log('🎬 Executing delayed navigation to story-screen');
          router.replace('/story-screen');
          console.log('🎬 Navigation call completed');
        } catch (error) {
          console.error('🎬 Navigation error:', error);
        }
      }, 500);
    } else {
      console.log('🎬 User does not have a name, showing name prompt');
      setShowNamePrompt(true);
    }
  };

  const handleNameSubmit = async (name: string) => {
    console.log('🎬 Name submitted:', name);
    setShowNamePrompt(false);
    
    if (selectedLevel && onNewGame && wallet?.playerId) {
      try {
        // Initialize Firebase services
        await scoreboardService.initialize();
        
        // Reserve the name in Firebase using the wallet's player ID
        const nameReserved = await nameValidationService.reserveName(name, wallet.playerId);
        
        if (nameReserved) {
          console.log('✅ Name reserved successfully in Firebase');
          // Update local wallet state with the new name
          wallet?.setPlayerName(name);
          await savePlayerNameStatus(true);
        } else {
          console.warn('⚠️ Failed to reserve name in Firebase, proceeding anyway');
          // Still update local state
          wallet?.setPlayerName(name);
        }
        
        // Initialize wallet with both level and name
        wallet?.initializeWallet(selectedLevel, name);

        // Call the new game reset logic before navigating to story screen
        if (onNewGame) {
          onNewGame(selectedLevel);
        }

        // Navigate to story screen instead of directly to game
        router.push('/story-screen');
      } catch (error) {
        console.error('Error during name submission:', error);
        // Still proceed with the game and update local state
        wallet?.setPlayerName(name);
        wallet?.initializeWallet(selectedLevel, name);

        // Call the new game reset logic before navigating to story screen
        if (onNewGame) {
          onNewGame(selectedLevel);
        }

        // Navigate to story screen instead of directly to game
        router.push('/story-screen');
      }
    }
  };

  const handleNameSkip = () => {
    console.log('🎬 Name skipped, using default');
    setShowNamePrompt(false);

    if (selectedLevel) {
      // Initialize wallet with level and default name
      wallet?.initializeWallet(selectedLevel, 'Player');
      // Navigate to story screen instead of directly to game
      router.push('/story-screen');
    }
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

      <NamePromptModal
        visible={showNamePrompt}
        onSubmitName={handleNameSubmit}
        onSkip={handleNameSkip}
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