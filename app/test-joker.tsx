import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useJokers } from '../src/context/JokerContext';

export default function TestJokerPage() {
  const { jokers, addJoker } = useJokers();

  const handleAddTestJoker = () => {
    const testJoker = {
      id: Date.now(), // Unique ID based on timestamp
      name: `Test Joker ${Date.now()}`,
      description: 'This is a test joker to verify persistence',
      subject: 'Test',
      theme: 'test',
      type: 'persistent' as const,
      effect: 'test_effect'
    };
    
    console.log('=== MANUALLY ADDING TEST JOKER ===');
    console.log('Joker:', testJoker);
    addJoker(testJoker);
    console.log('=== TEST JOKER ADDED ===');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Joker Page</Text>
      <Text style={styles.info}>Current jokers: {jokers.length}</Text>
      
      {jokers.map(joker => (
        <View key={joker.id} style={styles.jokerItem}>
          <Text style={styles.jokerName}>{joker.name}</Text>
          <Text style={styles.jokerType}>Type: {joker.type}</Text>
        </View>
      ))}
      
      <Button title="Add Test Joker" onPress={handleAddTestJoker} />
      <Button title="Go to Jokers Page" onPress={() => router.push('/(tabs)/jokers')} />
      <Button title="Back" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  info: {
    fontSize: 18,
    marginBottom: 20,
  },
  jokerItem: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    marginBottom: 5,
    borderRadius: 5,
  },
  jokerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  jokerType: {
    fontSize: 14,
    color: '#666',
  },
});