import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  // For config.steps trades, we need config.steps + 1 items in the chain
  for (let i = 0; i < config.steps; i++) {
    const nextItem = pick(rng, ALL_ITEMS, chainItems);
    chainItems.unshift(nextItem);
  }

  // Create the solution trades (always 1 for 1) with random IDs
  const solutionTrades: TradeTile[] = [];
  for (let i = 0; i < config.steps; i++) {
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

  const totalSlots = config.steps + config.dummyTrades;

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
    steps: totalSlots,
  };
}

/** =========================
 *  Tappable components (simplified tap-to-add/remove)
 *  ========================= */
type TappablePaletteProps = {
  tile: TradeTile;
  onTap: (tile: TradeTile) => void;
  style?: any;
};
function TappableFromPalette({ tile, onTap, style }: TappablePaletteProps) {
  return (
    <PixelBorder
      borderColor="#42a5f5"
      borderWidth={3}
      backgroundColor="#1565c0"
      innerPadding={0}
      style={style}
    >
      <TouchableOpacity
        style={styles.tileInner}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onTap(tile);
        }}
        activeOpacity={0.7}
      >
        <TradeLabel label={tile.label} style={styles.tileLabel} />
      </TouchableOpacity>
    </PixelBorder>
  );
}

type TappableSlotProps = {
  tile: TradeTile;
  slotIndex: number;
  onTap: (slotIndex: number, tile: TradeTile) => void;
};
function TappableFromSlot({ tile, slotIndex, onTap }: TappableSlotProps) {
  return (
    <TouchableOpacity
      style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTap(slotIndex, tile);
      }}
      activeOpacity={0.7}
    >
      <TradeLabel label={tile.label} style={styles.slotLabel} />
    </TouchableOpacity>
  );
}

/** =========================
 *  Component
 *  ========================= */
// Level configuration: [steps, dummyTrades]
const LEVEL_CONFIG = [
  { steps: 3, dummyTrades: 0 }, // Level 1: 3 steps, no dummy trades
  { steps: 4, dummyTrades: 4 }, // Level 2: 4 steps, 4 dummy trades
  { steps: 5, dummyTrades: 7 }, // Level 3: 5 steps, 7 dummy trades
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

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      // Time's up - game over
      handleGameOver('Time ran out!');
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameState, timeLeft]);

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

  /** ---------- placement helpers ---------- */
  const placeIntoSlot = (tile: TradeTile, idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const occupying = slots[idx];
    setSlots((prev) => {
      const copy = [...prev];
      copy[idx] = { ...tile, source: 'slot' };
      return copy;
    });
    setAvailable((prev) => {
      const filtered = prev.filter((t) => t.id !== tile.id);
      return occupying
        ? [...filtered, { ...occupying, source: 'palette' }]
        : filtered;
    });
  };
  const removeFromSlot = (i: number) => {
    const tile = slots[i];
    if (!tile) return;
    setSlots((prev) => {
      const copy = [...prev];
      copy[i] = null;
      return copy;
    });
    setAvailable((prev) => [...prev, { ...tile, source: 'palette' }]);
  };


  /** ---------- Actions ---------- */
  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSlots(Array(puzzle.steps).fill(null));
    setAvailable(puzzle.tiles);
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

  /** ---------- Tap logic (simplified) ---------- */
  const handlePaletteTap = (tile: TradeTile) => {
    // Find first empty slot
    const emptySlotIndex = slots.findIndex((s) => s === null);
    if (emptySlotIndex >= 0) {
      placeIntoSlot(tile, emptySlotIndex);
    }
  };

  const handleSlotTap = (slotIndex: number, tile: TradeTile) => {
    // Tapping a filled slot removes it
    removeFromSlot(slotIndex);
  };

  /** ---------- Render ---------- */
  const paletteTiles = useMemo(
    () => [...available].sort((a, b) => a.id.localeCompare(b.id)),
    [available]
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
            <Text style={styles.instructionsTitle}>
              Economics Study Session
            </Text>

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
                  Build multi-step trading chains to reach your goal candy
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>2. </Text>
                <Text style={styles.stepText}>
                  Level 1: 3 steps • Level 2: 4 steps • Level 3: 5 steps - no
                  shortcuts!
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>3. </Text>
                <Text style={styles.stepText}>
                  You have 60 seconds per level to complete the trading chain!
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>4. </Text>
                <Text style={styles.stepText}>
                  Drag tiles to slots in the correct order to execute your plan
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

        {/* Slots */}
        <View style={styles.slotsWrapper}>
          <Text style={styles.sectionTitle}>Arrange your plan</Text>
          {levelIndex === 0 ? (
            // Level 1: 3 slots, centered, no scroll
            <View style={[styles.slotsRow, styles.slotsRowCentered]}>
              {slots.map((slot, i) => (
                <PixelBorder
                  key={`slot-${i}`}
                  borderColor="#42a5f5"
                  borderWidth={3}
                  backgroundColor={slot ? '#1565c0' : '#0d47a1'}
                  innerPadding={0}
                  style={styles.slotWrapper}
                >
                  <View style={styles.slotInner}>
                    {slot ? (
                      <TappableFromSlot
                        tile={slot}
                        slotIndex={i}
                        onTap={handleSlotTap}
                      />
                    ) : (
                      <Text style={styles.slotPlaceholder}>{i + 1}</Text>
                    )}
                  </View>
                </PixelBorder>
              ))}
            </View>
          ) : (
            // Level 2-3: Left aligned, swipeable
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.slotsScrollContent}
            >
              <View style={styles.slotsRow}>
                {slots.map((slot, i) => (
                  <PixelBorder
                    key={`slot-${i}`}
                    borderColor="#42a5f5"
                    borderWidth={3}
                    backgroundColor={slot ? '#1565c0' : '#0d47a1'}
                    innerPadding={0}
                    style={styles.slotWrapper}
                  >
                    <View style={styles.slotInner}>
                      {slot ? (
                        <TappableFromSlot
                          tile={slot}
                          slotIndex={i}
                          onTap={handleSlotTap}
                        />
                      ) : (
                        <Text style={styles.slotPlaceholder}>{i + 1}</Text>
                      )}
                    </View>
                  </PixelBorder>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Palette */}
        <View style={styles.paletteWrapper}>
          <Text style={styles.sectionTitle}>Available Trades</Text>
          <View style={styles.paletteGrid}>
            {paletteTiles.map((tile) => (
              <TappableFromPalette
                key={tile.id}
                tile={tile}
                onTap={handlePaletteTap}
                style={styles.tile}
              />
            ))}
            {paletteTiles.length === 0 && (
              <View style={styles.emptyPaletteContainer}>
                <Text style={styles.emptyPaletteText}>All tiles placed!</Text>
                <Text style={styles.emptyPaletteSubtext}>
                  Tap tiles to remove them
                </Text>
              </View>
            )}
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
  slotsScrollContent: {
    paddingHorizontal: 8,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotsRowCentered: {
    justifyContent: 'center',
    paddingHorizontal: 16,
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
    padding: 8,
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
    gap: 8,
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
    paddingVertical: 8,
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
