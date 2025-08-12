import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDailyStats } from '../../src/context/DailyStatsContext';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useGame } from '../../src/context/GameContext';
import { useWallet } from '../../src/context/WalletContext';
import GameHUD from '../components/GameHUD';
import SleepConfirmModal from '../components/SleepConfirmModal';

export default function AfterSchoolPage() {
  const { day, startNewDay, hasStudiedTonight } = useGame();
  const { resetDailyStats } = useDailyStats();
  const { balance } = useWallet();
  const { setEvent } = useFlavorText();
  const [sleepConfirmModalVisible, setSleepConfirmModalVisible] =
    useState(false);

  // Set afternoon flavor text when component loads
  useEffect(() => {
    setEvent('AFTERNOON');
  }, [setEvent]);

  const handleStudy = () => {
    if (hasStudiedTonight) {
      return; // Don't navigate if already studied
    }
    router.push('/(tabs)/study');
  };

  const handleStashMoney = () => {
    router.push('/(tabs)/piggy-bank');
  };

  const handleGoDeli = () => {
    router.push('/(tabs)/deli');
  };

  const handleGoToSleep = () => {
    // Show confirmation modal instead of immediately ending the day
    setSleepConfirmModalVisible(true);
  };

  const handleSleepConfirm = () => {
    // Close the modal first
    setSleepConfirmModalVisible(false);
    // Reset daily stats and start new day
    resetDailyStats(balance);
    // Start new day (this will exit after-school mode and increment to next day)
    startNewDay();
    // Navigate back to market (school)
    router.push('/(tabs)/market');
  };

  const handleSleepCancel = () => {
    // Just close the modal
    setSleepConfirmModalVisible(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.option, item.disabled && styles.disabledOption]}
      onPress={item.disabled ? undefined : item.onPress}
      disabled={item.disabled}
    >
      <Text style={[styles.optionEmoji, item.disabled && styles.disabledEmoji]}>
        {item.emoji}
      </Text>
      <View style={styles.optionText}>
        <Text
          style={[styles.optionTitle, item.disabled && styles.disabledText]}
        >
          {item.title}
        </Text>
        <Text style={[styles.optionDesc, item.disabled && styles.disabledText]}>
          {item.desc}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const options = [
    {
      id: 'study',
      emoji: '📚',
      title: 'Study at Home',
      desc: hasStudiedTonight
        ? "You've already studied tonight. Rest up!"
        : 'Cozy up with your books by the warm lamplight',
      onPress: () => handleStudy(),
      disabled: hasStudiedTonight,
    },
    {
      id: 'stash',
      emoji: '🔐',
      title: 'Go to Your Stash',
      desc: 'Make sure no one is following you',
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

      <SleepConfirmModal
        visible={sleepConfirmModalVisible}
        onConfirm={handleSleepConfirm}
        onCancel={handleSleepCancel}
        currentDay={day}
      />
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
    backgroundColor: 'rgba(120, 120, 120, 0.3)', // Darker background for better contrast
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f7e98e',
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
    textShadowColor: 'rgba(125,125,125,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  optionDesc: {
    fontSize: 16,
    color: '#f5f5dc', // Changed from purple to beige/cream for better contrast
    lineHeight: 22,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  disabledOption: {
    opacity: 0.6,
    backgroundColor: 'rgba(93, 76, 112, 0.4)',
  },
  disabledEmoji: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#666',
  },
});
