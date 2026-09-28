import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';

// One recorded contribution to the piggy bank, used by the Piggy Bank detail
// view to graph deposits over time. Withdrawals are intentionally not recorded
// (the chart shows gross deposits by day; the live stash drives the headline).
export interface StashEntry {
  day: number;
  period: number;
  amount: number; // positive contribution added this entry
  total: number; // running stashedAmount after this entry
  kind: 'deposit' | 'interest' | 'inheritance';
}

interface WalletState {
  balance: number;
  stashedAmount: number;
  adoptionFee: number;
  stashHistory: StashEntry[];
  difficultyLevel: number | null;
  playerName: string | null;
  playerId: string | null;
  isFirstTimeDifficultySelection: boolean;
  hasDuplicatedVacuumSealer: boolean;
}

const initialState: WalletState = {
  balance: 20,
  // Piggy bank now starts at 0 and grows with deposits. The adoption fee is the
  // separate GOAL the player saves toward (win = balance + stash >= adoptionFee).
  stashedAmount: 0,
  adoptionFee: 5000,
  stashHistory: [],
  difficultyLevel: null,
  playerName: null,
  playerId: null,
  isFirstTimeDifficultySelection: true,
  hasDuplicatedVacuumSealer: false,
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

      // Coin SFX is fired by audioListenerMiddleware (keeps this reducer pure).

      if (__DEV__) {
        console.log(
          '💾 Balance added:',
          action.payload,
          'New balance:',
          state.balance,
          '- Auto-save triggered'
        );
      }
    },
    spendBalance: (state, action: PayloadAction<number>) => {
      if (state.balance >= action.payload) {
        state.balance -= action.payload;
        if (__DEV__) {
          console.log(
            '💾 Balance spent:',
            action.payload,
            'New balance:',
            state.balance,
            '- Auto-save triggered'
          );
        }
        return;
      }
      if (__DEV__) {
        console.log(
          '❌ Spend rejected - insufficient balance:',
          state.balance,
          'amount:',
          action.payload
        );
      }
    },
    setStashedAmount: (state, action: PayloadAction<number>) => {
      state.stashedAmount = action.payload;
    },
    setAdoptionFee: (state, action: PayloadAction<number>) => {
      state.adoptionFee = action.payload;
    },
    stashMoney: (
      state,
      action: PayloadAction<{
        amountPaid: number;
        amountStashed: number;
        day?: number;
        period?: number;
        kind?: StashEntry['kind'];
      }>
    ) => {
      // Use small epsilon to handle floating point precision issues
      const epsilon = 0.001;
      const { amountPaid, amountStashed } = action.payload;

      if (state.balance >= amountPaid - epsilon) {
        state.balance -= amountPaid;
        state.stashedAmount += amountStashed;
        // Record the contribution so the Piggy Bank detail view can graph it.
        if (amountStashed > 0) {
          if (!state.stashHistory) state.stashHistory = [];
          state.stashHistory.push({
            day: action.payload.day ?? 0,
            period: action.payload.period ?? 0,
            amount: amountStashed,
            total: state.stashedAmount,
            kind: action.payload.kind ?? 'deposit',
          });
        }
        const bonusApplied = amountStashed !== amountPaid;
        if (__DEV__) {
          console.log(
            '💾 Money stashed:',
            amountPaid,
            'paid,',
            amountStashed,
            `stashed${bonusApplied ? ' (with bonus!)' : ''}. New stashed amount:`,
            state.stashedAmount,
            '- Auto-save triggered'
          );
        }
      } else {
        if (__DEV__) {
          console.log(
            `❌ Stash rejected in reducer - balance: ${state.balance}, amountPaid: ${amountPaid}`
          );
        }
      }
    },
    withdrawFromStash: (state, action: PayloadAction<number>) => {
      if (state.stashedAmount >= action.payload) {
        state.stashedAmount -= action.payload;
        state.balance += action.payload;
        // Coin SFX fired by audioListenerMiddleware (keeps this reducer pure).
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
    setHasDuplicatedVacuumSealer: (state, action: PayloadAction<boolean>) => {
      state.hasDuplicatedVacuumSealer = action.payload;
    },
    resetWallet: (state) => {
      state.balance = 20;
      state.adoptionFee = 5000;
      state.stashedAmount = 0;
      state.stashHistory = [];
      state.hasDuplicatedVacuumSealer = false;
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
          2: 12000, // Peg the Pug
          3: 25000, // Hamster
          4: 50000, // Brussels Griffon
          5: 100000, // Clownfish
          6: 175000, // Evee Cat
          7: 300000, // Chicken
          8: 500000, // Byul Terrier
          9: 750000, // Parrot
          10: 1000000, // Cane Corso
          11: 1500000, // Bearded Dragon
          12: 2500000, // Pitbull
          13: 3500000, // Horse
          14: 5000000, // Afghan Hound
          15: 7500000, // German Shepherd
          16: 10000000, // Dragon
        };

        state.adoptionFee = adoptionFees[action.payload.level] || 5000;
        // Piggy bank starts empty; the adoption fee above is the goal to reach.
        state.stashedAmount = 0;
        state.stashHistory = [];
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
  setHasDuplicatedVacuumSealer,
  resetWallet,
  completeReset,
  initializeWallet,
} = walletSlice.actions;

export default walletSlice.reducer;

// Named field selectors for useWallet hook optimization
export const selectBalance = (state: { wallet: WalletState }) => state.wallet.balance;
export const selectStashedAmount = (state: { wallet: WalletState }) => state.wallet.stashedAmount;
export const selectAdoptionFee = (state: { wallet: WalletState }) => state.wallet.adoptionFee;
/**
 * Debt-style number shown on every piggy bank readout: savings minus the
 * adoption fee. A fresh run reads -fee (e.g. -12,000.00) and climbs toward 0
 * as the player deposits; positive once the fee is covered. Internally the
 * stash stays a positive savings figure (see initialState).
 */
export const selectPiggyBankDisplay = (state: { wallet: WalletState }) =>
  state.wallet.stashedAmount - state.wallet.adoptionFee;
const EMPTY_STASH_HISTORY: StashEntry[] = [];
export const selectStashHistory = (state: { wallet: WalletState }) =>
  state.wallet.stashHistory ?? EMPTY_STASH_HISTORY;
export const selectDifficultyLevel = (state: { wallet: WalletState }) => state.wallet.difficultyLevel;
export const selectPlayerName = (state: { wallet: WalletState }) => state.wallet.playerName;
export const selectPlayerId = (state: { wallet: WalletState }) => state.wallet.playerId;
export const selectIsFirstTimeDifficultySelection = (state: { wallet: WalletState }) => state.wallet.isFirstTimeDifficultySelection;
