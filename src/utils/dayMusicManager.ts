import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { initializeAudioMode } from './audioConfig';

/**
 * Day Music Manager
 *
 * Manages day-specific music (day1.wav through day5.wav) for the market view.
 * Automatically plays the correct music based on the current game day.
 */

let dayMusicPlayer: AudioPlayer | null = null;
let isDayMusicLoaded = false;
let currentDay: number | null = null;
let isTransitioning = false; // Mutex to prevent overlapping transitions

/**
 * Crossfade helper - fades out old player and fades in new player
 */
async function crossfade(
  oldPlayer: AudioPlayer | null,
  newPlayer: AudioPlayer,
  duration: number = 1000
) {
  const steps = 20;
  const stepDuration = duration / steps;
  const volumeStep = 0.5 / steps; // Target volume is 0.5

  // Start new player at volume 0
  newPlayer.volume = 0;
  newPlayer.play();

  // Crossfade loop
  for (let i = 0; i <= steps; i++) {
    if (oldPlayer) {
      oldPlayer.volume = Math.max(0, 0.5 - (volumeStep * i));
    }
    newPlayer.volume = Math.min(0.5, volumeStep * i);
    await new Promise(resolve => setTimeout(resolve, stepDuration));
  }

  // Stop and cleanup old player
  if (oldPlayer) {
    oldPlayer.pause();
    oldPlayer.remove();
  }
}

// Map days to their music files
const DAY_MUSIC_FILES = {
  1: require('../../assets/music/day1.wav'),
  2: require('../../assets/music/day2.wav'),
  3: require('../../assets/music/day3.wav'),
  4: require('../../assets/music/day4.wav'),
  5: require('../../assets/music/day5.wav'),
};

export const DayMusicManager = {
  /**
   * Play music for a specific day
   * @param day - The current game day (1-5)
   */
  async playForDay(day: number) {
    try {
      if (__DEV__) {
        console.log(`🎵 [DayMusicManager] playForDay(${day}) called`);
        console.log(`🎵 [DayMusicManager] Current state: isDayMusicLoaded=${isDayMusicLoaded}, currentDay=${currentDay}, isTransitioning=${isTransitioning}`);
      }

      // If a transition is already in progress, skip this request
      if (isTransitioning) {
        if (__DEV__) console.log(`🎵 [DayMusicManager] ⚠️ TRANSITION IN PROGRESS - Skipping request for day ${day}`);
        return;
      }

      // If already playing music for this day, don't reload
      if (isDayMusicLoaded && currentDay === day && dayMusicPlayer) {
        if (__DEV__) console.log(`🎵 [DayMusicManager] Day ${day} music ALREADY PLAYING - skipping`);
        return;
      }

      // Get the music file for this day (cycle if day > 5)
      const dayIndex = ((day - 1) % 5) + 1; // Cycle through 1-5
      const musicFile = DAY_MUSIC_FILES[dayIndex as keyof typeof DAY_MUSIC_FILES];

      if (!musicFile) {
        console.warn(`🎵 [DayMusicManager] No music file for day ${day}, using day ${dayIndex}`);
        return;
      }

      if (__DEV__) console.log(`🎵 [DayMusicManager] Will load day${dayIndex}.wav for requested day ${day}`);

      // Set transition lock
      isTransitioning = true;
      if (__DEV__) console.log(`🎵 [DayMusicManager] 🔒 LOCKED - Starting transition`);

      // Ensure global audio mode is configured for mixing
      await initializeAudioMode();

      // Create new player
      const newPlayer = createAudioPlayer(musicFile);
      newPlayer.loop = true;

      // Crossfade if there's existing music, otherwise just play
      if (isDayMusicLoaded && currentDay !== day && dayMusicPlayer) {
        if (__DEV__) console.log(`🎵 [DayMusicManager] CROSSFADING from day ${currentDay} (day${((currentDay - 1) % 5) + 1}.wav) to day ${day} (day${dayIndex}.wav)`);
        const oldPlayer = dayMusicPlayer;
        dayMusicPlayer = newPlayer;
        currentDay = day;
        isDayMusicLoaded = true;
        await crossfade(oldPlayer, newPlayer, 1000);
        if (__DEV__) console.log(`🎵 [DayMusicManager] Crossfade complete - now playing day${dayIndex}.wav`);
      } else {
        if (__DEV__) console.log(`🎵 [DayMusicManager] No existing music - FADING IN day${dayIndex}.wav`);
        // No existing music, just fade in
        newPlayer.volume = 0;
        newPlayer.play();
        dayMusicPlayer = newPlayer;
        isDayMusicLoaded = true;
        currentDay = day;

        // Fade in over 500ms
        const steps = 10;
        const stepDuration = 50;
        const volumeStep = 0.5 / steps;

        for (let i = 0; i <= steps; i++) {
          if (dayMusicPlayer) {
            dayMusicPlayer.volume = Math.min(0.5, volumeStep * i);
          }
          await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
        if (__DEV__) console.log(`🎵 [DayMusicManager] Fade in complete - day${dayIndex}.wav playing at volume 0.5`);
      }

      // Release transition lock
      isTransitioning = false;
      if (__DEV__) {
        console.log(`🎵 [DayMusicManager] 🔓 UNLOCKED - Transition complete`);
        console.log(`🎵 [DayMusicManager] ✅ SUCCESS: Day ${day} music (day${dayIndex}.wav) is now playing`);
      }
    } catch (error) {
      console.error(`🎵 [DayMusicManager] ❌ ERROR loading day ${day} music:`, error);
      // Release lock on error
      isTransitioning = false;
      if (__DEV__) console.log(`🎵 [DayMusicManager] 🔓 UNLOCKED (error recovery)`);
    }
  },

  /**
   * Stop the currently playing day music (with fade out)
   */
  async stop() {
    try {
      // Wait if transition is in progress
      if (isTransitioning) {
        if (__DEV__) console.log(`🎵 [DayMusicManager] ⚠️ STOP called while transition in progress - waiting...`);
        // Wait for transition to complete (max 2 seconds)
        let waitCount = 0;
        while (isTransitioning && waitCount < 40) {
          await new Promise(resolve => setTimeout(resolve, 50));
          waitCount++;
        }
      }

      if (dayMusicPlayer && isDayMusicLoaded) {
        if (__DEV__) console.log(`🎵 [DayMusicManager] Fading out day ${currentDay} music...`);

        // Fade out over 500ms
        const steps = 10;
        const stepDuration = 50;
        const volumeStep = 0.5 / steps;

        for (let i = 0; i <= steps; i++) {
          if (dayMusicPlayer) {
            dayMusicPlayer.volume = Math.max(0, 0.5 - (volumeStep * i));
          }
          await new Promise(resolve => setTimeout(resolve, stepDuration));
        }

        // Check if player still exists before pausing (it might have been cleared by another call)
        if (dayMusicPlayer) {
          dayMusicPlayer.pause();
          dayMusicPlayer.remove();
        }
        dayMusicPlayer = null;
        isDayMusicLoaded = false;
        currentDay = null;
        if (__DEV__) console.log('🎵 Day music stopped');
      }
    } catch (error) {
      if (__DEV__) console.error('🎵 Error stopping day music:', error);
    }
  },

  /**
   * Check if day music is currently playing
   */
  isPlaying(): boolean {
    return isDayMusicLoaded && dayMusicPlayer !== null;
  },

  /**
   * Get the current day number for which music is playing
   */
  getCurrentDay(): number | null {
    return currentDay;
  },

  /**
   * Update volume
   * @param volume - Volume level (0-1)
   */
  async setVolume(volume: number) {
    try {
      if (dayMusicPlayer && isDayMusicLoaded) {
        dayMusicPlayer.volume = volume;
        if (__DEV__) console.log(`🎵 Day music volume set to ${volume}`);
      }
    } catch (error) {
      if (__DEV__) console.error('🎵 Error setting volume:', error);
    }
  },
};
