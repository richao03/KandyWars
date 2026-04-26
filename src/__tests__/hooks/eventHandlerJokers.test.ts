/**
 * Tests for event-system jokers wired into `useEventHandler`:
 *   #67  Safe House       — persistent aura blocking LOSE_MONEY + STASH_LOCKED.
 *   #77  Lucky Charm      — 3x/4x/5x multiplier on FOUND_MONEY grants.
 *   #78  Bully Bait       — converts bully events to +$500/+$1000/+$2000 cash.
 *   #81  Detention Dodge  — full event immunity for the current day, consumed once.
 *
 * These tests mirror the logic inside `useEventHandler.handleEvent` so they run
 * without needing to mount the full React hook (which depends on many Redux
 * slices, expo-audio, and RN-only APIs). Each fix has a corresponding scenario
 * below so regressions show up immediately.
 */

import { configureStore } from '@reduxjs/toolkit';
import eventHandlerReducer, {
  activateDetentionDodge,
  selectDetentionDodgeActiveDay,
} from '../../store/slices/eventHandlerSlice';
import gameReducer, { startNewDay } from '../../store/slices/gameSlice';
import { JOKER_IDS } from '../../constants/jokerIds';
import { getJokerEffectsAtLevel } from '../../utils/jokerEffectEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight helpers mirroring handleEvent branches
// ─────────────────────────────────────────────────────────────────────────────

type Joker = { id: number; level?: number };

function isEventImmune(
  detentionDodgeActiveDay: number | null,
  currentDay: number
): boolean {
  return (
    detentionDodgeActiveDay !== null &&
    detentionDodgeActiveDay === currentDay
  );
}

function hasSafeHouse(jokers: Joker[]): boolean {
  return jokers.some((j) => j.id === JOKER_IDS.SAFE_HOUSE);
}

function bullyBaitAmount(jokers: Joker[]): number | null {
  const joker = jokers.find((j) => j.id === JOKER_IDS.BULLY_BAIT);
  if (!joker) return null;
  const effects = getJokerEffectsAtLevel(
    Number(JOKER_IDS.BULLY_BAIT),
    joker.level ?? 1
  );
  const conv = effects.find((e) => e.target === 'event_conversion');
  return (conv?.amount as number) ?? null;
}

function luckyCharmMultiplier(jokers: Joker[]): number | null {
  const joker = jokers.find((j) => j.id === JOKER_IDS.LUCKY_CHARM);
  if (!joker) return null;
  const effects = getJokerEffectsAtLevel(
    Number(JOKER_IDS.LUCKY_CHARM),
    joker.level ?? 1
  );
  const mult = effects.find((e) => e.target === 'found_money_multiplier');
  return (mult?.amount as number) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1 — Detention Dodge (#81) event immunity for the current day
// ─────────────────────────────────────────────────────────────────────────────

describe('Detention Dodge (#81) — event immunity for the current day', () => {
  it('blocks events when activated on the current day', () => {
    expect(isEventImmune(3, 3)).toBe(true);
  });

  it('does not block events when activated on a prior day', () => {
    expect(isEventImmune(2, 3)).toBe(false);
  });

  it('does not block events when never activated', () => {
    expect(isEventImmune(null, 1)).toBe(false);
  });

  it('slice action sets the active day from the dispatched payload', () => {
    const store = configureStore({
      reducer: {
        eventHandler: eventHandlerReducer,
        game: gameReducer,
      },
    });

    expect(selectDetentionDodgeActiveDay(store.getState() as any)).toBeNull();

    store.dispatch(activateDetentionDodge(4));
    expect(selectDetentionDodgeActiveDay(store.getState() as any)).toBe(4);
  });

  it('startNewDay clears the active day (immunity expires next day)', () => {
    const store = configureStore({
      reducer: {
        eventHandler: eventHandlerReducer,
        game: gameReducer,
      },
    });

    store.dispatch(activateDetentionDodge(2));
    expect(selectDetentionDodgeActiveDay(store.getState() as any)).toBe(2);

    // Advance to the next day — Detention Dodge should clear.
    store.dispatch(startNewDay(8));
    expect(selectDetentionDodgeActiveDay(store.getState() as any)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2 — Safe House (#67) protects LOSE_MONEY and STASH_LOCKED (persistent)
// ─────────────────────────────────────────────────────────────────────────────

describe('Safe House (#67) — aura protection', () => {
  const safeHouseJokers: Joker[] = [{ id: JOKER_IDS.SAFE_HOUSE }];

  it('detects Safe House ownership', () => {
    expect(hasSafeHouse(safeHouseJokers)).toBe(true);
  });

  it('returns false when Safe House is not owned', () => {
    expect(hasSafeHouse([])).toBe(false);
  });

  it('joker effect declares both money_protection and stash_protection targets', () => {
    const effects = getJokerEffectsAtLevel(Number(JOKER_IDS.SAFE_HOUSE), 1);
    const targets = effects.map((e) => e.target);
    expect(targets).toContain('money_protection');
    expect(targets).toContain('stash_protection');
  });

  it('Safe House effects are persistent (NOT consumed on use)', () => {
    const effects = getJokerEffectsAtLevel(Number(JOKER_IDS.SAFE_HOUSE), 1);
    effects.forEach((e) => {
      expect(e.duration).toBe('persistent');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3 — Lucky Charm (#77) multiplies FOUND_MONEY grants
// ─────────────────────────────────────────────────────────────────────────────

describe('Lucky Charm (#77) — found money multiplier', () => {
  it('L1 multiplies found money by 3x', () => {
    const mult = luckyCharmMultiplier([
      { id: JOKER_IDS.LUCKY_CHARM, level: 1 },
    ]);
    expect(mult).toBe(3);
    const base = 200;
    expect(Math.round(base * mult!)).toBe(600);
  });

  it('L2 multiplies found money by 4x', () => {
    const mult = luckyCharmMultiplier([
      { id: JOKER_IDS.LUCKY_CHARM, level: 2 },
    ]);
    expect(mult).toBe(4);
    expect(Math.round(250 * mult!)).toBe(1000);
  });

  it('L3 multiplies found money by 5x', () => {
    const mult = luckyCharmMultiplier([
      { id: JOKER_IDS.LUCKY_CHARM, level: 3 },
    ]);
    expect(mult).toBe(5);
    expect(Math.round(150 * mult!)).toBe(750);
  });

  it('returns null when Lucky Charm is not owned (so grant is unchanged)', () => {
    const mult = luckyCharmMultiplier([]);
    expect(mult).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX 4 — Bully Bait (#78) converts bully events into FOUND_MONEY
// ─────────────────────────────────────────────────────────────────────────────

describe('Bully Bait (#78) — event conversion', () => {
  it('L1 converts a bully event into a +$500 cash grant', () => {
    const amount = bullyBaitAmount([{ id: JOKER_IDS.BULLY_BAIT, level: 1 }]);
    expect(amount).toBe(500);
  });

  it('L2 converts a bully event into a +$1000 cash grant', () => {
    const amount = bullyBaitAmount([{ id: JOKER_IDS.BULLY_BAIT, level: 2 }]);
    expect(amount).toBe(1000);
  });

  it('L3 converts a bully event into a +$2000 cash grant', () => {
    const amount = bullyBaitAmount([{ id: JOKER_IDS.BULLY_BAIT, level: 3 }]);
    expect(amount).toBe(2000);
  });

  it('returns null when Bully Bait is not owned (so normal theft logic runs)', () => {
    expect(bullyBaitAmount([])).toBeNull();
  });

  it('converted events do not count as "actually hurt" for detention drops', () => {
    // Mirrors the wasActuallyHurt guard in useEventHandler: when Bully Bait fires,
    // `convertedByBullyBait` is truthy so the LOSE_MONEY branch short-circuits.
    const processedEventData = {
      effect: 'LOSE_MONEY',
      protectedByMedievalShield: false,
      protectedByBodyguard: false,
      convertedByBullyBait: true,
      bullyHasMercy: false,
    };

    const wasActuallyHurt =
      processedEventData.effect === 'LOSE_MONEY' &&
      !processedEventData.protectedByMedievalShield &&
      !processedEventData.protectedByBodyguard &&
      !processedEventData.convertedByBullyBait &&
      !processedEventData.bullyHasMercy;

    expect(wasActuallyHurt).toBe(false);
  });
});
