import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';
import seedrandom from 'seedrandom';
import { CANDY_NAMES } from '../../constants/candyRegistry';

// Locations available for hustles (excludes 'the connect' special location)
const HUSTLE_LOCATIONS = [
  'gym',
  'cafeteria',
  'home room',
  'library',
  'science lab',
  'school yard',
  'bathroom',
] as const;

export interface HustleEvent {
  id: string;
  day: number;
  period: number; // 1-indexed period within the day (3-7 range)
  location: string;
  candyName: string;
  quantity: number;
  completed: boolean;
}

interface HustleState {
  hustles: HustleEvent[];
  completedHustleIds: string[];
  lastCompletedHustle: HustleEvent | null;
  notEnoughCandyMessage: string | null;
}

const initialState: HustleState = {
  hustles: [],
  completedHustleIds: [],
  lastCompletedHustle: null,
  notEnoughCandyMessage: null,
};

const hustleSlice = createSlice({
  name: 'hustle',
  initialState,
  reducers: {
    generateHustles: (
      state,
      action: PayloadAction<{ seed: string; day: number; periodsPerDay: number }>
    ) => {
      const { seed, day, periodsPerDay } = action.payload;

      // No hustles on Day 1 — give player time to learn
      if (day <= 1) {
        state.hustles = [];
        return;
      }

      const rng = seedrandom(`${seed}-hustle-${day}`);

      // Helper to pick random from array
      const pickRandom = <T,>(arr: readonly T[]): T =>
        arr[Math.floor(rng() * arr.length)];

      // 1-2 hustles per day
      const hustleCount = Math.floor(rng() * 2) + 1;

      const newHustles: HustleEvent[] = [];
      const usedPeriods = new Set<number>();
      const usedLocations = new Set<string>();

      for (let i = 0; i < hustleCount; i++) {
        // Random period: 3 to (periodsPerDay - 1), not too early or too late
        const minPeriod = 3;
        const maxPeriod = Math.max(minPeriod, periodsPerDay - 1);
        let period: number;
        let attempts = 0;
        do {
          period = Math.floor(rng() * (maxPeriod - minPeriod + 1)) + minPeriod;
          attempts++;
        } while (usedPeriods.has(period) && attempts < 10);
        usedPeriods.add(period);

        // Random location (try to avoid duplicates)
        let location: string;
        attempts = 0;
        do {
          location = pickRandom(HUSTLE_LOCATIONS);
          attempts++;
        } while (usedLocations.has(location) && attempts < 10);
        usedLocations.add(location);

        // Random candy from the full candy list
        const candyName = pickRandom(CANDY_NAMES);

        // Quantity scales with day: 5-15 base, +2 per day after day 2
        const baseQty = Math.floor(rng() * 11) + 5; // 5-15
        const dayBonus = Math.max(0, (day - 2) * 2);
        const quantity = baseQty + dayBonus;

        const hustleId = `hustle-${day}-${i}`;

        // Skip if already completed in a previous generation (shouldn't happen, but safety)
        if (!state.completedHustleIds.includes(hustleId)) {
          newHustles.push({
            id: hustleId,
            day,
            period,
            location,
            candyName,
            quantity,
            completed: false,
          });
        }
      }

      state.hustles = newHustles;
    },

    completeHustle: (state, action: PayloadAction<string>) => {
      const hustleId = action.payload;
      const hustle = state.hustles.find((h) => h.id === hustleId);
      if (hustle) {
        hustle.completed = true;
        state.lastCompletedHustle = { ...hustle };
      }
      if (!state.completedHustleIds.includes(hustleId)) {
        state.completedHustleIds.push(hustleId);
      }
    },

    clearLastCompletedHustle: (state) => {
      state.lastCompletedHustle = null;
    },

    setNotEnoughCandyMessage: (state, action: PayloadAction<string>) => {
      state.notEnoughCandyMessage = action.payload;
    },

    clearNotEnoughCandyMessage: (state) => {
      state.notEnoughCandyMessage = null;
    },

    resetHustles: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, () => initialState);
  },
});

export const {
  generateHustles,
  completeHustle,
  clearLastCompletedHustle,
  setNotEnoughCandyMessage,
  clearNotEnoughCandyMessage,
  resetHustles,
} = hustleSlice.actions;

// Selectors
const EMPTY_HUSTLES: HustleEvent[] = [];
const EMPTY_IDS: string[] = [];

export const selectHustles = (state: any): HustleEvent[] =>
  state.hustle?.hustles ?? EMPTY_HUSTLES;

export const selectActiveHustles = createSelector(
  [selectHustles],
  (hustles): HustleEvent[] => hustles.filter((h: HustleEvent) => !h.completed)
);

export const selectCompletedHustleIds = (state: any): string[] =>
  state.hustle?.completedHustleIds ?? EMPTY_IDS;

export const selectLastCompletedHustle = (state: any): HustleEvent | null =>
  state.hustle?.lastCompletedHustle ?? null;

export const selectNotEnoughCandyMessage = (state: any): string | null =>
  state.hustle?.notEnoughCandyMessage ?? null;

/**
 * Select a hustle matching the current location and period.
 * Period here is the 1-indexed period within the day (not periodCount).
 */
export const selectHustleForCurrentLocation = (
  state: any,
  location: string,
  period: number
): HustleEvent | undefined => {
  const hustles: HustleEvent[] = state.hustle?.hustles ?? EMPTY_HUSTLES;
  return hustles.find(
    (h) =>
      !h.completed &&
      h.location === location &&
      h.period === period
  );
};

export default hustleSlice.reducer;
