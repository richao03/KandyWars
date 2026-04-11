import {
  roundToTwoDecimals,
  applyPercentageBonus,
  applyMultiplier,
  formatCurrency,
  formatNumber,
} from '../utils/priceUtils';

describe('roundToTwoDecimals', () => {
  // 1. Rounds correctly
  it('rounds 10.156 to 10.16', () => {
    expect(roundToTwoDecimals(10.156)).toBe(10.16);
  });

  // 2. Handles whole numbers
  it('handles whole numbers without change', () => {
    expect(roundToTwoDecimals(10)).toBe(10);
    expect(roundToTwoDecimals(0)).toBe(0);
  });

  // 3. Handles negative numbers
  it('handles negative numbers', () => {
    expect(roundToTwoDecimals(-10.156)).toBe(-10.16);
    expect(roundToTwoDecimals(-5.5)).toBe(-5.5);
  });
});

describe('applyPercentageBonus', () => {
  // 4. Applies correctly
  it('applies 15% bonus to 100 resulting in 115', () => {
    expect(applyPercentageBonus(100, 15)).toBe(115);
  });

  // 5. With 0% returns original
  it('returns original value with 0% bonus', () => {
    expect(applyPercentageBonus(100, 0)).toBe(100);
    expect(applyPercentageBonus(50.25, 0)).toBe(50.25);
  });
});

describe('applyMultiplier', () => {
  // 6. Multiplies correctly
  it('applies 1.5x multiplier to 100 resulting in 150', () => {
    expect(applyMultiplier(100, 1.5)).toBe(150);
  });

  // 7. With 1x returns original
  it('returns original value with 1x multiplier', () => {
    expect(applyMultiplier(100, 1)).toBe(100);
    expect(applyMultiplier(33.33, 1)).toBe(33.33);
  });
});

describe('formatCurrency', () => {
  // 8. Formats with commas and cents
  it('formats number with commas and two decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('1,234.50');
    expect(formatCurrency(1000000)).toBe('1,000,000.00');
    expect(formatCurrency(999.99)).toBe('999.99');
  });

  // 10. Handles zero
  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-999.99)).toBe('-999.99');
  });
});

describe('formatNumber', () => {
  // 9. Formats integers with commas
  it('formats integers with commas', () => {
    expect(formatNumber(5000)).toBe('5,000');
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles negative values', () => {
    expect(formatNumber(-5000)).toBe('-5,000');
  });
});
