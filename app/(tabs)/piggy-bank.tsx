import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { JOKER_IDS, findJokerById } from '../../src/constants/jokerIds';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useGame } from '../../src/hooks/useGame';
import { useJokers } from '../../src/hooks/useJokers';
import { useWallet } from '../../src/hooks/useWallet';
import ConfirmationModal from '../components/ConfirmationModal';
import GameHUD from '../components/GameHUD';

export default function PiggyBankPage() {
  const { balance, stashedAmount, adoptionFee, stashMoney, withdrawFromStash } = useWallet();
  const { day, period } = useGame();
  const { setEvent } = useFlavorText();
  const { jokers } = useJokers();
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    emoji: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    emoji: '',
    onConfirm: () => {},
  });

  // Set piggy bank flavor text when component loads
  useEffect(() => {
    setEvent('PIGGY_BANK');
  }, [setEvent]);

  const maxAmount =
    mode === 'deposit' ? Math.max(0, balance) : Math.max(0, stashedAmount);

  // Calculate dynamic font size for stashed amount based on text length
  const stashedAmountText = `$${stashedAmount.toFixed(2)}`;
  const stashedAmountFontSize = useMemo(() => {
    const textLength = stashedAmountText.length;
    if (textLength <= 8) return 28; // Normal size for amounts like $1000.00
    if (textLength <= 10) return 24; // Slightly smaller for $10000.00
    if (textLength <= 12) return 20; // Smaller for $-30000.00
    return 18; // Even smaller for very large negative amounts
  }, [stashedAmountText]);

  const handleTransaction = () => {
    if (amount <= 0) {
      setConfirmModal({
        visible: true,
        title: 'Invalid Amount',
        message: 'Please select an amount greater than 0',
        emoji: '⚠️',
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    // Check for Deposit Bonus joker to show appropriate message
    let bonusApplied = false;
    let finalAmount = amount;
    if (mode === 'deposit') {
      const depositBonusJoker = findJokerById(jokers, JOKER_IDS.DEPOSIT_BONUS);
      if (depositBonusJoker) {
        finalAmount = amount * 1.1; // Calculate final amount for display
        bonusApplied = true;
      }
    }

    // Handle the transaction - stashMoney will handle deposit bonus internally
    const success = mode === 'deposit' 
      ? stashMoney(amount, jokers) // Pass jokers to handle deposit bonus
      : withdrawFromStash(amount);

    if (success) {
      const depositMessage = bonusApplied
        ? `You've stashed $${amount.toFixed(2)} + 10% bonus ($${(finalAmount - amount).toFixed(2)}) = $${finalAmount.toFixed(2)} in your piggy bank!`
        : `You've safely stashed $${amount.toFixed(2)} in your piggy bank!`;

      setConfirmModal({
        visible: true,
        title:
          mode === 'deposit'
            ? bonusApplied
              ? '💰 Bonus Deposit!'
              : 'Money Stashed!'
            : 'Money Withdrawn!',
        message:
          mode === 'deposit'
            ? depositMessage
            : `You've withdrawn $${amount.toFixed(2)} from your piggy bank!`,
        emoji: mode === 'deposit' ? (bonusApplied ? '🎉' : '💰') : '💸',
        onConfirm: () => {
          setAmount(0);
          setConfirmModal((prev) => ({ ...prev, visible: false }));
        },
      });
    } else {
      // Show error if transaction failed
      setConfirmModal({
        visible: true,
        title: 'Transaction Failed',
        message:
          mode === 'deposit'
            ? `Unable to deposit $${amount.toFixed(2)}. Current balance: $${balance.toFixed(2)}`
            : `Unable to withdraw $${amount.toFixed(2)}. Stashed amount: $${stashedAmount.toFixed(2)}`,
        emoji: '❌',
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  return (
    <>
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
              <Text style={[styles.piggyBankAmount, { fontSize: stashedAmountFontSize }]} numberOfLines={1} adjustsFontSizeToFit>
                {stashedAmountText}
              </Text>
            </View>
          </View>

          {/* Tab-style Mode Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, mode === 'deposit' && styles.tabActive]}
              onPress={() => {
                setMode('deposit');
                setAmount(0);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  mode === 'deposit' && styles.tabTextActive,
                ]}
              >
                💰 Deposit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, mode === 'withdraw' && styles.tabActive]}
              onPress={() => {
                setMode('withdraw');
                setAmount(0);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  mode === 'withdraw' && styles.tabTextActive,
                ]}
              >
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
              <Text
                style={[
                  styles.amountValue,
                  { color: mode === 'deposit' ? '#4ade80' : '#22c55e' },
                ]}
              >
                ${amount.toFixed(2)}
              </Text>
              <Text style={styles.maxAmount}>Max: ${maxAmount.toFixed(2)}</Text>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={maxAmount}
              step={0.01}
              value={amount}
              onValueChange={setAmount}
              minimumTrackTintColor={mode === 'deposit' ? '#4ade80' : '#22c55e'}
              maximumTrackTintColor="#ccc"
            />

            {/* Action Button inside container */}
            <TouchableOpacity
              style={[
                styles.inlineActionButton,
                { backgroundColor: mode === 'deposit' ? '#4ade80' : '#f87171' },
                amount === 0 && styles.actionButtonDisabled,
              ]}
              onPress={handleTransaction}
              disabled={amount === 0}
            >
              <Text style={styles.actionButtonText}>
                {mode === 'deposit' ? '💰 Deposit Money' : '💸 Withdraw Money'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Back to After School Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Trigger success haptic feedback when going back to after school
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.push('/after-school');
            }}
          >
            <Text style={styles.backButtonText}>← Back to After School</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>

    <ConfirmationModal
      visible={confirmModal.visible}
      title={confirmModal.title}
      message={confirmModal.message}
      emoji={confirmModal.emoji}
      confirmText="OK"
      onConfirm={confirmModal.onConfirm}
      onCancel={() =>
        setConfirmModal((prev) => ({ ...prev, visible: false }))
      }
      theme="evening"
      dismissible={false}
    />
    </>
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
    padding: 16,
    alignItems: 'center',
    marginBottom: 15,
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
    fontSize: 28,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, .8)',
    borderRadius: 8,
    padding: 2,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(0,0,0,1)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b8a9c9',
    fontFamily: 'CrayonPastel',
  },
  tabTextActive: {
    color: '#f7e98e',
  },
  amountSection: {
    backgroundColor: 'rgba(0,0,0, 0.8)',
    borderRadius: 16,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#5d4c70',
  },
  amountLabel: {
    fontSize: 16,
    color: '#f7e98e',
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

  actionButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  inlineActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
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
  backButton: {
    backgroundColor: 'rgba(0,0,0, 0.7)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#f7e98e',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#f7e98e',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
  },
});
