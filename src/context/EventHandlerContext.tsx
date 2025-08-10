import React, { createContext, useContext, useEffect, useState } from 'react';
import { SpecialEventEffect } from '../../utils/generateSeededGameData';
import { useGame } from './GameContext';
import { useInventory } from './InventoryContext';
import { useSeed } from './SeedContext';
import { useWallet } from './WalletContext';
import { saveProcessedEvents, loadProcessedEvents } from '../utils/persistence';

type EventHandlerContextType = {
  currentEvent: SpecialEventEffect | null;
  dismissEvent: () => void;
  hasActiveEvent: boolean;
  getTheme: (category: 'good' | 'neutral' | 'bad') => any;
};

const getDefaultHeading = (effect: string): string => {
  switch (effect) {
    case 'STASH_LOCKED':
      return '🚨 BUSTED!';
    case 'PRICE_SPIKE':
      return '📈 MARKET SURGE!';
    case 'PRICE_DROP':
      return '📉 FIRE SALE';
    case 'resale_bonus':
      return '💰 HOT MARKET!';
    default:
      return '⚠️ SPECIAL EVENT';
  }
};

// Theme configurations for different event categories
const getThemeForCategory = (category: 'good' | 'neutral' | 'bad') => {
  console.log('category', category);
  const themes = {
    good: {
      backgroundColor: '#f0fff4',
      borderColor: '#22c55e',
      buttonColor: 'rgba(50,220,50,0.3)',
      textColor: '#ffffff',
      titleColor: '#ffffff',
      containerColor: 'rgba(50,50,50,0.3)',
    },
    neutral: {
      backgroundColor: '#f8f9fa',
      borderColor: '#6c757d',
      buttonColor: 'rgba(50,50,50,0.3)',
      textColor: '#ffffff',
      titleColor: '#ffffff',
      containerColor: 'rgba(50,50,50,0.3)',
    },
    bad: {
      backgroundColor: '#fff5f5',
      borderColor: '#dc3545',
      buttonColor: 'rgba(220,50,50,0.3)',
      textColor: '#ffffff',
      titleColor: '#ffffff',
      containerColor: 'rgba(50,50,50,0.3)',
    },
  };
  return themes[category];
};

const EventHandlerContext = createContext<EventHandlerContextType | undefined>(
  undefined
);

export const EventHandlerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { periodCount, currentLocation, day } = useGame();
  const { gameData, modifyCandyPrice, getOriginalCandyPrice } = useSeed();
  const { removeAllFromInventory } = useInventory();
  const { confiscateStash, add: addToWallet } = useWallet();
  const [currentEvent, setCurrentEvent] = useState<SpecialEventEffect | null>(
    null
  );
  const [processedEvents, setProcessedEvents] = useState<Set<string>>(
    new Set()
  );
  const [lastDay, setLastDay] = useState(day);
  const [isProcessingEvent, setIsProcessingEvent] = useState(false);
  const [isEventsLoaded, setIsEventsLoaded] = useState(false);

  // Load processed events on mount
  useEffect(() => {
    const loadProcessedEventsData = async () => {
      const savedEvents = await loadProcessedEvents();
      setProcessedEvents(savedEvents);
      setIsEventsLoaded(true);
      console.log('Processed events loaded:', savedEvents);
    };

    loadProcessedEventsData();
  }, []);

  // Save processed events whenever they change
  useEffect(() => {
    if (!isEventsLoaded) return; // Don't save during initial load
    saveProcessedEvents(processedEvents);
  }, [processedEvents, isEventsLoaded]);

  // Reset processed events when a new day starts
  useEffect(() => {
    if (day !== lastDay) {
      setProcessedEvents(new Set());
      setLastDay(day);
    }
  }, [day, lastDay]);

  useEffect(() => {
    // Check for events that match current period and location
    let matchingEvent = gameData.periodEvents.find(
      (event) =>
        event.period === periodCount &&
        (!event.location || event.location === currentLocation)
    );

    if (matchingEvent) {
      console.log('Found matching event:', matchingEvent);
      let eventKey = `${matchingEvent.period}-${matchingEvent.effect}-${matchingEvent.location || 'any'}`;

      // Handle test event
      if (matchingEvent.description?.startsWith('TEST:')) {
        eventKey = 'test-stash-locked';
      }

      // Only process events that require modal interaction (like STASH_LOCKED)

      if (
        !processedEvents.has(eventKey) &&
        !currentEvent &&
        !isProcessingEvent
      ) {
        console.log('Setting current event to:', matchingEvent);
        setIsProcessingEvent(true);

        // Add default modal properties to the event if they don't exist
        const eventWithDefaults = {
          ...matchingEvent,
          category: matchingEvent.category,
          heading: matchingEvent.heading,
          title: matchingEvent.title,
          subtitle: matchingEvent.subtitle,
          backgroundImage: matchingEvent.backgroundImage,
          dismissText: matchingEvent.dismissText,
          callback: matchingEvent.callback,
        };

        // Small delay to prevent flash when transitioning between periods
        setTimeout(() => {
          setCurrentEvent(eventWithDefaults);
        }, 500);
      }
    } else {
      console.log(
        'No matching event found for period:',
        periodCount,
        'location:',
        currentLocation
      );
    }
  }, [periodCount, currentLocation, gameData.periodEvents]);

  const processEvent = (event: SpecialEventEffect) => {
    switch (event.effect) {
      case 'STASH_LOCKED':
        // Confiscate all stashed money
        break;

      case 'PRICE_SPIKE':
      case 'PRICE_DROP':
        // These are already handled by flavor text system
        break;

      case 'resale_bonus':
        // This would need to be handled by market system
        break;
    }
  };

  const dismissEvent = () => {
    if (currentEvent) {
      console.log('EventHandler - Dismissing event:', currentEvent);
      const eventKey = `${currentEvent.period}-${currentEvent.effect}-${currentEvent.location || 'any'}`;

      // Mark this event as processed so it doesn't show again
      setProcessedEvents((prev) => new Set([...prev, eventKey]));
      console.log('gameData', gameData);
      console.log('current event', currentEvent);
      // Handle effect-specific actions
      switch (currentEvent.effect) {
        case 'STASH_LOCKED':
          removeAllFromInventory();
          break;
        case 'FOUND_MONEY':
          addToWallet(currentEvent.dollarAmount);
          break;
        case 'PRICE_DROP':
          modifyCandyPrice(currentEvent?.candy, periodCount, 1);
          break;
        case 'PRICE_SPIKE':
          modifyCandyPrice(
            currentEvent?.candy,
            periodCount,
            gameData.candyPrices[currentEvent?.candy][periodCount] *
              currentEvent.multiplier
          );
        // Add other effect handlers here as needed
      }

      // Execute the event's callback if it exists (for custom logic)
      if (
        currentEvent.callback &&
        typeof currentEvent.callback === 'function'
      ) {
        currentEvent.callback();
      }

      // Clear the event and reset processing flag with a slight delay to prevent flash
      setTimeout(() => {
        setCurrentEvent(null);
        setIsProcessingEvent(false);
      }, 300); // Small delay to smooth transition
      console.log('EventHandler - Event dismissed and cleared');
    }
  };

  return (
    <EventHandlerContext.Provider
      value={{
        currentEvent,
        dismissEvent,
        hasActiveEvent: !!currentEvent,
        getTheme: getThemeForCategory,
      }}
    >
      {children}
    </EventHandlerContext.Provider>
  );
};

export const useEventHandler = (): EventHandlerContextType => {
  const context = useContext(EventHandlerContext);
  if (!context) {
    throw new Error('useEventHandler must be used within EventHandlerProvider');
  }
  return context;
};
