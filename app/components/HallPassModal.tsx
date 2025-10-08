import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHallPass } from '../../src/hooks/useHallPass';
import { HallPass } from '../../src/store/slices/hallPassSlice';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';

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
  const { allPasses, unlockedPasses, selectedPassIds } = useHallPass();
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(
    selectedPassIds || []
  );

  const isSelectionMode = viewMode === 'selection' && onSelectPass;

  // Debug logging when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      console.log('🎓 HALL PASS MODAL: Opened');
      console.log('🎓 HALL PASS MODAL: Total passes:', allPasses.length);
      console.log('🎓 HALL PASS MODAL: Unlocked passes:', unlockedPasses.length);
      console.log('🎓 HALL PASS MODAL: Unlocked pass IDs:', unlockedPasses.map(p => p.id));
      console.log('🎓 HALL PASS MODAL: All passes unlocked status:', allPasses.map(p => ({ id: p.id, isUnlocked: p.isUnlocked })));
    }
  }, [visible, allPasses, unlockedPasses]);

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

  const handleSelectPass = (passId: string) => {
    if (isSelectionMode) {
      // Toggle selection and immediately call onSelectPass to update Redux
      if (onSelectPass) {
        onSelectPass(passId); // This toggles in Redux
      }
      // Update local state for UI
      if (localSelectedIds.includes(passId)) {
        setLocalSelectedIds(localSelectedIds.filter((id) => id !== passId));
      } else {
        setLocalSelectedIds([...localSelectedIds, passId]);
      }
    }
  };

  const handleConfirm = () => {
    onClose();
  };

  const renderPassCard = (pass: HallPass) => {
    const isSelected = isSelectionMode && localSelectedIds.includes(pass.id);
    const isUnlocked = pass.isUnlocked;
    const isCurrentlySelected =
      !isSelectionMode && selectedPassIds.includes(pass.id);

    return (
      <PixelBorder
        key={pass.id}
        borderColor={
          isSelected || isCurrentlySelected
            ? '#2196F3'
            : getRarityColor(pass.rarity)
        }
        borderWidth={isSelected || isCurrentlySelected ? 4 : 3}
        backgroundColor={
          isUnlocked ? getRarityBackground(pass.rarity) : '#f5f5f5'
        }
        innerPadding={0}
        style={[styles.passCardWrapper, { opacity: isUnlocked ? 1 : 0.6 }]}
      >
        <TouchableOpacity
          style={styles.passCard}
          onPress={() =>
            isUnlocked && isSelectionMode && handleSelectPass(pass.id)
          }
          disabled={!isUnlocked || !isSelectionMode}
        >
          <View style={styles.passHeader}>
            <Image
              source={require('../../assets/images/emojis/hallpass.png')}
              style={[styles.hallPassIcon, { opacity: isUnlocked ? 1 : 0.4 }]}
            />
            <View style={styles.headerTextContainer}>
              <Text
                style={[
                  styles.passName,
                  { color: isUnlocked ? getRarityColor(pass.rarity) : '#999' },
                ]}
              >
                {pass.name}
              </Text>
              <Text
                style={[
                  styles.passRarity,
                  { color: isUnlocked ? getRarityColor(pass.rarity) : '#999' },
                ]}
              >
                {pass.rarity.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.passDescription,
              { color: isUnlocked ? '#333' : '#999' },
            ]}
          >
            {pass.description}
          </Text>

          {
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/emojis/lock.png')}
                style={{
                  width: 24,
                  height: 24,
                  resizeMode: 'contain',
                  marginRight: 4,
                }}
              />
              <Text style={styles.unlockRequirement}>
                {pass.unlockRequirement}
              </Text>
            </View>
          }

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
              <Text style={styles.selectedText}>✓</Text>
            </View>
          )}

          {!isUnlocked && <View style={styles.lockedOverlay}></View>}
        </TouchableOpacity>
      </PixelBorder>
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
          ? 'Choose Hall Passes to gain permanent bonuses (select multiple)'
          : 'Your collection of earned Hall Passes'}
      </Text>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
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
    fontFamily: 'PixeloidMono',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
    color: '#666',
    marginRight: 8,
  },
  currentPass: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
    color: '#333',
    marginBottom: 4,
  },
  noneDescription: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    color: '#666',
  },
  passCardWrapper: {
    marginBottom: 12,
  },
  passCard: {
    padding: 8,
    paddingHorizontal: 12,
    position: 'relative',
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hallPassIcon: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  passName: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    marginBottom: 2,
  },
  passRarity: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
  },
  passDescription: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    marginBottom: 12,
    lineHeight: 20,
  },
  unlockRequirement: {
    fontSize: 12,
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
    marginBottom: 12,
    color: '#999',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 8,
    borderRadius: 6,
  },
  effectsContainer: {
    marginTop: 0,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },

  effectText: {
    fontSize: 12,
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
    lineHeight: 18,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#2196F3',
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  selectedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
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
    fontFamily: 'PixeloidMono',
    color: '#666',
    fontWeight: 'bold',
  },
  confirmText: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    color: 'white',
    fontWeight: 'bold',
  },
  unlockedCount: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    color: '#666',
    marginTop: 8,
  },
});
