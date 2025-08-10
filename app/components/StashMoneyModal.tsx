import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { useWallet } from '../../src/context/WalletContext';

interface StashMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const stashingTexts = [
  "You snuck into the sewers near your house, tied your money to a shoelace and carefully lowered it into the grate. The other end of the lace is tied to a small twig, and it rests atop the grate. I hope we see it tomorrow!",
  "Under the cover of darkness, you buried your cash in a small waterproof container beneath the old oak tree behind your garage. You marked it with three small rocks in a triangle pattern.",
  "You found a loose brick in the school's back wall. After checking no one was watching, you slipped your money inside and carefully replaced the brick. Your secret is safe... for now.",
  "In your bedroom closet, behind a stack of old board games, you created a false bottom in an old shoebox. Your money now rests safely beneath layers of tissue paper and forgotten memories.",
  "The abandoned lot near the corner store has an old mailbox that nobody checks anymore. You wrapped your cash in plastic and tucked it inside, hoping the mailman never comes back for it.",
  "Your piggy bank was getting too obvious. Instead, you taped the bills inside an old textbook cover - 'Advanced Algebra' seemed like the perfect place no one would ever look.",
  "Behind the loose panel in the school's janitor closet, where you discovered a small cavity last month, your money now waits in a zip-lock bag, surrounded by decades of dust and forgotten maintenance notes.",
];

export default function StashMoneyModal({ visible, onClose, onConfirm }: StashMoneyModalProps) {
  const { balance, stashMoney } = useWallet();
  const [flavorText, setFlavorText] = useState('');
  const [stashAmount, setStashAmount] = useState('');

  useEffect(() => {
    if (visible) {
      const randomText = stashingTexts[Math.floor(Math.random() * stashingTexts.length)];
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
    <Modal
      isVisible={visible}
      animationIn="fadeIn"
      animationOut="fadeOut"
      animationInTiming={300}
      animationOutTiming={200}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={200}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      style={styles.modalContainer}
    >
      <View style={styles.modal}>
          <Text style={styles.title}>💰 Stashing Your Money</Text>
          
          <View style={styles.storyContainer}>
            <Text style={styles.flavorText}>{flavorText}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.balanceText}>Current Cash: ${balance.toFixed(2)}</Text>
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
            <TouchableOpacity 
              style={[
                styles.confirmButton, 
                (!stashAmount || parseFloat(stashAmount) <= 0 || parseFloat(stashAmount) > balance) && styles.disabledButton
              ]} 
              onPress={handleConfirm}
              disabled={!stashAmount || parseFloat(stashAmount) <= 0 || parseFloat(stashAmount) > balance}
            >
              <Text style={styles.confirmText}>✅ Stash ${stashAmount || '0.00'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Wait, I changed my mind</Text>
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
    color: '#333',
  },
  storyContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
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
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  balanceText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});