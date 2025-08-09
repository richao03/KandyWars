import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GameHUD from '../components/GameHUD';
import { useDailyStats } from '../context/DailyStatsContext';
import { useFlavorText } from '../context/FlavorTextContext';
import { useGame } from '../context/GameContext';
import { useWallet } from '../context/WalletContext';


export default function AfterSchoolPage() {
  const { day, incrementPeriod } = useGame();
  const { resetDailyStats } = useDailyStats();
  const { balance } = useWallet();
  const { setEvent } = useFlavorText();

  // Set afternoon flavor text when component loads
  useEffect(() => {
    setEvent('AFTERNOON');
  }, [setEvent]);

  const handleStudy = () => {
    router.push('/(tabs)/study');
  };

  const handleStashMoney = () => {
    // TODO: Navigate to stash money functionality
    console.log('Navigate to stash money');
  };

  const handleGoDeli = () => {
    router.push('/(tabs)/deli');
  };

  const handleGoToSleep = () => {
    // Reset daily stats and start new day
    resetDailyStats(balance);
    // Start new day at period 1 (home room)
    incrementPeriod('home room');
    // Navigate back to market (school)
    router.push('/(tabs)/market');
  };

const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.option} onPress={item.onPress}>
      <Text style={styles.optionEmoji}>{item.emoji}</Text>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{item.title}</Text>
        <Text style={styles.optionDesc}>{item.desc}</Text>
      </View>
    </TouchableOpacity>
  );

const options = [
  {
    id: 'study',
    emoji: '📚',
    title: 'Study at Home',
    desc: 'Cozy up with your books by the warm lamplight',
    onPress: () => handleStudy(),
  },
  {
    id: 'stash',
    emoji: '🔐',
    title: 'Stash Your Money',
    desc: 'Hide your earnings in your secret piggy bank',
    onPress: () => handleStashMoney(),
  },
  {
    id: 'deli',
    emoji: '🏪',
    title: 'Visit the Corner Deli',
    desc: 'Take an evening stroll to the neighborhood store',
    onPress: () => handleGoDeli(),
  },
  {
    id: 'sleep',
    emoji: '😴',
    title: 'Go to Sleep',
    desc: 'Rest up and start a new day at school tomorrow',
    onPress: () => handleGoToSleep(),
  },
];


  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2a1845" />
      <ImageBackground
        source={require('../../assets/images/evening-street.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <GameHUD 
          theme="evening" 
          customHeaderText={`After School - Day ${day}`}
          customLocationText="Peaceful Evening"
        />
        <FlatList
          data={options}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
        <View style={styles.buttonContainer}>
          {/* Optional: Add a button here if needed */}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a1845', // Fallback color
  },
  backgroundImage: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  option: {
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(93, 76, 112, 0.85)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8a7ca8',
    shadowColor: '#2d1b3d',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 44,
    marginRight: 20,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f7e98e',
    marginBottom: 6,
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(247,233,142,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  optionDesc: {
    fontSize: 16,
    color: '#b8a9c9',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  
  // Streetlamp styles
  lamp: {
    position: 'absolute',
    width: 150,
    bottom: 0,
    zIndex: 5,
  },
  post: {
    position: 'absolute',
    height: '100%',
    width: 10,
    backgroundColor: '#070707',
    left: 30,
    borderRightWidth: 5,
    borderRightColor: '#70643e',
  },
  curve: {
    position: 'absolute',
    width: '100%',
    left: 0,
    top: 20,
    height: 100,
    transform: [{ rotate: '-10deg' }],
    overflow: 'hidden',
  },
  curveTop: {
    position: 'absolute',
    height: '100%',
    width: 250,
    left: -50,
    borderRadius: 125,
    borderTopWidth: 10,
    borderTopColor: '#070707',
    top: 0,
  },
  curveHighlight: {
    position: 'absolute',
    height: '100%',
    width: 250,
    left: -50,
    borderRadius: 125,
    borderTopWidth: 5,
    borderTopColor: '#70643e',
    top: 6,
  },
  socket: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#070707',
    top: 0,
    right: 13,
  },
  light: {
    position: 'absolute',
    top: 14,
    left: -17,
    height: 50,
    width: 50,
    borderRadius: 25,
    zIndex: -1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    elevation: 10,
  },
});