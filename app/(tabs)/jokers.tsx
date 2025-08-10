import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import JokerCard from '../components/JokerCard';
import { useGame } from '../context/GameContext';
import { useJokers } from '../context/JokerContext';

export default function JokersPage() {
  const { isAfterSchool } = useGame();
  const { jokers } = useJokers();
  
  const renderJoker = ({ item }: { item: any }) => (
    <JokerCard joker={item} isAfterSchool={isAfterSchool} />
  );

  return (
    <View style={[
      styles.container,
      isAfterSchool && styles.containerAfterSchool
    ]}>
      <View style={[
        styles.header,
        isAfterSchool && styles.headerAfterSchool
      ]}>
        <Text style={[
          styles.title,
          isAfterSchool && styles.titleAfterSchool
        ]}>🃏 Your Jokers</Text>
        <Text style={[
          styles.subtitle,
          isAfterSchool && styles.subtitleAfterSchool
        ]}>Study rewards you've earned</Text>
      </View>
      
      <FlatList
        data={jokers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderJoker}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      
      {jokers.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={[
            styles.emptyText,
            isAfterSchool && styles.emptyTextAfterSchool
          ]}>📚 Study to earn jokers!</Text>
          <Text style={[
            styles.emptySubtext,
            isAfterSchool && styles.emptySubtextAfterSchool
          ]}>Complete minigames to collect powerful rewards</Text>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#e6ccb3',
    alignItems: 'center',
  },
  headerAfterSchool: {
    backgroundColor: '#000000',
    borderBottomColor: '#8a7ca8',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    marginBottom: 4,
  },
  titleAfterSchool: {
    color: '#f7e98e',
    textShadowColor: 'rgba(247,233,142,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
  },
  subtitleAfterSchool: {
    color: '#b8a9c9',
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 24,
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
    fontSize: 16,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  emptySubtextAfterSchool: {
    color: '#b8a9c9',
  },
});