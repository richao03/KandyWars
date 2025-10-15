import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import CandyListItem, { CandyForMarket } from './CandyListItem';
import StudySubjectSelector from './StudySubjectSelector';

interface MarketListProps {
  candies: CandyForMarket[];
  localPricesUpdating: boolean;
  isFocused: boolean;
  isLunchPeriod: boolean;
  showLunchMinigames: boolean;
  hasPlayedLunchMinigame: boolean;
  onCandyPress: (index: number) => void;
  onLunchBack: () => void;
}

const MarketList = React.memo(function MarketList({
  candies,
  localPricesUpdating,
  isFocused,
  isLunchPeriod,
  showLunchMinigames,
  hasPlayedLunchMinigame,
  onCandyPress,
  onLunchBack,
}: MarketListProps) {
  const renderItem = useCallback(
    ({ item, index }: { item: CandyForMarket; index: number }) => (
      <CandyListItem
        item={item}
        index={index}
        localPricesUpdating={localPricesUpdating}
        onPress={onCandyPress}
      />
    ),
    [localPricesUpdating, onCandyPress]
  );

  return (
    <View style={styles.container}>
      {/* Only render StudySubjectSelector when tab is focused and conditions are met */}
      {console.log(
        '🎮 MarketList render - isFocused:',
        isFocused,
        'isLunchPeriod:',
        isLunchPeriod,
        'showLunchMinigames:',
        showLunchMinigames,
        'hasPlayedLunchMinigame:',
        hasPlayedLunchMinigame
      )}
      {isFocused && showLunchMinigames && (
        <View style={{ flex: 1 }}>
          <StudySubjectSelector
            onBack={onLunchBack}
            disabled={false}
            disabledMessage=""
            isLunchPeriod={true}
            hasPlayedLunchMinigame={hasPlayedLunchMinigame}
          />
        </View>
      )}

      {/* Always render FlatList to maintain consistent hook calls */}
      <View
        style={{
          display: showLunchMinigames ? 'none' : 'flex',
          flex: 1,
        }}
      >
        <FlatList
          data={candies}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={true}
          overScrollMode="never"
          renderItem={renderItem}
        />
      </View>
    </View>
  );
});

export default MarketList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
});
