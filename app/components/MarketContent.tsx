import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import GameHUD from './GameHUD';
import MarketActionButtons from './MarketActionButtons';
import MarketList from './MarketList';

interface MarketContentProps {
  candies: any[];
  localPricesUpdating: boolean;
  isFocused: boolean;
  isLunchPeriod: boolean;
  showLunchMinigames: boolean;
  hasPlayedLunchMinigame: boolean;
  period: number;
  day: number;
  periodsPerDay: number;
  onCandyPress: (index: number) => void;
  onLunchBack: () => void;
  onInventoryPress: () => void;
  onNextPeriod: () => void;
  onEndDay: () => void;
  flavorTextWrapper?: (children: React.ReactNode) => React.ReactNode;
  // Candy size unlock
  unlockButton?: { size: 'medium' | 'big'; cost: number } | null;
  onUnlock?: (size: 'medium' | 'big') => void;
  playerBalance?: number;
  // Tutorial refs
  walletRef?: React.RefObject<View | null>;
  piggyBankRef?: React.RefObject<View | null>;
  gummyBearsRef?: React.RefObject<View | null>;
  nextPeriodRef?: React.RefObject<View | null>;
  // Tutorial button visibility
  tutorialHideButtons?: boolean;
  tutorialHideEndDay?: boolean;
}

function MarketContent({
  candies,
  localPricesUpdating,
  isFocused,
  isLunchPeriod,
  showLunchMinigames,
  hasPlayedLunchMinigame,
  period,
  day,
  periodsPerDay,
  onCandyPress,
  onLunchBack,
  onInventoryPress,
  onNextPeriod,
  onEndDay,
  flavorTextWrapper,
  unlockButton,
  onUnlock,
  playerBalance,
  walletRef,
  piggyBankRef,
  gummyBearsRef,
  nextPeriodRef,
  tutorialHideButtons = false,
  tutorialHideEndDay = false,
}: MarketContentProps) {
  return (
    <ImageBackground
      source={require('../../assets/images/school.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.contentContainer}>
        <GameHUD
          onInventoryPress={onInventoryPress}
          flavorTextWrapper={flavorTextWrapper}
          showLunchMinigames={showLunchMinigames}
          walletRef={walletRef}
          piggyBankRef={piggyBankRef}
        />

        <View style={styles.listContainer}>
          <MarketList
            candies={candies}
            localPricesUpdating={localPricesUpdating}
            isFocused={isFocused}
            isLunchPeriod={isLunchPeriod}
            showLunchMinigames={showLunchMinigames}
            hasPlayedLunchMinigame={hasPlayedLunchMinigame}
            onCandyPress={onCandyPress}
            onLunchBack={onLunchBack}
            gummyBearsRef={gummyBearsRef}
            unlockButton={unlockButton}
            onUnlock={onUnlock}
            playerBalance={playerBalance}
          />
        </View>

        <View style={styles.buttonContainer}>
          <MarketActionButtons
            period={period}
            day={day}
            totalDays={5}
            periodsPerDay={periodsPerDay}
            showLunchMinigames={showLunchMinigames}
            onNextPeriod={onNextPeriod}
            onEndDay={onEndDay}
            nextPeriodRef={nextPeriodRef}
            tutorialHidden={tutorialHideButtons}
            hideEndDay={tutorialHideEndDay}
          />
        </View>
      </View>
    </ImageBackground>
  );
}

// Memoize to prevent unnecessary re-renders when parent state changes
export default React.memo(MarketContent);

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  buttonContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderTopWidth: 3,
    borderColor: '#d4a574',
    padding: 8,
    alignItems: 'center',
    minHeight: 80,
    flexShrink: 0,
  },
});
