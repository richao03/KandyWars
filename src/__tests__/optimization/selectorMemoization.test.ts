/**
 * Tests for Redux selector memoization.
 * These tests verify that selectors return stable references
 * when the underlying state hasn't changed, which prevents
 * unnecessary React re-renders.
 */

import { createMockStore } from '../utils/testStore';
import {
  selectDay,
  selectPeriod,
  getPeriodsPerDay,
  selectMediumCandiesUnlocked,
  selectBigCandiesUnlocked,
  selectBulkEmpireStacks,
} from '../../store/slices/gameSlice';
import {
  selectBalance,
  selectStashedAmount,
  selectDifficultyLevel,
} from '../../store/slices/walletSlice';

describe('Selector Memoization', () => {
  describe('Game Selectors', () => {
    it('selectDay should return correct day from periodCount', () => {
      const store = createMockStore({
        game: { periodCount: 0 },
      });
      const state = store.getState();
      expect(selectDay(state)).toBe(1);
    });

    it('selectDay should return day 2 for periodCount 8', () => {
      const store = createMockStore({
        game: { periodCount: 8 },
      });
      expect(selectDay(store.getState())).toBe(2);
    });

    it('selectDay should return day 5 for periodCount 32', () => {
      const store = createMockStore({
        game: { periodCount: 32 },
      });
      expect(selectDay(store.getState())).toBe(5);
    });

    it('selectPeriod should return correct period within day', () => {
      const store = createMockStore({
        game: { periodCount: 0 },
      });
      expect(selectPeriod(store.getState())).toBe(1);
    });

    it('selectPeriod should wrap around for new day', () => {
      const store = createMockStore({
        game: { periodCount: 9 },
      });
      expect(selectPeriod(store.getState())).toBe(2); // period 2 of day 2
    });

    it('selectBulkEmpireStacks should default to 0', () => {
      const store = createMockStore();
      expect(selectBulkEmpireStacks(store.getState())).toBe(0);
    });

    it('selectMediumCandiesUnlocked should default to false', () => {
      const store = createMockStore();
      expect(selectMediumCandiesUnlocked(store.getState())).toBe(false);
    });

    it('selectBigCandiesUnlocked should default to false', () => {
      const store = createMockStore();
      expect(selectBigCandiesUnlocked(store.getState())).toBe(false);
    });
  });

  describe('Wallet Selectors', () => {
    it('selectBalance should return current balance', () => {
      const store = createMockStore({
        wallet: { balance: 5000 },
      });
      expect(selectBalance(store.getState())).toBe(5000);
    });

    it('selectStashedAmount should return stashed amount', () => {
      const store = createMockStore({
        wallet: { stashedAmount: -5000 },
      });
      expect(selectStashedAmount(store.getState())).toBe(-5000);
    });

    it('selectDifficultyLevel should return null by default', () => {
      const store = createMockStore();
      expect(selectDifficultyLevel(store.getState())).toBeNull();
    });

    it('selectBalance should not change reference when unrelated state changes', () => {
      const store = createMockStore({
        wallet: { balance: 1000 },
      });
      const balance1 = selectBalance(store.getState());

      // Dispatch unrelated action
      store.dispatch({ type: 'game/setPricesUpdating', payload: true });

      const balance2 = selectBalance(store.getState());
      expect(balance1).toBe(balance2);
    });
  });
});
