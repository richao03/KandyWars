import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';

// List of all available minigames in the game
export const ALL_MINIGAMES = [
  'math',
  'computer',
  'art',
  'history',
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
  isLoaded: boolean;
}

const initialState: MinigameTrackingState = {
  playedMinigames: [],
  minigameCompletions: {},
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
      console.log('🎮 MINIGAME: Initializing from Firebase user object:', action.payload);
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

      console.log('🎮 MINIGAME: Merged played minigames:', state.playedMinigames);
    },
    markMinigamePlayed: (state, action: PayloadAction<MinigameType>) => {
      const minigame = action.payload;

      // Add to played list if not already there
      if (!state.playedMinigames.includes(minigame)) {
        state.playedMinigames.push(minigame);
      }

      // Increment completion count
      state.minigameCompletions[minigame] = (state.minigameCompletions[minigame] || 0) + 1;
    },
    resetMinigameTracking: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, (state) => {
      // Preserve playedMinigames across game resets (it's progress, not session data)
      console.log('🎮 MINIGAME: resetGame called - preserving played minigames');
      const preservedPlayedMinigames = state.playedMinigames;
      return {
        ...initialState,
        playedMinigames: preservedPlayedMinigames,
        isLoaded: true, // Keep it loaded
      };
    });
  },
});

export const {
  initializeMinigameTracking,
  initializeFromUserObject,
  markMinigamePlayed,
  resetMinigameTracking,
} = minigameTrackingSlice.actions;

// Selectors
export const selectPlayedMinigames = (state: { minigameTracking: MinigameTrackingState }) =>
  state.minigameTracking.playedMinigames;

export const selectMinigameCompletions = (state: { minigameTracking: MinigameTrackingState }) =>
  state.minigameTracking.minigameCompletions;

export const selectHasPlayedAllMinigames = (state: { minigameTracking: MinigameTrackingState }) =>
  ALL_MINIGAMES.every(minigame => state.minigameTracking.playedMinigames.includes(minigame));

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

export default minigameTrackingSlice.reducer;