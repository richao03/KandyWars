import { HallPassEffect } from '../store/slices/hallPassSlice';

export class HallPassUtils {
  /**
   * Apply Hall Pass sale price bonus to a candy price
   */
  static applySalePriceBonus(basePrice: number, hallPassEffects: HallPassEffect[]): number {
    const saleBonusPercentage = hallPassEffects
      .filter(effect => effect.type === 'sale_price_bonus')
      .reduce((sum, effect) => sum + effect.value, 0);

    if (saleBonusPercentage === 0) return basePrice;

    const finalPrice = Math.round(basePrice * (1 + saleBonusPercentage / 100));
    console.log(`💎 Sale Price - Base: $${basePrice}, Hall Pass bonus: +${saleBonusPercentage}%, Final: $${finalPrice}`);

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

    const finalAllowance = Math.round(baseAllowance * (1 + allowanceBonusPercentage / 100));
    console.log(`💰 Allowance - Base: $${baseAllowance}, Hall Pass bonus: +${allowanceBonusPercentage}%, Final: $${finalAllowance}`);

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
    console.log(`📦 Inventory - Base: ${baseInventory}, Hall Pass bonus: +${inventoryBonus}, Final: ${finalInventory}`);

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
    console.log(`🃏 Joker Chance - Base: ${Math.round(baseChance * 100)}%, Hall Pass bonus: +${jokerBonusPercentage}%, Final: ${Math.round(finalChance * 100)}%`);

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
}