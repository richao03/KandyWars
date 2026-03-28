import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, SectionList, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import colors from '../../src/constants/colors';
import { JOKER_IDS } from '../../src/constants/jokerIds';
import { useEventHandler } from '../../src/hooks/useEventHandler';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useSeed } from '../../src/hooks/useSeed';
import { useTutorial } from '../../src/hooks/useTutorial';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import {
  setHasDuplicatedVacuumSealer,
  setStashedAmount,
} from '../../src/store/slices/walletSlice';
import { ALL_JOKERS } from '../../src/utils/jokerEffectEngine';
import FastModal from '../components/FastModal';
import JokerCard from '../components/JokerCard';
import JokerConfirmationModal from '../components/JokerConfirmationModal';
import PixelBorder from '../components/PixelBorder';
import PressableButton from '../components/PressableButton';
import TextWithEmojis from '../components/TextWithEmojis';
import { CANDY_NAMES } from '../../src/constants/candyRegistry';

const CANDY_TYPES = CANDY_NAMES;

function JokersPage() {
  // Always call all hooks first - before any conditional returns
  const dispatch = useAppDispatch();
  const stashedAmount = useAppSelector((state) => state.wallet.stashedAmount);
  const gameContext = useGame();
  const jokerContext = useJokers();
  const inventoryContext = useInventory();
  const seedContext = useSeed();
  const { triggerEvent } = useEventHandler();
  const isFocused = useIsFocused();
  const { currentStep: tutorialStep, isActive: tutorialActive, advance: advanceTutorial, skip: skipTutorial, registerTarget } = useTutorial();
  const [activeTab, setActiveTab] = useState<'inventory' | 'see-all'>(
    'inventory'
  );
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    emoji: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    visible: false,
    title: '',
    message: '',
    emoji: '',
    onConfirm: () => {},
  });

  // Candy Selector Modal state
  const [candySelectorModal, setCandySelectorModal] = useState<{
    visible: boolean;
    joker: any | null;
  }>({
    visible: false,
    joker: null,
  });

  // Debug mode state
  const [debugMode, setDebugMode] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const debugToggleRef = React.useRef(false);

  // Handle debug mode activation (5 taps on joker icon)
  const handleDebugTap = () => {
    if (!__DEV__) return;

    // If debug mode is already on, toggle it off
    if (debugMode) {
      // Prevent multiple rapid toggles
      if (debugToggleRef.current) return;
      debugToggleRef.current = true;

      setDebugMode(false);
      console.log('🐛 Debug mode toggled OFF');

      setTimeout(() => {
        debugToggleRef.current = false;
      }, 500);
      return;
    }

    const newCount = debugTapCount + 1;
    setDebugTapCount(newCount);
    console.log('🐛 Debug tap count:', newCount);

    if (newCount >= 5) {
      setDebugMode(true);
      console.log('🐛 Debug mode ENABLED');
      handleShowConfirmation(
        'Debug Mode Enabled!',
        'Tap any joker in the "All" tab to add it to your inventory.',
        '🐛',
        () => {}
      );
      setDebugTapCount(0);
    } else if (newCount === 1) {
      // Reset counter after 2 seconds if not continuing
      setTimeout(() => setDebugTapCount(0), 2000);
    }
  };

  // State for candy conversion (unused, kept for type compat)
  const [selectedSourceCandy, setSelectedSourceCandy] = useState<string | null>(
    null
  );
  const [isModalTransitioning, setIsModalTransitioning] = useState(false);

  // Tutorial: advance step 9→10 when jokers page is focused
  useEffect(() => {
    if (isFocused && tutorialStep === 9) {
      const timer = setTimeout(() => advanceTutorial(), 400);
      return () => clearTimeout(timer);
    }
  }, [isFocused, tutorialStep, advanceTutorial]);


  // Debug log for modal state changes
  useEffect(() => {
    if (__DEV__) console.log('📋 confirmModal.visible changed to:', confirmModal.visible);
  }, [confirmModal.visible]);

  // Extract values from contexts
  const isAfterSchool = gameContext?.isAfterSchool || false;
  const day = gameContext?.day || 1;
  const jokers = jokerContext?.jokers || [];
  const isLoaded = jokerContext?.isLoaded || false;

  // Confirmation modal handler for JokerCard components
  const handleShowConfirmation = (
    title: string,
    message: string,
    emoji: string,
    onConfirmCallback?: () => void,
    confirmText = 'OK',
    cancelText = 'Cancel',
    onCancelCallback?: () => void
  ) => {
    if (__DEV__) console.log('📋 Opening confirmation modal:', title);

    // If a modal is transitioning, queue the new modal
    if (isModalTransitioning) {
      if (__DEV__) console.log('📋 Modal is transitioning, queueing request...');
      setTimeout(() => {
        handleShowConfirmation(
          title,
          message,
          emoji,
          onConfirmCallback,
          confirmText,
          cancelText,
          onCancelCallback
        );
      }, 100);
      return;
    }

    // If a modal is already open, close it first then open the new one
    if (confirmModal.visible) {
      if (__DEV__) console.log('📋 Modal already open, closing first...');
      setIsModalTransitioning(true);
      setConfirmModal((prev) => ({ ...prev, visible: false }));
      setTimeout(() => {
        setIsModalTransitioning(false);
        openConfirmModal(
          title,
          message,
          emoji,
          onConfirmCallback,
          confirmText,
          cancelText,
          onCancelCallback
        );
      }, 250);
      return;
    }

    openConfirmModal(
      title,
      message,
      emoji,
      onConfirmCallback,
      confirmText,
      cancelText,
      onCancelCallback
    );
  };

  const openConfirmModal = (
    title: string,
    message: string,
    emoji: string,
    onConfirmCallback?: () => void,
    confirmText = 'OK',
    cancelText = 'Cancel',
    onCancelCallback?: () => void
  ) => {
    setConfirmModal({
      visible: true,
      title,
      message,
      emoji,
      onConfirm: () => {
        if (__DEV__) console.log('📋 Confirm pressed, closing modal');
        setIsModalTransitioning(true);
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        // Use setTimeout to ensure modal closes before callback executes
        setTimeout(() => {
          setIsModalTransitioning(false);
          if (onConfirmCallback) {
            onConfirmCallback();
          }
        }, 200);
      },
      onCancel: onCancelCallback
        ? () => {
            if (__DEV__) console.log('📋 Cancel pressed, closing modal');
            setIsModalTransitioning(true);
            setConfirmModal((prev) => ({ ...prev, visible: false }));
            setTimeout(() => {
              setIsModalTransitioning(false);
              onCancelCallback();
            }, 200);
          }
        : () => {
            if (__DEV__) console.log('📋 Closing modal (no cancel callback)');
            setIsModalTransitioning(true);
            setConfirmModal((prev) => ({ ...prev, visible: false }));
            setTimeout(() => {
              setIsModalTransitioning(false);
            }, 200);
          },
      confirmText,
      cancelText: onCancelCallback ? cancelText : undefined,
    });
  };

  // Candy selector modal handler for JokerCard components
  const handleShowCandySelector = (joker: any) => {
    setCandySelectorModal({
      visible: true,
      joker,
    });
  };

  // Joker selector modal handler (legacy — no longer used by Overclock)
  // Handle candy selection for various jokers
  const handleCandySelection = (selectedCandy: string) => {
    const { joker } = candySelectorModal;
    if (
      !joker ||
      !gameContext ||
      !jokerContext ||
      !inventoryContext ||
      !seedContext
    )
      return;

    const { periodCount } = gameContext;
    const { markJokerUsedToday } = jokerContext;
    const { getInventoryLimit } = inventoryContext;
    const { gameData, modifyCandyPrice } = seedContext;

    if (joker.id === JOKER_IDS.MARKET_MANIPULATION) {
      // Mark as used FIRST to prevent double-use
      markJokerUsedToday(joker.id.toString());

      // Set the selected candy's price to the highest price of all candies this period
      const allCandyTypes = Object.keys(gameData.candyPrices);
      let highestPrice = 0;

      // Find the highest price among all candies for this period
      for (const candyType of allCandyTypes) {
        const priceForThisPeriod =
          gameData.candyPrices[candyType]?.[periodCount] || 0;
        if (priceForThisPeriod > highestPrice) {
          highestPrice = priceForThisPeriod;
        }
      }

      modifyCandyPrice(selectedCandy, highestPrice, periodCount);

      handleShowConfirmation(
        'Market Manipulation Activated!',
        `${selectedCandy} price set to highest market price: $${highestPrice.toFixed(2)}`,
        '📈'
      );
    } else if (joker.id === JOKER_IDS.THE_BIG_SHORT) {
      // Mark as used FIRST to prevent double-use
      markJokerUsedToday(joker.id.toString());

      // Set the selected candy's price to the lowest price of all candies this period
      const allCandyTypes = Object.keys(gameData.candyPrices);
      let lowestPrice = Infinity;

      // Find the lowest price among all candies for this period
      for (const candyType of allCandyTypes) {
        const priceForThisPeriod =
          gameData.candyPrices[candyType]?.[periodCount] || 0;
        if (priceForThisPeriod > 0 && priceForThisPeriod < lowestPrice) {
          lowestPrice = priceForThisPeriod;
        }
      }

      // If no valid lowest price found, use minimum price
      if (lowestPrice === Infinity) {
        lowestPrice = 0.01;
      }

      modifyCandyPrice(selectedCandy, lowestPrice, periodCount);

      handleShowConfirmation(
        'The Big Short Activated!',
        `${selectedCandy} price set to lowest market price: $${lowestPrice.toFixed(2)}`,
        '📉'
      );
    } else if (
      joker.id === JOKER_IDS.DOUBLE_UP ||
      joker.effect === 'double_candy_price'
    ) {
      // Mark as used FIRST to prevent double-use
      markJokerUsedToday(joker.id.toString());

      // Double Up joker - doubles candy price for current period
      const originalPrice =
        gameData.candyPrices[selectedCandy]?.[periodCount] || 0;
      const newPrice = originalPrice * 2;

      modifyCandyPrice(selectedCandy, newPrice, periodCount);

      handleShowConfirmation(
        'Double Up Activated!',
        `${selectedCandy} price doubled to $${newPrice.toFixed(2)} for this period!`,
        '💰'
      );
    } else if (joker.id === JOKER_IDS.BET_YOU_IM_FASTER) {
      // Mark as used FIRST to prevent double-use
      markJokerUsedToday(joker.id.toString());

      // Fill inventory with the selected candy type
      const currentInventoryCount = inventoryContext.getTotalInventoryCount();
      const inventoryLimit = getInventoryLimit();
      const spaceAvailable = inventoryLimit - currentInventoryCount;

      if (spaceAvailable <= 0) {
        handleShowConfirmation(
          'Inventory Full',
          'Your inventory is already full!',
          '📦'
        );
        setCandySelectorModal({ visible: false, joker: null });
        return;
      }

      const candyPrice =
        gameData.candyPrices[selectedCandy]?.[periodCount] || 0;
      const quantityToAdd = spaceAvailable; // Fill entire inventory

      inventoryContext.addToInventory(selectedCandy, quantityToAdd, candyPrice);

      handleShowConfirmation(
        'Inventory Filled!',
        `Filled inventory with ${quantityToAdd} ${selectedCandy}!`,
        '🏃‍♂️'
      );
    }

    setCandySelectorModal({ visible: false, joker: null });
  };

  // Remove selectedSubject state - we'll show all subjects as sections

  // Show loading state while data loads - no early returns
  const showLoading =
    !gameContext || !jokerContext || !seedContext || !isLoaded;

  // Create sectioned data for browse tab with 2-column layout
  const sectionedJokers = useMemo(() => {
    const sections = [];
    const subjects = (Object.keys(ALL_JOKERS) as Array<keyof typeof ALL_JOKERS>).sort();

    for (const subject of subjects) {
      const subjectJokers = ALL_JOKERS[subject] || [];
      if (subjectJokers.length > 0) {
        // Group jokers into rows of 2 for proper 2-column layout
        const jokersInRows = [];
        for (let i = 0; i < subjectJokers.length; i += 2) {
          const row = [subjectJokers[i]];
          if (subjectJokers[i + 1]) {
            row.push(subjectJokers[i + 1]);
          }
          jokersInRows.push(row);
        }

        sections.push({
          title: subject,
          data: jokersInRows,
        });
      }
    }

    return sections;
  }, []);

  // Get total count for browse tab
  const allJokersCount = useMemo(() => {
    return Object.values(ALL_JOKERS).flat().length;
  }, []);

  // Current user's jokers for "Inventory" tab - organize into rows like the "All" tab
  const inventoryJokers = useMemo(() => {
    if (!jokers || jokers.length === 0) return [];

    // Group jokers into rows of 2 for proper 2-column layout like the "All" tab
    const jokersInRows = [];
    for (let i = 0; i < jokers.length; i += 2) {
      jokersInRows.push(jokers.slice(i, i + 2));
    }
    return jokersInRows;
  }, [jokers]);

  const currentJokers = inventoryJokers; // Only used for inventory tab

  // Use consistent daytime styles
  const headerStyles = styles.header;
  const titleStyles = styles.title;

  const renderInventoryJokerRow = ({ item }: { item: any[] }) => (
    <View style={{ ...styles.row }}>
      {item.map((joker, index) => (
        <View key={joker.id} style={styles.jokerCardContainer}>
          <JokerCard
            joker={joker}
            isAfterSchool={isAfterSchool}
            isCompact={true}
            showOwned={false}
            disableActivation={false}
            onShowConfirmation={handleShowConfirmation}
            onShowCandySelector={handleShowCandySelector}

            onTriggerEvent={triggerEvent}
          />
        </View>
      ))}
    </View>
  );

  const renderJokerRow = ({ item }: { item: any[] }) => (
    <View style={styles.row}>
      {item.map((joker) => (
        <View key={joker.id} style={styles.jokerCardContainer}>
          <JokerCard
            joker={joker}
            isAfterSchool={isAfterSchool}
            isCompact={true}
            showOwned={jokers.some((ownedJoker) => ownedJoker.id === joker.id)}
            disableActivation={true}
            debugMode={debugMode && __DEV__}
            onShowConfirmation={handleShowConfirmation}
            onShowCandySelector={handleShowCandySelector}

            onTriggerEvent={triggerEvent}
          />
        </View>
      ))}
    </View>
  );

  // Show loading view if needed
  if (showLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading jokers...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={headerStyles}>
        {/* <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={handleDebugTap} activeOpacity={0.7}>
              <Image
                source={require('../../assets/images/emojis/joker.png')}
                style={styles.titleIcon}
              />
            </TouchableOpacity>
            <Text style={titleStyles}> Jokers</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {activeTab === 'inventory' ? jokers.length : allJokersCount}
            </Text>
          </View>
        </View> */}

        <View style={styles.tabContainer}>
          <PressableButton
            onPress={() => {
              setActiveTab('inventory');
              if (tutorialStep === 10) advanceTutorial();
            }}
            shadowOpacity={0}
            elevation={0}
            style={[styles.tab, activeTab === 'inventory' && styles.activeTab, tutorialStep === 10 && styles.tutorialHighlight, tutorialStep === 10 && { zIndex: 10001, elevation: 10001 }]}
          >
            <TextWithEmojis
              imageSize={20}
              style={[
                styles.tabText,
                activeTab == 'inventory' && styles.activeTabText,
              ]}
            >
              {`🎒 Owned (${jokers.length}) | Aura: ${jokerContext.persistentJokerCount}/${jokerContext.maxPersistentSlots}`}
            </TextWithEmojis>
          </PressableButton>

          <PressableButton
            onPress={() => {
              setActiveTab('see-all');
              if (tutorialStep === 11) advanceTutorial();
            }}
            shadowOpacity={0}
            elevation={0}
            style={[styles.tab, activeTab !== 'inventory' && styles.activeTab, tutorialStep === 11 && styles.tutorialHighlight, tutorialStep === 11 && { zIndex: 10001, elevation: 10001 }]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab !== 'inventory' && styles.activeTabText,
              ]}
            >
              {debugMode && __DEV__ ? '🐛 ' : ''}📖 All ({allJokersCount})
            </Text>
          </PressableButton>
        </View>
      </View>

      {activeTab === 'inventory' ? (
        currentJokers.length > 0 ? (
          <FlatList
            data={currentJokers}
            keyExtractor={(item, index) => `inventory-row-${index}`}
            renderItem={renderInventoryJokerRow}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No jokers in inventory</Text>
            <Text style={styles.emptySubtext}>
              Study different subjects to earn jokers!
            </Text>
          </View>
        )
      ) : (
        <SectionList
          sections={sectionedJokers}
          keyExtractor={(item, index) => `row-${index}`}
          renderItem={renderJokerRow}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Confirmation Modal - rendered at page level for full screen overlay */}
      <JokerConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        emoji={confirmModal.emoji}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel || (() => setConfirmModal((prev) => ({ ...prev, visible: false })))}
      />

      {/* Candy Selector Modal */}
      <FastModal
        visible={candySelectorModal.visible}
        onClose={() => setCandySelectorModal({ visible: false, joker: null })}
        animationType="spring"
        backdropOpacity={0.5}
        modalStyle={styles.modalContent}
      >
        <>
          <View
            style={{
              alignItems: 'center',
            }}
          >
            <TextWithEmojis style={[styles.modalTitle]} imageSize={54}>
              {candySelectorModal.joker?.id === JOKER_IDS.MARKET_MANIPULATION
                ? '📈'
                : candySelectorModal.joker?.id === JOKER_IDS.THE_BIG_SHORT
                  ? '💸'
                  : candySelectorModal.joker?.id ===
                      JOKER_IDS.BET_YOU_IM_FASTER
                    ? '⚡'
                    : '🍭'}
            </TextWithEmojis>
          </View>
          <TextWithEmojis style={styles.modalTitle} imageSize={24}>
            {candySelectorModal.joker?.id === JOKER_IDS.MARKET_MANIPULATION
              ? 'Choose Candy to Manipulate'
              : candySelectorModal.joker?.id === JOKER_IDS.THE_BIG_SHORT
                ? 'Choose Candy to Short'
                : candySelectorModal.joker?.id === JOKER_IDS.BET_YOU_IM_FASTER
                  ? 'Choose Candy to Fill Inventory'
                  : 'Choose Candy Type'}
          </TextWithEmojis>

          {CANDY_TYPES.map((candyType) => (
            <PressableButton
              key={candyType}
              onPress={() => handleCandySelection(candyType)}
              shadowColor="rgba(123,169,101,1)"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={5}
              elevation={8}
              style={styles.candyButton}
            >
              <PixelBorder
                borderColor="rgba(123,169,101,1)"
                borderWidth={3}
                backgroundColor="rgba(154,193,118,1)"
                innerPadding={0}
              >
                <View style={styles.candyButtonInner}>
                  <Text style={styles.candyButtonText}>{candyType}</Text>
                </View>
              </PixelBorder>
            </PressableButton>
          ))}

          <PressableButton
            onPress={() => {
              setCandySelectorModal({ visible: false, joker: null });
              setSelectedSourceCandy(null); // Reset source candy selection
            }}
            shadowColor="rgba(185,28,28,1)"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.5}
            shadowRadius={5}
            elevation={8}
            style={styles.cancelButton}
          >
            <PixelBorder
              borderColor="rgba(185,28,28,1)"
              borderWidth={3}
              backgroundColor="rgba(239,68,68,1)"
              innerPadding={0}
            >
              <View style={styles.cancelButtonInner}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </View>
            </PixelBorder>
          </PressableButton>
        </>
      </FastModal>

      {/* Tutorial overlay for steps 10-11 */}
      {(tutorialStep === 10 || tutorialStep === 11) && (
        <View style={tutorialStyles.overlay} pointerEvents="box-none">
          <View style={tutorialStyles.dim} pointerEvents="none" />
          <View style={tutorialStyles.tooltip}>
            <Text style={tutorialStyles.tooltipText}>
              {tutorialStep === 10
                ? 'You can find all the Jokers you own here.'
                : 'Click here to see what subjects offer which Jokers. Good luck!'}
            </Text>
            <View style={tutorialStyles.buttonRow}>
              <PressableButton onPress={skipTutorial}>
                <Text style={tutorialStyles.skipText}>Skip Tutorial</Text>
              </PressableButton>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00512C',
  },
  containerAfterSchool: {
    backgroundColor: colors.purple.darkBg,
  },
  header: {
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: '#00512C',
    borderBottomWidth: 2,
    borderBottomColor: colors.gold.medium,
  },
  headerAfterSchool: {
    backgroundColor: colors.purple.darkBg,
    borderBottomColor: '#8a7ca8',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gold.medium,
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  titleAfterSchool: {
    color: colors.gold.light,
    textShadowColor: 'rgba(247,233,142,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  countBadge: {
    backgroundColor: colors.red.error,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.red.dark,
  },
  countText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  countTextAfterSchool: {
    color: colors.gold.light,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
  },
  tabContainerAfterSchool: {
    borderTopColor: '#8a7ca8',
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.darkGray2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  activeTab: {
    backgroundColor: colors.red.error,
    borderColor: colors.red.dark,
  },
  activeTabAfterSchool: {
    backgroundColor: '#8a7ca8',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold.medium,
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabTextAfterSchool: {
    color: colors.purple.light,
  },
  activeTabText: {
    color: colors.white,
    textShadowColor: colors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  activeTabTextAfterSchool: {
    color: colors.gold.light,
  },
  list: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 20,
  },

  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8, // Add gap between cards
  },
  jokerCardContainer: {
    width: 160, // Fixed width for consistent sizing
    height: 180, // Fixed height to ensure all cards are the same size
    position: 'relative',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyIconAfterSchool: {
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gold.medium,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyTextAfterSchool: {
    color: colors.gold.light,
    textShadowColor: 'rgba(247,233,142,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  emptySubtextAfterSchool: {
    color: colors.purple.light,
  },
  sectionHeader: {
    backgroundColor: colors.darkGray1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gold.medium,
    marginTop: 0,
    marginBottom: 8,
  },
  sectionHeaderAfterSchool: {
    backgroundColor: 'rgba(138, 124, 168, 1)',
    borderBottomColor: '#8a7ca8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gold.medium,
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionTitleAfterSchool: {
    color: colors.gold.light,
  },
  // Candy Selector Modal styles
  modalContent: {
    backgroundColor: colors.darkGray1,
    borderRadius: 8,
    padding: 20,
    width: '80%',
    borderWidth: 2,
    borderColor: colors.gold.medium,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gold.medium,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  candyButton: {
    marginVertical: 4,
    width: '100%',
  },
  candyButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  candyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    letterSpacing: 0.5,
  },
  cancelButton: {
    marginTop: 12,
    width: '100%',
  },
  cancelButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  tutorialHighlight: {
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
});

const tutorialStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  tooltip: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10000,
    zIndex: 10000,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  skipText: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'PixeloidMono',
  },
});

// Removed memo to fix tab styling issue (Settings tab disappears)
export default JokersPage;
