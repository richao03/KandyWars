import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  soundVolume: number; // 0.0 - 1.0
  musicVolume: number; // 0.0 - 1.0
}

const initialState: SettingsState = {
  soundVolume: 1.0,
  musicVolume: 0.5,
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
  },
});

export const { setSoundVolume, setMusicVolume } = settingsSlice.actions;
export const selectSoundVolume = (state: { settings: SettingsState }) => state.settings.soundVolume;
export const selectMusicVolume = (state: { settings: SettingsState }) => state.settings.musicVolume;
export default settingsSlice.reducer;
