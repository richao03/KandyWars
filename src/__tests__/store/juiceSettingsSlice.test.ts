import juiceSettingsReducer, {
  JuiceSettingsState,
  setReduceMotion,
  toggleReduceMotion,
  setHaptics,
  toggleHaptics,
  resetJuiceSettings,
  selectReduceMotion,
  selectHaptics,
  selectJuiceSettings,
} from '../../store/slices/juiceSettingsSlice';

const defaultState: JuiceSettingsState = {
  reduceMotion: false,
  haptics: true,
};

describe('juiceSettingsSlice', () => {
  describe('initial state', () => {
    it('has reduceMotion=false by default', () => {
      const state = juiceSettingsReducer(undefined, { type: '@@INIT' });
      expect(state.reduceMotion).toBe(false);
    });

    it('has haptics=true by default', () => {
      const state = juiceSettingsReducer(undefined, { type: '@@INIT' });
      expect(state.haptics).toBe(true);
    });
  });

  describe('setReduceMotion', () => {
    it('sets reduceMotion to true', () => {
      const state = juiceSettingsReducer(defaultState, setReduceMotion(true));
      expect(state.reduceMotion).toBe(true);
    });

    it('sets reduceMotion to false', () => {
      const state = juiceSettingsReducer(
        { ...defaultState, reduceMotion: true },
        setReduceMotion(false)
      );
      expect(state.reduceMotion).toBe(false);
    });
  });

  describe('toggleReduceMotion', () => {
    it('flips reduceMotion from false to true', () => {
      const state = juiceSettingsReducer(defaultState, toggleReduceMotion());
      expect(state.reduceMotion).toBe(true);
    });

    it('flips reduceMotion from true to false', () => {
      const state = juiceSettingsReducer(
        { ...defaultState, reduceMotion: true },
        toggleReduceMotion()
      );
      expect(state.reduceMotion).toBe(false);
    });
  });

  describe('setHaptics', () => {
    it('sets haptics to false', () => {
      const state = juiceSettingsReducer(defaultState, setHaptics(false));
      expect(state.haptics).toBe(false);
    });

    it('sets haptics to true', () => {
      const state = juiceSettingsReducer(
        { ...defaultState, haptics: false },
        setHaptics(true)
      );
      expect(state.haptics).toBe(true);
    });
  });

  describe('toggleHaptics', () => {
    it('flips haptics from true to false', () => {
      const state = juiceSettingsReducer(defaultState, toggleHaptics());
      expect(state.haptics).toBe(false);
    });

    it('flips haptics from false to true', () => {
      const state = juiceSettingsReducer(
        { ...defaultState, haptics: false },
        toggleHaptics()
      );
      expect(state.haptics).toBe(true);
    });
  });

  describe('resetJuiceSettings', () => {
    it('returns to defaults from modified state', () => {
      const modifiedState: JuiceSettingsState = { reduceMotion: true, haptics: false };
      const state = juiceSettingsReducer(modifiedState, resetJuiceSettings());
      expect(state).toEqual(defaultState);
    });

    it('defaults are reduceMotion=false, haptics=true', () => {
      const state = juiceSettingsReducer(
        { reduceMotion: true, haptics: false },
        resetJuiceSettings()
      );
      expect(state.reduceMotion).toBe(false);
      expect(state.haptics).toBe(true);
    });
  });

  describe('selectors', () => {
    const storeState = { juiceSettings: defaultState };

    it('selectReduceMotion returns the reduceMotion field', () => {
      expect(selectReduceMotion(storeState)).toBe(false);
      expect(selectReduceMotion({ juiceSettings: { ...defaultState, reduceMotion: true } })).toBe(true);
    });

    it('selectHaptics returns the haptics field', () => {
      expect(selectHaptics(storeState)).toBe(true);
      expect(selectHaptics({ juiceSettings: { ...defaultState, haptics: false } })).toBe(false);
    });

    it('selectJuiceSettings returns the full slice state', () => {
      expect(selectJuiceSettings(storeState)).toEqual(defaultState);
    });

    it('selectJuiceSettings reflects modified state', () => {
      const modified = { reduceMotion: true, haptics: false };
      expect(selectJuiceSettings({ juiceSettings: modified })).toEqual(modified);
    });
  });
});
