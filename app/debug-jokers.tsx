import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GameHUD from './components/GameHUD';
import { useGame } from '../src/context/GameContext';
import { useJokers } from '../src/context/JokerContext';
import { 
  MATH_JOKERS, 
  COMPUTER_JOKERS, 
  HOME_EC_JOKERS, 
  ECONOMY_JOKERS, 
  HISTORY_JOKERS, 
  LOGIC_JOKERS, 
  GYM_JOKERS,
  StandardizedJoker 
} from '../src/utils/jokerEffectEngine';

// Combine all jokers with subject information
const ALL_DEBUG_JOKERS = [
  ...MATH_JOKERS.map(j => ({ ...j, subject: 'Math', theme: 'math' })),
  ...COMPUTER_JOKERS.map(j => ({ ...j, subject: 'Computer', theme: 'computer' })),
  ...HOME_EC_JOKERS.map(j => ({ ...j, subject: 'Home Economics', theme: 'homeec' })),
  ...ECONOMY_JOKERS.map(j => ({ ...j, subject: 'Economy', theme: 'economy' })),
  ...HISTORY_JOKERS.map(j => ({ ...j, subject: 'History', theme: 'history' })),
  ...LOGIC_JOKERS.map(j => ({ ...j, subject: 'Logic', theme: 'candy' })),
  ...GYM_JOKERS.map(j => ({ ...j, subject: 'Gym', theme: 'gym' })),
];

export default function DebugJokersPage() {
  const { day } = useGame();
  const { addJoker } = useJokers();
  const [selectedJokers, setSelectedJokers] = useState<Set<number>>(new Set());

  const handleJokerToggle = (jokerId: number) => {
    const joker = ALL_DEBUG_JOKERS.find(j => j.id === jokerId);
    if (!joker) return;

    const newSelected = new Set(selectedJokers);
    
    if (newSelected.has(jokerId)) {
      // Remove from selection
      newSelected.delete(jokerId);
    } else {
      // Add to selection
      newSelected.add(jokerId);
    }
    
    setSelectedJokers(newSelected);
  };

  const handleAddSelected = () => {
    console.log('=== DEBUG ADD SELECTED ===');
    selectedJokers.forEach(jokerId => {
      const joker = ALL_DEBUG_JOKERS.find(j => j.id === jokerId);
      if (joker) {
        // Determine if joker is one-time or persistent
        const isOneTime = joker.effects.every((e: any) => e.duration === 'one-time');
        const jokerType = isOneTime ? 'one-time' : 'persistent';
        
        const jokerToAdd = {
          id: joker.id,
          name: joker.name,
          description: joker.description,
          subject: joker.subject,
          theme: joker.theme,
          type: jokerType,
          effect: joker.effects[0] ? joker.effects[0].target : 'none',
          effects: joker.effects // Include the full effects array
        };
        
        console.log('Adding joker from debug:', jokerToAdd);
        addJoker(jokerToAdd as any);
      }
    });
    
    // Clear selection and go back
    setSelectedJokers(new Set());
    router.back();
  };

  const handleAddAll = () => {
    console.log('=== DEBUG ADD ALL ===');
    ALL_DEBUG_JOKERS.forEach(joker => {
      // Determine if joker is one-time or persistent
      const isOneTime = joker.effects.every((e: any) => e.duration === 'one-time');
      const jokerType = isOneTime ? 'one-time' : 'persistent';
      
      const jokerToAdd = {
        id: joker.id,
        name: joker.name,
        description: joker.description,
        subject: joker.subject,
        theme: joker.theme,
        type: jokerType,
        effect: joker.effects[0] ? joker.effects[0].target : 'none',
        effects: joker.effects // Include the full effects array
      };
      
      console.log('Adding joker from debug:', jokerToAdd.name, jokerToAdd.type);
      addJoker(jokerToAdd as any);
    });
    
    console.log(`🐛 DEBUG: Added all ${ALL_DEBUG_JOKERS.length} jokers to inventory!`);
    router.back();
  };

  const handleClearSelection = () => {
    setSelectedJokers(new Set());
  };

  const handleSelectAllPersistent = () => {
    const persistentJokers = ALL_DEBUG_JOKERS.filter(j => 
      j.effects.some((e: any) => e.duration === 'persistent')
    );
    setSelectedJokers(new Set(persistentJokers.map(j => j.id)));
  };

  const handleSelectAllOneTime = () => {
    const oneTimeJokers = ALL_DEBUG_JOKERS.filter(j => 
      j.effects.some((e: any) => e.duration === 'one-time')
    );
    setSelectedJokers(new Set(oneTimeJokers.map(j => j.id)));
  };

  const renderJoker = ({ item }: { item: any }) => {
    const isSelected = selectedJokers.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.jokerCard,
          isSelected && styles.jokerCardSelected
        ]}
        onPress={() => handleJokerToggle(item.id)}
      >
        <View style={styles.jokerHeader}>
          <View style={styles.jokerTitleRow}>
            <Text style={[
              styles.jokerName,
              isSelected && styles.jokerNameSelected
            ]}>{item.name}</Text>
            <View style={styles.jokerTags}>
              <Text style={[
                styles.jokerType,
                { 
                  backgroundColor: item.effects.some((e: any) => e.duration === 'persistent') ? '#4ade80' : '#f87171',
                  color: '#fff'
                }
              ]}>
                {item.effects.some((e: any) => e.duration === 'persistent') ? '🔄 PERSISTENT' : '⚡ ONE-TIME'}
              </Text>
              <Text style={styles.jokerSubject}>{item.subject}</Text>
            </View>
          </View>
        </View>
        
        <Text style={[
          styles.jokerDescription,
          isSelected && styles.jokerDescriptionSelected
        ]}>{item.description}</Text>
        
        {item.effects && item.effects.length > 0 && (
          <Text style={styles.jokerEffect}>
            Effects: {item.effects.map((e: any) => 
              `${e.target} ${e.operation} ${e.amount}`
            ).join(', ')}
          </Text>
        )}
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedText}>✅ SELECTED</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#1a1a1a" />
      <GameHUD 
        theme="evening" 
        customHeaderText={`🐛 DEBUG MODE - Day ${day}`}
        customLocationText="Joker Laboratory" 
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎭 All Jokers Debug</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Selected: {selectedJokers.size} / {ALL_DEBUG_JOKERS.length}
        </Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.addSelectedButton]} 
            onPress={handleAddSelected}
            disabled={selectedJokers.size === 0}
          >
            <Text style={styles.addSelectedButtonText}>
              Add Selected ({selectedJokers.size})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.addAllButton]} 
            onPress={handleAddAll}
          >
            <Text style={styles.addAllButtonText}>Add All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickSelectRow}>
          <TouchableOpacity 
            style={styles.quickSelectButton} 
            onPress={handleSelectAllPersistent}
          >
            <Text style={styles.quickSelectText}>🔄 All Persistent</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickSelectButton} 
            onPress={handleSelectAllOneTime}
          >
            <Text style={styles.quickSelectText}>⚡ All One-Time</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickSelectButton} 
            onPress={handleClearSelection}
          >
            <Text style={styles.quickSelectText}>🗑️ Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={ALL_DEBUG_JOKERS}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderJoker}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 15,
  },
  backButtonText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ff4444',
    fontFamily: 'CrayonPastel',
    flex: 1,
  },
  statsContainer: {
    backgroundColor: '#333',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ff4444',
  },
  statsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addSelectedButton: {
    backgroundColor: '#4ade80',
  },
  addSelectedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  addAllButton: {
    backgroundColor: '#f87171',
  },
  addAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickSelectButton: {
    flex: 1,
    backgroundColor: '#555',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  quickSelectText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  jokerCard: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#555',
  },
  jokerCardSelected: {
    backgroundColor: '#0f3f0f',
    borderColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  jokerHeader: {
    marginBottom: 8,
  },
  jokerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jokerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
    flex: 1,
    marginRight: 10,
  },
  jokerNameSelected: {
    color: '#4ade80',
  },
  jokerTags: {
    alignItems: 'flex-end',
    gap: 4,
  },
  jokerType: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontFamily: 'CrayonPastel',
  },
  jokerSubject: {
    fontSize: 12,
    color: '#1a1a1a',
    backgroundColor: '#ccc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontFamily: 'CrayonPastel',
  },
  jokerDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    fontFamily: 'CrayonPastel',
    marginBottom: 8,
  },
  jokerDescriptionSelected: {
    color: '#fff',
  },
  jokerEffect: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'CrayonPastel',
    fontStyle: 'italic',
  },
  selectedIndicator: {
    backgroundColor: '#4ade80',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  selectedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
});