import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Location =
  | 'gym'
  | 'cafeteria'
  | 'home room'
  | 'library'
  | 'science lab'
  | 'school yard'
  | 'bathroom';

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
  lastActiveView: 'market' | 'after-school';
  trojanHorseCounter: number;
  isLoaded: boolean;
  isInitialized: boolean;
  pricesUpdating: boolean;
}

const initialState: GameState = {
  periodCount: 0,
  currentLocation: 'home room',
  locationHistory: [{ period: 0, location: 'home room' }],
  isAfterSchool: false,
  hasStudiedTonight: false,
  lastActiveView: 'market',
  trojanHorseCounter: 0,
  isLoaded: false,
  isInitialized: false,
  pricesUpdating: false,
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
    incrementPeriod: (state, action: PayloadAction<Location>) => {
      state.periodCount++;
      state.currentLocation = action.payload;
      state.locationHistory.push({
        period: state.periodCount,
        location: action.payload,
      });
      state.pricesUpdating = true;
      console.log('💾 Period incremented to:', state.periodCount, '- Auto-save triggered');
    },
    startAfterSchool: (state) => {
      state.isAfterSchool = true;
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
      return initialState;
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
  },
});

export const {
  setPeriodCount,
  setCurrentLocation,
  addLocationHistory,
  setLocationHistory,
  setIsAfterSchool,
  setHasStudiedTonight,
  setLastActiveView,
  incrementTrojanHorseCounter,
  setTrojanHorseCounter,
  setIsLoaded,
  setIsInitialized,
  setPricesUpdating,
  incrementPeriod,
  startAfterSchool,
  startNewDay,
  resetGame,
  revertToPreviousPeriod,
  jumpToPeriod,
  markStudiedTonight,
} = gameSlice.actions;

export default gameSlice.reducer;

// Selectors
export const selectDay = (state: { game: GameState }) =>
  Math.max(1, Math.floor(state.game.periodCount / 8) + 1);

export const selectPeriod = (state: { game: GameState }) =>
  Math.max(1, (state.game.periodCount % 8) + 1);