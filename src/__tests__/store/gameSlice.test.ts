import { createMockStore } from '../utils/testStore';
import {
  incrementPeriod,
  jumpToPeriod,
  resetGame,
  addBulkEmpireSales,
  selectDay,
  selectPeriod,
  selectBulkEmpireStacks,
} from '../../store/slices/gameSlice';

describe('gameSlice', () => {
  it('should have correct initial state defaults', () => {
    const store = createMockStore();
    const state = store.getState().game;

    expect(state.periodCount).toBe(0);
    expect(state.currentLocation).toBe('home room');
    expect(state.isAfterSchool).toBe(false);
    expect(state.hasStudiedTonight).toBe(false);
    expect(state.hasPlayedLunchMinigame).toBe(false);
    expect(state.totalCompletions).toBe(0);
    expect(state.bulkEmpireStacks).toBe(0);
    expect(state.bulkEmpireDailySales).toBe(0);
    expect(state.mediumCandiesUnlocked).toBe(false);
    expect(state.bigCandiesUnlocked).toBe(false);
  });

  it('incrementPeriod advances periodCount by 1', () => {
    const store = createMockStore();
    store.dispatch(incrementPeriod('cafeteria'));
    expect(store.getState().game.periodCount).toBe(1);
  });

  it('incrementPeriod updates currentLocation and location history', () => {
    const store = createMockStore();
    store.dispatch(incrementPeriod('library'));

    const state = store.getState().game;
    expect(state.currentLocation).toBe('library');
    expect(state.locationHistory).toContainEqual({ period: 1, location: 'library' });
  });

  it('incrementPeriod sets pricesUpdating to true and resets minigame flags', () => {
    const store = createMockStore({
      game: {
        periodCount: 0,
        currentLocation: 'home room',
        locationHistory: [{ period: 0, location: 'home room' }],
        hasPlayedLunchMinigame: true,
        selectedMinigame: 'math',
        isAfterSchool: false,
        hasStudiedTonight: false,
        minigameContext: null,
        lastActiveView: 'market' as const,
        trojanHorseCounter: 0,
        isLoaded: false,
        isInitialized: false,
        pricesUpdating: false,
        totalCompletions: 0,
        gameResetSignal: 0,
        markFarmersCarryBonusApplied: [],
        mediumCandiesUnlocked: false,
        bigCandiesUnlocked: false,
        bulkEmpireStacks: 0,
        bulkEmpireDailySales: 0,
        bulkEmpireLastDay: 1,
      },
    });
    store.dispatch(incrementPeriod('gym'));

    const state = store.getState().game;
    expect(state.pricesUpdating).toBe(true);
    expect(state.hasPlayedLunchMinigame).toBe(false);
    expect(state.selectedMinigame).toBeNull();
  });

  it('jumpToPeriod sets periodCount to a specific value within range', () => {
    const store = createMockStore();
    store.dispatch(jumpToPeriod(15));
    expect(store.getState().game.periodCount).toBe(15);
  });

  it('jumpToPeriod does not set periodCount beyond 39', () => {
    const store = createMockStore();
    store.dispatch(jumpToPeriod(40));
    // Should not change from initial 0 since 40 > 39
    expect(store.getState().game.periodCount).toBe(0);
  });

  it('selectDay returns day 1 for periodCount 0', () => {
    const store = createMockStore();
    const day = selectDay(store.getState());
    expect(day).toBe(1);
  });

  it('selectDay returns day 2 for periodCount 8', () => {
    const store = createMockStore({
      game: {
        periodCount: 8,
        currentLocation: 'home room',
        locationHistory: [{ period: 0, location: 'home room' }],
        isAfterSchool: false,
        hasStudiedTonight: false,
        hasPlayedLunchMinigame: false,
        minigameContext: null,
        selectedMinigame: null,
        lastActiveView: 'market' as const,
        trojanHorseCounter: 0,
        isLoaded: false,
        isInitialized: false,
        pricesUpdating: false,
        totalCompletions: 0,
        gameResetSignal: 0,
        markFarmersCarryBonusApplied: [],
        mediumCandiesUnlocked: false,
        bigCandiesUnlocked: false,
        bulkEmpireStacks: 0,
        bulkEmpireDailySales: 0,
        bulkEmpireLastDay: 1,
      },
    });
    expect(selectDay(store.getState())).toBe(2);
  });

  it('selectPeriod returns correct period within day', () => {
    const store = createMockStore({
      game: {
        periodCount: 3,
        currentLocation: 'home room',
        locationHistory: [{ period: 0, location: 'home room' }],
        isAfterSchool: false,
        hasStudiedTonight: false,
        hasPlayedLunchMinigame: false,
        minigameContext: null,
        selectedMinigame: null,
        lastActiveView: 'market' as const,
        trojanHorseCounter: 0,
        isLoaded: false,
        isInitialized: false,
        pricesUpdating: false,
        totalCompletions: 0,
        gameResetSignal: 0,
        markFarmersCarryBonusApplied: [],
        mediumCandiesUnlocked: false,
        bigCandiesUnlocked: false,
        bulkEmpireStacks: 0,
        bulkEmpireDailySales: 0,
        bulkEmpireLastDay: 1,
      },
    });
    // periodCount=3, periodsPerDay=8 (no time_crunch), period = (3 % 8) + 1 = 4
    expect(selectPeriod(store.getState())).toBe(4);
  });

  it('selectBulkEmpireStacks defaults to 0', () => {
    const store = createMockStore();
    expect(selectBulkEmpireStacks(store.getState())).toBe(0);
  });

  it('addBulkEmpireSales updates stacks when crossing threshold on same day', () => {
    const store = createMockStore();

    // Sell 10 candies with threshold of 5 on day 1
    store.dispatch(addBulkEmpireSales({ quantity: 10, threshold: 5, day: 1 }));

    const state = store.getState().game;
    // 10 / 5 = 2 stacks earned
    expect(state.bulkEmpireStacks).toBe(2);
    expect(state.bulkEmpireDailySales).toBe(10);
  });

  it('addBulkEmpireSales resets daily counter on new day and awards pending stacks', () => {
    const store = createMockStore();

    // Day 1: sell 7 candies with threshold 5
    store.dispatch(addBulkEmpireSales({ quantity: 7, threshold: 5, day: 1 }));
    // Should have 1 stack from crossing threshold (floor(7/5)=1)
    expect(store.getState().game.bulkEmpireStacks).toBe(1);

    // Day 2: sell 3 candies — triggers day change, awards stacks from day 1 remaining
    store.dispatch(addBulkEmpireSales({ quantity: 3, threshold: 5, day: 2 }));

    const state = store.getState().game;
    // Day change: previous day had 7 sales >= 5 threshold, so floor(7/5)=1 more stack
    // Then new day sales = 3, no new threshold crossing
    // Total stacks: 1 (from day 1 crossing) + 1 (from day change award) = 2
    expect(state.bulkEmpireStacks).toBe(2);
    expect(state.bulkEmpireDailySales).toBe(3);
    expect(state.bulkEmpireLastDay).toBe(2);
  });

  it('resetGame resets periodCount but preserves totalCompletions', () => {
    const store = createMockStore({
      game: {
        periodCount: 20,
        currentLocation: 'cafeteria',
        locationHistory: [{ period: 0, location: 'home room' }],
        isAfterSchool: true,
        hasStudiedTonight: true,
        hasPlayedLunchMinigame: false,
        minigameContext: null,
        selectedMinigame: null,
        lastActiveView: 'market' as const,
        trojanHorseCounter: 5,
        isLoaded: true,
        isInitialized: true,
        pricesUpdating: false,
        totalCompletions: 3,
        gameResetSignal: 1,
        markFarmersCarryBonusApplied: [],
        mediumCandiesUnlocked: true,
        bigCandiesUnlocked: true,
        bulkEmpireStacks: 5,
        bulkEmpireDailySales: 10,
        bulkEmpireLastDay: 3,
      },
    });
    store.dispatch(resetGame());

    const state = store.getState().game;
    expect(state.periodCount).toBe(0);
    expect(state.totalCompletions).toBe(3);
    expect(state.isInitialized).toBe(true);
    expect(state.gameResetSignal).toBe(2);
    expect(state.currentLocation).toBe('home room');
    expect(state.bulkEmpireStacks).toBe(0);
  });

  it('location history is capped at 10 entries', () => {
    const store = createMockStore();
    const locations: Array<'gym' | 'cafeteria' | 'library' | 'science lab'> = [
      'gym', 'cafeteria', 'library', 'science lab',
    ];

    // Dispatch 12 increments (initial history has 1 entry, so total would be 13 without cap)
    for (let i = 0; i < 12; i++) {
      store.dispatch(incrementPeriod(locations[i % locations.length]));
    }

    expect(store.getState().game.locationHistory.length).toBeLessThanOrEqual(10);
  });
});
