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
  processedEventIds: string[];
}

const initialState: EventHandlerState = {
  currentEvent: null,
  eventHistory: [],
  isProcessing: false,
  processedEventIds: [],
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

        // Keep only last 10 events to prevent unbounded growth
        if (state.eventHistory.length > 10) {
          state.eventHistory = state.eventHistory.slice(-10);
        }

        // Track this event as processed
        const eventData = action.payload as any;
        if (eventData.period && eventData.effect && eventData.title) {
          const eventId = `${eventData.period}_${eventData.effect}_${eventData.title}`;
          if (!state.processedEventIds.includes(eventId)) {
            state.processedEventIds.push(eventId);
          }
        }
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
      state.processedEventIds = [];
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