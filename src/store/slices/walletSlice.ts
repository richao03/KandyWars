import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WalletState {
  balance: number;
  stashedAmount: number;
  difficultyLevel: number | null;
  playerName: string | null;
  playerId: string | null;
  isFirstTimeDifficultySelection: boolean;
}

const initialState: WalletState = {
  balance: 20,
  stashedAmount: 0,
  difficultyLevel: null,
  playerName: null,
  playerId: null,
  isFirstTimeDifficultySelection: true,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setBalance: (state, action: PayloadAction<number>) => {
      state.balance = action.payload;
    },
    addBalance: (state, action: PayloadAction<number>) => {
      state.balance += action.payload;
    },
    spendBalance: (state, action: PayloadAction<number>) => {
      if (state.balance >= action.payload) {
        state.balance -= action.payload;
        return;
      }
    },
    setStashedAmount: (state, action: PayloadAction<number>) => {
      state.stashedAmount = action.payload;
    },
    stashMoney: (state, action: PayloadAction<number>) => {
      if (state.balance >= action.payload) {
        state.balance -= action.payload;
        state.stashedAmount += action.payload;
      }
    },
    withdrawFromStash: (state, action: PayloadAction<number>) => {
      if (state.stashedAmount >= action.payload) {
        state.stashedAmount -= action.payload;
        state.balance += action.payload;
      }
    },
    setDifficultyLevel: (state, action: PayloadAction<number | null>) => {
      state.difficultyLevel = action.payload;
    },
    setPlayerName: (state, action: PayloadAction<string | null>) => {
      state.playerName = action.payload;
    },
    setPlayerId: (state, action: PayloadAction<string | null>) => {
      state.playerId = action.payload;
    },
    setIsFirstTimeDifficultySelection: (state, action: PayloadAction<boolean>) => {
      state.isFirstTimeDifficultySelection = action.payload;
    },
    resetWallet: (state) => {
      state.balance = 20;
      state.stashedAmount = 0;
    },
    completeReset: () => initialState,
    initializeWallet: (state, action: PayloadAction<{ level?: number; playerName?: string }>) => {
      if (action.payload.level !== undefined) {
        state.difficultyLevel = action.payload.level;
        state.isFirstTimeDifficultySelection = false;
      }
      if (action.payload.playerName) {
        state.playerName = action.payload.playerName;
      }
    },
  },
});

export const {
  setBalance,
  addBalance,
  spendBalance,
  setStashedAmount,
  stashMoney,
  withdrawFromStash,
  setDifficultyLevel,
  setPlayerName,
  setPlayerId,
  setIsFirstTimeDifficultySelection,
  resetWallet,
  completeReset,
  initializeWallet,
} = walletSlice.actions;

export default walletSlice.reducer;