import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import {
  Button,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quantityLabel: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '500',
    alignSelf: 'center',
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
  },
  tab: {
    padding: 10,
    marginHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#888',
  },
  activeTab: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  tabText: {
    color: 'black',
    fontWeight: 'bold',
  },
});
