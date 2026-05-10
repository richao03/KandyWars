/**
 * Registry-style tests for jokers that previously had no test coverage.
 * Mirrors the pattern in allJokers.test.ts: each test locates the joker by ID
 * and asserts its public-facing definition (name, type, maxLevel, description).
 *
 * These tests do NOT exercise the effect math — that's the job of the targeted
 * effect tests in jokerEffects.test.ts / newJokerEffects.test.ts. The goal here
 * is to detect renames, accidental ID reassignment, or factory removal.
 */

import { STANDARDIZED_JOKERS } from '../../utils/jokerEffectEngine';
import { JOKER_IDS } from '../../constants/jokerIds';

describe('Missing Joker Coverage — registry assertions', () => {
  // Helper: assert basic shape
  const expectJoker = (
    id: number,
    name: string,
    type: 'one-time' | 'persistent',
    maxLevel: number
  ) => {
    const joker = STANDARDIZED_JOKERS.find((j) => j.id === id);
    expect(joker).toBeDefined();
    expect(joker?.name).toBe(name);
    expect(joker?.type).toBe(type);
    expect(joker?.maxLevel).toBe(maxLevel);
    expect(joker?.description).toBeTruthy();
    expect(joker?.flavorText).toBeTruthy();
  };

  describe('Persistent jokers', () => {
    it('Flip Artist (ID 2) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.FLIP_ARTIST, 'Flip Artist', 'persistent', 3);
    });

    it('Tapped In (ID 6) — persistent, 1 level', () => {
      expectJoker(JOKER_IDS.TAPPED_IN, 'Tapped In', 'persistent', 1);
    });

    it('Data Compression (ID 9) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.DATA_COMPRESSION, 'Data Compression', 'persistent', 3);
    });

    it('Farmers Carry (ID 11) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.FARMERS_CARRY, 'Farmers Carry', 'persistent', 3);
    });

    it('Perfect Bake (ID 15) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.PERFECT_BAKE, 'Perfect Bake', 'persistent', 3);
    });

    it('Deposit Bonus (ID 22) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 'persistent', 3);
    });

    it('Ace the Test (ID 31) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.ACE_THE_TEST, 'Ace the Test', 'persistent', 3);
    });

    it('Golden Hour (ID 38) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.GOLDEN_HOUR, 'Golden Hour', 'persistent', 3);
    });

    it('Inductive Reasoning (ID 43) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.INDUCTIVE_REASONING, 'Inductive Reasoning', 'persistent', 3);
    });

    it('Variety Pack (ID 50) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.VARIETY_PACK, 'Variety Pack', 'persistent', 3);
    });

    it('Mysterious Artifact (ID 53) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.MYSTERIOUS_ARTIFACT, 'Mysterious Artifact', 'persistent', 3);
    });

    it('Extra Credit (ID 55) — persistent, 1 level', () => {
      expectJoker(JOKER_IDS.EXTRA_CREDIT, 'Extra Credit', 'persistent', 1);
    });

    it('Sixth Sense (ID 56) — persistent, 1 level', () => {
      expectJoker(JOKER_IDS.SIXTH_SENSE, 'Sixth Sense', 'persistent', 1);
    });

    it('Glass Cannon (ID 59) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.GLASS_CANNON, 'Glass Cannon', 'persistent', 3);
    });

    it('Treasure Chest (ID 66) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.TREASURE_CHEST, 'Treasure Chest', 'persistent', 3);
    });

    it('Penny Pincher (ID 86) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.PENNY_PINCHER, 'Penny Pincher', 'persistent', 3);
    });

    it('Diversifier (ID 90) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.DIVERSIFIER, 'Diversifier', 'persistent', 3);
    });

    it('Patience Pays (ID 92) — persistent, 3 levels', () => {
      expectJoker(JOKER_IDS.PATIENCE_PAYS, 'Patience Pays', 'persistent', 3);
    });

    it('Deep Freeze (ID 94) — persistent, 1 level', () => {
      expectJoker(JOKER_IDS.DEEP_FREEZE, 'Deep Freeze', 'persistent', 1);
    });
  });

  describe('One-time (instant) jokers', () => {
    it('Bake Sale (ID 16) — one-time, 3 levels', () => {
      expectJoker(JOKER_IDS.BAKE_SALE, 'Bake Sale', 'one-time', 3);
    });

    it('Roman Coin (ID 37) — one-time, 3 levels', () => {
      expectJoker(JOKER_IDS.ROMAN_COIN, 'Roman Coin', 'one-time', 3);
    });

    it('Pursuasion (ID 48) — one-time, 3 levels', () => {
      expectJoker(JOKER_IDS.PURSUASION, 'Pursuasion', 'one-time', 3);
    });

    it('Market Crash (ID 75) — one-time, 3 levels', () => {
      expectJoker(JOKER_IDS.MARKET_CRASH, 'Market Crash', 'one-time', 3);
    });

    it('Inflation (ID 76) — one-time, 3 levels', () => {
      expectJoker(JOKER_IDS.INFLATION, 'Inflation', 'one-time', 3);
    });

    it('Detention Dodge (ID 81) — one-time, 1 level', () => {
      expectJoker(JOKER_IDS.DETENTION_DODGE, 'Detention Dodge', 'one-time', 1);
    });
  });

  describe('JOKER_IDS constants point at the right jokers', () => {
    // Catches accidental id reassignment in jokerIds.ts. If any of these fail,
    // the dispatch table in JokerCard.tsx is silently routing to the wrong joker.
    const idAssertions: { key: keyof typeof JOKER_IDS; expectedName: string }[] = [
      { key: 'FLIP_ARTIST', expectedName: 'Flip Artist' },
      { key: 'TAPPED_IN', expectedName: 'Tapped In' },
      { key: 'DATA_COMPRESSION', expectedName: 'Data Compression' },
      { key: 'FARMERS_CARRY', expectedName: 'Farmers Carry' },
      { key: 'PERFECT_BAKE', expectedName: 'Perfect Bake' },
      { key: 'DEPOSIT_BONUS', expectedName: 'Deposit Bonus' },
      { key: 'ACE_THE_TEST', expectedName: 'Ace the Test' },
      { key: 'GOLDEN_HOUR', expectedName: 'Golden Hour' },
      { key: 'INDUCTIVE_REASONING', expectedName: 'Inductive Reasoning' },
      { key: 'VARIETY_PACK', expectedName: 'Variety Pack' },
      { key: 'MYSTERIOUS_ARTIFACT', expectedName: 'Mysterious Artifact' },
      { key: 'EXTRA_CREDIT', expectedName: 'Extra Credit' },
      { key: 'SIXTH_SENSE', expectedName: 'Sixth Sense' },
      { key: 'GLASS_CANNON', expectedName: 'Glass Cannon' },
      { key: 'TREASURE_CHEST', expectedName: 'Treasure Chest' },
      { key: 'PENNY_PINCHER', expectedName: 'Penny Pincher' },
      { key: 'DIVERSIFIER', expectedName: 'Diversifier' },
      { key: 'PATIENCE_PAYS', expectedName: 'Patience Pays' },
      { key: 'DEEP_FREEZE', expectedName: 'Deep Freeze' },
      { key: 'BAKE_SALE', expectedName: 'Bake Sale' },
      { key: 'ROMAN_COIN', expectedName: 'Roman Coin' },
      { key: 'PURSUASION', expectedName: 'Pursuasion' },
      { key: 'MARKET_CRASH', expectedName: 'Market Crash' },
      { key: 'INFLATION', expectedName: 'Inflation' },
      { key: 'DETENTION_DODGE', expectedName: 'Detention Dodge' },
    ];

    idAssertions.forEach(({ key, expectedName }) => {
      it(`JOKER_IDS.${key} resolves to "${expectedName}"`, () => {
        const id = JOKER_IDS[key];
        const joker = STANDARDIZED_JOKERS.find((j) => j.id === id);
        expect(joker?.name).toBe(expectedName);
      });
    });
  });
});
