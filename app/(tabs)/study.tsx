import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GameHUD from '../components/GameHUD';
import { useGame } from '../context/GameContext';

const subjects = [
  { name: 'Math', color: { bg: '#e6f7ff', border: '#1890ff' } },
  { name: 'History', color: { bg: '#fff2e8', border: '#fa8c16' } },
  { name: 'Home Ec', color: { bg: '#f6ffed', border: '#52c41a' } },
  { name: 'Economy', color: { bg: '#fff1f0', border: '#f5222d' } },
  { name: 'Logic', color: { bg: '#f9f0ff', border: '#722ed1' } },
  { name: 'Creative Writing', color: { bg: '#fff0f6', border: '#eb2f96' } },
  { name: 'Computer', color: { bg: '#f0f5ff', border: '#2f54eb' } },
  { name: 'Gym', color: { bg: '#feffe6', border: '#a0d911' } },
  { name: '🐛 DEBUG', color: { bg: '#1a1a1a', border: '#ff0000' } },
];

export default function StudyPage() {
  const { day, hasStudiedTonight, markStudiedTonight } = useGame();
  const handleSubjectSelect = (subject: string) => {
    if (hasStudiedTonight) {
      // User has already studied tonight, prevent further studying
      return;
    }
    
    // Mark that user has studied tonight before starting the minigame
    markStudiedTonight();
    console.log(`Starting ${subject} minigame...`);
    
    // Navigate to specific minigame based on subject
    switch (subject) {
      case 'Math':
        router.push('/math-game');
        break;
      case 'History':
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
      case 'Creative Writing':
        // TODO: router.push('/writing-game');
        console.log('Creative Writing minigame not implemented yet');
        router.back();
        break;
      case 'Computer':
       router.push('/computer-game');

        break;
      case 'Gym':
        router.push('/gym-game');
        break;
      case '🐛 DEBUG':
        console.log("fiund a debugers")
        router.push('/debug-jokers');
        break;
      default:
        router.back();
    }
  };

  const handleGoBack = () => {
    // Go back to after school
    router.push('/after-school');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2a1845" />
      <GameHUD         theme="evening" 
          customHeaderText={`After School - Day ${day}`}
          customLocationText="Peaceful Evening" />
      
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
                  backgroundColor: hasStudiedTonight ? '#ccc' : subject.color.bg,
                  borderColor: hasStudiedTonight ? '#999' : subject.color.border,
                },
                hasStudiedTonight && styles.disabledButton
              ]}
              onPress={() => handleSubjectSelect(subject.name)}
              disabled={hasStudiedTonight}
            >
              <Text style={[
                styles.subjectText,
                hasStudiedTonight && styles.disabledText
              ]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
           <TouchableOpacity
              key={"debug"}
              style={[
                styles.subjectButton,
                {
                  backgroundColor: hasStudiedTonight ? '#666' : "black",
                  borderColor: hasStudiedTonight ? '#999' : "red",
                },
                hasStudiedTonight && styles.disabledButton
              ]}
              onPress={() => handleSubjectSelect("🐛 DEBUG")}
              disabled={hasStudiedTonight}
            >
              <Text style={[
                styles.subjectText,
                hasStudiedTonight && styles.disabledText
              ]}>
                {"🐛 DEBUG"}
              </Text>
            </TouchableOpacity>
        </View>

        {/* Second Row - 4 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(4, 8).map((subject) => (
            <TouchableOpacity
              key={subject.name}
              style={[
                styles.subjectButton,
                {
                  backgroundColor: hasStudiedTonight ? '#ccc' : subject.color.bg,
                  borderColor: hasStudiedTonight ? '#999' : subject.color.border,
                },
                hasStudiedTonight && styles.disabledButton
              ]}
              onPress={() => handleSubjectSelect(subject.name)}
              disabled={hasStudiedTonight}
            >
              <Text style={[
                styles.subjectText,
                hasStudiedTonight && styles.disabledText
              ]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>🌅 Back to After School</Text>
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
    marginBottom:20

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
    backgroundColor: '#ffcc99',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#cc7a00',
    shadowColor: '#8b4513',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
});