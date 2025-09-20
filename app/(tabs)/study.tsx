import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGame } from '../../src/context/GameContext';
import GameHUD from '../components/GameHUD';

const subjects = [
  { name: 'Math', color: { bg: '#e6f7ff', border: '#1890ff' } },
  { name: 'Gym', color: { bg: '#e6f2ff', border: '#4169e1' } },
  { name: 'Home Ec', color: { bg: '#f6ffed', border: '#52c41a' } },
  { name: 'Economy', color: { bg: '#fff1f0', border: '#f5222d' } },
  { name: 'Logic', color: { bg: '#f9f0ff', border: '#722ed1' } },
  { name: 'Recess', color: { bg: '#fff0f6', border: '#eb2f96' } },
  { name: 'Computer', color: { bg: '#f0f5ff', border: '#2f54eb' } },
  { name: 'Art', color: { bg: '#feffe6', border: '#a0d911' } },
];

export default function StudyPage() {
  const { day, hasStudiedTonight, markStudiedTonight } = useGame();

  console.log('📚 StudyPage: hasStudiedTonight =', hasStudiedTonight);

  const handleSubjectSelect = (subject: string) => {
    if (hasStudiedTonight) {
      // User has already studied tonight, prevent further studying
      return;
    }

    console.log(`Starting ${subject} minigame...`);

    // Navigate to specific minigame based on subject
    switch (subject) {
      case 'Math':
        router.push('/math-game');
        break;
      case 'Gym':
        router.push('/history-game');
        break;
      case 'Home Ec':
        router.push('/home-ec-game');

        break;
      case 'Economy':
        router.push('/economy-game');
        break;
      case 'Logic':
        router.push('/logic-game');
        break;
      case 'Recess':
        router.push('/recess-game');
        break;
      case 'Computer':
        router.push('/computer-game');

        break;
      case 'Art':
        router.push('/art-game');
        break;
      default:
        router.back();
    }
  };

  const handleGoBack = () => {
    // Trigger success haptic feedback when going back to after school
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Go back to after school
    router.push('/after-school');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2a1845" />
      <GameHUD
        theme="evening"
        customHeaderText={`After School - Day ${day}`}
        customLocationText="Peaceful Evening"
      />

      <View style={styles.header}>
        <Text style={styles.title}>Study Time</Text>
        {hasStudiedTonight && (
          <Text style={styles.alreadyStudiedText}>
            📚 You've already studied tonight! Rest up for tomorrow.
          </Text>
        )}
      </View>

      <View style={styles.subjectsContainer}>
        {/* First Row - 4 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(0, 4).map((subject) => (
            <TouchableOpacity
              key={subject.name}
              style={[
                styles.subjectButton,
                {
                  backgroundColor:
                    hasStudiedTonight
                      ? '#ccc'
                      : subject.color.bg,
                  borderColor:
                    hasStudiedTonight
                      ? '#999'
                      : subject.color.border,
                },
                hasStudiedTonight && styles.disabledButton,
              ]}
              onPress={() => handleSubjectSelect(subject.name)}
              disabled={hasStudiedTonight}
            >
              <Text
                style={[
                  styles.subjectText,
                  hasStudiedTonight && styles.disabledText,
                ]}
              >
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Second Row - 4 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(4, 8).map((subject) => (
            <TouchableOpacity
              key={subject.name}
              style={[
                styles.subjectButton,
                {
                  backgroundColor:
                    hasStudiedTonight
                      ? '#ccc'
                      : subject.color.bg,
                  borderColor:
                    hasStudiedTonight
                      ? '#999'
                      : subject.color.border,
                },
                hasStudiedTonight && styles.disabledButton,
              ]}
              onPress={() => handleSubjectSelect(subject.name)}
              disabled={hasStudiedTonight}
            >
              <Text
                style={[
                  styles.subjectText,
                  hasStudiedTonight && styles.disabledText,
                ]}
              >
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Back to After School</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a1845', // Match after-school background
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f7e98e', // Match after-school title color
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(247,233,142,0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  alreadyStudiedText: {
    fontSize: 16,
    color: '#b8a9c9',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  subjectsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  subjectsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  subjectButton: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  subjectText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#5d4e37',
    fontFamily: 'CrayonPastel',
    lineHeight: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#999',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(93, 76, 112, 0.6)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#b8a9c9',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#f7e98e',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'CrayonPastel',
  },
});
