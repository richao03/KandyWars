import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { Suspense, lazy } from 'react';

// Lazy load the heavy TransactionModal
const TransactionModal = lazy(() => import('./TransactionModal'));

export interface TransactionModalHandle {
  open: (index: number) => void;
  close: () => void;
}

interface Props {
  candies: any[];
  onTransaction: (index: number, quantity: number, mode: 'Buy' | 'Sell') => void;
  playerBalance: number;
  availableInventorySpace: number;
}

/**
 * TransactionModalManager
 *
 * Manages modal state internally to prevent parent component re-renders.
 * Uses imperative handle to expose open/close methods via ref.
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
    // Modal state is managed INTERNALLY - parent doesn't re-render when this changes
    const [selectedCandyIndex, setSelectedCandyIndex] = useState<number | null>(null);
    const [isTransactionModalOpening, setIsTransactionModalOpening] = useState(false);

    // Expose imperative API to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        open: (index: number) => {
          setIsTransactionModalOpening(true);
          setSelectedCandyIndex(index);
        },
        close: () => {
          setIsTransactionModalOpening(false);
          setSelectedCandyIndex(null);
        },
      }),
      []
    );

    const handleClose = useCallback(() => {
      setIsTransactionModalOpening(false);
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

    const selectedCandy =
      selectedCandyIndex !== null ? candies[selectedCandyIndex] : null;

    if (!selectedCandy || selectedCandyIndex === null) {
      return null;
    }

    // Calculate max buy/sell quantities based on selected candy
    const maxBuyQty =
      selectedCandy && selectedCandy.cost > 0
        ? Math.min(
            Math.floor(playerBalance / selectedCandy.cost), // Money constraint
            availableInventorySpace // Inventory space constraint
          )
        : 0;

    const maxSellQty = selectedCandy ? selectedCandy.quantityOwned : 0;

    return (
      <Suspense fallback={null}>
        <TransactionModal
          visible={selectedCandyIndex !== null}
          onClose={handleClose}
          onConfirm={handleConfirm}
          maxBuyQuantity={maxBuyQty}
          maxSellQuantity={maxSellQty}
          candy={selectedCandy}
          playerBalance={playerBalance}
          availableInventorySpace={availableInventorySpace}
        />
      </Suspense>
    );
  }
);

TransactionModalManager.displayName = 'TransactionModalManager';

export default TransactionModalManager;
