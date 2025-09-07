import React, { memo, useMemo, useState } from 'react';
import {
  FlatList,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useGame } from '../../src/context/GameContext';
import { useJokers } from '../../src/context/JokerContext';
import { ALL_JOKERS } from '../../src/utils/jokerEffectEngine';
import GameHUD from '../components/GameHUD';
import JokerCard from '../components/JokerCard';

function JokersPage() {
  const gameContext = useGame();
  const jokerContext = useJokers();
  const [activeTab, setActiveTab] = useState<'inventory' | 'see-all'>(
    'inventory'
  );
  // Remove selectedSubject state - we'll show all subjects as sections

  // If contexts are not available, show loading or initialization message
  if (!gameContext || !jokerContext) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading game data...</Text>
        </View>
      </View>
    );
  }

  const { isAfterSchool, day } = gameContext;
  const { jokers, reorderJokers } = jokerContext;

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

  // Current user's jokers for "Inventory" tab
  const inventoryJokers = useMemo(() => {
    return jokers; // Keep current user's jokers as-is for inventory
  }, [jokers]);

  const currentJokers = inventoryJokers; // Only used for inventory tab

  // Memoize styles to prevent recreation on every render
  const containerStyles = useMemo(
    () => [styles.container, isAfterSchool && styles.containerAfterSchool],
    [isAfterSchool]
  );

  const headerStyles = useMemo(
    () => [styles.header, isAfterSchool && styles.headerAfterSchool],
    [isAfterSchool]
  );

  const titleStyles = useMemo(
    () => [styles.title, isAfterSchool && styles.titleAfterSchool],
    [isAfterSchool]
  );

  const renderInventoryJoker = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<any>) => (
    <View style={styles.jokerCardContainer}>
      <JokerCard
        joker={item}
        isAfterSchool={isAfterSchool}
        onLongPress={drag}
        isDragging={isActive}
        isCompact={true}
      />
    </View>
  );

  const renderSeeAllJoker = ({ item }: { item: any }) => (
    <View style={styles.jokerCardContainer}>
      <JokerCard
        joker={item}
        isAfterSchool={isAfterSchool}
        isCompact={true}
        showOwned={jokers.some((ownedJoker) => ownedJoker.id === item.id)}
      />
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
          />
        </View>
      ))}
    </View>
  );

  const handleReorder = (data: any[]) => {
    // Only allow reordering in inventory tab
    if (activeTab === 'inventory') {
      reorderJokers(data);
    }
  };

  return (
    <View style={containerStyles}>
      <GameHUD
        theme={isAfterSchool ? 'evening' : 'school'}
        customHeaderText={
          isAfterSchool ? `After School - Day ${day}` : `School - Day ${day}`
        }
        customLocationText="Jokers Collection"
      />

      <View style={headerStyles}>
        <View style={styles.headerTop}>
          <Text style={titleStyles}>🃏 Jokers</Text>
          <View style={styles.countBadge}>
            <Text
              style={[
                styles.countText,
                isAfterSchool && styles.countTextAfterSchool,
              ]}
            >
              {activeTab === 'inventory'
                ? jokers.length
                : allJokersCount}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.tabContainer,
            isAfterSchool && styles.tabContainerAfterSchool,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'inventory' && styles.activeTab,
              activeTab === 'inventory' &&
                isAfterSchool &&
                styles.activeTabAfterSchool,
            ]}
            onPress={() => setActiveTab('inventory')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'inventory' && styles.activeTabText,
                isAfterSchool && styles.tabTextAfterSchool,
                activeTab === 'inventory' &&
                  isAfterSchool &&
                  styles.activeTabTextAfterSchool,
              ]}
            >
              🎒 Mine ({jokers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'see-all' && styles.activeTab,
              activeTab === 'see-all' &&
                isAfterSchool &&
                styles.activeTabAfterSchool,
            ]}
            onPress={() => setActiveTab('see-all')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'see-all' && styles.activeTabText,
                isAfterSchool && styles.tabTextAfterSchool,
                activeTab === 'see-all' &&
                  isAfterSchool &&
                  styles.activeTabTextAfterSchool,
              ]}
            >
              📖 All ({allJokersCount})
            </Text>
          </TouchableOpacity>
        </View>

      </View>

      {activeTab === 'inventory' ? (
        currentJokers.length > 0 ? (
          <>
            {currentJokers.length > 1 && (
              <Text
                style={[
                  styles.dragHint,
                  isAfterSchool && styles.dragHintAfterSchool,
                ]}
              >
                Hold & drag cards to reorder
              </Text>
            )}
            <DraggableFlatList
              data={currentJokers}
              keyExtractor={(item) =>
                item?.id?.toString() || Math.random().toString()
              }
              renderItem={renderInventoryJoker}
              onDragEnd={({ data }) => handleReorder(data)}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              numColumns={2}
              columnWrapperStyle={styles.row}
            />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text
              style={[
                styles.emptyIcon,
                isAfterSchool && styles.emptyIconAfterSchool,
              ]}
            >
              🎒
            </Text>
            <Text
              style={[
                styles.emptyText,
                isAfterSchool && styles.emptyTextAfterSchool,
              ]}
            >
              No jokers in inventory
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                isAfterSchool && styles.emptySubtextAfterSchool,
              ]}
            >
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
            <View style={[
              styles.sectionHeader,
              isAfterSchool && styles.sectionHeaderAfterSchool,
            ]}>
              <Text style={[
                styles.sectionTitle,
                isAfterSchool && styles.sectionTitleAfterSchool,
              ]}>
                {title}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefaf5',
  },
  containerAfterSchool: {
    backgroundColor: '#2a1845',
  },
  header: {
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6ccb3',
  },
  headerAfterSchool: {
    backgroundColor: '#000000',
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
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
  titleAfterSchool: {
    color: '#f7e98e',
    textShadowColor: 'rgba(247,233,142,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  countBadge: {
    backgroundColor: '#6b4423',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
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
    borderRadius: 16,
    backgroundColor: '#f5e6d3',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6b4423',
  },
  activeTabAfterSchool: {
    backgroundColor: '#8a7ca8',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
  },
  tabTextAfterSchool: {
    color: '#b8a9c9',
  },
  activeTabText: {
    color: '#fff',
  },
  activeTabTextAfterSchool: {
    color: '#f7e98e',
  },
  dragHint: {
    fontSize: 11,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
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
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
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
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  emptySubtextAfterSchool: {
    color: '#b8a9c9',
  },
  sectionHeader: {
    backgroundColor: '#f5e6d3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e6ccb3',
    marginTop: 0,
  },
  sectionHeaderAfterSchool: {
    backgroundColor: 'rgba(138, 124, 168, 0.3)',
    borderBottomColor: '#8a7ca8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
  sectionTitleAfterSchool: {
    color: '#f7e98e',
  },
});

// Memoize the component to prevent unnecessary rerenders
export default memo(JokersPage);
