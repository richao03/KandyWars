import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface NavigationTutorialProps {
  isActive: boolean;
  onComplete: () => void;
}

const tutorialSteps = [
  {
    id: 'intro',
    title: 'Navigation Bar Tutorial',
    description: "Welcome to Day 2! Let's explore the navigation bar at the bottom of your screen. You can access important features from here anytime!",
    action: null,
    buttonText: "Let's Go!",
  },
  {
    id: 'jokers',
    title: '🃏 Jokers Tab',
    description: 'The Jokers tab shows all available joker cards and the ones you own. You can activate instant skills from this view to boost your trading!',
    action: () => router.push('/(tabs)/jokers'),
    buttonText: 'View Jokers',
  },
  {
    id: 'history',
    title: '📊 History Tab',
    description: 'The History tab displays candy price trends for the past 10 periods. Use this data to predict future prices and make smart trades!',
    action: () => router.push('/(tabs)/price-history'),
    buttonText: 'View History',
  },
  {
    id: 'settings',
    title: '⚙️ Settings Tab',
    description: 'The Settings tab lets you restart your game, return to the title screen, or adjust game options.',
    action: () => router.push('/(tabs)/settings'),
    buttonText: 'View Settings',
  },
  {
    id: 'home',
    title: '🏠 Home Tab',
    description: 'The Home tab brings you back to the main screen where you can see your current stats and quick actions.',
    action: () => router.push('/(tabs)/home'),
    buttonText: 'View Home',
  },
  {
    id: 'complete',
    title: 'Tutorial Complete!',
    description: "Great! You've learned about all the navigation tabs. Now back to trading - remember to check these tabs regularly for valuable information!",
    action: () => router.push('/(tabs)/market'),
    buttonText: 'Back to Market',
  },
];

export default function NavigationTutorial({ isActive, onComplete }: NavigationTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      setCurrentStep(0);
    }
  }, [isActive]);

  const handleNext = () => {
    const step = tutorialSteps[currentStep];

    // Execute the navigation action if it exists
    if (step.action) {
      step.action();
    }

    // Move to next step or complete
    if (currentStep < tutorialSteps.length - 1) {
      // Add a small delay for navigation to happen
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 500);
    } else {
      // Tutorial complete
      setIsVisible(false);
      onComplete();
    }
  };

  if (!isVisible) return null;

  const step = tutorialSteps[currentStep];

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.stepIndicator}>
            Step {currentStep + 1} of {tutorialSteps.length}
          </Text>

          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                setIsVisible(false);
                router.push('/(tabs)/market');
                onComplete();
              }}
            >
              <Text style={styles.skipText}>Skip Tutorial</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextText}>{step.buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fef7e3',
    borderRadius: 20,
    padding: 24,
    maxWidth: 380,
    width: '100%',
    borderWidth: 3,
    borderColor: '#d4a574',
    shadowColor: '#8b4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  stepIndicator: {
    fontSize: 12,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#5d4037',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
  },
  skipText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'CrayonPastel',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#388e3c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nextText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
  },
});