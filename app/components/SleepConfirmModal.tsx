import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import TextWithEmojis from './TextWithEmojis';

interface SleepConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  currentDay: number;
}

export default function SleepConfirmModal({
  visible,
  onConfirm,
  onCancel,
  currentDay,
}: SleepConfirmModalProps) {
  return (
    <FastModal
      visible={visible}
      onClose={onCancel}
      animationType="spring"
      backdropOpacity={0.7}
      modalStyle={styles.modalContainer}
    >
      <PixelBorder
        borderColor="#2d3561"
        borderWidth={3}
        backgroundColor="#1a1f36"
        innerPadding={0}
      >
        <View style={styles.modalContent}>
          <Image
            source={require('../../assets/images/emojis/moon.png')}
            style={styles.moonImage}
          />
          <Text style={styles.title}>Ready for Bed?</Text>
          <Text style={styles.subtitle}>
            End Day {currentDay} and start Day {currentDay + 1}?
          </Text>

          <Text style={styles.warningText}>
            Make sure you've done everything you wanted today!
          </Text>

          <PixelBorder
            borderColor="rgba(255, 255, 255, 0.3)"
            borderWidth={3}
            backgroundColor="rgba(255, 255, 255, 0.1)"
            innerPadding={0}
            style={styles.checklistBorder}
          >
            <View style={styles.checklist}>
              <Text style={styles.checklistItem}>• Sold all your candy?</Text>
              <Text style={styles.checklistItem}>• Stashed your money?</Text>
              <Text style={styles.checklistItem}>• Studied your subjects?</Text>
              <Text style={styles.checklistItem}>• Visited the deli?</Text>
            </View>
          </PixelBorder>

          <View style={styles.buttonContainer}>
            <PixelBorder
              borderColor="#3a7bc8"
              borderWidth={3}
              backgroundColor="#4a90e2"
              innerPadding={0}
            >
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={onConfirm}
              >
                <TextWithEmojis style={styles.confirmButtonText}>
                  Yes, Go to Sleep
                </TextWithEmojis>
              </TouchableOpacity>
            </PixelBorder>

            <PixelBorder
              borderColor="rgba(255, 255, 255, 0.3)"
              borderWidth={3}
              backgroundColor="rgba(255, 255, 255, 0.2)"
              innerPadding={0}
            >
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <TextWithEmojis style={styles.cancelButtonText}>
                  Not Yet!
                </TextWithEmojis>
              </TouchableOpacity>
            </PixelBorder>
          </View>
        </View>
      </PixelBorder>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  modalContent: {
    padding: 24,
  },
  moonImage: {
    width: 48,
    height: 48,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#ffffff',
    borderRadius: 20,
    fontFamily: 'PixeloidMono',
    textShadowColor: '#4a90e2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#a8b2d1',
    marginBottom: 20,
    fontFamily: 'PixeloidMono',
  },
  warningText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ffd700',
    marginBottom: 16,
    fontStyle: 'italic',
    fontFamily: 'PixeloidMono',
  },
  checklistBorder: {
    marginBottom: 24,
  },
  checklist: {
    padding: 16,
  },
  checklistItem: {
    fontSize: 15,
    color: '#e6e6e6',
    marginBottom: 8,
    fontFamily: 'PixeloidMono',
  },
  buttonContainer: {
    gap: 12,
  },
  confirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
});
