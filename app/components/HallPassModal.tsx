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
import { computeHallPassModifiers } from '../../src/utils/computeHallPassModifiers';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

interface HallPassModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPass?: (passId: string | null) => void; // Optional for view-only mode
  onConfirm?: () => void; // Called when "Pack Hall Passes" is clicked (for new game flow)
  viewMode?: 'selection' | 'gallery'; // New prop to control mode
}

export default function HallPassModal({
  visible,
  onClose,
  onSelectPass,
  onConfirm,
  viewMode = 'selection',
}: HallPassModalProps) {
  const { allPasses, unlockedPasses, selectedPassIds } = useHallPass();
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(
    selectedPassIds || []
  );
  const [expandedPassId, setExpandedPassId] = useState<string | null>(null);

  const isSelectionMode = viewMode === 'selection' && onSelectPass;

  // Sync local state with Redux when modal opens
  React.useEffect(() => {
    if (visible) {
      console.log('🎓 HALL PASS MODAL: Opened');
      console.log('🎓 HALL PASS MODAL: Total passes:', allPasses.length);
      console.log(
        '🎓 HALL PASS MODAL: Unlocked passes:',
        unlockedPasses.length
      );
      console.log(
        '🎓 HALL PASS MODAL: Unlocked pass IDs:',
        unlockedPasses.map((p) => p.id)
      );
      console.log(
        '🎓 HALL PASS MODAL: Currently selected pass IDs from Redux:',
        selectedPassIds
      );
      console.log('🎓 HALL PASS MODAL: isSelectionMode:', isSelectionMode);

      // Sync local selection state with Redux
      setLocalSelectedIds(selectedPassIds || []);
    }
  }, [visible, allPasses, unlockedPasses, selectedPassIds, isSelectionMode]);

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

  const handlePassClick = (passId: string, isUnlocked: boolean) => {
    // Always allow expanding/collapsing to view details
    if (expandedPassId === passId) {
      setExpandedPassId(null); // Collapse if already expanded
    } else {
      setExpandedPassId(passId); // Expand to show details
    }
  };

  const handleSelectPass = (passId: string, e: any) => {
    // Stop propagation to prevent triggering expand/collapse
    e?.stopPropagation?.();

    if (isSelectionMode) {
      console.log('🎖️ MODAL: Pass selected:', passId);
      console.log('🎖️ MODAL: Current localSelectedIds:', localSelectedIds);

      // Toggle selection and immediately call onSelectPass to update Redux
      if (onSelectPass) {
        onSelectPass(passId); // This toggles in Redux
      }

      // Update local state for UI
      if (localSelectedIds.includes(passId)) {
        const newIds = localSelectedIds.filter((id) => id !== passId);
        console.log('🎖️ MODAL: Removing pass, new selection:', newIds);
        setLocalSelectedIds(newIds);
      } else {
        const newIds = [...localSelectedIds, passId];
        console.log('🎖️ MODAL: Adding pass, new selection:', newIds);
        setLocalSelectedIds(newIds);
      }
    }
  };

  const handleConfirm = () => {
    console.log('🎖️ MODAL: Pack Hall Passes clicked');
    if (onConfirm) {
      // New game flow - call onConfirm to proceed to difficulty selection
      onConfirm();
    } else {
      // Regular flow - just close
      onClose();
    }
  };

  const renderPassCard = (pass: HallPass) => {
    const isSelected = isSelectionMode && localSelectedIds.includes(pass.id);
    const isUnlocked = pass.isUnlocked;
    const isCurrentlySelected =
      !isSelectionMode && selectedPassIds.includes(pass.id);
    const isExpanded = expandedPassId === pass.id;

    return (
      <PixelBorder
        key={pass.id}
        borderColor={
          isSelected || isCurrentlySelected
            ? '#2196F3'
            : getRarityColor(pass.rarity)
        }
        borderWidth={isSelected || isCurrentlySelected ? 3 : 2}
        backgroundColor={
          isUnlocked ? getRarityBackground(pass.rarity) : '#f5f5f5'
        }
        innerPadding={0}
        style={[styles.passCardWrapper, { opacity: isUnlocked ? 1 : 0.6 }]}
      >
        <TouchableOpacity
          style={styles.passCard}
          onPress={() => handlePassClick(pass.id, isUnlocked)}
          activeOpacity={0.7}
        >
          <View style={styles.passHeader}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            >
              <Image
                source={require('../../assets/images/emojis/hallpass.png')}
                style={[styles.hallPassIcon, { opacity: isUnlocked ? 1 : 0.4 }]}
              />
              <View style={styles.headerTextContainer}>
                <Text
                  style={[
                    styles.passName,
                    {
                      color: isUnlocked ? getRarityColor(pass.rarity) : '#999',
                    },
                  ]}
                >
                  {pass.name}
                </Text>
                <Text
                  style={[
                    styles.passRarity,
                    {
                      color: isUnlocked ? getRarityColor(pass.rarity) : '#999',
                    },
                  ]}
                >
                  {pass.rarity.toUpperCase()}
                </Text>
              </View>
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              {isSelectionMode && isUnlocked && (
                <TouchableOpacity
                  style={[
                    styles.checkboxButton,
                    isSelected && styles.checkboxButtonSelected,
                  ]}
                  onPress={(e) => handleSelectPass(pass.id, e)}
                >
                  {isSelected && <Text style={styles.checkboxText}>✓</Text>}
                </TouchableOpacity>
              )}
              <Text style={styles.expandIcon}>{isExpanded ? 'v' : '>>'}</Text>
            </View>
          </View>

          {isExpanded && (
            <View style={styles.expandedContent}>
              <Text
                style={[
                  styles.passDescription,
                  { color: isUnlocked ? '#333' : '#999' },
                ]}
              >
                {pass.description}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Image
                  source={require('../../assets/images/emojis/lock.png')}
                  style={{
                    width: 20,
                    height: 20,
                    resizeMode: 'contain',
                    marginRight: 6,
                  }}
                />
                <Text style={styles.unlockRequirement}>
                  {pass.unlockRequirement}
                </Text>
              </View>

              <View style={styles.effectsContainer}>
                <Text style={styles.effectsTitle}>Effects:</Text>
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
      <PixelBorder
        borderColor="#d4a574"
        borderWidth={3}
        backgroundColor="rgba(255, 255, 255, 0.95)"
        innerPadding={24}
      >
        <Text style={styles.title}>Hall Passes</Text>
        <Text style={styles.subtitle}>
          {isSelectionMode
            ? 'Choose Hall Passes to gain bonuses'
            : 'Your collection of earned Hall Passes'}
        </Text>
        {isSelectionMode &&
          localSelectedIds.length > 0 &&
          (() => {
            const selectedPasses = allPasses.filter((p) =>
              localSelectedIds.includes(p.id)
            );
            const modifiers = computeHallPassModifiers(selectedPasses);
            return (
              <PixelBorder
                borderColor="#4a7c4a"
                borderWidth={3}
                backgroundColor="#e8f5e8"
                innerPadding={12}
                style={styles.accumulatedEffects}
              >
                <Text style={styles.accumulatedTitle}>
                  {localSelectedIds.length} pass
                  {localSelectedIds.length !== 1 ? 'es' : ''} selected:
                </Text>
                {modifiers.salePriceBonusPercent > 0 && (
                  <Text style={styles.accumulatedEffect}>
                    💰 +{modifiers.salePriceBonusPercent * 5}% profit bonus on
                    sales
                  </Text>
                )}
                {modifiers.inventoryBonusSlots > 0 && (
                  <Text style={styles.accumulatedEffect}>
                    🎒 +{modifiers.inventoryBonusSlots} inventory slots
                  </Text>
                )}
                {modifiers.allowanceBonusPercent > 0 && (
                  <Text style={styles.accumulatedEffect}>
                    💵 +{modifiers.allowanceBonusPercent}% daily allowance
                  </Text>
                )}
                {modifiers.jokerBonusCount > 0 && (
                  <Text style={styles.accumulatedEffect}>
                    🃏 +{modifiers.jokerBonusCount} joker
                    {modifiers.jokerBonusCount !== 1 ? 's' : ''}
                  </Text>
                )}
                {modifiers.extraPeriodsPerDay > 0 && (
                  <Text style={styles.accumulatedEffect}>
                    ⏰ +{modifiers.extraPeriodsPerDay} period
                    {modifiers.extraPeriodsPerDay !== 1 ? 's' : ''} per day
                  </Text>
                )}
              </PixelBorder>
            );
          })()}

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
              <PressableButton
                onPress={onClose}
                shadowColor="#6b5a2d"
                shadowOffset={{ width: 0, height: 3 }}
                shadowOpacity={0.4}
                shadowRadius={4}
                elevation={6}
                style={{ flex: 1 }}
              >
                <PixelBorder
                  borderColor="#d1d5db"
                  borderWidth={3}
                  backgroundColor="#f3f4f6"
                  innerPadding={0}
                >
                  <View style={styles.cancelButtonInner}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </View>
                </PixelBorder>
              </PressableButton>

              <PressableButton
                onPress={handleConfirm}
                shadowColor="rgba(123,169,101,1)"
                shadowOffset={{ width: 0, height: 4 }}
                shadowOpacity={0.5}
                shadowRadius={5}
                elevation={8}
                style={{ flex: 1 }}
              >
                <PixelBorder
                  borderColor="rgba(123,169,101,1)"
                  borderWidth={3}
                  backgroundColor="rgba(154,193,118,1)"
                  innerPadding={0}
                >
                  <View style={styles.confirmButtonInner}>
                    <Text style={styles.confirmText}>Lets go!</Text>
                  </View>
                </PixelBorder>
              </PressableButton>
            </>
          ) : (
            <PressableButton
              onPress={onClose}
              shadowColor="rgba(123,169,101,1)"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={5}
              elevation={8}
            >
              <PixelBorder
                borderColor="rgba(123,169,101,1)"
                borderWidth={3}
                backgroundColor="rgba(154,193,118,1)"
                innerPadding={0}
              >
                <View style={styles.confirmButtonInner}>
                  <Text style={styles.confirmText}>Close</Text>
                </View>
              </PixelBorder>
            </PressableButton>
          )}
        </View>

        <Text style={styles.unlockedCount}>
          Unlocked: {unlockedPasses.length} / {allPasses.length}
        </Text>
      </PixelBorder>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    borderRadius: 24,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
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
    marginBottom: 8,
  },
  selectedCount: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    color: '#2196F3',
    fontWeight: 'bold',
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
    maxHeight: 300,
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
    marginBottom: 8,
  },
  passCard: {
    padding: 6,
    paddingHorizontal: 10,
    position: 'relative',
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hallPassIcon: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  passName: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    marginBottom: 1,
  },
  passRarity: {
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    letterSpacing: 0.5,
  },
  passDescription: {
    fontSize: 12,
    fontFamily: 'PixeloidMono',
    marginBottom: 10,
    lineHeight: 18,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  expandIcon: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'PixeloidMono',
  },
  checkboxButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#999',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
  unlockRequirement: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
    color: '#666',
  },
  effectsContainer: {
    marginTop: 4,
  },
  effectsTitle: {
    fontSize: 11,
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  effectText: {
    fontSize: 11,
    fontFamily: 'PixeloidMono',
    marginBottom: 3,
    lineHeight: 16,
  },
  selectedIndicator: {
    backgroundColor: '#2196F3',
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  selectedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
  accumulatedEffects: {
    marginBottom: 12,
  },
  accumulatedTitle: {
    fontSize: 12,
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
    color: '#2d5f2d',
    marginBottom: 8,
  },
  accumulatedEffect: {
    fontSize: 12,
    fontFamily: 'PixeloidMono',
    color: '#2d5f2d',
    marginBottom: 4,
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
  cancelButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  confirmButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    color: '#374151',
    fontWeight: '700',
  },
  confirmText: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    color: '#ffffff',
    fontWeight: '800',
    textShadowColor: '#166534',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  unlockedCount: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    color: '#666',
    marginTop: 8,
  },
});
