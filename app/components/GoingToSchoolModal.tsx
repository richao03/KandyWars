import React, { useEffect, useMemo } from 'react';
import { Dimensions, Image, StyleSheet, Text } from 'react-native';
import { useTabBar } from '../../src/hooks/useTabBar';
import FastModal from './FastModal';

interface GoingToSchoolModalProps {
  visible: boolean;
  allowanceAmount?: number;
  onComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export default function GoingToSchoolModal({
  visible,
  allowanceAmount,
  onComplete,
}: GoingToSchoolModalProps) {
  const { hideTabBar, showTabBar } = useTabBar();

  // NEW_DAY flavor text array
  const newDayTexts = [
    'New day, new sugar rush.',
    'You zip up your backpack. Time to hustle.',
    'New day, same kingpin',
  ];

  // Pick a random text from the NEW_DAY array
  const randomNewDayText = useMemo(() => {
    return newDayTexts[Math.floor(Math.random() * newDayTexts.length)];
  }, [visible]); // Re-randomize when modal becomes visible

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
  }, [visible]); // Only depend on visible to prevent infinite loops

  return (
    <FastModal
      visible={visible}
      onClose={undefined}
      animationType="spring"
      backdropOpacity={1}
      modalStyle={styles.container}
    >
      <Image
        source={require('../../assets/images/goingToSchool.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.text}>{randomNewDayText}</Text>
      {allowanceAmount && (
        <Text style={styles.allowanceText}>
          Received ${allowanceAmount.toFixed(2)} for allowance for the day! Yay!
        </Text>
      )}
    </FastModal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFE4B5', // Warm morning/sunrise background
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
    fontSize: 12,
    fontWeight: '700',
    color: '#8B4513', // Saddle brown for good contrast on warm background
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  allowanceText: {
    paddingHorizontal: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#2E8B57', // Sea green for money/positive message
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 12,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
