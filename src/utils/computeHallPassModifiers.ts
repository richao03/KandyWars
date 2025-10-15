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
  console.log('🎖️ COMPUTE: Computing hall pass modifiers from', selectedPasses.length, 'selected passes');

  const modifiers: HallPassModifiers = {
    salePriceBonusPercent: 0,
    inventoryBonusSlots: 0,
    allowanceBonusPercent: 0,
    jokerBonusCount: 0,
    rerollBonusCount: 0,
  };

  // Accumulate effects from all selected passes
  selectedPasses.forEach((pass) => {
    console.log(`🎖️ COMPUTE: Processing pass "${pass.name}" with ${pass.effects.length} effects`);

    pass.effects.forEach((effect: HallPassEffect) => {
      switch (effect.type) {
        case 'sale_price_bonus':
          modifiers.salePriceBonusPercent += effect.value;
          console.log(`  ✓ sale_price_bonus: +${effect.value}% (total: ${modifiers.salePriceBonusPercent}%)`);
          break;
        case 'inventory_bonus':
          modifiers.inventoryBonusSlots += effect.value;
          console.log(`  ✓ inventory_bonus: +${effect.value} slots (total: ${modifiers.inventoryBonusSlots} slots)`);
          break;
        case 'allowance_bonus':
          modifiers.allowanceBonusPercent += effect.value;
          console.log(`  ✓ allowance_bonus: +${effect.value}% (total: ${modifiers.allowanceBonusPercent}%)`);
          break;
        case 'joker_bonus':
          modifiers.jokerBonusCount += effect.value;
          console.log(`  ✓ joker_bonus: +${effect.value} jokers (total: ${modifiers.jokerBonusCount} jokers)`);
          break;
        case 'special':
          // Check description for special effects
          if (effect.description.includes('reroll')) {
            modifiers.rerollBonusCount += effect.value;
            console.log(`  ✓ special (reroll): +${effect.value} rerolls (total: ${modifiers.rerollBonusCount} rerolls)`);
          }
          // Add more special effect handling here as needed
          break;
        default:
          console.warn(`  ⚠️ Unknown effect type: ${effect.type}`);
      }
    });
  });

  console.log('🎖️ COMPUTE: Final modifiers:', modifiers);
  return modifiers;
}
