import { useEffect, useCallback, useRef } from 'react';
import { useJokers } from '../context/JokerContext';
import { useTutorial } from '../context/TutorialContext';
import { useGame } from '../context/GameContext';

export function useJokerTutorial() {
  const jokerContext = useJokers();
  const tutorial = useTutorial();
  const { day } = useGame();
  const callbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!jokerContext || !tutorial) return;

    const handleFirstJoker = () => {
      // Trigger the joker tutorial
      tutorial.checkAndTriggerTutorial('day2_joker', {
        day,
        period: 1,
        justFoundJoker: true,
        isAfterSchool: false,
      });
    };

    // Store the callback in ref to ensure same reference for cleanup
    callbackRef.current = handleFirstJoker;

    // Register the callback
    jokerContext.registerOnFirstJoker(handleFirstJoker);

    // Cleanup
    return () => {
      if (callbackRef.current) {
        jokerContext.unregisterOnFirstJoker(callbackRef.current);
      }
    };
  }, [jokerContext, day]); // Remove tutorial dependency, access it directly
}