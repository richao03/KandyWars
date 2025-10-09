import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ScoreEntry {
  playerName: string;
  score: number;
  timestamp: number;
  difficultyLevel?: number;
}

interface ScoreboardState {
  scores: ScoreEntry[];
  currentScore: number;
  highScore: number;
  isLoading: boolean;
  totalCompletions: number;
  wonDifficulties: number[];
}

const initialState: ScoreboardState = {
  scores: [],
  currentScore: 0,
  highScore: 0,
  isLoading: false,
  totalCompletions: 0,
  wonDifficulties: [],
};

const scoreboardSlice = createSlice({
  name: 'scoreboard',
  initialState,
  reducers: {
    setScores: (state, action: PayloadAction<ScoreEntry[]>) => {
      state.scores = action.payload;
      state.highScore = Math.max(...action.payload.map(s => s.score), 0);
    },
    addScore: (state, action: PayloadAction<ScoreEntry>) => {
      state.scores.push(action.payload);
      state.scores.sort((a, b) => b.score - a.score);
      state.highScore = Math.max(state.highScore, action.payload.score);
    },
    setCurrentScore: (state, action: PayloadAction<number>) => {
      state.currentScore = action.payload;
    },
    setHighScore: (state, action: PayloadAction<number>) => {
      state.highScore = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setTotalCompletions: (state, action: PayloadAction<number>) => {
      state.totalCompletions = action.payload;
    },
    setWonDifficulties: (state, action: PayloadAction<number[]>) => {
      state.wonDifficulties = action.payload;
    },
    resetScoreboard: () => initialState,
  },
});

export const {
  setScores,
  addScore,
  setCurrentScore,
  setHighScore,
  setIsLoading,
  setTotalCompletions,
  setWonDifficulties,
  resetScoreboard,
} = scoreboardSlice.actions;

export default scoreboardSlice.reducer;