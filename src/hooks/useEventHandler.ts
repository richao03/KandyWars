import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setCurrentEvent,
  clearCurrentEvent,
  setIsProcessing,
  addToEventHistory,
  clearEventHistory,
  resetEventHandler,
} from '../store/slices/eventHandlerSlice';

export const useEventHandler = () => {
  const dispatch = useAppDispatch();
  const eventHandlerState = useAppSelector(state => state.eventHandler);

  const handleEvent = useCallback((eventData: any) => {
    dispatch(setCurrentEvent(eventData));
  }, [dispatch]);

  const clearEvent = useCallback(() => {
    dispatch(clearCurrentEvent());
  }, [dispatch]);

  const setProcessing = useCallback((isProcessing: boolean) => {
    dispatch(setIsProcessing(isProcessing));
  }, [dispatch]);

  const addHistoryEntry = useCallback((eventData: any) => {
    dispatch(addToEventHistory(eventData));
  }, [dispatch]);

  const clearHistory = useCallback(() => {
    dispatch(clearEventHistory());
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(resetEventHandler());
  }, [dispatch]);

  const hasActiveEvent = useCallback(() => {
    return eventHandlerState.currentEvent !== null;
  }, [eventHandlerState.currentEvent]);

  return {
    currentEvent: eventHandlerState.currentEvent,
    eventHistory: eventHandlerState.eventHistory,
    isProcessing: eventHandlerState.isProcessing,
    hasActiveEvent,
    handleEvent,
    clearEvent,
    setProcessing,
    addHistoryEntry,
    clearHistory,
    reset,
  };
};