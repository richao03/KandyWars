import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import { Alert, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GameHUD from '../components/GameHUD';
import { useFlavorText } from '../context/FlavorTextContext';
import { useGame } from '../context/GameContext';
import { useWallet } from '../context/WalletContext';

export default function PiggyBankPage() {
  const { balance, stashedAmount, stashMoney, withdrawFromStash } = useWallet();
  const { day, period } = useGame();
  const { setEvent } = useFlavorText();
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState(0);

  // Set piggy bank flavor text when component loads
  useEffect(() => {
    setEvent('PIGGY_BANK');
  }, [setEvent]);

  const maxAmount = mode === 'deposit' ? balance : stashedAmount;

  const handleTransaction = () => {
    if (amount <= 0) {
      Alert.alert('Invalid Amount', 'Please select an amount greater than 0');
      return;
    }

    const success = mode === 'deposit' 
      ? stashMoney(amount)
      : withdrawFromStash(amount);

    if (success) {
      Alert.alert(
        mode === 'deposit' ? '💰 Money Stashed!' : '💸 Money Withdrawn!',
        mode === 'deposit' 
          ? `You've safely stashed $${amount.toFixed(2)} in your piggy bank!`
          : `You've withdrawn $${amount.toFixed(2)} from your piggy bank!`,
        [{ text: 'OK', onPress: () => setAmount(0) }]
      );
    }
  };


  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/piggy-bank.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <GameHUD 
          theme="evening"
          customHeaderText={`After School - Day ${day}`}
          customLocationText="Piggy Bank"
        />

        <View style={styles.content}>
        {/* Piggy Bank Visual */}
        <View style={styles.piggyBankContainer}>
          <View style={styles.piggyBankInfo}>
            <Text style={styles.piggyBankLabel}>Stashed Away</Text>
            <Text style={styles.piggyBankAmount}>${stashedAmount.toFixed(2)}</Text>
          </View>
        </View>


        {/* Mode Selector */}
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'deposit' && styles.modeButtonActive]}
            onPress={() => {
              setMode('deposit');
              setAmount(0);
            }}
          >
            <Text style={[styles.modeButtonText, mode === 'deposit' && styles.modeButtonTextActive]}>
              💰 Deposit
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modeButton, mode === 'withdraw' && styles.modeButtonActive]}
            onPress={() => {
              setMode('withdraw');
              setAmount(0);
            }}
          >
            <Text style={[styles.modeButtonText, mode === 'withdraw' && styles.modeButtonTextActive]}>
              💸 Withdraw
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Selector */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>
            {mode === 'deposit' ? 'Amount to Deposit' : 'Amount to Withdraw'}
          </Text>
          
          <View style={styles.amountDisplay}>
            <Text style={[
              styles.amountValue,
              { color: mode === 'deposit' ? '#ef4444' : '#22c55e' }
            ]}>
              ${amount.toFixed(2)}
            </Text>
            <Text style={styles.maxAmount}>
              Max: ${maxAmount.toFixed(2)}
            </Text>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={maxAmount}
            step={0.01}
            value={amount}
            onValueChange={setAmount}
            minimumTrackTintColor={mode === 'deposit' ? '#ef4444' : '#22c55e'}
            maximumTrackTintColor="#ccc"
          />

        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: mode === 'deposit' ? '#ef4444' : '#22c55e' },
            amount === 0 && styles.actionButtonDisabled
          ]}
          onPress={handleTransaction}
          disabled={amount === 0}
        >
          <Text style={styles.actionButtonText}>
            {mode === 'deposit' ? '💰 Deposit Money' : '💸 Withdraw Money'}
          </Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          {mode === 'deposit' 
            ? '💡 Tip: Stashing money keeps it safe from market losses!'
            : '💡 Tip: Withdraw money when you spot good trading opportunities!'}
        </Text>
      </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a1845',
  },
  backgroundImage: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  piggyBankContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(247, 233, 142, 0.8)',
  },
  piggyBankInfo: {
    alignItems: 'center',
  },
  piggyBankLabel: {
    fontSize: 16,
    color: '#b8a9c9',
    fontFamily: 'CrayonPastel',
    marginBottom: 5,
  },
  piggyBankAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f7e98e',
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(247, 233, 142, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  balanceContainer: {
    backgroundColor: 'rgba(184, 169, 201, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#b8a9c9',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#b8a9c9',
    fontFamily: 'CrayonPastel',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderColor: '#f7e98e',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b8a9c9',
    fontFamily: 'CrayonPastel',
  },
  modeButtonTextActive: {
    color: '#f7e98e',
  },
  amountSection: {
    backgroundColor: 'rgba(93, 76, 112, 0.4)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#5d4c70',
  },
  amountLabel: {
    fontSize: 16,
    color: '#b8a9c9',
    fontFamily: 'CrayonPastel',
    marginBottom: 10,
    textAlign: 'center',
  },
  amountDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  maxAmount: {
    fontSize: 14,
    color: '#b8a9c9',
    fontFamily: 'CrayonPastel',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 15,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickAmountText: {
    color: '#f7e98e',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  infoText: {
    fontSize: 14,
    color: '#b8a9c9',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});