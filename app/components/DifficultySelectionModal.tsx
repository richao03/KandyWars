import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { scoreboardService } from '../../src/services/firebase';
import { useAppSelector } from '../../src/store/hooks';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

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
  // Get won difficulties from Redux (which loads from Firebase on app start)
  const wonDifficultiesFromRedux = useAppSelector((state) => state.scoreboard.wonDifficulties);
  const [wonDifficulties, setWonDifficulties] = useState<number[]>([]);

  // Sync with Redux when modal opens
  useEffect(() => {
    if (visible) {
      console.log('🏆 DifficultyModal: Loading won difficulties from Redux:', wonDifficultiesFromRedux);
      setWonDifficulties(wonDifficultiesFromRedux);

      // Also fetch fresh data from Firebase in the background
      const fetchWonDifficulties = async () => {
        try {
          const won = await scoreboardService.getWonDifficulties();
          console.log('🏆 DifficultyModal: Fetched fresh won difficulties from Firebase:', won);
          if (JSON.stringify(won) !== JSON.stringify(wonDifficultiesFromRedux)) {
            console.log('🏆 DifficultyModal: Firebase data differs from Redux, updating...');
            setWonDifficulties(won);
          }
        } catch (error) {
          console.error('❌ Failed to fetch won difficulties:', error);
        }
      };
      fetchWonDifficulties();
    }
  }, [visible, wonDifficultiesFromRedux]);
  const levelOptions = [
    {
      level: 1,
      title: 'Level 1',
      petName: 'Pet Rock',
      piggyBank: 5000,
      image: require('../../assets/images/doggs/rock.png'),
      color: '#e8e8e8',
      borderColor: '#6a6a6a',
      textColor: '#3a3a3a',
    },
    {
      level: 2,
      title: 'Level 2',
      petName: 'Peg the Pug',
      piggyBank: 10000,
      image: require('../../assets/images/doggs/pug.png'),
      color: '#e8f5e8',
      borderColor: '#4a7c4a',
      textColor: '#2d5a2d',
    },
    {
      level: 3,
      title: 'Level 3',
      petName: 'Hamster',
      piggyBank: 20000,
      image: require('../../assets/images/doggs/hamster.png'),
      color: '#f5f0e8',
      borderColor: '#8a7c4a',
      textColor: '#6b5a2d',
    },
    {
      level: 4,
      title: 'Level 4',
      petName: 'Brussels Griffon',
      piggyBank: 25000,
      image: require('../../assets/images/doggs/brussleGriffon.png'),
      color: '#f0e8f5',
      borderColor: '#7c4a7c',
      textColor: '#5a2d5a',
    },
    {
      level: 5,
      title: 'Level 5',
      petName: 'Clownfish',
      piggyBank: 35000,
      image: require('../../assets/images/doggs/clownfish.png'),
      color: '#e8f0f5',
      borderColor: '#4a7c8a',
      textColor: '#2d5a6b',
    },
    {
      level: 6,
      title: 'Level 6',
      petName: 'Evee Cat',
      piggyBank: 45000,
      image: require('../../assets/images/doggs/evee.png'),
      color: '#e8f0f5',
      borderColor: '#4a7c8a',
      textColor: '#2d5a6b',
    },
    {
      level: 7,
      title: 'Level 7',
      petName: 'Chicken',
      piggyBank: 55000,
      image: require('../../assets/images/doggs/chicken.png'),
      color: '#f5f0e8',
      borderColor: '#8a7c4a',
      textColor: '#6b5a2d',
    },
    {
      level: 8,
      title: 'Level 8',
      petName: 'Byul Terrier',
      piggyBank: 60000,
      image: require('../../assets/images/doggs/byul.png'),
      color: '#f5f0e8',
      borderColor: '#8a7c4a',
      textColor: '#6b5a2d',
    },
    {
      level: 9,
      title: 'Level 9',
      petName: 'Parrot',
      piggyBank: 75000,
      image: require('../../assets/images/doggs/parrot.png'),
      color: '#e8f5e8',
      borderColor: '#4a7c4a',
      textColor: '#2d5a2d',
    },
    {
      level: 10,
      title: 'Level 10',
      petName: 'Cane Corso',
      piggyBank: 100000,
      image: require('../../assets/images/doggs/caneCorso.png'),
      color: '#f5e8e8',
      borderColor: '#8a4a4a',
      textColor: '#6b2d2d',
    },
    {
      level: 11,
      title: 'Level 11',
      petName: 'Bearded Dragon',
      piggyBank: 250000,
      image: require('../../assets/images/doggs/beardedDragon.png'),
      color: '#f5f0e8',
      borderColor: '#8a7c4a',
      textColor: '#6b5a2d',
    },
    {
      level: 12,
      title: 'Level 12',
      petName: 'Pitbull',
      piggyBank: 450000,
      image: require('../../assets/images/doggs/pitbull.png'),
      color: '#f0f5e8',
      borderColor: '#7c8a4a',
      textColor: '#5a6b2d',
    },
    {
      level: 13,
      title: 'Level 13',
      petName: 'Horse',
      piggyBank: 500000,
      image: require('../../assets/images/doggs/petHorse.png'),
      color: '#f0e8f5',
      borderColor: '#7c4a7c',
      textColor: '#5a2d5a',
    },
    {
      level: 14,
      title: 'Level 14',
      petName: 'Afghan Hound',
      piggyBank: 600000,
      image: require('../../assets/images/doggs/afghan.png'),
      color: '#e8e8f5',
      borderColor: '#4a4a8a',
      textColor: '#2d2d6b',
    },
    {
      level: 15,
      title: 'Level 15',
      petName: 'German Shepherd',
      piggyBank: 750000,
      image: require('../../assets/images/doggs/germanShepard.png'),
      color: '#f5f5f0',
      borderColor: '#8a8a7c',
      textColor: '#6b6b5a',
    },
    {
      level: 16,
      title: 'Level 16',
      petName: 'Dragon',
      piggyBank: 1000000,
      image: require('../../assets/images/doggs/dragon.png'),
      color: '#f5e8e8',
      borderColor: '#8a4a4a',
      textColor: '#6b2d2d',
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
      <PixelBorder borderColor={'#d4a574'} borderWidth={3} innerPadding={0}>
        <View style={styles.modalContent}>
          <View style={styles.innerContent}>
            <Text style={styles.title}>Choose your pet!</Text>
            <Text style={styles.subtitle}>Select your challenge level</Text>

            <PixelBorder
              borderColor={'#d4a574'}
              borderWidth={3}
              innerPadding={0}
              style={styles.scrollPixelBorder}
            >
              <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.optionsContainer}>
                  {levelOptions.map((option) => {
                    const isWon = wonDifficulties.includes(option.level);
                    return (
                      <PressableButton
                        key={option.level}
                        onPress={() => onSelectDifficulty(option.level)}
                        shadowColor={option.borderColor}
                        shadowOffset={{ width: 0, height: 3 }}
                        shadowOpacity={0.4}
                        shadowRadius={4}
                        elevation={6}
                        style={styles.pixelBorderWrapper}
                      >
                        <PixelBorder
                          borderColor={option.borderColor}
                          borderWidth={3}
                          backgroundColor={option.color}
                          innerPadding={0}
                        >
                          <View style={styles.difficultyButton}>
                            <View style={styles.buttonContent}>
                              <View style={styles.imageContainer}>
                                <Image
                                  source={option.image}
                                  style={styles.dogImage}
                                />
                              </View>
                              <View style={styles.textContent}>
                                <Text
                                  style={[
                                    styles.difficultyTitle,
                                    { color: option.textColor },
                                  ]}
                                >
                                  {option.petName}
                                </Text>
                                {isWon && (
                                  <Image
                                    source={require('../../assets/images/emojis/loveheart.png')}
                                    style={styles.heartIcon}
                                  />
                                )}
                                <Text
                                  style={[
                                    styles.piggyBankText,
                                    { color: option.textColor },
                                  ]}
                                >
                                  Adoption Fee: $
                                  {option.piggyBank.toLocaleString()}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </PixelBorder>
                      </PressableButton>
                    );
                  })}
                </View>
              </ScrollView>
            </PixelBorder>
            <PressableButton
              onPress={onClose}
              shadowColor="#666"
              shadowOffset={{ width: 0, height: 3 }}
              shadowOpacity={0.3}
              shadowRadius={4}
              elevation={5}
            >
              <PixelBorder
                borderColor="#ccc"
                borderWidth={2}
                backgroundColor="#f0f0f0"
                innerPadding={0}
              >
                <View style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
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
  modalContainer: {
    width: '95%',
    maxWidth: 500,
    maxHeight: '85%',
  },
  modalContent: {
    padding: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  innerContent: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    width: '100%',
    alignItems: 'center',
  },
  scrollPixelBorder: {
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  scrollContainer: {
    width: '100%',
    maxHeight: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'PixeloidMono',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: 15,
    marginVertical: 12,
  },
  pixelBorderWrapper: {
    marginBottom: 0,
  },
  difficultyButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  dogImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    resizeMode: 'contain',
  },
  heartIcon: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
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
    backgroundColor: 'transparent',
  },
  cancelText: {
    fontSize: 18,
    fontFamily: 'PixeloidMono',
    color: '#666',
    fontWeight: 'bold',
  },
});
