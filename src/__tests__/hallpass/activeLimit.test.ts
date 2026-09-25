import hallPassReducer, {
  selectHallPass,
  getHallPassActiveLimit,
  selectAllHallPasses,
  BASE_MAX_ACTIVE_HALL_PASSES,
  HallPass,
} from '../../store/slices/hallPassSlice';

// Drive the slice from its initial state (availablePasses populated).
const initialState = hallPassReducer(undefined, { type: '@@INIT' });
const allPasses = selectAllHallPasses({ hallPass: initialState });
const byId = (id: string) => allPasses.find((p) => p.id === id) as HallPass;

const select = (state: typeof initialState, ids: string[]) =>
  ids.reduce((s, id) => hallPassReducer(s, selectHallPass(id)), state);

describe('Hall pass active-slot limit', () => {
  it('base limit is 3', () => {
    expect(BASE_MAX_ACTIVE_HALL_PASSES).toBe(3);
    expect(getHallPassActiveLimit([])).toBe(3);
  });

  it('Overachiever raises the limit from 3 to 4', () => {
    expect(getHallPassActiveLimit([byId('overachiever')])).toBe(4);
    expect(byId('overachiever').effects[0].type).toBe('extra_active_slot');
  });

  it('caps selection at 3 without an extension pass', () => {
    const state = select(initialState, [
      'no_longer_freshman',
      'sophomore_swagger',
      'maximalist',
      'junior_genius', // 4th — should be rejected
    ]);
    expect(state.selectedPassIds).toHaveLength(3);
    expect(state.selectedPassIds).not.toContain('junior_genius');
  });

  it('allows a 4th pass once Overachiever is active', () => {
    const state = select(initialState, [
      'no_longer_freshman',
      'sophomore_swagger',
      'maximalist',
      'overachiever', // raises cap to 4 — allowed as the 4th
    ]);
    expect(state.selectedPassIds).toHaveLength(4);
    expect(state.selectedPassIds).toContain('overachiever');

    // A 5th is still rejected.
    const more = select(state, ['junior_genius']);
    expect(more.selectedPassIds).toHaveLength(4);
    expect(more.selectedPassIds).not.toContain('junior_genius');
  });

  it('deselecting always works even at the cap', () => {
    const full = select(initialState, [
      'no_longer_freshman',
      'sophomore_swagger',
      'maximalist',
    ]);
    const after = hallPassReducer(full, selectHallPass('maximalist'));
    expect(after.selectedPassIds).toHaveLength(2);
    expect(after.selectedPassIds).not.toContain('maximalist');
  });
});
