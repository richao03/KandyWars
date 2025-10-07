import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { useTabBar } from '../../src/hooks/useTabBar';
import colors from '../../src/constants/colors';


interface SchoolsOutModalProps {
  visible: boolean;
  onComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export default function SchoolsOutModal({
  visible,
  onComplete,
}: SchoolsOutModalProps) {
  const { hideTabBar, showTabBar } = useTabBar();

  useEffect(() => {
    if (visible) {
      hideTabBar();
      // Auto-dismiss after 2.5 seconds
      const timer = setTimeout(() => {
        showTabBar();
        onComplete();
      }, 2500);

      return () => {
        clearTimeout(timer);
        showTabBar();
      };
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/schoolsOut.png')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.text}>It's 3PM</Text>
        <Text style={styles.tapText}>Time to head home!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF8C42', // Warm orange to match the schoolsOut.png
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1000, // Android elevation
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: height,
  },
  image: {
    width: width * 0.9,
    height: height * 0.7,
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white, // White text for good contrast on orange
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 20,
  },
  tapText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
