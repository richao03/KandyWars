import { scoreboardService } from '../../services/firebase';
import { computeHallPassModifiers } from '../../utils/computeHallPassModifiers';
import { generateSeededGameData } from '../../../utils/generateSeededGameData';
import type { AppDispatch, RootState } from '../store';
import { resetFlavorText } from '../slices/flavorTextSlice';
import { resetGame, unlockMediumCandies } from '../slices/gameSlice';
import { setHallPassModifiers } from '../slices/hallPassModifiersSlice';
import {
  selectSelectedHallPasses,
  syncHallPassesFromFirebase,
} from '../slices/hallPassSlice';
import { resetInventory } from '../slices/inventorySlice';
import { resetJokers } from '../slices/jokerSlice';
import { setGameData, setSeed } from '../slices/seedSlice';
import { resetTutorial } from '../slices/tutorialSlice';
import { setCachedUserObject } from '../slices/userObjectSlice';
import {
  initializeWallet,
  selectPlayerName,
  setBalance,
} from '../slices/walletSlice';

const TOTAL_PERIODS = 40;

/**
 * Boots a fresh run for the given difficulty level. This owns the full,
 * ordering-sensitive game-start sequence (Firebase refresh, seed + game-data
 * generation, slice resets, wallet init, hall-pass modifiers, and per-pass
 * perk one-offs) so the title screen only has to fire the UI transition.
 *
 * The ordering here matters: modifiers are applied AFTER wallet init, and the
 * perk one-offs run AFTER both so they aren't clobbered by the resets.
 */
export const startNewGame =
  (level: number) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    // Read run config from state up front, before any reset touches it.
    const selectedPasses = selectSelectedHallPasses(getState());
    const playerName = selectPlayerName(getState()) ?? undefined;

    // Refresh user object from Firebase to get latest data.
    const userObject = await scoreboardService.refreshUserObject();
    dispatch(setCachedUserObject(userObject));
    if (userObject.unlockedHallPasses?.length > 0) {
      dispatch(syncHallPassesFromFirebase(userObject.unlockedHallPasses));
    }

    // Compute hall pass modifiers from the selected passes (pure; no state read).
    const hallPassModifiers = computeHallPassModifiers(selectedPasses);

    // Generate fresh seed + pre-generated price/event data for the run.
    const newSeed = `game-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    dispatch(setSeed(newSeed));

    const isTutorialMode = level === 1;
    const gameData = generateSeededGameData(
      newSeed,
      TOTAL_PERIODS,
      level,
      isTutorialMode
    );
    dispatch(setGameData(gameData));

    // Reset all per-run game state.
    dispatch(resetGame());
    dispatch(resetInventory());
    dispatch(resetJokers());
    dispatch(resetFlavorText());

    // Tutorial replays on every new game at difficulty 1.
    if (level === 1) {
      dispatch(resetTutorial());
    }

    // Initialize wallet with the selected difficulty, preserving the name.
    dispatch(initializeWallet({ level, playerName }));

    // Apply modifiers AFTER wallet init so they survive the reset sequence.
    dispatch(setHallPassModifiers(hallPassModifiers));

    // Per-pass perk one-offs, applied last so the resets don't clobber them.
    if (selectedPasses.some((p) => p.id === 'time_crunch')) {
      // Time Crunch: start with medium candy unlocked.
      dispatch(unlockMediumCandies());
    }
    if (selectedPasses.some((p) => p.id === 'senior_executive')) {
      // Senior Executive: start with $2000 instead of $20.
      dispatch(setBalance(2000));
    }
  };
