import { configureStore } from '@reduxjs/toolkit';
import { DeepPartial } from '@reduxjs/toolkit';
import gameReducer from '../../store/slices/gameSlice';
import jokerReducer from '../../store/slices/jokerSlice';
import walletReducer from '../../store/slices/walletSlice';
import inventoryReducer from '../../store/slices/inventorySlice';
import eventHandlerReducer from '../../store/slices/eventHandlerSlice';
import hallPassReducer from '../../store/slices/hallPassSlice';
import merchantReducer from '../../store/slices/merchantSlice';
import { setCurrentEvent } from '../../store/slices/eventHandlerSlice';
import { incrementPeriod, jumpToPeriod } from '../../store/slices/gameSlice';
import { addJoker } from '../../store/slices/jokerSlice';
import { selectHallPass } from '../../store/slices/hallPassSlice';
import {
  purchaseLeveledItem,
  purchaseConsumableItem,
  MerchantItemType,
} from '../../store/slices/merchantSlice';
import { RootState } from '../../store/store';
import { JokerService } from '../../utils/jokerService';

/**
 * Event data structure for mocking game events
 */
export interface EventData {
  type: string;
  payload?: any;
  timestamp?: number;
}

/**
 * Configuration for creating a store with game effects
 */
export interface StoreEffectsConfig {
  jokers?: any[];
  hallPasses?: string[]; // IDs of passes to select
  merchantItems?: Array<{
    itemId: MerchantItemType;
    level?: number;
    count?: number;
  }>;
  period?: number;
  money?: number;
  inventory?: any[];
}

/**
 * Price breakdown returned by JokerService
 */
export interface PriceBreakdown {
  basePrice: number;
  jokerEffects: Array<{
    jokerName: string;
    jokerEmoji: string;
    effect: string;
    amount: number;
    effectType: 'buy' | 'sell';
    isActive: boolean;
  }>;
  finalPrice: number;
}

/**
 * Period Mocker - Utilities for mocking game period/time progression
 */
export class PeriodMocker {
  private store: any;

  constructor(store: any) {
    this.store = store;
  }

  /**
   * Set period to a specific value (0-39 for 5 days)
   */
  setPeriod(period: number): void {
    this.store.dispatch(jumpToPeriod(period));
  }

  /**
   * Advance to the next period
   */
  advancePeriod(location: string = 'hallway'): void {
    this.store.dispatch(incrementPeriod(location));
  }

  /**
   * Jump to a specific day and period
   * @param day - Day number (1-5)
   * @param periodInDay - Period within day (1-8), defaults to 1
   */
  jumpToDay(day: number, periodInDay: number = 1): void {
    const period = (day - 1) * 8 + (periodInDay - 1);
    this.setPeriod(period);
  }

  /**
   * Check if current period is morning (periods 1-3)
   */
  isMorning(): boolean {
    const periodCount = this.store.getState().game.periodCount;
    const periodWithinDay = (periodCount % 8) + 1;
    return periodWithinDay <= 3;
  }

  /**
   * Check if current period is afternoon (periods 4-8)
   */
  isAfternoon(): boolean {
    return !this.isMorning();
  }

  /**
   * Check if current period number is even (displayed as 2, 4, 6, 8)
   */
  isEvenPeriod(): boolean {
    const periodCount = this.store.getState().game.periodCount;
    const displayedPeriod = periodCount + 1; // Internal is 0-indexed, displayed is 1-indexed
    return displayedPeriod % 2 === 0;
  }

  /**
   * Check if current period number is odd (displayed as 1, 3, 5, 7)
   */
  isOddPeriod(): boolean {
    return !this.isEvenPeriod();
  }

  /**
   * Get current period within the day (1-8)
   */
  getPeriodWithinDay(): number {
    const periodCount = this.store.getState().game.periodCount;
    return (periodCount % 8) + 1;
  }

  /**
   * Get current day (1-5)
   */
  getCurrentDay(): number {
    const periodCount = this.store.getState().game.periodCount;
    return Math.floor(periodCount / 8) + 1;
  }

  /**
   * Get the raw period count (0-indexed)
   */
  getPeriodCount(): number {
    return this.store.getState().game.periodCount;
  }
}

/**
 * Event Mocker - Utilities for mocking game events
 */
export class EventMocker {
  private store: any;

  constructor(store: any) {
    this.store = store;
  }

  /**
   * Create a generic event
   */
  createEvent(type: string, payload?: any): EventData {
    return {
      type,
      payload,
      timestamp: Date.now(),
    };
  }

  /**
   * Create a "find money" event
   */
  createFindMoneyEvent(amount: number): EventData {
    return this.createEvent('FIND_MONEY', {
      effect: 'find_money',
      title: 'Found Money',
      description: `You found $${amount}!`,
      amount,
    });
  }

  /**
   * Create a confiscation event
   */
  createConfiscationEvent(percentage: number = 100): EventData {
    return this.createEvent('CONFISCATION', {
      effect: 'confiscation',
      title: 'Stash Confiscated',
      description: `${percentage}% of your candy was confiscated!`,
      percentage,
    });
  }

  /**
   * Create a bully event (money stolen)
   */
  createBullyEvent(amount: number): EventData {
    return this.createEvent('BULLY', {
      effect: 'money_loss',
      title: 'Bullied',
      description: `A bully stole $${amount} from you!`,
      amount,
    });
  }

  /**
   * Create a hall monitor event (busted)
   */
  createHallMonitorEvent(): EventData {
    return this.createEvent('HALL_MONITOR', {
      effect: 'busted',
      title: 'Busted by Hall Monitor',
      description: 'The hall monitor caught you!',
    });
  }

  /**
   * Create a positive market event (price increase)
   */
  createMarketBoostEvent(candyType: string, percentIncrease: number): EventData {
    return this.createEvent('MARKET_BOOST', {
      effect: 'price_increase',
      title: `${candyType} Surge`,
      description: `${candyType} prices increased by ${percentIncrease}%!`,
      candyType,
      percentIncrease,
    });
  }

  /**
   * Create a negative market event (price decrease)
   */
  createMarketCrashEvent(
    candyType: string,
    percentDecrease: number
  ): EventData {
    return this.createEvent('MARKET_CRASH', {
      effect: 'price_decrease',
      title: `${candyType} Crash`,
      description: `${candyType} prices decreased by ${percentDecrease}%!`,
      candyType,
      percentDecrease,
    });
  }

  /**
   * Trigger an event in the store
   */
  triggerEvent(event: EventData): void {
    this.store.dispatch(setCurrentEvent(event));
  }

  /**
   * Clear the current event
   */
  clearEvent(): void {
    this.store.dispatch(setCurrentEvent(null));
  }

  /**
   * Get event history
   */
  getEventHistory(): EventData[] {
    return this.store.getState().eventHandler.eventHistory;
  }

  /**
   * Get current active event
   */
  getCurrentEvent(): EventData | null {
    return this.store.getState().eventHandler.currentEvent;
  }
}

/**
 * Create a mock store with jokers, hall passes, and merchant items pre-configured
 */
export const createStoreWithEffects = (config: StoreEffectsConfig) => {
  const {
    jokers = [],
    hallPasses = [],
    merchantItems = [],
    period = 0,
    money = 1000,
    inventory = [],
  } = config;

  const store = configureStore({
    reducer: {
      game: gameReducer,
      joker: jokerReducer,
      wallet: walletReducer,
      inventory: inventoryReducer,
      eventHandler: eventHandlerReducer,
      hallPass: hallPassReducer,
      merchant: merchantReducer,
    },
    preloadedState: {
      game: {
        periodCount: period,
        currentLocation: 'hallway',
        locationHistory: [{ period, location: 'hallway' }],
        hasStudiedTonight: false,
        isMorning: period % 8 < 3,
        isEndOfDay: false,
        isSchoolDay: true,
        isAfterSchool: false,
        isWeekend: false,
        periodEvents: {},
        tutorialCompleted: true,
        hasPlayedLunchMinigame: false,
        didNotStudyLastNight: false,
        day: Math.floor(period / 8) + 1,
      },
      wallet: {
        balance: money,
        difficultyLevel: 1,
        stashedAmount: 0,
        initialBalance: 50,
        totalSpent: 0,
        totalEarned: 0,
        lifetimeSpent: 0,
        lifetimeEarned: 0,
      },
      inventory: {
        items: inventory,
        maxItems: 20,
      },
    } as any,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }),
  });

  // Add jokers
  jokers.forEach((joker) => {
    store.dispatch(addJoker(joker));
  });

  // Select hall passes
  hallPasses.forEach((passId) => {
    store.dispatch(selectHallPass(passId));
  });

  // Add merchant items
  merchantItems.forEach(({ itemId, level, count }) => {
    if (level !== undefined) {
      // Leveled item - purchase up to the specified level
      for (let i = 0; i < level; i++) {
        store.dispatch(purchaseLeveledItem({ itemId }));
      }
    } else if (count !== undefined) {
      // Consumable item - purchase the specified count
      for (let i = 0; i < count; i++) {
        store.dispatch(purchaseConsumableItem({ itemId }));
      }
    }
  });

  return store;
};

/**
 * Calculate expected price with all effects applied
 * Uses the JokerService to compute the final price
 */
export const calculateExpectedPrice = (
  basePrice: number,
  config: {
    jokers?: any[];
    hallPasses?: any[];
    merchantItems?: any[];
    period: number;
    inventoryLimit?: number;
    activeEffects?: any[];
    consecutivePeriodSales?: number;
    totalSales?: number;
  }
): number => {
  const jokerService = JokerService.getInstance();
  const {
    jokers = [],
    period,
    inventoryLimit = 20,
    activeEffects = [],
    consecutivePeriodSales = 0,
    totalSales = 0,
  } = config;

  const breakdown = jokerService.getPriceBreakdown(
    basePrice,
    jokers,
    period,
    inventoryLimit,
    activeEffects,
    consecutivePeriodSales,
    totalSales
  );

  return breakdown.finalPrice;
};

/**
 * Get detailed price breakdown for testing
 */
export const getPriceBreakdown = (
  basePrice: number,
  config: {
    jokers?: any[];
    period: number;
    inventoryLimit?: number;
    activeEffects?: any[];
    consecutivePeriodSales?: number;
    totalSales?: number;
  }
): PriceBreakdown => {
  const jokerService = JokerService.getInstance();
  const {
    jokers = [],
    period,
    inventoryLimit = 20,
    activeEffects = [],
    consecutivePeriodSales = 0,
    totalSales = 0,
  } = config;

  return jokerService.getPriceBreakdown(
    basePrice,
    jokers,
    period,
    inventoryLimit,
    activeEffects,
    consecutivePeriodSales,
    totalSales
  );
};

/**
 * Verify that a price breakdown contains expected effects
 */
export const verifyPriceBreakdown = (
  breakdown: PriceBreakdown,
  expectedEffects: Array<{ jokerName: string; amount?: number; isActive?: boolean }>
): boolean => {
  for (const expected of expectedEffects) {
    const effect = breakdown.jokerEffects.find(
      (e) => e.jokerName === expected.jokerName
    );

    if (!effect) {
      console.error(`Expected effect "${expected.jokerName}" not found in breakdown`);
      return false;
    }

    if (expected.amount !== undefined && Math.abs(effect.amount - expected.amount) > 0.01) {
      console.error(
        `Effect "${expected.jokerName}" amount mismatch: expected ${expected.amount}, got ${effect.amount}`
      );
      return false;
    }

    if (expected.isActive !== undefined && effect.isActive !== expected.isActive) {
      console.error(
        `Effect "${expected.jokerName}" isActive mismatch: expected ${expected.isActive}, got ${effect.isActive}`
      );
      return false;
    }
  }

  return true;
};

/**
 * Helper to create a mock joker for testing
 */
export const createMockJoker = (
  id: number | string,
  name: string,
  type: 'one-time' | 'persistent' = 'persistent'
) => {
  return {
    id: typeof id === 'number' ? id.toString() : id,
    name,
    type,
    tier: 'common',
    subject: 'Test',
  };
};

/**
 * Helper to assert that two numbers are approximately equal (within 0.01)
 */
export const assertApproximatelyEqual = (
  actual: number,
  expected: number,
  message?: string
): void => {
  if (Math.abs(actual - expected) > 0.01) {
    throw new Error(
      `${message || 'Values not approximately equal'}: expected ${expected}, got ${actual}`
    );
  }
};
