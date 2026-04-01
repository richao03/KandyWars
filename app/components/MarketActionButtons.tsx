import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import colors from '../../src/constants/colors';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import TextWithEmojis from './TextWithEmojis';

interface MarketActionButtonsProps {
  period: number;
  day: number;
  totalDays: number;
  periodsPerDay: number;
  showLunchMinigames: boolean;
  onNextPeriod: () => void;
  onEndDay: () => void;
  isNextPeriodEnabled?: boolean;
  nextPeriodRef?: React.RefObject<View | null>;
  tutorialHidden?: boolean;
  hideEndDay?: boolean;
}

const MarketActionButtons = React.memo(function MarketActionButtons({
  period,
  day,
  totalDays,
  periodsPerDay,
  showLunchMinigames,
  onNextPeriod,
  onEndDay,
  isNextPeriodEnabled = true,
  nextPeriodRef,
  tutorialHidden = false,
  hideEndDay = false,
}: MarketActionButtonsProps) {
  // During tutorial, hide all buttons
  if (tutorialHidden) return null;
  // Calculate lunch period dynamically (period 3 for 6-period days, period 4 for 8-period days)
  const lunchPeriod = Math.floor(periodsPerDay / 2);
  const isGoToLunch = period === lunchPeriod && !showLunchMinigames;
  const isLastDay = day === totalDays;
  const isLastPeriod = period === periodsPerDay;

  if (isLastDay && isLastPeriod) {
    // Last day, last period - show only end game button
    return (
      <View style={styles.container}>
        <PixelBorder
          borderColor="rgba(123,169,101,1)"
          borderWidth={3}
          backgroundColor="rgba(154,193,118,1)"
          innerPadding={0}
        >
          <PressableButton
            onPress={onNextPeriod}
            shadowColor="rgba(123,169,101,1)"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.5}
            shadowRadius={5}
            elevation={8}
            disabled={!isNextPeriodEnabled}
          >
            <View style={styles.pixelButtonInner}>
              <TextWithEmojis
                style={styles.nextPeriodButtonText}
                imageSize={28}
              >
                🏆 End Game
              </TextWithEmojis>
              <TextWithEmojis style={styles.nextPeriodSubtext}>
                See your final results!
              </TextWithEmojis>
            </View>
          </PressableButton>
        </PixelBorder>
      </View>
    );
  }

  if (isLastPeriod) {
    // Last period - show only leave school button
    return (
      <View style={styles.container}>
        <PressableButton
          onPress={onNextPeriod}
          shadowColor="rgba(123,169,101,1)"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.5}
          shadowRadius={5}
          elevation={8}
          disabled={!isNextPeriodEnabled}
        >
          <PixelBorder
            borderColor="rgba(123,169,101,1)"
            borderWidth={3}
            backgroundColor="rgba(154,193,118,1)"
            innerPadding={0}
          >
            <View style={styles.pixelButtonInner}>
              <Text style={styles.nextPeriodButtonText}>
                Leave School for the Day
              </Text>
              <Text style={styles.nextPeriodSubtext}>Time to head home!</Text>
            </View>
          </PixelBorder>
        </PressableButton>
      </View>
    );
  }

  // All other periods: Show both next period and end day buttons
  return (
    <View style={styles.buttonRow}>
      <View ref={nextPeriodRef} collapsable={false} style={styles.bigButton}>
      <PressableButton
        onPress={onNextPeriod}
        shadowColor={isGoToLunch ? 'rgba(59,130,246,1)' : 'rgba(123,169,101,1)'}
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.5}
        shadowRadius={5}
        elevation={8}
        disabled={!isNextPeriodEnabled}
      >
        <PixelBorder
          borderColor={
            isGoToLunch ? 'rgba(59,130,246,1)' : 'rgba(123,169,101,1)'
          }
          borderWidth={3}
          backgroundColor={
            isGoToLunch ? 'rgba(96,165,250,1)' : 'rgba(154,193,118,1)'
          }
          innerPadding={0}
        >
          <View
            style={[
              styles.pixelButtonInner,
              isGoToLunch && styles.pixelButtonInnerRow,
            ]}
          >
            {isGoToLunch && (
              <Image
                source={require('../../assets/images/emojis/cafeteria.png')}
                style={styles.buttonIcon}
              />
            )}
            <View style={styles.buttonTextRow}>
              <Text style={styles.nextPeriodButtonText}>
                {isGoToLunch ? 'Go to Lunch' : 'Next Period'}
              </Text>
              <Text style={styles.nextPeriodSubtext}>
                {isGoToLunch
                  ? 'Time for a break'
                  : `Going to period ${period + 1}`}
              </Text>
            </View>
          </View>
        </PixelBorder>
      </PressableButton>
      </View>

      {!hideEndDay && (
        <PressableButton
          onPress={onEndDay}
          shadowColor="rgba(185,28,28,1)"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.5}
          shadowRadius={5}
          elevation={8}
          style={styles.smallButton}
        >
          <PixelBorder
            borderColor="rgba(185,28,28,1)"
            borderWidth={3}
            backgroundColor="rgba(239,68,68,1)"
            innerPadding={0}
          >
            <View style={[styles.pixelButtonInner, styles.endDayButtonInner]}>
              <Text style={styles.endDayButtonText}>End Day</Text>
              <Text style={styles.endDaySubtext}>Skip to after school</Text>
            </View>
          </PixelBorder>
        </PressableButton>
      )}
    </View>
  );
});

export default MarketActionButtons;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  bigButton: {
    flex: 2,
  },
  smallButton: {
    flex: 1,
  },
  pixelButtonInner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minHeight: 50,
  },
  pixelButtonInnerRow: {
    flexDirection: 'row',
  },
  buttonIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    marginRight: 8,
  },
  buttonTextRow: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  endDayButtonInner: {
    minHeight: 50,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  nextPeriodButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: '#166534',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  nextPeriodSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f0fdf4',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 1,
    opacity: 0.9,
  },
  endDayButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: colors.red.dark,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  endDaySubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fef2f2',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginTop: 1,
    opacity: 0.9,
  },
});
