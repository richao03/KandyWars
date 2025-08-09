import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';

interface DayStatsModalProps {
  visible: boolean;
  onClose: () => void;
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
  stats,
  day
}: DayStatsModalProps) {
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
        <Text style={styles.title}>📊 Day {day} Summary</Text>
        <Text style={styles.subtitle}>Here's how your candy business performed today!</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>💰 Total Profit Made:</Text>
            <Text style={[styles.statValue, styles.profitValue]}>
              ${stats.profit.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>🛒 Total Spent Buying:</Text>
            <Text style={[styles.statValue, styles.spentValue]}>
              ${stats.spent.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>🍬 Candies Sold:</Text>
            <Text style={[styles.statValue, styles.soldValue]}>
              {stats.candiesSold} pieces
            </Text>
          </View>
          
          <View style={[styles.statRow, styles.netGainRow]}>
            <Text style={styles.netGainLabel}>📈 Net Gain:</Text>
            <Text style={[
              styles.netGainValue, 
              stats.netGain >= 0 ? styles.positiveGain : styles.negativeGain
            ]}>
              {stats.netGain >= 0 ? '+' : ''}${stats.netGain.toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={onClose}>
          <Text style={styles.continueButtonText}>🌟 Continue to After School</Text>
        </TouchableOpacity>
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
    backgroundColor: '#fefaf5',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#d4a574',
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e6d4b7',
  },
  statLabel: {
    fontSize: 16,
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    fontWeight: '600',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
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
  netGainRow: {
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 3,
    borderColor: '#d4a574',
  },
  netGainLabel: {
    fontSize: 18,
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    fontWeight: '700',
    flex: 1,
  },
  netGainValue: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  positiveGain: {
    color: '#22c55e',
  },
  negativeGain: {
    color: '#ef4444',
  },
  continueButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
  },
});