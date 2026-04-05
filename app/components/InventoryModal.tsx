import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from 'react-native';
import { formatCurrency } from '../../src/utils/priceUtils';
import FastModal from './FastModal';
import TextWithEmojis from './TextWithEmojis';

type CandyType = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  inventory: CandyType[];
  totalCount: number;
  capacity: number;
};

function InventoryModal({
  visible,
  onClose,
  inventory,
  totalCount,
  capacity,
}: Props) {
  const inventoryItems = inventory.filter((item) => (item.quantity || 0) > 0);

  const totalValue = inventoryItems.reduce((sum, item) => {
    return sum + (item.quantity || 0) * item.price;
  }, 0);

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="spring"
      backdropOpacity={0.6}
      modalStyle={styles.modal}
    >
      <View style={styles.titleContainer}>
        <TextWithEmojis style={styles.title} imageSize={50}>
          🍬
        </TextWithEmojis>
      </View>
      <TextWithEmojis style={styles.title} imageSize={30}>
        Candy Stash
      </TextWithEmojis>
      <Text style={styles.subtitle}>
        {totalCount} / {capacity} items in your stash
      </Text>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {inventoryItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your stash is empty!</Text>
            <Text style={styles.emptySubtext}>
              Buy some candy from the market
            </Text>
          </View>
        ) : (
          <View style={styles.itemsContainer}>
            {inventoryItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.quantityBadge}>
                  <Text style={styles.itemQuantity}>x{item.quantity || 0}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {inventoryItems.length > 0 && (
        <View style={styles.totalRow}>
          <TextWithEmojis style={styles.totalLabel}>
            Total Stash Value:
          </TextWithEmojis>
          <Text style={styles.totalValue}>${formatCurrency(totalValue)}</Text>
        </View>
      )}

      <TouchableHighlight
        style={styles.closeButton}
        onPress={onClose}
        underlayColor="rgba(53,122,189,1)"
      >
        <Text style={styles.closeButtonText}> Close</Text>
      </TouchableHighlight>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    margin: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fefaf5',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#4a90e2',
    shadowColor: '#4a90e2',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#4a90e2',
    fontFamily: 'PixeloidMono',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: 'PixeloidMono',
  },
  scrollView: {
    maxHeight: 300,
  },
  itemsContainer: {
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#a0826d',
    marginTop: 8,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e6d4b7',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#6b4423',
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
  },
  quantityBadge: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  itemQuantity: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PixeloidMono',
  },
  itemValue: {
    alignItems: 'flex-end',
  },
  avgPrice: {
    fontSize: 12,
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#22c55e',
    fontFamily: 'PixeloidMono',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#4a90e2',
  },
  totalLabel: {
    fontSize: 16,
    color: '#4a90e2',
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    flexShrink: 1,
    marginRight: 8,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4a90e2',
    fontFamily: 'PixeloidMono',
    flexShrink: 0,
  },
  closeButton: {
    backgroundColor: 'rgba(74,144,226,1)',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(53,122,189,1)',
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    marginTop: 16,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
});

export default React.memo(InventoryModal);
