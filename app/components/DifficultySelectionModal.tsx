import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import colors from '../../src/constants/colors';
import { formatNumber } from '../../src/utils/priceUtils';
import { scoreboardService } from '../../src/services/firebase';
import { useAppSelector } from '../../src/store/hooks';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import ScrollViewWithFade from './ScrollViewWithFade';

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
  const wonDifficultiesFromRedux = useAppSelector(
    (state) => state.scoreboard.wonDifficulties
  );
  const [wonDifficulties, setWonDifficulties] = useState<number[]>([]);

  // Sync with Redux when modal opens
  useEffect(() => {
    if (visible) {
      if (__DEV__) {
        console.log(
          '🏆 DifficultyModal: Loading won difficulties from Redux:',
          wonDifficultiesFromRedux
        );
      }
      setWonDifficulties(wonDifficultiesFromRedux);

      // Also check cache (already loaded at app start)
      const checkCachedWonDifficulties = () => {
        const won = scoreboardService.getWonDifficulties();
        if (__DEV__) {
          console.log(
            '🏆 DifficultyModal: Got won difficulties from cache:',
            won
          );
        }
        if (JSON.stringify(won) !== JSON.stringify(wonDifficultiesFromRedux)) {
          if (__DEV__) {
            console.log(
              '🏆 DifficultyModal: Cache data differs from Redux, updating...'
            );
          }
          setWonDifficulties(won);
        }
      };
      checkCachedWonDifficulties();
    }
  }, [visible, wonDifficultiesFromRedux]);

  // Determine if a difficulty level is unlocked
  const isDifficultyUnlocked = (level: number): boolean => {
    if (level === 1) return true; // Level 1 is always unlocked
    return wonDifficulties.includes(level - 1); // Must have beaten previous level
  };

  const levelOptions = [
    {
      level: 1,
      title: 'Level 1',
      petName: 'Pet Rock',
      piggyBank: 5000,
      image: require('../../assets/images/doggs/rock.png'),
      color: '#fffbf5', // Vanilla Cream
      borderColor: '#e8d5c4',
      textColor: '#9d8472',
    },
    {
      level: 2,
      title: 'Level 2',
      petName: 'Peg the Pug',
      piggyBank: 10000,
      image: require('../../assets/images/doggs/pug.png'),
      color: '#fffacd', // Lemon Meringue
      borderColor: '#ffe55c',
      textColor: '#cc9900',
    },
    {
      level: 3,
      title: 'Level 3',
      petName: 'Hamster',
      piggyBank: 20000,
      image: require('../../assets/images/doggs/hamster.png'),
      color: '#fff9b3', // Banana Taffy
      borderColor: '#ffeb3b',
      textColor: '#d4af37',
    },
    {
      level: 4,
      title: 'Level 4',
      petName: 'Brussels Griffon',
      piggyBank: 25000,
      image: require('../../assets/images/doggs/brussleGriffon.png'),
      color: '#ffdab9', // Peach Sorbet
      borderColor: '#ffb380',
      textColor: '#cc6633',
    },
    {
      level: 5,
      title: 'Level 5',
      petName: 'Clownfish',
      piggyBank: 35000,
      image: require('../../assets/images/doggs/clownfish.png'),
      color: '#ffc299', // Orange Creamsicle
      borderColor: '#ff9955',
      textColor: '#e65c00',
    },
    {
      level: 6,
      title: 'Level 6',
      petName: 'Evee Cat',
      piggyBank: 45000,
      image: require('../../assets/images/doggs/evee.png'),
      color: '#ffb3b3', // Coral Candy
      borderColor: '#ff8080',
      textColor: '#cc3333',
    },
    {
      level: 7,
      title: 'Level 7',
      petName: 'Chicken',
      piggyBank: 55000,
      image: require('../../assets/images/doggs/chicken.png'),
      color: '#ffc0cb', // Strawberry Milk
      borderColor: '#ff91a4',
      textColor: '#d6577a',
    },
    {
      level: 8,
      title: 'Level 8',
      petName: 'Byul Terrier',
      piggyBank: 60000,
      image: require('../../assets/images/doggs/byul.png'),
      color: '#ffb3d9', // Bubblegum
      borderColor: '#ff85c0',
      textColor: '#cc4a8a',
    },
    {
      level: 9,
      title: 'Level 9',
      petName: 'Parrot',
      piggyBank: 75000,
      image: require('../../assets/images/doggs/parrot.png'),
      color: '#ffa3cc', // Cherry Blossom
      borderColor: '#ff6bb3',
      textColor: '#cc2a6f',
    },
    {
      level: 10,
      title: 'Level 10',
      petName: 'Cane Corso',
      piggyBank: 100000,
      image: require('../../assets/images/doggs/caneCorso.png'),
      color: '#e6d5ff', // Lavender Taffy
      borderColor: '#c79fff',
      textColor: '#8e44cc',
    },
    {
      level: 11,
      title: 'Level 11',
      petName: 'Bearded Dragon',
      piggyBank: 250000,
      image: require('../../assets/images/doggs/beardedDragon.png'),
      color: '#d9b3ff', // Grape Soda
      borderColor: '#b366ff',
      textColor: '#7700cc',
    },
    {
      level: 12,
      title: 'Level 12',
      petName: 'Pitbull',
      piggyBank: 450000,
      image: require('../../assets/images/doggs/pitbull.png'),
      color: '#ccddff', // Periwinkle Dream
      borderColor: '#99bbff',
      textColor: '#3366cc',
    },
    {
      level: 13,
      title: 'Level 13',
      petName: 'Horse',
      piggyBank: 500000,
      image: require('../../assets/images/doggs/petHorse.png'),
      color: '#b3d9ff', // Blueberry Ice
      borderColor: '#66b3ff',
      textColor: '#0066cc',
    },
    {
      level: 14,
      title: 'Level 14',
      petName: 'Afghan Hound',
      piggyBank: 600000,
      image: require('../../assets/images/doggs/afghan.png'),
      color: '#b3e6ff', // Cotton Candy Sky
      borderColor: '#66d4ff',
      textColor: '#0099cc',
    },
    {
      level: 15,
      title: 'Level 15',
      petName: 'German Shepherd',
      piggyBank: 750000,
      image: require('../../assets/images/doggs/germanShepard.png'),
      color: '#b3f0d9', // Mint Ice Cream
      borderColor: '#66e0b8',
      textColor: '#00a372',
    },
    {
      level: 16,
      title: 'Level 16',
      petName: 'Dragon',
      piggyBank: 1000000,
      image: require('../../assets/images/doggs/dragon.png'),
      color: '#ffe6f0', // Rainbow Swirl
      borderColor: '#ff80bf',
      textColor: '#ff1493',
    },
  ];

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="spring"
      backdropOpacity={0.7}
      modalStyle={styles.modalContainer}
      preMount
    >
      <PixelBorder borderColor={'#d4a574'} borderWidth={3} innerPadding={0}>
        <View style={styles.modalContent}>
          <View style={styles.innerContent}>
            <Text style={styles.title}>Choose your pet!</Text>
            <Text style={styles.subtitle}>Select your challenge level</Text>

            <PixelBorder
              borderColor={colors.brown.secondary}
              borderWidth={0}
              innerPadding={0}
              style={styles.scrollPixelBorder}
            >
              <ScrollViewWithFade
                fadeColor={'#ffffff'}
                fadeHeight={12}
                style={styles.scrollContainer}
              >
                <View style={styles.optionsContainer}>
                  {levelOptions.map((option) => {
                    const isWon = wonDifficulties.includes(option.level);
                    const isUnlocked = isDifficultyUnlocked(option.level);
                    return (
                      <PressableButton
                        key={option.level}
                        onPress={() => {
                          if (isUnlocked) {
                            onSelectDifficulty(option.level);
                          }
                        }}
                        shadowColor={option.borderColor}
                        shadowOffset={{ width: 0, height: 3 }}
                        shadowOpacity={isUnlocked ? 0.4 : 0.1}
                        shadowRadius={4}
                        elevation={isUnlocked ? 6 : 2}
                        style={styles.pixelBorderWrapper}
                        disabled={!isUnlocked}
                      >
                        <PixelBorder
                          borderColor={option.borderColor}
                          borderWidth={3}
                          backgroundColor={option.color}
                          innerPadding={0}
                        >
                          <View
                            style={[
                              styles.difficultyButton,
                              !isUnlocked && styles.lockedButton,
                            ]}
                          >
                            <View style={styles.buttonContent}>
                              <View style={styles.imageContainer}>
                                <Image
                                  source={option.image}
                                  style={[
                                    styles.dogImage,
                                    !isUnlocked && styles.lockedImage,
                                  ]}
                                />
                                {!isUnlocked && (
                                  <View style={styles.lockOverlay}>
                                    <Image
                                      source={require('../../assets/images/emojis/lock.png')}
                                      style={styles.lockIcon}
                                    />
                                  </View>
                                )}
                              </View>
                              <View style={styles.textContent}>
                                <Text
                                  style={[
                                    styles.difficultyTitle,
                                    { color: option.textColor },
                                    !isUnlocked && styles.lockedText,
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
                                    !isUnlocked && styles.lockedText,
                                  ]}
                                >
                                  {isUnlocked
                                    ? `Adoption Fee: $${formatNumber(option.piggyBank)}`
                                    : `Beat Level ${option.level - 1} to unlock`}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </PixelBorder>
                      </PressableButton>
                    );
                  })}
                </View>
              </ScrollViewWithFade>
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
    overflow: 'hidden',
    borderRadius: 12,
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
  lockedButton: {
    opacity: 0.5,
  },
  lockedImage: {
    opacity: 0.3,
  },
  lockedText: {
    opacity: 0.6,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
  },
  lockIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
});
