import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { nameValidationService } from '../../src/services/nameValidationService';
import { loadPlayerId } from '../../src/utils/persistence';
import colors from '../../src/constants/colors';


// Module-level flags to track session state
let firebaseSessionCompleted = false;
let studioSessionCompleted = false;

const { width, height } = Dimensions.get('window');

interface StudioTitleScreenProps {
  onComplete?: () => void;
}

export default function StudioTitleScreen({
  onComplete,
}: StudioTitleScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [firebaseComplete, setFirebaseComplete] = useState(firebaseSessionCompleted);
  const [minimumTimeComplete, setMinimumTimeComplete] = useState(false);

  // If studio session is already completed, call onComplete immediately
  useEffect(() => {
    if (studioSessionCompleted) {
      console.log('🎬 DEBUG: Studio session already completed, calling onComplete immediately');
      if (onComplete) {
        onComplete();
      }
      return;
    }
  }, [onComplete]);

  useEffect(() => {
    // Don't start animation if already completed
    if (studioSessionCompleted) {
      return;
    }

    console.log('🔍 DEBUG: StudioTitleScreen mounted, starting fade in');
    console.log('🔍 DEBUG: firebaseSessionCompleted:', firebaseSessionCompleted);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      console.log('🔍 DEBUG: StudioTitleScreen fade in complete');
    });

    // Set minimum display time of 1.3 seconds
    const minimumTimer = setTimeout(() => {
      console.log('🕐 DEBUG: Minimum 1.3 second display time reached');
      setMinimumTimeComplete(true);
    }, 1300);

    return () => clearTimeout(minimumTimer);
  }, []);

  // Start Firebase fetch when component mounts (only if not already completed)
  useEffect(() => {
    if (firebaseSessionCompleted) {
      console.log('🔥 DEBUG: Firebase already completed this session, skipping fetch');
      return;
    }

    console.log('🔥 DEBUG: StudioTitleScreen starting Firebase fetch');

    const loadPlayerDataFromFirebase = async () => {
      try {
        console.log('🔥 DEBUG: Starting loadPlayerDataFromFirebase function');
        console.log('🔍 StudioTitleScreen: Starting Firebase user data lookup...');

        // Try to get persistent player ID
        console.log('🔥 DEBUG: About to call loadPlayerId()');
        const persistentPlayerId = await loadPlayerId();
        console.log('🔥 DEBUG: loadPlayerId() completed');
        console.log('🔍 StudioTitleScreen: Persistent player ID from storage:', persistentPlayerId);

        if (persistentPlayerId) {
          // Check Firebase for existing name using this ID
          console.log('🔥 DEBUG: Player ID exists, checking Firebase...');
          console.log('🔍 StudioTitleScreen: Checking Firebase for existing name with player ID:', persistentPlayerId);

          try {
            console.log('🔥 DEBUG: About to call nameValidationService.getPlayerName()');
            const existingName = await nameValidationService.getPlayerName(persistentPlayerId);
            console.log('🔥 DEBUG: nameValidationService.getPlayerName() completed');
            console.log('🔍 StudioTitleScreen: Firebase lookup result - existing name:', existingName);

            if (existingName) {
              console.log('✅ StudioTitleScreen: Found existing player name in Firebase:', existingName);
            } else {
              console.log('❌ StudioTitleScreen: No existing name found in Firebase for player ID:', persistentPlayerId);
            }
          } catch (firebaseError) {
            console.log('🔥 DEBUG: Firebase query threw error');
            console.error('❌ StudioTitleScreen: Firebase query failed:', firebaseError);
          }
        } else {
          console.log('🔥 DEBUG: No persistent player ID found');
          console.log('❌ StudioTitleScreen: No persistent player ID found in storage');
        }

        console.log('🔍 DEBUG: About to set firebaseComplete to true');
        firebaseSessionCompleted = true; // Set module-level flag
        setFirebaseComplete(true);
        console.log('✅ StudioTitleScreen: Firebase user data lookup complete');
      } catch (error) {
        console.log('🔥 DEBUG: Outer try-catch caught error');
        console.error('❌ StudioTitleScreen: Error during Firebase user data lookup:', error);
        console.log('🔥 DEBUG: Setting firebaseComplete to true due to error');
        firebaseSessionCompleted = true; // Set module-level flag even on error
        setFirebaseComplete(true);
      }
    };

    console.log('🔥 DEBUG: About to call loadPlayerDataFromFirebase()');
    loadPlayerDataFromFirebase();
    console.log('🔥 DEBUG: loadPlayerDataFromFirebase() call initiated');
  }, []);

  // Start fade out when both Firebase is complete AND minimum time has passed
  useEffect(() => {
    // Don't start fade out if studio session already completed
    if (studioSessionCompleted) {
      return;
    }

    console.log('🔍 DEBUG: Checking fade out conditions - firebaseComplete:', firebaseComplete, 'minimumTimeComplete:', minimumTimeComplete);
    if (firebaseComplete && minimumTimeComplete) {
      console.log('🎬 DEBUG: Both conditions met - starting fade out animation...');
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        console.log('🎬 DEBUG: StudioTitleScreen fade out animation finished');
        console.log('🎬 DEBUG: About to call onComplete callback');
        // Mark studio session as completed
        studioSessionCompleted = true;
        // Call onComplete after fade out finishes
        if (onComplete) {
          onComplete();
        } else {
          console.log('🔍 DEBUG: No onComplete callback provided');
        }
      });
    } else {
      console.log('🔍 DEBUG: Waiting for both conditions - Firebase and minimum time');
    }
  }, [firebaseComplete, minimumTimeComplete, onComplete]);

  // Handle tap to skip
  const handleTapToSkip = () => {
    if (studioSessionCompleted) {
      return;
    }

    console.log('👆 DEBUG: Screen tapped - skipping to game title screen');
    // Immediately set both conditions to true
    setFirebaseComplete(true);
    setMinimumTimeComplete(true);
    firebaseSessionCompleted = true; // Also set module flag
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleTapToSkip}
      activeOpacity={1}
    >
      <Animated.View style={[styles.studioContainer, { opacity: fadeAnim }]}>
        <Image
          source={require('../../assets/images/studioLogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.studioName}>Ricksonian Institute</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginRight: 15,
  },
  studioName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: -45,
    fontFamily: 'La Machine Company 2',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
