import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
    console.log('🎬 StoryModal useEffect - visible:', visible, 'level:', level);
    if (visible) {
      console.log('🎬 StoryModal starting fade in animation');
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
          title: "A Dream and a Pug",
          story: "You've always dreamed of having your very own pet, and you've fallen in love with the sweetest little Pug at the local pet store. The adoption fee is $5,000, which seems impossible on your small allowance.\n\nBut you've discovered that Sweetwood Elementary has a thriving candy trading economy! Students buy and sell treats between classes, and some kids are making serious money. Maybe if you're smart about it, you can earn enough to bring your Pug home.",
          dogImage: require('../../assets/images/doggs/pug.png'),
        };
      case 2:
        return {
          title: "The Brussels Griffon Bond",
          story: "There's an adorable Brussels Griffon at the pet rescue that needs a home, but the adoption costs and care expenses total $10,000. This sophisticated little dog deserves the best, and you're determined to provide it.\n\nYou've learned the basics of candy trading, but now you need to step up your game. The Brussels Griffon has been waiting for months, and you can't bear the thought of someone else adopting your future best friend.",
          dogImage: require('../../assets/images/doggs/brussleGriffon.png'),
        };
      case 3:
        return {
          title: "Saving for Eevee",
          story: "You've found the perfect companion - a playful mixed breed that the shelter staff nicknamed 'Eevee' because of its constantly changing energy levels. The adoption fee plus first-year care costs come to $15,000.\n\nEevee has been returned twice by families who couldn't handle its spirit, but you see its potential. You know that with patience and love, this dog could become your perfect partner. Time to get serious about the candy business.",
          dogImage: require('../../assets/images/doggs/evee.png'),
        };
      case 4:
        return {
          title: "The Byul Challenge",
          story: "At the premium pet boutique, you've met Byul - an elegant, rare breed that costs $20,000. This isn't just about wanting a pet anymore; Byul chose you, following you around the store and refusing to leave your side.\n\nThe store owner says Byul has never acted this way with anyone before. This is destiny, but destiny is expensive. You'll need to master every aspect of the school's candy market to afford your soulmate.",
          dogImage: require('../../assets/images/doggs/byul.png'),
        };
      case 5:
        return {
          title: "The Cane Corso Promise",
          story: "A majestic Cane Corso at the specialized rescue needs $25,000 for adoption plus specialized training. This powerful dog has a troubled past but an incredible capacity for loyalty - just like you always dreamed of.\n\nThe rescue coordinator believes you're the right match, but they need proof you can provide for such a demanding companion. Your candy trading skills will be put to the ultimate test, but the reward is a friendship that will last a lifetime.",
          dogImage: require('../../assets/images/doggs/caneCorso.png'),
        };
      case 6:
        return {
          title: "The Pitbull Promise",
          story: "There's a misunderstood Pitbull at the sanctuary who's been overlooked by every potential family. The rehabilitation and adoption costs total $30,000, but you see past the stigma to the gentle soul underneath.\n\nThis dog needs someone who believes in second chances - just like you believe in the power of determination. The candy market has become your battlefield, and victory means giving this deserving dog the loving home it's always needed.",
          dogImage: require('../../assets/images/doggs/pitbull.png'),
        };
      case 7:
        return {
          title: "The Afghan Hound Dream",
          story: "An exquisite Afghan Hound from a championship bloodline needs a new home after its elderly owner passed away. The adoption fee and specialized care requirements total $35,000, but this graceful creature has captured your heart completely.\n\nThis isn't just about having a pet - it's about preserving a legacy. The Afghan Hound represents everything you've worked toward: elegance, persistence, and the rewards of never giving up on your dreams.",
          dogImage: require('../../assets/images/doggs/afghan.png'),
        };
      case 8:
        return {
          title: "The German Shepherd Legacy",
          story: "A retired service German Shepherd needs $40,000 for adoption and lifetime care after its handler was injured. This noble dog served its country with honor and deserves a peaceful retirement with someone who understands loyalty and dedication.\n\nThis is the ultimate test of everything you've learned. The German Shepherd represents not just a pet, but a partner who has already proven its worth. Now it's time for you to prove yours through the most challenging candy trading campaign of your life.",
          dogImage: require('../../assets/images/doggs/germanShepard.png'),
        };
      default:
        return {
          title: "A Pet's Love",
          story: "Every great candy trader starts with a dream - and your dream is to give a loving home to a pet who needs you as much as you need them.",
          dogImage: require('../../assets/images/doggs/pug.png'),
        };
    }
  };

  const storyContent = getStoryContent(level);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Image source={storyContent.dogImage} style={styles.dogImage} />
            <Text style={styles.title}>{storyContent.title}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fef7e7',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#d4a574',
    shadowColor: '#8b4513',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
  },
  dogImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#d4a574',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6b4423',
    textAlign: 'center',
  },
});