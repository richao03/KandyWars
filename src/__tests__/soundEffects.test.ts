/**
 * Tests for new diegetic sound helpers in soundEffects.ts
 *
 * The module uses expo-audio's createAudioPlayer (mocked in jest.setup.js).
 * We augment the mock locally to expose seekTo, volume, playbackRate, and play
 * so we can assert on playbackRate values.
 */

import { createAudioPlayer } from 'expo-audio';

// ---------------------------------------------------------------------------
// Local mock augmentation — track every player created by the module
// ---------------------------------------------------------------------------

interface MockPlayer {
  play: jest.Mock;
  pause: jest.Mock;
  stop: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
  volume: number;
  playbackRate: number;
}

let mockPlayers: MockPlayer[] = [];

beforeEach(() => {
  mockPlayers = [];

  (createAudioPlayer as jest.Mock).mockImplementation(() => {
    const player: MockPlayer = {
      play: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      seekTo: jest.fn(),
      remove: jest.fn(),
      volume: 1.0,
      playbackRate: 1.0,
    };
    mockPlayers.push(player);
    return player;
  });
});

// ---------------------------------------------------------------------------
// Helper: get all players that had play() called on them after the pool init.
// Pool init creates 10 pop + 7×2 = 24 players total without calling play().
// Our rate helpers call play() on exactly 1 player from the pop pool.
// ---------------------------------------------------------------------------
function playedPlayers(): MockPlayer[] {
  return mockPlayers.filter((p) => p.play.mock.calls.length > 0);
}

// We import lazily via jest.isolateModules to get a fresh module state.
function freshModule() {
  let mod: typeof import('../utils/soundEffects');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../utils/soundEffects');
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return mod!;
}

// ---------------------------------------------------------------------------
// Smoke tests — each helper exists and is callable without throwing
// ---------------------------------------------------------------------------

describe('soundEffects — new helper smoke tests', () => {
  test('playLeverClick exists and is callable', async () => {
    const { playLeverClick } = freshModule();
    expect(typeof playLeverClick).toBe('function');
    await expect(playLeverClick()).resolves.toBeUndefined();
  });

  test('playJokerChip exists and is callable', async () => {
    const { playJokerChip } = freshModule();
    expect(typeof playJokerChip).toBe('function');
    await expect(playJokerChip(0)).resolves.toBeUndefined();
  });

  test('playJokerMult exists and is callable', async () => {
    const { playJokerMult } = freshModule();
    expect(typeof playJokerMult).toBe('function');
    await expect(playJokerMult(0)).resolves.toBeUndefined();
  });

  test('playCoinCascade exists and is callable', async () => {
    const { playCoinCascade } = freshModule();
    expect(typeof playCoinCascade).toBe('function');
    await expect(playCoinCascade()).resolves.toBeUndefined();
  });

  test('playMoneyTick exists and is callable', async () => {
    const { playMoneyTick } = freshModule();
    expect(typeof playMoneyTick).toBe('function');
    await expect(playMoneyTick(0)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Existing exports still present
// ---------------------------------------------------------------------------

describe('soundEffects — existing exports preserved', () => {
  test('SoundEffects object and its methods exist', () => {
    const { SoundEffects } = freshModule();
    expect(typeof SoundEffects).toBe('object');
    expect(typeof SoundEffects.playRandomPop).toBe('function');
    expect(typeof SoundEffects.playPositiveSound).toBe('function');
    expect(typeof SoundEffects.playAchievementSound).toBe('function');
    expect(typeof SoundEffects.playNegativeSound).toBe('function');
    expect(typeof SoundEffects.playWrongAnswerSound).toBe('function');
    expect(typeof SoundEffects.playCongratsSound).toBe('function');
    expect(typeof SoundEffects.playBirdSound).toBe('function');
    expect(typeof SoundEffects.playCoinSound).toBe('function');
    expect(typeof SoundEffects.setVolume).toBe('function');
    expect(typeof SoundEffects.cleanup).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// playJokerChip rate clamping
// ---------------------------------------------------------------------------

describe('playJokerChip rate clamping', () => {
  test('comboIndex 0 → rate 1.0', async () => {
    const { playJokerChip } = freshModule();
    await playJokerChip(0);
    const played = playedPlayers();
    expect(played).toHaveLength(1);
    expect(played[0].playbackRate).toBeCloseTo(1.0);
  });

  test('comboIndex 5 → rate 1.4 (1.0 + 5*0.08)', async () => {
    const { playJokerChip } = freshModule();
    await playJokerChip(5);
    const played = playedPlayers();
    expect(played).toHaveLength(1);
    // 1.0 + 5*0.08 = 1.4
    expect(played[0].playbackRate).toBeCloseTo(1.4);
  });

  test('large comboIndex clamps to max 1.8', async () => {
    const { playJokerChip } = freshModule();
    await playJokerChip(100);
    const played = playedPlayers();
    expect(played).toHaveLength(1);
    expect(played[0].playbackRate).toBeCloseTo(1.8);
  });
});

// ---------------------------------------------------------------------------
// playJokerMult rate clamping
// ---------------------------------------------------------------------------

describe('playJokerMult rate clamping', () => {
  test('comboIndex 0 → rate 1.1', async () => {
    const { playJokerMult } = freshModule();
    await playJokerMult(0);
    const played = playedPlayers();
    expect(played).toHaveLength(1);
    expect(played[0].playbackRate).toBeCloseTo(1.1);
  });

  test('comboIndex 10 → rate 1.9 (at ceiling)', async () => {
    const { playJokerMult } = freshModule();
    await playJokerMult(10);
    const played = playedPlayers();
    expect(played).toHaveLength(1);
    // 1.1 + 10*0.08 = 1.9
    expect(played[0].playbackRate).toBeCloseTo(1.9);
  });

  test('large comboIndex clamps to max 1.9', async () => {
    const { playJokerMult } = freshModule();
    await playJokerMult(100);
    const played = playedPlayers();
    expect(played).toHaveLength(1);
    expect(played[0].playbackRate).toBeCloseTo(1.9);
  });
});

// ---------------------------------------------------------------------------
// playMoneyTick rate formula: 1.0 + progress * 0.4
// ---------------------------------------------------------------------------

describe('playMoneyTick rate formula', () => {
  test('progress 0 → rate 1.0', async () => {
    const { playMoneyTick } = freshModule();
    await playMoneyTick(0);
    const played = playedPlayers();
    expect(played).toHaveLength(1);
    expect(played[0].playbackRate).toBeCloseTo(1.0);
  });

  test('progress 1 → rate 1.4', async () => {
    const { playMoneyTick } = freshModule();
    await playMoneyTick(1);
    const played = playedPlayers();
    expect(played).toHaveLength(1);
    expect(played[0].playbackRate).toBeCloseTo(1.4);
  });

  test('progress 0.5 → rate 1.2', async () => {
    const { playMoneyTick } = freshModule();
    await playMoneyTick(0.5);
    const played = playedPlayers();
    expect(played).toHaveLength(1);
    expect(played[0].playbackRate).toBeCloseTo(1.2);
  });
});

// ---------------------------------------------------------------------------
// playLeverClick rate
// ---------------------------------------------------------------------------

describe('playLeverClick rate', () => {
  test('uses rate 0.85', async () => {
    const { playLeverClick } = freshModule();
    await playLeverClick();
    const played = playedPlayers();
    expect(played).toHaveLength(1);
    expect(played[0].playbackRate).toBeCloseTo(0.85);
  });
});

// ---------------------------------------------------------------------------
// playCoinCascade — schedules 4 pops with increasing rates
// ---------------------------------------------------------------------------

describe('playCoinCascade', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('schedules 4 pops with increasing rates [1.0, 1.15, 1.3, 1.45]', async () => {
    const { playCoinCascade } = freshModule();

    // Trigger the cascade — fake timers hold the setTimeout callbacks
    await playCoinCascade();

    // Advance past all 4 scheduled pops (0ms, 40ms, 80ms, 120ms)
    // then flush the async microtask queue so _playPopAtRate resolves
    jest.advanceTimersByTime(200);
    // Flush all pending promises/microtasks
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const played = playedPlayers();
    expect(played).toHaveLength(4);
    expect(played[0].playbackRate).toBeCloseTo(1.0);
    expect(played[1].playbackRate).toBeCloseTo(1.15);
    expect(played[2].playbackRate).toBeCloseTo(1.3);
    expect(played[3].playbackRate).toBeCloseTo(1.45);
  });

  test('fires first pop at 0ms offset', async () => {
    const { playCoinCascade } = freshModule();
    await playCoinCascade();

    // Advance 0ms — fires the first setTimeout(fn, 0), then flush async
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    await Promise.resolve();

    const played = playedPlayers();
    expect(played.length).toBeGreaterThanOrEqual(1);
    expect(played[0].playbackRate).toBeCloseTo(1.0);
  });
});
