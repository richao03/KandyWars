import { useEffect } from 'react';
import { useFarmersCarry } from '../../src/hooks/useFarmersCarry';
import { useHomeMadeBonus } from '../../src/hooks/useHomeMadeBonus';
import { useSparePeriodIncome } from '../../src/hooks/useSparePeriodIncome';
import { useLoanShark } from '../../src/hooks/useLoanShark';
import { useAppSelector } from '../../src/store/hooks';
import { selectSoundVolume, selectMusicVolume } from '../../src/store/slices/settingsSlice';
import { SoundEffects } from '../../src/utils/soundEffects';
import { MusicController } from '../../src/utils/musicController';

/**
 * GameEffectsManager
 *
 * This component manages global game effects that need to run throughout the entire app lifecycle.
 * It's mounted at the root level to ensure these effects are always active.
 *
 * Effects managed:
 * - FarmersCarry bonus (period-based income)
 * - HomeMadeBonus (morning inventory cash per day)
 * - SparePeriodIncome (Spare Change): cash per empty inventory slot per period
 * - LoanShark: daily cash income (EOD debt handled in computeEndDayBonuses)
 * - Volume settings sync
 */
export default function GameEffectsManager() {
  // FarmersCarry: Apply bonuses when period changes
  useFarmersCarry();
  // HomeMadeBonus: Apply morning inventory bonus at start of each day
  useHomeMadeBonus();
  // Spare Change: per-period cash per empty inventory slot
  useSparePeriodIncome();
  // Loan Shark: per-day cash income
  useLoanShark();

  // Sync persisted volume settings to audio controllers
  const soundVolume = useAppSelector(selectSoundVolume);
  const musicVolume = useAppSelector(selectMusicVolume);
  useEffect(() => {
    SoundEffects.setVolume(soundVolume);
    MusicController.setVolume(musicVolume);
  }, [soundVolume, musicVolume]);

  // Future global effects can be added here:
  // useDiamondHand();
  // useAutoSave();
  // usePeriodicEvents();

  return null; // This is a logic-only component, renders nothing
}
