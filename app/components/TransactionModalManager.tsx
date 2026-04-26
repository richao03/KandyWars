import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { Suspense, lazy } from 'react';
import { useStore } from 'react-redux';
import type { RootState } from '../../src/store/store';
import { selectDay, selectPeriod, getPeriodsPerDay } from '../../src/store/slices/gameSlice';

// Start fetching the chunk immediately when this module is evaluated
const transactionModalPromise = import('./TransactionModal');
const TransactionModal = lazy(() => transactionModalPromise);

export interface TransactionModalHandle {
  open: (index: number) => void;
  close: () => void;
}

export interface SaleInputs {
  jokers: any[];
  activeEffects: any[];
  periodCount: number;
  hallPassModifiers: any;
  hasEarlySaleToday: boolean;
  merchantEffects: any[];
  computedInventoryLimit: number;
  candySales: any[];
  totalCandiesSold: number;
  inventoryCount: number;
  inventory: any[];
  day: number;
  uniqueLocationsToday: number;
  period: number;
  periodsPerDay: number;
  jokerStats: any;
  selectedPassIds: string[];
  currentLocation: string;
}

interface Props {
  candies: any[];
  onTransaction: (index: number, quantity: number, mode: 'Buy' | 'Sell') => void;
  playerBalance: number;
  availableInventorySpace: number;
}

// Stable placeholder candy so TransactionModal stays mounted but hidden
const PLACEHOLDER_CANDY = {
  name: '',
  cost: 0,
  quantityOwned: 0,
  averagePrice: null,
};

/**
 * TransactionModalManager
 *
 * Keeps TransactionModal mounted after first open to avoid expensive remounts.
 * The modal's visible prop controls show/hide instead of mount/unmount.
 */
const TransactionModalManager = forwardRef<TransactionModalHandle, Props>(
  (
    {
      candies,
      onTransaction,
      playerBalance,
      availableInventorySpace,
    },
    ref
  ) => {
    const [selectedCandyIndex, setSelectedCandyIndex] = useState<number | null>(null);
    const [saleInputs, setSaleInputs] = useState<SaleInputs | null>(null);
    const store = useStore<RootState>();

    useImperativeHandle(
      ref,
      () => ({
        open: (index: number) => {
          const state = store.getState();
          const periodsPerDay = getPeriodsPerDay(state);
          const currentDay = selectDay(state);
          const currentPeriod = selectPeriod(state);

          // Count total candy in inventory
          const inventoryItems = state.inventory?.inventory ?? [];
          const inventoryCount = inventoryItems.reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0);

          // Count unique locations visited today
          const locationHistory = state.game?.locationHistory ?? [];
          const periodCount = state.game?.periodCount ?? 0;
          const dayStartPeriod = Math.floor(periodCount / periodsPerDay) * periodsPerDay;
          const todayLocations = new Set(
            locationHistory
              .filter((h: any) => h.period >= dayStartPeriod)
              .map((h: any) => h.location)
          );

          setSaleInputs({
            jokers: state.joker.jokers,
            activeEffects: state.joker.activeEffects ?? [],
            periodCount: periodCount,
            hallPassModifiers: state.hallPassModifiers,
            hasEarlySaleToday: state.candySales.hasEarlySaleToday,
            merchantEffects: state.merchant?.activeEffects ?? [],
            computedInventoryLimit: state.joker.computedEffects?.inventoryLimit ?? 30,
            candySales: state.candySales.sales,
            totalCandiesSold: state.candySales.totalCandiesSold,
            inventoryCount,
            inventory: state.inventory?.inventory ?? [],
            day: currentDay,
            uniqueLocationsToday: todayLocations.size,
            period: currentPeriod,
            periodsPerDay,
            jokerStats: state.jokerStats ?? {},
            selectedPassIds: state.hallPass?.selectedPassIds ?? [],
            currentLocation: state.game?.currentLocation ?? '',
          });
          setSelectedCandyIndex(index);
        },
        close: () => {
          setSelectedCandyIndex(null);
        },
      }),
      [store]
    );

    const handleClose = useCallback(() => {
      setSelectedCandyIndex(null);
    }, []);

    const handleConfirm = useCallback(
      (quantity: number, mode: 'Buy' | 'Sell') => {
        if (selectedCandyIndex === null) return;
        onTransaction(selectedCandyIndex, quantity, mode);
        handleClose();
      },
      [selectedCandyIndex, onTransaction, handleClose]
    );

    const isVisible = selectedCandyIndex !== null;
    const selectedCandy = isVisible ? candies[selectedCandyIndex] : null;

    // Use selected candy or placeholder (modal is hidden when placeholder is used)
    const candy = selectedCandy || PLACEHOLDER_CANDY;

    const maxBuyQty =
      selectedCandy && selectedCandy.cost > 0
        ? Math.min(
            Math.floor(playerBalance / selectedCandy.cost),
            availableInventorySpace
          )
        : 0;

    const maxSellQty = selectedCandy ? selectedCandy.quantityOwned : 0;

    return (
      <Suspense fallback={null}>
        <TransactionModal
          visible={isVisible}
          onClose={handleClose}
          onConfirm={handleConfirm}
          maxBuyQuantity={maxBuyQty}
          maxSellQuantity={maxSellQty}
          candy={candy as any}
          playerBalance={playerBalance}
          availableInventorySpace={availableInventorySpace}
          saleInputs={saleInputs}
        />
      </Suspense>
    );
  }
);

TransactionModalManager.displayName = 'TransactionModalManager';

export default React.memo(TransactionModalManager);
