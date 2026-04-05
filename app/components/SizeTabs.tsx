import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { CandySize } from '../../src/types/candy';
import { SoundEffects } from '../../src/utils/soundEffects';

interface SizeTab {
  key: CandySize;
  label: string;
}

interface SizeTabsProps {
  sizes: SizeTab[];
  selectedSize: CandySize;
  onSelect: (size: CandySize) => void;
}

const ICON_SIZES: Record<CandySize, number> = {
  small: 18,
  medium: 26,
  big: 34,
};

const candyIcon = require('../../assets/images/emojis/candy.png');

function SizeTabs({ sizes, selectedSize, onSelect }: SizeTabsProps) {
  return (
    <View style={styles.container}>
      {sizes.map((size) => {
        const isActive = selectedSize === size.key;
        const iconSize = ICON_SIZES[size.key];
        return (
          <TouchableOpacity
            key={size.key}
            onPress={() => {
              SoundEffects.playRandomPop();
              onSelect(size.key);
            }}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <Image
              source={candyIcon}
              style={[
                {
                  width: iconSize,
                  height: iconSize,
                },
                isActive && styles.selected,
              ]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default React.memo(SizeTabs);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  tab: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 4,
  },
});
