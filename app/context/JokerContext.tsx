import React, { createContext, useContext, useState } from 'react';

export interface Joker {
  id: number;
  name: string;
  description: string;
  subject: string;
  theme: string;
  type: 'one-time' | 'persistent';
  effect: string;
}

export interface ActiveJokerEffect {
  jokerId: number;
  effect: string;
  candyType?: string;
  multiplier?: number;
  duration?: number;
  period?: number;
}

type JokerContextType = {
  jokers: Joker[];
  activeEffects: ActiveJokerEffect[];
  addJoker: (joker: Joker) => void;
  removeJoker: (jokerId: number) => void;
  hasJoker: (jokerId: number) => boolean;
  getJokersBySubject: (subject: string) => Joker[];
  clearAllJokers: () => void;
  activateJoker: (jokerId: number, candyType?: string, period?: number) => Promise<boolean>;
  getPersistentEffects: () => ActiveJokerEffect[];
  clearActiveEffect: (jokerId: number) => void;
};

const JokerContext = createContext<JokerContextType | undefined>(undefined);

export const JokerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jokers, setJokers] = useState<Joker[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveJokerEffect[]>([]);

  const addJoker = (joker: Joker) => {
    setJokers(prev => {
      // Prevent duplicates
      if (prev.some(j => j.id === joker.id)) {
        return prev;
      }
      return [...prev, joker];
    });
  };

  const removeJoker = (jokerId: number) => {
    setJokers(prev => prev.filter(j => j.id !== jokerId));
  };

  const hasJoker = (jokerId: number): boolean => {
    return jokers.some(j => j.id === jokerId);
  };

  const getJokersBySubject = (subject: string): Joker[] => {
    return jokers.filter(j => j.subject === subject);
  };

  const clearAllJokers = () => {
    setJokers([]);
  };

  const activateJoker = async (jokerId: number, candyType?: string, period?: number): Promise<boolean> => {
    const joker = jokers.find(j => j.id === jokerId);
    if (!joker) return false;

    const effect: ActiveJokerEffect = {
      jokerId,
      effect: joker.effect,
      candyType,
      multiplier: joker.effect === 'double_candy_price' ? 2 : 1,
      duration: joker.effect === 'double_candy_price' ? 1 : undefined, // 1 period duration
      period,
    };

    // Add effect to active effects
    setActiveEffects(prev => [...prev, effect]);

    // Remove joker if it's one-time use
    if (joker.type === 'one-time') {
      removeJoker(jokerId);
    }

    return true;
  };

  const getPersistentEffects = (): ActiveJokerEffect[] => {
    return jokers
      .filter(joker => joker.type === 'persistent')
      .map(joker => ({
        jokerId: joker.id,
        effect: joker.effect,
      }));
  };

  const clearActiveEffect = (jokerId: number) => {
    setActiveEffects(prev => prev.filter(effect => effect.jokerId !== jokerId));
  };

  return (
    <JokerContext.Provider value={{
      jokers,
      activeEffects,
      addJoker,
      removeJoker,
      hasJoker,
      getJokersBySubject,
      clearAllJokers,
      activateJoker,
      getPersistentEffects,
      clearActiveEffect
    }}>
      {children}
    </JokerContext.Provider>
  );
};

export const useJokers = (): JokerContextType => {
  const context = useContext(JokerContext);
  if (!context) {
    throw new Error('useJokers must be used within a JokerProvider');
  }
  return context;
};