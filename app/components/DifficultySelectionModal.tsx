import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';

interface DifficultySelectionModalProps {
  visible: boolean;
  onSelectDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  onClose: () => void;
}

export default function DifficultySelectionModal({
  visible,
  onSelectDifficulty,
  onClose,
}: DifficultySelectionModalProps) {
  const difficultyOptions = [
    {
      key: 'easy' as const,
      title: 'Easy',
      description: 'Perfect for beginners',
      piggyBank: -5000,
      color: '#d4f6d4',
      borderColor: '#4a7c4a',
      textColor: '#2d5a2d',
    },
    {
      key: 'medium' as const,
      title: 'Medium',
      description: 'Balanced challenge',
      piggyBank: -10000,
      color: '#ffd6e8',
      borderColor: '#b85c8a',
      textColor: '#8a4a6b',
    },
    {
      key: 'hard' as const,
      title: 'Hard',
      description: 'For experienced players',
      piggyBank: -30000,
      color: '#d6e8ff',
      borderColor: '#5c7cb8',
      textColor: '#4a5a8a',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Choose Difficulty</Text>
          <Text style={styles.subtitle}>Select your starting challenge</Text>
          
          <View style={styles.optionsContainer}>
            {difficultyOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.difficultyButton,
                  {
                    backgroundColor: option.color,
                    borderColor: option.borderColor,
                  },
                ]}
                onPress={() => onSelectDifficulty(option.key)}
              >
                <Text style={[styles.difficultyTitle, { color: option.textColor }]}>
                  {option.title}
                </Text>
                <Text style={[styles.difficultyDescription, { color: option.textColor }]}>
                  {option.description}
                </Text>
                <Text style={[styles.piggyBankText, { color: option.textColor }]}>
                  Piggy Bank: ${option.piggyBank.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'DonGraffiti',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'CrayonPastel',
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: 15,
    marginBottom: 25,
  },
  difficultyButton: {
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderRadius: 15,
    borderWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  difficultyTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
    marginBottom: 5,
  },
  difficultyDescription: {
    fontSize: 16,
    fontFamily: 'CrayonPastel',
    marginBottom: 8,
    textAlign: 'center',
  },
  piggyBankText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ccc',
  },
  cancelText: {
    fontSize: 18,
    fontFamily: 'CrayonPastel',
    color: '#666',
    fontWeight: 'bold',
  },
});