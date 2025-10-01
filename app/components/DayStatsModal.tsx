import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';

interface DayStatsModalProps {
  visible: boolean;
  onClose: () => void;
  onCancel: () => void;
  stats: {
    profit: number;
    spent: number;
    candiesSold: number;
    netGain: number;
  };
  day: number;
}

export default function DayStatsModal({
  visible,
  onClose,
  onCancel,
  stats,
  day,
}: DayStatsModalProps) {
  if (!stats) {
    return null;
  }

  return (
    <FastModal
      visible={visible}
      onClose={undefined}
      animationType="spring"
      backdropOpacity={0.6}
      modalStyle={styles.modal}
    >
      <PixelBorder
        borderColor="#d4af37"
        borderWidth={3}
        backgroundColor="rgba(255, 255, 255, 0.95)"
        innerPadding={24}
        style={styles.titleContainer}
      >
        <PixelBorder
          borderColor="#d4af37"
          borderWidth={3}
          backgroundColor="rgba(255, 255, 255, 0.95)"
          innerPadding={4}
          style={styles.titleContainer}
        >
          <Text style={styles.title}>Day {day} Summary</Text>
        </PixelBorder>

        <PixelBorder
          borderColor="#d4af37"
          borderWidth={3}
          backgroundColor="rgba(255, 255, 255, 0.9)"
          innerPadding={20}
          style={styles.statsContainer}
        >
          <PixelBorder
            borderColor="#e6d4b7"
            borderWidth={2}
            backgroundColor="#ffffff"
            innerPadding={12}
            style={styles.statRowBorder}
          >
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Profit Made:</Text>
              <Text style={[styles.statValue, styles.profitValue]}>
                ${stats.profit.toFixed(2)}
              </Text>
            </View>
          </PixelBorder>

          <PixelBorder
            borderColor="#e6d4b7"
            borderWidth={2}
            backgroundColor="#ffffff"
            innerPadding={12}
            style={styles.statRowBorder}
          >
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Spent Buying:</Text>
              <Text style={[styles.statValue, styles.spentValue]}>
                ${stats.spent.toFixed(2)}
              </Text>
            </View>
          </PixelBorder>

          <PixelBorder
            borderColor="#e6d4b7"
            borderWidth={2}
            backgroundColor="#ffffff"
            innerPadding={12}
            style={styles.statRowBorder}
          >
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Candies Sold:</Text>
              <Text style={[styles.statValue, styles.soldValue]}>
                {stats.candiesSold} pieces
              </Text>
            </View>
          </PixelBorder>

          <PixelBorder
            borderColor="#d4a574"
            borderWidth={3}
            backgroundColor="#f8f9fa"
            innerPadding={12}
            style={[styles.statRowBorder, styles.netGainBorder]}
          >
            <View style={[styles.statRow, styles.netGainRow]}>
              <Text style={styles.netGainLabel}>Net Gain:</Text>
              <Text
                style={[
                  styles.netGainValue,
                  stats.netGain >= 0
                    ? styles.positiveGain
                    : styles.negativeGain,
                ]}
              >
                {stats.netGain >= 0 ? '+' : ''}${stats.netGain.toFixed(2)}
              </Text>
            </View>
          </PixelBorder>
        </PixelBorder>

        <PixelBorder
          borderColor="rgba(123,169,101,1)"
          borderWidth={3}
          backgroundColor="rgba(154,193,118,1)"
          innerPadding={0}
          style={styles.continueButton}
        >
          <TouchableOpacity
            style={styles.continueButtonInner}
            onPress={() => {
              // Trigger success haptic feedback when going to after school
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Got it!</Text>
            <Text style={styles.continueButtonSubtext}>Time to head home!</Text>
          </TouchableOpacity>
        </PixelBorder>

        {/* <PixelBorder
          borderColor="rgba(185,28,28,1)"
          borderWidth={3}
          backgroundColor="rgba(239,68,68,1)"
          innerPadding={0}
          style={styles.cancelButton}
        >
          <TouchableOpacity
            style={styles.cancelButtonInner}
            onPress={() => {
              // Trigger light haptic feedback for cancel action
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCancel();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Stay at School</Text>
            <Text style={styles.cancelButtonSubtext}>Continue trading</Text>
          </TouchableOpacity>
        </PixelBorder> */}
      </PixelBorder>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fefaf5',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',

    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  titleContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    textShadow: '1px 1px 0px #e6d4b7',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statRowBorder: {
    marginBottom: 8,
  },
  netGainBorder: {
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  profitValue: {
    color: '#22c55e',
  },
  spentValue: {
    color: '#ef4444',
  },
  soldValue: {
    color: '#3b82f6',
  },
  netGainRow: {},
  netGainLabel: {
    fontSize: 18,
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    flex: 1,
  },
  netGainValue: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  positiveGain: {
    color: '#22c55e',
  },
  negativeGain: {
    color: '#ef4444',
  },
  continueButton: {
    marginBottom: 12,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  continueButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cancelButton: {
    alignSelf: 'center',
    shadowColor: '#991b1b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  cancelButtonInner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#991b1b',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cancelButtonSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fef2f2',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#166534',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  continueButtonSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f0fdf4',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
});
