import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PetInfo } from '../../src/constants/petData';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import TextWithEmojis from './TextWithEmojis';

interface AdoptionReadyModalProps {
  visible: boolean;
  pet: PetInfo;
  onEndGame: () => void;
  onContinue: () => void;
}

/**
 * Shown once per run when balance + stash first covers the adoption fee.
 * "Adopt Now" ends the run immediately (results screen scores it as a win and
 * unlocks the next level); "Keep Trading" dismisses it for the rest of the run.
 */
export default function AdoptionReadyModal({
  visible,
  pet,
  onEndGame,
  onContinue,
}: AdoptionReadyModalProps) {
  return (
    <FastModal
      visible={visible}
      onClose={onContinue}
      animationType="spring"
      backdropOpacity={0.6}
      modalStyle={styles.modal}
    >
      <PixelBorder
        borderColor="#d4a574"
        borderWidth={3}
        backgroundColor="#ffffff"
        innerPadding={0}
      >
        <View style={styles.content}>
          <Image
            source={pet.image}
            style={styles.petImage}
            resizeMode="contain"
          />
          <TextWithEmojis style={styles.title}>You did it! 🎉</TextWithEmojis>
          <TextWithEmojis style={styles.message} imageSize={12}>
            {`You've made enough money to adopt ${pet.name}!\n\nDo you want to go get them now, or keep trading to run up the score?`}
          </TextWithEmojis>

          <View style={styles.buttonContainer}>
            <PressableButton
              onPress={onEndGame}
              shadowColor="rgba(123,169,101,1)"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={5}
              elevation={8}
            >
              <PixelBorder
                borderColor="rgba(123,169,101,1)"
                borderWidth={3}
                backgroundColor="rgba(154,193,118,1)"
                innerPadding={0}
              >
                <View style={styles.confirmButtonInner}>
                  <Text style={styles.confirmButtonText}>Adopt Now</Text>
                </View>
              </PixelBorder>
            </PressableButton>

            <PressableButton
              onPress={onContinue}
              shadowColor="#6b5a2d"
              shadowOffset={{ width: 0, height: 3 }}
              shadowOpacity={0.4}
              shadowRadius={4}
              elevation={6}
            >
              <PixelBorder
                borderColor="#d1d5db"
                borderWidth={3}
                backgroundColor="#f3f4f6"
                innerPadding={0}
              >
                <View style={styles.cancelButtonInner}>
                  <Text style={styles.cancelButtonText}>Keep Trading</Text>
                </View>
              </PixelBorder>
            </PressableButton>
          </View>
        </View>
      </PixelBorder>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  petImage: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6b4423',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#8b4513',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  confirmButtonInner: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
});
