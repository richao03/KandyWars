import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useWallet } from '../../src/hooks/useWallet';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import TextWithEmojis from './TextWithEmojis';
import colors from '../../src/constants/colors';


interface StashMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const stashingTexts = [
  'You snuck into the sewers near your house, tied your money to a shoelace and carefully lowered it into the grate. The other end of the lace is tied to a small twig, and it rests atop the grate. I hope we see it tomorrow!',
  'Under the cover of darkness, you buried your cash in a small waterproof container beneath the old oak tree behind your garage. You marked it with three small rocks in a triangle pattern.',
  "You found a loose brick in the school's back wall. After checking no one was watching, you slipped your money inside and carefully replaced the brick. Your secret is safe... for now.",
  'In your bedroom closet, behind a stack of old board games, you created a false bottom in an old shoebox. Your money now rests safely beneath layers of tissue paper and forgotten memories.',
  'The abandoned lot near the corner store has an old mailbox that nobody checks anymore. You wrapped your cash in plastic and tucked it inside, hoping the mailman never comes back for it.',
  "Your piggy bank was getting too obvious. Instead, you taped the bills inside an old textbook cover - 'Advanced Algebra' seemed like the perfect place no one would ever look.",
  "Behind the loose panel in the school's janitor closet, where you discovered a small cavity last month, your money now waits in a zip-lock bag, surrounded by decades of dust and forgotten maintenance notes.",
];

export default function StashMoneyModal({
  visible,
  onClose,
  onConfirm,
}: StashMoneyModalProps) {
  const { balance, stashMoney } = useWallet();
  const [flavorText, setFlavorText] = useState('');
  const [stashAmount, setStashAmount] = useState('');

  useEffect(() => {
    if (visible) {
      const randomText =
        stashingTexts[Math.floor(Math.random() * stashingTexts.length)];
      setFlavorText(randomText);
    }
  }, [visible]);

  const handleConfirm = () => {
    const amount = parseFloat(stashAmount);
    if (amount > 0 && amount <= balance) {
      stashMoney(amount);
      onConfirm();
      onClose();
      setStashAmount('');
    }
  };

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="spring"
      backdropOpacity={0.6}
      modalStyle={styles.modal}
    >
      <>
        <TextWithEmojis style={styles.title}>
          💰 Stashing Your Money
        </TextWithEmojis>

        <View style={styles.storyContainer}>
          <Text style={styles.flavorText}>{flavorText}</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.balanceText}>
            Current Cash: ${balance.toFixed(2)}
          </Text>
          <Text style={styles.inputLabel}>Amount to stash:</Text>
          <TextInput
            style={styles.input}
            value={stashAmount}
            onChangeText={setStashAmount}
            placeholder="0.00"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        <View style={styles.buttonContainer}>
          <PressableButton
            onPress={handleConfirm}
            disabled={
              !stashAmount ||
              parseFloat(stashAmount) <= 0 ||
              parseFloat(stashAmount) > balance
            }
            shadowColor="rgba(123,169,101,1)"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={
              !stashAmount ||
              parseFloat(stashAmount) <= 0 ||
              parseFloat(stashAmount) > balance
                ? 0.2
                : 0.5
            }
            shadowRadius={5}
            elevation={8}
            style={[
              styles.confirmButton,
              (!stashAmount ||
                parseFloat(stashAmount) <= 0 ||
                parseFloat(stashAmount) > balance) &&
                styles.disabledButton,
            ]}
          >
            <PixelBorder
              borderColor="rgba(123,169,101,1)"
              borderWidth={3}
              backgroundColor="rgba(154,193,118,1)"
              innerPadding={0}
            >
              <View style={styles.confirmButtonInner}>
                <Image
                  source={require('../../assets/images/emojis/good.png')}
                  style={{
                    width: 24,
                    height: 24,
                    resizeMode: 'contain',
                    marginRight: 6,
                  }}
                />
                <Text style={styles.confirmText}>
                  Stash ${stashAmount || '0.00'}
                </Text>
              </View>
            </PixelBorder>
          </PressableButton>

          <PressableButton
            onPress={onClose}
            shadowColor="rgba(185,28,28,1)"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.5}
            shadowRadius={5}
            elevation={8}
            style={styles.cancelButton}
          >
            <PixelBorder
              borderColor="rgba(185,28,28,1)"
              borderWidth={3}
              backgroundColor="rgba(239,68,68,1)"
              innerPadding={0}
            >
              <View style={styles.cancelButtonInner}>
                <Text style={styles.cancelText}>Wait, I changed my mind</Text>
              </View>
            </PixelBorder>
          </PressableButton>
        </View>
      </>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: colors.gray.dark,
  },
  storyContainer: {
    backgroundColor: colors.offWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.green.success,
  },
  flavorText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
    fontStyle: 'italic',
  },
  buttonContainer: {
    gap: 12,
  },
  confirmButton: {
    width: '100%',
  },
  confirmButtonInner: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    color: '#ffffff',
  },
  cancelButton: {
    width: '100%',
  },
  cancelButtonInner: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    color: '#ffffff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  balanceText: {
    fontSize: 16,
    color: colors.gray.dark,
    marginBottom: 10,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: colors.gray.medium,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.offWhite,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
