import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import colors from '../../src/constants/colors';
import { useGame } from '../../src/hooks/useGame';
import { useJokers } from '../../src/hooks/useJokers';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import TextWithEmojis from './TextWithEmojis';

export type Location =
  | 'gym'
  | 'cafeteria'
  | 'home room'
  | 'library'
  | 'science lab'
  | 'school yard'
  | 'bathroom';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: Location) => void;
  gameData?: any; // Optional game data to check for upcoming events
}

const locations: Location[] = [
  'gym',
  'cafeteria',
  'home room',
  'library',
  'science lab',
  'school yard',
  'bathroom',
];

const locationColors: Record<Location, { bg: string; border: string }> = {
  gym: { bg: '#ffe6e6', border: '#ff6b6b' }, // Light red
  cafeteria: { bg: '#e6ffe6', border: '#51c451' }, // Light green
  'home room': { bg: '#e6f3ff', border: '#4da6ff' }, // Light blue
  library: { bg: '#f3e6ff', border: '#b366ff' }, // Light purple
  'science lab': { bg: '#ffffcc', border: '#ffff66' }, // Light yellow
  'school yard': { bg: '#e6ffcc', border: '#a3ff66' }, // Light lime
  bathroom: { bg: '#ffcc99', border: '#ff9933' }, // Light orange
};

const locationIcons: Record<Location, any> = {
  gym: require('../../assets/images/emojis/gym.png'),
  cafeteria: require('../../assets/images/emojis/cafeteria.png'),
  'home room': require('../../assets/images/emojis/homeroom.png'),
  library: require('../../assets/images/emojis/books.png'),
  'science lab': require('../../assets/images/emojis/lab.png'),
  'school yard': require('../../assets/images/emojis/recess.png'),
  bathroom: require('../../assets/images/emojis/bathroom.png'),
};

function LocationModal({
  visible,
  onClose,
  onSelectLocation,
  gameData,
}: LocationModalProps) {
  const { jokers } = useJokers();
  const { periodCount } = useGame();

  // Check if Map Maker joker is active (id: 53)
  const hasMapMaker = jokers.some((joker: any) => joker.id === 53);

  // Find locations with good and bad events in next period
  const eventLocations = React.useMemo(() => {
    if (!hasMapMaker || !gameData?.periodEvents) return { good: [], bad: [] };

    const goodEffects = ['FOUND_MONEY', 'PRICE_SPIKE'];
    const badEffects = ['LOSE_MONEY', 'STASH_LOCKED', 'PRICE_DROP'];
    // Note: periodCount is 0-indexed (0-39), event periods are 1-indexed (1-40)
    // For next period events, we need periodCount + 2
    const nextPeriod = periodCount + 2;

    const nextPeriodEvents = gameData.periodEvents.filter(
      (event: any) => event.period === nextPeriod && event.location
    );

    const good = nextPeriodEvents
      .filter((event: any) => goodEffects.includes(event.effect))
      .map((event: any) => event.location);

    const bad = nextPeriodEvents
      .filter((event: any) => badEffects.includes(event.effect))
      .map((event: any) => event.location);

    return { good, bad };
  }, [hasMapMaker, gameData, periodCount]);

  const handleLocationSelect = (location: Location) => {
    console.log('🟡 Location selected:', location);
    onSelectLocation(location);
    onClose();
  };

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="spring"
      backdropOpacity={0.5}
      modalStyle={styles.modal}
    >
      <Text style={styles.title}>Where to next?</Text>

      <View style={styles.locationGrid}>
        {locations.map((location) => {
          const hasGoodEvent = eventLocations.good.includes(location);
          const hasBadEvent = eventLocations.bad.includes(location);

          let borderColor = locationColors[location].border;
          let borderWidth = 3;

          return (
            <PressableButton
              key={location}
              onPress={() => handleLocationSelect(location)}
              shadowColor={borderColor}
              shadowOffset={{ width: 0, height: 3 }}
              shadowOpacity={0.4}
              shadowRadius={4}
              elevation={6}
              style={styles.locationButtonWrapper}
            >
              <PixelBorder
                borderColor={borderColor}
                borderWidth={borderWidth}
                backgroundColor={locationColors[location].bg}
                innerPadding={0}
              >
                <View style={styles.locationButton}>
                  <Image
                    source={locationIcons[location]}
                    style={styles.locationIcon}
                  />
                  {!hasGoodEvent && !hasBadEvent && (
                    <TextWithEmojis style={styles.locationText}>
                      {location.charAt(0).toUpperCase() + location.slice(1)}
                    </TextWithEmojis>
                  )}
                  {hasGoodEvent && (
                    <TextWithEmojis style={styles.goodEventText} imageSize={24}>
                      {location.charAt(0).toUpperCase() + location.slice(1)}
                    </TextWithEmojis>
                  )}
                  {hasBadEvent && (
                    <TextWithEmojis style={styles.badEventText} imageSize={24}>
                      {location.charAt(0).toUpperCase() + location.slice(1)}
                    </TextWithEmojis>
                  )}
                </View>
              </PixelBorder>
            </PressableButton>
          );
        })}
      </View>

      <PressableButton
        onPress={onClose}
        shadowColor="#666"
        shadowOffset={{ width: 0, height: 3 }}
        shadowOpacity={0.3}
        shadowRadius={4}
        elevation={5}
        style={styles.cancelButtonWrapper}
      >
        <PixelBorder
          borderColor="#999"
          borderWidth={2}
          backgroundColor="#f0f0f0"
          innerPadding={0}
        >
          <View style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </View>
        </PixelBorder>
      </PressableButton>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    justifyContent: 'center',
    margin: 20,
  },
  modal: {
    backgroundColor: '#fefaf5', // Warm paper background
    borderRadius: 24,
    padding: 24,
    maxWidth: 380,
    alignSelf: 'center',
    width: '100%',
    borderWidth: 3,
    borderColor: '#d4a574', // Brown crayon border
    shadowColor: colors.brown.secondary,
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: colors.brown.primary, // Dark brown
    textShadow: '1px 1px 0px #e6d4b7',
    fontFamily: 'PixeloidMono',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  locationButtonWrapper: {
    width: '45%',
    marginBottom: 8,
  },
  locationButton: {
    padding: 8,
    alignItems: 'center',
    gap: 0,
  },
  locationIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    color: '#5d4e37', // Dark brown
    fontFamily: 'PixeloidMono',
  },
  cancelButtonWrapper: {
    marginTop: 12,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray.medium,
    fontFamily: 'PixeloidMono',
  },
  highlightedLocation: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  goodEventText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.gold.medium,
    fontFamily: 'PixeloidMono',
    textShadowColor: colors.black,
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  badEventText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FF0000',
    fontFamily: 'PixeloidMono',
    textShadowColor: colors.black,
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
});

export default React.memo(LocationModal);
