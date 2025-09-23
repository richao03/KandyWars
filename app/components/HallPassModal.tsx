import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHallPass } from '../../src/hooks/useHallPass';
import { HallPass } from '../../src/store/slices/hallPassSlice';
import FastModal from './FastModal';

interface HallPassModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPass?: (passId: string | null) => void; // Optional for view-only mode
  viewMode?: 'selection' | 'gallery'; // New prop to control mode
}

export default function HallPassModal({
  visible,
  onClose,
  onSelectPass,
  viewMode = 'selection',
}: HallPassModalProps) {
  const { allPasses, unlockedPasses, selectedPass } = useHallPass();
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(
    selectedPass?.id || null
  );

  const isSelectionMode = viewMode === 'selection' && onSelectPass;

  const getRarityColor = (rarity: HallPass['rarity']) => {
    switch (rarity) {
      case 'common':
        return '#4a7c4a';
      case 'rare':
        return '#4a7c8a';
      case 'epic':
        return '#8a4a7c';
      case 'legendary':
        return '#8a7c4a';
      default:
        return '#666';
    }
  };

  const getRarityBackground = (rarity: HallPass['rarity']) => {
    switch (rarity) {
      case 'common':
        return '#e8f5e8';
      case 'rare':
        return '#e8f0f5';
      case 'epic':
        return '#f0e8f5';
      case 'legendary':
        return '#f5f0e8';
      default:
        return '#f0f0f0';
    }
  };

  const handleSelectPass = (passId: string | null) => {
    if (isSelectionMode) {
      setLocalSelectedId(passId);
    }
  };

  const handleConfirm = () => {
    if (isSelectionMode && onSelectPass) {
      onSelectPass(localSelectedId);
    }
    onClose();
  };

  const renderPassCard = (pass: HallPass) => {
    const isSelected = isSelectionMode && localSelectedId === pass.id;
    const isUnlocked = pass.isUnlocked;
    const isCurrentlySelected =
      !isSelectionMode && selectedPass?.id === pass.id;

    return (
      <TouchableOpacity
        key={pass.id}
        style={[
          styles.passCard,
          {
            backgroundColor: isUnlocked
              ? getRarityBackground(pass.rarity)
              : '#f5f5f5',
            borderColor:
              isSelected || isCurrentlySelected
                ? '#2196F3'
                : getRarityColor(pass.rarity),
            borderWidth: isSelected || isCurrentlySelected ? 3 : 2,
            opacity: isUnlocked ? 1 : 0.6,
          },
        ]}
        onPress={() =>
          isUnlocked && isSelectionMode && handleSelectPass(pass.id)
        }
        disabled={!isUnlocked || !isSelectionMode}
      >
        <View style={styles.passHeader}>
          <Text
            style={[
              styles.passName,
              { color: isUnlocked ? getRarityColor(pass.rarity) : '#999' },
            ]}
          >
            {pass.name}
          </Text>
          <Text
            style={[styles.passRarity, { color: getRarityColor(pass.rarity) }]}
          >
            {pass.rarity.toUpperCase()}
          </Text>
        </View>

        <Text
          style={[
            styles.passDescription,
            { color: isUnlocked ? '#333' : '#999' },
          ]}
        >
          {pass.description}
        </Text>

        <Text
          style={[
            styles.passRequirement,
            { color: isUnlocked ? '#666' : '#999' },
          ]}
        >
          {isUnlocked ? '✓ Unlocked' : `${pass.unlockRequirement}`}
        </Text>

        <View style={styles.effectsContainer}>
          {pass.effects.map((effect, index) => (
            <Text
              key={index}
              style={[
                styles.effectText,
                { color: isUnlocked ? '#4a7c4a' : '#999' },
              ]}
            >
              • {effect.description}
            </Text>
          ))}
        </View>

        {(isSelected || isCurrentlySelected) && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedText}>
              {isSelectionMode ? 'SELECTED' : 'ACTIVE'}
            </Text>
          </View>
        )}

        {!isUnlocked && <View style={styles.lockedOverlay}></View>}
      </TouchableOpacity>
    );
  };

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="spring"
      backdropOpacity={0.8}
      modalStyle={styles.modalContainer}
    >
      <Text style={styles.title}>Hall Pass Hall of Fame</Text>
      <Text style={styles.subtitle}>
        {isSelectionMode
          ? 'Choose a Hall Pass to gain permanent bonuses'
          : 'Your collection of earned Hall Passes'}
      </Text>

      {isSelectionMode && (
        <View style={styles.currentSelection}>
          <Text style={styles.currentLabel}>Current Selection:</Text>
          <Text style={styles.currentPass}>
            {localSelectedId
              ? allPasses.find((p) => p.id === localSelectedId)?.name || 'None'
              : 'None'}
          </Text>
        </View>
      )}

      {!isSelectionMode && selectedPass && (
        <View style={styles.currentSelection}>
          <Text style={styles.currentLabel}>Currently Active:</Text>
          <Text style={styles.currentPass}>{selectedPass.name}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* None option - only show in selection mode */}
        {isSelectionMode && (
          <TouchableOpacity
            style={[
              styles.noneOption,
              {
                borderColor: localSelectedId === null ? '#2196F3' : '#ccc',
                borderWidth: localSelectedId === null ? 3 : 2,
              },
            ]}
            onPress={() => handleSelectPass(null)}
          >
            <Text style={styles.noneText}>No Hall Pass</Text>
            <Text style={styles.noneDescription}>Play without any bonuses</Text>
            {localSelectedId === null && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.selectedText}>SELECTED</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* All passes */}
        {allPasses.map(renderPassCard)}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {isSelectionMode ? (
          <>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.confirmButton} onPress={onClose}>
            <Text style={styles.confirmText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.unlockedCount}>
        Unlocked: {unlockedPasses.length} / {allPasses.length}
      </Text>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'CrayonPastel',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  currentSelection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  currentLabel: {
    fontSize: 16,
    fontFamily: 'CrayonPastel',
    color: '#666',
    marginRight: 8,
  },
  currentPass: {
    fontSize: 16,
    fontFamily: 'CrayonPastel',
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContainer: {
    maxHeight: 400,
    marginBottom: 16,
  },
  noneOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
    position: 'relative',
  },
  noneText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
    color: '#333',
    marginBottom: 4,
  },
  noneDescription: {
    fontSize: 14,
    fontFamily: 'CrayonPastel',
    color: '#666',
  },
  passCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    position: 'relative',
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passName: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
    flex: 1,
  },
  passRarity: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
  },
  passDescription: {
    fontSize: 14,
    fontFamily: 'CrayonPastel',
    marginBottom: 8,
  },
  passRequirement: {
    fontSize: 12,
    fontFamily: 'CrayonPastel',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  effectsContainer: {
    marginTop: 4,
  },
  effectText: {
    fontSize: 13,
    fontFamily: 'CrayonPastel',
    marginBottom: 2,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 32,
    opacity: 0.7,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#4a7c4a',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'CrayonPastel',
    color: '#666',
    fontWeight: 'bold',
  },
  confirmText: {
    fontSize: 16,
    fontFamily: 'CrayonPastel',
    color: 'white',
    fontWeight: 'bold',
  },
  unlockedCount: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'CrayonPastel',
    color: '#666',
    marginTop: 8,
  },
});
