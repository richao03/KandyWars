import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useGame } from '../../src/hooks/useGame';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { ECONOMY_JOKERS } from '../../src/utils/jokerEffectEngine';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import GameModal, { useGameModal } from '../components/GameModal';
import JokerSelection from '../components/JokerSelection';
import MinigameHUD from '../components/MinigameHUD';
import PixelBorder from '../components/PixelBorder';
import TextWithEmojis from '../components/TextWithEmojis';

/** =========================
 *  Types
 *  ========================= */
type Item =
  | 'Chocolate'
  | 'Lollipop'
  | 'Cookie'
  | 'Cake'
  | 'Candy'
  | 'Donut'
  | 'Cupcake';
type Inventory = Partial<Record<Item, number>>;
type TradeTile = {
  id: string;
  give: Inventory;
  get: Inventory;
  label: string; // "Chocolate → Cake" (item names, not emojis)
  source: 'palette' | 'slot';
};
type Puzzle = {
  startInventory: Inventory;
  goal: Item;
  tiles: TradeTile[];
  steps: number;
};

interface EconomyGameProps {
  onComplete: () => void;
}

/** =========================
 *  Candy catalog
 *  ========================= */
const CATALOG: Record<Item, string> = {
  Chocolate: '🍫',
  Lollipop: '🍭',
  Cookie: '🍪',
  Cake: '🍰',
  Candy: '🍬',
  Donut: '🍩',
  Cupcake: '🧁',
};
const ALL_ITEMS: Item[] = Object.keys(CATALOG) as Item[];

/** =========================
 *  Trade Label Component (renders PNG images)
 *  ========================= */
const TradeLabel = ({ label, style }: { label: string; style?: any }) => {
  // Label format: "Chocolate → Cake"
  const [giveItem, getItem] = label.split(' → ');
  const giveEmoji = CATALOG[giveItem as Item] || '';
  const getEmoji = CATALOG[getItem as Item] || '';

  return (
    <View>
      <TextWithEmojis style={style} imageSize={20}>
        {`${giveEmoji} → ${getEmoji}`}
      </TextWithEmojis>
    </View>
  );
};

// Economy Trading jokers

/** =========================
 *  Seeded RNG
 *  ========================= */
function strHash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function makePRNG(seedString: string) {
  return mulberry32(strHash32(seedString));
}
function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pick<T>(rng: () => number, arr: T[], exclude: T[] = []): T {
  const pool = arr.filter((a) => !exclude.includes(a));
  return pool[Math.floor(rng() * pool.length)];
}

/** =========================
 *  Inventory helpers
 *  ========================= */
function qty(n: number, it: Item) {
  return `${n} ${CATALOG[it]}`;
}
function fmtInv(inv: Inventory): string {
  const parts: string[] = [];
  for (const [item, amount] of Object.entries(inv)) {
    if (!amount) continue;
    const it = item as Item;
    parts.push(qty(amount, it));
  }
  return parts.join(' + ');
}
function canAfford(inv: Inventory, cost: Inventory): boolean {
  return Object.entries(cost).every(([name, need]) => {
    const it = name as Item;
    return (inv[it] || 0) >= (need || 0);
  });
}
function applyTrade(inv: Inventory, trade: TradeTile): Inventory {
  const out: Inventory = { ...inv };
  for (const [name, amount] of Object.entries(trade.give)) {
    const it = name as Item;
    out[it] = (out[it] || 0) - (amount || 0);
    if ((out[it] || 0) <= 0) delete out[it];
  }
  for (const [name, amount] of Object.entries(trade.get)) {
    const it = name as Item;
    out[it] = (out[it] || 0) + (amount || 0);
  }
  return out;
}

/** =========================
 *  Generator (multi-step trading)
 *  ========================= */
function generatePuzzle(levelIndex: number): Puzzle {
  const config = LEVEL_CONFIG[levelIndex];
  // Use true Math.random() for genuine randomness
  const rng = () => Math.random();

  // Pick goal item and create trading chain
  const goal: Item = pick(rng, ALL_ITEMS);
  const chainItems: Item[] = [goal];

  // Build chain backwards: goal <- item(n-1) <- ... <- item1 <- startItem
  // For config.solutionSteps trades, we need config.solutionSteps + 1 items in the chain
  for (let i = 0; i < config.solutionSteps; i++) {
    const nextItem = pick(rng, ALL_ITEMS, chainItems);
    chainItems.unshift(nextItem);
  }

  // Create the solution trades (always 1 for 1) with random IDs
  const solutionTrades: TradeTile[] = [];
  for (let i = 0; i < config.solutionSteps; i++) {
    const giveItem = chainItems[i];
    const getItem = chainItems[i + 1];
    const randomId = Math.floor(Math.random() * 1000000); // Random ID to prevent sorting patterns

    solutionTrades.push({
      id: `trade-${randomId}-${giveItem}-${getItem}`,
      give: { [giveItem]: 1 },
      get: { [getItem]: 1 },
      label: `${giveItem} → ${getItem}`,
      source: 'palette',
    });
  }

  // Starting inventory is what we need for the first trade
  const startInventory: Inventory = { ...solutionTrades[0].give };

  // Generate dummy trades
  const dummyTrades: TradeTile[] = [];
  const usedItems = new Set(chainItems);

  // Helper function to check if a trade creates a shortcut
  const createsShortcut = (give: Item, get: Item): boolean => {
    const giveIndex = chainItems.indexOf(give);
    const getIndex = chainItems.indexOf(get);

    // If both items are in the chain
    if (giveIndex !== -1 && getIndex !== -1) {
      // Check if this trade would skip steps (get is more than 1 step ahead of give)
      if (getIndex > giveIndex + 1) {
        return true; // Shortcut detected
      }
    }

    // Check if this creates a direct path to goal from start inventory
    if (getIndex !== -1 && Object.keys(startInventory).includes(give)) {
      // If we can reach an item in the chain that's more than 1 step from start
      if (getIndex > 1) {
        return true;
      }
    }

    return false;
  };

  for (let i = 0; i < config.dummyTrades; i++) {
    // Pick items not in the solution chain for dummy trades
    const availableItems = ALL_ITEMS.filter((item) => !usedItems.has(item));
    if (availableItems.length < 2) {
      // If we run out of unused items, reuse items but avoid creating shortcuts
      let giveItem: Item;
      let getItem: Item;
      let attempts = 0;

      do {
        giveItem = pick(rng, ALL_ITEMS);
        getItem = pick(rng, ALL_ITEMS, [giveItem]);
        attempts++;
        if (attempts > 100) break; // Prevent infinite loop
      } while (createsShortcut(giveItem, getItem));

      if (attempts > 100) continue; // Skip this dummy trade if we can't find a valid one

      const randomId = Math.floor(Math.random() * 1000000);
      dummyTrades.push({
        id: `trade-${randomId}-${giveItem}-${getItem}`,
        give: { [giveItem]: 1 },
        get: { [getItem]: 1 },
        label: `${giveItem} → ${getItem}`,
        source: 'palette',
      });
      continue;
    }

    const giveItem = pick(rng, availableItems);
    const getItem = pick(rng, availableItems, [giveItem]);

    const randomId = Math.floor(Math.random() * 1000000);
    dummyTrades.push({
      id: `trade-${randomId}-${giveItem}-${getItem}`,
      give: { [giveItem]: 1 },
      get: { [getItem]: 1 },
      label: `${giveItem} → ${getItem}`,
      source: 'palette',
    });

    usedItems.add(giveItem);
    usedItems.add(getItem);
  }

  // Randomly interleave solution and dummy trades instead of concatenating
  const allTrades: TradeTile[] = [];
  const solutionCopy = [...solutionTrades];
  const dummyCopy = [...dummyTrades];

  // Randomly pick from either solution or dummy trades to build the array
  while (solutionCopy.length > 0 || dummyCopy.length > 0) {
    if (solutionCopy.length > 0 && dummyCopy.length > 0) {
      // Both arrays have items, randomly pick one
      if (Math.random() < 0.5) {
        allTrades.push(solutionCopy.shift()!);
      } else {
        allTrades.push(dummyCopy.shift()!);
      }
    } else if (solutionCopy.length > 0) {
      // Only solution trades left
      allTrades.push(solutionCopy.shift()!);
    } else {
      // Only dummy trades left
      allTrades.push(dummyCopy.shift()!);
    }
  }

  // Still do multiple shuffle passes for extra randomization
  for (let pass = 0; pass < 5; pass++) {
    // Fisher-Yates shuffle
    for (let i = allTrades.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTrades[i], allTrades[j]] = [allTrades[j], allTrades[i]];
    }

    // Additional random swaps
    for (let i = 0; i < allTrades.length * 3; i++) {
      const a = Math.floor(Math.random() * allTrades.length);
      const b = Math.floor(Math.random() * allTrades.length);
      [allTrades[a], allTrades[b]] = [allTrades[b], allTrades[a]];
    }
  }

  // Debug: Log the generated puzzle details
  console.log(`🎲 Level ${levelIndex + 1} Puzzle Generated:`);
  console.log(
    `   Start: ${Object.keys(startInventory)
      .map((item) => CATALOG[item as Item])
      .join('')}`
  );
  console.log(`   Goal: ${CATALOG[goal]}`);
  console.log(
    `   Solution tiles: ${solutionTrades.map((t) => t.label).join(', ')}`
  );
  console.log(`   All tiles: ${allTrades.map((t) => t.label).join(', ')}`);

  return {
    startInventory,
    goal,
    tiles: allTrades,
    steps: config.totalSlots, // Always 6 slots for 2 rows of 3
  };
}

/** =========================
 *  Draggable components
 *  ========================= */
type DraggableTileProps = {
  tile: TradeTile & { isUsed?: boolean };
  onDragStart: (tile: TradeTile) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  style?: any;
};

function DraggableTile({
  tile,
  onDragStart,
  onDragMove,
  onDragEnd,
  style,
}: DraggableTileProps) {
  const isUsed = tile.isUsed || false;
  const [isDragging, setIsDragging] = useState(false);
  const tileRef = useRef(tile);
  const startPosition = useRef({ x: 0, y: 0 });
  const panResponderRef = useRef<any>(null);

  // Keep tile ref updated
  useEffect(() => {
    tileRef.current = tile;
  }, [tile]);

  // Create PanResponder with useMemo for performance, store in ref for cleanup
  const panResponder = useMemo(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => !tileRef.current.isUsed,
      onMoveShouldSetPanResponder: () => !tileRef.current.isUsed,
      onPanResponderGrant: (evt) => {
        if (!tileRef.current.isUsed) {
          setIsDragging(true);
          startPosition.current = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          };
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDragStart(tileRef.current);
        }
      },
      onPanResponderMove: (_, gesture) => {
        if (!tileRef.current.isUsed) {
          onDragMove(gesture.moveX, gesture.moveY);
        }
      },
      onPanResponderRelease: () => {
        if (!tileRef.current.isUsed) {
          setIsDragging(false);
          onDragEnd();
        }
      },
    });
    panResponderRef.current = responder;
    return responder;
  }, [onDragStart, onDragMove, onDragEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset dragging state on unmount
      setIsDragging(false);
      panResponderRef.current = null;
    };
  }, []);

  return (
    <View
      style={[
        style,
        isDragging && { opacity: 0.3 },
        isUsed && { opacity: 0.3 },
      ]}
      {...panResponder.panHandlers}
    >
      <PixelBorder
        borderColor={isUsed ? '#424242' : '#42a5f5'}
        borderWidth={3}
        backgroundColor={isUsed ? '#1a1a1a' : '#1565c0'}
        innerPadding={0}
        style={{ width: '100%', height: '100%' }}
      >
        <View style={styles.tileInner}>
          <TradeLabel label={tile.label} style={styles.tileLabel} />
        </View>
      </PixelBorder>
    </View>
  );
}

type SlotProps = {
  slot: TradeTile | null;
  slotIndex: number;
  onMeasure: (
    index: number,
    layout: { x: number; y: number; width: number; height: number }
  ) => void;
  onRemove: (index: number) => void;
  onDragFromSlot: (tile: TradeTile, fromIndex: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  isHighlighted: boolean;
};

function Slot({
  slot,
  slotIndex,
  onMeasure,
  onRemove,
  onDragFromSlot,
  onDragMove,
  onDragEnd,
  isHighlighted,
}: SlotProps) {
  const viewRef = useRef<View>(null);
  const [layoutComplete, setLayoutComplete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const slotRef = useRef(slot);
  const panResponderRef = useRef<any>(null);

  // Keep slot ref updated
  useEffect(() => {
    slotRef.current = slot;
  }, [slot]);

  const handleLayout = (event: LayoutChangeEvent) => {
    // Mark layout as complete
    setLayoutComplete(true);
  };

  useEffect(() => {
    // Measure position after layout is complete
    if (layoutComplete && viewRef.current) {
      const measureSlot = () => {
        viewRef.current?.measureInWindow((x, y, width, height) => {
          onMeasure(slotIndex, { x, y, width, height });
        });
      };

      // Small delay to ensure render is complete
      const timer = setTimeout(measureSlot, 50);
      return () => clearTimeout(timer);
    }
  }, [layoutComplete, slotIndex, onMeasure]);

  const dragStartTime = useRef(0);
  const dragMoved = useRef(false);

  // Create PanResponder with useMemo for performance, store in ref for cleanup
  const panResponder = useMemo(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => !!slotRef.current,
      onMoveShouldSetPanResponder: () => !!slotRef.current,
      onPanResponderGrant: () => {
        if (slotRef.current) {
          dragStartTime.current = Date.now();
          dragMoved.current = false;
          setIsDragging(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDragFromSlot(slotRef.current, slotIndex);
        }
      },
      onPanResponderMove: (_, gesture) => {
        if (slotRef.current) {
          // Track if user moved more than 5 pixels
          if (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5) {
            dragMoved.current = true;
          }
          onDragMove(gesture.moveX, gesture.moveY);
        }
      },
      onPanResponderRelease: () => {
        if (slotRef.current) {
          const dragDuration = Date.now() - dragStartTime.current;

          // If it was a quick tap (< 200ms) and didn't move much, treat as a tap to remove
          if (!dragMoved.current && dragDuration < 200) {
            console.log(
              '👆 Tap detected on slot',
              slotIndex,
              '- removing tile'
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRemove(slotIndex);
            setIsDragging(false);
          } else {
            // Otherwise, complete the drag
            setIsDragging(false);
            onDragEnd();
          }
        }
      },
    });
    panResponderRef.current = responder;
    return responder;
  }, [slotIndex, onDragFromSlot, onDragMove, onDragEnd, onRemove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset dragging state on unmount
      setIsDragging(false);
      panResponderRef.current = null;
    };
  }, []);

  return (
    <View
      ref={viewRef}
      style={styles.slotWrapper}
      onLayout={handleLayout}
      collapsable={false}
    >
      <PixelBorder
        borderColor={isHighlighted ? '#4caf50' : '#42a5f5'}
        borderWidth={3}
        backgroundColor={slot ? '#1565c0' : '#0d47a1'}
        innerPadding={0}
        style={{ width: '100%', height: '100%' }}
      >
        <View
          style={[styles.slotInner, isDragging && { opacity: 0.3 }]}
          {...(slot ? panResponder.panHandlers : {})}
        >
          {slot ? (
            <TradeLabel label={slot.label} style={styles.slotLabel} />
          ) : (
            <Text style={styles.slotPlaceholder}>{slotIndex + 1}</Text>
          )}
        </View>
      </PixelBorder>
    </View>
  );
}

/** =========================
 *  Component
 *  ========================= */
// Level configuration
const LEVEL_CONFIG = [
  { solutionSteps: 3, dummyTrades: 0, totalSlots: 6 }, // Level 1: 3 solution steps, no dummy trades, 6 slots total
  { solutionSteps: 4, dummyTrades: 4, totalSlots: 6 }, // Level 2: 4 solution steps, 4 dummy trades, 6 slots total
  { solutionSteps: 5, dummyTrades: 7, totalSlots: 6 }, // Level 3: 5 solution steps, 7 dummy trades, 6 slots total
];

export default function CandyTraderSequencer({ onComplete }: EconomyGameProps) {
  const { modal, showModal, hideModal } = useGameModal();
  const { trackMinigamePlayed } = useScoreboard();
  const { trackMinigamePlayed: trackMinigameProgress } = useMinigameTracking();
  const { minigameContext, setMinigameContext } = useGame();

  // No seed needed - using Math.random() directly for true randomness
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection', 'gameover'
  const [levelIndex, setLevelIndex] = useState(0);
  const [completedLevel, setCompletedLevel] = useState(0); // Track highest level completed
  const [timeLeft, setTimeLeft] = useState(60); // 60 second timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle(0));
  const [slots, setSlots] = useState<(TradeTile | null)[]>(() =>
    Array(puzzle.steps).fill(null)
  );
  const [available, setAvailable] = useState<TradeTile[]>(puzzle.tiles);

  // Drag and drop state
  const [draggingTile, setDraggingTile] = useState<TradeTile | null>(null);
  const [dragSourceSlot, setDragSourceSlot] = useState<number | null>(null); // Track if dragging from a slot
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [slotLayouts, setSlotLayouts] = useState<
    Array<{ x: number; y: number; width: number; height: number }>
  >([]);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);

  // Timer effect with proper cleanup
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      // Time's up - game over
      handleGameOver('Time ran out!');
    }

    // Cleanup function runs on every render and on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState, timeLeft]);

  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Game over handler
  const handleGameOver = (reason: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setGameState('gameover');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // If player completed at least 1 level, they get a joker reward
    if (completedLevel > 0) {
      showModal(
        "Time's Up!",
        `${reason}\n\nYou completed ${completedLevel} level${completedLevel !== 1 ? 's' : ''}!\n\nYou've earned ${completedLevel} joker${completedLevel !== 1 ? 's' : ''} for your efforts!`,
        '🎯',
        () => {
          hideModal();
          setTimeout(() => {
            setGameState('jokerSelection');
          }, 100);
        }
      );
    } else {
      // No levels completed - no reward
      showModal(
        'Game Over!',
        `${reason}\n\nYou didn't complete any levels. Try again to earn joker rewards!`,
        '❌',
        () => {
          navigateBackToContext();
        }
      );
    }
  };

  // Start game
  const startGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Track minigame play for analytics
    trackMinigamePlayed('economy');
    trackMinigameProgress('economy');

    // Generate a fresh puzzle for level 1
    resetLevel(0);
    setGameState('playing');
    setTimeLeft(60); // 60 seconds for level 1
  };

  const resetLevel = (level: number) => {
    const p = generatePuzzle(level);
    setPuzzle(p);
    setSlots(Array(p.steps).fill(null));
    setAvailable(p.tiles);
  };

  /** ---------- Drag handlers ---------- */
  const handleDragStart = (tile: TradeTile) => {
    console.log('🎯 Drag started:', tile.label);
    setDragPosition({ x: 0, y: 0 }); // Reset position to prevent flash
    setDraggingTile(tile);
    setDragSourceSlot(null); // From palette
  };

  const handleDragFromSlot = (tile: TradeTile, fromIndex: number) => {
    console.log('🎯 Drag started from slot:', fromIndex, tile.label);
    setDragPosition({ x: 0, y: 0 }); // Reset position to prevent flash
    setDraggingTile(tile);
    setDragSourceSlot(fromIndex);
  };

  const handleDragMove = (x: number, y: number) => {
    setDragPosition({ x, y });

    // Check which slot is being hovered over
    let targetSlot: number | null = null;
    for (let i = 0; i < slotLayouts.length; i++) {
      const layout = slotLayouts[i];
      if (
        layout &&
        x >= layout.x &&
        x <= layout.x + layout.width &&
        y >= layout.y &&
        y <= layout.y + layout.height
      ) {
        targetSlot = i;
        break;
      }
    }

    if (targetSlot !== highlightedSlot) {
      console.log('🎯 Hovering over slot:', targetSlot, 'at position', {
        x,
        y,
      });
    }
    setHighlightedSlot(targetSlot);
  };

  const handleDragEnd = () => {
    console.log(
      '🎯 Drag ended. Highlighted slot:',
      highlightedSlot,
      'Source slot:',
      dragSourceSlot
    );

    if (draggingTile && highlightedSlot !== null) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (dragSourceSlot !== null) {
        // Dragging from slot to slot - swap or move
        console.log(
          '✅ Moving/swapping tiles between slots',
          dragSourceSlot,
          '→',
          highlightedSlot
        );
        setSlots((prev) => {
          const copy = [...prev];
          const targetTile = copy[highlightedSlot];

          // Place dragged tile in target
          copy[highlightedSlot] = { ...draggingTile, source: 'slot' };

          // If target had a tile, swap it to source (or clear source if dragging to same slot)
          if (dragSourceSlot !== highlightedSlot) {
            copy[dragSourceSlot] = targetTile;
          }

          return copy;
        });
      } else {
        // Dragging from palette to slot
        console.log('✅ Placing tile from palette to slot', highlightedSlot);
        setSlots((prev) => {
          const copy = [...prev];
          copy[highlightedSlot] = { ...draggingTile, source: 'slot' };
          return copy;
        });
      }
    } else {
      console.log('❌ No valid drop target');
    }

    setDraggingTile(null);
    setDragSourceSlot(null);
    setHighlightedSlot(null);
  };

  const handleSlotMeasure = (
    index: number,
    layout: { x: number; y: number; width: number; height: number }
  ) => {
    setSlotLayouts((prev) => {
      const copy = [...prev];
      copy[index] = layout;
      return copy;
    });
  };

  const handleRemoveFromSlot = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
  };

  /** ---------- Actions ---------- */
  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSlots(Array(puzzle.steps).fill(null));
  };

  const executePlan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let inv: Inventory = { ...puzzle.startInventory };
    let tradesExecuted = 0;

    for (let i = 0; i < slots.length; i++) {
      const tile = slots[i];
      if (!tile) continue;

      if (!canAfford(inv, tile.give)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showModal(
          'Plan Failed',
          `Step ${i + 1} not affordable.\nTrade: ${tile.label}\nInv: ${fmtInv(inv) || 'Empty'}`,
          '❌'
        );
        return;
      }
      inv = applyTrade(inv, tile);
      tradesExecuted++;
    }

    const success = (inv[puzzle.goal] || 0) >= 1;
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const isLast = levelIndex === LEVEL_CONFIG.length - 1;

      if (isLast) {
        console.log('🎯 Economy Game: Final level completed!', {
          levelIndex,
          completedLevel,
        });
        // Mark final level as completed and stop timer
        if (timerRef.current) clearTimeout(timerRef.current);
        setCompletedLevel(levelIndex + 1);

        // All levels complete - go to joker selection
        console.log('🎯 Economy Game: Showing victory modal...');
        showModal(
          'Trading Master!',
          `Incredible! You've mastered all trading levels!\nTime left: ${timeLeft}s`,
          '🏆',
          () => {
            console.log(
              '🎯 Economy Game: Victory modal confirmed, switching to joker selection'
            );
            hideModal();
            setTimeout(() => {
              setGameState('jokerSelection');
            }, 100);
          }
        );
      } else {
        // Mark this level as completed
        setCompletedLevel(levelIndex + 1);

        // Level complete - advance to next level
        showModal(
          'Level Complete!',
          `Excellent! \nYou used ${tradesExecuted} trades.\nReady for Level ${levelIndex + 2}?
          \n Time left: ${timeLeft}s`,
          '🎉',
          () => {
            const nextLevel = levelIndex + 1;
            setLevelIndex(nextLevel);
            resetLevel(nextLevel);
            setTimeLeft(60); // Reset timer to 60 seconds for next level
          }
        );
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showModal('Not There Yet', `❌ Did not reach goal candy`, '📉');
    }
  };

  /** ---------- Render helpers ---------- */
  // Track which tiles are currently used in slots
  const usedTileIds = useMemo(
    () => new Set(slots.filter(Boolean).map((t) => t!.id)),
    [slots]
  );

  // Show all tiles but mark which ones are used (don't filter them out)
  const paletteTiles = useMemo(
    () =>
      puzzle.tiles
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((tile) => ({
          ...tile,
          isUsed: usedTileIds.has(tile.id),
        })),
    [puzzle.tiles, usedTileIds]
  );

  const navigateBackToContext = () => {
    // Clear the context and navigate back
    setMinigameContext(null);
    router.back();
  };

  const handleForfeit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (gameState === 'playing') {
      showModal(
        'Leave Trading Post?',
        "If you leave now, you'll forfeit your chance to study and won't get a trade tool reward.",
        '🚪',
        () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          navigateBackToContext();
        },
        false,
        true
      );
    } else {
      navigateBackToContext();
    }
  };

  if (gameState === 'jokerSelection') {
    console.log(
      '🃏 Economy Game: Showing joker selection, completedLevel:',
      completedLevel
    );
    // Ensure completedLevel is at least 1 and at most 3
    const rewardLevel = Math.max(1, Math.min(3, completedLevel)) as 1 | 2 | 3;
    return (
      <JokerSelection
        jokers={ECONOMY_JOKERS}
        theme="economy"
        subject="Economy"
        onComplete={onComplete}
        rewardTier={rewardLevel}
        completionLevel={rewardLevel}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Economics Study Session</Text>

          <PixelBorder
            borderColor="#42a5f5"
            borderWidth={3}
            backgroundColor="#1e3a8a"
            innerPadding={20}
            style={{ marginBottom: 20, width: '100%' }}
          >
            <Text style={styles.instructionsHeader}>How to Trade:</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1. </Text>
              <Text style={styles.stepText}>
                Build a trading chain to reach your goal candy
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2. </Text>
              <Text style={styles.stepText}>You have 60 seconds!</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3. </Text>
              <Text style={styles.stepText}>
                Drag tiles from the palette into the slots to build your trading
                chain
              </Text>
            </View>
          </PixelBorder>

          <PixelBorder
            borderColor="#42a5f5"
            borderWidth={3}
            backgroundColor="#2196f3"
            innerPadding={0}
            style={{ marginBottom: 16 }}
          >
            <TouchableOpacity
              style={styles.pixelButtonInner}
              onPress={startGame}
            >
              <Text style={styles.startGameButtonText}>Start Trading!</Text>
            </TouchableOpacity>
          </PixelBorder>

          <TouchableOpacity
            style={styles.pixelButtonInner}
            onPress={handleForfeit}
          >
            <Text style={styles.startGameButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={[
          styles.container,
          {
            padding: ResponsiveSpacing.containerPadding(),
            paddingBottom: ResponsiveSpacing.containerPaddingBottom(),
          },
        ]}
      >
        {/* Header */}
        <MinigameHUD
          title="Barter Trading"
          subtitle="Trade your way to the goal candy!"
          leftInfo={`Lvl ${levelIndex + 1}/3 Time: ${timeLeft}`}
          centerInfo={`Start: ${Object.keys(puzzle.startInventory)
            .map((item) => CATALOG[item as Item])
            .join('')}`}
          rightInfo={`Goal: ${CATALOG[puzzle.goal]}`}
          theme="economy"
        />

        {/* Slots - 2 rows of 3 */}
        <View style={styles.paletteWrapper}>
          <Text style={styles.sectionTitle}>Plan:</Text>
          <View style={styles.paletteGrid}>
            {slots.map((slot, index) => (
              <Slot
                key={`slot-${index}`}
                slot={slot}
                slotIndex={index}
                onMeasure={handleSlotMeasure}
                onRemove={handleRemoveFromSlot}
                onDragFromSlot={handleDragFromSlot}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                isHighlighted={highlightedSlot === index}
                style={styles.tile}
              />
            ))}
          </View>
        </View>

        {/* Palette */}
        <View style={styles.paletteWrapper}>
          <Text style={styles.sectionTitle}>Available Trades:</Text>
          <View style={styles.paletteGrid}>
            {paletteTiles.map((tile) => (
              <DraggableTile
                key={tile.id}
                tile={tile}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                style={styles.tile}
              />
            ))}
          </View>
        </View>

        {/* Execute Button */}
        <View
          style={[
            styles.footer,
            {
              gap: ResponsiveSpacing.buttonGap(),
              paddingVertical: ResponsiveSpacing.buttonPadding(),
            },
          ]}
        >
          <PixelBorder
            borderColor="#1976d2"
            borderWidth={3}
            backgroundColor="#2196f3"
            innerPadding={0}
            style={styles.footerBtn}
          >
            <TouchableOpacity
              style={styles.footerBtnInner}
              onPress={executePlan}
            >
              <Text style={styles.footerPrimaryText}>Execute Trade</Text>
            </TouchableOpacity>
          </PixelBorder>
          <PixelBorder
            borderColor="#42a5f5"
            borderWidth={3}
            backgroundColor="#1565c0"
            innerPadding={0}
            style={styles.footerBtn}
          >
            <TouchableOpacity style={styles.footerBtnInner} onPress={clearAll}>
              <TextWithEmojis style={styles.footerSecondaryText} imageSize={16}>
                Clear
              </TextWithEmojis>
            </TouchableOpacity>
          </PixelBorder>
        </View>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              gap: ResponsiveSpacing.buttonGap(),
              paddingVertical: ResponsiveSpacing.buttonPadding(),
            },
          ]}
        >
          <PixelBorder
            borderColor="#42a5f5"
            borderWidth={3}
            backgroundColor="#1565c0"
            innerPadding={0}
            style={styles.footerBtn}
          >
            <TouchableOpacity
              style={styles.footerBtnInner}
              onPress={handleForfeit}
            >
              <TextWithEmojis style={styles.footerBackText} imageSize={28}>
                🚪 Leave
              </TextWithEmojis>
            </TouchableOpacity>
          </PixelBorder>
        </View>

        {/* Dragging overlay - centered on finger with slight upward offset */}
        {draggingTile && dragPosition.x > 0 && dragPosition.y > 0 && (
          <View
            style={[
              styles.dragOverlay,
              {
                left: dragPosition.x - 48, // Half of tile width (96/2)
                top: dragPosition.y - 60, // Offset above finger so tile is visible
              },
            ]}
            pointerEvents="none"
          >
            <PixelBorder
              borderColor="#4caf50"
              borderWidth={3}
              backgroundColor="#1565c0"
              innerPadding={0}
              style={{ width: 96, height: 48 }}
            >
              <View style={styles.tileInner}>
                <TradeLabel
                  label={draggingTile.label}
                  style={styles.tileLabel}
                />
              </View>
            </PixelBorder>
          </View>
        )}

        <GameModal
          visible={modal.visible}
          title={modal.title}
          message={modal.message}
          emoji={modal.emoji}
          onClose={hideModal}
          onConfirm={modal.onConfirm}
          showCancelButton={modal.showCancelButton}
          theme="school"
        />
      </View>
    </GestureHandlerRootView>
  );
}

/** =========================
 *  Styles
 *  ========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#1e3a8a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#64b5f6',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#64b5f6',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#bbdefb',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 16,
  },
  gameInfo: {
    flexDirection: 'row',
    gap: 20,
  },
  level: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffeb3b',
    fontFamily: 'PixeloidMono',
  },
  steps: {
    fontSize: 18,
    fontWeight: '600',
    color: '#90caf9',
    fontFamily: 'PixeloidMono',
  },

  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1e3a8a',
    borderWidth: 3,
    borderColor: '#2196f3',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  hudSection: {
    flex: 1,
    alignItems: 'center',
  },
  hudLabel: {
    fontSize: 12,
    color: '#90caf9',
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
    fontWeight: '600',
  },
  hudValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#2196f3',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  slotsWrapper: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2196f3',
    fontFamily: 'PixeloidMono',
    marginBottom: 12,
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  slotWrapper: {
    width: 96,
    height: 48,
    margin: 0,
  },
  slotInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  slotPlaceholder: {
    textAlign: 'center',
    color: '#90caf9',
    fontFamily: 'PixeloidMono',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  slotLabel: {
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    fontSize: 13,
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  slotHint: {
    fontSize: 8,
    color: '#90caf9',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 2,
  },

  paletteWrapper: { marginBottom: 16 },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    justifyContent: 'center',
  },
  tile: {
    width: 96,
    height: 48,
    margin: 0,
  },
  tileInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  tileLabel: {
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    fontSize: 13,
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tileHint: {
    fontSize: 8,
    color: '#90caf9',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 2,
  },
  emptyPaletteContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0d47a1',
    borderWidth: 2,
    borderColor: '#42a5f5',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  emptyPaletteText: {
    color: '#64b5f6',
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 16,
  },
  emptyPaletteSubtext: {
    color: '#90caf9',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  footerBtn: {
    flex: 1,
  },
  footerBtnInner: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPrimaryText: {
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  footerSecondaryText: {
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  footerBackText: {
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },

  // Drag overlay
  dragOverlay: {
    position: 'absolute',
    zIndex: 9999,
    opacity: 0.9,
    transform: [{ scale: 1.1 }],
  },

  // Instructions Styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#0a1929',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2196f3',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  instructionsCard: {
    backgroundColor: '#1e3a8a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#42a5f5',
    marginBottom: 20,
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64b5f6',
    fontFamily: 'PixeloidMono',
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: '#2196f3',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#42a5f5',
    fontFamily: 'PixeloidMono',
    marginRight: 10,
    minWidth: 20,
    lineHeight: 22,
  },
  stepText: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    flex: 1,
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#1976d2',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  pixelButtonInner: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
