import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface JuiceSettingsState {
  reduceMotion: boolean;
  haptics: boolean;
}

const initialState: JuiceSettingsState = {
  reduceMotion: false,
  haptics: true,
};

const juiceSettingsSlice = createSlice({
  name: 'juiceSettings',
  initialState,
  reducers: {
    setReduceMotion: (state, action: PayloadAction<boolean>) => {
      state.reduceMotion = action.payload;
    },
    toggleReduceMotion: (state) => {
      state.reduceMotion = !state.reduceMotion;
    },
    setHaptics: (state, action: PayloadAction<boolean>) => {
      state.haptics = action.payload;
    },
    toggleHaptics: (state) => {
      state.haptics = !state.haptics;
    },
    resetJuiceSettings: () => initialState,
  },
});

export const {
  setReduceMotion,
  toggleReduceMotion,
  setHaptics,
  toggleHaptics,
  resetJuiceSettings,
} = juiceSettingsSlice.actions;

type StateWithJuiceSettings = { juiceSettings: JuiceSettingsState };

export const selectReduceMotion = (state: StateWithJuiceSettings): boolean =>
  state.juiceSettings.reduceMotion;

export const selectHaptics = (state: StateWithJuiceSettings): boolean =>
  state.juiceSettings.haptics;

export const selectJuiceSettings = (
  state: StateWithJuiceSettings
): JuiceSettingsState => state.juiceSettings;

export default juiceSettingsSlice.reducer;
