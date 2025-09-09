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
import ExactFontHandwriting from './ExactFontHandwriting';
import DifficultySelectionModal from './DifficultySelectionModal';

const { width, height } = Dimensions.get('window');

interface CandyWarsTitleScreenProps {
  onNewGame?: (difficulty: 'easy' | 'medium' | 'hard') => void;
  onContinue?: () => void;
  onSettings?: () => void;
}

export default function CandyWarsTitleScreen({
  onNewGame,
  onContinue,
  onSettings,
}: CandyWarsTitleScreenProps) {
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonsShown = useRef(false);

  // Reset component state when it mounts/re-mounts
  useEffect(() => {
    console.log('🎬 CandyWarsTitleScreen: Component mounted, resetting state');
    setAnimationComplete(false);
    setShowButtons(false);
    setShowDifficultyModal(false);
    buttonsShown.current = false;
    buttonOpacity.setValue(0);
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

  const handleNewGamePress = () => {
    setShowDifficultyModal(true);
  };

  const handleDifficultySelect = (difficulty: 'easy' | 'medium' | 'hard') => {
    setShowDifficultyModal(false);
    if (onNewGame) {
      onNewGame(difficulty);
    }
  };

  const handleCloseDifficultyModal = () => {
    setShowDifficultyModal(false);
  };

  console.log('🎬 CandyWarsTitleScreen: Rendering - showButtons:', showButtons, 'animationComplete:', animationComplete);

  return (
    <View style={styles.container}>
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

        <DifficultySelectionModal
          visible={showDifficultyModal}
          onSelectDifficulty={handleDifficultySelect}
          onClose={handleCloseDifficultyModal}
        />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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