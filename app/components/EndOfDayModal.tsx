import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';

interface EndOfDayModalProps {
  visible: boolean;
  onClose: () => void;
  onGoHome: () => void;
  onStashMoney: () => void;
  onGoDeli: () => void;
  onGoToSleep: () => void;
  completedActivities: {
    studiedHome: boolean;
    stashedMoney: boolean;
    visitedDeli: boolean;
  };
}

export default function EndOfDayModal({ 
  visible, 
  onClose, 
  onGoHome, 
  onStashMoney, 
  onGoDeli,
  onGoToSleep,
  completedActivities
}: EndOfDayModalProps) {
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
        <Text style={styles.title}>End of School Day</Text>
        <Text style={styles.subtitle}>What do you want to do now?</Text>
        
        {!completedActivities.studiedHome && (
          <TouchableOpacity style={styles.option} onPress={onGoHome}>
            <Text style={styles.optionEmoji}>🏠</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Go Home & Study</Text>
              <Text style={styles.optionDesc}>Choose subjects to study and improve your skills</Text>
            </View>
          </TouchableOpacity>
        )}
        
        {!completedActivities.stashedMoney && (
          <TouchableOpacity style={styles.option} onPress={onStashMoney}>
            <Text style={styles.optionEmoji}>💰</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Stash Your Money</Text>
              <Text style={styles.optionDesc}>Hide your cash in a secret location for safekeeping</Text>
            </View>
          </TouchableOpacity>
        )}
        
        {!completedActivities.visitedDeli && (
          <TouchableOpacity style={styles.option} onPress={onGoDeli}>
            <Text style={styles.optionEmoji}>🏪</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Visit the Deli</Text>
              <Text style={styles.optionDesc}>Buy candy at stable average prices</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.sleepOption} onPress={onGoToSleep}>
          <Text style={styles.optionEmoji}>😴</Text>
          <View style={styles.optionText}>
            <Text style={styles.sleepTitle}>Go to Sleep</Text>
            <Text style={styles.sleepDesc}>End the day and start tomorrow fresh</Text>
          </View>
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
    backgroundColor: '#fefaf5', // Warm paper background
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#d4a574', // Brown crayon border
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 26,
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
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#d4a574',
    shadowColor: '#8b4513',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b4423',
    marginBottom: 4,
    fontFamily: 'CrayonPastel',
  },
  optionDesc: {
    fontSize: 14,
    color: '#666',
  },
  sleepOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 3,
    borderColor: '#4a90e2',
    shadowColor: '#4a90e2',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sleepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4a90e2',
    marginBottom: 4,
    fontFamily: 'CrayonPastel',
  },
  sleepDesc: {
    fontSize: 14,
    color: '#4a90e2',
  },
});