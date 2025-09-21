import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface EventData {
  type: string;
  payload?: any;
  timestamp?: number;
}

interface EventHandlerState {
  currentEvent: EventData | null;
  eventHistory: EventData[];
  isProcessing: boolean;
}

const initialState: EventHandlerState = {
  currentEvent: null,
  eventHistory: [],
  isProcessing: false,
};

const eventHandlerSlice = createSlice({
  name: 'eventHandler',
  initialState,
  reducers: {
    setCurrentEvent: (state, action: PayloadAction<EventData | null>) => {
      state.currentEvent = action.payload;
      if (action.payload) {
        state.eventHistory.push({
          ...action.payload,
          timestamp: Date.now(),
        });
      }
    },
    clearCurrentEvent: (state) => {
      state.currentEvent = null;
    },
    setIsProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    addToEventHistory: (state, action: PayloadAction<EventData>) => {
      state.eventHistory.push({
        ...action.payload,
        timestamp: Date.now(),
      });
    },
    clearEventHistory: (state) => {
      state.eventHistory = [];
    },
    resetEventHandler: () => initialState,
  },
});

export const {
  setCurrentEvent,
  clearCurrentEvent,
  setIsProcessing,
  addToEventHistory,
  clearEventHistory,
  resetEventHandler,
} = eventHandlerSlice.actions;

export default eventHandlerSlice.reducer;