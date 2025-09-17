import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import Modal from './ReanimatedModal';

type InventoryItem = {
  name: string;
  quantity: number;
  averagePrice: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  inventory: { [key: string]: InventoryItem };
  totalCount: number;
  capacity: number;
};

export default function InventoryModal({
  visible,
  onClose,
  inventory,
  totalCount,
  capacity,
}: Props) {
  const inventoryItems = Object.entries(inventory).filter(([_, item]) => item.quantity > 0);
  const totalValue = inventoryItems.reduce((sum, [_, item]) => {
    return sum + (item.quantity * item.averagePrice);
  }, 0);

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
        <View style={styles.header}>
          <Text style={styles.title}>🍬 Candy Stash 🍬</Text>
          <Text style={styles.capacityText}>
            {totalCount} / {capacity} items
          </Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {inventoryItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Your stash is empty!</Text>
              <Text style={styles.emptySubtext}>Buy some candy from the market</Text>
            </View>
          ) : (
            inventoryItems.map(([name, item]) => (
              <View key={name} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{name}</Text>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                </View>
                <View style={styles.itemValue}>
                  <Text style={styles.avgPrice}>
                    Avg: ${item.averagePrice.toFixed(2)}
                  </Text>
                  <Text style={styles.totalPrice}>
                    Total: ${(item.quantity * item.averagePrice).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {inventoryItems.length > 0 && (
          <View style={styles.footer}>
            <Text style={styles.totalValueLabel}>Total Stash Value:</Text>
            <Text style={styles.totalValueAmount}>${totalValue.toFixed(2)}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
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
    backgroundColor: '#fefaf5',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 3,
    borderColor: '#4a90e2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#4a90e2',
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4a90e2',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  capacityText: {
    fontSize: 16,
    color: '#6b4423',
    marginTop: 5,
    fontFamily: 'CrayonPastel',
  },
  scrollView: {
    maxHeight: 300,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#a0826d',
    marginTop: 5,
    fontFamily: 'CrayonPastel',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff9e6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#f4d03f',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
  itemQuantity: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#4ade80',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
  },
  itemValue: {
    alignItems: 'flex-end',
  },
  avgPrice: {
    fontSize: 12,
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#22c55e',
    fontFamily: 'CrayonPastel',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e6f4ff',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#4a90e2',
  },
  totalValueLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4a90e2',
    fontFamily: 'CrayonPastel',
  },
  totalValueAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4a90e2',
    fontFamily: 'CrayonPastel',
  },
  closeButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#357abd',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'CrayonPastel',
  },
});