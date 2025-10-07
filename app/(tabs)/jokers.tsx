import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { JOKER_IDS } from '../../src/constants/jokerIds';
import { useEventHandler } from '../../src/hooks/useEventHandler';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useSeed } from '../../src/hooks/useSeed';
import { ALL_JOKERS } from '../../src/utils/jokerEffectEngine';
import FastModal from '../components/FastModal';
import GameHUD from '../components/GameHUD';
import JokerCard from '../components/JokerCard';
import JokerConfirmationModal from '../components/JokerConfirmationModal';
import TextWithEmojis from '../components/TextWithEmojis';
import colors from '../../src/constants/colors';


const CANDY_TYPES = [
  'Snickers',
  'M&Ms',
  'Skittles',
  'Warheads',
  'Sour Patch Kids',
  'Bubble Gum',
  'Jaw Breaker',
];

function JokersPage() {
  // Always call all hooks first - before any conditional returns
  const gameContext = useGame();
  const jokerContext = useJokers();
  const inventoryContext = useInventory();
  const seedContext = useSeed();
  const { triggerEvent } = useEventHandler();
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

  // Joker Selector Modal state (for Glitch in the Matrix)
  const [jokerSelectorModal, setJokerSelectorModal] = useState<{
    visible: boolean;
    joker: any | null;
  }>({
    visible: false,
    joker: null,
  });

  // Debug mode state
  const [debugMode, setDebugMode] = useState(false);

  // State for Master Negotiator candy conversion
  const [selectedSourceCandy, setSelectedSourceCandy] = useState<string | null>(
    null
  );
  const [isModalTransitioning, setIsModalTransitioning] = useState(false);

  // Debug log for modal state changes
  useEffect(() => {
    console.log('📋 confirmModal.visible changed to:', confirmModal.visible);
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
    console.log(
      '📋 Opening confirmation modal:',
      title,
      '| Current visible:',
      confirmModal.visible,
      '| Transitioning:',
      isModalTransitioning
    );

    // If a modal is transitioning, queue the new modal
    if (isModalTransitioning) {
      console.log('📋 Modal is transitioning, queueing request...');
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
      console.log('📋 Modal already open, closing first...');
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
        console.log('📋 Confirm pressed, closing modal');
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
            console.log('📋 Cancel pressed, closing modal');
            setIsModalTransitioning(true);
            setConfirmModal((prev) => ({ ...prev, visible: false }));
            setTimeout(() => {
              setIsModalTransitioning(false);
              onCancelCallback();
            }, 200);
          }
        : () => {
            console.log('📋 Closing modal (no cancel callback)');
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

  // Joker selector modal handler for JokerCard components (Glitch in the Matrix)
  const handleShowJokerSelector = (joker: any) => {
    setJokerSelectorModal({
      visible: true,
      joker,
    });
  };

  // Handle joker selection for Glitch in the Matrix
  const handleJokerSelection = (selectedJoker: any) => {
    const { joker } = jokerSelectorModal;
    if (!joker || !jokerContext) return;

    const { addJoker, removeJoker } = jokerContext;

    // Create a copy of the selected joker with a new ID
    const duplicatedJoker = {
      ...selectedJoker,
      id: Date.now() + Math.random(), // Generate unique ID
      name: selectedJoker.name + ' (Copy)',
    };

    // Add the duplicated joker to inventory
    addJoker(duplicatedJoker);

    // Remove the Glitch in the Matrix joker (it's one-time use)
    removeJoker(joker.id);

    // Close modal and show confirmation
    setJokerSelectorModal({ visible: false, joker: null });
    handleShowConfirmation(
      'Glitch in the Matrix!',
      `Created a copy of ${selectedJoker.name}!`,
      'refresh'
    );
  };

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
    const { removeJoker } = jokerContext;
    const { getInventoryLimit } = inventoryContext;
    const { gameData, modifyCandyPrice } = seedContext;

    if (joker.id === JOKER_IDS.PROPACANDIES) {
      // Drop the selected candy's price by 90%
      const originalPrice =
        gameData.candyPrices[selectedCandy]?.[periodCount] || 0;
      const newPrice = Math.max(originalPrice * 0.1, 0.01); // 90% reduction, minimum $0.01

      modifyCandyPrice(selectedCandy, newPrice, periodCount);
      removeJoker(joker.id);

      handleShowConfirmation(
        'Propacandies Activated!',
        `${selectedCandy} price dropped by 90%! New price: $${newPrice.toFixed(2)}`,
        '📰'
      );
    } else if (joker.id === JOKER_IDS.MARKET_MANIPULATION) {
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
      removeJoker(joker.id);

      handleShowConfirmation(
        'Market Manipulation Activated!',
        `${selectedCandy} price set to highest market price: $${highestPrice.toFixed(2)}`,
        '📈'
      );
    } else if (joker.id === JOKER_IDS.THE_BIG_SHORT) {
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
      removeJoker(joker.id);

      handleShowConfirmation(
        'The Big Short Activated!',
        `${selectedCandy} price set to lowest market price: $${lowestPrice.toFixed(2)}`,
        '📉'
      );
    } else if (
      joker.id === JOKER_IDS.DOUBLE_UP ||
      joker.effect === 'double_candy_price'
    ) {
      // Double Up joker - doubles candy price for current period
      const originalPrice =
        gameData.candyPrices[selectedCandy]?.[periodCount] || 0;
      const newPrice = originalPrice * 2;

      modifyCandyPrice(selectedCandy, newPrice, periodCount);
      removeJoker(joker.id);

      handleShowConfirmation(
        'Double Up Activated!',
        `${selectedCandy} price doubled to $${newPrice.toFixed(2)} for this period!`,
        '💰'
      );
    } else if (joker.id === JOKER_IDS.BET_YOU_IM_FASTER) {
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
      const quantityToAdd = Math.min(spaceAvailable, 10); // Add up to 10 or until full

      inventoryContext.addToInventory(selectedCandy, quantityToAdd, candyPrice);
      removeJoker(joker.id);

      handleShowConfirmation(
        'Inventory Filled!',
        `Added ${quantityToAdd} ${selectedCandy} to your inventory!`,
        '🏃‍♂️'
      );
    } else if (joker.id === JOKER_IDS.MASTER_NEGOTIATOR) {
      // Two-step candy conversion
      if (!selectedSourceCandy) {
        // Step 1: Select source candy
        setSelectedSourceCandy(selectedCandy);
        return; // Keep modal open for step 2
      } else {
        // Step 2: Select target candy and perform conversion
        const targetCandy = selectedCandy;

        if (selectedSourceCandy === targetCandy) {
          handleShowConfirmation(
            'Same Candy Selected',
            'Please select a different candy type to convert to.',
            '⚠️'
          );
          return;
        }

        // Get the quantity and price of source candy
        const sourceCandyItem = inventoryContext.inventory.find(
          (item) => item.name === selectedSourceCandy
        );
        const quantity = sourceCandyItem?.quantity || 1;
        const originalPrice = sourceCandyItem?.price || 0;

        // Remove source candy and add target candy with same quantity and price
        inventoryContext.removeFromInventory(selectedSourceCandy, quantity);
        inventoryContext.addToInventory(
          targetCandy,
          quantity,
          originalPrice,
          periodCount
        );
        removeJoker(joker.id);

        handleShowConfirmation(
          'Master Negotiator Activated!',
          `Converted ${quantity} ${selectedSourceCandy} to ${targetCandy}!`,
          '🤝'
        );

        // Reset source candy selection
        setSelectedSourceCandy(null);
      }
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
    const subjects = Object.keys(ALL_JOKERS).sort();

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
  const containerStyles = styles.container;
  const headerStyles = styles.header;
  const titleStyles = styles.title;

  const renderInventoryJokerRow = ({ item }: { item: any[] }) => (
    <View style={styles.row}>
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
            onShowJokerSelector={handleShowJokerSelector}
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
            onShowJokerSelector={handleShowJokerSelector}
            onTriggerEvent={triggerEvent}
          />
        </View>
      ))}
    </View>
  );

  // Show loading view if needed
  if (showLoading) {
    return (
      <View style={containerStyles}>
        <GameHUD
          theme="evening"
          customHeaderText="School"
          customLocationText="Jokers Collection"
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading jokers...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyles}>
      <GameHUD
        theme="evening"
        customHeaderText={`Jokers Collection`}
        customLocationText="Jokers Collection"
      />

      <View style={headerStyles}>
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <Image
              source={require('../../assets/images/emojis/joker.png')}
              style={styles.titleIcon}
            />
            <Text style={titleStyles}> Jokers</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {activeTab === 'inventory' ? jokers.length : allJokersCount}
            </Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
            onPress={() => setActiveTab('inventory')}
          >
            <TextWithEmojis
              imageSize={20}
              style={[
                styles.tabText,
                activeTab == 'inventory' && styles.activeTabText,
              ]}
            >
              {`🎒 Owned (${jokers.length})`}
            </TextWithEmojis>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab !== 'inventory' && styles.activeTab]}
            onPress={() => setActiveTab('see-all')}
            onLongPress={
              __DEV__
                ? () => {
                    // Debug mode: Toggle debug mode
                    setDebugMode(!debugMode);
                    handleShowConfirmation(
                      'Debug Mode',
                      debugMode
                        ? 'Debug mode disabled'
                        : 'Debug mode enabled! Tap any joker to add it to inventory',
                      '🐛'
                    );
                  }
                : undefined
            }
          >
            <Text
              style={[
                styles.tabText,
                activeTab !== 'inventory' && styles.activeTabText,
              ]}
            >
              {debugMode && __DEV__ ? '🐛 ' : ''}📖 All ({allJokersCount})
            </Text>
          </TouchableOpacity>
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
      {(() => {
        console.log(
          '📋 Rendering JokerConfirmationModal - visible:',
          confirmModal.visible,
          'title:',
          confirmModal.title
        );
        return (
          <JokerConfirmationModal
            visible={confirmModal.visible}
            title={confirmModal.title}
            message={confirmModal.message}
            emoji={confirmModal.emoji}
            confirmText={confirmModal.confirmText}
            cancelText={confirmModal.cancelText}
            onConfirm={() => {
              console.log('📋 JokerConfirmationModal onConfirm triggered');
              confirmModal.onConfirm();
            }}
            onCancel={() => {
              console.log('📋 JokerConfirmationModal onCancel triggered');
              if (confirmModal.onCancel) {
                confirmModal.onCancel();
              } else {
                setConfirmModal((prev) => ({ ...prev, visible: false }));
              }
            }}
          />
        );
      })()}

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
                  : candySelectorModal.joker?.id === JOKER_IDS.PROPACANDIES
                    ? '📰'
                    : candySelectorModal.joker?.id ===
                        JOKER_IDS.BET_YOU_IM_FASTER
                      ? '⚡'
                      : candySelectorModal.joker?.id ===
                          JOKER_IDS.MASTER_NEGOTIATOR
                        ? '🤝'
                        : '🍭'}
            </TextWithEmojis>
          </View>
          <TextWithEmojis style={styles.modalTitle} imageSize={24}>
            {candySelectorModal.joker?.id === JOKER_IDS.MARKET_MANIPULATION
              ? 'Choose Candy to Manipulate'
              : candySelectorModal.joker?.id === JOKER_IDS.THE_BIG_SHORT
                ? 'Choose Candy to Short'
                : candySelectorModal.joker?.id === JOKER_IDS.PROPACANDIES
                  ? 'Choose Candy to Drop Price'
                  : candySelectorModal.joker?.id === JOKER_IDS.BET_YOU_IM_FASTER
                    ? 'Choose Candy to Fill Inventory'
                    : candySelectorModal.joker?.id ===
                        JOKER_IDS.MASTER_NEGOTIATOR
                      ? selectedSourceCandy
                        ? `Choose Candy to Convert ${selectedSourceCandy} Into`
                        : 'Choose Candy to Convert From'
                      : 'Choose Candy Type'}
          </TextWithEmojis>

          {CANDY_TYPES.filter((candyType) => {
            // For Master Negotiator, only show candies in inventory for source selection
            if (
              candySelectorModal.joker?.id === JOKER_IDS.MASTER_NEGOTIATOR &&
              !selectedSourceCandy
            ) {
              return (
                inventoryContext?.inventory.some(
                  (item) => item.name === candyType
                ) || false
              );
            }
            // For target selection (after source is selected), show all candies
            return true;
          }).map((candyType) => (
            <TouchableOpacity
              key={candyType}
              style={styles.candyButton}
              onPress={() => handleCandySelection(candyType)}
            >
              <Text style={styles.candyButtonText}>{candyType}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setCandySelectorModal({ visible: false, joker: null });
              setSelectedSourceCandy(null); // Reset source candy selection
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      </FastModal>

      {/* Joker Selector Modal (Glitch in the Matrix) */}
      <FastModal
        visible={jokerSelectorModal.visible}
        onClose={() => setJokerSelectorModal({ visible: false, joker: null })}
        animationType="spring"
        backdropOpacity={0.5}
        modalStyle={styles.modalContent}
      >
        <>
          <View style={{ alignItems: 'center' }}>
            <TextWithEmojis style={[styles.modalTitle]} imageSize={54}>
              🔮
            </TextWithEmojis>
          </View>
          <TextWithEmojis style={styles.modalTitle} imageSize={24}>
            Choose Joker to Copy
          </TextWithEmojis>

          {jokers.filter((j) => j.name !== 'Glitch in the Matrix').length >
          0 ? (
            jokers
              .filter((j) => j.name !== 'Glitch in the Matrix')
              .map((availableJoker) => (
                <TouchableOpacity
                  key={availableJoker.id}
                  style={styles.candyButton}
                  onPress={() => handleJokerSelection(availableJoker)}
                >
                  <TextWithEmojis style={styles.candyButtonText} imageSize={24}>
                    {`${availableJoker.name} ${availableJoker.type === 'persistent' ? '🔮' : '⚡'}`}
                  </TextWithEmojis>
                </TouchableOpacity>
              ))
          ) : (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Text style={styles.candyButtonText}>
                No other jokers to copy!
              </Text>
              <Text
                style={{ color: '#888', marginTop: 8, textAlign: 'center' }}
              >
                Study to earn more jokers first
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() =>
              setJokerSelectorModal({ visible: false, joker: null })
            }
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      </FastModal>
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
  dragHint: {
    fontSize: 11,
    color: colors.brown.secondary,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.7,
  },
  dragHintAfterSchool: {
    color: colors.purple.light,
  },
  list: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 20,
  },
  inventoryList: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 80,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  jokerCardContainer: {
    width: 160, // Fixed width for consistent sizing
    height: 180, // Fixed height to ensure all cards are the same size
    marginBottom: 8,
    marginRight: 8,
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
    backgroundColor: colors.darkGray2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  candyButtonText: {
    color: colors.gold.medium,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: colors.red.error,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.red.dark,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
});

// Removed memo to fix tab styling issue (Settings tab disappears)
export default JokersPage;
