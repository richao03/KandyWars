import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type FlavorEvent =
  | 'STASH_LOCKED'
  | 'NEW_DAY'
  | 'INVENTORY_FULL'
  | 'PRICE_SPIKE'
  | 'FOUND_MONEY'
  | 'PRICE_DROP'
  | 'JOKER_UNLOCKED'
  | 'resale_bonus'
  | 'AFTERNOON'
  | 'AFTER_SCHOOL'
  | 'PIGGY_BANK'
  | 'LOSE_MONEY'
  | 'PERIOD_CHANGE'
  | 'MORNING_TRADE'
  | 'LUNCH_RUSH'
  | 'FINAL_PERIOD'
  | 'DEFAULT';

interface FlavorTextState {
  text: string;
  isHint: boolean;
  eventType: FlavorEvent | null;
}

const initialState: FlavorTextState = {
  text: '',
  isHint: false,
  eventType: null,
};

const flavorTextSlice = createSlice({
  name: 'flavorText',
  initialState,
  reducers: {
    setText: (state, action: PayloadAction<string>) => {
      state.text = action.payload;
    },
    setIsHint: (state, action: PayloadAction<boolean>) => {
      state.isHint = action.payload;
    },
    setEventType: (state, action: PayloadAction<FlavorEvent | null>) => {
      state.eventType = action.payload;
    },
    setFlavorEvent: (state, action: PayloadAction<{ event: FlavorEvent; text: string }>) => {
      state.eventType = action.payload.event;
      state.text = action.payload.text;
      state.isHint = false;
    },
    setHint: (state, action: PayloadAction<string>) => {
      state.text = action.payload;
      state.isHint = true;
      state.eventType = null; // Hints don't have an event type, they're custom text
    },
    resetFlavorText: (state) => {
      state.text = '';
      state.isHint = false;
      state.eventType = null;
    },
  },
});

export const {
  setText,
  setIsHint,
  setEventType,
  setFlavorEvent,
  setHint,
  resetFlavorText,
} = flavorTextSlice.actions;

export default flavorTextSlice.reducer;