import { configureStore } from '@reduxjs/toolkit';
import shopkeeperReducer, {
  initializeDeliVisit,
  acceptNightlyQuest,
  rerollNightlyQuest,
  selectNightlyQuest,
  selectNightlyQuestAccepted,
  selectLastQuestRerollDay,
  NIGHTLY_QUEST_REROLL_COST,
} from '../../store/slices/shopkeeperSlice';

const makeStore = () =>
  configureStore({
    reducer: { shopkeeper: shopkeeperReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }),
  });

const seedQuest = (store: ReturnType<typeof makeStore>, day: number) => {
  store.dispatch(
    initializeDeliVisit({ seed: 'test-seed', day, ownedMaxLevelJokerIds: [] })
  );
};

describe('shopkeeperSlice — nightly quest accept + reroll', () => {
  it('NIGHTLY_QUEST_REROLL_COST is the documented $500 the player pays', () => {
    expect(NIGHTLY_QUEST_REROLL_COST).toBe(500);
  });

  it('acceptNightlyQuest flips the accepted flag', () => {
    const store = makeStore();
    seedQuest(store, 2);
    expect(selectNightlyQuestAccepted(store.getState())).toBe(false);

    store.dispatch(acceptNightlyQuest());
    expect(selectNightlyQuestAccepted(store.getState())).toBe(true);
  });

  it('acceptNightlyQuest is idempotent', () => {
    const store = makeStore();
    seedQuest(store, 2);
    store.dispatch(acceptNightlyQuest());
    store.dispatch(acceptNightlyQuest());
    expect(selectNightlyQuestAccepted(store.getState())).toBe(true);
  });

  it('rerollNightlyQuest no-ops when the quest is already accepted', () => {
    const store = makeStore();
    seedQuest(store, 2);
    const before = selectNightlyQuest(store.getState());
    store.dispatch(acceptNightlyQuest());
    store.dispatch(rerollNightlyQuest({ seed: 'reroll-seed', day: 2 }));
    const after = selectNightlyQuest(store.getState());
    expect(after?.id).toBe(before?.id);
    expect(selectLastQuestRerollDay(store.getState())).toBe(0);
  });

  it('rerollNightlyQuest no-ops when same-day reroll already used', () => {
    const store = makeStore();
    seedQuest(store, 2);
    store.dispatch(rerollNightlyQuest({ seed: 'first-reroll', day: 2 }));
    const afterFirst = selectNightlyQuest(store.getState());
    expect(selectLastQuestRerollDay(store.getState())).toBe(2);

    // second reroll same day — should be a no-op
    store.dispatch(rerollNightlyQuest({ seed: 'second-reroll', day: 2 }));
    expect(selectNightlyQuest(store.getState())?.id).toBe(afterFirst?.id);
  });

  it('successful reroll generates a different quest and stamps lastQuestRerollDay', () => {
    const store = makeStore();
    seedQuest(store, 2);
    const before = selectNightlyQuest(store.getState());
    expect(before).not.toBeNull();

    // Use a different seed to force the generator to produce a different id;
    // generator seeds on `${seed}-nquest-${day}`. Even with the same seed,
    // the slice's reroll path puts the prior quest's id in completedIds so
    // the generator routes through its de-dupe fallback.
    store.dispatch(rerollNightlyQuest({ seed: 'fresh-reroll-seed', day: 2 }));
    const after = selectNightlyQuest(store.getState());
    expect(after).not.toBeNull();
    expect(after?.id).not.toBe(before?.id);
    expect(selectLastQuestRerollDay(store.getState())).toBe(2);
  });

  it('reroll re-enables on a new day', () => {
    const store = makeStore();
    seedQuest(store, 2);
    store.dispatch(rerollNightlyQuest({ seed: 'a', day: 2 }));
    expect(selectLastQuestRerollDay(store.getState())).toBe(2);

    // Day advances — last reroll was on day 2, now we're on day 3
    store.dispatch(rerollNightlyQuest({ seed: 'b', day: 3 }));
    expect(selectLastQuestRerollDay(store.getState())).toBe(3);
  });
});
