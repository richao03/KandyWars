/**
 * Utility functions for price and monetary calculations
 */

/**
 * Rounds a number to 2 decimal places (for currency values)
 * This ensures all monetary calculations are properly rounded to cents
 *
 * @param value - The value to round
 * @returns The value rounded to 2 decimal places
 *
 * @example
 * roundToTwoDecimals(10.156) // returns 10.16
 * roundToTwoDecimals(10.154) // returns 10.15
 * roundToTwoDecimals(100.001) // returns 100.00
 */
export const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

/**
 * Applies a percentage bonus to a base value and rounds to 2 decimals
 *
 * @param baseValue - The starting value
 * @param bonusPercentage - The percentage to add (e.g., 15 for 15%)
 * @returns The final value after applying the percentage and rounding
 *
 * @example
 * applyPercentageBonus(100, 15) // returns 115.00
 * applyPercentageBonus(50, 20) // returns 60.00
 */
export const applyPercentageBonus = (baseValue: number, bonusPercentage: number): number => {
  return roundToTwoDecimals(baseValue * (1 + bonusPercentage / 100));
};

/**
 * Applies a multiplier to a base value and rounds to 2 decimals
 *
 * @param baseValue - The starting value
 * @param multiplier - The multiplier to apply
 * @returns The final value after applying the multiplier and rounding
 *
 * @example
 * applyMultiplier(100, 1.5) // returns 150.00
 * applyMultiplier(50, 2) // returns 100.00
 */
export const applyMultiplier = (baseValue: number, multiplier: number): number => {
  return roundToTwoDecimals(baseValue * multiplier);
};
