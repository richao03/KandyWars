import React, { createContext, useContext, useEffect, useState } from 'react';
import { SpecialEventEffect } from '../../utils/generateSeededGameData';
import { useGame } from './GameContext';
import { useInventory } from './InventoryContext';
import { useSeed } from './SeedContext';
import { useWallet } from './WalletContext';

type EventHandlerContextType = {
  currentEvent: SpecialEventEffect | null;
  dismissEvent: () => void;
  hasActiveEvent: boolean;
  getTheme: (category: 'good' | 'neutral' | 'bad') => any;
};

// Helper functions for default event properties
const getDefaultCategory = (effect: string): 'good' | 'neutral' | 'bad' => {
  switch (effect) {
    case 'STASH_LOCKED': return 'bad';
    case 'PRICE_SPIKE': return 'good';
    case 'resale_bonus': return 'good';
    case 'PRICE_DROP': return 'neutral';
    default: return 'neutral';
  }
};

const getDefaultHeading = (effect: string): string => {
  switch (effect) {
    case 'STASH_LOCKED': return '🚨 BUSTED!';
    case 'PRICE_SPIKE': return '📈 MARKET SURGE!';
    case 'PRICE_DROP': return '📉 FIRE SALE';
    case 'resale_bonus': return '💰 HOT MARKET!';
    default: return '⚠️ SPECIAL EVENT';
  }
};

const getDefaultTitle = (effect: string, candy?: string): string => {
  switch (effect) {
    case 'STASH_LOCKED': return 'Teachers Found Your Stash';
    case 'PRICE_SPIKE': return candy ? `${candy} Prices Spiking!` : 'Candy Prices Are Rising';
    case 'PRICE_DROP': return candy ? `${candy} Prices Dropped!` : 'Candy Prices Have Dropped';
    case 'resale_bonus': return candy ? `${candy} Bonus Profits!` : 'Extra Profit Opportunity';
    default: return 'Special Event';
  }
};

const getDefaultSubtitle = (effect: string, candy?: string, multiplier?: number, fallbackDescription?: string): string => {
  if (candy && multiplier) {
    switch (effect) {
      case 'PRICE_SPIKE': 
        return `${candy} prices are ${multiplier > 1 ? `${multiplier}x higher` : `${(1/multiplier).toFixed(1)}x lower`} than usual!\nGreat time to sell if you have inventory.`;
      case 'PRICE_DROP': 
        return `${candy} prices have dropped to ${multiplier}x the normal price!\nPerfect opportunity to buy while it's cheap.`;
      case 'resale_bonus': 
        return `You can sell ${candy} for ${multiplier}x the normal profit!\nTime to cash in on your inventory.`;
    }
  }
  
  // Fallback to original description or generic messages
  if (fallbackDescription) return fallbackDescription;
  
  switch (effect) {
    case 'STASH_LOCKED': return 'Sometimes it be your own teachers...\nYour candy inventory has been confiscated!';
    case 'PRICE_SPIKE': return 'Demand is high! This is a great time to sell your inventory.';
    case 'PRICE_DROP': return 'Low prices mean great buying opportunities, but selling might not be profitable.';
    case 'resale_bonus': return 'Students are paying premium prices for candy today!';
    default: return 'Something special is happening...';
  }
};

const getDefaultBackgroundImage = (effect: string): any => {
  switch (effect) {
    case 'STASH_LOCKED': return require('../../assets/images/confiscate.png');
    default: return null;
  }
};

const getDefaultDismissText = (effect: string): string => {
  switch (effect) {
    case 'STASH_LOCKED': return '😤 Dang it!';
    case 'PRICE_SPIKE': return '💰 Nice!';
    case 'PRICE_DROP': return '👍 Got it!';
    case 'resale_bonus': return '🎉 Sweet!';
    default: return '👍 Got it!';
  }
};

const getDefaultCallback = (
  effect: string, 
  removeAllFromInventory: () => void, 
  confiscateStash: () => number,
  candy?: string,
  multiplier?: number,
  period?: number,
  modifyCandyPrice?: (candyName: string, period: number, newPrice: number) => void,
  getOriginalCandyPrice?: (candyName: string, period: number) => number,
  priceOverride?: number
): (() => void) | undefined => {
  switch (effect) {
    case 'STASH_LOCKED': 
      return () => {
        removeAllFromInventory();
        confiscateStash();
      };
    case 'PRICE_SPIKE':
    case 'PRICE_DROP':
    case 'resale_bonus':
      // Apply price multiplier if candy and multiplier are specified, but not if priceOverride exists
      if (candy && multiplier && period !== undefined && modifyCandyPrice && getOriginalCandyPrice && priceOverride === undefined) {
        return () => {
          const originalPrice = getOriginalCandyPrice(candy, period);
          const newPrice = originalPrice * multiplier;
          modifyCandyPrice(candy, period, parseFloat(newPrice.toFixed(2)));
          console.log(`Applied multiplier ${multiplier} to ${candy} for period ${period}: ${originalPrice} → ${newPrice.toFixed(2)}`);
        };
      }
      return undefined;
    default: 
      return undefined;
  }
};

// Theme configurations for different event categories
const getThemeForCategory = (category: 'good' | 'neutral' | 'bad') => {
  const themes = {
    good: {
      backgroundColor: '#f0fff4',
      borderColor: '#22c55e',
      buttonColor: '#22c55e',
      textColor: '#ffffff',
      titleColor: '#ffffff',
      containerColor: 'rgba(50,50,50,0.3)',
    },
    neutral: {
      backgroundColor: '#f8f9fa',
      borderColor: '#6c757d',
      buttonColor: '#6c757d',
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
  const { confiscateStash } = useWallet();
  const [currentEvent, setCurrentEvent] = useState<SpecialEventEffect | null>(
    null
  );
  const [processedEvents, setProcessedEvents] = useState<Set<string>>(
    new Set()
  );
  const [lastDay, setLastDay] = useState(day);
  const [isProcessingEvent, setIsProcessingEvent] = useState(false);

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
          category: matchingEvent.category || getDefaultCategory(matchingEvent.effect),
          heading: matchingEvent.heading || getDefaultHeading(matchingEvent.effect),
          title: matchingEvent.title || getDefaultTitle(matchingEvent.effect, matchingEvent.candy),
          subtitle: matchingEvent.subtitle || getDefaultSubtitle(matchingEvent.effect, matchingEvent.candy, matchingEvent.multiplier, matchingEvent.description),
          backgroundImage: matchingEvent.backgroundImage || getDefaultBackgroundImage(matchingEvent.effect),
          dismissText: matchingEvent.dismissText || getDefaultDismissText(matchingEvent.effect),
          callback: matchingEvent.callback || getDefaultCallback(
            matchingEvent.effect, 
            removeAllFromInventory, 
            confiscateStash,
            matchingEvent.candy,
            matchingEvent.multiplier,
            matchingEvent.period,
            modifyCandyPrice,
            getOriginalCandyPrice,
            matchingEvent.priceOverride
          )
        };
        
        setCurrentEvent(eventWithDefaults);
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

      // Execute the event's callback if it exists
      if (currentEvent.callback) {
        currentEvent.callback();
      }

      // Clear the event and reset processing flag
      setCurrentEvent(null);
      setIsProcessingEvent(false);
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
