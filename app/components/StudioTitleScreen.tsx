import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface StudioTitleScreenProps {
  onComplete?: () => void;
}

export default function StudioTitleScreen({
  onComplete,
}: StudioTitleScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      // After fade in completes, wait 1.5 seconds then fade out
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          // Call onComplete after fade out finishes
          if (onComplete) {
            onComplete();
          }
        });
      }, 1500);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.studioContainer, { opacity: fadeAnim }]}>
        <Image
          source={require('../../assets/images/studioLogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.studioName}>Ricksonian Institute</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    color: '#ffffff',
    marginLeft: -45,
    fontFamily: 'La Machine Company 2',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
