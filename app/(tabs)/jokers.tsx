import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import JokerCard from '../components/JokerCard';
import GameHUD from '../components/GameHUD';
import { useGame } from '../../src/context/GameContext';
import { useJokers } from '../../src/context/JokerContext';

export default function JokersPage() {
  const { isAfterSchool, day } = useGame();
  const { jokers, reorderJokers } = useJokers();
  const [activeTab, setActiveTab] = useState<'persistent' | 'one-time'>('persistent');
  
  
  // Separate jokers by their effect duration (not type)
  // A joker is "persistent" if it has at least one persistent effect
  const persistentJokers = useMemo(() => {
    const persistent = jokers.filter(j => {
      // Check if this joker should be treated as persistent
      // This could be based on a type field, or we can infer from name/effect
      return j.type === 'persistent' || !j.type?.includes('one-time');
    });
    return persistent;
  }, [jokers]);
  
  const oneTimeJokers = useMemo(() => {
    const oneTime = jokers.filter(j => {
      return j.type === 'one-time';
    });
    return oneTime;
  }, [jokers]);
  
  const currentJokers = activeTab === 'persistent' ? persistentJokers : oneTimeJokers;
  
  const renderJoker = ({ item, drag, isActive }: RenderItemParams<any>) => (
    <JokerCard 
      joker={item} 
      isAfterSchool={isAfterSchool}
      onLongPress={drag}
      isDragging={isActive}
      isCompact={true}
    />
  );
  
  const handleReorder = (data: any[]) => {
    // Merge reordered data with other type jokers
    const otherJokers = activeTab === 'persistent' ? oneTimeJokers : persistentJokers;
    const allJokers = activeTab === 'persistent' 
      ? [...data, ...otherJokers]
      : [...persistentJokers, ...data];
    reorderJokers(allJokers);
  };

  return (
    <View style={[
      styles.container,
      isAfterSchool && styles.containerAfterSchool
    ]}>
      <GameHUD 
        theme={isAfterSchool ? "evening" : "school"}
        customHeaderText={isAfterSchool ? `After School - Day ${day}` : `School - Day ${day}`}
        customLocationText="Jokers Collection"
      />
      
      <View style={[
        styles.header,
        isAfterSchool && styles.headerAfterSchool
      ]}>
        <View style={styles.headerTop}>
          <Text style={[
            styles.title,
            isAfterSchool && styles.titleAfterSchool
          ]}>🃏 Jokers</Text>
          <View style={styles.countBadge}>
            <Text style={[
              styles.countText,
              isAfterSchool && styles.countTextAfterSchool
            ]}>{jokers.length}</Text>
          </View>
        </View>
        
        <View style={[
          styles.tabContainer,
          isAfterSchool && styles.tabContainerAfterSchool
        ]}>
          <TouchableOpacity 
            style={[
              styles.tab,
              activeTab === 'persistent' && styles.activeTab,
              activeTab === 'persistent' && isAfterSchool && styles.activeTabAfterSchool
            ]}
            onPress={() => setActiveTab('persistent')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'persistent' && styles.activeTabText,
              isAfterSchool && styles.tabTextAfterSchool,
              activeTab === 'persistent' && isAfterSchool && styles.activeTabTextAfterSchool
            ]}>
              🔄 Persistent ({persistentJokers.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab,
              activeTab === 'one-time' && styles.activeTab,
              activeTab === 'one-time' && isAfterSchool && styles.activeTabAfterSchool
            ]}
            onPress={() => setActiveTab('one-time')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'one-time' && styles.activeTabText,
              isAfterSchool && styles.tabTextAfterSchool,
              activeTab === 'one-time' && isAfterSchool && styles.activeTabTextAfterSchool
            ]}>
              ⚡ One-Time ({oneTimeJokers.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {currentJokers.length > 0 ? (
        <>
          {currentJokers.length > 1 && (
            <Text style={[
              styles.dragHint,
              isAfterSchool && styles.dragHintAfterSchool
            ]}>Hold & drag cards to reorder</Text>
          )}
          <DraggableFlatList
            data={currentJokers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderJoker}
            onDragEnd={({ data }) => handleReorder(data)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[
            styles.emptyIcon,
            isAfterSchool && styles.emptyIconAfterSchool
          ]}>
            {activeTab === 'persistent' ? '🔄' : '⚡'}
          </Text>
          <Text style={[
            styles.emptyText,
            isAfterSchool && styles.emptyTextAfterSchool
          ]}>
            No {activeTab} jokers yet
          </Text>
          <Text style={[
            styles.emptySubtext,
            isAfterSchool && styles.emptySubtextAfterSchool
          ]}>
            Study to earn {activeTab === 'persistent' ? 'permanent buffs' : 'powerful one-time abilities'}
          </Text>
        </View>
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
    paddingTop: 8,
    paddingBottom: 8,
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
    gap: 8,
  },
  tabContainerAfterSchool: {
    borderTopColor: '#8a7ca8',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
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
    fontSize: 14,
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
    padding: 12,
    paddingTop: 4,
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
});