import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetGame, startNewDay } from './gameSlice';

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
  lastConfiscationDay: number | null;
  // Day number for which Detention Dodge grants full event immunity.
  // When === current day, handleEvent short-circuits before any effect applies.
  detentionDodgeActiveDay: number | null;
}

const initialState: EventHandlerState = {
  currentEvent: null,
  eventHistory: [],
  isProcessing: false,
  processedEventIds: [],
  lastConfiscationDay: null,
  detentionDodgeActiveDay: null,
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

            // Keep only last 100 event IDs to prevent unbounded memory growth
            if (state.processedEventIds.length > 100) {
              state.processedEventIds = state.processedEventIds.slice(-100);
            }
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
    markConfiscationDay: (state, action: PayloadAction<number>) => {
      state.lastConfiscationDay = action.payload;
    },
    activateDetentionDodge: (state, action: PayloadAction<number>) => {
      state.detentionDodgeActiveDay = action.payload;
    },
    clearDetentionDodge: (state) => {
      state.detentionDodgeActiveDay = null;
    },
    resetEventHandler: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, () => initialState);
    // Clear Detention Dodge immunity when a new day begins.
    builder.addCase(startNewDay, (state) => {
      state.detentionDodgeActiveDay = null;
    });
  },
});

export const {
  setCurrentEvent,
  clearCurrentEvent,
  setIsProcessing,
  addToEventHistory,
  clearEventHistory,
  markConfiscationDay,
  activateDetentionDodge,
  clearDetentionDodge,
  resetEventHandler,
} = eventHandlerSlice.actions;

export default eventHandlerSlice.reducer;

// Named field selectors for useEventHandler hook optimization
export const selectCurrentEvent = (state: { eventHandler: EventHandlerState }) => state.eventHandler.currentEvent;
export const selectEventHistory = (state: { eventHandler: EventHandlerState }) => state.eventHandler.eventHistory;
export const selectIsEventProcessing = (state: { eventHandler: EventHandlerState }) => state.eventHandler.isProcessing;
export const selectProcessedEventIds = (state: { eventHandler: EventHandlerState }) => state.eventHandler.processedEventIds;
export const selectLastConfiscationDay = (state: { eventHandler: EventHandlerState }) => state.eventHandler.lastConfiscationDay;
export const selectDetentionDodgeActiveDay = (state: { eventHandler: EventHandlerState }) => state.eventHandler.detentionDodgeActiveDay;