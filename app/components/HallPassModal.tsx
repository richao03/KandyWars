import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import colors from '../../src/constants/colors';
import { useHallPass } from '../../src/hooks/useHallPass';
import { HallPass } from '../../src/store/slices/hallPassSlice';
import { computeHallPassModifiers } from '../../src/utils/computeHallPassModifiers';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import ScrollViewWithFade from './ScrollViewWithFade';

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

  // Memoize modifier computation to avoid redundant calculations on every render
  const selectedPassesForModifiers = useMemo(() => {
    if (!visible || !isSelectionMode || localSelectedIds.length === 0) {
      return null;
    }
    return allPasses.filter((p) => localSelectedIds.includes(p.id));
  }, [visible, isSelectionMode, localSelectedIds, allPasses]);

  const computedModifiers = useMemo(() => {
    if (!selectedPassesForModifiers) return null;
    return computeHallPassModifiers(selectedPassesForModifiers);
  }, [selectedPassesForModifiers]);

  // Sync local state with Redux when modal opens
  React.useEffect(() => {
    if (visible) {
      // Sync local selection state with Redux
      setLocalSelectedIds(selectedPassIds || []);
    }
  }, [visible, allPasses, unlockedPasses, selectedPassIds, isSelectionMode]);

  const getRarityColor = (rarity: HallPass['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'grey'; // White
      case 'magical':
        return '#00A86B'; // Green
      case 'rare':
        return '#0070dd'; // Blue
      case 'epic':
        return '#a335ee'; // Purple
      case 'legendary':
        return '#ff8000'; // Orange
      default:
        return colors.gray.medium;
    }
  };

  const getRarityBackground = (rarity: HallPass['rarity']) => {
    switch (rarity) {
      case 'common':
        return colors.gold.beige; // Beige - very popular background
      case 'magical':
        return '#bbffb2'; // Light green tint
      case 'rare':
        return '#b2d4f4'; // Light blue tint
      case 'epic':
        return '#e3c2f9'; // Light purple tint
      case 'legendary':
        return '#ffcc99'; // Light orange tint
      default:
        return colors.offWhite;
    }
  };

  const getRarityGlow = (rarity: HallPass['rarity']) => {
    switch (rarity) {
      case 'common':
        return '#ffffff'; // White
      case 'magical':
        return '#1eff00'; // Green
      case 'rare':
        return '#0070dd'; // Blue
      case 'epic':
        return '#a335ee'; // Purple
      case 'legendary':
        return '#ff8000'; // Orange
      default:
        return colors.gray.light;
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
      <View
        key={pass.id}
        style={[
          styles.passCardWrapper,
          isUnlocked && {
            shadowColor: getRarityGlow(pass.rarity),
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 4,
            elevation: 4,
          },
        ]}
      >
        <PixelBorder
          borderColor={getRarityColor(pass.rarity)}
          borderWidth={isSelected || isCurrentlySelected ? 4 : 3}
          backgroundColor={
            isUnlocked ? getRarityBackground(pass.rarity) : colors.offWhite
          }
          innerPadding={0}
          style={{ opacity: isUnlocked ? 1 : 0.5 }}
        >
          <PressableButton
            onPress={() => handlePassClick(pass.id, isUnlocked)}
            style={styles.passCard}
            shadowOpacity={0}
            elevation={0}
          >
            <View style={styles.passHeader}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              >
                <Image
                  source={require('../../assets/images/emojis/hallpass.png')}
                  style={[
                    styles.hallPassIcon,
                    { opacity: isUnlocked ? 1 : 0.4 },
                  ]}
                />
                <View style={styles.headerTextContainer}>
                  <Text
                    style={[
                      styles.passName,
                      {
                        color: isUnlocked
                          ? getRarityColor(pass.rarity)
                          : colors.gray.light,
                        textShadowRadius: 0,
                      },
                    ]}
                  >
                    {pass.name}
                  </Text>
                  <Text
                    style={[
                      styles.passRarity,
                      {
                        color: isUnlocked
                          ? getRarityColor(pass.rarity)
                          : colors.gray.light,
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
                  <PressableButton
                    onPress={(e) => handleSelectPass(pass.id, e)}
                    style={[
                      styles.checkboxButton,
                      isSelected && styles.checkboxButtonSelected,
                    ]}
                  >
                    {isSelected && <Text style={styles.checkboxText}>✓</Text>}
                  </PressableButton>
                )}
                <Text style={styles.expandIcon}>{isExpanded ? 'v' : '>>'}</Text>
              </View>
            </View>

            {isExpanded && (
              <View style={styles.expandedContent}>
                <Text
                  style={[
                    styles.passDescription,
                    {
                      color: isUnlocked ? colors.gray.dark : colors.gray.light,
                    },
                  ]}
                >
                  {pass.description}
                </Text>
                {isUnlocked && (
                  <Text
                    style={[
                      styles.unlockRequirement,
                      styles.unlockRequirementLocked,
                    ]}
                  >
                    Unlocked: {pass.unlockRequirement}
                  </Text>
                )}

                <View style={styles.effectsContainer}>
                  <Text style={styles.effectsTitle}>Effects:</Text>
                  {pass.effects.map((effect, index) => (
                    <Text
                      key={index}
                      style={[
                        styles.effectText,
                        {
                          color: isUnlocked
                            ? colors.brown.secondary
                            : colors.gray.light,
                        },
                      ]}
                    >
                      • {effect.description}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {!isUnlocked && (
              <View style={styles.lockedOverlay}>
                {!isExpanded && (
                  <Image
                    source={require('../../assets/images/emojis/lock.png')}
                    style={styles.lockIcon}
                  />
                )}
                {isExpanded && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                      zIndex: !isUnlocked ? 10 : 0,
                      position: 'relative',
                      borderWidth: 2,
                      padding: 4,
                      borderColor: getRarityColor(pass.rarity),
                      backgroundColor: colors.offWhite,
                    }}
                  >
                    {!isUnlocked && (
                      <Image
                        source={require('../../assets/images/emojis/lock.png')}
                        style={{
                          width: 40,
                          height: 40,
                          resizeMode: 'contain',
                          marginRight: 6,
                        }}
                      />
                    )}
                    <Text
                      style={[
                        styles.unlockRequirement,
                        styles.unlockRequirementLocked,
                      ]}
                    >
                      {pass.unlockRequirement}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </PressableButton>
        </PixelBorder>
      </View>
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
        borderColor={colors.brown.secondary}
        borderWidth={3}
        backgroundColor={colors.offWhite}
        innerPadding={14}
      >
        <View style={styles.headerContainer}>
          <Image
            source={require('../../assets/images/emojis/hallpass.png')}
            style={styles.titleIcon}
          />
          <Text style={styles.title}>Hall Passes</Text>
          <Image
            source={require('../../assets/images/emojis/hallpass.png')}
            style={styles.titleIcon}
          />
        </View>

        {isSelectionMode &&
          localSelectedIds.length > 0 &&
          computedModifiers && (
            <PixelBorder
              borderColor={colors.brown.secondary}
              borderWidth={3}
              backgroundColor={colors.gold.beige}
              innerPadding={8}
              style={styles.accumulatedEffects}
            >
              <View style={styles.accumulatedHeader}>
                <Text style={styles.accumulatedTitle}>
                  {localSelectedIds.length} pass
                  {localSelectedIds.length !== 1 ? 'es' : ''} selected
                </Text>
              </View>
              {computedModifiers.salePriceBonusPercent > 0 && (
                <Text style={styles.accumulatedEffect}>
                  💰 +{(computedModifiers.salePriceBonusPercent * 5).toFixed(0)}
                  % sales profit
                </Text>
              )}
              {computedModifiers.inventoryBonusSlots > 0 && (
                <Text style={styles.accumulatedEffect}>
                  🎒 +{computedModifiers.inventoryBonusSlots} inventory slots
                </Text>
              )}
              {computedModifiers.allowanceBonusPercent > 0 && (
                <Text style={styles.accumulatedEffect}>
                  💵 +{computedModifiers.allowanceBonusPercent}% daily allowance
                </Text>
              )}
              {computedModifiers.jokerBonusCount > 0 && (
                <Text style={styles.accumulatedEffect}>
                  🃏 +{computedModifiers.jokerBonusCount} joker
                  {computedModifiers.jokerBonusCount !== 1 ? 's' : ''}
                </Text>
              )}
              {computedModifiers.rerollBonusCount > 0 && (
                <Text style={styles.accumulatedEffect}>
                  🔄 +{computedModifiers.rerollBonusCount} reroll
                  {computedModifiers.rerollBonusCount !== 1 ? 's' : ''}
                </Text>
              )}
            </PixelBorder>
          )}

        <ScrollViewWithFade
          fadeColor={colors.offWhite}
          fadeHeight={10}
          wrapperStyle={styles.scrollViewWrapper}
          style={styles.scrollContainer}
        >
          {/* All passes */}
          {allPasses.map(renderPassCard)}
        </ScrollViewWithFade>

        {/* Button container - show different buttons based on mode */}
        <View style={styles.buttonContainer}>
          {isSelectionMode && onConfirm ? (
            // New game flow - show Cancel and Let's go buttons
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
            // Gallery mode - show Back button
            <PressableButton
              onPress={onClose}
              shadowColor="#6b5a2d"
              shadowOffset={{ width: 0, height: 3 }}
              shadowOpacity={0.4}
              shadowRadius={4}
              elevation={6}
              style={{ width: '100%' }}
            >
              <PixelBorder
                borderColor="#d1d5db"
                borderWidth={3}
                backgroundColor="#f3f4f6"
                innerPadding={0}
              >
                <View style={styles.cancelButtonInner}>
                  <Text style={styles.cancelText}>Back</Text>
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
    borderRadius: 36,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: colors.brown.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 12,
  },
  titleIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    color: colors.brown.primary,
    textAlign: 'center',
    textShadowColor: 'rgba(139, 111, 71, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    color: colors.brown.primary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  selectedCount: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    color: colors.orange.primary,
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
    backgroundColor: colors.gold.beige,
    borderRadius: 8,
  },
  currentLabel: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    color: colors.gray.medium,
    marginRight: 8,
  },
  currentPass: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
    color: colors.gray.dark,
  },
  scrollViewWrapper: {
    position: 'relative',
    maxHeight: 320,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scrollContainer: {
    maxHeight: 320,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  noneOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.gold.beige,
    marginBottom: 12,
    position: 'relative',
  },
  noneText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    color: colors.gray.dark,
    marginBottom: 4,
  },
  noneDescription: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    color: colors.gray.medium,
  },
  passCardWrapper: {
    marginBottom: 12,
  },
  passCard: {
    padding: 10,
    paddingHorizontal: 12,
    position: 'relative',
    textShadowRadius: 0,
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hallPassIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  passName: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    marginBottom: 2,
    textShadowRadius: 0,
  },
  passRarity: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
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
    color: colors.gray.medium,
    fontFamily: 'PixeloidMono',
  },
  checkboxButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.gray.light,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxButtonSelected: {
    backgroundColor: colors.green.success,
    borderColor: colors.green.success,
  },
  checkboxText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
  unlockRequirement: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
    color: colors.gray.medium,
  },
  unlockRequirementLocked: {
    color: colors.gray.dark,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  effectsContainer: {
    marginTop: 4,
  },
  effectsTitle: {
    fontSize: 11,
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
    color: colors.gray.dark,
    marginBottom: 4,
  },
  effectText: {
    fontSize: 11,
    fontFamily: 'PixeloidMono',
    marginBottom: 3,
    lineHeight: 16,
  },
  selectedIndicator: {
    backgroundColor: colors.orange.primary,
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  selectedText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
  accumulatedEffects: {
    marginBottom: 14,
  },
  accumulatedHeader: {
    marginBottom: 8,
  },
  accumulatedTitle: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
    color: colors.brown.primary,
    textAlign: 'center',
  },
  accumulatedEffect: {
    fontSize: 13,
    fontFamily: 'PixeloidMono',
    color: colors.brown.secondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    opacity: 0.6,
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
    color: colors.gray.dark,
    fontWeight: '700',
  },
  confirmText: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    color: colors.white,
    fontWeight: '800',
  },
  unlockedCount: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'PixeloidMono',
    color: colors.brown.secondary,
    marginTop: 12,
    fontWeight: '600',
  },
});
