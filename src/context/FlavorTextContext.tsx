import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setFlavorEvent,
  setHint,
  setText,
  resetFlavorText,
  FlavorEvent,
} from '../store/slices/flavorTextSlice';

// Re-export FlavorEvent type for convenience
export type { FlavorEvent } from '../store/slices/flavorTextSlice';

// Centralized flavor text library (memoized for performance)
const flavorLibrary: Record<FlavorEvent, string[]> = {
  STASH_LOCKED: ['Someone ratted you out, your stash was confiscated'],
  FOUND_MONEY: ['He who finds it keeps it - Confucious'],
  resale_bonus: ['what does this even mean?'],
  NEW_DAY: [
    'New day, new sugar rush.',
    'You zip up your backpack. Time to hustle.',
    'New day, same kingpin',
    'Another day, another candy dollar.',
    'Time to build that candy empire!',
    'Fresh start, fresh opportunities.',
  ],
  LOSE_MONEY: ['Whats a Candy King without a couple of haters?'],
  INVENTORY_FULL: [
    "You can't carry any more!",
    "Your backpack's bursting with sweets.",
    'There is no space for candy in your backpack, unless we throw out some text books...?',
  ],
  PRICE_SPIKE: ['To the Moon!'],
  PRICE_DROP: ['Time to stock up — prices just plummeted.'],
  JOKER_UNLOCKED: [
    'You feel smarter... luckier... gum-ier.',
    'Things were never the same again',
    'That joker changed everything.',
  ],
  // HINT removed - hints now only come from generateSeededGameData event templates
  AFTERNOON: ['The afternoon bell rings...'],
  PIGGY_BANK: ['Your piggy bank is getting heavy...'],
  PERIOD_CHANGE: [
    'Time for next period!',
    'The bell rings... on to the next class.',
    'Hurrying through the hallway...',
    'Quick bathroom break between periods.',
    'Checking your inventory between classes.',
    'The market continues...',
    'New period, new opportunities!',
    'Class change chaos - perfect for trading!',
  ],
  MORNING_TRADE: [
    'School just started! Time to make some deals.',
    'First period hustle - check those candy prices!',
    'Morning break coming up - stock up now!',
    'Fresh day, fresh opportunities!',
    'Early bird gets the best candy prices!',
  ],
  LUNCH_RUSH: [
    'Lunch rush approaching - prices might spike!',
    'Mid-day trading frenzy begins!',
    'Cafeteria chaos = candy opportunity!',
    'Lunch money burning holes in pockets...',
    'Peak trading hours!',
  ],
  FINAL_PERIOD: [
    'Last period - final trades of the day!',
    'School day ending - last chance for deals!',
    'Time to secure those final profits!',
    'Almost time to count your candy coins!',
    'End-of-day bargains might emerge...',
  ],
  DEFAULT: ['Something interesting happens...'],
};

export const useFlavorText = () => {
  const dispatch = useAppDispatch();
  const flavorTextState = useAppSelector(state => state.flavorText);

  const setEvent = useCallback((event: FlavorEvent) => {
    const texts = flavorLibrary[event];
    if (!texts) {
      console.warn(`No flavor text found for event: ${event}`);
      const defaultTexts = flavorLibrary.DEFAULT;
      const randomText = defaultTexts[Math.floor(Math.random() * defaultTexts.length)];
      dispatch(setFlavorEvent({ event: 'DEFAULT', text: randomText }));
      return;
    }
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    dispatch(setFlavorEvent({ event, text: randomText }));
  }, [dispatch]);

  const setManual = useCallback((message: string) => {
    dispatch(setText(message));
  }, [dispatch]);

  const setFlavorText = useCallback((text: string) => {
    dispatch(setText(text));
  }, [dispatch]);

  const setHintAction = useCallback((hintText: string) => {
    dispatch(setHint(hintText));
  }, [dispatch]);

  const resetFlavorTextAction = useCallback(() => {
    dispatch(resetFlavorText());
  }, [dispatch]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    text: flavorTextState.text,
    isHint: flavorTextState.isHint,
    eventType: flavorTextState.eventType,
    setEvent,
    setManual,
    setFlavorText,
    setHint: setHintAction,
    resetFlavorText: resetFlavorTextAction,
  }), [
    flavorTextState.text,
    flavorTextState.isHint,
    flavorTextState.eventType,
    setEvent,
    setManual,
    setFlavorText,
    setHintAction,
    resetFlavorTextAction,
  ]);
};