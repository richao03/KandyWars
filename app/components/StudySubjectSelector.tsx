import colors from '@/src/constants/colors';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../../src/hooks/useGame';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

const subjects = [
  {
    name: 'Math',
    color: { bg: '#e6f7ff', border: '#1890ff' },
    icon: require('../../assets/images/emojis/math.png'),
  },
  {
    name: 'Gym',
    color: { bg: '#e6f2ff', border: '#4169e1' },
    icon: require('../../assets/images/emojis/gym.png'),
  },
  {
    name: 'Cooking',
    color: { bg: '#f6ffed', border: '#52c41a' },
    icon: require('../../assets/images/emojis/cooking.png'),
  },
  {
    name: 'Economy',
    color: { bg: '#fff1f0', border: '#f5222d' },
    icon: require('../../assets/images/emojis/economy.png'),
  },
  {
    name: 'Logic',
    color: { bg: '#f9f0ff', border: '#722ed1' },
    icon: require('../../assets/images/emojis/logic.png'),
  },
  {
    name: 'Playground',
    color: { bg: '#fff0f6', border: '#eb2f96' },
    icon: require('../../assets/images/emojis/recess.png'),
  },
  {
    name: 'Comp Sci',
    color: { bg: '#f0f5ff', border: '#2f54eb' },
    icon: require('../../assets/images/emojis/computer.png'),
  },
  {
    name: 'Art',
    color: { bg: '#feffe6', border: '#a0d911' },
    icon: require('../../assets/images/emojis/art.png'),
  },
  {
    name: 'Geography',
    color: { bg: '#e6f3ff', border: '#3182ce' },
    icon: require('../../assets/images/emojis/geography.png'),
  },
];

interface StudySubjectSelectorProps {
  onBack: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  isLunchPeriod?: boolean;
  hasPlayedLunchMinigame?: boolean;
}

const StudySubjectSelector = React.memo(function StudySubjectSelector({
  onBack,
  disabled = false,
  disabledMessage = "You've already studied tonight! Rest up for tomorrow.",
  isLunchPeriod = false,
  hasPlayedLunchMinigame = false,
}: StudySubjectSelectorProps) {
  console.log(
    '🎮 StudySubjectSelector rendering - isLunchPeriod:',
    isLunchPeriod
  );

  const { period, markLunchMinigamePlayed, setMinigameContext } = useGame();

  console.log('🎮 StudySubjectSelector after useGame - period:', period);

  const handleSubjectSelect = (subject: string) => {
    // During lunch, check if a game has already been played
    if (disabled || (isLunchPeriod && hasPlayedLunchMinigame)) {
      return;
    }

    console.log(`Starting ${subject} minigame...`);

    // Set the context for where this minigame was started
    setMinigameContext(isLunchPeriod ? 'lunch' : 'after-school');

    // Don't mark as played yet - only mark when they complete the game
    // This allows them to return to the minigame selection view after finishing

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
      case 'Playground':
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

  // Calculate if buttons should be disabled
  const buttonsDisabled = disabled || (isLunchPeriod && hasPlayedLunchMinigame);
  const displayMessage =
    isLunchPeriod && hasPlayedLunchMinigame
      ? 'Game Complete!'
      : disabledMessage;

  return (
    <View style={styles.studyContainer}>
      <View style={styles.studyHeader}>
        {buttonsDisabled && isLunchPeriod && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.alreadyStudiedText}>{displayMessage}</Text>
          </View>
        )}
      </View>

      <View style={styles.subjectsContainer}>
        {/* First Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(0, 3).map((subject) => (
            <PressableButton
              key={subject.name}
              onPress={() => handleSubjectSelect(subject.name)}
              disabled={buttonsDisabled}
              shadowColor={subject.color.border}
              shadowOffset={{ width: 0, height: 3 }}
              shadowOpacity={0.4}
              shadowRadius={4}
              elevation={6}
              style={
                isLunchPeriod
                  ? styles.subjectDayTimeButtonWrapper
                  : styles.subjectButtonWrapper
              }
            >
              <PixelBorder
                borderColor={subject.color.border}
                borderWidth={3}
                backgroundColor={subject.color.bg}
                innerPadding={0}
              >
                <View
                  style={[
                    styles.subjectButtonInner,
                    buttonsDisabled && styles.disabledSubjectButton,
                  ]}
                >
                  <Image
                    source={subject.icon}
                    style={[
                      styles.subjectIcon,
                      buttonsDisabled && styles.disabledIcon,
                    ]}
                  />
                  <Text
                    style={[
                      styles.subjectText,
                      buttonsDisabled && styles.disabledText,
                    ]}
                  >
                    {subject.name}
                  </Text>
                </View>
              </PixelBorder>
            </PressableButton>
          ))}
        </View>

        {/* Second Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(3, 6).map((subject) => (
            <PressableButton
              key={subject.name}
              onPress={() => handleSubjectSelect(subject.name)}
              disabled={buttonsDisabled}
              shadowColor={subject.color.border}
              shadowOffset={{ width: 0, height: 3 }}
              shadowOpacity={0.4}
              shadowRadius={4}
              elevation={6}
              style={
                isLunchPeriod
                  ? styles.subjectDayTimeButtonWrapper
                  : styles.subjectButtonWrapper
              }
            >
              <PixelBorder
                borderColor={subject.color.border}
                borderWidth={3}
                backgroundColor={subject.color.bg}
                innerPadding={0}
              >
                <View
                  style={[
                    styles.subjectButtonInner,
                    buttonsDisabled && styles.disabledSubjectButton,
                  ]}
                >
                  <Image
                    source={subject.icon}
                    style={[
                      styles.subjectIcon,
                      buttonsDisabled && styles.disabledIcon,
                    ]}
                  />
                  <Text
                    style={[
                      styles.subjectText,
                      buttonsDisabled && styles.disabledText,
                    ]}
                  >
                    {subject.name}
                  </Text>
                </View>
              </PixelBorder>
            </PressableButton>
          ))}
        </View>

        {/* Third Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(6, 9).map((subject) => (
            <PressableButton
              key={subject.name}
              onPress={() => handleSubjectSelect(subject.name)}
              disabled={buttonsDisabled}
              shadowColor={subject.color.border}
              shadowOffset={{ width: 0, height: 3 }}
              shadowOpacity={0.4}
              shadowRadius={4}
              elevation={6}
              style={
                isLunchPeriod
                  ? styles.subjectDayTimeButtonWrapper
                  : styles.subjectButtonWrapper
              }
            >
              <PixelBorder
                borderColor={subject.color.border}
                borderWidth={3}
                backgroundColor={subject.color.bg}
                innerPadding={0}
              >
                <View
                  style={[
                    styles.subjectButtonInner,
                    buttonsDisabled && styles.disabledSubjectButton,
                  ]}
                >
                  <Image
                    source={subject.icon}
                    style={[
                      styles.subjectIcon,
                      buttonsDisabled && styles.disabledIcon,
                    ]}
                  />
                  <Text
                    style={[
                      styles.subjectText,
                      buttonsDisabled && styles.disabledText,
                    ]}
                  >
                    {subject.name}
                  </Text>
                </View>
              </PixelBorder>
            </PressableButton>
          ))}
        </View>
      </View>

      {!isLunchPeriod && (
        <PressableButton
          onPress={onBack}
          shadowColor="rgba(185,28,28,1)"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.5}
          shadowRadius={5}
          elevation={8}
          style={{ marginBottom: 20, width: '100%' }}
        >
          <PixelBorder
            borderColor="rgba(185,28,28,1)"
            borderWidth={3}
            backgroundColor="rgba(239,68,68,1)"
            innerPadding={0}
          >
            <View style={styles.backButtonInner}>
              <Text style={styles.backButtonText}>Back</Text>
            </View>
          </PixelBorder>
        </PressableButton>
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
    marginBottom: 4,
    borderRadius: 3,
    borderWidth: 3,
    borderColor: colors.gold.light,
    padding: 4,
    marginTop: 4,
    backgroundColor: 'white',
  },
  alreadyStudiedText: {
    color: colors.brown.primary,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: 'rgba(125,125,125,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
    height: 100,
    width: 100,
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
    paddingHorizontal: 30,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: 'rgba(125,125,125,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
