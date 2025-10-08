import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';

interface StoryModalProps {
  visible: boolean;
  level: number;
  onContinue: () => void;
}

export default function StoryModal({
  visible,
  level,
  onContinue,
}: StoryModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        // After fade in, wait 3 seconds then fade out
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }).start(() => {
            // Call onContinue after fade out completes
            onContinue();
          });
        }, 3000);
      });
    }
  }, [visible, fadeAnim, onContinue]);
  const getStoryContent = (level: number) => {
    switch (level) {
      case 1:
        return {
          title: 'Your First Companion',
          petImage: require('../../assets/images/doggs/rock.png'),
        };
      case 2:
        return {
          title: 'A Pug and a Dream',
          petImage: require('../../assets/images/doggs/pug.png'),
        };
      case 3:
        return {
          title: 'The Hamster Adventure',
          petImage: require('../../assets/images/doggs/hamster.png'),
        };
      case 4:
        return {
          title: 'The Brussels Griffon Bond',
          petImage: require('../../assets/images/doggs/brussleGriffon.png'),
        };
      case 5:
        return {
          title: 'Searching for Clownfish',
          petImage: require('../../assets/images/doggs/clownfish.png'),
        };
      case 6:
        return {
          title: 'Eevee 4 Ever',
          petImage: require('../../assets/images/doggs/evee.png'),
        };
      case 7:
        return {
          title: "You're being followed!",
          petImage: require('../../assets/images/doggs/chicken.png'),
        };
      case 8:
        return {
          title: 'The Shining Byul',
          petImage: require('../../assets/images/doggs/byul.png'),
        };
      case 9:
        return {
          title: 'You Talking to Me?',
          petImage: require('../../assets/images/doggs/parrot.png'),
        };
      case 10:
        return {
          title: 'Never Laughed',
          petImage: require('../../assets/images/doggs/caneCorso.png'),
        };
      case 11:
        return {
          title: "Don't Call Me a Lizard",
          petImage: require('../../assets/images/doggs/beardedDragon.png'),
        };
      case 12:
        return {
          title: 'The Pitbull Promise',
          petImage: require('../../assets/images/doggs/pitbull.png'),
        };
      case 13:
        return {
          title: 'A Horse of Course',
          petImage: require('../../assets/images/doggs/petHorse.png'),
        };
      case 14:
        return {
          title: 'The Afghan Hound Dream',
          petImage: require('../../assets/images/doggs/afghan.png'),
        };
      case 15:
        return {
          title: 'The German Shepherd Legacy',
          petImage: require('../../assets/images/doggs/germanShepard.png'),
        };
      case 16:
        return {
          title: 'The Dragon Quest',
          petImage: require('../../assets/images/doggs/dragon.png'),
        };
      default:
        return {
          title: "A Pet's Love",
          petImage: require('../../assets/images/doggs/rock.png'),
        };
    }
  };

  const storyContent = getStoryContent(level);

  return (
    <FastModal
      visible={visible}
      onClose={undefined}
      animationType="spring"
      backdropOpacity={0.8}
      modalStyle={styles.modalContainer}
    >
      <PixelBorder borderWidth={3} borderColor="#d4a574">
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.header}>
            <Image source={storyContent.petImage} style={styles.petImage} />
            <Text style={styles.title}>{storyContent.title}</Text>
          </View>
        </Animated.View>
      </PixelBorder>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#fef7e7',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',

    shadowColor: '#8b4513',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
  },
  petImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#d4a574',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6b4423',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
});
