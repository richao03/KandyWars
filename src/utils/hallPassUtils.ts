import { HallPassEffect } from '../store/slices/hallPassSlice';
import { applyPercentageBonus } from './priceUtils';

export class HallPassUtils {
  /**
   * Apply Hall Pass sale price bonus to a candy price
   */
  static applySalePriceBonus(basePrice: number, hallPassEffects: HallPassEffect[]): number {
    const saleBonusPercentage = hallPassEffects
      .filter(effect => effect.type === 'sale_price_bonus')
      .reduce((sum, effect) => sum + effect.value, 0);

    if (saleBonusPercentage === 0) return basePrice;

    const finalPrice = applyPercentageBonus(basePrice, saleBonusPercentage);
    if (__DEV__) console.log(`💎 Sale Price - Base: $${basePrice.toFixed(2)}, Hall Pass bonus: +${saleBonusPercentage}%, Final: $${finalPrice.toFixed(2)}`);

    return finalPrice;
  }

  /**
   * Apply Hall Pass allowance bonus to base allowance
   */
  static applyAllowanceBonus(baseAllowance: number, hallPassEffects: HallPassEffect[]): number {
    const allowanceBonusPercentage = hallPassEffects
      .filter(effect => effect.type === 'allowance_bonus')
      .reduce((sum, effect) => sum + effect.value, 0);

    if (allowanceBonusPercentage === 0) return baseAllowance;

    const finalAllowance = applyPercentageBonus(baseAllowance, allowanceBonusPercentage);
    if (__DEV__) console.log(`💰 Allowance - Base: $${baseAllowance.toFixed(2)}, Hall Pass bonus: +${allowanceBonusPercentage}%, Final: $${finalAllowance.toFixed(2)}`);

    return finalAllowance;
  }

  /**
   * Apply Hall Pass inventory bonus to base inventory limit
   */
  static applyInventoryBonus(baseInventory: number, hallPassEffects: HallPassEffect[]): number {
    const inventoryBonus = hallPassEffects
      .filter(effect => effect.type === 'inventory_bonus')
      .reduce((sum, effect) => sum + effect.value, 0);

    if (inventoryBonus === 0) return baseInventory;

    const finalInventory = baseInventory + inventoryBonus;
    if (__DEV__) console.log(`📦 Inventory - Base: ${baseInventory}, Hall Pass bonus: +${inventoryBonus}, Final: ${finalInventory}`);

    return finalInventory;
  }

  /**
   * Apply Hall Pass joker finding bonus to base chance
   */
  static applyJokerBonus(baseChance: number, hallPassEffects: HallPassEffect[]): number {
    const jokerBonusPercentage = hallPassEffects
      .filter(effect => effect.type === 'joker_bonus')
      .reduce((sum, effect) => sum + effect.value, 0);

    if (jokerBonusPercentage === 0) return baseChance;

    const finalChance = Math.min(1, baseChance * (1 + jokerBonusPercentage / 100));
    if (__DEV__) console.log(`🃏 Joker Chance - Base: ${Math.round(baseChance * 100)}%, Hall Pass bonus: +${jokerBonusPercentage}%, Final: ${Math.round(finalChance * 100)}%`);

    return finalChance;
  }

  /**
   * Check if a special Hall Pass effect is active
   */
  static hasSpecialEffect(effectDescription: string, hallPassEffects: HallPassEffect[]): boolean {
    return hallPassEffects.some(effect =>
      effect.type === 'special' && effect.description.toLowerCase().includes(effectDescription.toLowerCase())
    );
  }

  /**
   * Get all active special effects
   */
  static getSpecialEffects(hallPassEffects: HallPassEffect[]): HallPassEffect[] {
    return hallPassEffects.filter(effect => effect.type === 'special');
  }

  /**
   * Get summary of all active bonuses for display
   */
  static getActiveBonusSummary(hallPassEffects: HallPassEffect[]): string[] {
    const summary: string[] = [];

    const saleBonus = hallPassEffects
      .filter(effect => effect.type === 'sale_price_bonus')
      .reduce((sum, effect) => sum + effect.value, 0);
    if (saleBonus > 0) {
      summary.push(`+${saleBonus}% candy sale prices`);
    }

    const allowanceBonus = hallPassEffects
      .filter(effect => effect.type === 'allowance_bonus')
      .reduce((sum, effect) => sum + effect.value, 0);
    if (allowanceBonus > 0) {
      summary.push(`+${allowanceBonus}% daily allowance`);
    }

    const inventoryBonus = hallPassEffects
      .filter(effect => effect.type === 'inventory_bonus')
      .reduce((sum, effect) => sum + effect.value, 0);
    if (inventoryBonus > 0) {
      summary.push(`+${inventoryBonus} inventory slots`);
    }

    const jokerBonus = hallPassEffects
      .filter(effect => effect.type === 'joker_bonus')
      .reduce((sum, effect) => sum + effect.value, 0);
    if (jokerBonus > 0) {
      summary.push(`+${jokerBonus}% joker finding chance`);
    }

    const specialEffects = hallPassEffects.filter(effect => effect.type === 'special');
    specialEffects.forEach(effect => {
      summary.push(effect.description);
    });

    return summary;
  }

  /**
   * Apply Final Exam period-specific multipliers (15x for last period, -75% for others)
   */
  static applyFinalExamMultiplier(basePrice: number, selectedPassIds: string[], period: number): number {
    if (selectedPassIds.includes('final_exam')) {
      const periodsPerDay = 8;
      const periodInDay = ((period - 1) % periodsPerDay) + 1;
      if (periodInDay === periodsPerDay) {
        if (__DEV__) console.log(`📝 Final Exam (Period ${periodInDay}/${periodsPerDay}): ${basePrice} × 15 = ${basePrice * 15}`);
        return basePrice * 15;
      } else {
        if (__DEV__) console.log(`📝 Final Exam (Period ${periodInDay}/${periodsPerDay}): ${basePrice} × 0.25 = ${basePrice * 0.25}`);
        return basePrice * 0.25;
      }
    }
    return basePrice;
  }

  /**
   * Apply Speedrun Champion permanent 2x sales multiplier
   */
  static applySpeedrunMultiplier(basePrice: number, selectedPassIds: string[]): number {
    if (selectedPassIds.includes('speedrun_champion')) {
      if (__DEV__) console.log(`🏃 Speedrun Champion: ${basePrice} × 2 = ${basePrice * 2}`);
      return basePrice * 2;
    }
    return basePrice;
  }

  /**
   * Apply all hall pass sales multipliers in correct order
   * NOTE: Time Crunch and Speedrun Champion are now handled via salePriceBonusPercent in computeHallPassModifiers
   * Only Final Exam remains here because it's period-specific
   */
  static applySalesMultipliers(basePrice: number, selectedPassIds: string[], period: number): number {
    let finalPrice = basePrice;

    // Apply Final Exam (period-specific)
    finalPrice = this.applyFinalExamMultiplier(finalPrice, selectedPassIds, period);

    return finalPrice;
  }
}