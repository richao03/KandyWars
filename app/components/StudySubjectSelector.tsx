import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGame } from '../../src/hooks/useGame';
import PixelBorder from './PixelBorder';

const subjects = [
  { name: 'Math', color: { bg: '#e6f7ff', border: '#1890ff' }, icon: require('../../assets/images/emojis/math.png') },
  { name: 'Gym', color: { bg: '#e6f2ff', border: '#4169e1' }, icon: require('../../assets/images/emojis/gym.png') },
  { name: 'Cooking', color: { bg: '#f6ffed', border: '#52c41a' }, icon: require('../../assets/images/emojis/cooking.png') },
  { name: 'Economy', color: { bg: '#fff1f0', border: '#f5222d' }, icon: require('../../assets/images/emojis/economy.png') },
  { name: 'Logic', color: { bg: '#f9f0ff', border: '#722ed1' }, icon: require('../../assets/images/emojis/logic.png') },
  { name: 'Recess', color: { bg: '#fff0f6', border: '#eb2f96' }, icon: require('../../assets/images/emojis/recess.png') },
  { name: 'Comp Sci', color: { bg: '#f0f5ff', border: '#2f54eb' }, icon: require('../../assets/images/emojis/computer.png') },
  { name: 'Art', color: { bg: '#feffe6', border: '#a0d911' }, icon: require('../../assets/images/emojis/art.png') },
  { name: 'Geography', color: { bg: '#e6f3ff', border: '#3182ce' }, icon: require('../../assets/images/emojis/geography.png') },
];

interface StudySubjectSelectorProps {
  onBack: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  isLunchPeriod?: boolean;
}

const StudySubjectSelector = React.memo(function StudySubjectSelector({
  onBack,
  disabled = false,
  disabledMessage = "You've already studied tonight! Rest up for tomorrow.",
  isLunchPeriod = false,
}: StudySubjectSelectorProps) {
  console.log(
    '🎮 StudySubjectSelector rendering - isLunchPeriod:',
    isLunchPeriod
  );

  const { period, markLunchMinigamePlayed, setMinigameContext } = useGame();

  console.log('🎮 StudySubjectSelector after useGame - period:', period);

  const handleSubjectSelect = (subject: string) => {
    if (disabled) {
      return;
    }

    console.log(`Starting ${subject} minigame...`);

    // Set the context for where this minigame was started
    setMinigameContext(isLunchPeriod ? 'lunch' : 'after-school');

    // If this is during lunch period, mark that we've played the minigame
    if (isLunchPeriod) {
      console.log('🍔 Marking lunch minigame as played');
      markLunchMinigamePlayed();
    }

    // Navigate to specific minigame based on subject
    // Use push so we can navigate back to the tab
    switch (subject) {
      case 'Math':
        router.push('/math-game');
        break;
      case 'Gym':
        router.push('/history-game');
        break;
      case 'Cooking':
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
      case 'Comp Sci':
        router.push('/computer-game');
        break;
      case 'Art':
        router.push('/art-game');
        break;
      case 'Geography':
        router.push('/geography-game');
        break;
      default:
        onBack();
    }
  };

  return (
    <View style={styles.studyContainer}>
      <View style={styles.studyHeader}>
        {disabled && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../../assets/images/emojis/book.png')}
              style={{ width: 14, height: 14, resizeMode: 'contain', marginRight: 4 }}
            />
            <Text style={styles.alreadyStudiedText}>{disabledMessage}</Text>
          </View>
        )}
      </View>

      <View style={styles.subjectsContainer}>
        {/* First Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(0, 3).map((subject) => (
            <PixelBorder
              key={subject.name}
              borderColor={disabled ? '#999' : subject.color.border}
              borderWidth={3}
              backgroundColor={disabled ? '#ccc' : subject.color.bg}
              innerPadding={0}
              style={
                isLunchPeriod
                  ? styles.subjectDayTimeButtonWrapper
                  : styles.subjectButtonWrapper
              }
            >
              <TouchableOpacity
                style={[
                  styles.subjectButtonInner,
                  disabled && styles.disabledSubjectButton,
                ]}
                onPress={() => handleSubjectSelect(subject.name)}
                disabled={disabled}
              >
                <Image
                  source={subject.icon}
                  style={[
                    styles.subjectIcon,
                    disabled && styles.disabledIcon,
                  ]}
                />
                <Text
                  style={[styles.subjectText, disabled && styles.disabledText]}
                >
                  {subject.name}
                </Text>
              </TouchableOpacity>
            </PixelBorder>
          ))}
        </View>

        {/* Second Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(3, 6).map((subject) => (
            <PixelBorder
              key={subject.name}
              borderColor={disabled ? '#999' : subject.color.border}
              borderWidth={3}
              backgroundColor={disabled ? '#ccc' : subject.color.bg}
              innerPadding={0}
              style={
                isLunchPeriod
                  ? styles.subjectDayTimeButtonWrapper
                  : styles.subjectButtonWrapper
              }
            >
              <TouchableOpacity
                style={[
                  styles.subjectButtonInner,
                  disabled && styles.disabledSubjectButton,
                ]}
                onPress={() => handleSubjectSelect(subject.name)}
                disabled={disabled}
              >
                <Image
                  source={subject.icon}
                  style={[
                    styles.subjectIcon,
                    disabled && styles.disabledIcon,
                  ]}
                />
                <Text
                  style={[styles.subjectText, disabled && styles.disabledText]}
                >
                  {subject.name}
                </Text>
              </TouchableOpacity>
            </PixelBorder>
          ))}
        </View>

        {/* Third Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(6, 9).map((subject) => (
            <PixelBorder
              key={subject.name}
              borderColor={disabled ? '#999' : subject.color.border}
              borderWidth={3}
              backgroundColor={disabled ? '#ccc' : subject.color.bg}
              innerPadding={0}
              style={
                isLunchPeriod
                  ? styles.subjectDayTimeButtonWrapper
                  : styles.subjectButtonWrapper
              }
            >
              <TouchableOpacity
                style={[
                  styles.subjectButtonInner,
                  disabled && styles.disabledSubjectButton,
                ]}
                onPress={() => handleSubjectSelect(subject.name)}
                disabled={disabled}
              >
                <Image
                  source={subject.icon}
                  style={[
                    styles.subjectIcon,
                    disabled && styles.disabledIcon,
                  ]}
                />
                <Text
                  style={[styles.subjectText, disabled && styles.disabledText]}
                >
                  {subject.name}
                </Text>
              </TouchableOpacity>
            </PixelBorder>
          ))}
        </View>
      </View>

      {!isLunchPeriod && (
        <PixelBorder
          borderColor={isLunchPeriod ? 'rgba(90,99,127, 0.8)' : '#f7e98e'}
          borderWidth={3}
          backgroundColor={isLunchPeriod ? '#f7e98e' : 'rgba(90,99,127, 0.8)'}
          innerPadding={0}
          style={{ marginBottom: 20 }}
        >
          <TouchableOpacity style={styles.backButtonInner} onPress={onBack}>
            <Text
              style={{
                fontFamily: 'PixeloidMono',
                color: isLunchPeriod ? 'rgba(90,99,127, 0.8)' : '#f7e98e',
              }}
            >
              ← Back
            </Text>
          </TouchableOpacity>
        </PixelBorder>
      )}
    </View>
  );
});

export default StudySubjectSelector;

const styles = StyleSheet.create({
  studyContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  studyHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alreadyStudiedText: {
    fontSize: 14,
    color: '#b8a9c9',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  subjectsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  subjectsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  subjectDayTimeButtonWrapper: {
    height: 80,
    width: 80,
    margin: 5,
  },
  subjectButtonWrapper: {
    height: 100,
    width: 100,
    margin: 5,
  },
  subjectButtonInner: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 6,
  },
  disabledSubjectButton: {
    opacity: 0.5,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  disabledIcon: {
    opacity: 0.5,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2a1845',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  disabledText: {
    color: '#666',
  },
  backButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: '#f7e98e',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: 'rgba(125,125,125,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
