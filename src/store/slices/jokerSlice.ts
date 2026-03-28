import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { JokerService } from '../../utils/jokerService';
import { STANDARDIZED_JOKERS } from '../../utils/jokerEffectEngine';
import { resetGame } from './gameSlice';

interface Joker {
  id: string;
  name: string;
  tier: string;
  type?: 'one-time' | 'persistent';
  effect?: any;
  quantity?: number;
  level?: number;
}

// Max number of persistent (aura) jokers that can be active at once
export const MAX_PERSISTENT_SLOTS = 5;

// Helper to determine if a joker is persistent based on STANDARDIZED_JOKERS data
function isJokerPersistent(joker: Joker): boolean {
  // First check the joker's own type field if set
  if (joker.type === 'one-time') return false;
  if (joker.type === 'persistent') return true;
  // Fall back to STANDARDIZED_JOKERS lookup
  const standardized = STANDARDIZED_JOKERS.find(sj => sj.id.toString() === joker.id.toString());
  return standardized ? standardized.type === 'persistent' : true; // default to persistent if unknown
}

// Count persistent jokers in an array
function countPersistentJokers(jokers: Joker[]): number {
  return jokers.filter(isJokerPersistent).length;
}

// Pre-computed joker effects to avoid repeated calculations
interface ComputedJokerEffects {
  inventoryLimit: number;
  hintChance: number;
  studyTimeMultiplier: number;
}

interface JokerState {
  jokers: Joker[];
  jokersOwned: Joker[];
  allJokers: Joker[];
  lockedJokerIds: string[];
  activeEffects: any[]; // Legacy activeEffects for compatibility
  computedEffects: ComputedJokerEffects;
  vacuumSealerBonus: number; // One-time bonus from Vacuum Sealer, added to base inventory
  usedTodayJokerIds: string[]; // Tracks which instant jokers have been used today
  currentDay: number; // Track current day for daily reset
}

const initialComputedEffects: ComputedJokerEffects = {
  inventoryLimit: 30, // default base inventory limit
  hintChance: 0,
  studyTimeMultiplier: 1,
};

const initialState: JokerState = {
  jokers: [],
  jokersOwned: [],
  allJokers: [],
  lockedJokerIds: [],
  activeEffects: [],
  computedEffects: initialComputedEffects,
  vacuumSealerBonus: 0,
  usedTodayJokerIds: [],
  currentDay: 1,
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
      // Default level on existing jokers for backward compat
      state.jokers.forEach(j => { if (j.level == null) j.level = 1; });
      state.jokersOwned.forEach(j => { if (j.level == null) j.level = 1; });
    },
    upgradeJoker: (state, action: PayloadAction<string>) => {
      const jokerId = action.payload;
      const upgradeInArray = (arr: Joker[]) => {
        const joker = arr.find(j => j.id.toString() === jokerId.toString());
        if (joker) {
          const currentLevel = joker.level ?? 1;
          if (currentLevel < 3) {
            joker.level = currentLevel + 1;
          }
        }
      };
      upgradeInArray(state.jokers);
      upgradeInArray(state.jokersOwned);
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
    // Sell a persistent joker: remove from active, grant cash via wallet (caller handles cash)
    sellJoker: (state, action: PayloadAction<string>) => {
      const jokerId = action.payload;
      state.jokers = state.jokers.filter(j => j.id.toString() !== jokerId.toString());
      // Keep in jokersOwned for history tracking
      if (__DEV__) console.log(`💰 Sold joker ${jokerId}. Active jokers remaining: ${state.jokers.length}`);
    },
    // Swap a persistent joker: remove old, add new (for slot limit enforcement)
    swapJoker: (state, action: PayloadAction<{ removeId: string; newJoker: Joker }>) => {
      const { removeId, newJoker } = action.payload;
      state.jokers = state.jokers.filter(j => j.id.toString() !== removeId.toString());
      state.jokers.push(newJoker);
      state.jokersOwned.push(newJoker);
      if (__DEV__) console.log(`🔄 Swapped joker ${removeId} for ${newJoker.name}. Active: ${state.jokers.length}`);
    },
    removeJoker: (state, action: PayloadAction<string>) => {
      if (__DEV__) {
        console.log('🔧 removeJoker reducer: Removing joker with ID:', action.payload, 'Type:', typeof action.payload);
        console.log('🔧 removeJoker reducer: Current jokers:', state.jokers.map(j => ({ id: j.id, type: typeof j.id, name: j.name })));
      }

      const initialLength = state.jokers.length;
      // Handle both string and number IDs by converting both to strings for comparison
      state.jokers = state.jokers.filter(j => j.id.toString() !== action.payload.toString());
      state.jokersOwned = state.jokersOwned.filter(j => j.id.toString() !== action.payload.toString());

      if (__DEV__) console.log('🔧 removeJoker reducer: Jokers after removal:', state.jokers.length, 'Removed:', initialLength - state.jokers.length);
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
    recomputeJokerEffects: (state, action: PayloadAction<{ baseInventoryLimit: number; periodCount: number; day?: number }>) => {
      try {
        const { baseInventoryLimit, periodCount, day = 1 } = action.payload;
        const jokerService = JokerService.getInstance();

        // Add Vacuum Sealer bonus to base BEFORE applying other joker effects
        const adjustedBaseInventory = baseInventoryLimit + state.vacuumSealerBonus;

        // Initialize the engine once with all jokers to avoid redundant clearing/adding
        // Filter out Vacuum Sealer since we've already applied its effect to the base
        const jokersToApply = state.jokers.filter(j => j.id.toString() !== '12');

        jokerService.initializeEngineForComputation(
          jokersToApply,
          periodCount,
          adjustedBaseInventory,
          state.activeEffects
        );

        // Now compute all effects efficiently without re-initializing
        let inventoryLimit = jokerService.computeEffect(
          adjustedBaseInventory,
          'inventory_limit',
          periodCount
        );

        const hintChance = jokerService.computeEffect(
          0,
          'hint_chance',
          periodCount
        );

        const studyTimeMultiplier = jokerService.computeEffect(
          1,
          'study_time',
          periodCount
        );

        state.computedEffects = {
          inventoryLimit,
          hintChance,
          studyTimeMultiplier,
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
    setVacuumSealerBonus: (state, action: PayloadAction<number>) => {
      if (__DEV__) console.log('🔧 Vacuum Sealer: Setting one-time bonus to', action.payload);
      state.vacuumSealerBonus = action.payload;
    },
    clearAllActiveEffects: (state) => {
      state.activeEffects = [];
    },
    markJokerUsedToday: (state, action: PayloadAction<string>) => {
      const jokerId = action.payload;
      if (__DEV__) {
        console.log('🔧 REDUCER markJokerUsedToday: Received ID:', jokerId, 'Type:', typeof jokerId);
        console.log('🔧 REDUCER markJokerUsedToday: Current usedTodayJokerIds:', state.usedTodayJokerIds);
      }

      // Initialize if doesn't exist (backwards compatibility)
      if (!state.usedTodayJokerIds) {
        if (__DEV__) console.log('🔧 REDUCER markJokerUsedToday: Initializing usedTodayJokerIds array');
        state.usedTodayJokerIds = [];
      }

      if (!state.usedTodayJokerIds.includes(jokerId)) {
        state.usedTodayJokerIds.push(jokerId);
        if (__DEV__) {
          console.log(`✅ REDUCER markJokerUsedToday: Joker ${jokerId} marked as used today`);
          console.log('✅ REDUCER markJokerUsedToday: New usedTodayJokerIds:', state.usedTodayJokerIds);
        }
      } else {
        if (__DEV__) console.log(`⚠️ REDUCER markJokerUsedToday: Joker ${jokerId} was ALREADY in usedTodayJokerIds!`);
      }
    },
    resetDailyJokerUsage: (state, action: PayloadAction<number>) => {
      const newDay = action.payload;
      if (newDay !== state.currentDay) {
        if (__DEV__) console.log(`🌅 New day ${newDay}! Resetting daily joker usage (was day ${state.currentDay})`);
        state.usedTodayJokerIds = [];
        state.currentDay = newDay;
      }
    },
    resetJokers: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, () => initialState);
  },
});

export const {
  migrateJokerState,
  setJokers,
  setJokersOwned,
  setAllJokers,
  addJoker,
  removeJoker,
  sellJoker,
  swapJoker,
  upgradeJoker,
  lockJoker,
  unlockJoker,
  recomputeJokerEffects,
  setActiveEffects,
  addActiveEffect,
  removeActiveEffect,
  setVacuumSealerBonus,
  clearAllActiveEffects,
  markJokerUsedToday,
  resetDailyJokerUsage,
  resetJokers,
} = jokerSlice.actions;

// Selectors for computed effects (with defensive fallbacks)
export const selectComputedInventoryLimit = (state: { joker: JokerState }) =>
  state.joker.computedEffects?.inventoryLimit ?? initialComputedEffects.inventoryLimit;

export const selectComputedHintChance = (state: { joker: JokerState }) =>
  state.joker.computedEffects?.hintChance ?? initialComputedEffects.hintChance;

export const selectComputedStudyTimeMultiplier = (state: { joker: JokerState }) =>
  state.joker.computedEffects?.studyTimeMultiplier ?? initialComputedEffects.studyTimeMultiplier;

export const selectComputedEffects = (state: { joker: JokerState }) =>
  state.joker.computedEffects ?? initialComputedEffects;

// Memoized selectors to prevent unnecessary re-renders
const EMPTY_ARRAY: any[] = [];

export const selectJokerActiveEffects = (state: { joker: JokerState }) =>
  state.joker.activeEffects ?? EMPTY_ARRAY;

export const selectUsedTodayJokerIds = (state: { joker: JokerState }) =>
  state.joker.usedTodayJokerIds ?? EMPTY_ARRAY;

export const selectCurrentDay = (state: { joker: JokerState }) =>
  state.joker.currentDay ?? 1;

// Named field selectors for useJokers hook optimization (avoids subscribing to entire slice)
export const selectJokers = (state: { joker: JokerState }) => state.joker.jokers;
export const selectJokersOwned = (state: { joker: JokerState }) => state.joker.jokersOwned;
export const selectAllJokers = (state: { joker: JokerState }) => state.joker.allJokers;
export const selectLockedJokerIds = (state: { joker: JokerState }) => state.joker.lockedJokerIds;
export const selectJokerComputedEffects = (state: { joker: JokerState }) => state.joker.computedEffects;

// Persistent joker count selector (for slot limit UI)
export const selectPersistentJokerCount = (state: { joker: JokerState }) =>
  countPersistentJokers(state.joker.jokers);

// Re-export helpers for external use
export { isJokerPersistent, countPersistentJokers };

export default jokerSlice.reducer;