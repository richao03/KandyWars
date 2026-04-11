import { createMockStore } from '../utils/testStore';
import { createStoreWithEffects, PeriodMocker } from '../utils/testHelpers';
import {
  incrementPeriod,
  jumpToPeriod,
  setPeriodCount,
  selectDay,
  selectPeriod,
  startNewDay,
} from '../../store/slices/gameSlice';

describe('Day Progression Integration Tests', () => {
  describe('Period-to-day mapping (8 periods per day)', () => {
    it('period 0 is day 1, period 1 (within day)', () => {
      const store = createMockStore({
        game: { periodCount: 0 } as any,
      });

      const state = store.getState();
      // selectDay: Math.floor(0 / 8) + 1 = 1
      expect(selectDay(state)).toBe(1);
      // selectPeriod: (0 % 8) + 1 = 1
      expect(selectPeriod(state)).toBe(1);
    });

    it('period 7 is day 1, period 8 (last period of day 1)', () => {
      const store = createMockStore({
        game: { periodCount: 7 } as any,
      });

      const state = store.getState();
      // selectDay: Math.floor(7 / 8) + 1 = 1
      expect(selectDay(state)).toBe(1);
      // selectPeriod: (7 % 8) + 1 = 8
      expect(selectPeriod(state)).toBe(8);
    });

    it('period 8 is day 2, period 1', () => {
      const store = createMockStore({
        game: { periodCount: 8 } as any,
      });

      const state = store.getState();
      // selectDay: Math.floor(8 / 8) + 1 = 2
      expect(selectDay(state)).toBe(2);
      // selectPeriod: (8 % 8) + 1 = 1
      expect(selectPeriod(state)).toBe(1);
    });
  });

  describe('incrementPeriod across day boundaries', () => {
    it('incrementPeriod from period 7 to 8 crosses day boundary', () => {
      const store = createMockStore({
        game: {
          periodCount: 7,
          currentLocation: 'home room',
          locationHistory: [{ period: 7, location: 'home room' }],
        } as any,
      });

      // Before increment: day 1, period 8
      expect(selectDay(store.getState())).toBe(1);
      expect(selectPeriod(store.getState())).toBe(8);

      store.dispatch(incrementPeriod('cafeteria'));

      // After increment: periodCount = 8 → day 2, period 1
      expect(store.getState().game.periodCount).toBe(8);
      expect(selectDay(store.getState())).toBe(2);
      expect(selectPeriod(store.getState())).toBe(1);
    });
  });

  describe('Morning/afternoon detection', () => {
    it('periods 0-2 are morning (period within day 1-3)', () => {
      const store = createStoreWithEffects({ period: 0 });
      const mocker = new PeriodMocker(store);

      // Period 0 → within day = 1
      expect(mocker.isMorning()).toBe(true);

      mocker.setPeriod(1);
      expect(mocker.isMorning()).toBe(true);

      mocker.setPeriod(2);
      expect(mocker.isMorning()).toBe(true);
    });

    it('period 3 is NOT morning (afternoon starts at period 4 within day)', () => {
      const store = createStoreWithEffects({ period: 3 });
      const mocker = new PeriodMocker(store);

      // Period 3 → within day = (3 % 8) + 1 = 4
      expect(mocker.isMorning()).toBe(false);
      expect(mocker.isAfternoon()).toBe(true);
    });
  });

  describe('End of day detection', () => {
    it('last period of a day is period 8 (index 7, 15, 23, etc.)', () => {
      const store = createMockStore({
        game: { periodCount: 7 } as any,
      });

      const periodWithinDay = (store.getState().game.periodCount % 8) + 1;
      expect(periodWithinDay).toBe(8);

      // Period 15 (end of day 2)
      store.dispatch(setPeriodCount(15));
      const periodWithinDay2 = (store.getState().game.periodCount % 8) + 1;
      expect(periodWithinDay2).toBe(8);
    });
  });

  describe('Day 5 calculation', () => {
    it('periodCount 32 is day 5', () => {
      const store = createMockStore({
        game: { periodCount: 32 } as any,
      });

      // selectDay: Math.floor(32 / 8) + 1 = 5
      expect(selectDay(store.getState())).toBe(5);
      // selectPeriod: (32 % 8) + 1 = 1 (first period of day 5)
      expect(selectPeriod(store.getState())).toBe(1);
    });
  });

  describe('Periods per day is 8', () => {
    it('period wraps correctly every 8 periods', () => {
      const store = createMockStore({
        game: { periodCount: 0 } as any,
      });

      // Verify all 8 periods within a day
      for (let i = 0; i < 8; i++) {
        store.dispatch(setPeriodCount(i));
        expect(selectPeriod(store.getState())).toBe(i + 1);
        expect(selectDay(store.getState())).toBe(1);
      }

      // Period 8 wraps to day 2, period 1
      store.dispatch(setPeriodCount(8));
      expect(selectPeriod(store.getState())).toBe(1);
      expect(selectDay(store.getState())).toBe(2);
    });
  });

  describe('jumpToPeriod', () => {
    it('correctly updates periodCount and derived state', () => {
      const store = createMockStore({
        game: {
          periodCount: 0,
          currentLocation: 'home room',
          locationHistory: [
            { period: 0, location: 'home room' },
            { period: 20, location: 'cafeteria' },
          ],
        } as any,
      });

      // Jump to period 20 (day 3, period 5)
      store.dispatch(jumpToPeriod(20));

      expect(store.getState().game.periodCount).toBe(20);
      expect(selectDay(store.getState())).toBe(3);
      expect(selectPeriod(store.getState())).toBe(5);
      // jumpToPeriod also sets location from history if found
      expect(store.getState().game.currentLocation).toBe('cafeteria');
    });
  });
});
