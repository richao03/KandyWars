import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Location =
  | 'gym'
  | 'cafeteria'
  | 'home room'
  | 'library'
  | 'science lab'
  | 'school yard'
  | 'bathroom'
  | 'the connect';

type LocationHistory = {
  period: number;
  location: Location;
};

interface GameState {
  periodCount: number;
  currentLocation: Location;
  locationHistory: LocationHistory[];
  isAfterSchool: boolean;
  hasStudiedTonight: boolean;
  hasPlayedLunchMinigame: boolean;
  minigameContext: 'lunch' | 'after-school' | null;
  lastActiveView: 'market' | 'after-school';
  trojanHorseCounter: number;
  isLoaded: boolean;
  isInitialized: boolean;
  pricesUpdating: boolean;
  totalCompletions: number;
  gameResetSignal: number; // Increments on each game reset to signal zombie cleanup
  markFarmersCarryBonusApplied: number[]; // Tracks which periods have received Farmers Carry bonus
}

const initialState: GameState = {
  periodCount: 0,
  currentLocation: 'home room',
  locationHistory: [{ period: 0, location: 'home room' }],
  isAfterSchool: false,
  hasStudiedTonight: false,
  hasPlayedLunchMinigame: false,
  minigameContext: null,
  lastActiveView: 'market',
  trojanHorseCounter: 0,
  isLoaded: false,
  isInitialized: false,
  pricesUpdating: false,
  totalCompletions: 0,
  gameResetSignal: 0,
  markFarmersCarryBonusApplied: [],
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setPeriodCount: (state, action: PayloadAction<number>) => {
      state.periodCount = action.payload;
    },
    setCurrentLocation: (state, action: PayloadAction<Location>) => {
      state.currentLocation = action.payload;
    },
    addLocationHistory: (state, action: PayloadAction<LocationHistory>) => {
      state.locationHistory.push(action.payload);
    },
    setLocationHistory: (state, action: PayloadAction<LocationHistory[]>) => {
      state.locationHistory = action.payload;
    },
    setIsAfterSchool: (state, action: PayloadAction<boolean>) => {
      state.isAfterSchool = action.payload;
    },
    setHasStudiedTonight: (state, action: PayloadAction<boolean>) => {
      state.hasStudiedTonight = action.payload;
    },
    setHasPlayedLunchMinigame: (state, action: PayloadAction<boolean>) => {
      state.hasPlayedLunchMinigame = action.payload;
    },
    setLastActiveView: (
      state,
      action: PayloadAction<'market' | 'after-school'>
    ) => {
      state.lastActiveView = action.payload;
    },
    incrementTrojanHorseCounter: (state) => {
      state.trojanHorseCounter++;
    },
    setTrojanHorseCounter: (state, action: PayloadAction<number>) => {
      state.trojanHorseCounter = action.payload;
    },
    setIsLoaded: (state, action: PayloadAction<boolean>) => {
      state.isLoaded = action.payload;
    },
    setIsInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setPricesUpdating: (state, action: PayloadAction<boolean>) => {
      state.pricesUpdating = action.payload;
    },
    setTotalCompletions: (state, action: PayloadAction<number>) => {
      state.totalCompletions = action.payload;
    },
    incrementTotalCompletions: (state) => {
      state.totalCompletions++;
    },
    incrementPeriod: (state, action: PayloadAction<Location>) => {
      state.periodCount++;
      state.currentLocation = action.payload;
      state.locationHistory.push({
        period: state.periodCount,
        location: action.payload,
      });

      // Keep only last 10 periods of location history to prevent unbounded growth
      if (state.locationHistory.length > 10) {
        state.locationHistory = state.locationHistory.slice(-10);
      }

      state.pricesUpdating = true;
      // Reset lunch minigame flag when moving to a new period
      state.hasPlayedLunchMinigame = false;
      if (__DEV__) {
        console.log(
          '💾 Period incremented to:',
          state.periodCount,
          '- Auto-save triggered'
        );
      }
    },
    startAfterSchool: (state) => {
      state.isAfterSchool = true;
      // Reset study flag when entering after-school to allow studying
      state.hasStudiedTonight = false;
    },
    startNewDay: (state, action: PayloadAction<number | undefined>) => {
      const periodsPerDay = action.payload ?? 8; // Default to 8 if not provided
      const newPeriodCount =
        Math.floor(state.periodCount / periodsPerDay) * periodsPerDay +
        periodsPerDay;
      state.periodCount = newPeriodCount;
      state.isAfterSchool = false;
      state.hasStudiedTonight = false;
      state.currentLocation = 'home room';
      state.locationHistory.push({
        period: newPeriodCount,
        location: 'home room',
      });
      if (__DEV__) {
        console.log(
          `💾 New day started, period: ${newPeriodCount} (${periodsPerDay} periods/day) - Auto-save triggered`
        );
      }
    },
    resetGame: (state) => {
      // Preserve totalCompletions and isInitialized across game resets
      const totalCompletions = state.totalCompletions;
      const isInitialized = state.isInitialized; // Preserve so "Continue" button stays enabled
      const gameResetSignal = state.gameResetSignal + 1; // Increment to signal cleanup
      console.log(
        `🔄 Game reset signal: ${gameResetSignal} - This will trigger zombie cleanup`
      );
      return {
        ...initialState,
        totalCompletions,
        isInitialized,
        gameResetSignal,
      };
    },
    fullResetGame: (state) => {
      // Full reset including isInitialized - used after completing a game
      const totalCompletions = state.totalCompletions;
      const gameResetSignal = state.gameResetSignal + 1;
      console.log(
        `🔄 Full game reset signal: ${gameResetSignal} - Clearing isInitialized`
      );
      return {
        ...initialState,
        totalCompletions,
        isInitialized: false, // Clear to disable "Continue" button
        gameResetSignal,
      };
    },
    revertToPreviousPeriod: (state) => {
      if (state.periodCount > 0) {
        state.periodCount--;
        const prevHistory =
          state.locationHistory[state.locationHistory.length - 2];
        if (prevHistory) {
          state.currentLocation = prevHistory.location;
          state.locationHistory.pop();
        }
      }
    },
    jumpToPeriod: (state, action: PayloadAction<number>) => {
      const targetPeriod = action.payload;
      if (targetPeriod >= 0 && targetPeriod <= 39) {
        state.periodCount = targetPeriod;
        const historyEntry = state.locationHistory.find(
          (h) => h.period === targetPeriod
        );
        if (historyEntry) {
          state.currentLocation = historyEntry.location;
        }
      }
    },
    markStudiedTonight: (state) => {
      state.hasStudiedTonight = true;
    },
    markLunchMinigamePlayed: (state) => {
      state.hasPlayedLunchMinigame = true;
    },
    setMinigameContext: (
      state,
      action: PayloadAction<'lunch' | 'after-school' | null>
    ) => {
      state.minigameContext = action.payload;
    },
    markFarmersCarryBonusApplied: (state, action: PayloadAction<number>) => {
      const period = action.payload;
      if (!state.markFarmersCarryBonusApplied.includes(period)) {
        state.markFarmersCarryBonusApplied.push(period);
        // Keep only last 50 periods to prevent unbounded growth
        if (state.markFarmersCarryBonusApplied.length > 50) {
          state.markFarmersCarryBonusApplied =
            state.markFarmersCarryBonusApplied.slice(-50);
        }
      }
    },
  },
});

export const {
  setPeriodCount,
  setCurrentLocation,
  setMinigameContext,
  addLocationHistory,
  setLocationHistory,
  setIsAfterSchool,
  setHasStudiedTonight,
  setHasPlayedLunchMinigame,
  setLastActiveView,
  incrementTrojanHorseCounter,
  setTrojanHorseCounter,
  setIsLoaded,
  setIsInitialized,
  setPricesUpdating,
  setTotalCompletions,
  incrementTotalCompletions,
  incrementPeriod,
  startAfterSchool,
  startNewDay,
  resetGame,
  fullResetGame,
  revertToPreviousPeriod,
  jumpToPeriod,
  markStudiedTonight,
  markLunchMinigamePlayed,
  markFarmersCarryBonusApplied,
} = gameSlice.actions;

export default gameSlice.reducer;

// Helper function to get periods per day based on hall pass selection
export const getPeriodsPerDay = (state: any): number => {
  const selectedPassIds = state.hallPass?.selectedPassIds || [];
  return selectedPassIds.includes('time_crunch') ? 6 : 8;
};

// Selectors
export const selectDay = (state: any) => {
  const periodsPerDay = getPeriodsPerDay(state);
  return Math.max(1, Math.floor(state.game?.periodCount / periodsPerDay) + 1);
};

export const selectPeriod = (state: any) => {
  const periodsPerDay = getPeriodsPerDay(state);
  return Math.max(1, (state.game?.periodCount % periodsPerDay) + 1);
};

export const selectGameResetSignal = (state: any) =>
  state.game?.gameResetSignal;
