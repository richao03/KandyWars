import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import seedrandom from 'seedrandom';
import { CANDY_NAMES } from '../../constants/candyRegistry';
import { resetGame } from './gameSlice';

export interface Quest {
  id: string;
  day: number;
  targetPeriod: number;
  candyName: string;
  quantity: number;
  completed: boolean;
}

interface QuestState {
  activeQuest: Quest | null;
  completedQuestIds: string[];
  pendingJokerChoices: any[];
}

const initialState: QuestState = {
  activeQuest: null,
  completedQuestIds: [],
  pendingJokerChoices: [],
};

const questSlice = createSlice({
  name: 'quest',
  initialState,
  reducers: {
    generateQuest: (
      state,
      action: PayloadAction<{ seed: string; day: number; unlockedCandies?: string[] }>
    ) => {
      const { seed, day, unlockedCandies } = action.payload;

      // Only generate quests on Day 2 and Day 4
      if (day !== 2 && day !== 4) return;

      // Don't generate if there's already an active quest
      if (state.activeQuest) return;

      const rng = seedrandom(`${seed}-quest-${day}`);

      // Pick from unlocked candies if provided, otherwise all candies
      const candidateCandies = unlockedCandies && unlockedCandies.length > 0
        ? unlockedCandies
        : CANDY_NAMES;

      const candyIndex = Math.floor(rng() * candidateCandies.length);
      const candyName = candidateCandies[candyIndex];

      // Quantity: 5-10
      const quantity = Math.floor(rng() * 6) + 5;

      // Target period: 5-7 (later in the day)
      const targetPeriod = Math.floor(rng() * 3) + 5;

      const questId = `quest-day${day}-${candyName}-${targetPeriod}`;

      // Don't re-generate a quest that was already completed
      if (state.completedQuestIds.includes(questId)) return;

      state.activeQuest = {
        id: questId,
        day,
        targetPeriod,
        candyName,
        quantity,
        completed: false,
      };
    },

    completeQuest: (state) => {
      if (state.activeQuest) {
        state.activeQuest.completed = true;
        state.completedQuestIds.push(state.activeQuest.id);
      }
    },

    clearActiveQuest: (state) => {
      state.activeQuest = null;
    },

    failQuest: (state) => {
      state.activeQuest = null;
    },

    setPendingJokerChoices: (state, action: PayloadAction<any[]>) => {
      state.pendingJokerChoices = action.payload;
    },

    clearPendingJokerChoices: (state) => {
      state.pendingJokerChoices = [];
    },

    resetQuests: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, () => initialState);
  },
});

export const {
  generateQuest,
  completeQuest,
  clearActiveQuest,
  failQuest,
  setPendingJokerChoices,
  clearPendingJokerChoices,
  resetQuests,
} = questSlice.actions;

export default questSlice.reducer;

// Selectors
const EMPTY_IDS: string[] = [];
const EMPTY_CHOICES: any[] = [];

export const selectActiveQuest = (state: any): Quest | null =>
  state.quest?.activeQuest ?? null;

export const selectIsQuestActive = (state: any): boolean =>
  state.quest?.activeQuest != null && !state.quest.activeQuest.completed;

export const selectCompletedQuestIds = (state: any): string[] =>
  state.quest?.completedQuestIds ?? EMPTY_IDS;

export const selectPendingJokerChoices = (state: any): any[] =>
  state.quest?.pendingJokerChoices ?? EMPTY_CHOICES;
