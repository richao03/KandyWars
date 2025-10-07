/**
 * CandyWarz Consolidated Color Palette
 *
 * This file contains the unified color system for the entire app.
 * Reduced from ~250+ unique colors to 35 semantic colors for consistency.
 *
 * @see COLOR_CATALOG.md for full analysis and migration strategy
 */

export const colors = {
  // ==================== NEUTRALS ====================
  white: '#ffffff',
  offWhite: '#f8f9fa',
  black: '#000000',
  darkGray1: '#1a1a1a',
  darkGray2: '#2c2c2c',

  // ==================== GRAYS ====================
  gray: {
    dark: '#333333',      // Dark text
    medium: '#666666',    // Secondary text
    light: '#999999',     // Disabled text
    border: '#cccccc',    // Borders, dividers
    bg: '#f5f5f5',        // Light backgrounds
  },

  // ==================== BRAND COLORS ====================
  brown: {
    primary: '#6b4423',   // Candy/chocolate theme
    secondary: '#8b4513', // Accents and borders
  },

  gold: {
    light: '#f7e98e',     // Piggy bank, highlighted text
    medium: '#d4af37',    // Buttons, coins
    beige: '#f5f5dc',     // Backgrounds
  },

  // ==================== UI COLORS ====================
  green: {
    success: '#22c55e',   // Success states
    neon: '#00ff41',      // Matrix/tech theme
    darkBg: '#2d4a3e',    // Dark backgrounds
  },

  red: {
    error: '#dc2626',     // Errors, warnings
    dark: '#991b1b',      // Dark accents
  },

  orange: {
    primary: '#ff6b35',   // CTAs, highlights
  },

  blue: {
    cyan: '#00d4ff',      // Tech/neon
    primary: '#3b82f6',   // Links, info
    lightBg: '#90caf9',   // Light backgrounds
    darkBg: '#16213e',    // Dark backgrounds
  },

  purple: {
    primary: '#7851A9',   // Candy King theme
    light: '#b8a9c9',     // Evening UI
    darkBg: '#2a1845',    // Evening backgrounds
    hotPink: '#ec4899',   // Accents
  },
} as const;

// Type-safe color access
export type Colors = typeof colors;
export type ColorKey = keyof Colors;

// Helper function to get nested color values
export function getColor(path: string): string {
  const parts = path.split('.');
  let value: any = colors;

  for (const part of parts) {
    value = value[part];
    if (value === undefined) {
      console.warn(`Color path not found: ${path}`);
      return colors.black;
    }
  }

  return value as string;
}

// Commonly used color combinations for quick access
export const colorPresets = {
  // Button styles
  successButton: {
    background: colors.green.success,
    text: colors.white,
    border: colors.green.darkBg,
  },
  errorButton: {
    background: colors.red.error,
    text: colors.white,
    border: colors.red.dark,
  },
  primaryButton: {
    background: colors.orange.primary,
    text: colors.white,
    border: colors.brown.secondary,
  },

  // Text styles
  primaryText: {
    color: colors.gray.dark,
  },
  secondaryText: {
    color: colors.gray.medium,
  },
  disabledText: {
    color: colors.gray.light,
  },

  // Card styles
  card: {
    background: colors.white,
    border: colors.gray.border,
    shadow: colors.black,
  },
  darkCard: {
    background: colors.darkGray1,
    border: colors.darkGray2,
    shadow: colors.black,
  },
} as const;

export default colors;
