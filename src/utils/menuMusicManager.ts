import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { initializeAudioMode } from './audioConfig';

/**
 * Global Menu Music Manager
 *
 * Manages the menu.wav and minigame.wav music that play during navigation.
 * This allows the music to continue playing across screen transitions.
 */

let menuMusicPlayer: AudioPlayer | null = null;
let isMenuMusicLoaded = false;
let minigameMusicPlayer: AudioPlayer | null = null;
let isMinigameMusicLoaded = false;
let victoryMusicPlayer: AudioPlayer | null = null;
let isVictoryMusicLoaded = false;

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
      oldPlayer.volume = Math.max(0, 0.5 - volumeStep * i);
    }
    newPlayer.volume = Math.min(0.5, volumeStep * i);
    await new Promise((resolve) => setTimeout(resolve, stepDuration));
  }

  // Stop and cleanup old player
  if (oldPlayer) {
    oldPlayer.pause();
    oldPlayer.remove();
  }
}

export const MenuMusicManager = {
  /**
   * Load and play menu music
   */
  async play() {
    try {
      // Don't reload if already playing
      if (isMenuMusicLoaded && menuMusicPlayer) {
        if (__DEV__) console.log('🎵 Menu music already playing');
        return;
      }

      if (__DEV__) console.log('🎵 Loading menu music...');

      // Ensure global audio mode is configured for mixing
      await initializeAudioMode();

      // Create and configure player
      menuMusicPlayer = createAudioPlayer(
        require('../../assets/music/menu.wav')
      );
      menuMusicPlayer.loop = true;
      menuMusicPlayer.volume = 0.5;

      // Play the music
      menuMusicPlayer.play();

      isMenuMusicLoaded = true;
      if (__DEV__) console.log('🎵 Menu music playing');
    } catch (error) {
      if (__DEV__) console.error('🎵 Error loading menu music:', error);
    }
  },

  /**
   * Stop and unload menu music (with fade out)
   */
  async stop() {
    try {
      if (menuMusicPlayer && isMenuMusicLoaded) {
        if (__DEV__) console.log('🎵 Fading out menu music...');

        // Fade out over 500ms
        const steps = 10;
        const stepDuration = 50;
        const volumeStep = 0.5 / steps;

        for (let i = 0; i <= steps; i++) {
          if (menuMusicPlayer) {
            menuMusicPlayer.volume = Math.max(0, 0.5 - volumeStep * i);
          }
          await new Promise((resolve) => setTimeout(resolve, stepDuration));
        }

        menuMusicPlayer.pause();
        menuMusicPlayer.remove();
        menuMusicPlayer = null;
        isMenuMusicLoaded = false;
        if (__DEV__) console.log('🎵 Menu music stopped');
      }
    } catch (error) {
      if (__DEV__) console.error('🎵 Error stopping menu music:', error);
    }
  },

  /**
   * Check if menu music is currently playing
   */
  isPlaying(): boolean {
    return isMenuMusicLoaded && menuMusicPlayer !== null;
  },

  /**
   * Load and play minigame music
   */
  async playMinigame() {
    try {
      // Don't reload if already playing
      if (isMinigameMusicLoaded && minigameMusicPlayer) {
        if (__DEV__) console.log('🎵 Minigame music already playing');
        return;
      }

      if (__DEV__) console.log('🎵 Loading minigame music...');

      // Ensure global audio mode is configured for mixing
      await initializeAudioMode();

      // Create and configure player
      minigameMusicPlayer = createAudioPlayer(
        require('../../assets/music/results.wav')
      );
      minigameMusicPlayer.loop = true;
      minigameMusicPlayer.volume = 0.5;

      // Play the music
      minigameMusicPlayer.play();

      isMinigameMusicLoaded = true;
      if (__DEV__) console.log('🎵 Minigame music playing');
    } catch (error) {
      if (__DEV__) console.error('🎵 Error loading minigame music:', error);
    }
  },

  /**
   * Stop and unload minigame music (with fade out)
   */
  async stopMinigame() {
    try {
      if (minigameMusicPlayer && isMinigameMusicLoaded) {
        if (__DEV__) console.log('🎵 Fading out minigame music...');

        // Fade out over 500ms
        const steps = 10;
        const stepDuration = 50;
        const volumeStep = 0.5 / steps;

        for (let i = 0; i <= steps; i++) {
          if (minigameMusicPlayer) {
            minigameMusicPlayer.volume = Math.max(0, 0.5 - volumeStep * i);
          }
          await new Promise((resolve) => setTimeout(resolve, stepDuration));
        }

        minigameMusicPlayer.pause();
        minigameMusicPlayer.remove();
        minigameMusicPlayer = null;
        isMinigameMusicLoaded = false;
        if (__DEV__) console.log('🎵 Minigame music stopped');
      }
    } catch (error) {
      if (__DEV__) console.error('🎵 Error stopping minigame music:', error);
    }
  },

  /**
   * Check if minigame music is currently playing
   */
  isMinigamePlaying(): boolean {
    return isMinigameMusicLoaded && minigameMusicPlayer !== null;
  },

  /**
   * Load and play victory music (no loop)
   */
  async playVictory() {
    try {
      // Don't reload if already playing
      if (isVictoryMusicLoaded && victoryMusicPlayer) {
        if (__DEV__) console.log('🎵 Victory music already playing');
        return;
      }

      if (__DEV__) console.log('🎵 Loading victory music...');

      // Ensure global audio mode is configured for mixing
      await initializeAudioMode();

      // Create and configure player
      victoryMusicPlayer = createAudioPlayer(
        require('../../assets/music/victory.wav')
      );
      victoryMusicPlayer.loop = false; // DO NOT loop victory music
      victoryMusicPlayer.volume = 0.5;

      // Play the music
      victoryMusicPlayer.play();

      isVictoryMusicLoaded = true;
      if (__DEV__) console.log('🎵 Victory music playing');
    } catch (error) {
      if (__DEV__) console.error('🎵 Error loading victory music:', error);
    }
  },

  /**
   * Stop and unload victory music
   */
  async stopVictory() {
    try {
      if (victoryMusicPlayer && isVictoryMusicLoaded) {
        if (__DEV__) console.log('🎵 Stopping victory music...');

        victoryMusicPlayer.pause();
        victoryMusicPlayer.remove();
        victoryMusicPlayer = null;
        isVictoryMusicLoaded = false;
        if (__DEV__) console.log('🎵 Victory music stopped');
      }
    } catch (error) {
      if (__DEV__) console.error('🎵 Error stopping victory music:', error);
    }
  },

  /**
   * Check if victory music is currently playing
   */
  isVictoryPlaying(): boolean {
    return isVictoryMusicLoaded && victoryMusicPlayer !== null;
  },
};
