import { useMemo } from 'react';
import { useJokers } from '../context/JokerContext';

export const useJokerEffects = () => {
  const { jokers, activeEffects, getPersistentEffects } = useJokers();

  // Get inventory capacity multiplier from persistent effects
  const getInventoryCapacityMultiplier = useMemo(() => {
    const hasGeometricExpansion = jokers.some(
      joker => joker.effect === 'double_inventory_space' && joker.type === 'persistent'
    );
    return hasGeometricExpansion ? 2 : 1;
  }, [jokers]);

  // Get price multiplier for a specific candy from active effects
  const getPriceMultiplier = (candyType: string) => {
    const priceEffect = activeEffects.find(
      effect => effect.effect === 'double_candy_price' && effect.candyType === candyType
    );
    return priceEffect ? (priceEffect.multiplier || 1) : 1;
  };

  // Check if there are any time revert effects pending
  const hasPendingTimeRevert = () => {
    return activeEffects.some(effect => effect.effect === 'revert_period');
  };

  // Get all active one-time effects that need to be processed
  const getActiveOneTimeEffects = () => {
    return activeEffects.filter(effect => {
      const joker = jokers.find(j => j.id === effect.jokerId);
      return !joker; // If joker is not found, it means it was consumed (one-time)
    });
  };

  // Get all persistent effects currently active
  const getActivePersistentEffects = () => {
    return getPersistentEffects();
  };

  return {
    getInventoryCapacityMultiplier,
    getPriceMultiplier,
    hasPendingTimeRevert,
    getActiveOneTimeEffects,
    getActivePersistentEffects,
    activeEffects,
  };
};