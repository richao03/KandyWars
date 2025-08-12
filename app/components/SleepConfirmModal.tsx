import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';

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
  currentDay
}: SleepConfirmModalProps) {
  return (
    <Modal
      isVisible={visible}
      animationIn="bounceIn"
      animationOut="fadeOut"
      animationInTiming={400}
      animationOutTiming={200}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={200}
      onBackdropPress={onCancel}
      onBackButtonPress={onCancel}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      style={styles.modalContainer}
    >
      <View style={styles.modal}>
        <Text style={styles.moonEmoji}>🌙</Text>
        <Text style={styles.title}>Ready for Bed?</Text>
        <Text style={styles.subtitle}>
          End Day {currentDay} and start Day {currentDay + 1}?
        </Text>
        
        <Text style={styles.warningText}>
          Make sure you've done everything you wanted today!
        </Text>

        <View style={styles.checklist}>
          <Text style={styles.checklistItem}>• Sold all your candy?</Text>
          <Text style={styles.checklistItem}>• Stashed your money?</Text>
          <Text style={styles.checklistItem}>• Studied your subjects?</Text>
          <Text style={styles.checklistItem}>• Visited the deli?</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
            <Text style={styles.confirmButtonText}>😴 Yes, Go to Sleep</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>🔙 Not Yet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    margin: 20,
  },
  modal: {
    backgroundColor: '#1a1f36', // Night-time dark blue
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#2d3561', // Darker blue border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  moonEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#4a90e2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#a8b2d1',
    marginBottom: 20,
    fontFamily: 'CrayonPastel',
  },
  warningText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ffd700',
    marginBottom: 16,
    fontStyle: 'italic',
    fontFamily: 'CrayonPastel',
  },
  checklist: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  checklistItem: {
    fontSize: 15,
    color: '#e6e6e6',
    marginBottom: 8,
    fontFamily: 'CrayonPastel',
  },
  buttonContainer: {
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#3a7bc8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
  },
});