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

let birdPlayerPool: any[] = [];
let birdPlayerIndex = 0;

/**
 * Initialize all audio players (called lazily on first sound play)
 */
async function initializeAudioPlayers() {
  if (audioInitialized) return;

  console.log('🔊 [SoundEffects] Initializing audio player pools (one-time setup)...');

  try {
    // Ensure audio mode is initialized first (critical for physical devices)
    await initializeAudioMode();
    console.log('🔊 [SoundEffects] Audio mode ready, creating player pools...');

    // Create one player per pop sound file (10 total)
    // This allows up to 10 simultaneous pops (all 10 different sounds playing at once)
    POP_SOUNDS.forEach((sound, index) => {
      const player = createAudioPlayer(sound);
      player.volume = 1.0; // Boosted from 0.6 for better audibility on physical devices
      popPlayerPool.push(player);
    });
    console.log(`🔊 [SoundEffects] Created pop sound pool (${POP_SOUNDS.length} unique players)`);

    // Create pool of 2 instances for each other sound
    const SOUND_POOL_SIZE = 2;

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const posPlayer = createAudioPlayer(POSITIVE_SOUND);
      posPlayer.volume = 1.0; // Boosted from 0.7 for physical devices
      positivePlayerPool.push(posPlayer);
    }
    console.log(`🔊 [SoundEffects] Created positive sound pool (${SOUND_POOL_SIZE} players)`);

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const coinPlayer = createAudioPlayer(COIN_SOUND);
      coinPlayer.volume = 1.0; // Boosted from 0.7 for physical devices
      coinPlayerPool.push(coinPlayer);
    }
    console.log(`🔊 [SoundEffects] Created coin sound pool (${SOUND_POOL_SIZE} players)`);

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const negPlayer = createAudioPlayer(NEGATIVE_SOUND);
      negPlayer.volume = 1.0; // Boosted from 0.7 for physical devices
      negativePlayerPool.push(negPlayer);
    }
    console.log(`🔊 [SoundEffects] Created negative sound pool (${SOUND_POOL_SIZE} players)`);

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const wrongPlayer = createAudioPlayer(WRONG_ANSWER_SOUND);
      wrongPlayer.volume = 1.0; // Reduced from 2.0 to prevent distortion
      wrongAnswerPlayerPool.push(wrongPlayer);
    }
    console.log(`🔊 [SoundEffects] Created wrong answer sound pool (${SOUND_POOL_SIZE} players)`);

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const achPlayer = createAudioPlayer(ACHIEVEMENT_SOUND);
      achPlayer.volume = 1.0; // Boosted from 0.7 for physical devices
      achievementPlayerPool.push(achPlayer);
    }
    console.log(`🔊 [SoundEffects] Created achievement sound pool (${SOUND_POOL_SIZE} players)`);

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const congPlayer = createAudioPlayer(CONGRATS_SOUND);
      congPlayer.volume = 1.0; // Boosted from 0.7 for physical devices
      congratsPlayerPool.push(congPlayer);
    }
    console.log(`🔊 [SoundEffects] Created congrats sound pool (${SOUND_POOL_SIZE} players)`);

    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
      const birdPlayer = createAudioPlayer(BIRD_SOUND);
      birdPlayer.volume = 1.0; // Boosted from 0.7 for physical devices
      birdPlayerPool.push(birdPlayer);
    }
    console.log(`🔊 [SoundEffects] Created bird sound pool (${SOUND_POOL_SIZE} players)`);

    audioInitialized = true;
    console.log('🔊 [SoundEffects] ✅ Audio player pools initialized successfully!');
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
    console.log('🔊 [SoundEffects] Audio not initialized, nothing to cleanup');
    return;
  }

  console.log('🔊 [SoundEffects] 🧹 Cleaning up audio player pools...');

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

    // Reset indices
    popPlayerIndex = 0;
    positivePlayerIndex = 0;
    coinPlayerIndex = 0;
    negativePlayerIndex = 0;
    wrongAnswerPlayerIndex = 0;
    achievementPlayerIndex = 0;
    congratsPlayerIndex = 0;
    birdPlayerIndex = 0;

    // Reset initialization flag
    audioInitialized = false;

    console.log('🔊 [SoundEffects] ✅ Audio player pools cleaned up successfully!');
  } catch (error) {
    console.error('🔊 [SoundEffects] ❌ ERROR cleaning up audio players:', error);
  }
}

export const SoundEffects = {
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
