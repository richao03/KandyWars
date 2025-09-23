import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { JokerService } from '../../utils/jokerService';

interface Joker {
  id: string;
  name: string;
  tier: string;
  effect?: any;
  quantity?: number;
}

// Pre-computed joker effects to avoid repeated calculations
interface ComputedJokerEffects {
  inventoryLimit: number;
  hintChance: number;
  studyTimeMultiplier: number;
  droughtReliefBonus: number;
  emptyInventoryBonus: number;
}

interface JokerState {
  jokers: Joker[];
  jokersOwned: Joker[];
  allJokers: Joker[];
  lockedJokerIds: string[];
  activeEffects: any[]; // Legacy activeEffects for compatibility
  computedEffects: ComputedJokerEffects;
}

const initialComputedEffects: ComputedJokerEffects = {
  inventoryLimit: 30, // default base inventory limit
  hintChance: 0,
  studyTimeMultiplier: 1,
  droughtReliefBonus: 0,
  emptyInventoryBonus: 0,
};

const initialState: JokerState = {
  jokers: [],
  jokersOwned: [],
  allJokers: [],
  lockedJokerIds: [],
  activeEffects: [],
  computedEffects: initialComputedEffects,
};

const jokerSlice = createSlice({
  name: 'joker',
  initialState,
  reducers: {
    // Migration action to ensure old persisted state has computedEffects
    migrateJokerState: (state) => {
      if (!state.computedEffects) {
        state.computedEffects = initialComputedEffects;
      }
      if (!state.activeEffects) {
        state.activeEffects = [];
      }
    },
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
      console.log('🔧 removeJoker reducer: Removing joker with ID:', action.payload, 'Type:', typeof action.payload);
      console.log('🔧 removeJoker reducer: Current jokers:', state.jokers.map(j => ({ id: j.id, type: typeof j.id, name: j.name })));

      const initialLength = state.jokers.length;
      // Handle both string and number IDs by converting both to strings for comparison
      state.jokers = state.jokers.filter(j => j.id.toString() !== action.payload.toString());
      state.jokersOwned = state.jokersOwned.filter(j => j.id.toString() !== action.payload.toString());

      console.log('🔧 removeJoker reducer: Jokers after removal:', state.jokers.length, 'Removed:', initialLength - state.jokers.length);
    },
    lockJoker: (state, action: PayloadAction<string>) => {
      if (!state.lockedJokerIds.includes(action.payload)) {
        state.lockedJokerIds.push(action.payload);
      }
    },
    unlockJoker: (state, action: PayloadAction<string>) => {
      state.lockedJokerIds = state.lockedJokerIds.filter(id => id !== action.payload);
    },
    // New action to recompute joker effects centrally
    recomputeJokerEffects: (state, action: PayloadAction<{ baseInventoryLimit: number; periodCount: number }>) => {
      try {
        const { baseInventoryLimit, periodCount } = action.payload;
        const jokerService = JokerService.getInstance();

        // Compute all common effects once
        const inventoryLimit = jokerService.applyJokerEffects(
          baseInventoryLimit,
          'inventory_limit',
          state.jokers,
          periodCount,
          baseInventoryLimit,
          undefined,
          state.activeEffects
        );

        const hintChance = jokerService.applyJokerEffects(
          0,
          'hint_chance',
          state.jokers,
          periodCount
        );

        const studyTimeMultiplier = jokerService.applyJokerEffects(
          1,
          'study_time',
          state.jokers,
          periodCount
        );

        const droughtReliefBonus = jokerService.applyJokerEffects(
          0,
          'drought_relief_bonus',
          state.jokers,
          periodCount
        );

        const emptyInventoryBonus = jokerService.applyJokerEffects(
          0,
          'empty_inventory_bonus',
          state.jokers,
          periodCount
        );

        state.computedEffects = {
          inventoryLimit,
          hintChance,
          studyTimeMultiplier,
          droughtReliefBonus,
          emptyInventoryBonus,
        };
      } catch (error) {
        console.error('❌ Error in recomputeJokerEffects:', error);
        // Fall back to initial values if computation fails
        state.computedEffects = initialComputedEffects;
      }
    },
    setActiveEffects: (state, action: PayloadAction<any[]>) => {
      state.activeEffects = action.payload;
    },
    addActiveEffect: (state, action: PayloadAction<any>) => {
      state.activeEffects.push(action.payload);
    },
    removeActiveEffect: (state, action: PayloadAction<number>) => {
      state.activeEffects = state.activeEffects.filter(effect => effect.jokerId !== action.payload);
    },
    clearAllActiveEffects: (state) => {
      state.activeEffects = [];
    },
    resetJokers: () => initialState,
  },
});

export const {
  migrateJokerState,
  setJokers,
  setJokersOwned,
  setAllJokers,
  addJoker,
  removeJoker,
  lockJoker,
  unlockJoker,
  recomputeJokerEffects,
  setActiveEffects,
  addActiveEffect,
  removeActiveEffect,
  clearAllActiveEffects,
  resetJokers,
} = jokerSlice.actions;

// Selectors for computed effects (with defensive fallbacks)
export const selectComputedInventoryLimit = (state: { joker: JokerState }) =>
  state.joker.computedEffects?.inventoryLimit ?? initialComputedEffects.inventoryLimit;

export const selectComputedHintChance = (state: { joker: JokerState }) =>
  state.joker.computedEffects?.hintChance ?? initialComputedEffects.hintChance;

export const selectComputedStudyTimeMultiplier = (state: { joker: JokerState }) =>
  state.joker.computedEffects?.studyTimeMultiplier ?? initialComputedEffects.studyTimeMultiplier;

export const selectComputedDroughtReliefBonus = (state: { joker: JokerState }) =>
  state.joker.computedEffects?.droughtReliefBonus ?? initialComputedEffects.droughtReliefBonus;

export const selectComputedEmptyInventoryBonus = (state: { joker: JokerState }) =>
  state.joker.computedEffects?.emptyInventoryBonus ?? initialComputedEffects.emptyInventoryBonus;

export const selectComputedEffects = (state: { joker: JokerState }) =>
  state.joker.computedEffects ?? initialComputedEffects;

export default jokerSlice.reducer;