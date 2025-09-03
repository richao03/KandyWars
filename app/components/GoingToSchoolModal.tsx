import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View, Dimensions } from 'react-native';
import { useTabBar } from '../../src/context/TabBarContext';

interface GoingToSchoolModalProps {
  visible: boolean;
  onComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export default function GoingToSchoolModal({ visible, onComplete }: GoingToSchoolModalProps) {
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
  }, [visible, onComplete, hideTabBar, showTabBar]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/goingToSchool.png')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.text}>Time for school!</Text>
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
    backgroundColor: '#FFE4B5', // Warm morning/sunrise background
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
    fontSize: 24,
    fontWeight: '700',
    color: '#8B4513', // Saddle brown for good contrast on warm background
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});