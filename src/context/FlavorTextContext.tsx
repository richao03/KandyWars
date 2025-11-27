import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  FlavorEvent,
  resetFlavorText,
  setFlavorEvent,
  setHint,
  setText,
} from '../store/slices/flavorTextSlice';

// Re-export FlavorEvent type for convenience
export type { FlavorEvent } from '../store/slices/flavorTextSlice';

// Centralized flavor text library (memoized for performance)
const flavorLibrary: Record<FlavorEvent, string[]> = {
  STASH_LOCKED: ['Someone ratted you out, your stash was confiscated'],
  FOUND_MONEY: ['He who finds it keeps it - Confucious'],
  resale_bonus: ['What does this even mean?'],
  NEW_DAY: [
    'New day, same kingpin',
    'Another day, another candy dollar.',
    'The road to candy empire starts with one trade',
    'First one in, last one out.',
  ],
  LOSE_MONEY: [
    'Whats a Candy King without a couple of haters?',
    'Setback leads to comebacks!',
  ],
  INVENTORY_FULL: [
    "You can't carry any more!",
    "Your backpack's bursting with sweets.",
    'There is no space for candy in your backpack, unless we throw out some text books...?',
  ],
  PRICE_SPIKE: ['To the Moon!'],
  PRICE_DROP: ['Prices just plummeted!'],
  JOKER_UNLOCKED: [
    'You feel smarter... luckier... gum-ier.',
    'Things were never the same again',
    'That joker changed everything.',
  ],
  // HINT removed - hints now only come from generateSeededGameData event templates
  AFTERNOON: ['The afternoon bell rings...'],
  AFTER_SCHOOL: [
    'Home at last!',
    'So much time for activities!!',
    'The day is over, but your hustle starts again...',
    'We rest to travel further.',
    'The parking lot empties... but your mind is full of ideas.',
  ],
  PIGGY_BANK: ['Your piggy bank is getting heavy...', 'Feed the beast!!!'],
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
    'Morning sugar rush!',
    'Early bird gets the sour worms!',
    'Love the smell of sugar in the morning',
    'Mary broke up with Charlie because Jenny broke up with Johnny',
  ],
  LUNCH_RUSH: [
    'Lunch means dessert!',
    'Mid-day trading for a fast buck.',
    'Peak hour for peak trading',
    'Lunch chaos = candy opportunity!',
    'Lunch money burning holes in pockets...',
    'Mary said Johnny only like Jenny because Charlie said she liked him',
  ],
  FINAL_PERIOD: [
    'Last period - final trades of the day!',
    'School day ending - last chance for deals!',
    'Time to secure those final profits!',
    'Jenny said that Johnny said that Charlie said that Mary likes him',
    'Almost time to count your candy coins!',
  ],
  STUDY_TIME: [
    'Time to hit the books!',
    'Knowledge is power... and better jokers!',
    'Study hard, earn smarter tools.',
    'The lamplight flickers as you crack open your textbook.',
    'Tonight we study, tomorrow we hustle harder.',
  ],
  STUDY_COMPLETE: [
    "Nice work! You've earned your rest.",
    'Brain gains achieved. Sleep well, candy king.',
    'Another night, another lesson learned.',
    'Your mind is sharper now. Time to rest.',
  ],
  DELI_VISIT: [
    'The corner store awaits...',
    'Time to stock up on supplies!',
    'The deli owner nods as you walk in.',
    'What treasures await at the neighborhood store?',
    'Maybe they have something useful...',
  ],
  READY_FOR_SLEEP: [
    'Ready to call it a night?',
    'Time to rest up for tomorrow.',
    'The day is done. Sleep awaits.',
    "You've earned your rest, candy king.",
    'Another day in the books. Literally.',
  ],
  DEFAULT: ['Something interesting happens...'],
};

export const useFlavorText = () => {
  const dispatch = useAppDispatch();
  const flavorTextState = useAppSelector((state) => state.flavorText);

  const setEvent = useCallback(
    (event: FlavorEvent) => {
      const texts = flavorLibrary[event];
      if (!texts) {
        console.warn(`No flavor text found for event: ${event}`);
        const defaultTexts = flavorLibrary.DEFAULT;
        const randomText =
          defaultTexts[Math.floor(Math.random() * defaultTexts.length)];
        dispatch(setFlavorEvent({ event: 'DEFAULT', text: randomText }));
        return;
      }
      const randomText = texts[Math.floor(Math.random() * texts.length)];
      console.log(`🎭 [FlavorText] Setting event: ${event}, text: "${randomText}"`);
      dispatch(setFlavorEvent({ event, text: randomText }));
    },
    [dispatch]
  );

  const setManual = useCallback(
    (message: string) => {
      dispatch(setText(message));
    },
    [dispatch]
  );

  const setFlavorText = useCallback(
    (text: string) => {
      dispatch(setText(text));
    },
    [dispatch]
  );

  const setHintAction = useCallback(
    (hintText: string) => {
      dispatch(setHint(hintText));
    },
    [dispatch]
  );

  const resetFlavorTextAction = useCallback(() => {
    dispatch(resetFlavorText());
  }, [dispatch]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      text: flavorTextState.text,
      isHint: flavorTextState.isHint,
      eventType: flavorTextState.eventType,
      setEvent,
      setManual,
      setFlavorText,
      setHint: setHintAction,
      resetFlavorText: resetFlavorTextAction,
    }),
    [
      flavorTextState.text,
      flavorTextState.isHint,
      flavorTextState.eventType,
      setEvent,
      setManual,
      setFlavorText,
      setHintAction,
      resetFlavorTextAction,
    ]
  );
};
