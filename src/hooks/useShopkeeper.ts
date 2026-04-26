import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  initializeDeliVisit,
  recordChat,
  answerTrivia,
  recordCandyPurchase,
  purchaseDeliJoker,
  rerollDeliJoker,
  updateQuestProgress,
  acknowledgeQuestReward,
  setMood,
  resetDailyShopkeeperState,
  applyEndOfRunBonus,
  selectShopkeeperLevel,
  selectShopkeeperXP,
  selectShopkeeperMood,
  selectDeliJokerIds,
  selectDeliJokersPurchased,
  selectRerollCount,
  selectDailySpecials,
  selectNightlyQuest,
  selectNightlyQuestCompleted,
  selectPendingQuestReward,
  selectTriviaAnsweredToday,
  selectTriviaCorrectToday,
  selectTodaysTriviaIds,
  selectHasChattedToday,
  selectHasVisitedDeliToday,
  selectCanReroll,
  selectRerollCost,
} from '../store/slices/shopkeeperSlice';
import {
  getLevelConfig,
  getXPForNextLevel,
  getDialogueLevel,
  SHOPKEEPER_DIALOGUE,
  TRIVIA_POOL,
  TRIVIA_QUESTIONS_PER_VISIT,
  JOKER_SHOP,
  getJokerPriceForReroll,
  type TriviaQuestion,
} from '../constants/shopkeeperData';

export const useShopkeeper = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const level = useAppSelector(selectShopkeeperLevel);
  const totalXP = useAppSelector(selectShopkeeperXP);
  const mood = useAppSelector(selectShopkeeperMood);
  const deliJokerIds = useAppSelector(selectDeliJokerIds);
  const deliJokersPurchased = useAppSelector(selectDeliJokersPurchased);
  const rerollCount = useAppSelector(selectRerollCount);
  const dailySpecials = useAppSelector(selectDailySpecials);
  const nightlyQuest = useAppSelector(selectNightlyQuest);
  const nightlyQuestCompleted = useAppSelector(selectNightlyQuestCompleted);
  const pendingQuestReward = useAppSelector(selectPendingQuestReward);
  const triviaAnsweredToday = useAppSelector(selectTriviaAnsweredToday);
  const triviaCorrectToday = useAppSelector(selectTriviaCorrectToday);
  const todaysTriviaIds = useAppSelector(selectTodaysTriviaIds);
  const hasChattedToday = useAppSelector(selectHasChattedToday);
  const hasVisitedDeliToday = useAppSelector(selectHasVisitedDeliToday);
  const canReroll = useAppSelector(selectCanReroll);
  const rerollCost = useAppSelector(selectRerollCost);

  // Derived values
  const levelConfig = useMemo(() => getLevelConfig(level), [level]);
  const xpForNextLevel = useMemo(() => getXPForNextLevel(level), [level]);
  const discount = levelConfig.discount;
  const dialogueLevel = useMemo(() => getDialogueLevel(level), [level]);

  // Get today's trivia questions
  const todaysTriviaQuestions: TriviaQuestion[] = useMemo(() => {
    return todaysTriviaIds
      .map((id) => TRIVIA_POOL.find((q) => q.id === id))
      .filter((q): q is TriviaQuestion => q !== undefined);
  }, [todaysTriviaIds]);

  const canAnswerTrivia = triviaAnsweredToday < TRIVIA_QUESTIONS_PER_VISIT;

  // Get the current trivia question (next unanswered)
  const currentTriviaQuestion: TriviaQuestion | null = useMemo(() => {
    if (!canAnswerTrivia) return null;
    return todaysTriviaQuestions[triviaAnsweredToday] ?? null;
  }, [canAnswerTrivia, todaysTriviaQuestions, triviaAnsweredToday]);

  // Get a random dialogue line for a context
  const getDialogue = useCallback(
    (context: keyof typeof SHOPKEEPER_DIALOGUE): string => {
      const lines = SHOPKEEPER_DIALOGUE[context];
      if (Array.isArray(lines)) {
        return lines[Math.floor(Math.random() * lines.length)];
      }
      // It's a leveled dialogue object
      const leveledLines = (lines as unknown as Record<string, string[]>)[dialogueLevel];
      if (!leveledLines || leveledLines.length === 0) return '';
      return leveledLines[Math.floor(Math.random() * leveledLines.length)];
    },
    [dialogueLevel]
  );

  // Actions
  const initialize = useCallback(
    (seed: string, day: number, ownedMaxLevelJokerIds: number[]) => {
      dispatch(initializeDeliVisit({ seed, day, ownedMaxLevelJokerIds }));
    },
    [dispatch]
  );

  const chat = useCallback(() => {
    dispatch(recordChat());
  }, [dispatch]);

  const submitTriviaAnswer = useCallback(
    (correct: boolean) => {
      dispatch(answerTrivia({ correct }));
    },
    [dispatch]
  );

  const recordPurchase = useCallback(() => {
    dispatch(recordCandyPurchase());
  }, [dispatch]);

  const buyDeliJoker = useCallback(
    (jokerId: number) => {
      dispatch(purchaseDeliJoker({ jokerId }));
    },
    [dispatch]
  );

  const reroll = useCallback(
    (seed: string, day: number, ownedMaxLevelJokerIds: number[]) => {
      dispatch(rerollDeliJoker({ seed, day, ownedMaxLevelJokerIds }));
    },
    [dispatch]
  );

  const trackQuestProgress = useCallback(
    (params: {
      candyName?: string;
      candyTypes?: string[];
      quantity: number;
      profit?: number;
    }) => {
      dispatch(updateQuestProgress(params));
    },
    [dispatch]
  );

  const claimQuestReward = useCallback(() => {
    dispatch(acknowledgeQuestReward());
  }, [dispatch]);

  const updateMood = useCallback(
    (newMood: 'normal' | 'happy' | 'mad') => {
      dispatch(setMood(newMood));
    },
    [dispatch]
  );

  const resetDaily = useCallback(() => {
    dispatch(resetDailyShopkeeperState());
  }, [dispatch]);

  const applyRunBonus = useCallback(() => {
    dispatch(applyEndOfRunBonus());
  }, [dispatch]);

  // Joker price calculation
  // Joker price escalates with rerolls: $500 → $1000 → $2000 → $4000
  // Upgrades use fixed prices. Friendship discount applies to all.
  const getJokerPrice = useCallback(
    (isOwned: boolean, currentLevel?: number): number => {
      if (!isOwned) {
        const basePrice = getJokerPriceForReroll(rerollCount);
        return Math.floor(basePrice * (1 - discount));
      }
      if (currentLevel === 1) {
        return Math.floor(JOKER_SHOP.UPGRADE_L1_TO_L2 * (1 - discount));
      }
      if (currentLevel === 2) {
        return Math.floor(JOKER_SHOP.UPGRADE_L2_TO_L3 * (1 - discount));
      }
      return 0; // Max level
    },
    [discount, rerollCount]
  );

  return {
    // State
    level,
    totalXP,
    mood,
    levelConfig,
    xpForNextLevel,
    discount,
    dialogueLevel,
    deliJokerIds,
    deliJokersPurchased,
    rerollCount,
    rerollCost,
    canReroll,
    dailySpecials,
    nightlyQuest,
    nightlyQuestCompleted,
    pendingQuestReward,
    triviaAnsweredToday,
    triviaCorrectToday,
    canAnswerTrivia,
    currentTriviaQuestion,
    todaysTriviaQuestions,
    hasChattedToday,
    hasVisitedDeliToday,

    // Actions
    initialize,
    chat,
    submitTriviaAnswer,
    recordPurchase,
    buyDeliJoker,
    reroll,
    trackQuestProgress,
    claimQuestReward,
    updateMood,
    resetDaily,
    applyRunBonus,
    getDialogue,
    getJokerPrice,
  };
};
