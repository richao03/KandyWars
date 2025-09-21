import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Joker {
  id: string;
  name: string;
  tier: string;
  effect?: any;
  quantity?: number;
}

interface JokerState {
  jokers: Joker[];
  jokersOwned: Joker[];
  allJokers: Joker[];
  lockedJokerIds: string[];
}

const initialState: JokerState = {
  jokers: [],
  jokersOwned: [],
  allJokers: [],
  lockedJokerIds: [],
};

const jokerSlice = createSlice({
  name: 'joker',
  initialState,
  reducers: {
    setJokers: (state, action: PayloadAction<Joker[]>) => {
      state.jokers = action.payload;
    },
    setJokersOwned: (state, action: PayloadAction<Joker[]>) => {
      state.jokersOwned = action.payload;
    },
    setAllJokers: (state, action: PayloadAction<Joker[]>) => {
      state.allJokers = action.payload;
    },
    addJoker: (state, action: PayloadAction<Joker>) => {
      state.jokers.push(action.payload);
      state.jokersOwned.push(action.payload);
    },
    removeJoker: (state, action: PayloadAction<string>) => {
      state.jokers = state.jokers.filter(j => j.id !== action.payload);
      state.jokersOwned = state.jokersOwned.filter(j => j.id !== action.payload);
    },
    lockJoker: (state, action: PayloadAction<string>) => {
      if (!state.lockedJokerIds.includes(action.payload)) {
        state.lockedJokerIds.push(action.payload);
      }
    },
    unlockJoker: (state, action: PayloadAction<string>) => {
      state.lockedJokerIds = state.lockedJokerIds.filter(id => id !== action.payload);
    },
    resetJokers: () => initialState,
  },
});

export const {
  setJokers,
  setJokersOwned,
  setAllJokers,
  addJoker,
  removeJoker,
  lockJoker,
  unlockJoker,
  resetJokers,
} = jokerSlice.actions;

export default jokerSlice.reducer;