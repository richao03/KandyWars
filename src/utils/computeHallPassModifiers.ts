import { HallPass, HallPassEffect } from '../store/slices/hallPassSlice';
import { HallPassModifiers } from '../store/slices/hallPassModifiersSlice';

/**
 * Computes hall pass modifiers from selected hall passes
 *
 * This function should be called ONCE at game initialization to calculate
 * all the bonuses that will be applied throughout the game.
 *
 * @param selectedPasses - Array of hall passes that the user has selected
 * @returns HallPassModifiers object with all computed bonuses
 */
export function computeHallPassModifiers(selectedPasses: HallPass[]): HallPassModifiers {
  const modifiers: HallPassModifiers = {
    salePriceBonusPercent: 0,
    inventoryBonusSlots: 0,
    allowanceBonusPercent: 0,
    jokerBonusCount: 0,
    rerollBonusCount: 0,
    salesMultiplier: 1, // Default 1x (no multiplier)
  };

  // Accumulate effects from all selected passes
  selectedPasses.forEach((pass) => {
    // Handle special hall passes by ID (like we do with jokers)
    switch (pass.id) {
      case 'speedrun_champion':
        // Speedrun Champion: +100% profit bonus
        modifiers.salePriceBonusPercent += 20; // 100% / 5 = 20
        break;
      case 'forged_pass':
        // Forged Pass: +1 reroll
        modifiers.rerollBonusCount += 1;
        break;
      // Add more special hall passes here as needed
    }

    // Process standard effects
    pass.effects.forEach((effect: HallPassEffect) => {
      switch (effect.type) {
        case 'sale_price_bonus':
          modifiers.salePriceBonusPercent += effect.value;
          break;
        case 'inventory_bonus':
          modifiers.inventoryBonusSlots += effect.value;
          break;
        case 'allowance_bonus':
          modifiers.allowanceBonusPercent += effect.value;
          break;
        case 'joker_bonus':
          modifiers.jokerBonusCount += effect.value;
          break;
        case 'special':
          // Special effects are handled by hall pass ID above
          break;
        default:
          console.warn(`Unknown hall pass effect type: ${effect.type}`);
      }
    });
  });

  return modifiers;
}
