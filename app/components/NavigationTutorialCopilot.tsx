import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  CopilotProvider,
  CopilotStep,
  useCopilot,
  walkthroughable,
} from 'react-native-copilot';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const CopilotText = walkthroughable(Text);
const CopilotTouchableOpacity = walkthroughable(TouchableOpacity);

interface NavigationTutorialCopilotProps {
  isActive: boolean;
  onComplete: () => void;
}

function NavigationTutorialContent({ isActive, onComplete }: NavigationTutorialCopilotProps) {
  const { start, copilotEvents } = useCopilot();

  useEffect(() => {
    if (isActive) {
      // Small delay to ensure the UI is ready
      setTimeout(() => {
        start();
      }, 500);
    }
  }, [isActive, start]);

  useEffect(() => {
    let listener: any;
    let stopListener: any;

    if (copilotEvents) {
      listener = copilotEvents.on('stepChange', (step) => {
        console.log('🎯 Tutorial step changed to:', step?.order);
        if (step?.order) {
          // Auto-navigate based on step
          if (step.order === 2) {
            setTimeout(() => router.push('/(tabs)/jokers'), 1000);
          } else if (step.order === 3) {
            setTimeout(() => router.push('/(tabs)/price-history'), 1000);
          } else if (step.order === 4) {
            setTimeout(() => router.push('/(tabs)/settings'), 1000);
          } else if (step.order === 5) {
            setTimeout(() => router.push('/(tabs)/home'), 1000);
          }
        }
      });

      stopListener = copilotEvents.on('stop', () => {
        console.log('🎯 Tutorial completed');
        onComplete();
      });
    }

    return () => {
      if (listener && listener.remove) {
        listener.remove();
      }
      if (stopListener && stopListener.remove) {
        stopListener.remove();
      }
    };
  }, [copilotEvents, onComplete]);

  return (
    <View style={styles.container}>
      {/* Step 1: Introduction */}
      <CopilotStep
        text="Welcome to Day 2! Let's explore the navigation bar at the bottom of your screen. You can access important features from here anytime!"
        order={1}
        name="nav_intro"
      >
        <CopilotTouchableOpacity style={styles.centerElement}>
          <Text style={styles.tutorialText}>📱 Navigation Tutorial</Text>
        </CopilotTouchableOpacity>
      </CopilotStep>
    </View>
  );
}

export default function NavigationTutorialCopilot(props: NavigationTutorialCopilotProps) {
  return (
    <CopilotProvider>
      <NavigationTutorialContent {...props} />
    </CopilotProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  centerElement: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 10,
    pointerEvents: 'auto',
  },
  tutorialText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});