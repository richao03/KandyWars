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
const NEGATIVE_SOUND = require('../../assets/soundEffects/negative1.mp3');
const ACHIEVEMENT_SOUND = require('../../assets/soundEffects/achievement.wav');
const CONGRATS_SOUND = require('../../assets/soundEffects/congrats1.mp3');

// Audio pooling - create all players once at module initialization
let audioInitialized = false;
let popPlayers: any[] = [];
let positivePlayer: any = null;
let negativePlayer: any = null;
let achievementPlayer: any = null;
let congratsPlayer: any = null;

/**
 * Initialize all audio players (called lazily on first sound play)
 */
async function initializeAudioPlayers() {
  if (audioInitialized) return;

  console.log('🔊 [SoundEffects] Initializing audio players (one-time setup)...');

  try {
    // Ensure global audio mode is configured for mixing
    await initializeAudioMode();

    // Create pop sound players
    popPlayers = POP_SOUNDS.map((sound, index) => {
      const player = createAudioPlayer(sound);
      player.volume = 0.6;
      console.log(`🔊 [SoundEffects] Created pop${index + 1} player`);
      return player;
    });

    // Create other sound players
    positivePlayer = createAudioPlayer(POSITIVE_SOUND);
    positivePlayer.volume = 0.7;
    console.log('🔊 [SoundEffects] Created positive sound player');

    negativePlayer = createAudioPlayer(NEGATIVE_SOUND);
    negativePlayer.volume = 0.7;
    console.log('🔊 [SoundEffects] Created negative sound player');

    achievementPlayer = createAudioPlayer(ACHIEVEMENT_SOUND);
    achievementPlayer.volume = 0.7;
    console.log('🔊 [SoundEffects] Created achievement sound player');

    congratsPlayer = createAudioPlayer(CONGRATS_SOUND);
    congratsPlayer.volume = 0.7;
    console.log('🔊 [SoundEffects] Created congrats sound player');

    audioInitialized = true;
    console.log('🔊 [SoundEffects] ✅ Audio players initialized successfully!');
  } catch (error) {
    console.error('🔊 [SoundEffects] ❌ ERROR initializing audio players:', error);
  }
}

export const SoundEffects = {
  /**
   * Play a random pop sound
   */
  async playRandomPop() {
    console.log('🔊 [SoundEffects] playRandomPop() called');
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      // Pick random pop sound player
      const randomIndex = Math.floor(Math.random() * popPlayers.length);
      const player = popPlayers[randomIndex];

      console.log(
        `🔊 [SoundEffects] Selected pop${randomIndex + 1}.ogg (index ${randomIndex})`
      );

      console.log('🔊 [SoundEffects] Calling play()...');
      player.play();
      console.log(
        '🔊 [SoundEffects] ✅ play() called - sound should be playing!'
      );
    } catch (error) {
      console.error('🔊 [SoundEffects] ❌ ERROR playing pop sound:', error);
      console.error('🔊 [SoundEffects] Error stack:', error.stack);
    }
  },

  /**
   * Play positive event sound (success, win, correct answer)
   */
  async playPositiveSound() {
    console.log('🔊 [SoundEffects] playPositiveSound() called');
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      positivePlayer.play();
      console.log('🔊 [SoundEffects] ✅ Positive sound playing!');
    } catch (error) {
      console.error(
        '🔊 [SoundEffects] ❌ ERROR playing positive sound:',
        error
      );
    }
  },

  /**
   * Play negative event sound (failure, loss, wrong answer)
   */
  async playNegativeSound() {
    console.log('🔊 [SoundEffects] playNegativeSound() called');
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      negativePlayer.play();
      console.log('🔊 [SoundEffects] ✅ Negative sound playing!');
    } catch (error) {
      console.error(
        '🔊 [SoundEffects] ❌ ERROR playing negative sound:',
        error
      );
    }
  },

  /**
   * Play achievement sound (joker selection, level complete)
   */
  async playAchievementSound() {
    console.log('🔊 [SoundEffects] playAchievementSound() called');
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      achievementPlayer.play();
      console.log('🔊 [SoundEffects] ✅ Achievement sound playing!');
    } catch (error) {
      console.error(
        '🔊 [SoundEffects] ❌ ERROR playing achievement sound:',
        error
      );
    }
  },

  /**
   * Play congratulations sound (level complete)
   */
  async playCongratsSound() {
    console.log('🔊 [SoundEffects] playCongratsSound() called');
    try {
      // Lazy initialization
      if (!audioInitialized) {
        await initializeAudioPlayers();
      }

      congratsPlayer.play();
      console.log('🔊 [SoundEffects] ✅ Congrats sound playing!');
    } catch (error) {
      console.error(
        '🔊 [SoundEffects] ❌ ERROR playing congrats sound:',
        error
      );
    }
  },
};
