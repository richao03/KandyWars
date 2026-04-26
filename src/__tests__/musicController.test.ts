/**
 * Tests for MusicController.duck() and MusicController.restore() helpers.
 *
 * expo-audio is globally mocked in jest.setup.js, but that mock does not
 * include a `volume` property setter. We override it here per-file so we can
 * track volume assignments made via `player.volume = ...`.
 *
 * Strategy:
 *  - jest.mock('expo-audio') with a factory that returns a player mock whose
 *    `volume` is a trackable property (using Object.defineProperty + spy).
 *  - jest.useFakeTimers() so we can advance setInterval ticks deterministically.
 *  - Import MusicController AFTER mocks are set up.
 *  - Call setTrack() first so the internal player singleton is created.
 */

jest.mock('expo-audio', () => {
  const volumeAssignments: number[] = [];

  const playerMock = {
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    replace: jest.fn(),
    loop: false,
    _volumeAssignments: volumeAssignments,
    _volume: 0.5,
  };

  Object.defineProperty(playerMock, 'volume', {
    get() {
      return this._volume;
    },
    set(v: number) {
      this._volume = v;
      volumeAssignments.push(v);
    },
    configurable: true,
  });

  return {
    createAudioPlayer: jest.fn(() => playerMock),
    PermissionStatus: { GRANTED: 'granted' },
    __playerMock: playerMock,
    __volumeAssignments: volumeAssignments,
  };
});

// Also mock audioConfig so ensurePlayer doesn't throw
jest.mock('../utils/audioConfig', () => ({
  initializeAudioMode: jest.fn().mockResolvedValue(undefined),
}));

// Silence asset requires for music files
jest.mock('../../assets/music/menu.wav', () => 'menu.wav', { virtual: true });
jest.mock('../../assets/music/day1.wav', () => 'day1.wav', { virtual: true });
jest.mock('../../assets/music/day2.wav', () => 'day2.wav', { virtual: true });
jest.mock('../../assets/music/day3.wav', () => 'day3.wav', { virtual: true });
jest.mock('../../assets/music/day4.wav', () => 'day4.wav', { virtual: true });
jest.mock('../../assets/music/day5.wav', () => 'day5.wav', { virtual: true });
jest.mock('../../assets/music/results.wav', () => 'results.wav', { virtual: true });
jest.mock('../../assets/music/victory.wav', () => 'victory.wav', { virtual: true });
jest.mock('../../assets/soundEffects/birds1.m4a', () => 'birds1.m4a', { virtual: true });
jest.mock('../../assets/soundEffects/crickets1.mp3', () => 'crickets1.mp3', { virtual: true });

import * as ExpoAudio from 'expo-audio';
import { MusicController } from '../utils/musicController';

// Typed helper to reach the internal player mock across module boundary
const expoAudioMock = ExpoAudio as unknown as {
  __playerMock: {
    _volume: number;
    _volumeAssignments: number[];
    play: jest.Mock;
  };
  __volumeAssignments: number[];
};

function getAssignments(): number[] {
  return expoAudioMock.__volumeAssignments;
}

function clearAssignments() {
  expoAudioMock.__volumeAssignments.length = 0;
}

function currentPlayerVolume(): number {
  return expoAudioMock.__playerMock._volume;
}

// Force the singleton player to be created by calling setVolume (no async needed).
// setVolume on its own won't create the player because createAudioPlayer is only
// called inside ensurePlayer. Instead, we call the internal setVolume then rely
// on the duck/restore tests to call it once the player exists.
//
// Actually the player is created lazily on the first transitionTo call. We
// expose a helper that calls setTrack once before each describe block.

beforeAll(async () => {
  // Create the internal player by triggering the first transitionTo.
  // We don't await deeply here — we just want createAudioPlayer called.
  await MusicController.setTrack('menu');
});

beforeEach(() => {
  jest.useFakeTimers();
  clearAssignments();
  // Reset volume to a known baseline (0.5) via setVolume
  MusicController.setVolume(0.5);
  clearAssignments(); // ignore the assignment from setVolume above
});

afterEach(() => {
  jest.useRealTimers();
  // Restore after each test so duck state doesn't bleed
  MusicController.restore(0);
});

// ---------------------------------------------------------------------------
// duck()
// ---------------------------------------------------------------------------

describe('duck()', () => {
  test('duck(0.3, 500) — volume decreases and ends at 0.3 after 500ms', () => {
    MusicController.duck(0.3, 500);

    // Advance past full duration (500ms / 50ms tick = 10 ticks)
    jest.advanceTimersByTime(500);

    const assignments = getAssignments();
    expect(assignments.length).toBeGreaterThan(0);

    // Values should be decreasing (from 0.5 toward 0.3)
    for (let i = 1; i < assignments.length; i++) {
      expect(assignments[i]).toBeLessThanOrEqual(assignments[i - 1] + 0.0001);
    }

    // Final value should be at (or very close to) the target
    const last = assignments[assignments.length - 1];
    expect(last).toBeCloseTo(0.3, 5);
  });

  test('duck(0.5, 500) — setVolume called with values ending at 0.5', () => {
    MusicController.setVolume(1.0);
    clearAssignments();

    MusicController.duck(0.5, 500);
    jest.advanceTimersByTime(500);

    const last = getAssignments().slice(-1)[0];
    expect(last).toBeCloseTo(0.5, 5);
  });

  test('interval is cleared on completion (no pending timers after full duration)', () => {
    MusicController.duck(0.2, 200);
    jest.advanceTimersByTime(200);

    // After completion there should be no active fake timers from our duck
    const pending = jest.getTimerCount();
    expect(pending).toBe(0);
  });

  test('duck with duration 0 — sets volume immediately, no interval', () => {
    MusicController.duck(0.1, 0);

    // Should have already set volume without needing timer advancement
    const assignments = getAssignments();
    expect(assignments.length).toBe(1);
    expect(assignments[0]).toBeCloseTo(0.1, 5);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('duck while already ducking — cancels prior tick, re-targets', () => {
    MusicController.duck(0.2, 1000); // long fade
    jest.advanceTimersByTime(200);   // partial progress

    clearAssignments();

    // Second duck call — should cancel first and start new fade toward 0.1
    MusicController.duck(0.1, 400);
    jest.advanceTimersByTime(400);

    const last = getAssignments().slice(-1)[0];
    expect(last).toBeCloseTo(0.1, 5);

    // Only one interval should have been running at completion
    expect(jest.getTimerCount()).toBe(0);
  });

  test('duck clamps targetVolume to 0 when given negative value', () => {
    MusicController.duck(-0.5, 0);
    expect(currentPlayerVolume()).toBeCloseTo(0, 5);
  });

  test('duck clamps targetVolume to 1 when given value > 1', () => {
    MusicController.duck(1.5, 0);
    expect(currentPlayerVolume()).toBeCloseTo(1, 5);
  });
});

// ---------------------------------------------------------------------------
// restore()
// ---------------------------------------------------------------------------

describe('restore()', () => {
  test('restore without prior duck — noop, no volume change', () => {
    // Ensure no duck has happened (restore(0) in afterEach resets state)
    clearAssignments();
    MusicController.restore(500);
    jest.advanceTimersByTime(500);

    expect(getAssignments().length).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('restore(500) after duck — volume returns to original', () => {
    const originalVolume = 0.5;
    MusicController.setVolume(originalVolume);
    clearAssignments();

    MusicController.duck(0.1, 0);    // instant duck to 0.1
    clearAssignments();

    MusicController.restore(500);
    jest.advanceTimersByTime(500);

    const last = getAssignments().slice(-1)[0];
    expect(last).toBeCloseTo(originalVolume, 5);
  });

  test('restore interval is cleared on completion', () => {
    MusicController.duck(0.1, 0);
    MusicController.restore(300);
    jest.advanceTimersByTime(300);

    expect(jest.getTimerCount()).toBe(0);
  });

  test('restore with duration 0 — sets volume immediately, no interval', () => {
    MusicController.setVolume(0.8);
    clearAssignments();

    MusicController.duck(0.2, 0);
    clearAssignments();

    MusicController.restore(0);

    const assignments = getAssignments();
    expect(assignments.length).toBe(1);
    expect(assignments[0]).toBeCloseTo(0.8, 5);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('restore after duck cancels any in-progress duck interval', () => {
    MusicController.setVolume(0.6);
    clearAssignments();

    MusicController.duck(0.1, 2000); // long duck, won't finish
    jest.advanceTimersByTime(100);   // partial progress

    clearAssignments();

    MusicController.restore(300);
    jest.advanceTimersByTime(300);

    // Should have restored toward 0.6, not continued ducking toward 0.1
    const last = getAssignments().slice(-1)[0];
    expect(last).toBeCloseTo(0.6, 5);
    expect(jest.getTimerCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Duck / restore cycle integrity
// ---------------------------------------------------------------------------

describe('duck/restore cycle', () => {
  test('originalVolume remembered across duck, not reset mid-cycle', () => {
    MusicController.setVolume(0.7);
    clearAssignments();

    MusicController.duck(0.3, 0);   // first duck
    MusicController.duck(0.1, 0);   // second duck (re-targets, originalVolume stays 0.7)
    clearAssignments();

    MusicController.restore(0);
    expect(getAssignments()[0]).toBeCloseTo(0.7, 5);
  });

  test('after restore completes, a new duck starts a fresh cycle', () => {
    MusicController.setVolume(0.5);
    MusicController.duck(0.1, 0);
    MusicController.restore(0);       // cycle complete, originalVolume = null

    // Now start a fresh cycle from the restored volume
    MusicController.setVolume(0.9);
    clearAssignments();
    MusicController.duck(0.4, 0);
    MusicController.restore(0);

    expect(getAssignments().slice(-1)[0]).toBeCloseTo(0.9, 5);
  });
});
