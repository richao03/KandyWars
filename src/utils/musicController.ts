import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { initializeAudioMode } from './audioConfig';

/**
 * Centralized Music Controller
 *
 * Single source of truth for all background music in the app.
 * Uses a single persistent AudioPlayer with replace() to swap tracks,
 * avoiding the expo-audio bug where ~40 create/destroy cycles causes silence.
 */

type MusicTrack =
  | 'menu'
  | 'day1'
  | 'day2'
  | 'day3'
  | 'day4'
  | 'day5'
  | 'minigame'
  | 'results'
  | 'victory'
  | 'bird'
  | 'cricket'
  | 'none';

let player: AudioPlayer | null = null;
let currentTrack: MusicTrack = 'none';
let targetTrack: MusicTrack = 'none';
let isTransitioning = false;

const MUSIC_FILES: Record<Exclude<MusicTrack, 'none'>, any> = {
  menu: require('../../assets/music/menu.wav'),
  day1: require('../../assets/music/day1.wav'),
  day2: require('../../assets/music/day2.wav'),
  day3: require('../../assets/music/day3.wav'),
  day4: require('../../assets/music/day4.wav'),
  day5: require('../../assets/music/day5.wav'),
  minigame: require('../../assets/music/results.wav'),
  results: require('../../assets/music/results.wav'),
  victory: require('../../assets/music/victory.wav'),
  bird: require('../../assets/soundEffects/birds1.m4a'),
  cricket: require('../../assets/soundEffects/crickets1.mp3'),
};

const LOOPING_TRACKS = new Set<MusicTrack>([
  'menu',
  'day1',
  'day2',
  'day3',
  'day4',
  'day5',
  'minigame',
  'results',
]);

/**
 * Get or create the singleton player. Uses replace() to swap sources
 * instead of creating a new player each time.
 */
function ensurePlayer(source: any): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(source);
    player.volume = 0.5;
  } else {
    player.replace(source);
  }
  return player;
}

/**
 * Transition to a new track
 */
async function transitionTo(newTrack: MusicTrack) {
  if (isTransitioning) {
    targetTrack = newTrack;
    return;
  }

  isTransitioning = true;
  targetTrack = newTrack;

  try {
    if (currentTrack === newTrack) {
      return;
    }

    if (newTrack === 'none') {
      if (player) {
        player.pause();
      }
      currentTrack = 'none';
    } else {
      await initializeAudioMode();
      const p = ensurePlayer(MUSIC_FILES[newTrack]);
      p.loop = LOOPING_TRACKS.has(newTrack);
      p.play();
      currentTrack = newTrack;
    }

    // Check if target changed during transition
    if (targetTrack !== newTrack) {
      const nextTarget = targetTrack;
      isTransitioning = false;
      await transitionTo(nextTarget);
      return;
    }
  } catch (error) {
    console.error('🎵 [MusicController] Transition failed:', error);
    currentTrack = 'none';
  } finally {
    isTransitioning = false;
  }
}

/**
 * Public API
 */
export const MusicController = {
  /**
   * Set the music track for the current screen/context
   */
  async setTrack(track: MusicTrack) {
    await transitionTo(track);
  },

  /**
   * Stop all music
   */
  async stop() {
    await transitionTo('none');
  },

  /**
   * Emergency stop - immediately kill all music
   * Use this when switching views rapidly or on critical errors
   */
  killAll() {
    if (player) {
      try {
        player.pause();
      } catch (error) {
        // Ignore errors during emergency stop
      }
    }
    currentTrack = 'none';
    targetTrack = 'none';
    isTransitioning = false;
  },

  /**
   * Get current track
   */
  getCurrentTrack(): MusicTrack {
    return currentTrack;
  },

  /**
   * Check if a specific track is playing
   */
  isPlaying(track: MusicTrack): boolean {
    return currentTrack === track;
  },

  /**
   * Check if any music is playing
   */
  isAnyPlaying(): boolean {
    return currentTrack !== 'none';
  },
};
