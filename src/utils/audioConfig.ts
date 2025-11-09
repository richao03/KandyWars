import { setAudioModeAsync } from 'expo-audio';

/**
 * Global Audio Configuration
 *
 * Initializes the audio mode once for the entire app.
 * This allows music and sound effects to play simultaneously.
 */

let isAudioConfigured = false;

export async function initializeAudioMode() {
  if (isAudioConfigured) {
    return;
  }

  console.log('🎵 [AudioConfig] Initializing global audio mode...');

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers', // CRITICAL: Allow multiple audio sources
    });

    isAudioConfigured = true;
    console.log('🎵 [AudioConfig] ✅ Global audio mode initialized with mixWithOthers');
  } catch (error) {
    console.error('🎵 [AudioConfig] ❌ Failed to initialize audio mode:', error);
  }
}
