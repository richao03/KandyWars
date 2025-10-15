import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';

/**
 * Hall Pass Modifiers Slice
 *
 * This slice stores the computed hall pass bonuses that are calculated ONCE
 * at game initialization and then applied consistently throughout the game.
 *
 * This avoids recalculating bonuses on every render and ensures consistent
 * bonus application across all game systems.
 */

export interface HallPassModifiers {
  // Computed once at game start from selected hall passes
  salePriceBonusPercent: number; // Percentage bonus to profit on sales (e.g., 25 = +25%)
  inventoryBonusSlots: number; // Additional inventory slots (e.g., 10 = +10 slots)
  allowanceBonusPercent: number; // Percentage bonus to daily allowance (e.g., 100 = +100%)
  jokerBonusCount: number; // Additional jokers from selection (e.g., 1 = +1 joker)
  rerollBonusCount: number; // Additional rerolls in joker selection (e.g., 1 = +1 reroll)
}

interface HallPassModifiersState extends HallPassModifiers {
  isInitialized: boolean;
}

const initialState: HallPassModifiersState = {
  salePriceBonusPercent: 0,
  inventoryBonusSlots: 0,
  allowanceBonusPercent: 0,
  jokerBonusCount: 0,
  rerollBonusCount: 0,
  isInitialized: false,
};

const hallPassModifiersSlice = createSlice({
  name: 'hallPassModifiers',
  initialState,
  reducers: {
    setHallPassModifiers: (state, action: PayloadAction<HallPassModifiers>) => {
      console.log('🎖️ MODIFIERS REDUCER: setHallPassModifiers called');
      console.log('🎖️ MODIFIERS REDUCER: Received payload:', JSON.stringify(action.payload));
      state.salePriceBonusPercent = action.payload.salePriceBonusPercent;
      state.inventoryBonusSlots = action.payload.inventoryBonusSlots;
      state.allowanceBonusPercent = action.payload.allowanceBonusPercent;
      state.jokerBonusCount = action.payload.jokerBonusCount;
      state.rerollBonusCount = action.payload.rerollBonusCount;
      state.isInitialized = true;
      console.log('🎖️ MODIFIERS REDUCER: State updated successfully');
      console.log('🎖️ MODIFIERS REDUCER: New state:', JSON.stringify({
        salePriceBonusPercent: state.salePriceBonusPercent,
        inventoryBonusSlots: state.inventoryBonusSlots,
        allowanceBonusPercent: state.allowanceBonusPercent,
        jokerBonusCount: state.jokerBonusCount,
        rerollBonusCount: state.rerollBonusCount,
        isInitialized: state.isInitialized,
      }));
    },
    resetHallPassModifiers: (state) => {
      console.log('🎖️ MODIFIERS: Resetting hall pass modifiers to zero');
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, () => {
      console.log('🎖️ MODIFIERS: resetGame called - clearing modifiers for new game');
      // Clear modifiers when starting a new game
      // They will be recalculated from the newly selected hall passes
      return initialState;
    });
  },
});

export const { setHallPassModifiers, resetHallPassModifiers } = hallPassModifiersSlice.actions;

// Selectors
export const selectHallPassModifiers = (state: { hallPassModifiers: HallPassModifiersState }) => ({
  salePriceBonusPercent: state.hallPassModifiers.salePriceBonusPercent,
  inventoryBonusSlots: state.hallPassModifiers.inventoryBonusSlots,
  allowanceBonusPercent: state.hallPassModifiers.allowanceBonusPercent,
  jokerBonusCount: state.hallPassModifiers.jokerBonusCount,
  rerollBonusCount: state.hallPassModifiers.rerollBonusCount,
});

export const selectIsHallPassModifiersInitialized = (state: { hallPassModifiers: HallPassModifiersState }) =>
  state.hallPassModifiers.isInitialized;

export default hallPassModifiersSlice.reducer;
