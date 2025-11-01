import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

/**
 * Hook to manage background music playback
 * @param shouldPlay - Whether music should be playing
 * @param volume - Volume level (0-1), defaults to 0.5
 */
export const useBackgroundMusic = (shouldPlay: boolean = true, volume: number = 0.5) => {
  const sound = useRef<Audio.Sound | null>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const setupAudio = async () => {
      try {
        // Set audio mode to play in background and mix with other audio
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        if (isMounted && shouldPlay) {
          if (__DEV__) console.log('🎵 Loading background music...');
          const { sound: loadedSound } = await Audio.Sound.createAsync(
            require('../../assets/music/background.mp3'),
            {
              isLooping: true,
              volume: volume,
              shouldPlay: true,
            }
          );

          sound.current = loadedSound;
          isLoadedRef.current = true;
          if (__DEV__) console.log('🎵 Background music loaded and playing');
        }
      } catch (error) {
        if (__DEV__) console.error('🎵 Error loading background music:', error);
      }
    };

    const cleanupAudio = async () => {
      if (sound.current && isLoadedRef.current) {
        if (__DEV__) console.log('🎵 Stopping and unloading background music...');
        try {
          await sound.current.stopAsync();
          await sound.current.unloadAsync();
        } catch (error) {
          if (__DEV__) console.error('🎵 Error unloading music:', error);
        }
        isLoadedRef.current = false;
        sound.current = null;
      }
    };

    if (shouldPlay && !isLoadedRef.current) {
      setupAudio();
    } else if (!shouldPlay && isLoadedRef.current) {
      cleanupAudio();
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (sound.current && isLoadedRef.current) {
        if (__DEV__) console.log('🎵 Component unmounting - unloading background music...');
        sound.current.stopAsync().catch(() => {});
        sound.current.unloadAsync().catch(() => {});
        isLoadedRef.current = false;
        sound.current = null;
      }
    };
  }, [shouldPlay, volume]);

  // Update playback when shouldPlay changes
  useEffect(() => {
    const updatePlayback = async () => {
      if (sound.current && isLoadedRef.current) {
        try {
          if (shouldPlay) {
            const status = await sound.current.getStatusAsync();
            if (status.isLoaded && !status.isPlaying) {
              await sound.current.playAsync();
              if (__DEV__) console.log('🎵 Music resumed');
            }
          } else {
            const status = await sound.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await sound.current.pauseAsync();
              if (__DEV__) console.log('🎵 Music paused');
            }
          }
        } catch (error) {
          if (__DEV__) console.error('🎵 Error updating playback:', error);
        }
      }
    };

    updatePlayback();
  }, [shouldPlay]);

  // Update volume when it changes
  useEffect(() => {
    const updateVolume = async () => {
      if (sound.current && isLoadedRef.current) {
        try {
          await sound.current.setVolumeAsync(volume);
          if (__DEV__) console.log(`🎵 Volume set to ${volume}`);
        } catch (error) {
          if (__DEV__) console.error('🎵 Error setting volume:', error);
        }
      }
    };

    updateVolume();
  }, [volume]);

  return {
    sound: sound.current,
  };
};
