import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PetInfo } from '../../src/constants/petData';
import { useAppSelector } from '../../src/store/hooks';
import { selectReduceMotion } from '../../src/store/slices/juiceSettingsSlice';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import TextWithEmojis from './TextWithEmojis';

interface PickUpPetButtonProps {
  pet: PetInfo;
  onPress: () => void;
}

/**
 * Featured "end the run now" card shown at the top of Settings once the
 * adoption fee is covered. Gold ticket look, bobbing pet, twinkling sparkles.
 */
export default function PickUpPetButton({
  pet,
  onPress,
}: PickUpPetButtonProps) {
  const reduceMotion = useAppSelector(selectReduceMotion);
  const bob = useSharedValue(0);
  const twinkle = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      bob.value = 0;
      twinkle.value = 1;
      return;
    }
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    twinkle.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  }, [reduceMotion, bob, twinkle]);

  const petStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -6 * bob.value },
      { rotate: `${-4 + 8 * bob.value}deg` },
    ],
  }));
  const sparkleLeft = useAnimatedStyle(() => ({ opacity: twinkle.value }));
  const sparkleRight = useAnimatedStyle(() => ({
    opacity: 1.35 - twinkle.value,
  }));

  return (
    <PressableButton
      onPress={onPress}
      shadowColor="#b8860b"
      shadowOffset={{ width: 0, height: 5 }}
      shadowOpacity={0.45}
      shadowRadius={6}
      elevation={10}
      style={styles.wrapper}
    >
      <PixelBorder
        borderColor="#b8860b"
        borderWidth={4}
        backgroundColor="#ffd75e"
        innerPadding={0}
      >
        <View style={styles.inner}>
          <Animated.Text
            style={[styles.sparkle, styles.sparkleTL, sparkleLeft]}
          >
            ✦
          </Animated.Text>
          <Animated.Text
            style={[styles.sparkle, styles.sparkleBR, sparkleRight]}
          >
            ✦
          </Animated.Text>

          <View style={styles.petFrame}>
            <Animated.View style={petStyle}>
              <Image
                source={pet.image}
                style={styles.petImage}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          <View style={styles.textCol}>
            <Text style={styles.kicker}>ADOPTION FEE COVERED</Text>
            <TextWithEmojis style={styles.title} imageSize={18}>
              {`Go pick up ${pet.name}! 🎉`}
            </TextWithEmojis>
            <Text style={styles.subtitle}>
              End the run now, bring your pet home, and unlock the next level.
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </View>
      </PixelBorder>
    </PressableButton>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    overflow: 'hidden',
  },
  sparkle: {
    position: 'absolute',
    color: '#fff8dc',
    fontSize: 18,
    textShadowColor: '#b8860b',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  sparkleTL: { top: 4, left: 8 },
  sparkleBR: { bottom: 4, right: 30, fontSize: 14 },
  petFrame: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff3c4',
    borderWidth: 3,
    borderColor: '#b8860b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petImage: {
    width: 56,
    height: 56,
  },
  textCol: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#8a5a00',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5a3a00',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#7a5200',
  },
  chevron: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8a5a00',
    marginLeft: 2,
  },
});
