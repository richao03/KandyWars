import React, { useEffect, useMemo } from 'react';
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import colors from '../../src/constants/colors';
import { GAME_TIPS } from '../../src/constants/gameTips';
import { useTabBar } from '../../src/hooks/useTabBar';
import PixelBorder from './PixelBorder';

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

  const randomTip = useMemo(() => {
    return GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];
  }, [visible]);

  useEffect(() => {
    if (visible) {
      hideTabBar();
      // Auto-dismiss after 2.5 seconds
      const timer = setTimeout(() => {
        showTabBar();
        onComplete();
      }, 2800);

      return () => {
        clearTimeout(timer);
        showTabBar();
      };
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <ImageBackground
        source={require('../../assets/images/schoolsOut.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.contentContainer}>
          <PixelBorder
            borderColor="#D2691E"
            borderWidth={4}
            backgroundColor="rgba(255, 140, 66, 0.95)"
            innerPadding={0}
          >
            <View style={styles.textBox}>
              <Text style={styles.text}>It&apos;s 3PM</Text>
              <Text style={styles.tapText}>Time to head home!</Text>
              <Text style={styles.tipText}>TIP: {randomTip}</Text>
            </View>
          </PixelBorder>
        </View>
      </ImageBackground>
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
    zIndex: 1000,
    elevation: 1000, // Android elevation
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
    minWidth: width * 0.6,
    maxWidth: width * 0.8,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  tapText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  tipText: {
    fontSize: 10,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.85,
  },
});
