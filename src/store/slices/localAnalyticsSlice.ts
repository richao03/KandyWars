import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';

interface LocalAnalyticsState {
  jokersObtained: { [jokerName: string]: number }; // Track joker obtained counts
  minigamesPlayed: { [minigameName: string]: number }; // Track minigame play counts
}

const initialState: LocalAnalyticsState = {
  jokersObtained: {},
  minigamesPlayed: {},
};

const localAnalyticsSlice = createSlice({
  name: 'localAnalytics',
  initialState,
  reducers: {
    trackJokerObtained: (state, action: PayloadAction<string>) => {
      const jokerName = action.payload;
      state.jokersObtained[jokerName] = (state.jokersObtained[jokerName] || 0) + 1;
      console.log('📊 Local: Joker obtained -', jokerName, 'Total:', state.jokersObtained[jokerName]);
    },
    trackMinigamePlayed: (state, action: PayloadAction<string>) => {
      const minigameName = action.payload;
      state.minigamesPlayed[minigameName] = (state.minigamesPlayed[minigameName] || 0) + 1;
      console.log('📊 Local: Minigame played -', minigameName, 'Total:', state.minigamesPlayed[minigameName]);
    },
    resetLocalAnalytics: (state) => {
      state.jokersObtained = {};
      state.minigamesPlayed = {};
      console.log('📊 Local analytics reset');
    },
  },
  extraReducers: (builder) => {
    // Reset analytics when game resets
    builder.addCase(resetGame, () => initialState);
  },
});

export const {
  trackJokerObtained,
  trackMinigamePlayed,
  resetLocalAnalytics,
} = localAnalyticsSlice.actions;

export default localAnalyticsSlice.reducer;
