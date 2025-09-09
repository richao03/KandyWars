import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDailyStats } from '../../src/context/DailyStatsContext';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useGame } from '../../src/context/GameContext';
import { useJokers } from '../../src/context/JokerContext';
import { useWallet } from '../../src/context/WalletContext';
import GameHUD from '../components/GameHUD';
import GoingToSchoolModal from '../components/GoingToSchoolModal';
import SleepConfirmModal from '../components/SleepConfirmModal';

export default function AfterSchoolPage() {
  const navigation = useNavigation();
  const { day, startNewDay, hasStudiedTonight, periodCount } = useGame();
  const { resetDailyStats } = useDailyStats();
  const { balance, addAllowance } = useWallet();
  const { jokers } = useJokers();
  const { setEvent } = useFlavorText();
  const [sleepConfirmModalVisible, setSleepConfirmModalVisible] =
    useState(false);
  const [goingToSchoolModalVisible, setGoingToSchoolModalVisible] =
    useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState(0);

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
    // Close the sleep modal and add allowance before showing going to school modal
    setSleepConfirmModalVisible(false);

    // Add daily allowance (jokers could modify this amount)
    const receivedAllowance = addAllowance(jokers, periodCount);
    setAllowanceAmount(receivedAllowance);

    setGoingToSchoolModalVisible(true);
  };

  const handleGoingToSchoolComplete = () => {
    // Close the interstitial
    setGoingToSchoolModalVisible(false);
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

  const renderCircleOption = (item, index) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.circleOption, item.disabled && styles.disabledCircle]}
      onPress={item.disabled ? undefined : item.onPress}
      disabled={item.disabled}
    >
      <Text style={[styles.circleEmoji, item.disabled && styles.disabledEmoji]}>
        {item.emoji}
      </Text>
      <Text style={[styles.circleTitle, item.disabled && styles.disabledText]}>
        {item.title}
      </Text>
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
        <View style={styles.optionsContainer}>
          <View style={styles.optionsGrid}>
            {options.map((item, index) => renderCircleOption(item, index))}
          </View>
        </View>
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

      <GoingToSchoolModal
        visible={goingToSchoolModalVisible}
        allowanceAmount={allowanceAmount}
        onComplete={handleGoingToSchoolComplete}
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
  optionsContainer: {
    flex: 1,
    paddingTop: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  circleOption: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(90,99,127, 0.8)',
    borderWidth: 3,
    borderColor: '#f7e98e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2d1b3d',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  circleEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  circleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f7e98e',
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(125,125,125,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    paddingHorizontal: 8,
  },
  disabledCircle: {
    opacity: 0.5,
    backgroundColor: 'rgba(93, 76, 112, 0.4)',
  },
  disabledEmoji: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#666',
  },
});
