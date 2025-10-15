import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import GameHUD from './GameHUD';
import MarketActionButtons from './MarketActionButtons';
import MarketList from './MarketList';

const CopilotView = walkthroughable(View);

interface MarketWithCopilotProps {
  candies: any[];
  localPricesUpdating: boolean;
  isFocused: boolean;
  isLunchPeriod: boolean;
  showLunchMinigames: boolean;
  hasPlayedLunchMinigame: boolean;
  isTransactionModalOpening: boolean;
  selectedCandyIndex: number | null;
  period: number;
  day: number;
  onCandyPress: (index: number) => void;
  onLunchBack: () => void;
  onInventoryPress: () => void;
  onNextPeriod: () => void;
  onEndDay: () => void;
}

export default function MarketWithCopilot({
  candies,
  localPricesUpdating,
  isFocused,
  isLunchPeriod,
  showLunchMinigames,
  hasPlayedLunchMinigame,
  isTransactionModalOpening,
  selectedCandyIndex,
  period,
  day,
  onCandyPress,
  onLunchBack,
  onInventoryPress,
  onNextPeriod,
  onEndDay,
}: MarketWithCopilotProps) {
  return (
    <ImageBackground
      source={require('../../assets/images/school.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.contentContainer}>
        {/* Step 1: HUD */}
        <CopilotStep
          text={`Welcome to Candy Wars! Here is your HUD:
• You can see your cash on hand
• Savings in your piggy bank
• Current inventory count`}
          order={1}
          name="market_hud"
        >
          <CopilotView>
            <GameHUD
              isModalOpening={isTransactionModalOpening}
              isModalOpen={selectedCandyIndex !== null}
              onInventoryPress={onInventoryPress}
              flavorTextWrapper={(children) => (
                <CopilotStep
                  text={`Keep an eye on the rumor mill, it can:
• Hint at the next special event
• Provide useful tips
`}
                  order={2}
                  name="market_rumor_mill"
                >
                  <CopilotView>{children}</CopilotView>
                </CopilotStep>
              )}
            />
          </CopilotView>
        </CopilotStep>

        {/* Step 3: Market List */}
        <CopilotStep
          text={`Heres the current candy market:
• Click on a candy to buy or sell
• Candy prices change every period
`}
          order={3}
          name="market_list"
        >
          <CopilotView style={styles.listContainer}>
            <MarketList
              candies={candies}
              localPricesUpdating={localPricesUpdating}
              isFocused={isFocused}
              isLunchPeriod={isLunchPeriod}
              showLunchMinigames={showLunchMinigames}
              hasPlayedLunchMinigame={hasPlayedLunchMinigame}
              onCandyPress={onCandyPress}
              onLunchBack={onLunchBack}
            />
          </CopilotView>
        </CopilotStep>

        {/* Step 4: Action Buttons */}
        <CopilotStep
          text="Use these buttons to advance periods or end the day to skip straight to after school!"
          order={4}
          name="market_buttons"
        >
          <CopilotView style={styles.buttonContainer}>
            <MarketActionButtons
              period={period}
              day={day}
              totalDays={5}
              showLunchMinigames={showLunchMinigames}
              onNextPeriod={onNextPeriod}
              onEndDay={onEndDay}
            />
          </CopilotView>
        </CopilotStep>
      </View>
    </ImageBackground>
  );
}

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
    paddingTop: 4,
    alignItems: 'center',
    minHeight: 80,
    flexShrink: 0,
  },
});
