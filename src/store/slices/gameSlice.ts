import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Location =
  | 'gym'
  | 'cafeteria'
  | 'home room'
  | 'library'
  | 'science lab'
  | 'school yard'
  | 'bathroom'
  | 'music room';

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
  hasCompletedMarketTutorial: boolean;
  hasCompletedAfterSchoolTutorial: boolean;
  totalCompletions: number;
  gameResetSignal: number; // Increments on each game reset to signal zombie cleanup
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
  hasCompletedMarketTutorial: false,
  hasCompletedAfterSchoolTutorial: false,
  totalCompletions: 0,
  gameResetSignal: 0,
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
    setLastActiveView: (state, action: PayloadAction<'market' | 'after-school'>) => {
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
    setHasCompletedMarketTutorial: (state, action: PayloadAction<boolean>) => {
      state.hasCompletedMarketTutorial = action.payload;
    },
    setHasCompletedAfterSchoolTutorial: (state, action: PayloadAction<boolean>) => {
      state.hasCompletedAfterSchoolTutorial = action.payload;
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
      console.log('💾 Period incremented to:', state.periodCount, '- Auto-save triggered');
    },
    startAfterSchool: (state) => {
      state.isAfterSchool = true;
      // Reset study flag when entering after-school to allow studying
      state.hasStudiedTonight = false;
    },
    startNewDay: (state) => {
      const newPeriodCount = Math.floor(state.periodCount / 8) * 8 + 8;
      state.periodCount = newPeriodCount;
      state.isAfterSchool = false;
      state.hasStudiedTonight = false;
      state.currentLocation = 'home room';
      state.locationHistory.push({
        period: newPeriodCount,
        location: 'home room',
      });
      console.log('💾 New day started, period:', newPeriodCount, '- Auto-save triggered');
    },
    resetGame: (state) => {
      // Preserve tutorial completion flags, totalCompletions, and isInitialized across game resets
      const hasCompletedMarketTutorial = state.hasCompletedMarketTutorial;
      const hasCompletedAfterSchoolTutorial = state.hasCompletedAfterSchoolTutorial;
      const totalCompletions = state.totalCompletions;
      const isInitialized = state.isInitialized; // Preserve so "Continue" button stays enabled
      const gameResetSignal = state.gameResetSignal + 1; // Increment to signal cleanup
      console.log(`🔄 Game reset signal: ${gameResetSignal} - This will trigger zombie cleanup`);
      return {
        ...initialState,
        hasCompletedMarketTutorial,
        hasCompletedAfterSchoolTutorial,
        totalCompletions,
        isInitialized,
        gameResetSignal,
      };
    },
    fullResetGame: (state) => {
      // Full reset including isInitialized - used after completing a game
      const hasCompletedMarketTutorial = state.hasCompletedMarketTutorial;
      const hasCompletedAfterSchoolTutorial = state.hasCompletedAfterSchoolTutorial;
      const totalCompletions = state.totalCompletions;
      const gameResetSignal = state.gameResetSignal + 1;
      console.log(`🔄 Full game reset signal: ${gameResetSignal} - Clearing isInitialized`);
      return {
        ...initialState,
        hasCompletedMarketTutorial,
        hasCompletedAfterSchoolTutorial,
        totalCompletions,
        isInitialized: false, // Clear to disable "Continue" button
        gameResetSignal,
      };
    },
    revertToPreviousPeriod: (state) => {
      if (state.periodCount > 0) {
        state.periodCount--;
        const prevHistory = state.locationHistory[state.locationHistory.length - 2];
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
        const historyEntry = state.locationHistory.find(h => h.period === targetPeriod);
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
    setMinigameContext: (state, action: PayloadAction<'lunch' | 'after-school' | null>) => {
      state.minigameContext = action.payload;
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
  setHasCompletedMarketTutorial,
  setHasCompletedAfterSchoolTutorial,
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
} = gameSlice.actions;

export default gameSlice.reducer;

// Selectors
export const selectDay = (state: any) =>
  Math.max(1, Math.floor(state.game?.periodCount / 8) + 1);

export const selectPeriod = (state: any) =>
  Math.max(1, (state.game?.periodCount % 8) + 1);

export const selectGameResetSignal = (state: any) =>
  state.game?.gameResetSignal;