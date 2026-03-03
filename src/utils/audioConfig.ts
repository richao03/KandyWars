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

  try {
    await setAudioModeAsync({
      playsInSilentMode: false, // Respect device silent mode
      allowsRecording: false, // Not using microphone
      shouldPlayInBackground: false, // Stop when app is backgrounded
      interruptionMode: 'mixWithOthers', // CRITICAL: Allow multiple audio sources to play simultaneously
    });

    isAudioConfigured = true;
  } catch (error) {
    console.error('🎵 [AudioConfig] ❌ Failed to initialize audio mode:', error);
  }
}
