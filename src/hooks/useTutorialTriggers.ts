import { useEffect } from 'react';
import { useTutorial } from '../context/TutorialContext';
import { useWallet } from '../context/WalletContext';
import { useGame } from '../context/GameContext';
import { TUTORIAL_SEQUENCES } from '../data/tutorialSequences';

export function useTutorialTriggers() {
  const { startTutorial, isTutorialCompleted } = useTutorial();
  const { balance, firstPurchaseMade } = useWallet();
  const { day } = useGame();

  // First time player tutorial
  useEffect(() => {
    console.log('🎓 Tutorial trigger check:', {
      day,
      isCompleted: isTutorialCompleted('first_time_player'),
      shouldTrigger: !isTutorialCompleted('first_time_player') && day === 1
    });
    
    if (!isTutorialCompleted('first_time_player') && day === 1) {
      console.log('🎓 Starting first time player tutorial!');
      startTutorial('first_time_player', TUTORIAL_SEQUENCES.FIRST_TIME_PLAYER.steps);
    }
  }, [day, isTutorialCompleted, startTutorial]);

  // Selling tutorial after first purchase
  useEffect(() => {
    if (
      firstPurchaseMade && 
      !isTutorialCompleted('selling_tutorial') &&
      isTutorialCompleted('first_time_player')
    ) {
      startTutorial('selling_tutorial', TUTORIAL_SEQUENCES.SELLING_TUTORIAL.steps);
    }
  }, [firstPurchaseMade, isTutorialCompleted, startTutorial]);

  // Advanced features on day 2
  useEffect(() => {
    if (day === 2 && !isTutorialCompleted('advanced_features')) {
      startTutorial('advanced_features', TUTORIAL_SEQUENCES.ADVANCED_FEATURES.steps);
    }
  }, [day, isTutorialCompleted, startTutorial]);

  // Debt warning when balance goes negative
  useEffect(() => {
    if (balance < 0 && !isTutorialCompleted('debt_warning')) {
      startTutorial('debt_warning', TUTORIAL_SEQUENCES.DEBT_WARNING.steps);
    }
  }, [balance, isTutorialCompleted, startTutorial]);

  return {
    triggerJokerTutorial: () => {
      if (!isTutorialCompleted('joker_tutorial')) {
        startTutorial('joker_tutorial', TUTORIAL_SEQUENCES.JOKER_TUTORIAL.steps);
      }
    },
  };
}