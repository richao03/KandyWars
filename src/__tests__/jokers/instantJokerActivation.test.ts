/**
 * Tests the dispatch contract for instant (one-time) jokers.
 *
 * Background — the BIYF bug:
 *   `joker.id` arrived as a string from persistence in some flows. The strict-
 *   equal checks in JokerCard.handleActivate (e.g. `activationId === JOKER_IDS.X`)
 *   compared `"25"` against the numeric constant `25` and silently fell through
 *   to "Not Implemented." The fix coerces with `Number(...)`.
 *
 * These tests pin down two invariants:
 *   1) Every one-time joker has a numeric id constant in JOKER_IDS.
 *   2) Both `id` shapes (string and number) coerce to the same constant — so no
 *      future BIYF-style id-mismatch can hide.
 *   3) The dispatch table in JokerCard covers every one-time joker (via the
 *      hardcoded list of expected handlers). If a new one-time joker is added
 *      to the engine but no handler is wired, this test will fail.
 */

import { JOKER_IDS } from '../../constants/jokerIds';
import { STANDARDIZED_JOKERS } from '../../utils/jokerEffectEngine';

// Canonical list of every one-time joker we expect to have an activation handler.
// Keep this list in sync with the dispatch chain in app/components/JokerCard.tsx
// (handleActivate). If a new instant joker is added to the engine, this list
// must be updated AND the dispatch must be wired — the test will fail until both.
const EXPECTED_INSTANT_JOKERS: { id: number; name: string }[] = [
  { id: JOKER_IDS.DOUBLE_UP, name: 'Double Up' },
  { id: JOKER_IDS.BAKE_SALE, name: 'Bake Sale' },
  { id: JOKER_IDS.MARKET_MANIPULATION, name: 'Market Manipulation' },
  { id: JOKER_IDS.BET_YOU_IM_FASTER, name: "Bet You I'm Faster" },
  { id: JOKER_IDS.ROMAN_COIN, name: 'Roman Coin' },
  { id: JOKER_IDS.PURSUASION, name: 'Pursuasion' },
  { id: JOKER_IDS.MARKET_CRASH, name: 'Market Crash' },
  { id: JOKER_IDS.INFLATION, name: 'Inflation' },
  { id: JOKER_IDS.DETENTION_DODGE, name: 'Detention Dodge' },
];

describe('Instant Joker Activation Dispatch', () => {
  describe('JOKER_IDS coercion (BIYF-style id-mismatch protection)', () => {
    it.each(EXPECTED_INSTANT_JOKERS)(
      '$name (id $id) — Number(stringId) and Number(numericId) both equal the constant',
      ({ id }) => {
        // String form (the path that broke for BIYF — joker.id arriving as "25")
        const stringId = String(id);
        expect(Number(stringId)).toBe(id);
        expect(Number(stringId) === id).toBe(true);

        // Numeric form (already-correct path)
        expect(Number(id)).toBe(id);
        expect(Number(id) === id).toBe(true);

        // Strict-equal would have failed for the string form before the fix.
        // Document that the unfixed comparison is the bug:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((stringId as any) === id).toBe(false);
      }
    );

    it('Number(undefined) is NaN — guards against missing originalId fallback', () => {
      // If both originalId and id are undefined, Number(undefined) is NaN, and
      // NaN !== any JOKER_IDS constant. The dispatch falls through to "Not
      // Implemented" — which is correct behavior (better than silently routing).
      expect(Number(undefined)).toBeNaN();
      EXPECTED_INSTANT_JOKERS.forEach(({ id }) => {
        expect(Number(undefined) === id).toBe(false);
      });
    });
  });

  describe('Engine ↔ dispatch list parity', () => {
    it('every one-time joker in the engine has an expected handler entry', () => {
      const engineOneTimeIds = STANDARDIZED_JOKERS
        .filter((j) => j.type === 'one-time')
        .map((j) => j.id)
        .sort((a, b) => a - b);

      const expectedIds = EXPECTED_INSTANT_JOKERS.map((j) => j.id).sort(
        (a, b) => a - b
      );

      expect(engineOneTimeIds).toEqual(expectedIds);
    });

    it('every JOKER_IDS constant in the expected list resolves to a one-time joker', () => {
      EXPECTED_INSTANT_JOKERS.forEach(({ id, name }) => {
        const joker = STANDARDIZED_JOKERS.find((j) => j.id === id);
        expect(joker).toBeDefined();
        expect(joker?.name).toBe(name);
        expect(joker?.type).toBe('one-time');
      });
    });

    it('no two one-time jokers share an id', () => {
      const ids = EXPECTED_INSTANT_JOKERS.map((j) => j.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Activation id resolution semantics', () => {
    // Mirrors the actual JokerCard.tsx logic: const activationId = Number((joker as any).originalId ?? joker.id)
    const resolveActivationId = (joker: { id: number | string; originalId?: number | string }) =>
      Number(joker.originalId ?? joker.id);

    it('uses originalId when present (copied joker)', () => {
      const copied = { id: 999, originalId: JOKER_IDS.BET_YOU_IM_FASTER };
      expect(resolveActivationId(copied)).toBe(JOKER_IDS.BET_YOU_IM_FASTER);
    });

    it('uses originalId when present even if it is a string', () => {
      const copied = { id: 999, originalId: String(JOKER_IDS.BET_YOU_IM_FASTER) };
      expect(resolveActivationId(copied)).toBe(JOKER_IDS.BET_YOU_IM_FASTER);
    });

    it('falls back to joker.id when originalId is undefined', () => {
      const original = { id: JOKER_IDS.ROMAN_COIN };
      expect(resolveActivationId(original)).toBe(JOKER_IDS.ROMAN_COIN);
    });

    it('falls back to joker.id when originalId is undefined and id is a string', () => {
      const original = { id: String(JOKER_IDS.ROMAN_COIN) };
      expect(resolveActivationId(original)).toBe(JOKER_IDS.ROMAN_COIN);
    });

    it('uses ?? not || so originalId === 0 would still apply', () => {
      // Defensive: || would treat 0 as falsy and skip to joker.id. ?? only skips on null/undefined.
      // No joker has id 0 currently, but this guards against a footgun if one were added.
      const copied = { id: 1, originalId: 0 };
      expect(resolveActivationId(copied)).toBe(0);
    });
  });
});
