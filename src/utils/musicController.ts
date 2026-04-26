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
let globalMusicVolume = 0.5;

// Duck/restore state
let duckTickInterval: ReturnType<typeof setInterval> | null = null;
let duckOriginalVolume: number | null = null;

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
    player.volume = globalMusicVolume;
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

  /**
   * Set music volume (0.0 - 1.0)
   */
  setVolume(volume: number) {
    globalMusicVolume = Math.max(0, Math.min(1, volume));
    if (player) {
      try { player.volume = globalMusicVolume; } catch {}
    }
  },

  /**
   * Fade music volume from its current value to `targetVolume` (0..1) over
   * `durationMs` milliseconds. If another duck is already active, cancel and
   * re-target. Remembers the "original" volume (the value before the first
   * duck of a duck/restore cycle) so restore() can return to it.
   */
  duck(targetVolume: number, durationMs: number): void {
    // Cancel any running tick before starting a new one
    if (duckTickInterval !== null) {
      clearInterval(duckTickInterval);
      duckTickInterval = null;
    }

    // Remember the pre-duck volume only on the first duck of a cycle
    if (duckOriginalVolume === null) {
      duckOriginalVolume = globalMusicVolume;
    }

    const clampedTarget = Math.max(0, Math.min(1, targetVolume));

    // Zero-duration: set immediately, no interval
    if (durationMs <= 0) {
      globalMusicVolume = clampedTarget;
      if (player) {
        try { player.volume = globalMusicVolume; } catch {}
      }
      return;
    }

    const TICK_MS = 50;
    const startVolume = globalMusicVolume;
    const totalTicks = Math.ceil(durationMs / TICK_MS);
    let tick = 0;

    duckTickInterval = setInterval(() => {
      tick += 1;
      const progress = Math.min(tick / totalTicks, 1);
      const next = startVolume + (clampedTarget - startVolume) * progress;
      globalMusicVolume = next;
      if (player) {
        try { player.volume = next; } catch {}
      }

      if (progress >= 1) {
        clearInterval(duckTickInterval!);
        duckTickInterval = null;
      }
    }, TICK_MS);
  },

  /**
   * Fade music volume back to the pre-duck original volume over `durationMs`
   * milliseconds. Noop if never ducked.
   */
  restore(durationMs: number): void {
    if (duckOriginalVolume === null) {
      // Never ducked — noop
      return;
    }

    // Cancel any running tick before starting a new one
    if (duckTickInterval !== null) {
      clearInterval(duckTickInterval);
      duckTickInterval = null;
    }

    const restoreTarget = duckOriginalVolume;
    // Clear original now so a new duck/restore cycle starts fresh
    duckOriginalVolume = null;

    // Zero-duration: set immediately, no interval
    if (durationMs <= 0) {
      globalMusicVolume = restoreTarget;
      if (player) {
        try { player.volume = globalMusicVolume; } catch {}
      }
      return;
    }

    const TICK_MS = 50;
    const startVolume = globalMusicVolume;
    const totalTicks = Math.ceil(durationMs / TICK_MS);
    let tick = 0;

    duckTickInterval = setInterval(() => {
      tick += 1;
      const progress = Math.min(tick / totalTicks, 1);
      const next = startVolume + (restoreTarget - startVolume) * progress;
      globalMusicVolume = next;
      if (player) {
        try { player.volume = next; } catch {}
      }

      if (progress >= 1) {
        clearInterval(duckTickInterval!);
        duckTickInterval = null;
      }
    }, TICK_MS);
  },
};
