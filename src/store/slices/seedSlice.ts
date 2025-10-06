import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface GameData {
  periodEvents: any[];
  candyPrices?: { [candyName: string]: number[] };
  eventPrices?: Record<number, Record<string, Record<string, number>>>; // period -> location -> candyName -> price
  [key: string]: any;
}

interface SeedState {
  seed: string | null;
  gameData: GameData;
  isLoaded: boolean;
}

const initialState: SeedState = {
  seed: null,
  gameData: {
    periodEvents: [],
    candyPrices: {},
    eventPrices: {},
  },
  isLoaded: false,
};

const seedSlice = createSlice({
  name: 'seed',
  initialState,
  reducers: {
    setSeed: (state, action: PayloadAction<string | null>) => {
      state.seed = action.payload;
    },
    setGameData: (state, action: PayloadAction<GameData>) => {
      state.gameData = action.payload;
    },
    updateGameData: (state, action: PayloadAction<Partial<GameData>>) => {
      state.gameData = { ...state.gameData, ...action.payload };
    },
    setIsLoaded: (state, action: PayloadAction<boolean>) => {
      state.isLoaded = action.payload;
    },
    modifyCandyPrice: (
      state,
      action: PayloadAction<{ candyId: string; price: number; period?: number }>
    ) => {
      if (!state.gameData.candyPrices) {
        state.gameData.candyPrices = {};
      }
      if (!state.gameData.candyPrices[action.payload.candyId]) {
        state.gameData.candyPrices[action.payload.candyId] = [];
      }
      const period = action.payload.period || 0;
      state.gameData.candyPrices[action.payload.candyId][period] =
        action.payload.price;
    },
    batchModifyCandyPrices: (
      state,
      action: PayloadAction<Array<{ candyId: string; price: number; period: number }>>
    ) => {
      if (!state.gameData.candyPrices) {
        state.gameData.candyPrices = {};
      }
      action.payload.forEach(({ candyId, price, period }) => {
        if (!state.gameData.candyPrices![candyId]) {
          state.gameData.candyPrices![candyId] = [];
        }
        state.gameData.candyPrices![candyId][period] = price;
      });
    },
    resetSeed: () => initialState,
  },
});

export const {
  setSeed,
  setGameData,
  updateGameData,
  setIsLoaded,
  modifyCandyPrice,
  batchModifyCandyPrices,
  resetSeed,
} = seedSlice.actions;

export default seedSlice.reducer;
