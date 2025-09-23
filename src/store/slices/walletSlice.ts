import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WalletState {
  balance: number;
  stashedAmount: number;
  adoptionFee: number;
  difficultyLevel: number | null;
  playerName: string | null;
  playerId: string | null;
  isFirstTimeDifficultySelection: boolean;
}

const initialState: WalletState = {
  balance: 20,
  stashedAmount: 0,
  adoptionFee: 5000,
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
      console.log('💾 Balance added:', action.payload, 'New balance:', state.balance, '- Auto-save triggered');
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
    setAdoptionFee: (state, action: PayloadAction<number>) => {
      state.adoptionFee = action.payload;
    },
    stashMoney: (state, action: PayloadAction<number>) => {
      if (state.balance >= action.payload) {
        state.balance -= action.payload;
        state.stashedAmount += action.payload;
        console.log('💾 Money stashed:', action.payload, 'New stashed amount:', state.stashedAmount, '- Auto-save triggered');
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
      state.adoptionFee = 5000;
      state.stashedAmount = -state.adoptionFee;
    },
    completeReset: () => initialState,
    initializeWallet: (state, action: PayloadAction<{ level?: number; playerName?: string }>) => {
      if (action.payload.level !== undefined) {
        state.difficultyLevel = action.payload.level;
        state.isFirstTimeDifficultySelection = false;

        // Reset to starting balance for new game
        state.balance = 20;

        // Set adoption fee based on difficulty level
        const adoptionFees: Record<number, number> = {
          1: 5000,   // Pug
          2: 10000,  // Brussels Griffon
          3: 15000,  // Eevee
          4: 20000,  // Byul
          5: 25000,  // Cane Corso
          6: 30000,  // Pitbull
          7: 35000,  // Afghan Hound
          8: 40000,  // German Shepherd
        };

        state.adoptionFee = adoptionFees[action.payload.level] || 5000;
        // Set stashed amount to negative adoption fee (representing debt)
        state.stashedAmount = -(adoptionFees[action.payload.level] || 5000);
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
  setAdoptionFee,
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