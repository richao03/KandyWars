import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatCurrency } from '../../src/utils/priceUtils';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
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
      modalStyle={styles.modalWrapper}
    >
      <PixelBorder
        borderColor="#4a90e2"
        borderWidth={3}
        backgroundColor="#fefaf5"
        innerPadding={20}
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
                <PixelBorder
                  key={item.id}
                  borderColor="#e6d4b7"
                  borderWidth={2}
                  backgroundColor="#ffffff"
                  innerPadding={0}
                  style={styles.itemBorder}
                >
                  <View style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.quantityBadge}>
                      <Text style={styles.itemQuantity}>
                        x{item.quantity || 0}
                      </Text>
                    </View>
                  </View>
                </PixelBorder>
              ))}
            </View>
          )}
        </ScrollView>

        {inventoryItems.length > 0 && (
          <PixelBorder
            borderColor="#4a90e2"
            borderWidth={3}
            backgroundColor="#f8f9fa"
            innerPadding={0}
            style={styles.totalBorder}
          >
            <View style={styles.totalRow}>
              <TextWithEmojis style={styles.totalLabel}>
                Total Stash Value:
              </TextWithEmojis>
              <Text style={styles.totalValue}>
                ${formatCurrency(totalValue)}
              </Text>
            </View>
          </PixelBorder>
        )}

        <TouchableOpacity
          style={styles.closeButtonWrap}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <PixelBorder
            borderColor="rgba(53,122,189,1)"
            borderWidth={3}
            backgroundColor="rgba(74,144,226,1)"
            innerPadding={0}
          >
            <View style={styles.closeButtonInner}>
              <Text style={styles.closeButtonText}>Close</Text>
            </View>
          </PixelBorder>
        </TouchableOpacity>
      </PixelBorder>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modalWrapper: {
    backgroundColor: 'transparent',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowOpacity: 0,
    elevation: 0,
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
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'PixeloidMono',
  },
  scrollView: {
    maxHeight: 300,
  },
  itemsContainer: {
    marginBottom: 8,
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
  itemBorder: {
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  totalBorder: {
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
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
  closeButtonWrap: {
    marginTop: 16,
  },
  closeButtonInner: {
    paddingVertical: 16,
    alignItems: 'center',
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
