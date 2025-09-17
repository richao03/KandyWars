import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { useTutorial } from '../../src/context/TutorialContext';

const { width, height } = Dimensions.get('window');

interface TutorialOverlayProps {
  targetRef?: React.RefObject<View>;
  spotlightRadius?: number;
}

export default function TutorialOverlay({ 
  targetRef, 
  spotlightRadius = 60 
}: TutorialOverlayProps) {
  const { 
    isActive, 
    getCurrentStep, 
    nextStep, 
    previousStep, 
    skipTutorial, 
    currentStep 
  } = useTutorial();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const currentTutorialStep = getCurrentStep();

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation for spotlight
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, fadeAnim, pulseAnim]);

  if (!isActive || !currentTutorialStep) {
    return null;
  }

  const getCharacterEmoji = () => {
    switch (currentTutorialStep.character) {
      case 'teacher': return '👩‍🏫';
      case 'student': return '🧑‍🎓';
      case 'principal': return '👨‍💼';
      default: return '👩‍🏫';
    }
  };

  const getDialogPosition = () => {
    switch (currentTutorialStep.position) {
      case 'top': return { top: height * 0.1 };
      case 'bottom': return { bottom: height * 0.15 };
      case 'center':
      default: return { top: height * 0.4 };
    }
  };

  return (
    <Modal visible={isActive} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Dark overlay */}
        <View style={styles.backdrop} />
        
        {/* Spotlight effect would go here if targeting specific element */}
        {targetRef && (
          <Animated.View 
            style={[
              styles.spotlight,
              { 
                transform: [{ scale: pulseAnim }],
                width: spotlightRadius * 2,
                height: spotlightRadius * 2,
                borderRadius: spotlightRadius,
              }
            ]} 
          />
        )}

        {/* Tutorial dialog */}
        <View style={[styles.dialog, getDialogPosition()]}>
          <View style={styles.dialogContent}>
            {/* Character */}
            <View style={styles.characterContainer}>
              <Text style={styles.characterEmoji}>{getCharacterEmoji()}</Text>
            </View>

            {/* Content */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{currentTutorialStep.title}</Text>
              <Text style={styles.description}>{currentTutorialStep.description}</Text>
            </View>

            {/* Navigation */}
            <View style={styles.navigationContainer}>
              <View style={styles.leftButtons}>
                {currentStep > 0 && (
                  <TouchableOpacity style={styles.navButton} onPress={previousStep}>
                    <Text style={styles.navButtonText}>← Back</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.centerButtons}>
                <TouchableOpacity style={styles.skipButton} onPress={skipTutorial}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rightButtons}>
                <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
                  <Text style={styles.nextButtonText}>
                    {currentStep === 0 ? 'Start!' : 'Next →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  spotlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 3,
    borderColor: '#f7e98e',
  },
  dialog: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 20,
    backgroundColor: '#fef7e3',
    borderWidth: 3,
    borderColor: '#d4a574',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  dialogContent: {
    padding: 20,
  },
  characterContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  characterEmoji: {
    fontSize: 48,
  },
  textContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#5d4037',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    lineHeight: 22,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftButtons: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerButtons: {
    flex: 1,
    alignItems: 'center',
  },
  rightButtons: {
    flex: 1,
    alignItems: 'flex-end',
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  navButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'CrayonPastel',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffcdd2',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#d32f2f',
    fontFamily: 'CrayonPastel',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#4caf50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
  },
});