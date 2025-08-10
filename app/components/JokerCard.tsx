import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGame } from '../context/GameContext';
import { useJokers } from '../context/JokerContext';
import { useSeed } from '../context/SeedContext';

interface JokerCardProps {
  joker: {
    id: number;
    name: string;
    description: string;
    subject: string;
    theme: string;
    type: 'one-time' | 'persistent';
    effect: string;
  };
  isAfterSchool: boolean;
}

const CANDY_TYPES = ['Bubble Gum', 'M&Ms', 'Skittles', 'Snickers', 'Sour Patch Kids', 'Warheads'];

export default function JokerCard({ joker, isAfterSchool }: JokerCardProps) {
  const { activateJoker } = useJokers();
  const { periodCount, revertToPreviousPeriod } = useGame();
  const { gameData, modifyCandyPrice, getOriginalCandyPrice } = useSeed();
  const [showCandySelector, setShowCandySelector] = useState(false);

  const handleActivate = () => {
    if (joker.effect === 'double_candy_price') {
      // Show candy selector modal
      setShowCandySelector(true);
    } else if (joker.effect === 'revert_period') {
      // Show confirmation for time revert
      Alert.alert(
        '⏰ Time Equation',
        'Are you sure you want to revert to the previous period? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Revert Time', style: 'destructive', onPress: () => handleTimeRevert() }
        ]
      );
    }
  };

  const handleCandySelection = async (candyType: string) => {
    // Get the original price and double it
    const originalPrice = gameData.candyPrices[candyType][periodCount];
    const doubledPrice = originalPrice * 2;
    
    // Modify the actual game data for this period
    modifyCandyPrice(candyType, periodCount, doubledPrice);
    
    // Activate the joker (this will remove it from inventory)
    const success = await activateJoker(joker.id, candyType, periodCount);
    
    if (success) {
      Alert.alert(
        '✨ Joker Activated!',
        `${joker.name} has been used to double the price of ${candyType} for this period.\n\nPrice: $${originalPrice.toFixed(2)} → $${doubledPrice.toFixed(2)}`,
        [{ text: 'OK' }]
      );
    }
    setShowCandySelector(false);
  };

  const handleTimeRevert = async () => {
    const jokerActivated = await activateJoker(joker.id);
    if (jokerActivated) {
      const timeReverted = revertToPreviousPeriod();
      if (timeReverted) {
        Alert.alert(
          '⏰ Time Reversed!',
          'You have successfully reverted to the previous period. Use this knowledge wisely!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '⏰ Time Revert Failed',
          'Cannot revert time from the first period.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const getTypeColor = () => {
    if (joker.type === 'persistent') {
      return isAfterSchool ? '#8a7ca8' : '#4ade80';
    }
    return isAfterSchool ? '#f87171' : '#fb7185';
  };

  const getTypeText = () => {
    return joker.type === 'persistent' ? '🔄 PERSISTENT' : '⚡ ONE-TIME';
  };

  return (
    <View style={[
      styles.jokerCard, 
      isAfterSchool && styles.jokerCardAfterSchool
    ]}>
      <View style={styles.jokerHeader}>
        <View style={styles.jokerTitleRow}>
          <Text style={[
            styles.jokerName,
            isAfterSchool && styles.jokerNameAfterSchool
          ]}>{joker.name}</Text>
          <Text style={[
            styles.jokerType,
            { color: getTypeColor() }
          ]}>{getTypeText()}</Text>
        </View>
        <Text style={[
          styles.jokerSubject,
          isAfterSchool && styles.jokerSubjectAfterSchool
        ]}>{joker.subject}</Text>
      </View>
      
      <Text style={[
        styles.jokerDescription,
        isAfterSchool && styles.jokerDescriptionAfterSchool
      ]}>{joker.description}</Text>

      {joker.type === 'one-time' && (
        <TouchableOpacity 
          style={[
            styles.activateButton,
            isAfterSchool && styles.activateButtonAfterSchool
          ]}
          onPress={handleActivate}
        >
          <Text style={[
            styles.activateButtonText,
            isAfterSchool && styles.activateButtonTextAfterSchool
          ]}>🎯 ACTIVATE</Text>
        </TouchableOpacity>
      )}

      {joker.type === 'persistent' && (
        <View style={[
          styles.persistentIndicator,
          isAfterSchool && styles.persistentIndicatorAfterSchool
        ]}>
          <Text style={[
            styles.persistentText,
            isAfterSchool && styles.persistentTextAfterSchool
          ]}>✨ EFFECT ACTIVE</Text>
        </View>
      )}

      {/* Candy Selector Modal */}
      <Modal
        visible={showCandySelector}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            isAfterSchool && styles.modalContentAfterSchool
          ]}>
            <Text style={[
              styles.modalTitle,
              isAfterSchool && styles.modalTitleAfterSchool
            ]}>🍭 Choose Candy to Double</Text>
            
            {CANDY_TYPES.map((candyType) => (
              <TouchableOpacity
                key={candyType}
                style={[
                  styles.candyOption,
                  isAfterSchool && styles.candyOptionAfterSchool
                ]}
                onPress={() => handleCandySelection(candyType)}
              >
                <Text style={[
                  styles.candyOptionText,
                  isAfterSchool && styles.candyOptionTextAfterSchool
                ]}>{candyType}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[
                styles.cancelButton,
                isAfterSchool && styles.cancelButtonAfterSchool
              ]}
              onPress={() => setShowCandySelector(false)}
            >
              <Text style={[
                styles.cancelButtonText,
                isAfterSchool && styles.cancelButtonTextAfterSchool
              ]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  jokerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#d4a574',
    shadowColor: '#8b4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  jokerCardAfterSchool: {
    backgroundColor: 'rgba(93, 76, 112, 0.85)',
    borderColor: '#8a7ca8',
    shadowColor: '#2d1b3d',
    shadowOpacity: 0.15,
  },
  jokerHeader: {
    marginBottom: 12,
  },
  jokerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jokerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    flex: 1,
  },
  jokerNameAfterSchool: {
    color: '#f7e98e',
    textShadowColor: 'rgba(247,233,142,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  jokerType: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontFamily: 'CrayonPastel',
  },
  jokerSubject: {
    fontSize: 12,
    color: '#8b4513',
    backgroundColor: '#f5e6d3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontFamily: 'CrayonPastel',
    alignSelf: 'flex-start',
  },
  jokerSubjectAfterSchool: {
    color: '#2a1845',
    backgroundColor: '#b8a9c9',
  },
  jokerDescription: {
    fontSize: 14,
    color: '#5d4037',
    lineHeight: 20,
    fontFamily: 'CrayonPastel',
    marginBottom: 12,
  },
  jokerDescriptionAfterSchool: {
    color: '#b8a9c9',
  },
  activateButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  activateButtonAfterSchool: {
    backgroundColor: '#8a7ca8',
    borderColor: '#6d5985',
  },
  activateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  activateButtonTextAfterSchool: {
    color: '#f7e98e',
  },
  persistentIndicator: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  persistentIndicatorAfterSchool: {
    backgroundColor: 'rgba(138, 124, 168, 0.2)',
    borderColor: '#8a7ca8',
  },
  persistentText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
  },
  persistentTextAfterSchool: {
    color: '#b8a9c9',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxWidth: 300,
    width: '80%',
  },
  modalContentAfterSchool: {
    backgroundColor: '#2a1845',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalTitleAfterSchool: {
    color: '#f7e98e',
  },
  candyOption: {
    backgroundColor: '#f5e6d3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d4a574',
  },
  candyOptionAfterSchool: {
    backgroundColor: 'rgba(184, 169, 201, 0.2)',
    borderColor: '#8a7ca8',
  },
  candyOptionText: {
    color: '#6b4423',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  candyOptionTextAfterSchool: {
    color: '#b8a9c9',
  },
  cancelButton: {
    backgroundColor: '#f87171',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  cancelButtonAfterSchool: {
    backgroundColor: '#8b5cf6',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  cancelButtonTextAfterSchool: {
    color: '#f7e98e',
  },
});