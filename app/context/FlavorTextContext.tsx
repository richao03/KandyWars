import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type FlavorTextContextType = {
  text: string;
  setEvent: (event: FlavorEvent) => void;
  setManual: (message: string) => void;
  setFlavorText: (text: string) => void;
  setHint: (hintText: string) => void;
};

type FlavorEvent =
  | "STASH_LOCKED"
  | "NEW_DAY"
  | "INVENTORY_FULL"
  | "PRICE_SPIKE"
  | "PRICE_DROP"
  | "JOKER_UNLOCKED"
  | "HINT"
  | "AFTERNOON"
  | "DEFAULT"; // fallback for ambient

const flavorLibrary: Record<FlavorEvent, string[]> = {
  STASH_LOCKED: [
    "Someone ratted you out, your stash was confiscated",
    "What a candy king without a couple of haters?, your stash was confiscated",
  ],
  NEW_DAY: [
    "New day, new sugar rush.",
    "You zip up your backpack. Time to hustle.",
    "New day, same kingpin",
  ],
  INVENTORY_FULL: [
    "You can't carry any more!",
    "Your backpack's bursting with sweets.",
    "There is no space for candy in your backpack, unless we throw out some text books...?",
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
  HINT: [
    "You overhear something interesting...",
    "There's buzz about something happening next period...",
    "Someone whispers about an opportunity coming up...",
  ],
  AFTERNOON: [
    "The afternoon sun streams through your window.",
    "School's out, but the candy business never sleeps.",
    "Time to count today's profits in the golden hour.",
    "The street lamps flicker to life as evening approaches.",
    "Your backpack feels lighter without textbooks, heavier with possibilities.",
    "The neighborhood deli calls your name.",
    "Homework can wait — there's money to be made.",
    "The after-school crowd is your most loyal customers.",
    "You catch the scent of dinner cooking next door.",
    "This is when the real deals happen.",
    "The candy market never closes in your mind.",
    "Your piggy bank rattles with today's earnings.",
    "Street lights dance shadows across your candy stash.",
    "Tomorrow's another day to build your empire.",
    "The evening air tastes sweeter with success.",
    "You plot tomorrow's moves under the lamplight.",
    "Time to study... the candy market, that is.",
    "The after-school hustle begins now.",
    "Your mom calls for dinner, but first — business.",
    "The golden hour is perfect for counting coins.",
    "You wonder what new flavors tomorrow will bring.",
    "The deli owner knows your name and your order.",
    "This quiet time is when legends are made.",
    "The streetlights witness your candy empire growing.",
    "Every wrapper tells a story of profit.",
    "The evening breeze carries whispers of tomorrow's deals.",
  ],
  DEFAULT: [
    "The halls smell like sour sugar.",
    "A teacher gives you the side-eye, they might be on to something",
    "Is it true that Natalie might like like Roy?",
    "Someone dropped a Warhead by the water fountain, again.",
    "The hallway whispers that Roy might like like Natalie too!",
    "Heavy is the head that wears the candy king crown",
    "Another bell rings. What’s your move?",
    "The hallway buzzes with candy deals.",
    "New period, who dis?",
    "Someone’s locker smells like bubblegum and secrets.",
    "You hear a crinkle — someone’s unwrapping candy two rows over.",
    "The janitor sweeps up a trail of Skittles. Again.",
    "Your pencil case is suspiciously sticky.",
    "There's a rumor the math teacher confiscated a whole bag of Sour Patch.",
    "Someone just paid for a pencil… in gum.",
    "You spot a scribbled candy price list in the back of your notebook.",
    "The vending machine ate someone’s dollar. It might be personal.",
    "There’s a line outside the nurse’s office — sugar crash victims, maybe.",
    "You overhear `Gum is selling for double in Gym class.`",
    "The principal made an announcement about “suspicious sugar activity.",
    "Someone’s trading Warheads for answers to the quiz.",
    "There’s a secret candy stash behind the library globe.",
    "Someone’s got a fresh haul — the rustle of wrappers is unmistakable.",

    "Rumor has it Roy got detention for selling gum during English.",

    "You notice a new kid with a serious Snickers supply.",

    "There's a faded `Candy King 2023` badge on your backpack.",

    "A teacher confiscated candy and muttered, `Again with the gum?`",

    "A desk drawer smells like sour apple.",

    "You swear you heard wrappers rustling under someone’s hoodie.",

    "Someone's repackaging candy to avoid suspicion. Genius.",

    "Natalie’s passing notes with candy recommendations.",

    "You find a scribbled “Buy low, sell sweet” note in your planner.",

    "The rumor mill says Sour Patch will spike by next period.",

    "You see a “NO CANDY” poster… and smile.",

    "The AV cart is mysteriously stocked with chocolate bars.",

    "A hallway poster says “Got Candy?” in marker.",

    "You can’t focus — someone near you smells like watermelon Jolly Ranchers.",

    "The playground has a new candy meet-up spot behind the slide.",

    "Someone's whispering about a shipment of rare Swedish Fish.",

    "Your homeroom smells like a candy store.",

    "Someone’s got a candy wrapper origami business on the side.",

    "A warhead challenge is happening near the gym.",

    "Someone left M&Ms in your locker. Was it a gift… or bait?",

    "The halls are tense — candy prices are volatile today.",

    "You find a gum wrapper folded like a secret message.",

    "There’s a sugar tax rumor going around.",

    "Your backpack zipper is stuck — too many sweets inside?",

    "`If caught, we were never here.` – the Candy Cartel Code.",
  ],
};

const FlavorTextContext = createContext<FlavorTextContextType | undefined>(
  undefined
);

export const FlavorTextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentEvent, setCurrentEvent] = useState("DEFAULT");
  const [text, setText] = useState(getRandomFlavor("DEFAULT"));

  // Removed problematic interval that was causing unnecessary re-renders

  function getRandomFlavor(type: FlavorEvent): string {
    const lines = flavorLibrary[type];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  const setEvent = useCallback((event: FlavorEvent) => {
    setText(getRandomFlavor(event));
  }, []);

  const setManual = useCallback((message: string) => {
    setText(message);
  }, []);

  const setFlavorText = useCallback((text: string) => {
    setText(text);
  }, []);

  const setHint = useCallback((hintText: string) => {
    setText(hintText);
  }, []);

  const contextValue = useMemo(() => ({
    text,
    setEvent,
    setManual,
    setFlavorText,
    setHint
  }), [text, setEvent, setManual, setFlavorText, setHint]);

  return (
    <FlavorTextContext.Provider value={contextValue}>
      {children}
    </FlavorTextContext.Provider>
  );
};

export const useFlavorText = (): FlavorTextContextType => {
  const context = useContext(FlavorTextContext);
  if (!context) {
    throw new Error("useFlavorText must be used within FlavorTextProvider");
  }
  return context;
};
