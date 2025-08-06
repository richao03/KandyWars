import React, { createContext, useContext, useEffect, useState } from 'react';

type FlavorTextContextType = {
  text: string;
  setEvent: (event: FlavorEvent) => void;
  setManual: (message: string) => void;
  setFlavorText: (text: string) => void;
};

type FlavorEvent =
  | 'NEW_PERIOD'
  | 'STASH_LOCKED'
  | 'NEW_DAY'
  | 'INVENTORY_FULL'
  | 'PRICE_SPIKE'
  | 'PRICE_DROP'
  | 'JOKER_UNLOCKED'
  | 'DEFAULT'; // fallback for ambient

const flavorLibrary: Record<FlavorEvent, string[]> = {
  STASH_LOCKED: [
    "Someone ratted us out!!",
    "What a candy king without a couple of haters?"
  ],
  NEW_PERIOD: [
    "Another bell rings. What’s your move?",
    "The hallway buzzes with candy deals.",
    "New period, who dis?"
  ],
  NEW_DAY: [
    "New day, new sugar rush.",
    "You zip up your backpack. Time to hustle.",
    "New day, same kingpin"
  ],
  INVENTORY_FULL: [
    "You can't carry any more!",
    "Your backpack’s bursting with sweets.",
    "There is no space for candy in your backpack, unless we throw out some text books...?"
  ],
  PRICE_SPIKE: [
    "Whoa! Gum just tripled in value!",
    "Bubble Gum prices are off the charts!",
  ],
  PRICE_DROP: [
    "Skittles are dirt cheap right now...",
    "Time to stock up — prices just plummeted.",
  ],
  JOKER_UNLOCKED: [
    "You feel smarter... luckier... gum-ier.",
    "Things were never the same again",
    "That joker changed everything.",
  ],
  DEFAULT: [
    "The halls smell like sour sugar.",
    "A teacher gives you the side-eye, they might be on to something",
    "Is it true that Natalie might like like Roy?",
    "Someone dropped a Warhead by the water fountain, again.",
    "The hallway whispers that Roy might like like Natalie too!",
    "Heavy is the head that wears the candy king crown"
  ],
};

const FlavorTextContext = createContext<FlavorTextContextType | undefined>(undefined);

export const FlavorTextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentEvent, setCurrentEvent] = useState("DEFAULT")
  const [text, setText] = useState(getRandomFlavor('DEFAULT'));

  useEffect(() => {
    if (currentEvent == "DEFAULT") {
      const interval = setInterval(() => {
        setEvent('DEFAULT');
        return () => clearInterval(interval);
      }, 30000);
    } // every 30 seconds of idle?
  }, []);

  function getRandomFlavor(type: FlavorEvent): string {
    const lines = flavorLibrary[type];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  const setEvent = (event: FlavorEvent) => {
    console.log("wbat is event", event)
    setText(getRandomFlavor(event));
  };

  const setManual = (message: string) => {
    setText(message);
  };

  return (
    <FlavorTextContext.Provider value={{ text, setEvent, setManual }}>
      {children}
    </FlavorTextContext.Provider>
  );
};

export const useFlavorText = (): FlavorTextContextType => {
  const context = useContext(FlavorTextContext);
  if (!context) {
    throw new Error('useFlavorText must be used within FlavorTextProvider');
  }
  return context;
};
