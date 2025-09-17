import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TutorialStage, TutorialStep, shouldShowTutorial, getTutorialForStage } from '../data/progressiveTutorials';
import { scoreboardService } from '../services/firebase';


interface TutorialContextType {
  currentTutorial: string | null;
  currentStep: number;
  isActive: boolean;
  completedTutorials: string[];
  tutorialEnabled: boolean;
  startTutorial: (tutorialId: string, steps: TutorialStep[]) => void;
  startProgressiveTutorial: (stage: TutorialStage) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  isTutorialCompleted: (tutorialId: string) => boolean;
  getCurrentStep: () => TutorialStep | null;
  resetTutorial: () => Promise<void>;
  resetAllTutorials: () => Promise<void>;
  checkAndTriggerTutorial: (stage: TutorialStage, gameState: any) => void;
  setTutorialEnabled: (enabled: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

const TUTORIAL_STORAGE_KEY = 'tutorial_progress';
const TUTORIAL_ENABLED_KEY = 'tutorial_enabled';
const FIREBASE_TUTORIAL_KEY = 'tutorialProgress';

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [currentTutorial, setCurrentTutorial] = useState<string | null>(null);
  const [currentSteps, setCurrentSteps] = useState<TutorialStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);
  const [tutorialEnabled, setTutorialEnabledState] = useState(true); // Always enabled for debugging
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Load tutorial progress and settings on mount
  useEffect(() => {
    const loadTutorialData = async () => {
      try {
        // Load player ID
        const storedPlayerId = await AsyncStorage.getItem('playerId');
        if (storedPlayerId) {
          setPlayerId(storedPlayerId);
        }

        // Load tutorial enabled state - always enabled for debugging
        const enabled = await AsyncStorage.getItem(TUTORIAL_ENABLED_KEY);
        setTutorialEnabledState(true); // Force to true for debugging

        // Try to load from Firebase first
        if (storedPlayerId) {
          await scoreboardService.initialize();
          const firebaseData = await scoreboardService.getTutorialProgress(storedPlayerId);
          if (firebaseData && firebaseData.completedTutorials) {
            console.log('📚 Tutorial: Loaded from Firebase:', firebaseData.completedTutorials);
            setCompletedTutorials(firebaseData.completedTutorials);
            // Sync to local storage
            await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(firebaseData.completedTutorials));
            return;
          }
        }

        // Fall back to local storage
        const saved = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log('📚 Tutorial: Loaded from local storage:', parsed);
          setCompletedTutorials(parsed);
          // Sync to Firebase if we have a player ID
          if (storedPlayerId) {
            await scoreboardService.updateTutorialProgress(storedPlayerId, parsed);
          }
        } else {
          console.log('📚 Tutorial: No saved progress, starting fresh');
        }
      } catch (error) {
        console.error('Failed to load tutorial data:', error);
      }
    };

    loadTutorialData();
  }, []);

  const startTutorial = useCallback((tutorialId: string, steps: TutorialStep[]) => {
    console.log('📚 Tutorial: Starting tutorial:', tutorialId, 'with', steps.length, 'steps');
    setCurrentTutorial(tutorialId);
    setCurrentSteps(steps);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < currentSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTutorial();
    }
  }, [currentStep, currentSteps.length]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentTutorial(null);
    setCurrentSteps([]);
    setCurrentStep(0);
  }, []);

  const completeTutorial = useCallback(async () => {
    if (currentTutorial) {
      const newCompleted = [...completedTutorials, currentTutorial];
      setCompletedTutorials(newCompleted);

      // Save to both AsyncStorage and Firebase
      try {
        await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(newCompleted));

        // Save to Firebase if we have a player ID
        if (playerId) {
          await scoreboardService.updateTutorialProgress(playerId, newCompleted);
        }
      } catch (error) {
        console.error('Failed to save tutorial progress:', error);
      }
    }

    setIsActive(false);
    setCurrentTutorial(null);
    setCurrentSteps([]);
    setCurrentStep(0);
  }, [currentTutorial, completedTutorials, playerId]);

  const isTutorialCompleted = useCallback((tutorialId: string) => {
    return completedTutorials.includes(tutorialId);
  }, [completedTutorials]);

  const getCurrentStep = useCallback(() => {
    return currentSteps[currentStep] || null;
  }, [currentSteps, currentStep]);

  const resetTutorial = useCallback(async () => {
    console.log('📚 Tutorial: Stopping current tutorial');
    try {
      // Stop any active tutorial
      setIsActive(false);
      setCurrentTutorial(null);
      setCurrentSteps([]);
      setCurrentStep(0);
      console.log('📚 Tutorial: Current tutorial stopped');
    } catch (error) {
      console.error('Failed to stop tutorial:', error);
      throw error;
    }
  }, []);

  const resetAllTutorials = useCallback(async () => {
    console.log('📚 Tutorial: Resetting all tutorial progress');
    try {
      // Clear from AsyncStorage
      await AsyncStorage.removeItem(TUTORIAL_STORAGE_KEY);
      // Clear from Firebase if we have a player ID
      if (playerId) {
        await scoreboardService.updateTutorialProgress(playerId, []);
      }
      // Clear from state
      setCompletedTutorials([]);
      // Stop any active tutorial
      setIsActive(false);
      setCurrentTutorial(null);
      setCurrentSteps([]);
      setCurrentStep(0);
      // Re-enable tutorials
      setTutorialEnabledState(true);
      await AsyncStorage.setItem(TUTORIAL_ENABLED_KEY, 'true');
      console.log('📚 Tutorial: Full reset complete');
    } catch (error) {
      console.error('Failed to reset all tutorial progress:', error);
      throw error;
    }
  }, [playerId]);

  const startProgressiveTutorial = useCallback((stage: TutorialStage) => {
    if (!tutorialEnabled) return;

    const tutorial = getTutorialForStage(stage);
    if (tutorial) {
      // Always start tutorial regardless of completion status (for debugging)
      console.log('📚 Tutorial: Starting progressive tutorial:', tutorial.name, '(ignoring completion status)');
      startTutorial(tutorial.id, tutorial.steps);
    }
  }, [tutorialEnabled, startTutorial]);

  const checkAndTriggerTutorial = useCallback((stage: TutorialStage, gameState: any) => {
    if (!tutorialEnabled || isActive) return;

    // Always trigger tutorial regardless of completion status (for debugging)
    const tutorial = getTutorialForStage(stage);
    if (tutorial) {
      console.log('📚 Tutorial: Triggering tutorial for stage:', stage, '(ignoring completion status)');
      startProgressiveTutorial(stage);
    }
  }, [tutorialEnabled, isActive, startProgressiveTutorial]);

  const setTutorialEnabled = useCallback(async (enabled: boolean) => {
    // Force tutorials to always be enabled for debugging
    setTutorialEnabledState(true);
    try {
      await AsyncStorage.setItem(TUTORIAL_ENABLED_KEY, 'true');
    } catch (error) {
      console.error('Failed to save tutorial enabled state:', error);
    }
  }, []);

  const value: TutorialContextType = {
    currentTutorial,
    currentStep,
    isActive,
    completedTutorials,
    tutorialEnabled,
    startTutorial,
    startProgressiveTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    isTutorialCompleted,
    getCurrentStep,
    resetTutorial,
    resetAllTutorials,
    checkAndTriggerTutorial,
    setTutorialEnabled,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}