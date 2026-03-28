import React, { createContext, useCallback, useRef } from 'react';
import { LayoutRect } from '../../src/hooks/useTutorial';

interface TutorialContextType {
  registerTarget: (stepId: number, layout: LayoutRect) => void;
  getTargetLayout: (stepId: number) => LayoutRect | undefined;
}

export const TutorialContext = createContext<TutorialContextType | null>(null);

interface TutorialProviderProps {
  children: React.ReactNode;
}

export default function TutorialProvider({ children }: TutorialProviderProps) {
  const layoutMapRef = useRef<Map<number, LayoutRect>>(new Map());

  const registerTarget = useCallback((stepId: number, layout: LayoutRect) => {
    layoutMapRef.current.set(stepId, layout);
  }, []);

  const getTargetLayout = useCallback(
    (stepId: number): LayoutRect | undefined => {
      return layoutMapRef.current.get(stepId);
    },
    []
  );

  return (
    <TutorialContext.Provider value={{ registerTarget, getTargetLayout }}>
      {children}
    </TutorialContext.Provider>
  );
}
