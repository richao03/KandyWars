import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';

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

export default function LocationModal({ visible, onClose, onSelectLocation }: LocationModalProps) {
  const handleLocationSelect = (location: Location) => {
    onSelectLocation(location);
    onClose();
  };

  return (
    <Modal
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={200}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={200}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      style={styles.modalContainer}
    >
      <View style={styles.modal}>
        <Text style={styles.title}>Where do you want to go?</Text>
        
        <View style={styles.locationGrid}>
          {locations.map((location) => (
            <TouchableOpacity
              key={location}
              style={[
                styles.locationButton, 
                {
                  backgroundColor: locationColors[location].bg,
                  borderColor: locationColors[location].border
                }
              ]}
              onPress={() => handleLocationSelect(location)}
            >
              <Text style={styles.locationText}>
                {location.charAt(0).toUpperCase() + location.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: 'CrayonPastel',
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
    fontFamily: 'CrayonPastel',
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
});