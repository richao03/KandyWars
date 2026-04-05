import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import CandyListItem, { CandyForMarket } from './CandyListItem';
import StudySubjectSelector from './StudySubjectSelector';
import UnlockCandyRow from './UnlockCandyRow';

interface UnlockButtonInfo {
  size: 'medium' | 'big';
  cost: number;
}

interface MarketListProps {
  candies: CandyForMarket[];
  localPricesUpdating: boolean;
  isFocused: boolean;
  isLunchPeriod: boolean;
  showLunchMinigames: boolean;
  hasPlayedLunchMinigame: boolean;
  onCandyPress: (index: number) => void;
  onLunchBack: () => void;
  unlockButton?: UnlockButtonInfo | null;
  onUnlock?: (size: 'medium' | 'big') => void;
  playerBalance?: number;
  onGummyBearsLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
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
  unlockButton,
  onUnlock,
  playerBalance,
  onGummyBearsLayout,
}: MarketListProps) {
  const renderItem = useCallback(
    ({ item, index }: { item: CandyForMarket; index: number }) => (
      <CandyListItem
        item={item}
        index={index}
        localPricesUpdating={localPricesUpdating}
        onPress={onCandyPress}
        onItemLayout={item.name === 'Gummy Bears' ? onGummyBearsLayout : undefined}
      />
    ),
    [localPricesUpdating, onCandyPress, onGummyBearsLayout]
  );

  return (
    <View style={styles.container}>
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

      <View style={{ display: showLunchMinigames ? 'none' : 'flex', flex: 1 }}>
        <FlatList
          data={candies}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={true}
          overScrollMode="never"
          renderItem={renderItem}
          ListFooterComponent={unlockButton ? (
            <UnlockCandyRow
              size={unlockButton.size}
              cost={unlockButton.cost}
              canAfford={(playerBalance ?? 0) >= unlockButton.cost}
              onPress={() => onUnlock?.(unlockButton.size)}
            />
          ) : null}
        />
      </View>
    </View>
  );
});

export default MarketList;

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, flexGrow: 1 },
});
