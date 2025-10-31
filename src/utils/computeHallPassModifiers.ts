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
    salesMultiplier: 1, // Default 1x (no multiplier)
  };

  // Accumulate effects from all selected passes
  selectedPasses.forEach((pass) => {
    console.log(`🎖️ COMPUTE: Processing pass "${pass.name}" (id: ${pass.id}) with ${pass.effects.length} effects`);

    // Handle special hall passes by ID (like we do with jokers)
    switch (pass.id) {
      case 'time_crunch':
        // Time Crunch: +400% profit bonus
        modifiers.salePriceBonusPercent += 80; // 400% / 5 = 80
        console.log(`  ✓ time_crunch: +400% sales profit (total: ${modifiers.salePriceBonusPercent * 5}%)`);
        break;
      case 'speedrun_champion':
        // Speedrun Champion: +100% profit bonus
        modifiers.salePriceBonusPercent += 20; // 100% / 5 = 20
        console.log(`  ✓ speedrun_champion: +100% sales profit (total: ${modifiers.salePriceBonusPercent * 5}%)`);
        break;
      case 'forged_pass':
        // Forged Pass: +1 reroll
        modifiers.rerollBonusCount += 1;
        console.log(`  ✓ forged_pass: +1 reroll (total: ${modifiers.rerollBonusCount} rerolls)`);
        break;
      // Add more special hall passes here as needed
    }

    // Process standard effects
    pass.effects.forEach((effect: HallPassEffect) => {
      switch (effect.type) {
        case 'sale_price_bonus':
          modifiers.salePriceBonusPercent += effect.value;
          console.log(`  ✓ sale_price_bonus: +${effect.value * 5}% (total: ${modifiers.salePriceBonusPercent * 5}%)`);
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
          // Special effects are handled by hall pass ID above
          console.log(`  ℹ️ special effect (handled by ID): ${effect.description}`);
          break;
        default:
          console.warn(`  ⚠️ Unknown effect type: ${effect.type}`);
      }
    });
  });

  console.log('🎖️ COMPUTE: Final modifiers:', modifiers);
  return modifiers;
}
