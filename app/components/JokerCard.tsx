import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useGame } from '../../src/context/GameContext';
import { useJokers } from '../../src/context/JokerContext';
import { useSeed } from '../../src/context/SeedContext';
import { useInventory } from '../../src/context/InventoryContext';
import { useWallet } from '../../src/context/WalletContext';

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
  onLongPress?: () => void;
  isDragging?: boolean;
  isCompact?: boolean;
}

const CANDY_TYPES = ['Bubble Gum', 'M&Ms', 'Skittles', 'Snickers', 'Sour Patch Kids', 'Warheads'];

export default function JokerCard({ joker, isAfterSchool, onLongPress, isDragging, isCompact }: JokerCardProps) {
  const { jokers, activateJoker, addJoker } = useJokers();
  const { periodCount, revertToPreviousPeriod, incrementPeriod } = useGame();
  const { gameData, modifyCandyPrice, getOriginalCandyPrice } = useSeed();
  const { inventory, removeFromInventory, addToInventory } = useInventory();
  const { addMoney } = useWallet();
  const [showCandySelector, setShowCandySelector] = useState(false);
  const [showJokerSelector, setShowJokerSelector] = useState(false);
  const [showConversionStep1, setShowConversionStep1] = useState(false); // Select source candy
  const [showConversionStep2, setShowConversionStep2] = useState(false); // Select target candy
  const [selectedSourceCandy, setSelectedSourceCandy] = useState<string | null>(null);

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
    } else if (joker.name === 'Glitch in the Matrix') {
      // Show joker selector modal for duplication
      setShowJokerSelector(true);
    } else if (joker.name === 'Master of Trade') {
      // Show candy conversion modal - step 1 (select source)
      setShowConversionStep1(true);
    } else if (joker.name === 'Temporary Emperor') {
      // Show confirmation for time skip with auto profits
      Alert.alert(
        '👑 Temporary Emperor',
        'Skip one period and automatically gain profits from selling 3 of every candy type at next period prices?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Rule the Market!', style: 'default', onPress: () => handleTemporaryEmperor() }
        ]
      );
    } else if (joker.name === 'Market Crash') {
      // Show confirmation for market crash
      Alert.alert(
        '📉 Market Crash',
        'Crash all candy prices by 50% for this period? Perfect for bulk buying!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Crash the Market!', style: 'default', onPress: () => handleMarketCrash() }
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

  const handleJokerSelection = async (selectedJoker: any) => {
    // Create a copy of the selected joker with a new ID
    const duplicatedJoker = {
      ...selectedJoker,
      id: Date.now() + Math.random(), // Generate unique ID
      name: selectedJoker.name + ' (Copy)',
    };

    // Add the duplicated joker
    addJoker(duplicatedJoker);
    
    // Remove the Glitch in the Matrix joker (it's one-time use)
    const success = await activateJoker(joker.id);
    
    if (success) {
      Alert.alert(
        '🔄 Glitch Activated!',
        `Successfully created a copy of "${selectedJoker.name}". The glitch has been consumed.`,
        [{ text: 'OK' }]
      );
    }
    
    setShowJokerSelector(false);
  };

  // Get available jokers for duplication (exclude the Glitch in the Matrix card itself)
  const availableJokersForDuplication = jokers.filter(j => j.name !== 'Glitch in the Matrix');

  const handleSourceCandySelection = (candyType: string) => {
    setSelectedSourceCandy(candyType);
    setShowConversionStep1(false);
    setShowConversionStep2(true);
  };

  const handleTargetCandySelection = async (targetCandyType: string) => {
    if (!selectedSourceCandy) return;

    const sourceInventoryItem = inventory[selectedSourceCandy];
    if (!sourceInventoryItem || sourceInventoryItem.quantity === 0) {
      Alert.alert('Error', 'No source candy available for conversion!');
      return;
    }

    // Remove all source candy
    const success = removeFromInventory(selectedSourceCandy, sourceInventoryItem.quantity);
    if (!success) {
      Alert.alert('Error', 'Failed to remove source candy!');
      return;
    }

    // Get current target candy price for conversion
    const targetPrice = gameData.candyPrices[targetCandyType][periodCount];
    
    // Add the same quantity as target candy
    addToInventory(targetCandyType, sourceInventoryItem.quantity, targetPrice);

    // Remove the Master of Trade joker (it's one-time use)
    await activateJoker(joker.id);

    Alert.alert(
      '🔄 Trade Completed!',
      `Successfully converted ${sourceInventoryItem.quantity} ${selectedSourceCandy} into ${sourceInventoryItem.quantity} ${targetCandyType}!`,
      [{ text: 'OK' }]
    );

    // Reset state
    setShowConversionStep2(false);
    setSelectedSourceCandy(null);
  };

  // Get available inventory candies for conversion
  const availableCandiesForConversion = Object.keys(inventory).filter(
    candyType => inventory[candyType].quantity > 0
  );

  // Get target candies (exclude the selected source)
  const availableTargetCandies = CANDY_TYPES.filter(
    candyType => candyType !== selectedSourceCandy
  );

  const handleTemporaryEmperor = async () => {
    const skippedPeriod = periodCount + 1;
    const targetPeriod = periodCount + 2; // Skip one period, go to period after next
    let totalProfit = 0;
    const profitBreakdown = [];

    // Calculate profit from selling 3 of each candy type at target period prices
    for (const candyType of CANDY_TYPES) {
      const targetPeriodPrice = gameData.candyPrices[candyType][targetPeriod];
      if (targetPeriodPrice) {
        const profit = targetPeriodPrice * 3;
        totalProfit += profit;
        profitBreakdown.push(`${candyType}: $${profit.toFixed(2)}`);
      }
    }

    // Add money to wallet
    addMoney(totalProfit);

    // Skip a period by advancing twice (period 5 -> period 7, skipping period 6)
    incrementPeriod('market'); // First advance: period 5 -> period 6
    incrementPeriod('market'); // Second advance: period 6 -> period 7 (skip period 6)

    // Remove the joker (it's one-time use)
    await activateJoker(joker.id);

    Alert.alert(
      '👑 Emperor\'s Decree Executed!',
      `Time has been advanced by 2 periods (skipped period ${skippedPeriod}).\n\nAuto-profit from selling 3 of each candy:\n${profitBreakdown.join('\n')}\n\nTotal gained: $${totalProfit.toFixed(2)}`,
      [{ text: 'Long live the Emperor!' }]
    );
  };

  const handleMarketCrash = async () => {
    // Remove the joker (it's one-time use)
    await activateJoker(joker.id);

    Alert.alert(
      '📉 Market Crash Executed!',
      'All candy prices have been reduced by 50% for this period. Time to stock up!',
      [{ text: 'Buy the Dip!' }]
    );
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

  const CardWrapper = onLongPress ? TouchableOpacity : View;
  const cardWrapperProps = onLongPress ? { onLongPress, activeOpacity: 0.8 } : {};

  return (
    <CardWrapper 
      style={[
        styles.jokerCard,
        isCompact && styles.jokerCardCompact,
        isAfterSchool && styles.jokerCardAfterSchool,
        isDragging && styles.jokerCardDragging
      ]}
      {...cardWrapperProps}
    >
      <View style={[styles.jokerHeader, isCompact && styles.jokerHeaderCompact]}>
        <View style={styles.jokerTitleRow}>
          <View style={styles.jokerTitleLeft}>
            <Text style={[
              styles.jokerName,
              isCompact && styles.jokerNameCompact,
              isAfterSchool && styles.jokerNameAfterSchool
            ]}>{joker.name}</Text>
            <Text style={[
              styles.jokerSubject,
              isCompact && styles.jokerSubjectCompact,
              isAfterSchool && styles.jokerSubjectAfterSchool
            ]}>{joker.subject}</Text>
          </View>
          <Text style={[
            styles.jokerType,
            isCompact && styles.jokerTypeCompact,
            { color: getTypeColor() }
          ]}>{getTypeText()}</Text>
        </View>
      </View>
      
      <Text style={[
        styles.jokerDescription,
        isCompact && styles.jokerDescriptionCompact,
        isAfterSchool && styles.jokerDescriptionAfterSchool
      ]}>{joker.description}</Text>

      {joker.type === 'one-time' && !isCompact && (
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

      {joker.type === 'one-time' && isCompact && (
        <TouchableOpacity 
          style={[
            styles.activateButtonCompact,
            isAfterSchool && styles.activateButtonCompactAfterSchool
          ]}
          onPress={handleActivate}
        >
          <Text style={[
            styles.activateButtonTextCompact,
            isAfterSchool && styles.activateButtonTextCompactAfterSchool
          ]}>ACTIVATE</Text>
        </TouchableOpacity>
      )}

      {joker.type === 'persistent' && !isCompact && (
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

      {/* Joker Selector Modal */}
      <Modal
        visible={showJokerSelector}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            styles.jokerModalContent,
            isAfterSchool && styles.modalContentAfterSchool
          ]}>
            <Text style={[
              styles.modalTitle,
              isAfterSchool && styles.modalTitleAfterSchool
            ]}>🔄 Choose Joker to Copy</Text>
            
            <ScrollView style={styles.jokerScrollView} showsVerticalScrollIndicator={false}>
              {availableJokersForDuplication.length > 0 ? (
                availableJokersForDuplication.map((availableJoker) => (
                  <TouchableOpacity
                    key={availableJoker.id}
                    style={[
                      styles.jokerOption,
                      isAfterSchool && styles.jokerOptionAfterSchool
                    ]}
                    onPress={() => handleJokerSelection(availableJoker)}
                  >
                    <View style={styles.jokerOptionHeader}>
                      <Text style={[
                        styles.jokerOptionName,
                        isAfterSchool && styles.jokerOptionNameAfterSchool
                      ]}>{availableJoker.name}</Text>
                      <Text style={[
                        styles.jokerOptionType,
                        { color: availableJoker.type === 'persistent' 
                          ? (isAfterSchool ? '#8a7ca8' : '#4ade80')
                          : (isAfterSchool ? '#f87171' : '#fb7185') }
                      ]}>
                        {availableJoker.type === 'persistent' ? '🔄' : '⚡'}
                      </Text>
                    </View>
                    <Text style={[
                      styles.jokerOptionDescription,
                      isAfterSchool && styles.jokerOptionDescriptionAfterSchool
                    ]}>{availableJoker.description}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noJokersContainer}>
                  <Text style={[
                    styles.noJokersText,
                    isAfterSchool && styles.noJokersTextAfterSchool
                  ]}>No other jokers to copy!</Text>
                  <Text style={[
                    styles.noJokersSubtext,
                    isAfterSchool && styles.noJokersSubtextAfterSchool
                  ]}>Study to earn more jokers first</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={[
                styles.cancelButton,
                isAfterSchool && styles.cancelButtonAfterSchool
              ]}
              onPress={() => setShowJokerSelector(false)}
            >
              <Text style={[
                styles.cancelButtonText,
                isAfterSchool && styles.cancelButtonTextAfterSchool
              ]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Candy Conversion Step 1: Select Source Modal */}
      <Modal
        visible={showConversionStep1}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            styles.jokerModalContent,
            isAfterSchool && styles.modalContentAfterSchool
          ]}>
            <Text style={[
              styles.modalTitle,
              isAfterSchool && styles.modalTitleAfterSchool
            ]}>🍭 Select Candy to Convert</Text>
            
            <ScrollView style={styles.jokerScrollView} showsVerticalScrollIndicator={false}>
              {availableCandiesForConversion.length > 0 ? (
                availableCandiesForConversion.map((candyType) => (
                  <TouchableOpacity
                    key={candyType}
                    style={[
                      styles.candyOption,
                      isAfterSchool && styles.candyOptionAfterSchool
                    ]}
                    onPress={() => handleSourceCandySelection(candyType)}
                  >
                    <View style={styles.candyOptionHeader}>
                      <Text style={[
                        styles.candyOptionText,
                        isAfterSchool && styles.candyOptionTextAfterSchool
                      ]}>{candyType}</Text>
                      <Text style={[
                        styles.candyQuantity,
                        isAfterSchool && styles.candyQuantityAfterSchool
                      ]}>×{inventory[candyType].quantity}</Text>
                    </View>
                    <Text style={[
                      styles.candyAvgPrice,
                      isAfterSchool && styles.candyAvgPriceAfterSchool
                    ]}>Avg: ${inventory[candyType].averagePrice.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noJokersContainer}>
                  <Text style={[
                    styles.noJokersText,
                    isAfterSchool && styles.noJokersTextAfterSchool
                  ]}>No candy to convert!</Text>
                  <Text style={[
                    styles.noJokersSubtext,
                    isAfterSchool && styles.noJokersSubtextAfterSchool
                  ]}>Buy some candy first</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={[
                styles.cancelButton,
                isAfterSchool && styles.cancelButtonAfterSchool
              ]}
              onPress={() => setShowConversionStep1(false)}
            >
              <Text style={[
                styles.cancelButtonText,
                isAfterSchool && styles.cancelButtonTextAfterSchool
              ]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Candy Conversion Step 2: Select Target Modal */}
      <Modal
        visible={showConversionStep2}
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
            ]}>🔄 Convert to Which Candy?</Text>
            
            {selectedSourceCandy && (
              <Text style={[
                styles.conversionSummary,
                isAfterSchool && styles.conversionSummaryAfterSchool
              ]}>
                Converting: {inventory[selectedSourceCandy].quantity} {selectedSourceCandy}
              </Text>
            )}
            
            {availableTargetCandies.map((candyType) => (
              <TouchableOpacity
                key={candyType}
                style={[
                  styles.candyOption,
                  isAfterSchool && styles.candyOptionAfterSchool
                ]}
                onPress={() => handleTargetCandySelection(candyType)}
              >
                <Text style={[
                  styles.candyOptionText,
                  isAfterSchool && styles.candyOptionTextAfterSchool
                ]}>{candyType}</Text>
                <Text style={[
                  styles.targetPrice,
                  isAfterSchool && styles.targetPriceAfterSchool
                ]}>Current Price: ${gameData.candyPrices[candyType][periodCount].toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[
                styles.cancelButton,
                isAfterSchool && styles.cancelButtonAfterSchool
              ]}
              onPress={() => {
                setShowConversionStep2(false);
                setSelectedSourceCandy(null);
              }}
            >
              <Text style={[
                styles.cancelButtonText,
                isAfterSchool && styles.cancelButtonTextAfterSchool
              ]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </CardWrapper>
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
  jokerCardCompact: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  jokerCardAfterSchool: {
    backgroundColor: 'rgba(93, 76, 112, 0.85)',
    borderColor: '#8a7ca8',
    shadowColor: '#2d1b3d',
    shadowOpacity: 0.15,
  },
  jokerCardDragging: {
    opacity: 0.7,
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  jokerHeader: {
    marginBottom: 12,
  },
  jokerHeaderCompact: {
    marginBottom: 8,
  },
  jokerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jokerTitleLeft: {
    flex: 1,
    marginRight: 8,
  },
  jokerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    marginBottom: 2,
  },
  jokerNameCompact: {
    fontSize: 16,
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
  jokerTypeCompact: {
    fontSize: 9,
  },
  jokerSubject: {
    fontSize: 11,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    opacity: 0.8,
  },
  jokerSubjectCompact: {
    fontSize: 10,
  },
  jokerSubjectAfterSchool: {
    color: '#b8a9c9',
  },
  jokerDescription: {
    fontSize: 14,
    color: '#5d4037',
    lineHeight: 20,
    fontFamily: 'CrayonPastel',
    marginBottom: 12,
  },
  jokerDescriptionCompact: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
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
  activateButtonCompact: {
    backgroundColor: '#4ade80',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  activateButtonCompactAfterSchool: {
    backgroundColor: '#8a7ca8',
    borderColor: '#6d5985',
  },
  activateButtonTextCompact: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
  },
  activateButtonTextCompactAfterSchool: {
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
  jokerModalContent: {
    maxHeight: '80%',
  },
  jokerScrollView: {
    maxHeight: 300,
    marginBottom: 16,
  },
  jokerOption: {
    backgroundColor: '#f5e6d3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d4a574',
  },
  jokerOptionAfterSchool: {
    backgroundColor: 'rgba(184, 169, 201, 0.2)',
    borderColor: '#8a7ca8',
  },
  jokerOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jokerOptionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    flex: 1,
  },
  jokerOptionNameAfterSchool: {
    color: '#b8a9c9',
  },
  jokerOptionType: {
    fontSize: 16,
    fontWeight: '600',
  },
  jokerOptionDescription: {
    fontSize: 14,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    lineHeight: 18,
  },
  jokerOptionDescriptionAfterSchool: {
    color: '#b8a9c9',
  },
  noJokersContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noJokersText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 8,
  },
  noJokersTextAfterSchool: {
    color: '#f7e98e',
  },
  noJokersSubtext: {
    fontSize: 14,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  noJokersSubtextAfterSchool: {
    color: '#b8a9c9',
  },
  candyOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  candyQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
  candyQuantityAfterSchool: {
    color: '#b8a9c9',
  },
  candyAvgPrice: {
    fontSize: 12,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    opacity: 0.8,
  },
  candyAvgPriceAfterSchool: {
    color: '#b8a9c9',
  },
  conversionSummary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5e6d3',
    borderRadius: 8,
  },
  conversionSummaryAfterSchool: {
    color: '#b8a9c9',
    backgroundColor: 'rgba(184, 169, 201, 0.2)',
  },
  targetPrice: {
    fontSize: 12,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    opacity: 0.8,
    marginTop: 2,
  },
  targetPriceAfterSchool: {
    color: '#b8a9c9',
  },
});