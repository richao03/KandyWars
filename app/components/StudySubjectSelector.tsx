import colors from '@/src/constants/colors';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../../src/hooks/useGame';
import { useJokers } from '../../src/hooks/useJokers';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

// Map subject names to joker subjects
const subjectToJokerSubject: Record<string, string> = {
  Math: 'Math',
  Gym: 'Gym',
  Cooking: 'Home Economics',
  Economy: 'Economy',
  Logic: 'Logic',
  Recess: 'Recess',
  'Comp Sci': 'Computer',
  Art: 'Art',
  Geography: 'Geography',
};

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
    name: 'Recess',
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
  const { jokersOwned } = useJokers();

  console.log('🎮 StudySubjectSelector after useGame - period:', period);

  // Calculate unobtained jokers for each subject
  const getUnobtainedJokerCount = React.useCallback(
    (subjectName: string) => {
      const jokerSubject = subjectToJokerSubject[subjectName];
      if (!jokerSubject) return 0;

      // Get all jokers for this subject
      const subjectJokers = STANDARDIZED_JOKERS.filter(
        (j) => j.subject === jokerSubject
      );

      // Get IDs of owned jokers
      const ownedIds = new Set(jokersOwned.map((j) => j.id.toString()));

      // Count unobtained jokers
      const unobtained = subjectJokers.filter(
        (j) => !ownedIds.has(j.id.toString())
      );

      return unobtained.length;
    },
    [jokersOwned]
  );

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

  // Calculate if buttons should be disabled
  const buttonsDisabled = disabled || (isLunchPeriod && hasPlayedLunchMinigame);
  const displayMessage =
    isLunchPeriod && hasPlayedLunchMinigame
      ? 'Game Complete!'
      : disabledMessage;

  return (
    <View style={styles.studyContainer}>
      {buttonsDisabled && isLunchPeriod && (
        <View style={styles.studyHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.alreadyStudiedText}>{displayMessage}</Text>
          </View>
        </View>
      )}

      <View style={styles.subjectsContainer}>
          {/* First Row - 3 subjects */}
          <View style={styles.subjectsRow}>
          {subjects.slice(0, 3).map((subject) => (
            <PressableButton
              key={subject.name}
              onPress={() => handleSubjectSelect(subject.name)}
              disabled={buttonsDisabled}
              shadowColor={subject.color.border}
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={6}
              elevation={8}
              style={
                isLunchPeriod
                  ? styles.subjectDayTimeButtonWrapper
                  : styles.subjectButtonWrapper
              }
            >
              <View style={styles.subjectContainer}>
                <Image
                  source={subject.icon}
                  style={[
                    styles.subjectIcon,
                    buttonsDisabled && styles.disabledIcon,
                  ]}
                />
                <View style={styles.subjectBorderWrapper}>
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
                      <Text
                        style={[
                          styles.subjectText,
                          buttonsDisabled && styles.disabledText,
                        ]}
                      >
                        {subject.name}
                      </Text>
                      <Text
                        style={[
                          styles.jokerCount,
                          buttonsDisabled && styles.disabledText,
                        ]}
                      >
                        {getUnobtainedJokerCount(subject.name)} jokers left
                      </Text>
                    </View>
                  </PixelBorder>
                </View>
              </View>
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
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={6}
              elevation={8}
              style={
                isLunchPeriod
                  ? styles.subjectDayTimeButtonWrapper
                  : styles.subjectButtonWrapper
              }
            >
              <View style={styles.subjectContainer}>
                <Image
                  source={subject.icon}
                  style={[
                    styles.subjectIcon,
                    buttonsDisabled && styles.disabledIcon,
                  ]}
                />
                <View style={styles.subjectBorderWrapper}>
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
                      <Text
                        style={[
                          styles.subjectText,
                          buttonsDisabled && styles.disabledText,
                        ]}
                      >
                        {subject.name}
                      </Text>
                      <Text
                        style={[
                          styles.jokerCount,
                          buttonsDisabled && styles.disabledText,
                        ]}
                      >
                        {getUnobtainedJokerCount(subject.name)} jokers left
                      </Text>
                    </View>
                  </PixelBorder>
                </View>
              </View>
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
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={6}
              elevation={8}
              style={
                isLunchPeriod
                  ? styles.subjectDayTimeButtonWrapper
                  : styles.subjectButtonWrapper
              }
            >
              <View style={styles.subjectContainer}>
                <Image
                  source={subject.icon}
                  style={[
                    styles.subjectIcon,
                    buttonsDisabled && styles.disabledIcon,
                  ]}
                />
                <View style={styles.subjectBorderWrapper}>
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
                      <Text
                        style={[
                          styles.subjectText,
                          buttonsDisabled && styles.disabledText,
                        ]}
                      >
                        {subject.name}
                      </Text>
                      <Text
                        style={[
                          styles.jokerCount,
                          buttonsDisabled && styles.disabledText,
                        ]}
                      >
                        {getUnobtainedJokerCount(subject.name)} jokers left
                      </Text>
                    </View>
                  </PixelBorder>
                </View>
              </View>
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
          style={{ marginBottom: 20, width: '90%', alignSelf: 'center' }}
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
    gap: 15,
    paddingHorizontal: 20,
  },
  subjectsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  subjectDayTimeButtonWrapper: {
    flex: 1,
    aspectRatio: 1,
  },
  subjectButtonWrapper: {
    flex: 1,
    aspectRatio: 1,
  },
  subjectContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  disabledIcon: {
    opacity: 0.5,
  },
  subjectBorderWrapper: {
    width: '90%',
    marginTop: 25, // Position below the icon
  },
  subjectButtonInner: {
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 36, // Space for the icon overlap
    paddingBottom: 18,
    paddingHorizontal: 12,
  },
  disabledSubjectButton: {
    opacity: 0.5,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    width: '100%',
  },
  jokerCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 8,
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
