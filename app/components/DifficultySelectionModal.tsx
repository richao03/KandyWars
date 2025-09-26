import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FastModal from './FastModal';

interface DifficultySelectionModalProps {
  visible: boolean;
  onSelectDifficulty: (level: number) => void;
  onClose: () => void;
}

export default function DifficultySelectionModal({
  visible,
  onSelectDifficulty,
  onClose,
}: DifficultySelectionModalProps) {
  const levelOptions = [
    {
      level: 1,
      title: 'Level 1',
      piggyBank: 5000,
      image: require('../../assets/images/doggs/pug.png'),
      color: '#e8f5e8',
      borderColor: '#4a7c4a',
      textColor: '#2d5a2d',
    },
    {
      level: 2,
      title: 'Level 2',
      piggyBank: 10000,
      image: require('../../assets/images/doggs/brussleGriffon.png'),
      color: '#f0e8f5',
      borderColor: '#7c4a7c',
      textColor: '#5a2d5a',
    },
    {
      level: 3,
      title: 'Level 3',
      piggyBank: 15000,
      image: require('../../assets/images/doggs/evee.png'),
      color: '#e8f0f5',
      borderColor: '#4a7c8a',
      textColor: '#2d5a6b',
    },
    {
      level: 4,
      title: 'Level 4',
      piggyBank: 20000,
      image: require('../../assets/images/doggs/byul.png'),
      color: '#f5f0e8',
      borderColor: '#8a7c4a',
      textColor: '#6b5a2d',
    },
    {
      level: 5,
      title: 'Level 5',
      piggyBank: 25000,
      image: require('../../assets/images/doggs/caneCorso.png'),
      color: '#f5e8e8',
      borderColor: '#8a4a4a',
      textColor: '#6b2d2d',
    },
    {
      level: 6,
      title: 'Level 6',
      piggyBank: 30000,
      image: require('../../assets/images/doggs/pitbull.png'),
      color: '#f0f5e8',
      borderColor: '#7c8a4a',
      textColor: '#5a6b2d',
    },
    {
      level: 7,
      title: 'Level 7',
      piggyBank: 35000,
      image: require('../../assets/images/doggs/afghan.png'),
      color: '#e8e8f5',
      borderColor: '#4a4a8a',
      textColor: '#2d2d6b',
    },
    {
      level: 8,
      title: 'Level 8',
      piggyBank: 40000,
      image: require('../../assets/images/doggs/germanShepard.png'),
      color: '#f5f5f0',
      borderColor: '#8a8a7c',
      textColor: '#6b6b5a',
    },
  ];

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="spring"
      backdropOpacity={0.7}
      modalStyle={styles.modalContainer}
    >
      <Text style={styles.title}>Choose your pet!</Text>
      <Text style={styles.subtitle}>Select your challenge level</Text>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.optionsContainer}>
          {levelOptions.map((option) => (
            <TouchableOpacity
              key={option.level}
              style={[
                styles.difficultyButton,
                {
                  backgroundColor: option.color,
                  borderColor: option.borderColor,
                },
              ]}
              onPress={() => onSelectDifficulty(option.level)}
            >
              <View style={styles.buttonContent}>
                <Image source={option.image} style={styles.dogImage} />
                <View style={styles.textContent}>
                  <Text
                    style={[
                      styles.difficultyTitle,
                      { color: option.textColor },
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={[styles.piggyBankText, { color: option.textColor }]}
                  >
                    Adaoption Fee: ${option.piggyBank.toLocaleString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    alignItems: 'center',
  },
  scrollContainer: {
    width: '100%',
    maxHeight: 400,
    borderWidth: 3,
    borderColor: '#d4a574',
    padding: 8,
    borderRadius: 10,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'PixeloidMono',
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
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dogImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 15,
    resizeMode: 'contain',
  },
  textContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  difficultyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    marginBottom: 5,
  },
  difficultyDescription: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    marginBottom: 5,
  },
  piggyBankText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
    color: '#666',
    fontWeight: 'bold',
  },
});
