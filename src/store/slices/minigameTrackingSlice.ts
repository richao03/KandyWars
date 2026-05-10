import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';

// List of all available minigames in the game
export const ALL_MINIGAMES = [
  'math',
  'computer',
  'art',
  'geography',
  'economy',
  'home-ec',
  'logic',
  'gym',
  'recess'
] as const;

export type MinigameType = typeof ALL_MINIGAMES[number];

interface MinigameTrackingState {
  playedMinigames: MinigameType[];
  minigameCompletions: Record<MinigameType, number>;
  // Lifetime totals — persist across resetGame to drive hall pass unlock
  // progression. "Played" = the player completed the minigame (regardless of
  // outcome). "Wins" = the player met the minigame's win condition. Both
  // accumulate across runs.
  lifetimeCompletionsTotal: number;
  lifetimeWinsTotal: number;
  isLoaded: boolean;
}

const initialState: MinigameTrackingState = {
  playedMinigames: [],
  minigameCompletions: {},
  lifetimeCompletionsTotal: 0,
  lifetimeWinsTotal: 0,
  isLoaded: false,
};

const minigameTrackingSlice = createSlice({
  name: 'minigameTracking',
  initialState,
  reducers: {
    initializeMinigameTracking: (state) => {
      state.isLoaded = true;
      // Ensure all minigames have completion counts initialized
      ALL_MINIGAMES.forEach(minigame => {
        if (!(minigame in state.minigameCompletions)) {
          state.minigameCompletions[minigame] = 0;
        }
      });
    },
    initializeFromUserObject: (state, action: PayloadAction<string[]>) => {
      if (__DEV__) console.log('🎮 MINIGAME: Initializing from Firebase user object:', action.payload);
      // Initialize playedMinigames from Firebase data
      // Use Set to merge and deduplicate local + Firebase data
      const mergedMinigames = new Set([...state.playedMinigames, ...action.payload]);
      state.playedMinigames = Array.from(mergedMinigames) as MinigameType[];
      state.isLoaded = true;

      // Ensure all minigames have completion counts initialized
      ALL_MINIGAMES.forEach(minigame => {
        if (!(minigame in state.minigameCompletions)) {
          state.minigameCompletions[minigame] = 0;
        }
      });

      if (__DEV__) console.log('🎮 MINIGAME: Merged played minigames:', state.playedMinigames);
    },
    markMinigamePlayed: (state, action: PayloadAction<MinigameType>) => {
      const minigame = action.payload;

      // Add to played list if not already there
      if (!state.playedMinigames.includes(minigame)) {
        state.playedMinigames.push(minigame);
      }

      // Increment per-run completion count
      state.minigameCompletions[minigame] = (state.minigameCompletions[minigame] || 0) + 1;
      // Increment lifetime total — survives resetGame for unlock progression.
      state.lifetimeCompletionsTotal = (state.lifetimeCompletionsTotal ?? 0) + 1;
    },
    // Dispatched only when the player actually MEETS the win condition for a
    // minigame (not just completion). Drives the Joker Monopoly unlock.
    markMinigameWon: (state, _action: PayloadAction<MinigameType>) => {
      state.lifetimeWinsTotal = (state.lifetimeWinsTotal ?? 0) + 1;
    },
    resetMinigameTracking: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, (state) => {
      // Preserve playedMinigames + lifetime totals across game resets
      // (progress, not session data — drives hall pass unlocks).
      if (__DEV__) console.log('🎮 MINIGAME: resetGame called - preserving played minigames + lifetime totals');
      const preservedPlayedMinigames = state.playedMinigames;
      const preservedLifetimeCompletions = state.lifetimeCompletionsTotal ?? 0;
      const preservedLifetimeWins = state.lifetimeWinsTotal ?? 0;
      return {
        ...initialState,
        playedMinigames: preservedPlayedMinigames,
        lifetimeCompletionsTotal: preservedLifetimeCompletions,
        lifetimeWinsTotal: preservedLifetimeWins,
        isLoaded: true, // Keep it loaded
      };
    });
  },
});

export const {
  initializeMinigameTracking,
  initializeFromUserObject,
  markMinigamePlayed,
  markMinigameWon,
  resetMinigameTracking,
} = minigameTrackingSlice.actions;

// Selectors
export const selectPlayedMinigames = (state: { minigameTracking: MinigameTrackingState }) =>
  state.minigameTracking.playedMinigames;

export const selectMinigameCompletions = (state: { minigameTracking: MinigameTrackingState }) =>
  state.minigameTracking.minigameCompletions;

export const selectHasPlayedAllMinigames = createSelector(
  [selectPlayedMinigames],
  (playedMinigames) => ALL_MINIGAMES.every(minigame => playedMinigames.includes(minigame))
);

export const selectMinigameCompletion = (minigame: MinigameType) =>
  (state: { minigameTracking: MinigameTrackingState }) =>
    state.minigameTracking.minigameCompletions[minigame] || 0;

export const selectMinigameProgress = createSelector(
  [selectPlayedMinigames],
  (playedMinigames) => ({
    played: playedMinigames.length,
    total: ALL_MINIGAMES.length,
    remaining: ALL_MINIGAMES.filter(minigame => !playedMinigames.includes(minigame)),
  })
);

export const selectLifetimeMinigameCompletionsTotal = (state: { minigameTracking: MinigameTrackingState }) =>
  state.minigameTracking.lifetimeCompletionsTotal ?? 0;

export const selectLifetimeMinigameWinsTotal = (state: { minigameTracking: MinigameTrackingState }) =>
  state.minigameTracking.lifetimeWinsTotal ?? 0;

export default minigameTrackingSlice.reducer;