import React, { useMemo, useState } from 'react';
import {
  FlatList,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { JOKER_IDS } from '../../src/constants/jokerIds';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useSeed } from '../../src/hooks/useSeed';
import { ALL_JOKERS } from '../../src/utils/jokerEffectEngine';
import ConfirmationModal from '../components/ConfirmationModal';
import FastModal from '../components/FastModal';
import GameHUD from '../components/GameHUD';
import JokerCard from '../components/JokerCard';

const CANDY_TYPES = [
  'Bubble Gum',
  'M&Ms',
  'Sour Straws',
  'Chocolate Bar',
  'Lollipop',
  'Gummy Bears',
  'Jaw Breaker',
];

function JokersPage() {
  const gameContext = useGame();
  const jokerContext = useJokers();
  const inventoryContext = useInventory();
  const seedContext = useSeed();
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

  // Confirmation modal handler for JokerCard components
  const handleShowConfirmation = (
    title: string,
    message: string,
    emoji: string,
    onConfirmCallback: () => void,
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
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        onConfirmCallback();
      },
      onCancel: onCancelCallback
        ? () => {
            setConfirmModal((prev) => ({ ...prev, visible: false }));
            onCancelCallback();
          }
        : () => setConfirmModal((prev) => ({ ...prev, visible: false })),
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
      // Double the selected candy's price for this period
      const originalPrice =
        gameData.candyPrices[selectedCandy]?.[periodCount] || 0;
      const newPrice = originalPrice * 2;

      modifyCandyPrice(selectedCandy, newPrice, periodCount);
      removeJoker(joker.id);

      handleShowConfirmation(
        'Market Manipulation Activated!',
        `${selectedCandy} price doubled! New price: $${newPrice.toFixed(2)}`,
        '📈'
      );
    } else if (joker.id === JOKER_IDS.THE_BIG_SHORT) {
      // Crash the selected candy's price by 50%
      const originalPrice =
        gameData.candyPrices[selectedCandy]?.[periodCount] || 0;
      const newPrice = Math.max(originalPrice * 0.5, 0.01); // 50% reduction, minimum $0.01

      modifyCandyPrice(selectedCandy, newPrice, periodCount);
      removeJoker(joker.id);

      handleShowConfirmation(
        'The Big Short Activated!',
        `${selectedCandy} price crashed by 50%! New price: $${newPrice.toFixed(2)}`,
        '📉'
      );
    } else if (joker.effect === 'double_candy_price') {
      // Legacy double candy price jokers
      const originalPrice =
        gameData.candyPrices[selectedCandy]?.[periodCount] || 0;
      const newPrice = originalPrice * 2;

      modifyCandyPrice(selectedCandy, newPrice, periodCount);
      removeJoker(joker.id);

      handleShowConfirmation(
        'Price Doubled!',
        `${selectedCandy} price doubled! New price: $${newPrice.toFixed(2)}`,
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
    }

    setCandySelectorModal({ visible: false, joker: null });
  };

  // Remove selectedSubject state - we'll show all subjects as sections

  // If contexts are not available, show loading or initialization message
  if (!gameContext || !jokerContext || !seedContext) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading game data...</Text>
        </View>
      </View>
    );
  }

  const { isAfterSchool, day } = gameContext;
  const { jokers, isLoaded } = jokerContext;

  // Wait for jokers to load before rendering
  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading jokers...</Text>
        </View>
      </View>
    );
  }

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
      {item.map((joker) => (
        <View key={joker.id} style={styles.jokerCardContainer}>
          <JokerCard
            joker={joker}
            isAfterSchool={isAfterSchool}
            isCompact={true}
            showOwned={false}
            disableActivation={false}
            onShowConfirmation={handleShowConfirmation}
            onShowCandySelector={handleShowCandySelector}
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
            onShowConfirmation={handleShowConfirmation}
            onShowCandySelector={handleShowCandySelector}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View style={containerStyles}>
      <GameHUD
        theme="evening"
        customHeaderText={`School - Day ${day}`}
        customLocationText="Jokers Collection"
      />

      <View style={headerStyles}>
        <View style={styles.headerTop}>
          <Text style={titleStyles}>🃏 Jokers</Text>
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
            <Text
              style={[
                styles.tabText,
                activeTab === 'inventory' && styles.activeTabText,
              ]}
            >
              🎒 Owned ({jokers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab !== 'inventory' && styles.activeTab]}
            onPress={() => setActiveTab('see-all')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab !== 'inventory' && styles.activeTabText,
              ]}
            >
              📖 All ({allJokersCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Debug info */}
        <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
          Debug: activeTab = {activeTab}
        </Text>
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
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        emoji={confirmModal.emoji}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={
          confirmModal.onCancel ||
          (() => setConfirmModal((prev) => ({ ...prev, visible: false })))
        }
        theme="market"
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
          <Text style={styles.modalTitle}>
            {candySelectorModal.joker?.id === JOKER_IDS.MARKET_MANIPULATION
              ? '📈 Choose Candy to Manipulate'
              : candySelectorModal.joker?.id === JOKER_IDS.THE_BIG_SHORT
                ? '📉 Choose Candy to Short'
                : candySelectorModal.joker?.id === JOKER_IDS.PROPACANDIES
                  ? '📰 Choose Candy to Drop Price'
                  : '🍭 Choose Candy Type'}
          </Text>

          {CANDY_TYPES.map((candyType) => (
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
            onPress={() =>
              setCandySelectorModal({ visible: false, joker: null })
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
    backgroundColor: '#2a1845',
  },
  header: {
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: '#00512C',
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  headerAfterSchool: {
    backgroundColor: '#2a1845',
    borderBottomColor: '#8a7ca8',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#d4af37',
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  titleAfterSchool: {
    color: '#f7e98e',
    textShadowColor: 'rgba(247,233,142,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  countBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  countTextAfterSchool: {
    color: '#f7e98e',
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
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  activeTab: {
    backgroundColor: '#dc2626',
    borderColor: '#991b1b',
  },
  activeTabAfterSchool: {
    backgroundColor: '#8a7ca8',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d4af37',
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabTextAfterSchool: {
    color: '#b8a9c9',
  },
  activeTabText: {
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  activeTabTextAfterSchool: {
    color: '#f7e98e',
  },
  dragHint: {
    fontSize: 11,
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.7,
  },
  dragHintAfterSchool: {
    color: '#b8a9c9',
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
    color: '#d4af37',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyTextAfterSchool: {
    color: '#f7e98e',
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
    color: '#b8a9c9',
  },
  sectionHeader: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d4af37',
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
    color: '#d4af37',
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionTitleAfterSchool: {
    color: '#f7e98e',
  },
  // Candy Selector Modal styles
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  candyButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  candyButtonText: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
});

// Removed memo to fix tab styling issue
export default JokersPage;
