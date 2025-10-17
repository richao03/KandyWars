import { configureStore } from '@reduxjs/toolkit';
import { DeepPartial } from '@reduxjs/toolkit';
import gameReducer from '../../store/slices/gameSlice';
import flavorTextReducer from '../../store/slices/flavorTextSlice';
import jokerReducer from '../../store/slices/jokerSlice';
import walletReducer from '../../store/slices/walletSlice';
import inventoryReducer from '../../store/slices/inventorySlice';
import eventHandlerReducer from '../../store/slices/eventHandlerSlice';
import scoreboardReducer from '../../store/slices/scoreboardSlice';
import candySalesReducer from '../../store/slices/candySalesSlice';
import seedReducer from '../../store/slices/seedSlice';
import tabBarReducer from '../../store/slices/tabBarSlice';
import dailyStatsReducer from '../../store/slices/dailyStatsSlice';
import priceDoublingReducer from '../../store/slices/priceDoublingSlice';
import hallPassReducer from '../../store/slices/hallPassSlice';
import minigameTrackingReducer from '../../store/slices/minigameTrackingSlice';
import { RootState } from '../../store/store';

/**
 * Create a mock Redux store for testing with custom initial state
 * @param preloadedState - Partial state to initialize the store with
 * @returns Configured test store
 */
export const createMockStore = (preloadedState?: DeepPartial<RootState>) => {
  return configureStore({
    reducer: {
      game: gameReducer,
      flavorText: flavorTextReducer,
      joker: jokerReducer,
      wallet: walletReducer,
      inventory: inventoryReducer,
      eventHandler: eventHandlerReducer,
      scoreboard: scoreboardReducer,
      candySales: candySalesReducer,
      seed: seedReducer,
      tabBar: tabBarReducer,
      dailyStats: dailyStatsReducer,
      priceDoubling: priceDoublingReducer,
      hallPass: hallPassReducer,
      minigameTracking: minigameTrackingReducer,
    },
    preloadedState: preloadedState as any,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }),
  });
};

/**
 * Test state presets for common testing scenarios
 */
export const testStates = {
  // Basic game state with no bonuses
  basicGame: {
    game: {
      periodCount: 3,
      day: 2,
      hasStudiedTonight: false,
      isMorning: false,
      isEndOfDay: false,
      isSchoolDay: false,
      isAfterSchool: false,
      isWeekend: false,
      periodEvents: {},
      tutorialCompleted: false,
    },
    wallet: {
      balance: 100,
      difficultyLevel: 1,
      stashedAmount: -500,
      initialBalance: 10,
      totalSpent: 0,
      totalEarned: 0,
      lifetimeSpent: 0,
      lifetimeEarned: 0,
    },
    inventory: {
      items: [],
      maxItems: 20,
    },
    joker: {
      jokers: [],
      jokersOwned: [],
      allJokers: [],
      lockedJokerIds: [],
      activeEffects: [],
      computedEffects: {
        inventoryLimit: 30,
        hintChance: 0,
        studyTimeMultiplier: 1,
        droughtReliefBonus: 0,
        emptyInventoryBonus: 0,
      },
    },
    hallPass: {
      availablePasses: [],
      unlockedPassIds: [],
      selectedPassIds: [],
      isLoaded: true,
    },
  },

  // Game state with Hall Pass bonuses
  withHallPassBonus: {
    hallPass: {
      availablePasses: [
        {
          id: 'senior_executive',
          name: 'Senior Executive',
          description: 'You run this school\'s candy economy.',
          unlockRequirement: 'Win the game 5 times',
          effects: [
            {
              type: 'sale_price_bonus',
              value: 15,
              description: '+15% to all candy sale prices',
            },
            {
              type: 'inventory_bonus',
              value: 10,
              description: '+10 inventory slots',
            },
          ],
          rarity: 'epic',
          isUnlocked: true,
        },
      ],
      unlockedPassIds: ['senior_executive'],
      selectedPassIds: [], // Start with nothing selected for selection tests
      isLoaded: true,
    },
  },

  // Game state with active jokers
  withJokers: {
    joker: {
      jokers: [
        {
          id: '1001',
          name: 'Sugar Rush',
          tier: 'rare',
          effect: { target: 'sale_price', operation: 'multiply', amount: 1.2 },
        },
        {
          id: '1002',
          name: 'Bulk Buyer',
          tier: 'common',
          effect: { target: 'inventory', operation: 'add', amount: 5 },
        },
      ],
      jokersOwned: [
        {
          id: '1001',
          name: 'Sugar Rush',
          tier: 'rare',
          effect: { target: 'sale_price', operation: 'multiply', amount: 1.2 },
        },
        {
          id: '1002',
          name: 'Bulk Buyer',
          tier: 'common',
          effect: { target: 'inventory', operation: 'add', amount: 5 },
        },
      ],
      allJokers: [],
      lockedJokerIds: [],
      activeEffects: [
        {
          jokerId: '1001',
          effect: { target: 'sale_price', operation: 'multiply', amount: 1.2, duration: 'persistent' },
        },
        {
          jokerId: '1002',
          effect: { target: 'inventory', operation: 'add', amount: 5, duration: 'persistent' },
        },
      ],
      computedEffects: {
        inventoryLimit: 35, // 30 + 5 from joker
        hintChance: 0,
        studyTimeMultiplier: 1,
        droughtReliefBonus: 0,
        emptyInventoryBonus: 0,
      },
    },
  },

  // Game state for testing minigame tracking
  withMinigameProgress: {
    minigameTracking: {
      playedMinigames: ['math', 'computer', 'art', 'history'],
      minigameCompletions: {
        math: 3,
        computer: 2,
        art: 1,
        history: 1,
        economy: 0,
        'home-ec': 0,
        logic: 0,
        gym: 0,
        recess: 0,
      },
      isLoaded: true,
    },
  },

  // Game state with all minigames completed
  allMinigamesCompleted: {
    minigameTracking: {
      playedMinigames: ['math', 'computer', 'art', 'history', 'economy', 'home-ec', 'logic', 'gym', 'recess'],
      minigameCompletions: {
        math: 1,
        computer: 1,
        art: 1,
        history: 1,
        economy: 1,
        'home-ec': 1,
        logic: 1,
        gym: 1,
        recess: 1,
      },
      isLoaded: true,
    },
  },

  // High difficulty game with lots of candy sold
  highDifficulty: {
    game: {
      periodCount: 5,
      day: 5,
    },
    wallet: {
      balance: 5000,
      difficultyLevel: 6,
      stashedAmount: 200,
    },
    candySales: {
      sales: [],
      totalRevenue: 8000,
      totalCandiesSold: 350,
    },
  },
};

/**
 * Helper to merge test states for complex scenarios
 */
export const mergeTestStates = (...states: any[]) => {
  return states.reduce((acc, state) => ({
    ...acc,
    ...state,
  }), {});
};

// Basic test to ensure utilities work
describe('Test Store Utilities', () => {
  it('should create a mock store', () => {
    const store = createMockStore();
    expect(store).toBeDefined();
    expect(typeof store.getState).toBe('function');
    expect(typeof store.dispatch).toBe('function');
  });

  it('should merge test states correctly', () => {
    const state1 = { a: 1, b: 2 };
    const state2 = { b: 3, c: 4 };
    const merged = mergeTestStates(state1, state2);

    expect(merged).toEqual({ a: 1, b: 3, c: 4 });
  });
});