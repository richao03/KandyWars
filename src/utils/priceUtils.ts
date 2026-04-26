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

/**
 * Formats a number as a currency string with commas and 2 decimal places.
 * Does NOT include the "$" prefix — callers add that contextually.
 * Uses regex (not toLocaleString) for consistent cross-platform output.
 *
 * @example
 * formatCurrency(1234.5)   // "1,234.50"
 * formatCurrency(-999.99)  // "-999.99"
 * formatCurrency(0)        // "0.00"
 */
export const formatCurrency = (amount: number): string => {
  'worklet';
  const fixed = Math.abs(amount).toFixed(2);
  const [whole, decimal] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return amount < 0 ? `-${withCommas}.${decimal}` : `${withCommas}.${decimal}`;
};

/**
 * Formats an integer with commas, no decimal places.
 * For whole-number displays like unlock costs, quantities, etc.
 *
 * @example
 * formatNumber(5000)   // "5,000"
 * formatNumber(100)    // "100"
 */
export const formatNumber = (amount: number): string => {
  const whole = Math.abs(Math.round(amount)).toString();
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return amount < 0 ? `-${withCommas}` : withCommas;
};
