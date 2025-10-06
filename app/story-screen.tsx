import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useWallet } from '../src/hooks/useWallet';
import NamePromptModal from './components/NamePromptModal';
import PixelBorder from './components/PixelBorder';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getDogImage = (level: number) => {
  switch (level) {
    case 1:
      return require('../assets/images/doggs/pug.png');
    case 2:
      return require('../assets/images/doggs/brussleGriffon.png');
    case 3:
      return require('../assets/images/doggs/evee.png');
    case 4:
      return require('../assets/images/doggs/byul.png');
    case 5:
      return require('../assets/images/doggs/caneCorso.png');
    case 6:
      return require('../assets/images/doggs/pitbull.png');
    case 7:
      return require('../assets/images/doggs/afghan.png');
    case 8:
      return require('../assets/images/doggs/germanShepard.png');
    default:
      return require('../assets/images/doggs/pug.png');
  }
};

const getDogBreed = (level: number) => {
  switch (level) {
    case 1:
      return 'Peg the Pug';
    case 2:
      return 'Brussels Griffon';
    case 3:
      return 'Evee Cat';
    case 4:
      return 'Byul Terrier';
    case 5:
      return 'Cane Corso';
    case 6:
      return 'Pitbull';
    case 7:
      return 'Afghan Hound';
    case 8:
      return 'German Shepherd';
    default:
      return 'Pug';
  }
};

const getStoryLines = (breed: string, cost: string) => {
  const story = [];

  // First line with breed and cost highlights
  switch (breed) {
    case 'Brussels Griffon':
      story.push({
        highlights: [
          { text: `There's an adorable ` },
          { text: breed, color: '#6b4423' },
          {
            text: ` at the pet rescue that needs a home. The adoption costs total `,
          },
          { text: `$${cost}`, color: '#4a7c4a' },
          { text: `.` },
        ],
      });
      break;
    case 'Evee Cat':
      story.push({
        highlights: [
          { text: `You've found the perfect companion - a playful ` },
          { text: breed, color: '#6b4423' },
          { text: ` that needs ` },
          { text: `$${cost}`, color: '#4a7c4a' },
          { text: ` for adoption and care.` },
        ],
      });
      break;
    case 'Byul Terrier':
      story.push({
        highlights: [
          { text: `At the premium pet boutique, you've met ` },
          { text: breed, color: '#6b4423' },
          { text: ` - an elegant rare breed that costs ` },
          { text: `$${cost}`, color: '#4a7c4a' },
          { text: `.` },
        ],
      });
      break;
    case 'Cane Corso':
      story.push({
        highlights: [
          { text: `A very serious looking ` },
          { text: breed, color: '#6b4423' },
          { text: ` at the specialized rescue needs ` },
          { text: `$${cost}`, color: '#4a7c4a' },
          { text: ` for adoption plus specialized training.` },
        ],
      });
      break;
    case 'Pitbull':
      story.push({
        highlights: [
          { text: `There's a misunderstood ` },
          { text: breed, color: '#6b4423' },
          {
            text: ` at the sanctuary. The rehabilitation and adoption costs total `,
          },
          { text: `$${cost}`, color: '#4a7c4a' },
          { text: `.` },
        ],
      });
      break;
    case 'Afghan Hound':
      story.push({
        highlights: [
          { text: `An elengant ` },
          { text: breed, color: '#6b4423' },
          { text: ` from a championship bloodline needs ` },
          { text: `$${cost}`, color: '#4a7c4a' },
          { text: ` for a new home.` },
        ],
      });
      break;
    case 'German Shepherd':
      story.push({
        highlights: [
          { text: `A retired service ` },
          { text: breed, color: '#6b4423' },
          { text: ` needs ` },
          { text: `$${cost}`, color: '#4a7c4a' },
          { text: ` for adoption and lifetime care.` },
        ],
      });
      break;
    case 'Peg the Pug':
    default:
      story.push({
        highlights: [
          { text: `There it was, the most perfect ` },
          { text: breed, color: '#6b4423' },
          { text: ` you ever did see. You have one week to stack up ` },
          { text: `$${cost}`, color: '#85BB65' },
          { text: ` needed to bring it home.` },
        ],
      });
      break;
  }

  // Add empty line for spacing
  story.push({ text: '', highlights: [] });

  // Add the buzzing hallways line with joker highlight
  story.push({
    highlights: [
      {
        text: 'But you only have',
      },
      { text: ' 5 days', color: '#ff6b35' },
      {
        text: " to get the money together, before someone else takes 'em home!",
      },
      // The hallways are buzzing, the cafeteria is whispering, and '
    ],
  });

  // Add empty line for spacing
  story.push({ text: '', highlights: [] });

  // Add the final motivational line
  story.push({
    text: "They don't call you the for no reason, ",
    highlights: [
      { text: "They don't call you " },
      { text: 'The Candy King ', color: '#7851A9' },
      { text: 'for nothing, ' },
      {
        text: "it's time to embrace the halls and hug the block. It's time make a legendary run.",
      },
    ],
  });

  return story;
};

export default function StoryScreen() {
  const wallet = useWallet();
  const currentLevel = wallet?.difficultyLevel || 1;
  const dogBreed = getDogBreed(currentLevel);
  const adoptionFee = wallet?.adoptionFee || 5000;

  const storyLines = getStoryLines(dogBreed, adoptionFee.toLocaleString());

  // Early return if story data is invalid
  if (!storyLines || storyLines.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.textContainer}>
          <Text style={styles.storyText}>
            Error: No story available. Please restart the game.
          </Text>
        </View>
      </View>
    );
  }

  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showSkip, setShowSkip] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);

  const typewriterSpeed = 25; // milliseconds per character
  const lineDelay = 400; // delay between lines
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heartLeftAnim = useRef(new Animated.Value(0)).current;
  const heartRightAnim = useRef(new Animated.Value(0)).current;

  // Pulsating glow animation for Start Day 1 button
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  // Initialize with a small delay to prevent flash
  useEffect(() => {
    console.log('🎬 StoryScreen: Initializing...');
    const initTimer = setTimeout(() => {
      console.log('🎬 StoryScreen: Setting isReady to true');
      setIsReady(true);
    }, 100);
    return () => clearTimeout(initTimer);
  }, []);

  // Typewriter effect with proper cleanup
  useEffect(() => {
    if (!isReady) return; // Don't start until ready

    if (currentLineIndex >= storyLines.length) {
      // Safety check: don't auto-show continue if story is empty or something is wrong
      if (storyLines.length === 0) {
        return;
      }

      setIsTyping(false);
      setShowContinue(true);

      // Start pulsating glow animation for Start Day 1 button
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.9, {
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      return;
    }

    const currentLine = storyLines[currentLineIndex];
    let charIndex = 0;
    setDisplayedText('');

    // Get the full text content for typing
    const fullText =
      currentLine.highlights && currentLine.highlights.length > 0
        ? currentLine.highlights.map((h) => h.text).join('')
        : currentLine.text || '';

    let typeInterval: NodeJS.Timeout | null = null;
    let lineDelayTimeout: NodeJS.Timeout | null = null;

    typeInterval = setInterval(() => {
      if (charIndex <= fullText.length) {
        setDisplayedText(fullText.substring(0, charIndex));
        charIndex++;
      } else {
        if (typeInterval) clearInterval(typeInterval);
        // Wait before starting next line
        lineDelayTimeout = setTimeout(() => {
          setCurrentLineIndex((prev) => prev + 1);
        }, lineDelay);
      }
    }, typewriterSpeed);

    // Cleanup function - clear both interval and timeout
    return () => {
      if (typeInterval) clearInterval(typeInterval);
      if (lineDelayTimeout) clearTimeout(lineDelayTimeout);
    };
  }, [currentLineIndex, isReady, storyLines.length]);

  // Cursor blink animation
  useEffect(() => {
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    if (isTyping) {
      blinkAnimation.start();
    } else {
      blinkAnimation.stop();
      blinkAnim.setValue(0); // Hide cursor when done
    }

    return () => blinkAnimation.stop();
  }, [isTyping]);

  // Show skip button after a few seconds with cleanup
  useEffect(() => {
    let animationHandle: any = null;
    const timer = setTimeout(() => {
      setShowSkip(true);
      animationHandle = Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      });
      animationHandle.start();
    }, 3000);

    return () => {
      clearTimeout(timer);
      if (animationHandle) {
        animationHandle.stop();
      }
    };
  }, []);

  // Floating heart animations
  useEffect(() => {
    const leftHeartAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(heartLeftAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(heartLeftAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    const rightHeartAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(heartRightAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(heartRightAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    leftHeartAnimation.start();
    rightHeartAnimation.start();

    return () => {
      leftHeartAnimation.stop();
      rightHeartAnimation.stop();
    };
  }, []);

  const handleSkip = () => {
    setUserHasInteracted(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Check if user has a name, if not show name modal, otherwise go to market
    if (!wallet?.playerName || wallet.playerName.trim() === '') {
      setShowNameModal(true);
    } else {
      router.replace('/(tabs)/market');
    }
  };

  const handleContinue = () => {
    setUserHasInteracted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Check if user has a name, if not show name modal, otherwise go to market
    if (!wallet?.playerName || wallet.playerName.trim() === '') {
      setShowNameModal(true);
    } else {
      router.replace('/(tabs)/market');
    }
  };

  const handleTapToSkip = () => {
    setUserHasInteracted(true);
    if (currentLineIndex < storyLines.length - 1) {
      // Skip to end
      setCurrentLineIndex(storyLines.length);
      setDisplayedText('Time to become a candy mogul...');
      setIsTyping(false);
      setShowContinue(true);
    }
  };

  const handleNameSubmit = async (name: string) => {
    setShowNameModal(false);

    if (wallet?.setPlayerName) {
      wallet.setPlayerName(name);
    }

    // Initialize wallet with the name and go to market
    if (wallet?.difficultyLevel) {
      wallet?.initializeWallet(wallet.difficultyLevel, name);
    }

    router.replace('/(tabs)/market');
  };

  const handleNameSkip = () => {
    setShowNameModal(false);

    // Initialize wallet with default name and go to market
    if (wallet?.difficultyLevel) {
      wallet?.initializeWallet(wallet.difficultyLevel, 'Player');
      wallet?.setPlayerName('Player');
    }

    router.replace('/(tabs)/market');
  };

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  // Render styled text with colors
  const renderStyledText = () => {
    const result = [];

    // Add all previous completed lines
    for (let i = 0; i < currentLineIndex; i++) {
      const line = storyLines[i];
      if (!line) continue; // Safety check for undefined lines

      if (line.highlights && line.highlights.length > 0) {
        // Render highlighted text
        line.highlights.forEach((highlight, idx) => {
          result.push(
            <Text
              key={`${i}-${idx}`}
              style={[
                styles.storyText,
                highlight.color ? { color: highlight.color } : {},
              ]}
            >
              {highlight.text}
            </Text>
          );
        });
      } else {
        // Regular text
        result.push(
          <Text key={i} style={styles.storyText}>
            {line.text}
          </Text>
        );
      }
      if (i < currentLineIndex - 1 || displayedText) {
        result.push(
          <Text key={`newline-${i}`} style={styles.storyText}>
            {'\n'}
          </Text>
        );
      }
    }

    // Add current line being typed
    if (currentLineIndex < storyLines.length && displayedText) {
      const currentLine = storyLines[currentLineIndex];
      if (!currentLine) return result; // Safety check for undefined line

      if (currentLine.highlights && currentLine.highlights.length > 0) {
        // For highlighted lines, we need to figure out which parts to show
        let charCount = 0;
        currentLine.highlights.forEach((highlight, idx) => {
          const segmentEnd = charCount + highlight.text.length;
          if (displayedText.length > charCount) {
            const visibleText = displayedText.substring(
              charCount,
              Math.min(displayedText.length, segmentEnd)
            );
            if (visibleText) {
              result.push(
                <Text
                  key={`current-${idx}`}
                  style={[
                    styles.storyText,
                    highlight.color ? { color: highlight.color } : {},
                  ]}
                >
                  {visibleText}
                </Text>
              );
            }
          }
          charCount = segmentEnd;
        });
      } else {
        result.push(
          <Text key="current" style={styles.storyText}>
            {displayedText}
          </Text>
        );
      }
    }

    return result;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Dog image in top center with floating hearts */}
      <Image source={getDogImage(currentLevel)} style={styles.dogImage} />
      <Animated.Image
        source={require('../assets/images/emojis/loveheart.png')}
        style={[
          styles.heartLeft,
          {
            transform: [
              {
                translateY: heartLeftAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -15],
                }),
              },
              {
                scale: heartLeftAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 1.2, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.Image
        source={require('../assets/images/emojis/loveheart.png')}
        style={[
          styles.heartRight,
          {
            transform: [
              {
                translateY: heartRightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -20],
                }),
              },
              {
                scale: heartRightAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 1.3, 1],
                }),
              },
            ],
          },
        ]}
      />

      {/* Main story area - tap to skip */}
      <TouchableOpacity
        style={styles.storyArea}
        onPress={handleTapToSkip}
        activeOpacity={1}
      >
        <View style={styles.textContainer}>
          <Text style={styles.storyText}>
            {isReady && renderStyledText()}
            {isReady && isTyping && (
              <Animated.Text style={[styles.cursor, { opacity: blinkAnim }]}>
                |
              </Animated.Text>
            )}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Skip button */}
      {showSkip && (
        <Animated.View style={[styles.skipContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Continue button */}
      {showContinue && (
        <View style={styles.continueContainer}>
          <View style={{ position: 'relative' }}>
            <PixelBorder borderColor="#5f5f5f" borderWidth={3} innerPadding={0}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
              >
                <Text style={styles.continueText}>Start Day 1</Text>
              </TouchableOpacity>
            </PixelBorder>
          </View>
          <Text style={styles.tapHint}>
            Your future best friend is waiting...
          </Text>
        </View>
      )}

      {/* Nested Name Modal */}
      <NamePromptModal
        visible={showNameModal}
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
  dogImage: {
    position: 'absolute',
    top: 60,
    left: '50%',
    marginLeft: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  heartLeft: {
    position: 'absolute',
    top: 100,
    left: '50%',
    marginLeft: -90,
    width: 24,
    height: 24,
    zIndex: 11,
  },
  heartRight: {
    position: 'absolute',
    top: 100,
    left: '50%',
    marginLeft: 70,
    width: 24,
    height: 24,
    zIndex: 11,
  },
  storyArea: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  textContainer: {
    paddingHorizontal: 40,
    paddingTop: 180,
    width: '100%',
    height: '100%',
    alignSelf: 'flex-start',
  },
  storyText: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 22,
    fontFamily: 'PixeloidMono',
    textAlign: 'left',
    letterSpacing: 0.5,
  },
  cursor: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  skipContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'PixeloidMono',
  },
  continueContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ff8c42',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
  tapHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    marginTop: 15,
    fontStyle: 'italic',
  },
  glowContainer: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    zIndex: -1,
  },
  glow: {
    flex: 1,
    backgroundColor: '#ff6b35',
    borderRadius: 25,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 15,
  },
});
