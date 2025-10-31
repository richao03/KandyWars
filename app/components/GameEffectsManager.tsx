import { useFarmersCarry } from '../../src/hooks/useFarmersCarry';

/**
 * GameEffectsManager
 *
 * This component manages global game effects that need to run throughout the entire app lifecycle.
 * It's mounted at the root level to ensure these effects are always active.
 *
 * Effects managed:
 * - FarmersCarry bonus (period-based income)
 * - Future: Diamond Hand effects, Time-based bonuses, etc.
 */
export default function GameEffectsManager() {
  // FarmersCarry: Apply bonuses when period changes
  useFarmersCarry();

  // Future global effects can be added here:
  // useDiamondHand();
  // useAutoSave();
  // usePeriodicEvents();

  return null; // This is a logic-only component, renders nothing
}
