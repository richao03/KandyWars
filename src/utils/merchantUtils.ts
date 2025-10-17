import { ActiveMerchantEffect } from '../store/slices/merchantSlice';
import { applyPercentageBonus, applyMultiplier } from './priceUtils';

export class MerchantUtils {
  /**
   * Apply merchant inventory capacity bonus
   * Hollowed Textbook: +10 capacity per level (max 5 levels = +50)
   */
  static applyInventoryBonus(
    baseCapacity: number,
    activeEffects: ActiveMerchantEffect[]
  ): number {
    const hollowedTextbook = activeEffects.find(
      (e) => e.itemId === 'hollowed_textbook'
    );

    if (!hollowedTextbook || !hollowedTextbook.level) return baseCapacity;

    const bonus = hollowedTextbook.level * 10;
    const finalCapacity = baseCapacity + bonus;

    console.log(
      `📚 Merchant - Hollowed Textbook Lvl ${hollowedTextbook.level}: Base capacity ${baseCapacity} + ${bonus} = ${finalCapacity}`
    );

    return finalCapacity;
  }

  /**
   * Apply merchant profit bonus to sale prices
   * Street Cred: +10% profit per level (max 5 levels = +50%)
   */
  static applyProfitBonus(
    basePrice: number,
    activeEffects: ActiveMerchantEffect[]
  ): number {
    const streetCred = activeEffects.find((e) => e.itemId === 'street_cred');

    if (!streetCred || !streetCred.level) return basePrice;

    const bonusPercentage = streetCred.level * 10;
    const finalPrice = applyPercentageBonus(basePrice, bonusPercentage);

    console.log(
      `💰 Merchant - Street Cred Lvl ${streetCred.level}: Base price $${basePrice.toFixed(2)} + ${bonusPercentage}% = $${finalPrice.toFixed(2)}`
    );

    return finalPrice;
  }

  /**
   * Apply merchant allowance bonus
   * Fake Report Card: Doubles allowance per level (Level 1: 2x, Level 2: 4x, Level 3: 8x)
   */
  static applyAllowanceBonus(
    baseAllowance: number,
    activeEffects: ActiveMerchantEffect[]
  ): number {
    const fakeReportCard = activeEffects.find(
      (e) => e.itemId === 'fake_report_card'
    );

    if (!fakeReportCard || !fakeReportCard.level) return baseAllowance;

    // Exponential doubling: 2^level
    const multiplier = Math.pow(2, fakeReportCard.level);
    const finalAllowance = applyMultiplier(baseAllowance, multiplier);

    console.log(
      `📝 Merchant - Fake Report Card Lvl ${fakeReportCard.level}: Base allowance $${baseAllowance.toFixed(2)} × ${multiplier}x = $${finalAllowance.toFixed(2)}`
    );

    return finalAllowance;
  }

  /**
   * Apply Metal Detector multiplier to found money
   * Level 1: 10x, Level 2: 100x, Level 3: 1000x
   */
  static applyFoundMoneyMultiplier(
    baseAmount: number,
    activeEffects: ActiveMerchantEffect[]
  ): number {
    const metalDetector = activeEffects.find(
      (e) => e.itemId === 'metal_detector'
    );

    if (!metalDetector || !metalDetector.level) return baseAmount;

    const multipliers = [10, 100, 1000];
    const multiplier = multipliers[metalDetector.level - 1] || 1;
    const finalAmount = applyMultiplier(baseAmount, multiplier);

    console.log(
      `🔍 Merchant - Metal Detector Lvl ${metalDetector.level}: Base amount $${baseAmount.toFixed(2)} × ${multiplier} = $${finalAmount.toFixed(2)}`
    );

    return finalAmount;
  }

  /**
   * Check if Double Sided Coin should convert negative event to positive
   * Level 1: 25% chance, Level 2: 50% chance, Level 3: 75% chance
   */
  static shouldConvertNegativeEvent(
    activeEffects: ActiveMerchantEffect[]
  ): boolean {
    const doubleSidedCoin = activeEffects.find(
      (e) => e.itemId === 'double_sided_coin'
    );

    if (!doubleSidedCoin || !doubleSidedCoin.level) return false;

    const chances = [0.25, 0.5, 0.75];
    const chance = chances[doubleSidedCoin.level - 1] || 0;
    const result = Math.random() < chance;

    if (result) {
      console.log(
        `🪙 Merchant - Double Sided Coin Lvl ${doubleSidedCoin.level}: Converting negative event (${chance * 100}% chance)`
      );
    }

    return result;
  }

  /**
   * Check if Hall Monitor Bribe is available
   */
  static hasHallMonitorBribe(
    activeEffects: ActiveMerchantEffect[]
  ): boolean {
    const bribe = activeEffects.find(
      (e) => e.itemId === 'hall_monitor_bribe'
    );
    return bribe !== undefined && (bribe.count || 0) > 0;
  }

  /**
   * Check if 6th Grade Bodyguard is available
   */
  static hasBodyguard(activeEffects: ActiveMerchantEffect[]): boolean {
    const bodyguard = activeEffects.find(
      (e) => e.itemId === 'sixth_grade_bodyguard'
    );
    return bodyguard !== undefined && (bodyguard.count || 0) > 0;
  }

  /**
   * Get count of Influencer Shoutouts available
   */
  static getInfluencerShoutoutCount(
    activeEffects: ActiveMerchantEffect[]
  ): number {
    const shoutout = activeEffects.find(
      (e) => e.itemId === 'influencer_shoutout'
    );
    return shoutout?.count || 0;
  }

  /**
   * Get count of Air Delivery Drones available
   */
  static getAirDeliveryDroneCount(activeEffects: ActiveMerchantEffect[]): number {
    const drone = activeEffects.find((e) => e.itemId === 'air_delivery_drone');
    return drone?.count || 0;
  }

  /**
   * Check if Influencer Shoutout is available (+200% profit on next sale)
   */
  static hasInfluencerShoutout(activeEffects: ActiveMerchantEffect[]): boolean {
    const shoutout = activeEffects.find((e) => e.itemId === 'influencer_shoutout');
    return shoutout !== undefined && (shoutout.count || 0) > 0;
  }

  /**
   * Get summary of all active merchant effects
   */
  static getActiveMerchantSummary(
    activeEffects: ActiveMerchantEffect[]
  ): string[] {
    const summary: string[] = [];

    activeEffects.forEach((effect) => {
      switch (effect.itemId) {
        case 'fake_report_card':
          if (effect.level) {
            const multiplier = Math.pow(2, effect.level);
            summary.push(
              `Fake Report Card Lvl ${effect.level} (${multiplier}x allowance)`
            );
          }
          break;
        case 'metal_detector':
          if (effect.level) {
            const multipliers = ['10x', '100x', '1000x'];
            summary.push(
              `Metal Detector Lvl ${effect.level} (${multipliers[effect.level - 1]} found money)`
            );
          }
          break;
        case 'hollowed_textbook':
          if (effect.level) {
            summary.push(
              `Hollowed Textbook Lvl ${effect.level} (+${effect.level * 10} capacity)`
            );
          }
          break;
        case 'street_cred':
          if (effect.level) {
            summary.push(
              `Street Cred Lvl ${effect.level} (+${effect.level * 10}% profit)`
            );
          }
          break;
        case 'double_sided_coin':
          if (effect.level) {
            const chances = ['25%', '50%', '75%'];
            summary.push(
              `Double Sided Coin Lvl ${effect.level} (${chances[effect.level - 1]} event conversion)`
            );
          }
          break;
        case 'hall_monitor_bribe':
          if (effect.count) {
            summary.push(`Hall Monitor Bribe ×${effect.count}`);
          }
          break;
        case 'sixth_grade_bodyguard':
          if (effect.count) {
            summary.push(`6th Grade Bodyguard ×${effect.count}`);
          }
          break;
        case 'influencer_shoutout':
          if (effect.count) {
            summary.push(`Influencer Shoutout ×${effect.count}`);
          }
          break;
        case 'air_delivery_drone':
          if (effect.count) {
            summary.push(`Air Delivery Drone ×${effect.count}`);
          }
          break;
      }
    });

    return summary;
  }
}
