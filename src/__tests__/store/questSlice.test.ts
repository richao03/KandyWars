import { configureStore } from '@reduxjs/toolkit';
import questReducer, {
  generateQuest,
  completeQuest,
  selectActiveQuest,
  selectCompletedQuestIds,
} from '../../store/slices/questSlice';
import { CANDY_REGISTRY, getCandiesBySize } from '../../constants/candyRegistry';

const SMALL_CANDIES = getCandiesBySize('small').map((c) => c.name);
const NON_SMALL_CANDIES = CANDY_REGISTRY.filter((c) => c.size !== 'small').map((c) => c.name);

const makeStore = () =>
  configureStore({
    reducer: { quest: questReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }),
  });

describe('questSlice', () => {
  describe('generateQuest fallback when unlockedCandies is empty/undefined', () => {
    // Try a wide span of seeds — small candy fallback must hold for every one of them.
    const seeds = Array.from({ length: 50 }, (_, i) => `seed-${i}`);

    it.each(seeds)('omitting unlockedCandies picks only small candies (seed=%s)', (seed) => {
      const store = makeStore();
      store.dispatch(generateQuest({ seed, day: 2 }));
      const quest = selectActiveQuest(store.getState() as any);
      expect(quest).not.toBeNull();
      expect(SMALL_CANDIES).toContain(quest!.candyName);
      expect(NON_SMALL_CANDIES).not.toContain(quest!.candyName);
    });

    it.each(seeds)('empty unlockedCandies array picks only small candies (seed=%s)', (seed) => {
      const store = makeStore();
      store.dispatch(generateQuest({ seed, day: 2, unlockedCandies: [] }));
      const quest = selectActiveQuest(store.getState() as any);
      expect(quest).not.toBeNull();
      expect(SMALL_CANDIES).toContain(quest!.candyName);
    });

    it('Sour Straws is never picked when unlockedCandies is empty', () => {
      // Specific regression: the bug the user reported.
      for (let i = 0; i < 200; i++) {
        const store = makeStore();
        store.dispatch(generateQuest({ seed: `regression-${i}`, day: 2 }));
        const quest = selectActiveQuest(store.getState() as any);
        expect(quest!.candyName).not.toBe('Sour Straws');
      }
    });
  });

  describe('generateQuest respects supplied unlockedCandies', () => {
    it('always picks the only allowed candy when list is a singleton', () => {
      for (let i = 0; i < 20; i++) {
        const store = makeStore();
        store.dispatch(
          generateQuest({ seed: `single-${i}`, day: 2, unlockedCandies: ['Gummy Bears'] })
        );
        expect(selectActiveQuest(store.getState() as any)!.candyName).toBe('Gummy Bears');
      }
    });

    it('only generates on day 2 or day 4', () => {
      const store = makeStore();
      [1, 3, 5, 6].forEach((day) => {
        store.dispatch(generateQuest({ seed: 'x', day, unlockedCandies: ['Gummy Bears'] }));
        expect(selectActiveQuest(store.getState() as any)).toBeNull();
      });
      store.dispatch(generateQuest({ seed: 'x', day: 2, unlockedCandies: ['Gummy Bears'] }));
      expect(selectActiveQuest(store.getState() as any)).not.toBeNull();
    });
  });

  describe('completeQuest clears activeQuest', () => {
    it('nulls activeQuest and pushes id to completedQuestIds', () => {
      const store = makeStore();
      store.dispatch(generateQuest({ seed: 'a', day: 2, unlockedCandies: ['Gummy Bears'] }));
      const before = selectActiveQuest(store.getState() as any);
      expect(before).not.toBeNull();

      store.dispatch(completeQuest());

      expect(selectActiveQuest(store.getState() as any)).toBeNull();
      expect(selectCompletedQuestIds(store.getState() as any)).toContain(before!.id);
    });

    it('a completed Day 2 quest does not block Day 4 quest generation', () => {
      const store = makeStore();
      store.dispatch(generateQuest({ seed: 'a', day: 2, unlockedCandies: ['Gummy Bears'] }));
      store.dispatch(completeQuest());

      // Use a different seed so the day-4 quest id differs from the completed one.
      store.dispatch(generateQuest({ seed: 'b', day: 4, unlockedCandies: ['Gummy Bears'] }));
      const day4Quest = selectActiveQuest(store.getState() as any);
      expect(day4Quest).not.toBeNull();
      expect(day4Quest!.day).toBe(4);
    });
  });
});
