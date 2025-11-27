import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { initializeAudioMode } from './audioConfig';

/**
 * Centralized Music Controller
 *
 * Single source of truth for all background music in the app.
 * Prevents music overlap and handles rapid screen transitions gracefully.
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

interface MusicState {
  currentTrack: MusicTrack;
  targetTrack: MusicTrack;
  player: AudioPlayer | null;
  isTransitioning: boolean;
}

const state: MusicState = {
  currentTrack: 'none',
  targetTrack: 'none',
  player: null,
  isTransitioning: false,
};

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

const LOOPING_TRACKS: Set<MusicTrack> = new Set([
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
 * Immediately stop and cleanup current player
 */
function stopCurrentPlayer() {
  if (state.player) {
    try {
      state.player.pause();
      state.player.remove();
    } catch (error) {
      console.warn('🎵 Error stopping player:', error);
    }
    state.player = null;
  }
  state.currentTrack = 'none';
}

/**
 * Play a specific track
 */
async function playTrack(track: Exclude<MusicTrack, 'none'>) {
  try {
    // Ensure audio mode is initialized first (critical for physical devices)
    await initializeAudioMode();

    const player = createAudioPlayer(MUSIC_FILES[track]);
    player.loop = LOOPING_TRACKS.has(track);
    player.volume = 0.5;
    player.play();

    state.player = player;
    state.currentTrack = track;

    if (__DEV__) console.log(`🎵 Playing: ${track} (loop: ${player.loop})`);
  } catch (error) {
    console.error(`🎵 Error playing ${track}:`, error);
    state.currentTrack = 'none';
  }
}

/**
 * Transition to a new track with timeout protection
 */
async function transitionTo(newTrack: MusicTrack) {
  // Prevent overlapping transitions
  if (state.isTransitioning) {
    if (__DEV__)
      console.log(
        `🎵 [MusicController] Transition in progress, queuing: ${newTrack}`
      );
    state.targetTrack = newTrack;
    return;
  }

  state.isTransitioning = true;
  state.targetTrack = newTrack;

  if (__DEV__)
    console.log(
      `🎵 [MusicController] Transitioning from ${state.currentTrack} to ${newTrack}`
    );

  try {
    // Create a timeout promise (5 seconds max)
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(`Transition timeout: ${state.currentTrack} → ${newTrack}`)
          ),
        5000
      );
    });

    // Create the actual transition promise
    const transitionPromise = async () => {
      // If requested track is already playing, do nothing
      if (state.currentTrack === newTrack) {
        if (__DEV__)
          console.log(`🎵 [MusicController] Already playing: ${newTrack}`);
        return;
      }

      // Stop current track
      if (__DEV__)
        console.log(
          `🎵 [MusicController] Stopping current track: ${state.currentTrack}`
        );
      stopCurrentPlayer();

      // Play new track if not 'none'
      if (newTrack !== 'none') {
        if (__DEV__)
          console.log(`🎵 [MusicController] Starting new track: ${newTrack}`);
        await playTrack(newTrack);
      } else {
        if (__DEV__) console.log('🎵 [MusicController] Silence');
      }
    };

    // Race between transition and timeout
    await Promise.race([transitionPromise(), timeoutPromise]);

    // Check if target changed during transition
    if (state.targetTrack !== newTrack) {
      if (__DEV__)
        console.log(
          `🎵 [MusicController] Target changed to: ${state.targetTrack}, transitioning...`
        );
      const nextTarget = state.targetTrack;
      state.isTransitioning = false;
      await transitionTo(nextTarget);
      return;
    }

    if (__DEV__)
      console.log(`🎵 [MusicController] ✅ Transition complete: ${newTrack}`);
  } catch (error) {
    console.error('🎵 [MusicController] ❌ Transition failed:', error);
    // On error, force cleanup
    state.currentTrack = 'none';
    state.player = null;
  } finally {
    state.isTransitioning = false;
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
   * Emergency stop - immediately kill all music without fade
   * Use this when switching views rapidly or on critical errors
   */
  killAll() {
    if (__DEV__)
      console.log('🎵 [MusicController] 🚨 EMERGENCY STOP - Killing all music');

    if (state.player) {
      try {
        state.player.pause();
        state.player.remove();
      } catch (error) {
        console.warn(
          '🎵 [MusicController] Error during emergency stop:',
          error
        );
      }
      state.player = null;
    }

    state.currentTrack = 'none';
    state.targetTrack = 'none';
    state.isTransitioning = false;

    if (__DEV__) console.log('🎵 [MusicController] ✅ Emergency stop complete');
  },

  /**
   * Get current track
   */
  getCurrentTrack(): MusicTrack {
    return state.currentTrack;
  },

  /**
   * Check if a specific track is playing
   */
  isPlaying(track: MusicTrack): boolean {
    return state.currentTrack === track;
  },

  /**
   * Check if any music is playing
   */
  isAnyPlaying(): boolean {
    return state.currentTrack !== 'none';
  },

  /**
   * Get current state (for debugging)
   */
  getState(): Readonly<MusicState> {
    return { ...state };
  },
};
