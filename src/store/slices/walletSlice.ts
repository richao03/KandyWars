import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';

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
      console.log(
        '💾 Balance added:',
        action.payload,
        'New balance:',
        state.balance,
        '- Auto-save triggered'
      );
    },
    spendBalance: (state, action: PayloadAction<number>) => {
      if (state.balance >= action.payload) {
        state.balance -= action.payload;
        console.log(
          '💾 Balance spent:',
          action.payload,
          'New balance:',
          state.balance,
          '- Auto-save triggered'
        );
        return;
      }
      console.log(
        '❌ Spend rejected - insufficient balance:',
        state.balance,
        'amount:',
        action.payload
      );
    },
    setStashedAmount: (state, action: PayloadAction<number>) => {
      state.stashedAmount = action.payload;
    },
    setAdoptionFee: (state, action: PayloadAction<number>) => {
      state.adoptionFee = action.payload;
    },
    stashMoney: (state, action: PayloadAction<number>) => {
      // Use small epsilon to handle floating point precision issues
      const epsilon = 0.001;
      if (state.balance >= action.payload - epsilon) {
        state.balance -= action.payload;
        state.stashedAmount += action.payload;
        console.log(
          '💾 Money stashed:',
          action.payload,
          'New stashed amount:',
          state.stashedAmount,
          '- Auto-save triggered'
        );
      } else {
        console.log(
          `❌ Stash rejected in reducer - balance: ${state.balance}, amount: ${action.payload}`
        );
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
    setIsFirstTimeDifficultySelection: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.isFirstTimeDifficultySelection = action.payload;
    },
    resetWallet: (state) => {
      state.balance = 20;
      state.adoptionFee = 5000;
      state.stashedAmount = -state.adoptionFee;
    },
    completeReset: () => initialState,
    initializeWallet: (
      state,
      action: PayloadAction<{ level?: number; playerName?: string }>
    ) => {
      if (action.payload.level !== undefined) {
        state.difficultyLevel = action.payload.level;
        state.isFirstTimeDifficultySelection = false;

        // Reset to starting balance for new game
        state.balance = 20;

        // Set adoption fee based on difficulty level
        const adoptionFees: Record<number, number> = {
          1: 5000, // Rock
          2: 10000, // Peg the Pug
          3: 20000, // Hamster
          4: 25000, // Brussels Griffon
          5: 35000, // Clownfish
          6: 45000, // Evee Cat
          7: 55000, // Chicken
          8: 60000, // Byul Terrier
          9: 75000, // Parrot
          10: 100000, // Cane Corso
          11: 250000, // Bearded Dragon
          12: 450000, // Pitbull
          13: 500000, // Horse
          14: 600000, // Afghan Hound
          15: 750000, // German Shepherd
          16: 1000000, // Dragon
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
  extraReducers: (builder) => {
    builder.addCase(resetGame, (state) => {
      // Preserve playerName, playerId, and difficultyLevel across game resets
      const { playerName, playerId, difficultyLevel } = state;
      return {
        ...initialState,
        playerName,
        playerId,
        difficultyLevel,
      };
    });
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
