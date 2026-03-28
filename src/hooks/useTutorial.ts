import { useCallback, useContext } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  advanceTutorial,
  selectTutorialComplete,
  selectTutorialStep,
  skipTutorial,
  startTutorial,
} from '../store/slices/tutorialSlice';
import { TutorialContext } from '../../app/components/TutorialProvider';

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useTutorial() {
  const dispatch = useAppDispatch();
  const currentStep = useAppSelector(selectTutorialStep);
  const tutorialComplete = useAppSelector(selectTutorialComplete);
  const tutorialContext = useContext(TutorialContext);

  const isActive = currentStep > 0 && currentStep <= 11;

  const advance = useCallback(() => {
    dispatch(advanceTutorial());
  }, [dispatch]);

  const skip = useCallback(() => {
    dispatch(skipTutorial());
  }, [dispatch]);

  const start = useCallback(() => {
    dispatch(startTutorial());
  }, [dispatch]);

  const registerTarget = useCallback(
    (stepId: number, layout: LayoutRect) => {
      tutorialContext?.registerTarget(stepId, layout);
    },
    [tutorialContext]
  );

  const getTargetLayout = useCallback(
    (stepId: number): LayoutRect | undefined => {
      return tutorialContext?.getTargetLayout(stepId);
    },
    [tutorialContext]
  );

  return {
    currentStep,
    isActive,
    tutorialComplete,
    advance,
    skip,
    start,
    registerTarget,
    getTargetLayout,
  };
}
