import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import { Candy } from '../../utils/generateCandyPriceTable';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, mode: 'buy' | 'sell') => void;
  maxBuyQuantity: number;
  maxSellQuantity: number;
  candy: Candy & { cost: number; quantityOwned: number; averagePrice: number | null };
};

export default function TransactionModal({
  visible,
  onClose,
  onConfirm,
  maxBuyQuantity,
  maxSellQuantity,
  candy,
}: Props) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);

  const maxQuantity = mode === 'buy' ? maxBuyQuantity : maxSellQuantity;

  const handleConfirm = () => {
    if (quantity > 0 && quantity <= maxQuantity) {
      onConfirm(quantity, mode);
    }
  };

  const changeMode = (newMode: 'buy' | 'sell') => {
    setMode(newMode);
    setQuantity(1);
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
      style={styles.modal}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{candy.name}</Text>
        <Text>Current Price: ${candy.cost.toFixed(2)}</Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, mode === 'buy' && styles.activeTab]}
            onPress={() => changeMode('buy')}
          >
            <Text style={styles.tabText}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'sell' && styles.activeTab]}
            onPress={() => changeMode('sell')}
          >
            <Text style={styles.tabText}>Sell</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.quantityLabel}>
          Quantity: {quantity} / {maxQuantity}
        </Text>
        <Slider
          style={{ width: '100%' }}
          minimumValue={0}
          maximumValue={maxQuantity}
          step={1}
          value={quantity}
          onValueChange={(val) => setQuantity(val)}
          minimumTrackTintColor="#4caf50"
          maximumTrackTintColor="#ccc"
        />

        <View style={styles.buttonRow}>
          <Button title="Cancel" onPress={onClose} />
          <Button title={`Confirm ${mode}`} onPress={handleConfirm} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    margin: 20,
  },
  container: {
    backgroundColor: '#fefaf5', // Warm paper background
    borderRadius: 20,
    padding: 24,
    alignItems: 'stretch',
    borderWidth: 3,
    borderColor: '#d4a574', // Brown crayon border
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#6b4423', // Dark brown
    textShadow: '1px 1px 0px #e6d4b7',
    fontFamily: 'CrayonPastel',
  },
  quantityLabel: {
    marginTop: 20,
    fontSize: 17,
    fontWeight: '600',
    alignSelf: 'center',
    color: '#8b4513',
    backgroundColor: '#fff9e6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f4d03f',
  },
  buttonRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
    justifyContent: 'center',
    gap: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#cc7a00',
    backgroundColor: '#fff',
  },
  activeTab: {
    backgroundColor: '#ffcc99', // Orange crayon
    borderColor: '#cc7a00',
  },
  tabText: {
    color: '#8b4513',
    fontWeight: '700',
    fontSize: 16,
  },
});
