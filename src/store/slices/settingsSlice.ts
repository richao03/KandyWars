import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  soundVolume: number; // 0.0 - 1.0
  musicVolume: number; // 0.0 - 1.0
  // Transaction modal: collapse state for the per-section breakdowns. When
  // collapsed, the section renders as a compact horizontal row of joker icons
  // instead of the per-row breakdown. Persisted across sessions.
  txnProfitBoostCollapsed: boolean;
  txnMultiplierCollapsed: boolean;
}

const initialState: SettingsState = {
  soundVolume: 1.0,
  musicVolume: 0.5,
  txnProfitBoostCollapsed: false,
  txnMultiplierCollapsed: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSoundVolume: (state, action: PayloadAction<number>) => {
      state.soundVolume = Math.max(0, Math.min(1, action.payload));
    },
    setMusicVolume: (state, action: PayloadAction<number>) => {
      state.musicVolume = Math.max(0, Math.min(1, action.payload));
    },
    toggleTxnProfitBoostCollapsed: (state) => {
      state.txnProfitBoostCollapsed = !state.txnProfitBoostCollapsed;
    },
    toggleTxnMultiplierCollapsed: (state) => {
      state.txnMultiplierCollapsed = !state.txnMultiplierCollapsed;
    },
  },
});

export const {
  setSoundVolume,
  setMusicVolume,
  toggleTxnProfitBoostCollapsed,
  toggleTxnMultiplierCollapsed,
} = settingsSlice.actions;

export const selectSoundVolume = (state: { settings: SettingsState }) => state.settings.soundVolume;
export const selectMusicVolume = (state: { settings: SettingsState }) => state.settings.musicVolume;
export const selectTxnProfitBoostCollapsed = (state: { settings: SettingsState }) =>
  state.settings.txnProfitBoostCollapsed ?? false;
export const selectTxnMultiplierCollapsed = (state: { settings: SettingsState }) =>
  state.settings.txnMultiplierCollapsed ?? false;
export default settingsSlice.reducer;
