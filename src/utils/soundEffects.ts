import { createAudioPlayer } from 'expo-audio';
import { initializeAudioMode } from './audioConfig';

/**
 * Sound Effects Manager
 *
 * Manages short sound effects like pops, clicks, etc.
 * Optimized for quick playback with minimal latency.
 * Uses audio pooling - creates players once and reuses them.
 */

const POP_SOUNDS = [
  require('../../assets/soundEffects/pop1.m4a'),
  require('../../assets/soundEffects/pop2.m4a'),
  require('../../assets/soundEffects/pop3.m4a'),
  require('../../assets/soundEffects/pop4.m4a'),
  require('../../assets/soundEffects/pop5.m4a'),
  require('../../assets/soundEffects/pop6.m4a'),
  require('../../assets/soundEffects/pop7.m4a'),
  require('../../assets/soundEffects/pop8.m4a'),
  require('../../assets/soundEffects/pop9.m4a'),
  require('../../assets/soundEffects/pop10.m4a'),
];

const POSITIVE_SOUND = require('../../assets/soundEffects/coinCluster1.wav');
const COIN_SOUND = require('../../assets/soundEffects/coinCluster2.wav');
const NEGATIVE_SOUND = require('../../assets/soundEffects/negative1.mp3');
const WRONG_ANSWER_SOUND = require('../../assets/soundEffects/wrong1.wav');
const ACHIEVEMENT_SOUND = require('../../assets/soundEffects/achievement.wav');
const CONGRATS_SOUND = require('../../assets/soundEffects/congrats1.mp3');
const BIRD_SOUND = require('../../assets/soundEffects/birds1.m4a');
const CASH_REGISTER_SOUND = require('../../assets/soundEffects/cashRegister.mp3');

// Audio pooling - create multiple players per sound for overlapping playback
let audioInitialized = false;

// Pool of 5 pop players (allows up to 5 simultaneous pops)
let popPlayerPool: any[] = [];
let popPlayerIndex = 0;

// Pool of 2 instances for each other sound (allows overlapping playback)
let positivePlayerPool: any[] = [];
let positivePlayerIndex = 0;

let coinPlayerPool: any[] = [];
let coinPlayerIndex = 0;

let negativePlayerPool: any[] = [];
let negativePlayerIndex = 0;

let wrongAnswerPlayerPool: any[] = [];
let wrongAnswerPlayerIndex = 0;

let achievementPlayerPool: any[] = [];
let achievementPlayerIndex = 0;

let congratsPlayerPool: any[] = [];
let congratsPlayerIndex = 0;

let cashRegisterPlayerPool: any[] = [];
let cashRegisterPlayerIndex = 0;

let birdPlayerPool: any[] = [];
let birdPlayerIndex = 0;

/**
 * Initialize all audio players (called lazily on first sound play)
 */
async function initializeAudioPlayers() {
  if (audioInitialized) return;

  try {
    // Ensure audio mode is initialized first (critical for physical devices)
    await initializeAudioMode();

    // Create one player per pop sound file (10 total)
    // This allows up to 10 simultaneous pops (all 10 different sounds playing at once)
    POP_SOUNDS.forEach((sound, index) => {
      const player = createAudioPlayer(sound);
      player.volume = globalSoundVolume;
      popPlayerPool.push(player);
    });

    // Create pool of 2 instances for each other sound
    const SOUND_POOL_SIZE = 2;

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const posPlayer = createAudioPlayer(POSITIVE_SOUND);
      posPlayer.volume = globalSoundVolume;
      positivePlayerPool.push(posPlayer);
    }

    // Coin pool is larger than the default — the joker scoring cascade can
    // fire 5-10 coin plays ~100ms apart, and each play sets a different
    // playbackRate. Too few players means rate writes collide on a still-
    // playing instance, which makes every joker coin sound identical.
    const COIN_POOL_SIZE = 6;
    for (let i = 0; i < COIN_POOL_SIZE; i++) {
      const coinPlayer = createAudioPlayer(COIN_SOUND);
      coinPlayer.volume = globalSoundVolume;
      // expo-audio's `shouldCorrectPitch` flag is named inversely to its
      // effect on iOS: when TRUE (and no pitchCorrectionQuality is passed
      // to setPlaybackRate), the AVPlayer falls through to .varispeed —
      // which DOES NOT preserve pitch (chipmunk effect, what we want).
      // When FALSE, AVPlayer's default .spectral preserves pitch and the
      // cascade ends up sounding identical for every joker.
      try {
        coinPlayer.shouldCorrectPitch = true;
      } catch {
        /* property may not exist in all envs */
      }
      coinPlayerPool.push(coinPlayer);
    }

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const negPlayer = createAudioPlayer(NEGATIVE_SOUND);
      negPlayer.volume = globalSoundVolume;
      negativePlayerPool.push(negPlayer);
    }

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const wrongPlayer = createAudioPlayer(WRONG_ANSWER_SOUND);
      wrongPlayer.volume = globalSoundVolume;
      wrongAnswerPlayerPool.push(wrongPlayer);
    }

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const achPlayer = createAudioPlayer(ACHIEVEMENT_SOUND);
      achPlayer.volume = globalSoundVolume;
      achievementPlayerPool.push(achPlayer);
    }

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const congPlayer = createAudioPlayer(CONGRATS_SOUND);
      congPlayer.volume = globalSoundVolume;
      congratsPlayerPool.push(congPlayer);
    }

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const birdPlayer = createAudioPlayer(BIRD_SOUND);
      birdPlayer.volume = globalSoundVolume;
      birdPlayerPool.push(birdPlayer);
    }

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const crPlayer = createAudioPlayer(CASH_REGISTER_SOUND);
      crPlayer.volume = globalSoundVolume;
      cashRegisterPlayerPool.push(crPlayer);
    }

    audioInitialized = true;
  } catch (error) {
    console.error('🔊 [SoundEffects] ❌ ERROR initializing audio players:', error);
  }
}

/**
 * Cleanup all audio players (call when returning to title screen)
 * Properly destroys all audio resources to prevent memory leaks
 */
async function cleanupAudioPlayers() {
  if (!audioInitialized) {
    return;
  }

  try {
    // Cleanup pop players
    for (const player of popPlayerPool) {
      try {
        await player.pause();
        await player.remove();
      } catch (error) {
        // Ignore individual player cleanup errors
      }
    }

    // Cleanup all other player pools
    const allPools = [
      positivePlayerPool,
      coinPlayerPool,
      negativePlayerPool,
      wrongAnswerPlayerPool,
      achievementPlayerPool,
      congratsPlayerPool,
      birdPlayerPool,
      cashRegisterPlayerPool,
    ];

    for (const pool of allPools) {
      for (const player of pool) {
        try {
          await player.pause();
          await player.remove();
        } catch (error) {
          // Ignore individual player cleanup errors
        }
      }
    }

    // Clear all pools
    popPlayerPool = [];
    positivePlayerPool = [];
    coinPlayerPool = [];
    negativePlayerPool = [];
    wrongAnswerPlayerPool = [];
    achievementPlayerPool = [];
    congratsPlayerPool = [];
    birdPlayerPool = [];
    cashRegisterPlayerPool = [];

    // Reset indices
    popPlayerIndex = 0;
    positivePlayerIndex = 0;
    coinPlayerIndex = 0;
    negativePlayerIndex = 0;
    wrongAnswerPlayerIndex = 0;
    achievementPlayerIndex = 0;
    congratsPlayerIndex = 0;
    birdPlayerIndex = 0;
    cashRegisterPlayerIndex = 0;

    // Reset initialization flag
    audioInitialized = false;
  } catch (error) {
    console.error('🔊 [SoundEffects] ❌ ERROR cleaning up audio players:', error);
  }
}

let globalSoundVolume = 1.0;

export const SoundEffects = {
  /**
   * Set volume for all sound effects (0.0 - 1.0)
   */
  setVolume(volume: number) {
    globalSoundVolume = Math.max(0, Math.min(1, volume));
    // Update all existing players
    const allPools = [
      popPlayerPool, positivePlayerPool, coinPlayerPool,
      negativePlayerPool, wrongAnswerPlayerPool, achievementPlayerPool,
      congratsPlayerPool, birdPlayerPool, cashRegisterPlayerPool,
    ];
    for (const pool of allPools) {
      for (const player of pool) {
        try { player.volume = globalSoundVolume; } catch {}
      }
    }
  },

  /**
   * Play a random pop sound
   */
  async playRandomPop() {
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      // Pick random pop sound player from pool
      const randomIndex = Math.floor(Math.random() * popPlayerPool.length);
      const player = popPlayerPool[randomIndex];

      // Reset to beginning (expo-audio doesn't auto-reset)
      player.seekTo(0);

      // Play immediately
      player.play();

      if (__DEV__) {
        console.log(`🔊 [SoundEffects] Playing pop${randomIndex + 1} (pool index ${randomIndex})`);
      }
    } catch (error) {
      console.error('🔊 [SoundEffects] ❌ ERROR playing pop sound:', error);
    }
  },

  /**
   * Play positive event sound (success, win, correct answer)
   */
  async playPositiveSound() {
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      // Get next player from pool (round-robin)
      const player = positivePlayerPool[positivePlayerIndex];
      positivePlayerIndex = (positivePlayerIndex + 1) % positivePlayerPool.length;

      // Reset and play
      player.seekTo(0);
      player.play();

      if (__DEV__) {
        console.log('🔊 [SoundEffects] Playing positive sound');
      }
    } catch (error) {
      console.error('🔊 [SoundEffects] ❌ ERROR playing positive sound:', error);
    }
  },

  /**
   * Play negative event sound (failure, loss, wrong answer)
   */
  async playNegativeSound() {
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      // Get next player from pool (round-robin)
      const player = negativePlayerPool[negativePlayerIndex];
      negativePlayerIndex = (negativePlayerIndex + 1) % negativePlayerPool.length;

      // Reset and play
      player.seekTo(0);
      player.play();

      if (__DEV__) {
        console.log('🔊 [SoundEffects] Playing negative sound');
      }
    } catch (error) {
      console.error('🔊 [SoundEffects] ❌ ERROR playing negative sound:', error);
    }
  },

  /**
   * Play wrong answer sound (minigame incorrect answers)
   */
  async playWrongAnswerSound() {
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      // Get next player from pool (round-robin)
      const player = wrongAnswerPlayerPool[wrongAnswerPlayerIndex];
      wrongAnswerPlayerIndex = (wrongAnswerPlayerIndex + 1) % wrongAnswerPlayerPool.length;

      // Reset and play
      player.seekTo(0);
      player.play();

      if (__DEV__) {
        console.log('🔊 [SoundEffects] Playing wrong answer sound');
      }
    } catch (error) {
      console.error('🔊 [SoundEffects] ❌ ERROR playing wrong answer sound:', error);
    }
  },

  /**
   * Play achievement sound (joker selection, level complete)
   */
  async playAchievementSound() {
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      // Get next player from pool (round-robin)
      const player = achievementPlayerPool[achievementPlayerIndex];
      achievementPlayerIndex = (achievementPlayerIndex + 1) % achievementPlayerPool.length;

      // Reset and play
      player.seekTo(0);
      player.play();

      if (__DEV__) {
        console.log('🔊 [SoundEffects] Playing achievement sound');
      }
    } catch (error) {
      console.error('🔊 [SoundEffects] ❌ ERROR playing achievement sound:', error);
    }
  },

  /**
   * Play congratulations sound (level complete)
   */
  async playCongratsSound() {
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      // Get next player from pool (round-robin)
      const player = congratsPlayerPool[congratsPlayerIndex];
      congratsPlayerIndex = (congratsPlayerIndex + 1) % congratsPlayerPool.length;

      // Reset and play
      player.seekTo(0);
      player.play();

      if (__DEV__) {
        console.log('🔊 [SoundEffects] Playing congrats sound');
      }
    } catch (error) {
      console.error('🔊 [SoundEffects] ❌ ERROR playing congrats sound:', error);
    }
  },

  /**
   * Play bird sound (morning/going to school)
   */
  async playBirdSound() {
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      // Get next player from pool (round-robin)
      const player = birdPlayerPool[birdPlayerIndex];
      birdPlayerIndex = (birdPlayerIndex + 1) % birdPlayerPool.length;

      // Reset and play
      player.seekTo(0);
      player.play();

      if (__DEV__) {
        console.log('🔊 [SoundEffects] Playing bird sound');
      }
    } catch (error) {
      console.error('🔊 [SoundEffects] ❌ ERROR playing bird sound:', error);
    }
  },

  /**
   * Play coin sound (wallet balance increase)
   */
  async playCoinSound() {
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      // Get next player from pool (round-robin)
      const player = coinPlayerPool[coinPlayerIndex];
      coinPlayerIndex = (coinPlayerIndex + 1) % coinPlayerPool.length;

      // Reset and play
      player.seekTo(0);
      player.play();

      if (__DEV__) {
        console.log('🔊 [SoundEffects] Playing coin sound');
      }
    } catch (error) {
      console.error('🔊 [SoundEffects] ❌ ERROR playing coin sound:', error);
    }
  },

  /**
   * Cleanup all audio players
   * Call this when returning to title screen to free memory
   */
  async cleanup() {
    await cleanupAudioPlayers();
  },
};

// ---------------------------------------------------------------------------
// Cooldown tracker for rate-varied pop helpers
// ---------------------------------------------------------------------------
let _lastPopAtRateTime = 0;
const _POP_AT_RATE_COOLDOWN_MS = 30;

/**
 * Private helper: play the next pop from the pool at a given playbackRate.
 * Enforces a 30ms cooldown between calls (shared with cascade scheduling).
 */
async function _playPopAtRate(rate: number): Promise<void> {
  try {
    if (!audioInitialized) {
      await initializeAudioPlayers();
    }

    const now = Date.now();
    if (now - _lastPopAtRateTime < _POP_AT_RATE_COOLDOWN_MS) {
      // Still within cooldown – skip silently (caller is responsible for timing)
    }
    _lastPopAtRateTime = now;

    // Round-robin from the existing pop pool
    const player = popPlayerPool[popPlayerIndex];
    popPlayerIndex = (popPlayerIndex + 1) % popPlayerPool.length;

    player.seekTo(0);
    // expo-audio AudioPlayer exposes playbackRate as a settable property
    try {
      player.playbackRate = rate;
    } catch {
      // Fallback: property may not exist in all environments (silently ignored)
    }
    player.play();
  } catch (error) {
    console.error('🔊 [SoundEffects] ❌ ERROR in _playPopAtRate:', error);
  }
}

/**
 * Low-mid thump for sell-confirm commit.
 * Uses the pop pool at playbackRate 0.85 (lower pitch = heavier feel).
 */
export async function playLeverClick(): Promise<void> {
  await _playPopAtRate(0.85);
}

/**
 * Coin-cluster cascade ping (boost jokers). Pitches upward as combo grows.
 * rate = clamp(0.9 + comboIndex * 0.0175, 0.9, 1.49)
 */
export async function playJokerChip(comboIndex: number): Promise<void> {
  const rate = Math.min(1.49, Math.max(0.9, 0.9 + comboIndex * 0.0175));
  await _playCoinAtRate(rate);
}

/**
 * Bright coin cascade for multiplier jokers — slightly higher pitch ladder
 * than the chip variant so the two interleave musically.
 * rate = clamp(1.0 + comboIndex * 0.0175, 1.0, 1.595)
 */
export async function playJokerMult(comboIndex: number): Promise<void> {
  const rate = Math.min(1.595, Math.max(1.0, 1.0 + comboIndex * 0.0175));
  await _playCoinAtRate(rate);
}

/**
 * Cash-register punctuation — plays at the end of the joker cascade in the
 * transaction modal. Uses the dedicated cashRegister.mp3 asset.
 */
export async function playCashRegister(): Promise<void> {
  try {
    if (!audioInitialized) {
      await initializeAudioPlayers();
    }
    const player = cashRegisterPlayerPool[cashRegisterPlayerIndex];
    cashRegisterPlayerIndex =
      (cashRegisterPlayerIndex + 1) % cashRegisterPlayerPool.length;
    if (player) {
      player.seekTo(0);
      try {
        player.playbackRate = 1.0;
      } catch {
        /* noop — playbackRate may not be settable in all envs */
      }
      player.play();
    }
  } catch (error) {
    console.error('🔊 [SoundEffects] ❌ ERROR in playCashRegister:', error);
  }
}

/** Round-robin coin-cluster pop at varying playbackRate. */
let _lastCoinAtRateTime = 0;
const _COIN_AT_RATE_COOLDOWN_MS = 30;
async function _playCoinAtRate(rate: number): Promise<void> {
  try {
    if (!audioInitialized) {
      await initializeAudioPlayers();
    }
    const now = Date.now();
    if (now - _lastCoinAtRateTime < _COIN_AT_RATE_COOLDOWN_MS) {
      // intentionally non-throttled — log only
    }
    _lastCoinAtRateTime = now;
    const player = coinPlayerPool[coinPlayerIndex];
    coinPlayerIndex = (coinPlayerIndex + 1) % coinPlayerPool.length;
    if (!player) return;
    player.seekTo(0);
    // Re-assert varispeed mode in case expo-audio reset it after the
    // last play (see init for the inverted-flag explanation).
    try {
      player.shouldCorrectPitch = true;
    } catch {
      /* noop */
    }
    // `player.playbackRate = rate` is a no-op on iOS in expo-audio 1.0.14
    // (the native module only defines a getter, no setter). Use the
    // setPlaybackRate function and pass NO pitchCorrectionQuality so the
    // native side falls through to .varispeed (real pitch shift).
    try {
      if (typeof player.setPlaybackRate === 'function') {
        player.setPlaybackRate(rate);
      } else {
        player.playbackRate = rate;
      }
    } catch {
      /* noop */
    }
    player.play();
  } catch (error) {
    console.error('🔊 [SoundEffects] ❌ ERROR in _playCoinAtRate:', error);
  }
}

/**
 * Rapid 4-pop ascending-pitch cascade for final total reveal.
 * Rates: 1.0, 1.15, 1.3, 1.45 — 40ms apart.
 */
export async function playCoinCascade(): Promise<void> {
  const rates = [1.0, 1.15, 1.3, 1.45];
  for (let i = 0; i < rates.length; i++) {
    setTimeout(() => {
      _playPopAtRate(rates[i]);
    }, i * 40);
  }
}

/**
 * Single pop for money count-up tick.
 * rate = 1.0 + progress * 0.4  (progress is 0..1)
 */
export async function playMoneyTick(progress: number): Promise<void> {
  const rate = 1.0 + progress * 0.4;
  await _playPopAtRate(rate);
}
