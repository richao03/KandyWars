import React, { useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GAME_TIPS } from '../../src/constants/gameTips';
import { useTabBar } from '../../src/hooks/useTabBar';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';

interface GoingToSchoolModalProps {
  visible: boolean;
  allowanceAmount?: number;
  onComplete: () => void;
  guaranteedEventWarnings?: string[]; // Array of warning messages for guaranteed events
}

const { width, height } = Dimensions.get('window');

export default function GoingToSchoolModal({
  visible,
  allowanceAmount,
  onComplete,
  guaranteedEventWarnings = [],
}: GoingToSchoolModalProps) {
  const { hideTabBar, showTabBar } = useTabBar();
  const hasSetTimer = useRef(false); // Track if timer has been set for this modal opening

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

  const randomTip = useMemo(() => {
    return GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];
  }, [visible]);

  useEffect(() => {
    if (visible && !hasSetTimer.current) {
      hideTabBar();
      hasSetTimer.current = true;

      // Auto-dismiss after 2.8 seconds
      const timer = setTimeout(() => {
        showTabBar();
        hasSetTimer.current = false; // Reset for next time modal opens
        onComplete();
      }, 2800);

      return () => {
        clearTimeout(timer);
        showTabBar();
      };
    }

    if (!visible) {
      // Reset the timer flag when modal is hidden
      hasSetTimer.current = false;
      showTabBar();
    }
  }, [visible]); // Only depend on visible to prevent re-triggering from parent re-renders

  return (
    <FastModal
      visible={visible}
      onClose={undefined}
      animationType="spring"
      backdropOpacity={1}
      modalStyle={styles.container}
    >
      <ImageBackground
        source={require('../../assets/images/goingToSchool.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.contentContainer}>
          <PixelBorder
            borderColor="#8B4513"
            borderWidth={4}
            backgroundColor="rgba(255, 228, 181, 0.95)"
            innerPadding={0}
          >
            <View style={styles.textBox}>
              {allowanceAmount && (
                <Text style={styles.allowanceText}>
                  Received ${allowanceAmount.toFixed(2)} for allowance for the
                  day! Yay!
                </Text>
              )}

              {guaranteedEventWarnings.length > 0 && (
                <>
                  {guaranteedEventWarnings.map((warning, index) => (
                    <Text key={index} style={styles.warningText}>
                      {warning}
                    </Text>
                  ))}
                </>
              )}

              <Text style={styles.text}>{randomNewDayText}</Text>
              <Text style={styles.tipText}>TIP: {randomTip}</Text>
            </View>
          </PixelBorder>
        </View>
      </ImageBackground>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
  },
  backgroundImage: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  textBox: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width * 0.8,
    maxWidth: width * 0.9,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B4513', // Saddle brown for good contrast on warm background
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  allowanceText: {
    paddingHorizontal: 8,
    marginBottom: 16,
    fontSize: 22,
    fontWeight: '600',
    color: '#2E8B57', // Sea green for money/positive message
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  warningText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC143C', // Crimson red for warnings
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    borderRadius: 8,
  },
  tipText: {
    fontSize: 10,
    color: '#6B3A1F',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.85,
  },
});
