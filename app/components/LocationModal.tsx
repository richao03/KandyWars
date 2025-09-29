import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FastModal from './FastModal';
import { useJokers } from '../../src/hooks/useJokers';
import { useGame } from '../../src/hooks/useGame';

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
  'bathroom'
];

const locationColors: Record<Location, {bg: string, border: string}> = {
  'gym': {bg: '#ffe6e6', border: '#ff6b6b'}, // Light red
  'cafeteria': {bg: '#e6ffe6', border: '#51c451'}, // Light green
  'home room': {bg: '#e6f3ff', border: '#4da6ff'}, // Light blue
  'library': {bg: '#f3e6ff', border: '#b366ff'}, // Light purple
  'science lab': {bg: '#ffffcc', border: '#ffff66'}, // Light yellow
  'school yard': {bg: '#e6ffcc', border: '#a3ff66'}, // Light lime
  'bathroom': {bg: '#ffcc99', border: '#ff9933'}, // Light orange
};

export default function LocationModal({ visible, onClose, onSelectLocation, gameData }: LocationModalProps) {
  const { jokers } = useJokers();
  const { periodCount } = useGame();

  React.useEffect(() => {
    console.log('🟡 LocationModal - visible prop changed to:', visible);
  }, [visible]);

  // Check if Map Maker joker is active (id: 41)
  const hasMapMaker = jokers.some((joker: any) => joker.id === 41);

  // Find locations with good events in next period
  const goodEventLocations = React.useMemo(() => {
    if (!hasMapMaker || !gameData?.periodEvents) return [];

    const goodEffects = ['FOUND_MONEY', 'PRICE_SPIKE'];
    const nextPeriod = periodCount + 1;

    return gameData.periodEvents
      .filter((event: any) =>
        event.period === nextPeriod &&
        goodEffects.includes(event.effect)
      )
      .map((event: any) => event.location);
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
      <Text style={styles.title}>Where do you want to go?</Text>

      <View style={styles.locationGrid}>
        {locations.map((location) => {
          const hasGoodEvent = goodEventLocations.includes(location);
          return (
            <TouchableOpacity
              key={location}
              style={[
                styles.locationButton,
                {
                  backgroundColor: locationColors[location].bg,
                  borderColor: hasGoodEvent ? '#FFD700' : locationColors[location].border,
                  borderWidth: hasGoodEvent ? 4 : 3,
                },
                hasGoodEvent && styles.highlightedLocation
              ]}
              onPress={() => handleLocationSelect(location)}
            >
              <Text style={styles.locationText}>
                {location.charAt(0).toUpperCase() + location.slice(1)}
              </Text>
              {hasGoodEvent && (
                <Text style={styles.highlightText}>✨ Good Event!</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
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
    shadowColor: '#8b4513',
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
    color: '#6b4423', // Dark brown
    textShadow: '1px 1px 0px #e6d4b7',
    fontFamily: 'PixeloidMono',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  locationButton: {
    width: '45%',
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    color: '#5d4e37', // Dark brown
    fontFamily: 'PixeloidMono',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  highlightedLocation: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  highlightText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
    marginTop: 4,
    fontFamily: 'PixeloidMono',
    textShadowColor: '#000',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
});